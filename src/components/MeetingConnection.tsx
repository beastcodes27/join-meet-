import { useEffect, useState, type ReactNode } from 'react';
import { RoomContext, useSequentialRoomConnectDisconnect, type LocalUserChoices } from '@livekit/components-react';
import { DisconnectReason, Room, RoomEvent } from 'livekit-client';
import { connectionIssue, type ConnectionIssue } from '../lib/connection';

/** One room per join attempt; serialize React cleanup and connection work, including Strict Mode. */
export function MeetingConnection({ token, serverUrl, choices, onIssue, onMediaError, children }: {
  token: string; serverUrl: string; choices: LocalUserChoices;
  onIssue: (issue: ConnectionIssue) => void; onMediaError: (message: string) => void; children: ReactNode;
}) {
  const [room] = useState(() => new Room({ adaptiveStream: true, dynacast: true }));
  const { connect, disconnect } = useSequentialRoomConnectDisconnect(room);
  useEffect(() => {
    let active = true;
    let disconnected = false;
    const lost = (reason?: DisconnectReason) => {
      if (!active) return;
      const issue = connectionIssue(reason === undefined ? undefined : DisconnectReason[reason]);
      if (issue) { disconnected = true; onIssue(issue); }
    };
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
    }).catch(() => {
      if (active && !disconnected) onIssue(connectionIssue('JOIN_FAILURE')!);
    });
    return () => {
      active = false;
      room.off(RoomEvent.Disconnected, lost);
      void disconnect().catch(() => { /* The room may already be closed. */ });
    };
  }, [room, connect, disconnect, serverUrl, token, choices, onIssue, onMediaError]);

  return <div data-lk-theme="default" className="meeting-shell lk-room-container"><RoomContext.Provider value={room}>{children}</RoomContext.Provider></div>;
}
