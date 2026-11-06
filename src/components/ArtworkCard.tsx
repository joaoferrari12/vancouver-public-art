import { Link } from 'react-router'
import { colorOf, formatDistance, type Artwork } from '../lib/artworks'

interface Props {
  artwork: Artwork
  selected: boolean
  visited: boolean
  distance?: number
  onSelect: (id: number) => void
}

export default function ArtworkCard({ artwork: a, selected, visited, distance, onSelect }: Props) {
  const where = [a.site, a.address].filter(Boolean).join(', ')
  return (
    <li className={`card${selected ? ' is-selected' : ''}`} aria-current={selected ? 'true' : undefined}>
      <button type="button" className="card-locate" onClick={() => onSelect(a.id)} aria-label={`Show ${a.title} on the map`} disabled={a.lat === null}>
        <span className="dot" style={{ background: colorOf(a.type) }} aria-hidden="true" />
      </button>
      <div className="card-body">
        <h2>
          <Link to={`/art/${a.id}`}>{a.title}</Link>
          {visited && <span className="badge" title="Marked as visited">Visited</span>}
        </h2>
        <p className="muted small">
          {a.type}
          {a.year ? ` · ${a.year}` : ''}
          {a.area !== 'Unknown' ? ` · ${a.area}` : ''}
          {distance !== undefined && Number.isFinite(distance) ? ` · ${formatDistance(distance)} away` : ''}
        </p>
        {where && <p className="small">{where}</p>}
      </div>
    </li>
  )
}
