import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Copy, Plus, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { api, csrf, errorMessage, type Meeting } from '../lib/api';
import { meetingTime } from '../lib/scheduling';
import { ErrorNotice, Modal, Spinner, useToast } from './ui';
export function UpcomingMeetings({ onSchedule }: { onSchedule: () => void }) {
  const { user } = useAuth(); const client = useQueryClient(); const toast = useToast();
  const query = useQuery({ queryKey:['bookings',user?.id],queryFn:async()=>(await api.get<{meetings:Meeting[]}>('/api/v1/bookings')).data.meetings,enabled:!!user,refetchInterval:30000 });
  const [cancel,setCancel]=useState<Meeting>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function copy(meeting:Meeting) {
    try { await navigator.clipboard.writeText(meeting.share_url);toast('Invitation link copied. Invitees can book their place from this link.'); }
    catch { toast('Copy is unavailable. Open the meeting to view its link.'); }
  }
  async function cancelMeeting() {
    if(!cancel)return;setBusy(true);setError('');
    try { await csrf();await api.post(`/api/v1/meetings/${cancel.meeting_code}/end`);await Promise.all([client.invalidateQueries({queryKey:['bookings']}),client.invalidateQueries({queryKey:['meetings']})]);setCancel(undefined);toast('Meeting cancelled. Pending reminders will not be sent.'); }
    catch(failure){setError(errorMessage(failure));}finally{setBusy(false);}
  }
  return <section className="upcoming-meetings"><div className="section-heading"><div><h2>Scheduled and booked</h2><p>Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p></div><button className="button secondary small" onClick={onSchedule}><Plus size={16}/> Schedule</button></div>
    {query.isPending?<div className="skeleton"/>:query.isError?<ErrorNotice>{errorMessage(query.error)} <button onClick={()=>query.refetch()}>Try again</button></ErrorNotice>:!query.data?.length?<div className="schedule-empty"><CalendarDays size={24}/><div><strong>Make time for your next conversation.</strong><p>Schedule a meeting or book one through an invitation link.</p></div></div>:<div className="meeting-list">{query.data.map(meeting=><article className="meeting-row upcoming-row" key={meeting.uuid}><span className="meeting-row-icon"><CalendarDays size={20}/></span><div><h3>{meeting.title}</h3><p>{meeting.scheduled_at&&meetingTime(meeting.scheduled_at)} · {meeting.duration_minutes} min</p><small>{meeting.is_host?'You’re hosting':'Your place is booked'} · {meeting.booking_count}/{meeting.max_participants} booked</small></div><button className="icon-button" aria-label={`Copy invitation for ${meeting.title}`} onClick={()=>copy(meeting)}><Copy size={17}/></button><Link className="button secondary small" to={`/m/${meeting.meeting_code}`}>{meeting.can_join?'Join':'View booking'}</Link>{meeting.is_host&&!meeting.can_join&&<button className="icon-button" aria-label={`Cancel ${meeting.title}`} onClick={()=>{setCancel(meeting);setError('');}}><X size={17}/></button>}</article>)}</div>}
    {cancel&&<Modal title="Cancel this scheduled meeting?" onClose={()=>setCancel(undefined)}><p>{cancel.title} will close and pending reminders for booked participants will be cancelled.</p>{error&&<ErrorNotice>{error}</ErrorNotice>}<div className="dialog-actions"><button className="button secondary" onClick={()=>setCancel(undefined)}>Keep meeting</button><button className="button danger" disabled={busy} onClick={cancelMeeting}>{busy?<Spinner/>:'Cancel meeting'}</button></div></Modal>}
  </section>;
}
