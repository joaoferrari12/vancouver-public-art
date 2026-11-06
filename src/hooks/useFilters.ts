import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { DEFAULT_FILTERS, type Filters } from '../lib/artworks'

/** Filters live in the URL (?q=&type=&area=&status=&decade=) so a filtered view can be shared or bookmarked. */
export function parseFilters(params: URLSearchParams): Filters {
  const status = params.get('status')
  const decade = Number.parseInt(params.get('decade') ?? '', 10)
  return {
    q: params.get('q') ?? '',
    type: params.get('type') || null,
    area: params.get('area') || null,
    status: status === 'gone' || status === 'all' ? status : 'in-place',
    decade: Number.isFinite(decade) ? decade : null,
  }
}

export function serializeFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.type) p.set('type', f.type)
  if (f.area) p.set('area', f.area)
  if (f.status !== DEFAULT_FILTERS.status) p.set('status', f.status)
  if (f.decade !== null) p.set('decade', String(f.decade))
  return p
}

export function useFilters(): [Filters, (patch: Partial<Filters>) => void, () => void] {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const update = useCallback(
    (patch: Partial<Filters>) => setParams(serializeFilters({ ...parseFilters(params), ...patch }), { replace: true }),
    [params, setParams],
  )
  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])
  return [filters, update, reset]
}
