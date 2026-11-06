import { describe, expect, it } from 'vitest'
import { API_ORIGIN, artistsUrl, artworkUrl, catalogueUrl, LIST_FIELDS } from './vancouver'

describe('City of Vancouver API URLs', () => {
  it('stay on opendata.vancouver.ca and carry no credential', () => {
    for (const u of [catalogueUrl(), artworkUrl(200), artistsUrl([98, 231])]) {
      expect(u.startsWith(`${API_ORIGIN}/api/explore/v2.1/catalog/datasets/`)).toBe(true)
      expect(u).not.toMatch(/apikey|api_key|token|secret/i)
    }
  })
  it('the catalogue is one export call with only the list fields', () => {
    const u = new URL(catalogueUrl())
    expect(u.pathname).toMatch(/public-art\/exports\/json$/)
    expect(u.searchParams.get('limit')).toBe('-1')
    expect(u.searchParams.get('select')!.split(',')).toEqual([...LIST_FIELDS])
  })
  it('ids are truncated to integers so nothing else can be injected into the where clause', () => {
    expect(new URL(artworkUrl(200.9)).searchParams.get('where')).toBe('registryid=200')
    expect(new URL(artistsUrl([98.2, 231])).searchParams.get('where')).toBe('artistid IN (98,231)')
    expect(new URL(artistsUrl([98, 231])).searchParams.get('limit')).toBe('2')
  })
})
