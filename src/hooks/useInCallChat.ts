import { useEffect, useReducer, useRef, useState } from 'react';
import { useChat, useConnectionState, useRoomContext } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { chatReducer, initialChatState, MAX_CHAT_LENGTH, messageKey, uniqueMessages, unreadMessages, type OutgoingMessage } from '../lib/chat';

export function useInCallChat(open: boolean) {
  const { chatMessages, send, isSending } = useChat();
  const room = useRoomContext();
  const connection = useConnectionState();
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [visible, setVisible] = useState(document.visibilityState === 'visible');
  const sending = useRef(false);
  const mounted = useRef(true);
  const messages = uniqueMessages(chatMessages);
  const connected = connection === ConnectionState.Connected;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const change = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  useEffect(() => {
    if (open && visible) dispatch({ type: 'read', keys: chatMessages.map(messageKey) });
  }, [open, visible, chatMessages]);

  async function transmit(entry: OutgoingMessage) {
    if (!connected || sending.current || isSending) return;
    sending.current = true;
    dispatch({ type: 'retry', id: entry.id });
    try {
      await send(entry.message, { attributes: { 'jm.client-id': entry.id } });
      if (mounted.current) dispatch({ type: 'sent', id: entry.id });
    } catch {
      if (mounted.current) dispatch({ type: 'failed', id: entry.id });
    } finally {
      sending.current = false;
    }
  }
  function submit() {
    const message = state.draft.trim();
    if (!message || message.length > MAX_CHAT_LENGTH || !connected || sending.current || isSending) return;
    const entry: OutgoingMessage = { id: crypto.randomUUID(), timestamp: Date.now(), message, status: 'sending' };
    dispatch({ type: 'enqueue', entry });
    void transmit(entry);
  }

  return {
    messages, draft: state.draft, outbox: state.outbox, connected,
    busy: isSending || state.outbox.some(entry => entry.status === 'sending'),
    unread: open && visible ? 0 : unreadMessages(messages, state.readKeys, room.localParticipant.identity),
    setDraft: (value: string) => dispatch({ type: 'draft', value }),
    discard: (id: string) => dispatch({ type: 'discard', id }),
    retry: (entry: OutgoingMessage) => { if (entry.status === 'failed') void transmit(entry); },
    submit,
  };
}
