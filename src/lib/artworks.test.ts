import { describe, expect, it } from 'vitest'
import rows from '../../tests/fixtures/art-list.json'
import type { ArtworkRow } from '../api/vancouver'
import { applyFilters, bounds, colorOf, decadeOf, decades, DEFAULT_FILTERS, distanceM, facet, fold, formatDistance, groupOf, hasLocation, normalize, sortByDistance, sortByTitle } from './artworks'

const all = (rows as ArtworkRow[]).map(normalize)

describe('normalize', () => {
  it('maps a registry row to the app shape', () => {
    const a = normalize(rows[0] as ArtworkRow)
    expect(a).toMatchObject({ id: 1, title: 'Captain George Vancouver', type: 'Figurative', status: 'In place', area: 'Mount Pleasant', year: 1936, artistIds: [98] })
    expect(a.lat).toBeCloseTo(49.261185)
  })
  it('fills labels for missing values instead of leaving null', () => {
    const a = normalize({ registryid: 9, title_of_work: '  ', type: null, status: null, sitename: null, siteaddress: null, geo_local_area: null, yearofinstallation: 'unknown', primarymaterial: null, ownership: null, artists: null, geo_point_2d: null })
    expect(a).toMatchObject({ title: 'Untitled', type: 'Unknown', status: 'Unknown', area: 'Unknown', year: null, artistIds: [], lat: null, lon: null })
    expect(hasLocation(a)).toBe(false)
  })
  it('loads the whole fixture: 751 works, 609 with coordinates', () => {
    expect(all).toHaveLength(751)
    expect(all.filter(hasLocation)).toHaveLength(609)
  })
})

describe('filters', () => {
  it('defaults to works that are still in place', () => {
    const r = applyFilters(all, DEFAULT_FILTERS)
    expect(r).toHaveLength(478)
    expect(r.every(a => a.status === 'In place')).toBe(true)
  })
  it('"gone" is the complement of "in place" and "all" is everything', () => {
    const gone = applyFilters(all, { ...DEFAULT_FILTERS, status: 'gone' })
    expect(gone.length + 478).toBe(751)
    expect(applyFilters(all, { ...DEFAULT_FILTERS, status: 'all' })).toHaveLength(751)
  })
  it('combines kind, neighbourhood and decade', () => {
    const r = applyFilters(all, { ...DEFAULT_FILTERS, status: 'all', type: 'Mural', area: 'Mount Pleasant', decade: 2010 })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every(a => a.type === 'Mural' && a.area === 'Mount Pleasant' && a.year! >= 2010 && a.year! < 2020)).toBe(true)
  })
  it('search ignores case and accents and looks at title, place and material', () => {
    expect(fold('Montréal Café')).toBe('montreal cafe')
    const byTitle = applyFilters(all, { ...DEFAULT_FILTERS, status: 'all', q: 'captain george' })
    expect(byTitle.map(a => a.id)).toContain(1)
    const byMaterial = applyFilters(all, { ...DEFAULT_FILTERS, status: 'all', q: 'BRONZE' })
    expect(byMaterial.length).toBeGreaterThan(40)
    expect(byMaterial.every(a => fold([a.title, a.site, a.address, a.area, a.material, a.type].join(' ')).includes('bronze'))).toBe(true)
  })
})

describe('facets', () => {
  it('counts kinds most frequent first', () => {
    const f = facet(all, 'type')
    expect(f[0]).toEqual({ value: 'Sculpture', count: 187 })
    expect(f.reduce((s, x) => s + x.count, 0)).toBe(751)
  })
  it('decades are ascending and skip works without a year', () => {
    const d = decades(all)
    expect(d[0].value).toBe('1900')
    expect(d.map(x => Number(x.value))).toEqual(d.map(x => Number(x.value)).sort((a, b) => a - b))
    expect(decadeOf(1936)).toBe(1930)
    expect(decadeOf(null)).toBeNull()
  })
})

describe('geometry', () => {
  it('haversine: City Hall to the Art Gallery is about 2.4 km', () => {
    const d = distanceM(49.261185, -123.113918, 49.282879, -123.120461)
    expect(d).toBeGreaterThan(2300)
    expect(d).toBeLessThan(2550)
    expect(formatDistance(d)).toMatch(/^2\.[45] km$/)
    expect(formatDistance(420.4)).toBe('420 m')
  })
  it('sorts by distance and sends works without coordinates to the end', () => {
    const r = sortByDistance(all, { lat: 49.261185, lon: -123.113918 })
    expect(r[0].id).toBe(1)
    const firstUnlocated = r.findIndex(a => !hasLocation(a))
    expect(r.slice(firstUnlocated).every(a => !hasLocation(a))).toBe(true)
  })
  it('bounds cover every located work', () => {
    const b = bounds(all)!
    expect(b[0][0]).toBeLessThan(49.21)
    expect(b[1][0]).toBeGreaterThan(49.29)
    expect(bounds([normalize({ ...(rows[0] as ArtworkRow), geo_point_2d: null })])).toBeNull()
  })
})

describe('presentation', () => {
  it('sorts titles case-insensitively', () => {
    const t = sortByTitle(all).map(a => a.title.toLowerCase())
    expect(t).toEqual([...t].sort((a, b) => a.localeCompare(b, 'en')))
  })
  it('every registry type has a colour group', () => {
    for (const t of facet(all, 'type')) expect(colorOf(t.value)).toMatch(/^#/)
    expect(groupOf('Totem pole')).toBe('Sculpture')
    expect(groupOf('Mural')).toBe('Mural & 2D')
    expect(groupOf('Something new')).toBe('Other')
  })
})
