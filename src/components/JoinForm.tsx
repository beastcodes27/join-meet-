import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Link as LinkIcon } from 'lucide-react';
export function parseMeetingCode(input:string):string|null {
 const raw=input.trim();
 try { const value=raw.includes('://') ? new URL(raw).pathname.split('/').filter(Boolean).at(-1) : raw; return value && /^[a-f0-9]{32}$/.test(value) ? value : null; } catch { return null; }
}
export function JoinForm(){
 const [value,setValue]=useState('');const [error,setError]=useState('');const navigate=useNavigate();
 function submit(e:FormEvent){e.preventDefault();const code=parseMeetingCode(value);if(!code){setError('Enter a valid meeting link or the 32-character meeting code.');return;}navigate(`/m/${code}`);}
 return <form onSubmit={submit} className="join-form"><label htmlFor="meeting-code" className="sr-only">Meeting link or code</label><div className="join-input"><LinkIcon size={18}/><input id="meeting-code" value={value} onChange={e=>{setValue(e.target.value);setError('');}} placeholder="Enter a meeting link or code" required autoComplete="off"/><button type="submit">Join <ArrowRight size={16}/></button></div>{error&&<p role="alert" className="field-error">{error}</p>}</form>;
}
