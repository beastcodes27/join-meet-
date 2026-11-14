import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { ToastProvider, PageLoading, ScrollToTop } from './components/ui';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Legal from './pages/Legal';
import './styles.css';
const MeetingPage = lazy(() => import('./pages/MeetingPage'));
const client = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } });
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
        <QueryClientProvider client={client}>
            <BrowserRouter>
                <AuthProvider>
                    <ToastProvider>
                        <ScrollToTop />
                        <Suspense fallback={<PageLoading />}>
                            <Routes>
                                <Route path="/" element={<Landing />}/>
                                <Route path="/login" element={<Login />}/>
                                <Route path="/dashboard" element={<Dashboard />}/>
                                <Route path="/m/:code" element={<MeetingPage />}/>
                                <Route path="/privacy" element={<Legal />}/>
                                <Route path="/terms" element={<Legal />}/>
                                <Route path="*" element={<main className="page-loading">
                                    <h1>That page isn’t here.</h1>
                                    <Link to="/">Return home</Link>
                                </main>}/>
                            </Routes>
                        </Suspense>
                    </ToastProvider>
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>);
