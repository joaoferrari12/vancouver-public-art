import { useQuery } from '@tanstack/react-query'
import { fetchArtists, fetchArtwork, fetchCatalogue } from '../api/vancouver'
import { normalize, type Artwork } from '../lib/artworks'

const DAY = 24 * 60 * 60 * 1000

/** The whole catalogue, normalised once; the registry changes a few times a year, so a day of staleness is fine. */
export function useCatalogue() {
  return useQuery({
    queryKey: ['catalogue'],
    queryFn: async ({ signal }): Promise<Artwork[]> => (await fetchCatalogue(signal)).map(normalize),
    staleTime: DAY,
    gcTime: DAY,
  })
}

export function useArtwork(id: number) {
  return useQuery({
    queryKey: ['artwork', id],
    queryFn: ({ signal }) => fetchArtwork(id, signal),
    staleTime: DAY,
    enabled: Number.isFinite(id),
  })
}

export function useArtists(ids: number[]) {
  const key = [...ids].sort((a, b) => a - b)
  return useQuery({
    queryKey: ['artists', key],
    queryFn: ({ signal }) => fetchArtists(key, signal),
    staleTime: DAY,
    enabled: key.length > 0,
  })
}
