// City of Vancouver Open Data, Explore API v2.1 (Opendatasoft).
// No key, CORS enabled, 15 000 calls per day per IP. Datasets:
//   public-art          one row per artwork (751 in Nov 2026)
//   public-art-artists  one row per artist (638)
// https://opendata.vancouver.ca/explore/dataset/public-art/information/

export const API_ORIGIN = 'https://opendata.vancouver.ca'
const BASE = `${API_ORIGIN}/api/explore/v2.1/catalog/datasets`

/** The fields the catalogue needs for the map, the list and the filters. Long texts are fetched per artwork. */
export const LIST_FIELDS = [
  'registryid',
  'title_of_work',
  'type',
  'status',
  'sitename',
  'siteaddress',
  'geo_local_area',
  'yearofinstallation',
  'primarymaterial',
  'ownership',
  'artists',
  'geo_point_2d',
] as const

export interface ArtworkRow {
  registryid: number
  title_of_work: string | null
  type: string | null
  status: string | null
  sitename: string | null
  siteaddress: string | null
  geo_local_area: string | null
  yearofinstallation: string | null
  primarymaterial: string | null
  ownership: string | null
  artists: string[] | null
  geo_point_2d: { lon: number; lat: number } | null
}

export interface ArtworkDetailRow extends ArtworkRow {
  descriptionofwork: string | null
  artistprojectstatement: string | null
  locationonsite: string | null
  neighbourhood: string | null
  url: string | null
  photocredits: string | null
}

export interface ArtistRow {
  artistid: number
  firstname: string | null
  lastname: string | null
  country: string | null
  biography: string | null
  website: string | null
  artisturl: string | null
}

/** The whole catalogue in one call: the export endpoint accepts `limit=-1` and `select`, and gzips to ~58 kB. */
export function catalogueUrl(): string {
  const u = new URL(`${BASE}/public-art/exports/json`)
  u.searchParams.set('select', LIST_FIELDS.join(','))
  u.searchParams.set('limit', '-1')
  return u.toString()
}

export function artworkUrl(id: number): string {
  const u = new URL(`${BASE}/public-art/records`)
  u.searchParams.set('where', `registryid=${Math.trunc(id)}`)
  u.searchParams.set('limit', '1')
  return u.toString()
}

export function artistsUrl(ids: number[]): string {
  const u = new URL(`${BASE}/public-art-artists/records`)
  const list = ids.map(n => Math.trunc(n)).join(',')
  u.searchParams.set('where', `artistid IN (${list})`)
  u.searchParams.set('select', 'artistid,firstname,lastname,country,biography,website,artisturl')
  u.searchParams.set('limit', String(Math.max(ids.length, 1)))
  return u.toString()
}

export class ApiError extends Error {
  status: number
  constructor(status: number, url: string) {
    super(`City of Vancouver API answered ${status} for ${url}`)
    this.status = status
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new ApiError(res.status, url)
  return (await res.json()) as T
}

export function fetchCatalogue(signal?: AbortSignal): Promise<ArtworkRow[]> {
  return getJson<ArtworkRow[]>(catalogueUrl(), signal)
}

export async function fetchArtwork(id: number, signal?: AbortSignal): Promise<ArtworkDetailRow | null> {
  const data = await getJson<{ results: ArtworkDetailRow[] }>(artworkUrl(id), signal)
  return data.results[0] ?? null
}

export async function fetchArtists(ids: number[], signal?: AbortSignal): Promise<ArtistRow[]> {
  if (ids.length === 0) return []
  const data = await getJson<{ results: ArtistRow[] }>(artistsUrl(ids), signal)
  return data.results
}
