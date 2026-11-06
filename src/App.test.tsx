import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import rows from '../tests/fixtures/art-list.json'
import artists from '../tests/fixtures/artists.json'
import artwork200 from '../tests/fixtures/artwork-200.json'
import App from './App'
import { resetVisitedCache } from './hooks/useVisited'

// Leaflet needs a real layout engine; in jsdom the map is a labelled placeholder that lists the ids it received.
vi.mock('./components/ArtMap', () => ({
  default: ({ artworks, selectedId }: { artworks: { id: number }[]; selectedId: number | null }) => (
    <div data-testid="map" data-count={artworks.length} data-selected={selectedId ?? ''} />
  ),
}))

/** A fake City of Vancouver API backed by the fixtures captured from the real one. */
function fakeApi(url: string): Response {
  const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response
  if (url.includes('/public-art/exports/json')) return json(rows)
  if (url.includes('/public-art/records')) return json(artwork200)
  if (url.includes('/public-art-artists/records')) return json(artists)
  return { ok: false, status: 404, json: async () => ({}) } as Response
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    resetVisitedCache()
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(fakeApi(String(input)))))
  })
  afterEach(() => vi.restoreAllMocks())

  it('loads the catalogue once and shows the works still in place', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: '478 artworks' })).toBeInTheDocument()
    expect(screen.getByTestId('map')).toHaveAttribute('data-count', '478')
    expect(screen.getByRole('status')).toHaveTextContent(/478 artworks match/)
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(c => String(c[0]))
    expect(calls.filter(u => u.includes('/exports/json'))).toHaveLength(1)
    for (const u of calls) expect(u).toMatch(/^https:\/\/opendata\.vancouver\.ca\//)
  })

  it('filters by search and kind, keeps the map in sync and writes the filters to the URL', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await screen.findByRole('heading', { name: '478 artworks' })
    await user.selectOptions(screen.getByLabelText('Kind'), 'Mural')
    const heading = await screen.findByRole('heading', { name: /artworks$/ })
    const murals = Number(heading.textContent!.split(' ')[0])
    expect(murals).toBeGreaterThan(0)
    expect(murals).toBeLessThan(478)
    expect(screen.getByTestId('map')).toHaveAttribute('data-count', String(murals))
    await user.type(screen.getByLabelText('Search'), 'zzzz-no-such-work')
    expect(await screen.findByText(/Nothing matches/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await screen.findByRole('heading', { name: '478 artworks' })
  })

  it('status chips are toggles with aria-pressed and "All" shows the whole registry', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await screen.findByRole('heading', { name: '478 artworks' })
    expect(screen.getByRole('button', { name: 'In place' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'All' }))
    await screen.findByRole('heading', { name: '751 artworks' })
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selecting a card highlights it and tells the map', async () => {
    const user = userEvent.setup()
    renderAt('/?q=captain%20george')
    await screen.findByRole('heading', { name: '1 artwork' })
    await user.click(screen.getByRole('button', { name: 'Show Captain George Vancouver on the map' }))
    expect(screen.getByTestId('map')).toHaveAttribute('data-selected', '1')
    const list = screen.getByRole('heading', { name: '1 artwork' }).closest('section')!
    expect(within(list).getByRole('listitem')).toHaveAttribute('aria-current', 'true')
  })

  it('the detail page shows the description, the artists, and remembers a visit', async () => {
    const user = userEvent.setup()
    renderAt('/art/200')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent((artwork200.results[0] as { title_of_work: string }).title_of_work)
    await screen.findByRole('heading', { name: 'About the work' })
    const artistsSection = await screen.findByRole('heading', { name: /^Artists?$/ })
    await within(artistsSection.parentElement!).findByRole('heading', { level: 3, name: /Carmen Papalia/ })
    await user.click(screen.getByRole('button', { name: 'Mark as visited' }))
    expect(screen.getByRole('button', { name: '✓ Visited' })).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(localStorage.getItem('vpa.visited')!)).toEqual([200])
    await user.click(screen.getByRole('link', { name: 'Visited' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 of 751 artworks visited'))
  })

  it('tells the viewer when the API fails and offers a retry', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 503, json: async () => ({}) } as Response)))
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent(/did not answer/)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
