import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { TeamsProvider } from './community/TeamsContext';
import { CommunityProvider } from './community/CommunityContext';
import { InvitationsProvider } from './community/InvitationsContext';
import { AboutPage, AdminPage, CommunityHome, CommunityLayout, LegalPage, ProfilePage } from './community/CommunityPages';
const EventsPage = lazy(() => import('./community/EventsPage'));
const FeedPage = lazy(() => import('./community/FeedPage'));
const TeamsPage = lazy(() => import('./community/TeamsPage'));
const ActivityPage = lazy(() => import('./community/ActivityPage'));
const PeoplePages = lazy(() => import('./community/PeoplePages'));
const ConnectionsPage = lazy(() => import('./community/ConnectionsPage'));

export default function App() {
  return <HashRouter><CommunityProvider><InvitationsProvider><TeamsProvider><Suspense fallback={<div className="c-empty" role="status">Cargando Cantera…</div>}><Routes><Route element={<CommunityLayout />}>
    <Route index element={<CommunityHome />} />
    <Route path="play" element={<EventsPage />} /><Route path="play/:eventId" element={<EventsPage />} />
    <Route path="feed" element={<FeedPage />} /><Route path="profile" element={<ProfilePage />} />
    <Route path="people" element={<PeoplePages />} /><Route path="people/:profileId" element={<PeoplePages />} />
    <Route path="teams" element={<TeamsPage />} /><Route path="teams/join/:inviteId" element={<TeamsPage />} /><Route path="teams/:teamId" element={<TeamsPage />} /><Route path="activity" element={<ActivityPage />} />
    <Route path="connect" element={<ConnectionsPage />} /><Route path="invite/:code" element={<ConnectionsPage />} />
    <Route path="admin" element={<AdminPage />} /><Route path="about" element={<AboutPage />} />
    <Route path="legal/:kind" element={<LegalPage />} /><Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes></Suspense></TeamsProvider></InvitationsProvider></CommunityProvider></HashRouter>;
}
