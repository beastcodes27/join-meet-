import { useEffect, useState, type ReactNode } from 'react';
import { RoomContext, useSequentialRoomConnectDisconnect, type LocalUserChoices } from '@livekit/components-react';
import { ConnectionError, ConnectionErrorReason, DisconnectReason, Room, RoomEvent } from 'livekit-client';
import { connectionFailure, connectionIssue, type ConnectionIssue } from '../lib/connection';

/** One room per join attempt; serialize React cleanup and connection work, including Strict Mode. */
export function MeetingConnection({ token, serverUrl, choices, onIssue, onMediaError, children }: {
  token: string; serverUrl: string; choices: LocalUserChoices;
  onIssue: (issue: ConnectionIssue) => void; onMediaError: (message: string) => void; children: ReactNode;
}) {
  const [room] = useState(() => new Room({ adaptiveStream: true, dynacast: true }));
  const { connect, disconnect } = useSequentialRoomConnectDisconnect(room);
  useEffect(() => {
    let active = true;
    let connected = false;
    let signalConnected = false;
    let disconnectCode: string | undefined;
    const signaled = () => { signalConnected = true; };
    const established = () => { connected = true; };
    const lost = (reason?: DisconnectReason) => {
      if (!active) return;
      disconnectCode = reason === undefined ? undefined : DisconnectReason[reason];
      // connect() rejects after emitting Disconnected. Preserve that rejection's cause
      // instead of unmounting the room early and labelling an initial failure a dropped call.
      if (!connected) return;
      const issue = connectionIssue(disconnectCode);
      if (issue) onIssue(issue);
    };
    room.on(RoomEvent.SignalConnected, signaled);
    room.on(RoomEvent.Connected, established);
    room.on(RoomEvent.Disconnected, lost);
    void connect(serverUrl, token, { autoSubscribe: true, maxRetries: 3, peerConnectionTimeout: 20000, websocketTimeout: 15000 }).then(async () => {
      if (!active) return;
      try {
        await Promise.all([
          room.localParticipant.setMicrophoneEnabled(choices.audioEnabled, { deviceId: choices.audioDeviceId }),
          room.localParticipant.setCameraEnabled(choices.videoEnabled, { deviceId: choices.videoDeviceId }),
        ]);
      } catch {
        if (active) onMediaError('A camera or microphone could not be enabled. You can stay in the call and select another device.');
      }
    }).catch((error: unknown) => {
      if (active) onIssue(connectionFailure(error instanceof ConnectionError ? ConnectionErrorReason[error.reason] : undefined, signalConnected, disconnectCode));
    });
    return () => {
      active = false;
      room.off(RoomEvent.Disconnected, lost);
      room.off(RoomEvent.SignalConnected, signaled);
      room.off(RoomEvent.Connected, established);
      void disconnect().catch(() => { /* The room may already be closed. */ });
    };
  }, [room, connect, disconnect, serverUrl, token, choices, onIssue, onMediaError]);

  return <div data-lk-theme="default" className="meeting-shell lk-room-container"><RoomContext.Provider value={room}>{children}</RoomContext.Provider></div>;
}
