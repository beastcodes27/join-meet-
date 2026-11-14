import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Video, X, ArrowUpRight, LoaderCircle } from 'lucide-react';
export function Logo({light=false}:{light?:boolean}) { return <Link to="/" className={`logo ${light?'light':''}`} aria-label="Join Meeting home"><span className="logo-icon"><Video size={21}/></span><span>join<span className="logo-soft">meeting</span><small>BY DEVTZ</small></span></Link>; }
export function Spinner(){return <LoaderCircle className="spin" size={20} aria-label="Loading"/>;}
export function PageLoading(){return <main className="page-loading" role="status"><Spinner/> Getting things ready…</main>;}
export function ErrorNotice({children}:{children:ReactNode}){return <div className="error-notice" role="alert">{children}</div>;}
const ToastContext=createContext<(text:string)=>void>(()=>{});
export function ToastProvider({children}:{children:ReactNode}) {
 const [message,setMessage]=useState('');
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),4500);return()=>clearTimeout(timer);},[message]);
 return <ToastContext.Provider value={setMessage}>{children}<div className="toast" role="status" aria-live="polite">{message && <><span>{message}</span><button aria-label="Dismiss notification" onClick={()=>setMessage('')}><X size={16}/></button></>}</div></ToastContext.Provider>;
}
export const useToast=()=>useContext(ToastContext);
export function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} className="modal" onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="section-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X/></button></div>{children}</dialog>;
}
export function ScrollToTop(){const {pathname}=useLocation();useEffect(()=>{window.scrollTo(0,0);},[pathname]);return null;}
export function Footer(){return <footer className="footer"><Logo/><p>Connect anywhere. Meet everyone.</p><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><a href="https://devtz.com" target="_blank" rel="noreferrer">DevTZ <ArrowUpRight size={14}/></a></div><small>© {new Date().getFullYear()} DevTZ. Join Meeting.</small></footer>;}
