import { useCallback, useSyncExternalStore } from 'react'

const KEY = 'vpa.visited'
const listeners = new Set<() => void>()
let cache: number[] | null = null

function read(): number[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    cache = Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : []
  } catch {
    cache = [] // private mode, blocked storage, or corrupt data: behave as empty
  }
  return cache
}

function write(next: number[]) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: the list still works for this page view */
  }
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Reset the in-memory cache (tests). */
export function resetVisitedCache() {
  cache = null
}

/** Artworks the viewer marked as seen, kept in localStorage and shared by every component that calls this. */
export function useVisited() {
  const visited = useSyncExternalStore(subscribe, read, () => [])
  const toggle = useCallback((id: number) => {
    const cur = read()
    write(cur.includes(id) ? cur.filter(n => n !== id) : [...cur, id])
  }, [])
  const has = useCallback((id: number) => visited.includes(id), [visited])
  return { visited, toggle, has }
}
