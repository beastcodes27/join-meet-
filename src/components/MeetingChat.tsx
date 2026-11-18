import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Check, Copy, MessageSquare, RotateCcw, Send, ShieldCheck, Smile, Trash2 } from 'lucide-react';
import { MAX_CHAT_LENGTH, messageKey, messageParts } from '../lib/chat';
import { type useInCallChat } from '../hooks/useInCallChat';
import { useToast } from './ui';

type Chat = ReturnType<typeof useInCallChat>;
const emojis = [['👍', 'Thumbs up'], ['👏', 'Applause'], ['❤️', 'Heart'], ['😂', 'Laugh'], ['🎉', 'Celebrate'], ['👋', 'Wave'], ['✅', 'Check mark'], ['🙏', 'Thanks']];

export function MeetingChat({ chat }: { chat: Chat }) {
  const toast = useToast();
  const input = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [older, setOlder] = useState(false);
  const [picker, setPicker] = useState(false);
  const [newMessages, setNewMessages] = useState(false);
  const entries = [
    ...chat.messages.map(message => ({ key: messageKey(message), text: message.message, timestamp: message.timestamp, name: message.from?.isLocal ? 'You' : message.from?.name || 'Participant', own: message.from?.isLocal ?? false, status: 'sent' as const, pending: undefined })),
    ...chat.outbox.map(message => ({ key: message.id, text: message.message, timestamp: message.timestamp, name: 'You', own: true, status: message.status, pending: message })),
  ].sort((a, b) => a.timestamp - b.timestamp);
  const lastText = entries.at(-1)?.text;

  function latest() {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
    follow.current = true;
    setOlder(false);
    setNewMessages(false);
  }
  useEffect(() => { input.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (follow.current) {
      if (list.current) list.current.scrollTop = list.current.scrollHeight;
    } else setNewMessages(true);
  }, [entries.length, lastText]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!chat.draft.trim() || !chat.connected || chat.busy) return;
    follow.current = true;
    chat.submit();
    input.current?.focus({ preventScroll: true });
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
      event.preventDefault();
      submit(event);
    }
    if (event.key === 'Escape') setPicker(false);
  }
  function emoji(value: string) {
    const start = input.current?.selectionStart ?? chat.draft.length;
    const end = input.current?.selectionEnd ?? start;
    const next = chat.draft.slice(0, start) + value + chat.draft.slice(end);
    if (next.length > MAX_CHAT_LENGTH) return;
    chat.setDraft(next);
    setPicker(false);
    requestAnimationFrame(() => {
      input.current?.focus({ preventScroll: true });
      input.current?.setSelectionRange(start + value.length, start + value.length);
    });
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast('Message copied.'); }
    catch { toast('Copy is unavailable. Select the message text to copy it.'); }
  }

  return <section className="chat-content" aria-label="Meeting chat">
    <p className="chat-notice"><ShieldCheck size={16}/><span>Everyone in this meeting can see your messages. History is live only and is not saved.</span></p>
    {!chat.connected && <p className="chat-connection" role="status">Reconnecting… Your draft and unsent messages stay here.</p>}
    <div ref={list} className="chat-messages" role="log" aria-label="Meeting messages" aria-live="polite" aria-relevant="additions text" onScroll={() => {
      const element = list.current;
      if (!element) return;
      follow.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64;
      setOlder(!follow.current);
      if (follow.current) setNewMessages(false);
    }}>
      {entries.length === 0 && <div className="chat-empty"><MessageSquare size={30}/><h3>Keep the conversation going</h3><p>Say hello, share a thought, or send a useful link to everyone.</p></div>}
      {entries.map(entry => <article key={entry.key} className={`chat-message ${entry.own ? 'chat-own' : ''} ${entry.status === 'failed' ? 'chat-failed' : ''}`}>
        <header><strong>{entry.name}</strong><time dateTime={new Date(entry.timestamp).toISOString()}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><button type="button" className="icon-button chat-copy" aria-label={`Copy message from ${entry.name}`} onClick={() => copy(entry.text)}><Copy size={14}/></button></header>
        <p className="chat-bubble">{messageParts(entry.text).map((part, index) => part.type === 'link' ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a> : part.text)}</p>
        {entry.own && <div className="chat-delivery">
          {entry.status === 'sent' && <span title="Sent to the meeting connection. Read receipts are not available."><Check size={12}/> Sent</span>}
          {entry.status === 'sending' && <span role="status">Sending…</span>}
          {entry.status === 'failed' && entry.pending && <><span>Couldn’t send</span><button type="button" disabled={!chat.connected || chat.busy} onClick={() => chat.retry(entry.pending!)}><RotateCcw size={13}/> Retry</button><button type="button" aria-label="Discard unsent message" onClick={() => chat.discard(entry.pending!.id)}><Trash2 size={13}/></button></>}
        </div>}
      </article>)}
    </div>
    {older && newMessages && <button className="chat-latest" type="button" onClick={latest}>New messages · Show latest</button>}
    <form className="chat-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="chat-message">Message everyone</label>
      <textarea ref={input} id="chat-message" aria-describedby="chat-hint chat-count" maxLength={MAX_CHAT_LENGTH} value={chat.draft} onChange={event => chat.setDraft(event.target.value)} onKeyDown={keyDown} placeholder="Message everyone…" rows={3}/>
      {picker && <div id="chat-emojis" className="chat-emojis" role="group" aria-label="Quick emoji" onKeyDown={event => { if (event.key === 'Escape') { setPicker(false); input.current?.focus(); } }}>{emojis.map(([value, name]) => <button key={name} type="button" aria-label={name} onClick={() => emoji(value)} disabled={chat.draft.length + value.length > MAX_CHAT_LENGTH}>{value}</button>)}</div>}
      <div className="chat-compose-tools"><button type="button" className="icon-button" aria-label="Insert emoji" aria-expanded={picker} aria-controls="chat-emojis" onClick={() => setPicker(!picker)}><Smile size={19}/></button><span id="chat-count" className={chat.draft.length >= MAX_CHAT_LENGTH ? 'chat-limit' : ''}>{chat.draft.length}/{MAX_CHAT_LENGTH}</span><button className="button small" type="submit" disabled={!chat.draft.trim() || chat.busy || !chat.connected}><Send size={16}/>{chat.busy ? 'Sending…' : 'Send'}</button></div>
      <p id="chat-hint" className="chat-hint">Enter to send · Shift+Enter for a new line</p>
    </form>
  </section>;
}
