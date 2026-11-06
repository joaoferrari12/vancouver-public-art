import { NavLink, Route, Routes } from 'react-router'
import AboutPage from './pages/AboutPage'
import ArtworkPage from './pages/ArtworkPage'
import HomePage from './pages/HomePage'
import VisitedPage from './pages/VisitedPage'

export default function App() {
  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <NavLink to="/" className="brand" end>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">Vancouver Public Art</span>
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>Map</NavLink>
          <NavLink to="/visited">Visited</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/art/:id" element={<ArtworkPage />} />
          <Route path="/visited" element={<VisitedPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<section className="page"><h1>Page not found</h1><p><NavLink to="/">Back to the map</NavLink></p></section>} />
        </Routes>
      </main>
      <footer className="footer small muted">
        Data: City of Vancouver Open Data (Open Government Licence – Vancouver). Map tiles: OpenStreetMap contributors.
      </footer>
    </div>
  )
}
