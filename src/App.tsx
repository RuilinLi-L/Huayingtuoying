import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { EntryPage } from './pages/EntryPage';
import { ExperiencePage } from './pages/ExperiencePage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrchestraDemoPage } from './pages/OrchestraDemoPage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/demo/base" element={<OrchestraDemoPage />} />
        <Route path="/entry/:entryId" element={<EntryPage />} />
        <Route path="/experience/:entryId" element={<ExperiencePage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/not-found" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
