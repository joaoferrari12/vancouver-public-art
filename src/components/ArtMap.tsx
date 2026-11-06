import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router'
import { bounds, colorOf, hasLocation, type Artwork } from '../lib/artworks'

export const VANCOUVER: [number, number] = [49.2608, -123.1139]

interface Props {
  artworks: Artwork[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  /** The viewer's position, when they asked for it. */
  here: { lat: number; lon: number } | null
  /** When true the map fits the artworks on every change; the home page turns it off while the viewer is browsing. */
  fit?: boolean
}

/** Fits the map to the current artworks; only when the set changes, not on every render. */
function FitTo({ artworks, enabled }: { artworks: Artwork[]; enabled: boolean }) {
  const map = useMap()
  const key = artworks.map(a => a.id).join(',')
  useEffect(() => {
    if (!enabled) return
    const b = bounds(artworks)
    if (b) map.fitBounds(b, { padding: [24, 24], maxZoom: 16, animate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, map])
  return null
}

/** Leaflet measures its container once; if the container is sized by CSS later (grid, lazy chunk), tell it. */
function Resize() {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [map])
  return null
}

/** Pans to the selected artwork. */
function FlyTo({ artwork }: { artwork: Artwork | null }) {
  const map = useMap()
  useEffect(() => {
    if (artwork && hasLocation(artwork)) map.flyTo([artwork.lat, artwork.lon], Math.max(map.getZoom(), 15), { duration: 0.6 })
  }, [artwork, map])
  return null
}

/** The selected artwork's marker: drawn on top, larger, with its popup open. */
function SelectedMarker({ artwork }: { artwork: Artwork & { lat: number; lon: number } }) {
  const ref = useRef<L.CircleMarker>(null)
  useEffect(() => {
    const t = setTimeout(() => ref.current?.openPopup(), 650) // after flyTo lands
    return () => clearTimeout(t)
  }, [artwork])
  return (
    <CircleMarker ref={ref} center={[artwork.lat, artwork.lon]} radius={10} pathOptions={{ color: '#111', weight: 2, fillColor: colorOf(artwork.type), fillOpacity: 1 }}>
      <Popup>
        <strong>{artwork.title}</strong>
        <br />
        <span>{artwork.type}{artwork.year ? ` · ${artwork.year}` : ''}</span>
        <br />
        <Link to={`/art/${artwork.id}`}>Details</Link>
      </Popup>
    </CircleMarker>
  )
}

export default function ArtMap({ artworks, selectedId, onSelect, here, fit = true }: Props) {
  const located = artworks.filter(hasLocation)
  const selected = artworks.find(a => a.id === selectedId) ?? null
  return (
    <MapContainer
      center={VANCOUVER}
      zoom={12}
      preferCanvas
      scrollWheelZoom
      className="map"
      // Leaflet's own markup has no landmark; the wrapper names the region for screen readers.
      aria-label="Map of Vancouver public art"
      renderer={L.canvas({ padding: 0.5 })}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <Resize />
      <FitTo artworks={located} enabled={fit && !selected} />
      <FlyTo artwork={selected} />
      {here && (
        <CircleMarker center={[here.lat, here.lon]} radius={9} pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}>
          <Popup>You are here</Popup>
        </CircleMarker>
      )}
      {located.map(a => {
        if (a.id === selectedId) return null
        return (
          <CircleMarker
            key={a.id}
            center={[a.lat, a.lon]}
            radius={6}
            pathOptions={{ color: '#fff', weight: 1, fillColor: colorOf(a.type), fillOpacity: 0.9 }}
            eventHandlers={{ click: () => onSelect(a.id) }}
          >
            <Popup>
              <strong>{a.title}</strong>
              <br />
              <span>{a.type}{a.year ? ` · ${a.year}` : ''}</span>
              <br />
              <Link to={`/art/${a.id}`}>Details</Link>
            </Popup>
          </CircleMarker>
        )
      })}
      {selected && hasLocation(selected) && <SelectedMarker artwork={selected} />}
    </MapContainer>
  )
}
