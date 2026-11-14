import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Video } from 'lucide-react';
import { Logo, Spinner, ErrorNotice } from '../components/ui';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';
export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    if (user)
        return <Navigate to="/dashboard" replace/>;
    async function signIn() {
        setBusy(true);
        setError('');
        try {
            await login();
            navigate('/dashboard');
        }
        catch (e) {
            setError(errorMessage(e));
        }
        finally {
            setBusy(false);
        }
    }
    return <main className="login-layout">
        <div className="login-story">
            <Logo light/>
            <div>
                <span className="eyebrow">A SPACE TO COME TOGETHER</span>
                <h1>Good to see you.<br />Even from here.</h1>
                <p>A familiar face. A fresh perspective.<br />A whole world of possibilities.</p>
                <div className="login-art">
                    <Video size={72}/>
                    <span className="orbit one"/>
                    <span className="orbit two"/>
                </div>
            </div>
            <small>JOIN MEETING · BY DEVTZ</small>
        </div>
        <div className="login-form-area">
            <Link to="/" className="text-link back-link"><ArrowLeft size={16}/> Back to home</Link>
            <div className="login-card">
                <span className="feature-icon">
                    <Video />
                </span>
                <h2>Your next conversation awaits.</h2>
                <p>Welcome to Join Meeting. Sign in to create a room and bring your people together.</p>
                {error && <ErrorNotice>
                    {error}
                </ErrorNotice>}
                <button className="button google-button" onClick={signIn} disabled={busy}>
                    {busy ? <Spinner /> : <span className="google-g">G</span>}
                    {busy ? 'Connecting securely…' : 'Continue with Google'}
                </button>
                <small>By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</small>
                <div className="login-security">
                    <ShieldCheck size={17}/>
                    <span>Secure sign-in. Your Google password stays with Google.</span>
                </div>
                <p className="guest-hint">Joining someone else? <Link to="/#join">Use their meeting link</Link>. No account required.</p>
            </div>
        </div>
    </main>;
}
