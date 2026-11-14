import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LiveKitRoom, PreJoin, type LocalUserChoices } from '@livekit/components-react';
import { DisconnectReason } from 'livekit-client';
import { ArrowLeft, ShieldCheck, Clock3 } from 'lucide-react';
import { Logo, PageLoading, ErrorNotice, Spinner } from '../components/ui';
import { api, csrf, errorMessage, meetingQuery, type Admission, type Meeting } from '../lib/api';
import { useAuth } from '../lib/auth';
import MeetingRoom from '../components/MeetingRoom';
import '@livekit/components-styles';
type Connection = {
    token: string;
    server_url: string;
    meeting: Meeting;
};
export default function MeetingPage() {
    const { code = '' } = useParams();
    const { user } = useAuth();
    const [choices, setChoices] = useState<LocalUserChoices>();
    const [waiting, setWaiting] = useState(false);
    const [connection, setConnection] = useState<Connection>();
    const [error, setError] = useState('');
    const [closed, setClosed] = useState('');
    const metadata = useQuery({ ...meetingQuery(code), enabled: /^[a-f0-9]{32}$/.test(code), refetchInterval: 5000, retry: false });
    const join = useMutation({ mutationFn: async (values: LocalUserChoices) => { await csrf(); return (await api.post<Connection>(`/api/v1/meetings/${code}/join`, { display_name: values.username.trim() })).data; }, onSuccess: data => { setConnection(data); setWaiting(false); setError(''); }, onError: e => { setWaiting(false); setError(errorMessage(e)); } });
    const admission = useQuery({ queryKey: ['admission', code, choices?.username], queryFn: async () => (await api.post<{
            admission: Admission;
        }>(`/api/v1/meetings/${code}/admission-request`, { display_name: choices?.username.trim() })).data.admission, enabled: waiting, refetchInterval: query => query.state.data?.status === 'pending' ? 3000 : false, retry: false });
    const mediaError = useCallback((e: Error) => setError(`Camera or microphone unavailable: ${e.message}. Check your browser permissions or join with them turned off.`), []);
    const endMessage = closed || (metadata.data?.status === 'ended' ? 'The host has ended this meeting.' : metadata.data && new Date(metadata.data.expires_at) < new Date() ? 'This meeting has expired.' : '');
    async function request(values: LocalUserChoices) {
        if (!values.username.trim() || values.username.trim().length > 80) {
            setError('Enter a display name between 1 and 80 characters.');
            return;
        }
        setError('');
        setChoices(values);
        if (metadata.data?.is_host) {
            join.mutate(values);
            return;
        }
        try {
            await csrf();
            setWaiting(true);
        }
        catch (e) {
            setError(errorMessage(e));
        }
    }
    // Admission polling stops after approval; joining remains an explicit action to avoid duplicate token requests.
    if (endMessage)
        return <main className="meeting-exit">
        <Logo />
        <h1>
            {endMessage}
        </h1>
        <p>Thanks for being part of the conversation.</p>
        <Link className="button" to={user ? '/dashboard' : '/'}>Return {user ? 'to dashboard' : 'home'}</Link>
    </main>;
    if (!/^[a-f0-9]{32}$/.test(code) || metadata.isError)
        return <main className="meeting-exit">
        <Logo />
        <h1>We couldn’t open that meeting.</h1>
        <ErrorNotice>
            {metadata.error ? errorMessage(metadata.error) : 'The meeting code is invalid. Ask your host for the full link.'}
        </ErrorNotice>
        <Link to="/">Return home</Link>
    </main>;
    if (!metadata.data)
        return <PageLoading />;
    if (connection && choices)
        return <LiveKitRoom token={connection.token} serverUrl={connection.server_url} connect audio={choices.audioEnabled ? { deviceId: choices.audioDeviceId } : false} video={choices.videoEnabled ? { deviceId: choices.videoDeviceId } : false} options={{ adaptiveStream: true, dynacast: true }} onError={e => setError(errorMessage(e))} onMediaDeviceFailure={() => setError('A media device is unavailable. Check permissions and select a working device.')} onDisconnected={reason => setClosed(reason === DisconnectReason.PARTICIPANT_REMOVED ? 'The host removed you from this meeting.' : reason === DisconnectReason.ROOM_DELETED ? 'The host has ended this meeting.' : 'Your connection closed. Check your network and ask the host to join again.')} data-lk-theme="default" className="meeting-shell">
        <MeetingRoom meeting={metadata.data} code={code} error={error} onLeave={() => setClosed('You left the meeting.')}/>
    </LiveKitRoom>;
    return <main className="prejoin-page">
        <header className="nav wrap">
            <Logo />
            <Link className="text-link" to={user ? '/dashboard' : '/'}><ArrowLeft size={16}/> Go back</Link>
        </header>
        <div className="prejoin-content">
            <div>
                <span className="eyebrow">A MOMENT BEFORE YOU CONNECT</span>
                <h1>Ready when you are.</h1>
                <p>Check your camera and microphone. Get comfortable.</p>
            </div>
            <div className="prejoin-card">
                <div className="prejoin-preview" data-lk-theme="default">
                    {!waiting && !join.isPending ? <PreJoin defaults={{ username: user?.name ?? '', audioEnabled: false, videoEnabled: false }} persistUserChoices={false} onSubmit={request} onError={mediaError} onValidate={values => !!values.username.trim() && values.username.trim().length <= 80} joinLabel={metadata.data.is_host ? 'Enter meeting' : 'Ask to join'} userLabel="Your display name"/> : <div className="waiting-state">
                        <Clock3 size={44}/>
                        <h2>
                            {join.isPending ? 'Connecting you…' : admission.data?.status === 'approved' ? 'You’re welcome to join.' : admission.data?.status === 'rejected' ? 'Your request was declined.' : 'Your host will be with you soon.'}
                        </h2>
                        <p>
                            {admission.data?.status === 'approved' ? 'Your camera and microphone settings are ready.' : admission.data?.status === 'rejected' ? 'Contact the host if you think this was a mistake.' : 'Keep this page open while your host reviews your request.'}
                        </p>
                        {admission.data?.status === 'approved' && choices && <button className="button" onClick={() => join.mutate(choices)} disabled={join.isPending}>Join meeting</button>}
                        {admission.isError && <ErrorNotice>
                            {errorMessage(admission.error)} 
                            <button onClick={() => admission.refetch()}>Try again</button>
                        </ErrorNotice>}
                        {!join.isPending && admission.data?.status !== 'approved' && admission.data?.status !== 'rejected' && <Spinner />}
                        <button className="text-link" onClick={() => setWaiting(false)} disabled={join.isPending}>Back to device settings</button>
                    </div>}
                </div>
                <aside className="prejoin-info">
                    <span className="feature-icon">
                        <ShieldCheck />
                    </span>
                    <h2>
                        {metadata.data.title}
                    </h2>
                    <p>Hosted by <b>
                            {metadata.data.host.name}
                        </b></p>
                    <div className="prejoin-detail">
                        <span>Meeting access</span>
                        <b>
                            {metadata.data.locked ? 'Locked by host' : 'Host approval required'}
                        </b>
                    </div>
                    <div className="prejoin-detail">
                        <span>Room capacity</span>
                        <b>{metadata.data.max_participants} people</b>
                    </div>
                    <div className="prejoin-detail">
                        <span>Privacy</span>
                        <b>No recording in this MVP</b>
                    </div>
                    <small>Your camera and microphone start off. Enable them in the preview when you’re ready.</small>
                </aside>
            </div>
            {error && <ErrorNotice>
                {error}
            </ErrorNotice>}
        </div>
    </main>;
}
