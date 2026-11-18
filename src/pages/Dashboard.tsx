import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Video, Plus, ArrowUpRight, Clock3, LogOut, LayoutDashboard, ShieldCheck, Copy, ArrowRight, CalendarPlus } from 'lucide-react';
import { Logo, PageLoading, ErrorNotice, Modal, Spinner, useToast } from '../components/ui';
import { JoinForm } from '../components/JoinForm';
import { ScheduleMeeting } from '../components/ScheduleMeeting';
import { UpcomingMeetings } from '../components/UpcomingMeetings';
import { NotificationBell } from '../components/NotificationBell';
import { useAuth } from '../lib/auth';
import { api, csrf, errorMessage, type Meeting } from '../lib/api';
export default function Dashboard() {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [create, setCreate] = useState(false);
    const [schedule, setSchedule] = useState(false);
    const [title, setTitle] = useState('');
    const [error, setError] = useState('');
    const meetings = useQuery({ queryKey: ['meetings', user?.id], queryFn: async () => (await api.get<{
            meetings: Meeting[];
        }>('/api/v1/meetings')).data.meetings, enabled: !!user });
    const start = useMutation({ mutationFn: async () => {
            await csrf();
            return (await api.post<{
                meeting: Meeting;
            }>('/api/v1/meetings', { title: title.trim() || 'A new conversation' })).data.meeting;
        }, onSuccess: m => navigate(`/m/${m.meeting_code}`), onError: e => setError(errorMessage(e)) });
    const recent = meetings.data?.filter(meeting => meeting.status !== 'scheduled');
    if (loading)
        return <PageLoading />;
    if (!user)
        return <Navigate to="/login" replace/>;
    async function signOut() {
        try {
            await logout();
            navigate('/');
        }
        catch (e) {
            toast(errorMessage(e));
        }
    }
    async function copy(link: string) {
        try {
            await navigator.clipboard.writeText(link);
            toast('Meeting link copied.');
        }
        catch {
            toast('Copy is unavailable. Open the meeting to view its link.');
        }
    }
    function submit(e: FormEvent) { e.preventDefault(); start.mutate(); }
    return <div className="dashboard">
        <aside className="sidebar">
            <Logo />
            <span className="sidebar-label">YOUR WORKSPACE</span>
            <Link className="sidebar-item active" to="/dashboard"><LayoutDashboard size={19}/> Overview</Link>
            <div className="sidebar-bottom">
                <ShieldCheck />
                <b>A room for your people.</b>
                <p>Every guest is approved by you. Your meetings, your space.</p>
                <small>Built with care by DevTZ</small>
            </div>
        </aside>
        <div className="dashboard-body">
            <header className="dashboard-header">
                <span>Workspace <span className="muted">/ Overview</span></span>
                <div className="dashboard-account"><NotificationBell/><details className="profile-menu">
                    <summary>
                        <span className="user-avatar">
                            {user.name.charAt(0)}
                        </span>
                        <span>
                            {user.name}
                        </span>
                    </summary>
                    <div>
                        <p>
                            {user.email}
                        </p>
                        <button onClick={signOut}><LogOut size={16}/> Sign out</button>
                    </div>
                </details></div>
            </header>
            <main className="dashboard-content">
                <div className="dashboard-welcome">
                    <span className="eyebrow">A GOOD DAY TO CONNECT</span>
                    <h1>Hello, {user.name.split(' ')[0]}<span className="blue">.</span></h1>
                    <p>Your space for conversations that move things forward.</p>
                </div>
                <div className="dashboard-actions">
                    <section className="start-card">
                        <div className="start-card-icon">
                            <Video size={29}/>
                        </div>
                        <h2>Bring everyone together.</h2>
                        <p>A quick catch-up or a big idea. There’s a room for it.</p>
                        <button className="button white" onClick={() => { setCreate(true); setError(''); }}><Plus size={19}/> Start a meeting <ArrowRight size={17}/></button>
                        <button className="schedule-start" onClick={() => setSchedule(true)}><CalendarPlus size={16}/> Schedule for later</button>
                        <span className="card-decoration"/>
                    </section>
                    <section className="join-card">
                        <span className="feature-icon">
                            <ArrowUpRight />
                        </span>
                        <h2>Have an invitation?</h2>
                        <p>Enter a meeting link or code to join the conversation.</p>
                        <JoinForm />
                        <small><ShieldCheck size={14}/> Your host will welcome you in.</small>
                    </section>
                </div>
                <UpcomingMeetings onSchedule={() => setSchedule(true)}/>
                <section className="recent-meetings">
                    <div className="section-heading">
                        <div>
                            <h2>Your recent meetings</h2>
                            <p>Pick up where you left off.</p>
                        </div>
                        <span className="count-badge">{recent?.length ?? 0} meetings</span>
                    </div>
                    {meetings.isPending ? <div className="skeleton"/> : meetings.isError ? <ErrorNotice>
                        {errorMessage(meetings.error)} 
                        <button onClick={() => meetings.refetch()}>Try again</button>
                    </ErrorNotice> : recent?.length ? <div className="meeting-list">
                        {recent.map(m => <article className="meeting-row" key={m.uuid}>
                            <span className="meeting-row-icon">
                                <Video />
                            </span>
                            <div>
                                <h3>
                                    {m.title}
                                </h3>
                                <p>
                                    <Clock3 size={13}/> 
                                    {new Date(m.created_at).toLocaleString()}
                                </p>
                            </div>
                            <span className={`meeting-status ${m.status}`}>
                                {m.status === 'created' ? 'Ready to start' : m.status === 'active' ? 'In progress' : 'Ended'}
                            </span>
                            <button className="icon-button" aria-label={`Copy link for ${m.title}`} onClick={() => copy(m.share_url)}>
                                <Copy size={17}/>
                            </button>
                            {m.status !== 'ended' && new Date(m.expires_at) > new Date() ? <Link className="button secondary small" to={`/m/${m.meeting_code}`}>Open <ArrowUpRight size={15}/></Link> : <span className="muted">Closed</span>}
                        </article>)}
                    </div> : <div className="empty-state">
                        <span className="feature-icon">
                            <Video />
                        </span>
                        <h3>Good conversations start here.</h3>
                        <p>Your meetings will appear here once you create your first room.</p>
                        <button className="text-link" onClick={() => setCreate(true)}>Start your first meeting <ArrowRight size={16}/></button>
                    </div>}
                </section>
                <p className="dashboard-footnote">Instant or scheduled meetings · One-hour booking reminders · Host-approved guests</p>
            </main>
            <nav className="mobile-nav">
                <Link to="/">Home</Link>
                <Link to="/dashboard">Overview</Link>
                <button onClick={signOut}>Sign out</button>
            </nav>
        </div>
        {schedule && <ScheduleMeeting onClose={() => setSchedule(false)}/>}
        {create && <Modal title="Make room for a conversation" onClose={() => setCreate(false)}>
            <form onSubmit={submit}>
                <p>Give your meeting a name. You can share its link as soon as it’s created.</p>
                <label htmlFor="meeting-title">Meeting name</label>
                <input id="meeting-title" autoFocus maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Monday team catch-up" required/>
                {error && <ErrorNotice>
                    {error}
                </ErrorNotice>}
                <button className="button" disabled={start.isPending}>{start.isPending ? <Spinner /> : <Video size={18}/>} Create meeting</button>
            </form>
        </Modal>}
    </div>;
}
