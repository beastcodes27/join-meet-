import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GridLayout, ParticipantTile, RoomAudioRenderer, StartAudio, TrackToggle, MediaDeviceMenu, useChat, useConnectionState, useParticipants, useRoomContext, useTracks } from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import { useQuery } from '@tanstack/react-query';
import { Video, MonitorUp, Users, MessageSquare, Copy, Info, Phone, LockKeyhole, X, Send, Check, Ban, LogOut } from 'lucide-react';
import { api, csrf, errorMessage, type Admission, type Meeting, type Member } from '../lib/api';
import { Modal, ErrorNotice, useToast } from './ui';
export default function MeetingRoom({ meeting, code, error, onLeave }: {
    meeting: Meeting;
    code: string;
    error: string;
    onLeave: () => void;
}) {
    const room = useRoomContext();
    const chat = useChat();
    const state = useConnectionState();
    const participants = useParticipants();
    const toast = useToast();
    const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });
    const [panel, setPanel] = useState<'people' | 'chat' | null>(null);
    const [info, setInfo] = useState(false);
    const [end, setEnd] = useState(false);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [removeTarget, setRemoveTarget] = useState<Member>();
    const host = useQuery({ queryKey: ['participants', code], queryFn: async () => (await api.get<{
            participants: Member[];
            admissions: Admission[];
        }>(`/api/v1/meetings/${code}/participants`)).data, enabled: meeting.is_host, refetchInterval: 3000 });
    async function action(name: string, payload: object = {}) {
        setBusy(true);
        setActionError('');
        try {
            await csrf();
            await api.post(`/api/v1/meetings/${code}/${name}`, payload);
            await host.refetch();
            return true;
        }
        catch (e) {
            setActionError(errorMessage(e));
            return false;
        }
        finally {
            setBusy(false);
        }
    }
    async function leave() {
        setBusy(true);
        try {
            await csrf();
            await api.post(`/api/v1/meetings/${code}/leave`);
        }
        catch (e) {
            toast(errorMessage(e));
        }
        finally {
            await room.disconnect();
            onLeave();
        }
    }
    async function endMeeting() {
        if (await action('end')) {
            await room.disconnect();
            onLeave();
        }
    }
    async function copy() {
        try {
            await navigator.clipboard.writeText(meeting.share_url);
            toast('Meeting link copied.');
        }
        catch {
            setInfo(true);
        }
    }
    const pending = host.data?.admissions.length ?? 0;
    return <>
        <header className="room-header">
            <div className="room-title">
                <span className="room-brand">
                    <Video size={21}/>
                </span>
                <div>
                    <h1>
                        {meeting.title}
                    </h1>
                    <p><span className={`status-dot ${state !== ConnectionState.Connected ? 'warning' : ''}`}/>{state} · {participants.length} {participants.length === 1 ? 'person' : 'people'}</p>
                </div>
            </div>
            <div>
                <button className="room-button" onClick={copy}>
                    <Copy size={17}/>
                    <span>Copy invite</span>
                </button>
                <button className="room-button icon-button" aria-label="Meeting information" onClick={() => setInfo(true)}>
                    <Info size={20}/>
                </button>
            </div>
        </header>
        {state !== ConnectionState.Connected && <div className="connection-banner" role="status">
            {state === ConnectionState.Reconnecting ? 'Connection interrupted. Reconnecting automatically…' : 'Connecting to your meeting…'}
        </div>}
        {(error || actionError) && <ErrorNotice>
            {actionError || error}
        </ErrorNotice>}
        {pending > 0 && panel !== 'people' && <button className="admission-banner" onClick={() => setPanel('people')}>{pending} {pending === 1 ? 'person is' : 'people are'} waiting. Review requests <ArrowIcon /></button>}
        <div className="room-body">
            <div className="video-stage">
                <GridLayout tracks={tracks} className="video-grid">
                    <ParticipantTile />
                </GridLayout>
                <RoomAudioRenderer />
                <StartAudio label="Enable meeting audio"/>
            </div>
            {panel && <aside className="room-panel">
                <div className="section-heading">
                    <h2>
                        {panel === 'people' ? 'People' : 'In-meeting chat'}
                    </h2>
                    <button className="icon-button" aria-label="Close panel" onClick={() => setPanel(null)}>
                        <X size={20}/>
                    </button>
                </div>
                {panel === 'chat' ? <MeetingChat chat={chat}/> : <div className="people-content">
                    {meeting.is_host && <>
                        <h3>Waiting room <span>
                                {pending}
                            </span></h3>
                        {host.isError && <ErrorNotice>
                            {errorMessage(host.error)}
                        </ErrorNotice>}
                        {host.data?.admissions.map(a => <div className="admission-row" key={a.id}>
                            <span>
                                {a.display_name}
                            </span>
                            <button className="icon-button" disabled={busy} aria-label={`Admit ${a.display_name}`} onClick={() => action('admit', { admission_id: a.id })}>
                                <Check size={18}/>
                            </button>
                            <button className="icon-button" disabled={busy} aria-label={`Reject ${a.display_name}`} onClick={() => action('reject', { admission_id: a.id })}>
                                <Ban size={17}/>
                            </button>
                        </div>)}
                        {pending === 0 && <p className="muted">No one is waiting.</p>}
                        <button className="room-button lock-button" disabled={busy} onClick={() => action('access', { locked: !meeting.locked })}>
                            <LockKeyhole size={17}/>
                            {meeting.locked ? 'Unlock meeting' : 'Lock meeting'}
                        </button>
                    </>}
                    <h3>In this meeting · {participants.length}</h3>
                    {participants.map(p => <div className="participant-row" key={p.identity}>
                        <span className="user-avatar">
                            {(p.name || p.identity).charAt(0).toUpperCase()}
                        </span>
                        <span>
                            {p.name || p.identity}
                            {p.isLocal ? ' (you)' : ''}
                        </span>
                        {meeting.is_host && !p.isLocal && <button className="icon-button" aria-label={`Remove ${p.name}`} disabled={busy} onClick={() => {
                            const member = host.data?.participants.find(m => m.identity === p.identity);
                            if (member)
                                setRemoveTarget(member);
                        }}>
                            <LogOut size={17}/>
                        </button>}
                    </div>)}
                </div>}
            </aside>}
        </div>
        <footer className="room-toolbar">
            <div className="toolbar-meta">
                <span>JOIN MEETING</span>
                <small>by DevTZ</small>
            </div>
            <div className="primary-controls">
                <div className="device-control">
                    <TrackToggle source={Track.Source.Microphone} showIcon>
                        <span>Mic</span>
                    </TrackToggle>
                    <MediaDeviceMenu kind="audioinput"/>
                </div>
                <div className="device-control">
                    <TrackToggle source={Track.Source.Camera} showIcon>
                        <span>Camera</span>
                    </TrackToggle>
                    <MediaDeviceMenu kind="videoinput"/>
                </div>
                <TrackToggle source={Track.Source.ScreenShare} showIcon>
                    <span>Share screen</span>
                </TrackToggle>
                <button className={`room-button ${panel === 'people' ? 'selected' : ''}`} aria-pressed={panel === 'people'} onClick={() => setPanel(panel === 'people' ? null : 'people')}>
                    <Users size={20}/>
                    <span>People{pending ? ` (${pending})` : ''}</span>
                </button>
                <button className={`room-button ${panel === 'chat' ? 'selected' : ''}`} aria-pressed={panel === 'chat'} onClick={() => setPanel(panel === 'chat' ? null : 'chat')}>
                    <MessageSquare size={20}/>
                    <span>Chat</span>
                </button>
            </div>
            <div className="leave-controls">
                {meeting.is_host && <button className="end-button" onClick={() => setEnd(true)} disabled={busy}>End for all</button>}
                <button className="leave-button" onClick={leave} disabled={busy}>
                    <Phone size={19}/>
                    <span>Leave</span>
                </button>
            </div>
        </footer>
        {info && <Modal title="Meeting details" onClose={() => setInfo(false)}>
            <dl className="meeting-details">
                <dt>Title</dt>
                <dd>
                    {meeting.title}
                </dd>
                <dt>Host</dt>
                <dd>
                    {meeting.host.name}
                </dd>
                <dt>People here</dt>
                <dd>
                    {participants.length}
                </dd>
                <dt>Meeting ID</dt>
                <dd>
                    {code}
                </dd>
                <dt>Shareable link</dt>
                <dd>
                    <a href={meeting.share_url}>
                        {meeting.share_url}
                    </a>
                </dd>
            </dl>
            <button className="button" onClick={copy}><Copy size={17}/> Copy link</button>
            <p className="muted">Guests need host approval. Chat is not saved.</p>
        </Modal>}
        {end && <Modal title="End this meeting for everyone?" onClose={() => setEnd(false)}>
            <p>Everyone will be disconnected and this link will close to new joins.</p>
            {actionError && <ErrorNotice>
                {actionError}
            </ErrorNotice>}
            <div className="dialog-actions">
                <button className="button secondary" onClick={() => setEnd(false)}>Keep meeting open</button>
                <button className="button danger" onClick={endMeeting} disabled={busy}>End for everyone</button>
            </div>
        </Modal>}
        {removeTarget && <Modal title={`Remove ${removeTarget.display_name}?`} onClose={() => setRemoveTarget(undefined)}>
            <p>This participant will be disconnected and their current admission will be revoked.</p>
            <div className="dialog-actions">
                <button className="button secondary" onClick={() => setRemoveTarget(undefined)}>Cancel</button>
                <button className="button danger" disabled={busy} onClick={async () => {
                if (await action('remove', { identity: removeTarget.identity }))
                    setRemoveTarget(undefined);
            }}>Remove participant</button>
            </div>
            {actionError && <ErrorNotice>
                {actionError}
            </ErrorNotice>}
        </Modal>}
    </>;
}
function ArrowIcon() { return <MonitorUp size={15}/>; }
function MeetingChat({ chat }: {
    chat: ReturnType<typeof useChat>;
}) {
    const { chatMessages, send, isSending } = chat;
    const state = useConnectionState();
    const [text, setText] = useState('');
    const [error, setError] = useState('');
    const bottom = useRef<HTMLDivElement>(null);
    useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [chatMessages.length]);
    async function submit(e: FormEvent) {
        e.preventDefault();
        if (!text.trim() || !send)
            return;
        setError('');
        try {
            await send(text.trim());
            setText('');
        }
        catch {
            setError('Message could not be sent. Check your connection, then try again.');
        }
    }
    return <div className="chat-content">
        <p className="chat-notice"><ShieldCheck size={16}/> Messages are live only. Chat history is not saved and may be lost when reconnecting.</p>
        <div className="chat-messages" role="log" aria-live="polite">
            {chatMessages.length === 0 && <p className="muted">Share a thought or a useful link.</p>}
            {chatMessages.map((m, i) => <article className="chat-message" key={m.id ?? i}>
                <div>
                    <b>
                        {m.from?.name || 'Participant'}
                    </b>
                    <time>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                </div>
                <p>
                    {m.message}
                </p>
            </article>)}
            <div ref={bottom}/>
        </div>
        {error && <ErrorNotice>
            {error}
        </ErrorNotice>}
        <form className="chat-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="chat-message">Message everyone</label>
            <textarea id="chat-message" maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder="Message everyone…" rows={2} disabled={state !== ConnectionState.Connected}/>
            <button className="button small" type="submit" disabled={!text.trim() || isSending || state !== ConnectionState.Connected}>
                <Send size={16}/>
                {isSending ? 'Sending…' : 'Send'}
            </button>
        </form>
    </div>;
}
