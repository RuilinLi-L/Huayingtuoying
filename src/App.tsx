import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LegacyRedirect } from './pages/LegacyRedirect';
import { KnowledgeAudioProvider } from './components/knowledge/KnowledgeAudio';
import { MobileShell } from './components/layout/MobileShell';

const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage })),
);

const MusicComposePage = lazy(() =>
  import('./pages/MusicComposePage').then((module) => ({
    default: module.MusicComposePage,
  })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

const StagePage = lazy(() =>
  import('./pages/StagePage').then((module) => ({ default: module.StagePage })),
);

const InstrumentLibraryPage = lazy(() =>
  import('./pages/knowledge/InstrumentLibraryPage').then((module) => ({ default: module.InstrumentLibraryPage })),
);
const InstrumentDetailPage = lazy(() =>
  import('./pages/knowledge/InstrumentDetailPage').then((module) => ({ default: module.InstrumentDetailPage })),
);
const TheoryPage = lazy(() =>
  import('./pages/knowledge/TheoryPage').then((module) => ({ default: module.TheoryPage })),
);

const KnowledgeGuidePage = lazy(() => import('./pages/knowledge/KnowledgeGuidePage').then(m => ({default:m.KnowledgeGuidePage})));

function RouteFallback() {
  return <div className="route-fallback" role="status">正在打开…</div>;
}

export default function App() {
  const location=useLocation();
  const routes = (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stage" element={<StagePage />} />
        <Route path="/knowledge/guide" element={<KnowledgeGuidePage />} />
        <Route path="/knowledge/instruments" element={<InstrumentLibraryPage />} />
        <Route path="/knowledge/instruments/:instrumentId" element={<InstrumentDetailPage />} />
        <Route path="/knowledge/theory/:topicId" element={<TheoryPage />} />
        <Route path="/compose" element={<MusicComposePage />} />
        <Route path="/demo/base" element={<LegacyRedirect />} />
        <Route path="/entry/:entryId" element={<LegacyRedirect />} />
        <Route path="/experience/:entryId" element={<LegacyRedirect />} />
        <Route path="/learn/:moduleId" element={<LegacyRedirect />} />
        <Route path="/home" element={<Navigate to={{pathname:'/',search:location.search,hash:location.hash}} replace />} />
        <Route path="/not-found" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );

  return <KnowledgeAudioProvider><MobileShell>{routes}</MobileShell></KnowledgeAudioProvider>;
}
