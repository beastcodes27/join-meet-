import { useState, type FormEvent } from 'react';
import { CalendarPlus, Clock3 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, csrf, errorMessage, notificationQuery, type Meeting } from '../lib/api';
import { useAuth } from '../lib/auth';
import { meetingTime, scheduleInstant } from '../lib/scheduling';
import { Modal, ErrorNotice, Spinner, useToast } from './ui';
export function ScheduleMeeting({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const notifications = useQuery(notificationQuery(user?.id));
  const client = useQueryClient(); const toast = useToast();
  const [title, setTitle] = useState(''); const [start, setStart] = useState('');
  const [duration, setDuration] = useState(60); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    const instant = scheduleInstant(start);
    if (!instant || new Date(instant).getTime() <= Date.now()) { setError('Choose a valid future date and time.'); return; }
    setBusy(true);
    try {
      await csrf(); await api.post<{meeting: Meeting}>('/api/v1/meetings', {title: title.trim(), scheduled_at: instant, timezone, duration_minutes: duration});
      await Promise.all([client.invalidateQueries({queryKey:['meetings']}), client.invalidateQueries({queryKey:['bookings']})]);
      toast('Meeting scheduled. Your host booking is included.'); onClose();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <Modal title="Schedule a meeting" onClose={onClose}><form className="schedule-form" onSubmit={submit}>
    <p>Choose a time and share the meeting link. Signed-in invitees can book a place and receive a reminder one hour before.</p>
    <label htmlFor="scheduled-title">Meeting name</label><input id="scheduled-title" required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Team planning" autoFocus/>
    <label htmlFor="scheduled-start">Date and start time</label><input id="scheduled-start" type="datetime-local" required value={start} onChange={event => setStart(event.target.value)}/>
    <p className="schedule-timezone"><Clock3 size={15}/> Your timezone: <strong>{timezone}</strong></p>
    <label htmlFor="scheduled-duration">Duration</label><select id="scheduled-duration" value={duration} onChange={event => setDuration(Number(event.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>1 hour</option></select>
    {start && scheduleInstant(start) && <p className="schedule-summary">Starts {meetingTime(scheduleInstant(start)!)} · {duration} minutes</p>}
    {notifications.data?.email_reminder_mode === 'preview' && <p className="scheduling-note">Local testing: email is captured in the preview inbox. In-app reminders are active.</p>}
    {notifications.data?.email_reminder_mode === 'unavailable' && <p className="scheduling-note">In-app reminders are active. Email delivery is not available yet.</p>}
    {error && <ErrorNotice>{error}</ErrorNotice>}
    <button className="button" disabled={busy}>{busy ? <Spinner/> : <CalendarPlus size={18}/>} {busy ? 'Scheduling…' : 'Schedule meeting'}</button>
  </form></Modal>;
}
