export const MAX_CHAT_LENGTH = 2000;

export type ChatMessage = {
  id: string;
  timestamp: number;
  message: string;
  from?: { identity: string; name?: string; isLocal: boolean };
  attributes?: Record<string, string>;
};
export type OutgoingMessage = {
  id: string;
  timestamp: number;
  message: string;
  status: 'sending' | 'failed';
};
export type ChatState = { draft: string; outbox: OutgoingMessage[]; readKeys: string[] };
export type ChatAction =
  | { type: 'draft'; value: string }
  | { type: 'enqueue'; entry: OutgoingMessage }
  | { type: 'retry'; id: string }
  | { type: 'failed'; id: string }
  | { type: 'sent' | 'discard'; id: string }
  | { type: 'read'; keys: string[] };
export const initialChatState: ChatState = { draft: '', outbox: [], readKeys: [] };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'draft': return { ...state, draft: action.value.slice(0, MAX_CHAT_LENGTH) };
    case 'enqueue':
      if (!action.entry.message.trim() || action.entry.message.length > MAX_CHAT_LENGTH || state.outbox.some(entry => entry.id === action.entry.id)) return state;
      return { ...state, draft: '', outbox: [...state.outbox, action.entry] };
    case 'retry': return { ...state, outbox: state.outbox.map(entry => entry.id === action.id ? { ...entry, status: 'sending' } : entry) };
    case 'failed': return { ...state, outbox: state.outbox.map(entry => entry.id === action.id ? { ...entry, status: 'failed' } : entry) };
    case 'sent':
    case 'discard': return { ...state, outbox: state.outbox.filter(entry => entry.id !== action.id) };
    case 'read': {
      const keys = new Set(state.readKeys);
      action.keys.forEach(key => keys.add(key));
      return keys.size === state.readKeys.length ? state : { ...state, readKeys: [...keys] };
    }
  }
}

export function messageKey(message: ChatMessage): string {
  const clientId = message.attributes?.['jm.client-id'];
  return `${message.from?.identity ?? 'unknown'}:${clientId && clientId.length <= 100 ? clientId : message.id}`;
}

/** A retry keeps its client ID; replace partial streams/retries instead of duplicating them. */
export function uniqueMessages(messages: readonly ChatMessage[]): ChatMessage[] {
  const entries = new Map<string, ChatMessage>();
  for (const message of messages) {
    if (typeof message.id !== 'string' || !message.id || typeof message.message !== 'string' || message.message.length > MAX_CHAT_LENGTH
      || !Number.isFinite(message.timestamp) || message.timestamp < 0 || message.timestamp > 8640000000000000) continue;
    entries.set(messageKey(message), message);
  }
  return [...entries.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function unreadMessages(messages: readonly ChatMessage[], readKeys: readonly string[], localIdentity: string): number {
  const read = new Set(readKeys);
  return uniqueMessages(messages).filter(message => !message.from?.isLocal && message.from?.identity !== localIdentity && !read.has(messageKey(message))).length;
}

export type MessagePart = { type: 'text'; text: string } | { type: 'link'; text: string; href: string };
export function messageParts(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let offset = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>]+/gi)) {
    const start = match.index;
    let candidate = match[0].replace(/[.,!?;:]+$/u, '');
    for (const [open, close] of [['(', ')'], ['[', ']']]) {
      while (candidate.endsWith(close) && candidate.split(close).length > candidate.split(open).length) candidate = candidate.slice(0, -1);
    }
    try {
      const url = new URL(candidate);
      if (!url.hostname || url.username || url.password || !['http:', 'https:'].includes(url.protocol)) continue;
      if (start > offset) parts.push({ type: 'text', text: text.slice(offset, start) });
      parts.push({ type: 'link', text: candidate, href: url.href });
      offset = start + candidate.length;
    } catch { /* Invalid URLs remain plain, React-escaped text. */ }
  }
  if (offset < text.length) parts.push({ type: 'text', text: text.slice(offset) });
  return parts;
}
