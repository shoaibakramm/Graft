import { useState, useEffect } from 'react'
import './App.css'
import FileUploader from './demo/upload/FileUploader'
import { useDatabase } from './demo/db/useDatabase'

function App() {
  // Parsed rows from FileUploader
  const [parsedData, setParsedData] = useState(null)
  const [parseError, setParseError] = useState(null)

  // Results from both scenario queries
  const [orgChartData, setOrgChartData] = useState(null)
  const [navTaxonomyData, setNavTaxonomyData] = useState(null)

  // Pull everything we need from the database hook
  const {
    isReady,
    isIngesting,
    isQuerying,
    error: dbError,
    dbInfo,
    hasData,
    ingest,
    runOrgChart,
    runNavTaxonomy,
  } = useDatabase()

  // -------------------------------------------------------
  // Step A: when FileUploader gives us parsed rows,
  // immediately ingest them into DuckDB
  // -------------------------------------------------------
  function handleDataParsed(rows) {
    setParseError(null)
    setParsedData(rows)
    setOrgChartData(null)
    setNavTaxonomyData(null)
    console.log('App: parsed rows received —', rows.length, 'rows')

    if (!isReady) {
      console.warn('App: DuckDB not ready yet — cannot ingest.')
      return
    }

    ingest(rows)
  }

  function handleParseError(errorMessage) {
    setParsedData(null)
    setParseError(errorMessage)
    console.error('App: parse error —', errorMessage)
  }

  // -------------------------------------------------------
  // Step B: once ingestion finishes (hasData becomes true),
  // automatically run both scenario queries
  // -------------------------------------------------------
useEffect(() => {
  if (!hasData || isIngesting) return

  // Don't run queries if no rows were parsed
  if (!parsedData || parsedData.length === 0) return

  async function runBothQueries() {
    console.log('App: running both scenario queries...')

    const [orgChart, navTaxonomy] = await Promise.all([
      runOrgChart(),
      runNavTaxonomy(),
    ])

    setOrgChartData(orgChart)
    setNavTaxonomyData(navTaxonomy)

    console.log('App: ✅ Scenario A (org chart) —', orgChart.length, 'nodes')
    console.log('App: first org chart node —', orgChart[0])
    console.log('App: root node (parentId should be null) —',
      orgChart.find(n => n.parentId === null || n.parentId === 'null')
    )

    console.log('App: ✅ Scenario B (nav taxonomy) —', navTaxonomy.length, 'nodes')
    console.log('App: first nav taxonomy node —', navTaxonomy[0])
    console.log('App: root node (parentId should be null) —',
      navTaxonomy.find(n => n.parentId === null || n.parentId === 'null')
    )
  }

  runBothQueries()
}, [hasData, isIngesting, parsedData])

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <div className="app-container">
      <h1>Tree Component Assignment</h1>
      <p>Phase 2 — DuckDB Pipeline Test</p>

      {/* DB status bar */}
      <div className={`db-status db-status--${isReady ? 'ready' : 'loading'}`}>
        {isReady
          ? `✅ DuckDB ready${dbInfo ? ` — version ${dbInfo.version}` : ''}`
          : '⏳ Initializing DuckDB...'}
      </div>

      {/* File uploader — disabled until DB is ready */}
      <div style={{ marginTop: '1.5rem', opacity: isReady ? 1 : 0.4,
        pointerEvents: isReady ? 'auto' : 'none' }}>
        <FileUploader
          onDataParsed={handleDataParsed}
          onError={handleParseError}
        />
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="parse-error">
          <strong>Parse Error:</strong> {parseError}
        </div>
      )}

      {/* DB error */}
      {dbError && (
        <div className="parse-error">
          <strong>Database Error:</strong> {dbError}
        </div>
      )}

      {/* Ingestion status */}
      {isIngesting && (
        <div className="db-status db-status--loading" style={{ marginTop: '1rem' }}>
          ⏳ Ingesting data into DuckDB...
        </div>
      )}

      {/* Query status */}
      {isQuerying && (
        <div className="db-status db-status--loading" style={{ marginTop: '1rem' }}>
          ⏳ Running scenario queries...
        </div>
      )}

      {/* Results panels — shown side by side once queries complete */}
      {orgChartData && navTaxonomyData && (
        <div className="results-container">

          {/* Scenario A */}
          <div className="result-panel">
            <h2>Scenario A — Org Chart</h2>
            <p>
              <strong>Nodes:</strong> {orgChartData.length} &nbsp;|&nbsp;
              <strong>Root:</strong>{' '}
              {orgChartData.find(
                n => n.parentId === null || n.parentId === 'null'
              )?.name ?? 'not found'}
            </p>
            <div className="data-preview__table-wrapper">
              <table className="data-preview__table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>name</th>
                    <th>parentId</th>
                    <th>metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {orgChartData.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td>{row.id}</td>
                      <td>{row.name}</td>
                      <td>
                        {row.parentId === null || row.parentId === 'null'
                          ? <span className="null-badge">null</span>
                          : row.parentId}
                      </td>
                      <td>{row.metadata}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="table-note">Showing first 5 of {orgChartData.length} rows.
              Check console for full output.</p>
          </div>

          {/* Scenario B */}
          <div className="result-panel">
            <h2>Scenario B — Nav Taxonomy</h2>
            <p>
              <strong>Nodes:</strong> {navTaxonomyData.length} &nbsp;|&nbsp;
              <strong>Root:</strong>{' '}
              {navTaxonomyData.find(
                n => n.parentId === null || n.parentId === 'null'
              )?.name ?? 'not found'}
            </p>
            <div className="data-preview__table-wrapper">
              <table className="data-preview__table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>name</th>
                    <th>parentId</th>
                    <th>metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {navTaxonomyData.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td>{row.id}</td>
                      <td>{row.name}</td>
                      <td>
                        {row.parentId === null || row.parentId === 'null'
                          ? <span className="null-badge">null</span>
                          : row.parentId}
                      </td>
                      <td>{row.metadata}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="table-note">Showing first 5 of {navTaxonomyData.length} rows.
              Check console for full output.</p>
          </div>

        </div>
      )}

      {/* Parsed data summary */}
      {parsedData && (
        <div className="data-preview" style={{ marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            Raw parse: {parsedData.length} total rows ingested from file.
          </p>
        </div>
      )}

    </div>
  )
}

export default App