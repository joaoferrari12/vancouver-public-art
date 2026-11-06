import { useId } from 'react'
import { type Facet, type Filters } from '../lib/artworks'

interface Props {
  filters: Filters
  types: Facet[]
  areas: Facet[]
  decades: Facet[]
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
}

const STATUS: { value: Filters['status']; label: string }[] = [
  { value: 'in-place', label: 'In place' },
  { value: 'gone', label: 'No longer there' },
  { value: 'all', label: 'All' },
]

export default function FilterBar({ filters, types, areas, decades, onChange, onReset }: Props) {
  const id = useId()
  const active = Boolean(filters.q || filters.type || filters.area || filters.decade !== null || filters.status !== 'in-place')
  return (
    <form className="filters" role="search" aria-label="Filter artworks" onSubmit={e => e.preventDefault()}>
      <div className="field grow">
        <label htmlFor={`${id}-q`}>Search</label>
        <input
          id={`${id}-q`}
          type="search"
          placeholder="Title, place, material…"
          value={filters.q}
          onChange={e => onChange({ q: e.target.value })}
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-type`}>Kind</label>
        <select id={`${id}-type`} value={filters.type ?? ''} onChange={e => onChange({ type: e.target.value || null })}>
          <option value="">All kinds</option>
          {types.map(t => (
            <option key={t.value} value={t.value}>{t.value} ({t.count})</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-area`}>Neighbourhood</label>
        <select id={`${id}-area`} value={filters.area ?? ''} onChange={e => onChange({ area: e.target.value || null })}>
          <option value="">All neighbourhoods</option>
          {areas.map(a => (
            <option key={a.value} value={a.value}>{a.value} ({a.count})</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-decade`}>Decade</label>
        <select id={`${id}-decade`} value={filters.decade ?? ''} onChange={e => onChange({ decade: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Any decade</option>
          {decades.map(d => (
            <option key={d.value} value={d.value}>{d.value}s ({d.count})</option>
          ))}
        </select>
      </div>
      <fieldset className="chips">
        <legend>Status</legend>
        {STATUS.map(s => (
          <button
            key={s.value}
            type="button"
            className="chip"
            aria-pressed={filters.status === s.value}
            onClick={() => onChange({ status: s.value })}
          >
            {s.label}
          </button>
        ))}
      </fieldset>
      {active && (
        <button type="button" className="link-button" onClick={onReset}>
          Clear filters
        </button>
      )}
    </form>
  )
}
