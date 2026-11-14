import { Link } from 'react-router-dom';
import { ArrowRight, Video, ShieldCheck, MonitorUp, MessageSquare, Globe2, Check, Mic, Phone, Users, Sparkles, LockKeyhole } from 'lucide-react';
import { Logo, Footer } from '../components/ui';
import { JoinForm } from '../components/JoinForm';
import { useAuth } from '../lib/auth';
export default function Landing() {
    const { user } = useAuth();
    return <>
        <nav className="nav wrap">
            <Logo />
            <div className="nav-links">
                <a href="#features">Why Join Meeting</a>
                <a href="#how-it-works">How it works</a>
            </div>
            <Link className="button small secondary" to={user ? '/dashboard' : '/login'}>
                {user ? 'Your dashboard' : 'Sign in'} 
                <ArrowRight size={16}/>
            </Link>
        </nav>
 
        <main>
            <section className="hero wrap">
                <div className="hero-copy">
                    <div className="eyebrow"><span className="status-dot"/> A little closer, wherever you are</div>
                    <h1>Great conversations.<br />Zero distance<span className="blue">.</span></h1>
                    <p className="hero-description">From a quick hello to your next big idea. Bring everyone together with video meetings that just feel easy.</p>
                    <div className="hero-actions">
                        <Link className="button" to={user ? '/dashboard' : '/login'}><Video size={19}/> Start a meeting <ArrowRight size={17}/></Link>
                        <a className="text-link" href="#join">Have an invite?</a>
                    </div>
                    <div id="join" className="hero-join">
                        <span>Jump right into the conversation</span>
                        <JoinForm />
                        <small><ShieldCheck size={14}/> No account needed to join. The host lets you in.</small>
                    </div>
                </div>
 
                <div className="hero-visual">
                    <div className="visual-caption"><span className="status-dot"/> A space for your next big idea <span className="demo-label">Illustration</span></div>
                    <div className="illustration-window">
                        <div className="window-bar">
                            <span>
                                <i />
                                <i />
                                <i />
                            </span>
                            <b>Team catch-up</b>
                            <LockKeyhole size={13}/>
                        </div>
                        <div className="illustration-grid">
                            {[{ name: 'Amina', color: 'peach', initials: 'AM', detail: 'Good ideas start here.' }, { name: 'Daniel', color: 'blue-tile', initials: 'DK', detail: 'A different city. Same team.' }, { name: 'Sofia', color: 'lilac', initials: 'SO', detail: 'Everyone has a seat.' }, { name: 'You', color: 'sage', initials: 'YOU', detail: 'Right where you belong.' }].map((p, i) => <div key={p.name} className={`illustration-person ${p.color} ${i === 0 ? 'speaking' : ''}`}>
                                <span className="person-orbit"/>
                                <span className="initial-avatar">
                                    {p.initials}
                                </span>
                                <span className="person-detail">
                                    {p.detail}
                                </span>
                                <div className="person-name">
                                    {p.name}
                                    <Mic size={12}/>
                                </div>
                                {i === 0 && <span className="audio-bars">
                                    <i />
                                    <i />
                                    <i />
                                </span>}
                            </div>)}
                        </div>
                        <div className="illustration-controls" aria-hidden="true">
                            <span>
                                <Mic size={16}/>
                            </span>
                            <span>
                                <Video size={16}/>
                            </span>
                            <span>
                                <MonitorUp size={16}/>
                            </span>
                            <span className="hangup">
                                <Phone size={17}/>
                            </span>
                            <span>
                                <MessageSquare size={16}/>
                            </span>
                            <span>
                                <Users size={16}/>
                            </span>
                        </div>
                    </div>
                    <div className="floating-note">
                        <span className="note-icon">
                            <Sparkles size={19}/>
                        </span>
                        <div>
                            <b>Less setup. More connection.</b>
                            <small>Your people are only a link away.</small>
                        </div>
                    </div>
                    <div className="visual-bottom">
                        <span>Made for real connections</span>
                        <span>Built by <b>DevTZ ↗</b></span>
                    </div>
                </div>
            </section>
 
            <section className="value-strip">
                <div className="wrap">
                    <span><Check /> One link brings you together</span>
                    <span><Check /> Join from your browser</span>
                    <span><Check /> Your space, your host controls</span>
                </div>
            </section>
 
            <section id="features" className="features wrap">
                <div className="section-intro">
                    <div>
                        <span className="eyebrow">THE ESSENTIALS, BEAUTIFULLY SIMPLE</span>
                        <h2>Everything you need.<br />Space to be present.</h2>
                    </div>
                    <p>Thoughtful tools that stay out of the way, so you can focus on the people in front of you.</p>
                </div>
                <div className="feature-grid">
                    {[{ icon: Video, title: 'Face to face, from anywhere', text: 'Clear audio and video bring your team, family, or next collaborator into the same room.' }, { icon: MonitorUp, title: 'Show what you mean', text: 'Share your screen for the walkthrough, the presentation, or that one thing that is easier to show.' }, { icon: ShieldCheck, title: 'You choose who comes in', text: 'Approve guests from the waiting room, manage participants, and lock the meeting when you need to.' }, { icon: MessageSquare, title: 'Keep the conversation flowing', text: 'Drop a link or share a thought in live chat. Messages stay in the session and are not saved.' }].map(f => <article className="feature" key={f.title}>
                        <span className="feature-icon">
                            <f.icon size={24}/>
                        </span>
                        <h3>
                            {f.title}
                        </h3>
                        <p>
                            {f.text}
                        </p>
                    </article>)}
                </div>
            </section>
 
            <section id="how-it-works" className="how-section">
                <div className="wrap">
                    <span className="eyebrow">FROM HELLO TO HERE WE GO</span>
                    <h2>Meet in three simple steps.</h2>
                    <div className="steps">
                        {[{ title: 'Make it yours', text: 'Sign in with Google and start a meeting. Your room is ready when you are.' }, { title: 'Send an invitation', text: 'Copy your meeting link and share it with the people you want to bring together.' }, { title: 'Let the conversation happen', text: 'Check your camera and mic, admit your guests, and make something happen.' }].map((s, i) => <article key={s.title}>
                            <span className="step-number">0{i + 1}</span>
                            <h3>
                                {s.title}
                            </h3>
                            <p>
                                {s.text}
                            </p>
                        </article>)}
                    </div>
                </div>
            </section>
 
            <section className="cta wrap">
                <div>
                    <Globe2 size={32}/>
                    <h2>The next great conversation<br />starts with a simple hello.</h2>
                    <p>No downloads. Just your browser and your people.</p>
                </div>
                <Link className="button" to={user ? '/dashboard' : '/login'}>Let’s get together <ArrowRight size={18}/></Link>
            </section>
        </main>
        <Footer />
    </>;
}
