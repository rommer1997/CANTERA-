import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { CommunityProvider } from './community/CommunityContext';
import { AboutPage, AdminPage, CommunityHome, CommunityLayout, LegalPage, ProfilePage } from './community/CommunityPages';
const EventsPage = lazy(() => import('./community/EventsPage'));
const FeedPage = lazy(() => import('./community/FeedPage'));
const PeoplePages = lazy(() => import('./community/PeoplePages'));

export default function App() {
  return <HashRouter><CommunityProvider><Suspense fallback={<div className="c-empty" role="status">Cargando Cantera…</div>}><Routes><Route element={<CommunityLayout />}>
    <Route index element={<CommunityHome />} />
    <Route path="play" element={<EventsPage />} /><Route path="play/:eventId" element={<EventsPage />} />
    <Route path="feed" element={<FeedPage />} /><Route path="profile" element={<ProfilePage />} />
    <Route path="people" element={<PeoplePages />} /><Route path="people/:profileId" element={<PeoplePages />} />
    <Route path="admin" element={<AdminPage />} /><Route path="about" element={<AboutPage />} />
    <Route path="legal/:kind" element={<LegalPage />} /><Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes></Suspense></CommunityProvider></HashRouter>;
}
