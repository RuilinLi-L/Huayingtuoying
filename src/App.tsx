import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { AppShell } from './components/AppShell';
import { SplashScreen } from './components/SplashScreen';

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

function RouteFallback() {
  return <div className="route-fallback" aria-label="页面加载中" />;
}

function shouldBypassSplash(pathname: string, search: string) {
  const searchParams = new URLSearchParams(search);

  return (
    pathname.startsWith('/entry/') ||
    pathname.startsWith('/experience/') ||
    Boolean(searchParams.get('entry')) ||
    searchParams.has('lineup') ||
    searchParams.get('source') === 'nfc' ||
    searchParams.get('autostart') === '1' ||
    searchParams.get('autostart') === 'true'
  );
}

export default function App() {
  const location = useLocation();
  const [isSplashDismissed, setIsSplashDismissed] = useState(false);
  const shouldShowSplash =
    !isSplashDismissed &&
    !shouldBypassSplash(location.pathname, location.search);

  return (
    <>
      <SplashScreen
        enabled={shouldShowSplash}
        onEnter={() => setIsSplashDismissed(true)}
      />
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
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
      </AppShell>
    </>
  );
}
