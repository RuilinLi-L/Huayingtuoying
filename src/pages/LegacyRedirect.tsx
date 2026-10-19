import { Navigate, useLocation, useParams } from 'react-router-dom';
import { getEntryById } from '../lib/entries';
import { guidePath, stagePath } from '../lib/navigation';

export function LegacyRedirect() {
  const location = useLocation();
  const { moduleId, entryId } = useParams();
  if (location.pathname.startsWith('/learn/')) {
    return (
      <Navigate
        replace
        to={moduleId === 'fundamentals' ? guidePath(location.hash) : '/not-found'}
      />
    );
  }
  if (location.pathname.startsWith('/experience/')) {
    return (
      <Navigate
        replace
        to={
          getEntryById(entryId)
            ? stagePath(entryId === 'oboe-player' ? 'ar' : 'image-test', entryId, location.search)
            : '/not-found'
        }
      />
    );
  }
  const params = new URLSearchParams(location.search);
  // The old demo opened with an empty lineup; explicit empty and absent remain distinct.
  if (!params.has('lineup')) params.set('lineup', '');
  if (params.get('autostart') === '1') {
    params.set('view', 'ar');
    params.set('entry', 'oboe-player');
  }
  return <Navigate replace to={`/stage?${params}`} />;
}
