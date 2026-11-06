// Pure functions over the catalogue: normalising rows, filtering, facets, distance. No React, no fetch.
import type { ArtworkRow } from '../api/vancouver'

export interface Artwork {
  id: number
  title: string
  type: string
  status: string
  site: string | null
  address: string | null
  area: string
  year: number | null
  material: string | null
  ownership: string | null
  artistIds: number[]
  lat: number | null
  lon: number | null
}

export const UNKNOWN = 'Unknown'
export const IN_PLACE = 'In place'

/** Turn an API row into the shape the app uses: trimmed strings, numbers, no nulls where a label is needed. */
export function normalize(row: ArtworkRow): Artwork {
  const year = row.yearofinstallation ? Number.parseInt(row.yearofinstallation, 10) : NaN
  return {
    id: row.registryid,
    title: row.title_of_work?.trim() || 'Untitled',
    type: row.type?.trim() || UNKNOWN,
    status: row.status?.trim() || UNKNOWN,
    site: row.sitename?.trim() || null,
    address: row.siteaddress?.trim() || null,
    area: row.geo_local_area?.trim() || UNKNOWN,
    year: Number.isFinite(year) ? year : null,
    material: row.primarymaterial?.trim() || null,
    ownership: row.ownership?.trim() || null,
    artistIds: (row.artists ?? []).map(a => Number.parseInt(a, 10)).filter(Number.isFinite),
    lat: row.geo_point_2d?.lat ?? null,
    lon: row.geo_point_2d?.lon ?? null,
  }
}

export function hasLocation(a: Artwork): a is Artwork & { lat: number; lon: number } {
  return a.lat !== null && a.lon !== null
}

export interface Filters {
  /** Free text matched against title, site, address, area, material and type. */
  q: string
  type: string | null
  area: string | null
  /** `'in-place'` (default), `'gone'` or `'all'`. */
  status: 'in-place' | 'gone' | 'all'
  /** Start of a decade, e.g. 1990 keeps 1990–1999. */
  decade: number | null
}

export const DEFAULT_FILTERS: Filters = { q: '', type: null, area: null, status: 'in-place', decade: null }

/** Lower-case, accents stripped, so "Montréal" matches "montreal". */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesStatus(a: Artwork, status: Filters['status']): boolean {
  if (status === 'all') return true
  return status === 'in-place' ? a.status === IN_PLACE : a.status !== IN_PLACE
}

export function decadeOf(year: number | null): number | null {
  return year === null ? null : Math.floor(year / 10) * 10
}

export function applyFilters(all: Artwork[], f: Filters): Artwork[] {
  const q = fold(f.q.trim())
  return all.filter(a => {
    if (!matchesStatus(a, f.status)) return false
    if (f.type && a.type !== f.type) return false
    if (f.area && a.area !== f.area) return false
    if (f.decade !== null && decadeOf(a.year) !== f.decade) return false
    if (q) {
      const hay = fold([a.title, a.site, a.address, a.area, a.material, a.type].filter(Boolean).join(' '))
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export interface Facet {
  value: string
  count: number
}

/** Counts of each value of `key` in `rows`, most frequent first, ties by name. */
export function facet(rows: Artwork[], key: 'type' | 'area' | 'status'): Facet[] {
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r[key], (counts.get(r[key]) ?? 0) + 1)
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export function decades(rows: Artwork[]): Facet[] {
  const counts = new Map<number, number>()
  for (const r of rows) {
    const d = decadeOf(r.year)
    if (d !== null) counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([d, count]) => ({ value: String(d), count }))
}

export function sortByTitle(rows: Artwork[]): Artwork[] {
  return [...rows].sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }))
}

/** Great-circle distance in metres (haversine). */
export function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

export function sortByDistance(rows: Artwork[], from: { lat: number; lon: number }): Artwork[] {
  const d = (a: Artwork) => (hasLocation(a) ? distanceM(from.lat, from.lon, a.lat, a.lon) : Number.POSITIVE_INFINITY)
  return [...rows].sort((a, b) => d(a) - d(b))
}

/** Six colour groups so the map legend stays readable; the filter still offers every type. */
export type TypeGroup = 'Sculpture' | 'Mural & 2D' | 'Site-integrated' | 'Media & social' | 'Memorial' | 'Other'

export function groupOf(type: string): TypeGroup {
  switch (type) {
    case 'Sculpture':
    case 'Figurative':
    case 'Relief':
    case 'Totem pole':
    case 'Welcome figure':
    case 'Gateway':
      return 'Sculpture'
    case 'Two-dimensional artwork':
    case 'Mural':
    case 'Mosaic':
      return 'Mural & 2D'
    case 'Site-integrated work':
    case 'Fountain or water feature':
      return 'Site-integrated'
    case 'Media work':
    case 'Socially engaged art':
      return 'Media & social'
    case 'Memorial or monument':
      return 'Memorial'
    default:
      return 'Other'
  }
}

export const GROUP_COLORS: Record<TypeGroup, string> = {
  Sculpture: '#b45309',
  'Mural & 2D': '#be185d',
  'Site-integrated': '#0f766e',
  'Media & social': '#6d28d9',
  Memorial: '#1d4ed8',
  Other: '#525252',
}

export function colorOf(type: string): string {
  return GROUP_COLORS[groupOf(type)]
}

/** Bounding box of the located rows, or null when none has coordinates. */
export function bounds(rows: Artwork[]): [[number, number], [number, number]] | null {
  let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity
  for (const r of rows) {
    if (!hasLocation(r)) continue
    minLat = Math.min(minLat, r.lat); maxLat = Math.max(maxLat, r.lat)
    minLon = Math.min(minLon, r.lon); maxLon = Math.max(maxLon, r.lon)
  }
  return Number.isFinite(minLat) ? [[minLat, minLon], [maxLat, maxLon]] : null
}
