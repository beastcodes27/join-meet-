import { useRef, useState } from 'react';
import { GridLayout, ParticipantTile, RoomAudioRenderer, StartAudio, TrackToggle, MediaDeviceMenu, useConnectionState, useParticipants, useRoomContext, useTracks } from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import { useQuery } from '@tanstack/react-query';
import { Video, MonitorUp, Users, MessageSquare, Copy, Info, Phone, LockKeyhole, X, Check, Ban, LogOut } from 'lucide-react';
import { api, csrf, errorMessage, type Admission, type Meeting, type Member } from '../lib/api';
import { Modal, ErrorNotice, useToast } from './ui';
import { MeetingChat } from './MeetingChat';
import { useInCallChat } from '../hooks/useInCallChat';
export default function MeetingRoom({ meeting, code, error, onLeave }: {
    meeting: Meeting;
    code: string;
    error: string;
    onLeave: () => void;
}) {
    const room = useRoomContext();
    const state = useConnectionState();
    const participants = useParticipants();
    const toast = useToast();
    const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });
    const [panel, setPanel] = useState<'people' | 'chat' | null>(null);
    const chat = useInCallChat(panel === 'chat');
    const chatButton = useRef<HTMLButtonElement>(null);
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
            {panel && <aside className={`room-panel ${panel === 'chat' ? 'room-chat-panel' : ''}`} id="meeting-side-panel">
                <div className="section-heading">
                    <h2>
                        {panel === 'people' ? 'People' : 'In-meeting chat'}
                    </h2>
                    <button className="icon-button" aria-label="Close panel" onClick={() => { if (panel === 'chat') chatButton.current?.focus(); setPanel(null); }}>
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
        <span className="sr-only" role="status" aria-live="polite">{chat.unread > 0 ? `${chat.unread} unread chat messages` : ''}</span>
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
                <button ref={chatButton} className={`room-button chat-toggle ${panel === 'chat' ? 'selected' : ''}`} aria-label={`Chat${chat.unread ? `, ${chat.unread} unread messages` : ''}`} aria-pressed={panel === 'chat'} aria-expanded={panel === 'chat'} aria-controls="meeting-side-panel" onClick={() => setPanel(panel === 'chat' ? null : 'chat')}>
                    <MessageSquare size={20}/>
                    <span>Chat</span>
                    {chat.unread > 0 && <span className="chat-unread" aria-hidden="true">{chat.unread > 99 ? '99+' : chat.unread}</span>}
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
