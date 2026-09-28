import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from './components/AppShell';
import { MobileShell } from './components/layout/MobileShell';

const EntryPage = lazy(() =>
  import('./pages/EntryPage').then((module) => ({ default: module.EntryPage })),
);
const ExperiencePage = lazy(() =>
  import('./pages/ExperiencePage').then((module) => ({ default: module.ExperiencePage })),
);
const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage })),
);
const LearnPage = lazy(() =>
  import('./pages/LearnPage').then((module) => ({ default: module.LearnPage })),
);
const MusicComposePage = lazy(() =>
  import('./pages/MusicComposePage').then((module) => ({
    default: module.MusicComposePage,
  })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const OrchestraDemoPage = lazy(() =>
  import('./pages/OrchestraDemoPage').then((module) => ({
    default: module.OrchestraDemoPage,
  })),
);
const StagePage = lazy(() =>
  import('./pages/StagePage').then((module) => ({ default: module.StagePage })),
);
const KnowledgePage = lazy(() =>
  import('./pages/KnowledgePage').then((module) => ({ default: module.KnowledgePage })),
);

function RouteFallback() {
  return <div className="route-fallback" aria-label="页面加载中" />;
}

export default function App() {
  const location = useLocation();
  const isMobileRoute =
    location.pathname === '/' ||
    location.pathname === '/home' ||
    location.pathname === '/compose' ||
    location.pathname === '/stage' ||
    location.pathname.startsWith('/knowledge/');
  const routes = (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stage" element={<StagePage />} />
        <Route path="/knowledge/instruments" element={<KnowledgePage />} />
        <Route path="/knowledge/instruments/:instrumentId" element={<KnowledgePage />} />
        <Route path="/knowledge/theory/:topicId" element={<Navigate to="/learn/fundamentals" replace />} />
        <Route path="/compose" element={<MusicComposePage />} />
        <Route path="/demo/base" element={<OrchestraDemoPage />} />
        <Route path="/entry/:entryId" element={<EntryPage />} />
        <Route path="/experience/:entryId" element={<ExperiencePage />} />
        <Route path="/learn/:moduleId" element={<LearnPage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/not-found" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );

  return isMobileRoute ? (
    <MobileShell>{routes}</MobileShell>
  ) : (
    <AppShell>{routes}</AppShell>
  );
}
