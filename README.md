# Vancouver Public Art

[![CI](https://github.com/joaoferrari12/vancouver-public-art/actions/workflows/ci.yml/badge.svg)](https://github.com/joaoferrari12/vancouver-public-art/actions/workflows/ci.yml)

**Every public artwork in Vancouver, on a map.** A React 19 app over the City
of Vancouver's open data: 751 works (609 with coordinates), filterable by kind,
neighbourhood, decade and status, searchable, each with the registry's
description, the artist's statement and the artists' biographies, plus a
"near me" sort and a visited list that survives a reload. Built by a
Brazilian in Vancouver who kept walking past sculptures without knowing what
they were.

> **Live:** **https://joaoferrari12.github.io/vancouver-public-art/**

## What it demonstrates

- **React 19 with a real data layer**: TanStack Query owns fetching, caching
  and cancellation. The catalogue is **one** call to the City's export
  endpoint (`select` + `limit=-1`, ~58 kB gzipped) cached for a day, so every
  filter and search is instant and client-side; the long texts and the artist
  biographies are fetched lazily per page and cached by id.
- **Two public datasets joined in the browser**: `public-art` and
  `public-art-artists`, related by artist id, through the Opendatasoft Explore
  API v2.1 (no key, CORS). Ids are truncated to integers before they enter a
  `where` clause, and a test asserts every URL stays on
  `opendata.vancouver.ca` with no credential.
- **URL as state**: filters live in the query string (`?q=&type=&area=&decade=&status=`)
  through React Router's `useSearchParams`, so a filtered view can be shared
  or bookmarked; parse and serialize are pure and round-trip tested.
- **A map that stays in sync**: Leaflet (canvas renderer, 600 markers without
  a sweat) coloured by six kind groups with a legend; the list and the map
  show the same filtered set, a card click flies to the work and opens its
  popup, and on a phone the map scrolls back into view. Leaflet is lazy-loaded
  in its own chunk so the list paints first.
- **`useSyncExternalStore` for the visited list**: one localStorage-backed
  store shared by every component, with a safe fallback when storage is
  blocked.
- **Pure logic, separately tested**: normalising rows, filtering (accent- and
  case-insensitive search across six fields), facets, decades, haversine
  distance, bounds, colour groups. 14 unit tests over the real catalogue
  snapshot (751 rows) captured from the API.
- **Component tests with a fake API**: 6 tests render the whole app with
  React Router and a stubbed `fetch` backed by the fixtures, exercise the
  filters, the status toggles, card selection, the detail page, the visited
  list and the error state, and check accessible names rather than CSS
  classes.
- **Accessibility, measured**: skip link, landmarks, one `h1` per page, labelled
  form controls, `aria-pressed` toggles, `aria-current` on the selected card,
  live region for the result count, keyboard-reachable selection, 4.5:1
  contrast, reduced motion respected. `scripts/a11y.mjs` walks the built site
  in Chromium at 375 px and 1280 px (map, filters, selection, detail, visited,
  about) with axe-core (`wcag2a`, `wcag2aa`, `wcag21aa`, `best-practice`):
  **12 screens, 0 violations, 0 horizontal overflow, 0 page errors**. It runs
  in CI on every push.
- **Performance**: first load is 95 kB gzip of app (React, Router, Query) and
  2.5 kB of CSS; Leaflet (48 kB + 6 kB CSS) arrives in a separate chunk.
- **Shipping**: CI (type-check, 25 tests, build, accessibility walk) and GitHub
  Pages deploy on every push to `main`, with a `404.html` so deep links like
  `/art/200` work on Pages.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest: 25 unit and component tests
npm run build      # production build into dist/
npm run a11y       # axe-core walk of dist/ in Chromium (needs: npx playwright install chromium)
```

No configuration or secret is needed. The accessibility walk stubs the City
API with `tests/fixtures/` so it does not depend on the network.

## Structure

```
src/api/vancouver.ts        Explore API client: URLs, types, fetchers (+ tests)
src/lib/artworks.ts         pure functions: normalize, filters, facets, distance, colours (+ tests)
src/hooks/useCatalogue.ts   TanStack Query: catalogue, artwork detail, artists by id
src/hooks/useFilters.ts     filters <-> URL search params (+ tests)
src/hooks/useVisited.ts     visited list in localStorage via useSyncExternalStore
src/components/             ArtMap (Leaflet), FilterBar, ArtworkCard, Legend
src/pages/                  HomePage (map + list), ArtworkPage, VisitedPage, AboutPage
src/App.tsx                 routes and chrome (+ component tests)
scripts/a11y.mjs            Playwright + axe-core walk of the built site
tests/fixtures/             API responses captured in Nov 2026
```

## Data

[Public Art](https://opendata.vancouver.ca/explore/dataset/public-art/information/)
and [Public Art – Artists](https://opendata.vancouver.ca/explore/dataset/public-art-artists/information/)
from the City of Vancouver Open Data Portal, under the
[Open Government Licence – Vancouver](https://opendata.vancouver.ca/pages/licence/).
The API carries no photographs; each artwork page links to the City's own
registry entry, which does. Map tiles by [CARTO](https://carto.com/attributions)
over [OpenStreetMap](https://www.openstreetmap.org/copyright) data.

## License

MIT
