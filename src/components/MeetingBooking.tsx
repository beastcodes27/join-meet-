import { useState } from 'react';
import { CalendarCheck, Bell, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, csrf, errorMessage, type Meeting } from '../lib/api';
import { useAuth } from '../lib/auth';
import { meetingTime } from '../lib/scheduling';
import { ErrorNotice, Spinner, useToast } from './ui';
export function MeetingBooking({ meeting }: { meeting: Meeting }) {
  const { user } = useAuth(); const client = useQueryClient(); const toast = useToast();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function book(cancel = false) {
    setBusy(true); setError('');
    try {
      await csrf(); await api.post(`/api/v1/meetings/${meeting.meeting_code}/${cancel ? 'unbook' : 'book'}`, {timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});
      await Promise.all([client.invalidateQueries({queryKey:['meeting',meeting.meeting_code]}),client.invalidateQueries({queryKey:['bookings']})]);
      toast(cancel ? 'Your booking was cancelled.' : 'Your place is booked. We’ll remind you before the meeting.');
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <section className="booking-card"><span className="feature-icon"><CalendarCheck/></span><span className="eyebrow">UPCOMING MEETING</span><h1>{meeting.title}</h1><p>Hosted by <strong>{meeting.host.name}</strong></p>
    <div className="booking-date"><strong>{meetingTime(meeting.scheduled_at!)}</strong><span>Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span><span>{meeting.duration_minutes} minutes · Scheduled in {meeting.timezone}</span></div>
    <p className="booking-capacity"><Users size={17}/>{meeting.booking_count} of {meeting.max_participants} places booked</p>
    {meeting.is_booked ? <div className="booking-confirmed"><CalendarCheck size={20}/><div><strong>Your place is booked.</strong><p><Bell size={14}/> We’ll remind you one hour before the start.</p></div></div> : user ? <button className="button" disabled={busy || meeting.booking_count >= meeting.max_participants} onClick={() => book()}>{busy ? <Spinner/> : <CalendarCheck size={18}/>} {meeting.booking_count >= meeting.max_participants ? 'Fully booked' : 'Book my place'}</button> : <Link className="button" to={`/login?returnTo=${encodeURIComponent('/m/'+meeting.meeting_code)}`}>Sign in with Google to book</Link>}
    {meeting.is_booked && !meeting.is_host && <button className="text-link" disabled={busy} onClick={() => book(true)}>Cancel my booking</button>}
    {meeting.email_reminder_mode === 'preview' && <p className="scheduling-note">Local email reminders appear in the preview inbox. In-app reminders will appear in your account.</p>}
    {meeting.email_reminder_mode === 'unavailable' && <p className="scheduling-note">You’ll receive an in-app reminder. Email delivery is not currently available.</p>}
    <p className="booking-help">This room opens at the scheduled time. Booking reserves your place; the host still approves entry. You can also return as a guest when the meeting starts.</p>
    {error && <ErrorNotice>{error}</ErrorNotice>}
  </section>;
}
