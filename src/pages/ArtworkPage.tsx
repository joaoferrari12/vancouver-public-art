import { lazy, Suspense } from 'react'
import { Link, useParams } from 'react-router'
import { useArtists, useArtwork, useCatalogue } from '../hooks/useCatalogue'
import { useVisited } from '../hooks/useVisited'
import { normalize } from '../lib/artworks'

const ArtMap = lazy(() => import('../components/ArtMap'))

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\r?\n+/).map(p => p.trim()).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
    </>
  )
}

export default function ArtworkPage() {
  const { id: idParam } = useParams()
  const id = Number.parseInt(idParam ?? '', 10)
  const detail = useArtwork(id)
  const catalogue = useCatalogue()
  const { has, toggle } = useVisited()

  // The catalogue (already cached from the map page) gives the summary at once; the detail call adds the long texts.
  const summary = catalogue.data?.find(a => a.id === id) ?? (detail.data ? normalize(detail.data) : null)
  const artists = useArtists(summary?.artistIds ?? [])

  if (!Number.isFinite(id)) return <p className="notice error">That is not an artwork id.</p>
  if (detail.isError) return <p className="notice error" role="alert">Could not load this artwork ({detail.error.message}).</p>
  if (detail.isSuccess && detail.data === null) return <p className="notice">No artwork with id {id} in the registry.</p>
  if (!summary) return <p className="notice" aria-busy="true">Loading…</p>

  const row = detail.data
  const visited = has(id)
  const where = [row?.locationonsite, summary.site, summary.address].filter(Boolean).join(' · ')

  return (
    <article className="detail">
      <p><Link to="/" className="back">← Back to the map</Link></p>
      <header className="detail-head">
        <h1>{summary.title}</h1>
        <p className="muted">
          {summary.type}
          {summary.year ? ` · ${summary.year}` : ''}
          {summary.status !== 'In place' ? ` · ${summary.status}` : ''}
        </p>
        <button type="button" className={`button${visited ? ' secondary' : ''}`} aria-pressed={visited} onClick={() => toggle(id)}>
          {visited ? '✓ Visited' : 'Mark as visited'}
        </button>
      </header>

      <div className="detail-grid">
        <div className="detail-text">
          <dl className="meta">
            {where && (<><dt>Where</dt><dd>{where}</dd></>)}
            {summary.area !== 'Unknown' && (<><dt>Neighbourhood</dt><dd>{summary.area}</dd></>)}
            {summary.material && (<><dt>Material</dt><dd>{summary.material}</dd></>)}
            {summary.ownership && (<><dt>Owner</dt><dd>{summary.ownership}</dd></>)}
          </dl>
          {detail.isPending && <p className="muted" aria-busy="true">Loading the description…</p>}
          {row?.descriptionofwork && (
            <section aria-labelledby="desc">
              <h2 id="desc">About the work</h2>
              <Paragraphs text={row.descriptionofwork} />
            </section>
          )}
          {row?.artistprojectstatement && (
            <section aria-labelledby="statement">
              <h2 id="statement">Artist statement</h2>
              <Paragraphs text={row.artistprojectstatement} />
            </section>
          )}
          <section aria-labelledby="artists">
            <h2 id="artists">{summary.artistIds.length === 1 ? 'Artist' : 'Artists'}</h2>
            {summary.artistIds.length === 0 && <p className="muted">No artist recorded.</p>}
            {artists.isPending && summary.artistIds.length > 0 && <p className="muted" aria-busy="true">Loading…</p>}
            {artists.isError && <p className="notice error">Could not load the artists.</p>}
            {artists.data?.map(ar => (
              <div className="artist" key={ar.artistid}>
                <h3>
                  {[ar.firstname, ar.lastname].filter(Boolean).join(' ') || `Artist ${ar.artistid}`}
                  {ar.country && <span className="muted small"> · {ar.country}</span>}
                </h3>
                {ar.biography ? <Paragraphs text={ar.biography} /> : <p className="muted small">No biography in the registry.</p>}
                {ar.website && <p className="small"><a href={ar.website} rel="noopener noreferrer">Website</a></p>}
              </div>
            ))}
          </section>
          {row?.url && (
            <p className="small">
              Source: <a href={row.url} rel="noopener noreferrer">City of Vancouver Public Art Registry</a>
              {row.photocredits ? ` · photos there by ${row.photocredits}` : ''}
            </p>
          )}
        </div>
        <aside className="detail-map" aria-label="Location">
          {summary.lat !== null ? (
            <Suspense fallback={<div className="map map-loading" aria-busy="true">Loading map…</div>}>
              <ArtMap artworks={[summary]} selectedId={null} onSelect={() => {}} here={null} />
            </Suspense>
          ) : (
            <p className="notice">The registry has no coordinates for this work.</p>
          )}
        </aside>
      </div>
    </article>
  )
}
