import { Navigate, useLocation, useParams } from 'react-router-dom';
import { getEntryById } from '../lib/entries';
import { theoryTopics } from '../data/theoryTopicDefinitions';

/** Keep printed links and bookmarks usable without rendering the retired UI. */
export function LegacyRedirect() {
  const location = useLocation();
  const { moduleId, entryId } = useParams();
  if (location.pathname.startsWith('/learn/')) {
    if (moduleId !== 'fundamentals') return <Navigate replace to="/not-found" />;
    const cardId = location.hash.slice(1);
    const topic = theoryTopics.find((item) => item.cardId === cardId);
    return <Navigate replace to={topic ? `/knowledge/theory/${topic.id}` : cardId === 'instrument-encyclopedia' ? '/knowledge/instruments' : '/knowledge/guide'} />;
  }
  const params = new URLSearchParams(location.search);
  if (entryId) {
    const entry = getEntryById(entryId);
    if (!entry) return <Navigate replace to="/not-found" />;
    if (!params.has('lineup')) params.set('lineup', entry.audioStems.map((stem) => stem.id).join(','));
    if (entry.audioStems.length === 1) params.set('highlight', entry.audioStems[0].id);
  }
  return <Navigate replace to={`/stage${params.size ? `?${params}` : ''}`} />;
}
