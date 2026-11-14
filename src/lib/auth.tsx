import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { api, csrf, type User } from './api';
const AuthContext = createContext<{
    user: User | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}>({ user: null, loading: true, login: async () => { }, logout: async () => { } });
function firebaseAuth() {
    const e = import.meta.env;
    if (!e.VITE_FIREBASE_API_KEY || !e.VITE_FIREBASE_AUTH_DOMAIN || !e.VITE_FIREBASE_PROJECT_ID || !e.VITE_FIREBASE_APP_ID)
        throw new Error('Google sign-in is not configured. Ask the administrator to configure Firebase.');
    return getAuth(initializeApp({ apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID, appId: e.VITE_FIREBASE_APP_ID }));
}
export function AuthProvider({ children }: {
    children: ReactNode;
}) {
    const client = useQueryClient();
    useEffect(() => {
        const interceptor = api.interceptors.response.use(response => response, error => {
            if (error.response?.status === 401) {
                client.setQueryData(['session'], null);
                client.removeQueries({ predicate: query => query.queryKey[0] !== 'session' });
            }
            return Promise.reject(error);
        });
        return () => api.interceptors.response.eject(interceptor);
    }, [client]);
    const session = useQuery({ queryKey: ['session'], queryFn: async () => {
            try {
                return (await api.get<{
                    user: User;
                }>('/api/v1/auth/me')).data.user;
            }
            catch (e) {
                if ((e as {
                    response?: {
                        status: number;
                    };
                }).response?.status === 401)
                    return null;
                throw e;
            }
        }, retry: false, staleTime: 60000 });
    async function login() {
        const auth = firebaseAuth();
        await setPersistence(auth, inMemoryPersistence);
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        try {
            await csrf();
            const { data } = await api.post<{
                user: User;
            }>('/api/v1/auth/firebase', { id_token: await result.user.getIdToken() });
            client.setQueryData(['session'], data.user);
        }
        finally {
            await signOut(auth);
        }
    }
    async function logout() {
        await csrf();
        try {
            await api.post('/api/v1/auth/logout');
        }
        catch (error) {
            if ((error as {
                response?: {
                    status: number;
                };
            }).response?.status !== 401)
                throw error;
        }
        client.clear();
        client.setQueryData(['session'], null);
    }
    return <AuthContext.Provider value={{ user: session.data ?? null, loading: session.isPending, login, logout }}>
        {children}
    </AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
