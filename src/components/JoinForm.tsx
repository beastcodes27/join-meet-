import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Link as LinkIcon } from 'lucide-react';
import { parseMeetingCode } from '../lib/meeting-code';
export function JoinForm() {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    function submit(e: FormEvent) {
        e.preventDefault();
        const code = parseMeetingCode(value);
        if (!code) {
            setError('Enter a valid meeting link or the 32-character meeting code.');
            return;
        }
        navigate(`/m/${code}`);
    }
    return <form onSubmit={submit} className="join-form">
        <label htmlFor="meeting-code" className="sr-only">Meeting link or code</label>
        <div className="join-input">
            <LinkIcon size={18}/>
            <input id="meeting-code" value={value} onChange={e => { setValue(e.target.value); setError(''); }} placeholder="Enter a meeting link or code" required autoComplete="off"/>
            <button type="submit">Join <ArrowRight size={16}/></button>
        </div>
        {error && <p role="alert" className="field-error">
            {error}
        </p>}
    </form>;
}
