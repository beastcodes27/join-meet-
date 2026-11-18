export type ConnectionIssue = { message: string; retry: boolean; code: string };

/** Initial join failures are distinct from a call that connected and later dropped. */
export function connectionFailure(reason?: string, signalConnected = false, disconnectCode?: string): ConnectionIssue {
  const disconnected = connectionIssue(disconnectCode);
  if (disconnected && !disconnected.retry) return disconnected;
  if (disconnectCode === 'DUPLICATE_IDENTITY') return disconnected!;
  if (reason === 'NotAllowed') return { code: 'ACCESS_DENIED', retry: true, message: 'The meeting server did not accept your access token. Reconnect to request fresh access from Join Meeting.' };
  if (signalConnected) return { code: 'MEDIA_CONNECTION_FAILED', retry: true, message: 'Meeting access succeeded, but the audio and video connection could not be established. Check your browser’s local network permission, VPN, or firewall, then reconnect.' };
  return { code: 'SIGNAL_CONNECTION_FAILED', retry: true, message: 'Your browser could not connect to the meeting server. Check that the server is running and reachable, then reconnect.' };
}

export function connectionIssue(code?: string): ConnectionIssue | null {
  if (code === 'CLIENT_INITIATED') return null;
  if (['PARTICIPANT_REMOVED', 'USER_REJECTED'].includes(code ?? '')) return { code: code!, retry: false, message: 'The host removed you from this meeting.' };
  if (['ROOM_DELETED', 'ROOM_CLOSED'].includes(code ?? '')) return { code: code!, retry: false, message: 'The host has ended this meeting.' };
  if (code === 'DUPLICATE_IDENTITY') return { code, retry: true, message: 'This meeting identity was opened in another tab or browser. Close the other copy, then reconnect here.' };
  if (['JOIN_FAILURE', 'CONNECTION_TIMEOUT', 'MEDIA_FAILURE'].includes(code ?? '')) return { code: code!, retry: true, message: 'The video connection could not be established. Check that LiveKit and its media ports are reachable, then reconnect.' };
  if (code === 'SERVER_SHUTDOWN') return { code, retry: true, message: 'The meeting server restarted. Reconnect once it is available again.' };
  return { code: code || 'CONNECTION_LOST', retry: true, message: 'The connection was interrupted and automatic recovery stopped. Check your connection, then reconnect to the meeting.' };
}
