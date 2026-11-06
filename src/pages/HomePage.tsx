import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import ArtworkCard from '../components/ArtworkCard'
import FilterBar from '../components/FilterBar'
import Legend from '../components/Legend'
import { useCatalogue } from '../hooks/useCatalogue'
import { useFilters } from '../hooks/useFilters'
import { useVisited } from '../hooks/useVisited'
import { applyFilters, decades, distanceM, facet, hasLocation, matchesStatus, sortByDistance, sortByTitle } from '../lib/artworks'

// Leaflet is 40 kB gzip; load it after the list so the first paint does not wait for the map.
const ArtMap = lazy(() => import('../components/ArtMap'))

const PAGE = 48

export default function HomePage() {
  const catalogue = useCatalogue()
  const [filters, update, reset] = useFilters()
  const { has } = useVisited()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [here, setHere] = useState<{ lat: number; lon: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)
  const mapRef = useRef<HTMLElement>(null)

  // On a phone the map sits above the list, so bring it back into view when a card is chosen.
  const select = useCallback((id: number | null) => {
    setSelectedId(id)
    if (id !== null && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 959px)').matches) mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const all = catalogue.data ?? []
  // Facets count within the current status so the dropdowns never offer a value that yields zero results.
  const inStatus = useMemo(() => all.filter(a => matchesStatus(a, filters.status)), [all, filters.status])
  const types = useMemo(() => facet(inStatus, 'type'), [inStatus])
  const areas = useMemo(() => facet(inStatus, 'area').filter(a => a.value !== 'Unknown'), [inStatus])
  const decadeFacets = useMemo(() => decades(inStatus), [inStatus])

  const filtered = useMemo(() => applyFilters(all, filters), [all, filters])
  const ordered = useMemo(() => (here ? sortByDistance(filtered, here) : sortByTitle(filtered)), [filtered, here])
  const located = filtered.filter(hasLocation).length

  function locate() {
    if (!('geolocation' in navigator)) {
      setGeoError('Your browser does not offer location.')
      return
    }
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      pos => setHere({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeoError('Location was refused or unavailable; the list stays alphabetical.'),
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <div className="explorer">
      <section className="panel" aria-labelledby="results-heading">
        <FilterBar filters={filters} types={types} areas={areas} decades={decadeFacets} onChange={p => { update(p); setShown(PAGE); setSelectedId(null) }} onReset={() => { reset(); setShown(PAGE); setSelectedId(null) }} />
        <div className="results-head">
          <h1 id="results-heading">
            {catalogue.isPending ? 'Loading the catalogue…' : `${filtered.length} artwork${filtered.length === 1 ? '' : 's'}`}
          </h1>
          <div className="results-tools">
            {here ? (
              <button type="button" className="link-button" onClick={() => setHere(null)}>Sort by title</button>
            ) : (
              <button type="button" className="link-button" onClick={locate}>Near me</button>
            )}
          </div>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {catalogue.isPending ? '' : `${filtered.length} artworks match, ${located} on the map${here ? ', sorted by distance from you' : ''}.`}
        </p>
        {geoError && <p className="notice" role="alert">{geoError}</p>}
        {catalogue.isError && (
          <p className="notice error" role="alert">
            The City of Vancouver API did not answer ({catalogue.error.message}). <button type="button" className="link-button" onClick={() => catalogue.refetch()}>Try again</button>
          </p>
        )}
        {catalogue.isPending && (
          <ul className="list" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => <li key={i} className="card skeleton" />)}
          </ul>
        )}
        {catalogue.isSuccess && filtered.length === 0 && (
          <p className="notice">Nothing matches these filters. <button type="button" className="link-button" onClick={reset}>Clear them</button></p>
        )}
        {catalogue.isSuccess && filtered.length > 0 && (
          <>
            <ul className="list">
              {ordered.slice(0, shown).map(a => (
                <ArtworkCard
                  key={a.id}
                  artwork={a}
                  selected={a.id === selectedId}
                  visited={has(a.id)}
                  distance={here && hasLocation(a) ? distanceM(here.lat, here.lon, a.lat, a.lon) : undefined}
                  onSelect={select}
                />
              ))}
            </ul>
            {shown < ordered.length && (
              <button type="button" className="button secondary wide" onClick={() => setShown(s => s + PAGE)}>
                Show {Math.min(PAGE, ordered.length - shown)} more of {ordered.length - shown}
              </button>
            )}
          </>
        )}
      </section>
      <section className="map-wrap" aria-label="Map" ref={mapRef}>
        <Suspense fallback={<div className="map map-loading" aria-busy="true">Loading map…</div>}>
          <ArtMap artworks={filtered} selectedId={selectedId} onSelect={select} here={here} />
        </Suspense>
        <Legend />
      </section>
    </div>
  )
}
