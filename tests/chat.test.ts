import test from 'node:test';
import assert from 'node:assert/strict';
import { chatReducer, initialChatState, MAX_CHAT_LENGTH, messageKey, messageParts, uniqueMessages, unreadMessages, type ChatMessage, type OutgoingMessage } from '../src/lib/chat.ts';
const pending: OutgoingMessage = { id: 'temporary', timestamp: 1, message: 'First message', status: 'sending' };
const remote: ChatMessage = { id: 'stream', timestamp: 1, message: 'Hello', from: { identity: 'guest:one', name: 'Guest', isLocal: false } };

test('sending snapshots the message and preserves text typed while awaiting transport', () => {
  let state = chatReducer({ ...initialChatState, draft: 'First message' }, { type: 'enqueue', entry: pending });
  assert.equal(state.draft, '');
  state = chatReducer(state, { type: 'draft', value: 'Next message' });
  state = chatReducer(state, { type: 'sent', id: pending.id });
  assert.equal(state.draft, 'Next message');
  assert.deepEqual(state.outbox, []);
});
test('failed messages retain their text and stable retry ID without replacing the current draft', () => {
  let state = chatReducer(initialChatState, { type: 'enqueue', entry: pending });
  state = chatReducer(state, { type: 'failed', id: pending.id });
  state = chatReducer(state, { type: 'draft', value: 'A separate draft' });
  assert.equal(state.outbox[0].message, pending.message);
  assert.equal(state.outbox[0].status, 'failed');
  state = chatReducer(state, { type: 'retry', id: pending.id });
  assert.equal(state.outbox[0].id, pending.id);
  assert.equal(state.outbox[0].status, 'sending');
  assert.equal(state.draft, 'A separate draft');
});
test('discarding a failed message keeps the composer draft', () => {
  const state = chatReducer({ ...initialChatState, draft: 'Keep this', outbox: [{ ...pending, status: 'failed' }] }, { type: 'discard', id: pending.id });
  assert.equal(state.draft, 'Keep this');
  assert.deepEqual(state.outbox, []);
});
test('empty, oversized, and duplicate outgoing messages are rejected', () => {
  assert.equal(chatReducer(initialChatState, { type: 'enqueue', entry: { ...pending, message: '  ' } }), initialChatState);
  assert.equal(chatReducer(initialChatState, { type: 'enqueue', entry: { ...pending, message: 'x'.repeat(MAX_CHAT_LENGTH + 1) } }), initialChatState);
  const state = chatReducer(initialChatState, { type: 'enqueue', entry: pending });
  assert.equal(chatReducer(state, { type: 'enqueue', entry: pending }), state);
});
test('composer enforces the transport message limit', () => {
  assert.equal(chatReducer(initialChatState, { type: 'draft', value: 'x'.repeat(MAX_CHAT_LENGTH + 1) }).draft.length, MAX_CHAT_LENGTH);
});
test('unread badges ignore local messages and already-read remote messages', () => {
  const own = { ...remote, id: 'own', from: { identity: 'host', isLocal: true } };
  assert.equal(unreadMessages([remote, own], [], 'host'), 1);
  assert.equal(unreadMessages([remote, own], [messageKey(remote)], 'host'), 0);
});
test('marking a message read is idempotent and does not depend on array length', () => {
  const state = chatReducer(initialChatState, { type: 'read', keys: [messageKey(remote)] });
  assert.equal(chatReducer(state, { type: 'read', keys: [messageKey(remote)] }), state);
  assert.equal(unreadMessages([{ ...remote, id: 'after-reconnect' }], state.readKeys, 'host'), 1);
});
test('partial streams and retries count once per sender and client message ID', () => {
  const first = { ...remote, attributes: { 'jm.client-id': 'same-message' } };
  const retry = { ...first, id: 'retry-stream', message: 'Completed message' };
  assert.equal(uniqueMessages([first, retry]).length, 1);
  assert.equal(uniqueMessages([first, retry])[0].message, 'Completed message');
  assert.equal(unreadMessages([first, retry], [], 'host'), 1);
  assert.equal(uniqueMessages([first, { ...retry, from: { identity: 'another', isLocal: false } }]).length, 2);
});
test('unknown remote sender is still treated as an unread message', () => {
  assert.equal(unreadMessages([{ ...remote, from: undefined }], [], 'host'), 1);
});
test('safe web links preserve text, newlines, and surrounding punctuation', () => {
  const text = 'Look (https://example.test/path).\nAnd https://example.test/Other_(page)!';
  const parts = messageParts(text);
  assert.equal(parts.map(part => part.text).join(''), text);
  assert.deepEqual(parts.filter(part => part.type === 'link').map(part => part.text), ['https://example.test/path', 'https://example.test/Other_(page)']);
});
test('executable schemes, markup, credential URLs, and invalid hosts remain escaped text', () => {
  for (const text of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '<img src=x onerror=alert(1)>', 'https://name:password@example.test', 'https://']) {
    const parts = messageParts(text);
    assert.equal(parts.some(part => part.type === 'link'), false);
    assert.equal(parts.map(part => part.text).join(''), text);
  }
});
test('international text and emoji are preserved', () => {
  const text = 'Habari 👋 ሰላም\nمرحبا';
  assert.equal(messageParts(text).map(part => part.text).join(''), text);
  assert.equal(chatReducer(initialChatState, { type: 'draft', value: text }).draft, text);
});

test('malformed chat payloads cannot crash the room renderer', () => {
  const invalid = [
    { ...remote, timestamp: Number.NaN },
    { ...remote, timestamp: 9e15 },
    { ...remote, message: 'x'.repeat(MAX_CHAT_LENGTH + 1) },
    { ...remote, message: { text: 'malformed' } } as unknown as ChatMessage,
  ];
  assert.deepEqual(uniqueMessages(invalid), []);
  assert.equal(unreadMessages(invalid, [], 'host'), 0);
});
