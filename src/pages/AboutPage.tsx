export default function AboutPage() {
  return (
    <section className="page prose">
      <h1>About</h1>
      <p>
        Every artwork here comes from the City of Vancouver's <a href="https://opendata.vancouver.ca/explore/dataset/public-art/information/" rel="noopener noreferrer">Public Art dataset</a> and
        its companion <a href="https://opendata.vancouver.ca/explore/dataset/public-art-artists/information/" rel="noopener noreferrer">artists dataset</a>, read live from the City's open-data API
        under the <a href="https://opendata.vancouver.ca/pages/licence/" rel="noopener noreferrer">Open Government Licence – Vancouver</a>. The registry has no photographs in the API; each page links to the City's own entry, which does.
      </p>
      <p>
        The app keeps nothing on a server. Filters live in the address bar so a view can be shared; the visited list lives in your browser.
        "Near me" asks the browser for your position once and never sends it anywhere.
      </p>
      <p>
        Built by <a href="https://github.com/joaoferrari12" rel="noopener noreferrer">Joao Victor Ferrari</a> with React 19, TanStack Query, React Router and Leaflet.
        Source and tests on <a href="https://github.com/joaoferrari12/vancouver-public-art" rel="noopener noreferrer">GitHub</a>.
      </p>
    </section>
  )
}
