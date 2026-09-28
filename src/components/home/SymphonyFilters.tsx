import type { SymphonyFilter } from '../../data/symphonies';

interface Props {
  filters: readonly { id: SymphonyFilter; label: string }[];
  activeFilter: SymphonyFilter;
  onChange: (filter: SymphonyFilter) => void;
}

export function SymphonyFilters({ filters, activeFilter, onChange }: Props) {
  return (
    <div className="home-symphony-filters" role="group" aria-label="曲目分类">
      {filters.map((filter) => (
        <button
          className={activeFilter === filter.id ? 'home-filter home-filter--active' : 'home-filter'}
          type="button"
          key={filter.id}
          aria-pressed={activeFilter === filter.id}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
