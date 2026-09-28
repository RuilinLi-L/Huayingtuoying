import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExperienceCarousel } from '../components/home/ExperienceCarousel';
import { SymphonyFilters } from '../components/home/SymphonyFilters';
import { SymphonyList } from '../components/home/SymphonyList';
import { symphonyFilters, symphonyPreviews, type SymphonyFilter } from '../data/symphonies';
import { buildEntryPath, buildExperiencePath } from '../lib/entries';
import { parseLaunchSearchParams } from '../lib/launch';

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<SymphonyFilter>('all');
  const launchContext = useMemo(
    () => parseLaunchSearchParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (launchContext.entryId) {
      navigate(
        launchContext.autostart
          ? buildExperiencePath(launchContext.entryId, {
              source: launchContext.source,
              autostart: launchContext.autostart,
            })
          : buildEntryPath(launchContext.entryId),
        { replace: true },
      );
      return;
    }

    if (
      searchParams.has('lineup') ||
      searchParams.get('source') === 'nfc' ||
      searchParams.get('autostart') === '1'
    ) {
      navigate(`/demo/base?${searchParams.toString()}`, { replace: true });
    }
  }, [launchContext, navigate, searchParams]);

  const visiblePreviews = symphonyPreviews.filter(
    (preview) => activeFilter === 'all' || preview.section === activeFilter,
  );

  return (
    <div className="home-page-v1">
      <ExperienceCarousel />
      <section className="home-symphonies" aria-labelledby="home-symphonies-title">
        <div className="home-section-heading">
          <div>
            <h2 id="home-symphonies-title">Symphonies</h2>
            <p>推荐曲目</p>
          </div>
          <span className="home-section-heading__mark" aria-hidden="true">♪</span>
        </div>
        <SymphonyFilters
          filters={symphonyFilters}
          activeFilter={activeFilter}
          onChange={setActiveFilter}
        />
        <SymphonyList previews={visiblePreviews} />
      </section>
    </div>
  );
}
