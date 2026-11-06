import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS } from '../lib/artworks'
import { parseFilters, serializeFilters } from './useFilters'

describe('filters in the URL', () => {
  it('round-trips every field', () => {
    const f = { q: 'bronze', type: 'Mural', area: 'Downtown', status: 'all' as const, decade: 1990 }
    expect(parseFilters(serializeFilters(f))).toEqual(f)
  })
  it('defaults are not written, and garbage falls back to defaults', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('')
    expect(parseFilters(new URLSearchParams('status=weird&decade=abc'))).toEqual(DEFAULT_FILTERS)
  })
})
