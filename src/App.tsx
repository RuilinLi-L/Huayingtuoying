import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { SplashScreen } from './components/SplashScreen';
import { EntryPage } from './pages/EntryPage';
import { ExperiencePage } from './pages/ExperiencePage';
import { HomePage } from './pages/HomePage';
import { LearnPage } from './pages/LearnPage';
import { MusicComposePage } from './pages/MusicComposePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrchestraDemoPage } from './pages/OrchestraDemoPage';

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

  return (
    <>
      <SplashScreen enabled={!shouldBypassSplash(location.pathname, location.search)} />
      <AppShell>
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
      </AppShell>
    </>
  );
}
