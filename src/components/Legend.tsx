import { GROUP_COLORS } from '../lib/artworks'

export default function Legend() {
  return (
    <ul className="legend" aria-label="Map legend: colour by kind of work">
      {Object.entries(GROUP_COLORS).map(([group, color]) => (
        <li key={group}>
          <span className="legend-dot" style={{ background: color }} aria-hidden="true" />
          {group}
        </li>
      ))}
    </ul>
  )
}
