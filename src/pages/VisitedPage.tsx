import { Link } from 'react-router'
import ArtworkCard from '../components/ArtworkCard'
import { useCatalogue } from '../hooks/useCatalogue'
import { useVisited } from '../hooks/useVisited'
import { sortByTitle } from '../lib/artworks'

export default function VisitedPage() {
  const catalogue = useCatalogue()
  const { visited, toggle } = useVisited()
  const rows = sortByTitle((catalogue.data ?? []).filter(a => visited.includes(a.id)))
  return (
    <section className="page">
      <h1>Visited</h1>
      <p className="muted">Artworks you marked as seen. They are kept in this browser only.</p>
      {catalogue.isPending && <p aria-busy="true">Loading…</p>}
      {catalogue.isSuccess && rows.length === 0 && (
        <p className="notice">Nothing yet. Open an artwork from the <Link to="/">map</Link> and press "Mark as visited".</p>
      )}
      {rows.length > 0 && (
        <>
          <p role="status">{rows.length} of {catalogue.data?.length ?? 0} artworks visited.</p>
          <ul className="list">
            {rows.map(a => <ArtworkCard key={a.id} artwork={a} selected={false} visited onSelect={() => {}} />)}
          </ul>
          <button type="button" className="link-button" onClick={() => rows.forEach(a => toggle(a.id))}>Clear the list</button>
        </>
      )}
    </section>
  )
}
