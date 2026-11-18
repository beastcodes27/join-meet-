import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '', withCredentials: true, withXSRFToken: true, headers: { Accept: 'application/json' }, timeout: 15000 });
export async function csrf() { await api.get('/sanctum/csrf-cookie'); }
export function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error))
        return error.response?.data?.message || (error.response?.status === 419 ? 'Your session expired. Refresh and try again.' : 'Cannot reach Join Meeting. Check your connection and try again.');
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
export type User = {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
};
export type Meeting = {
    uuid: string;
    meeting_code: string;
    title: string;
    status: 'created' | 'scheduled' | 'active' | 'ended';
    locked: boolean;
    max_participants: number;
    host: {
        name: string;
    };
    is_host: boolean;
    share_url: string;
    expires_at: string;
    created_at: string;
    scheduled_at: string | null;
    timezone: string;
    duration_minutes: number;
    booking_count: number;
    is_booked: boolean;
    can_join: boolean;
    email_reminder_mode: 'preview' | 'delivery' | 'unavailable';
};
export type Reminder = { id: string; read_at: string | null; created_at: string; data: { title: string; body: string; meeting_code: string; scheduled_at: string; timezone: string } };
export type NotificationResponse = { notifications: Reminder[]; unread_count: number; email_reminder_mode: Meeting['email_reminder_mode'] };
export const notificationQuery = (userId?: number) => ({ queryKey: ['notifications', userId], queryFn: async () => (await api.get<NotificationResponse>('/api/v1/notifications')).data, enabled: !!userId, refetchInterval: 30000 });
export type Admission = {
    id: number;
    participant_identifier: string;
    display_name: string;
    status: 'pending' | 'approved' | 'rejected';
};
export type Member = {
    id: number;
    identity: string;
    display_name: string;
    role: string;
    left_at: string | null;
    removed_at: string | null;
};
export const meetingQuery = (code: string) => ({ queryKey: ['meeting', code], queryFn: async () => (await api.get<{
        meeting: Meeting;
    }>(`/api/v1/meetings/${encodeURIComponent(code)}`)).data.meeting });
