import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api, csrf, errorMessage, notificationQuery, type Reminder } from '../lib/api';
import { meetingTime } from '../lib/scheduling';
import { ErrorNotice, Modal, Spinner } from './ui';
export function NotificationBell() {
  const { user } = useAuth();
  const query = useQuery(notificationQuery(user?.id));
  const client = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  if (!user) return null;
  async function read(notification: Reminder) {
    setBusy(notification.id); setError('');
    try {
      await csrf(); await api.post(`/api/v1/notifications/${notification.id}/read`);
      await client.invalidateQueries({ queryKey: ['notifications', user?.id] });
      setOpen(false); navigate(`/m/${notification.data.meeting_code}`);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(''); }
  }
  return <><button className="icon-button notification-button" aria-label={`Notifications${query.data?.unread_count ? `, ${query.data.unread_count} unread` : ''}`} onClick={() => setOpen(true)}><Bell size={21}/>{!!query.data?.unread_count && <span>{query.data.unread_count > 99 ? '99+' : query.data.unread_count}</span>}</button>
    {open && <Modal title="Your reminders" onClose={() => setOpen(false)}>
      {query.isPending && <Spinner/>}
      {(error || query.isError) && <ErrorNotice>{error || errorMessage(query.error)}</ErrorNotice>}
      {query.data?.notifications.length === 0 && <div className="empty-state"><Bell/><h3>You’re all caught up.</h3><p>Booked meeting reminders will appear here one hour before they start.</p></div>}
      <div className="notification-list">{query.data?.notifications.map(notification => <button className={`notification-entry ${notification.read_at ? '' : 'unread'}`} key={notification.id} disabled={!!busy} onClick={() => read(notification)}><strong>{notification.data.title}</strong><span>{notification.data.body}</span><time>{meetingTime(notification.data.scheduled_at)}</time><small>{busy === notification.id ? 'Opening…' : 'Open meeting'}</small></button>)}</div>
    </Modal>}
  </>;
}
