import { useEffect, useState } from 'react';

import './App.css';

import FileUploader from './demo/upload/FileUploader';
import { useDatabase } from './demo/db/useDatabase';
import TreeView from './component/render/TreeView';




/**
 * The wired app, discovery edition.
 *
 * Datasets are discovered from the uploaded table — one tree panel per
 * distinct "dataset" value, or a single panel when the column is absent.
 * Nothing about orgchart / navtaxonomy is hardcoded anywhere.
 *
 * Stage flow:
 *   boot      DuckDB still initializing
 *   awaiting  ready, no file yet
 *   ingesting rows going into DuckDB
 *   querying  discovery + queries running
 *   showing   trees on screen
 *   empty     ingested, but discovery found no rows
 *   error     any stage failed
 */
function App() {


  const database = useDatabase();

  const [uploadError, setUploadError] = useState(null);

  // [{ name, rows }] from discovery — one entry per tree.
  const [trees, setTrees] = useState(null);

  const [ingestGen, setIngestGen] = useState(0);

  const [events, setEvents] = useState([]);

  const [showConsole, setShowConsole] = useState(true);

  // 'split' or a dataset name.
  const [view, setView] = useState('split');


  async function handleDataParsed(rows) {
    setUploadError(null);
    setTrees(null);
    setView('split');

    await database.ingest(rows);

    // Signals the effect below. Queries can't be called directly here:
    // runDiscovery still closes over the pre-ingest tableName until the next
    // render, so the first upload would fail with "no data ingested yet".
    setIngestGen((generation) => generation + 1);
  }

  function handleUploadError(message) {
    setUploadError(message);
  }


  useEffect(() => {

    if (ingestGen === 0) 
    {
      return;
    }

    (async () => {
      const found = await database.runDiscovery();
      setTrees(found);
    })();

  }, [ingestGen]);   // eslint-disable-line react-hooks/exhaustive-deps


  const logEvent = (source, text) => {
    setEvents((previous) => [
      { time: new Date().toLocaleTimeString(), source, text },
      ...previous.slice(0, 49),
    ]);
  };


  const renderTooltip = (node) => (
    <div>
      <strong>{node.label}</strong>
      {node.data.metadata ? <div>{node.data.metadata}</div> : null}
    </div>
  );


  const nonEmptyTrees = (trees ?? []).filter((t) => t.rows.length > 0);

  const visibleTrees =
    view === 'split'
      ? nonEmptyTrees
      : nonEmptyTrees.filter((t) => t.name === view);


  const stage =
    !database.isReady && !database.error   ? 'boot'
    : database.error || uploadError        ? 'error'
    : database.isIngesting                 ? 'ingesting'
    : database.isQuerying                  ? 'querying'
    : nonEmptyTrees.length > 0             ? 'showing'
    : trees                                ? 'empty'
    : 'awaiting';


  return (
    <div className="app">

      <header className="app__header">
        <h1 className="app__title">Tree Component — Demo App</h1>

        <FileUploader
          onDataParsed={handleDataParsed}
          onError={handleUploadError}
        />

        {stage === 'showing' && nonEmptyTrees.length > 1 && (
          <div className="app__view-toggle">
            <button onClick={() => setView('split')} disabled={view === 'split'}>
              All
            </button>
            {nonEmptyTrees.map((tree) => (
              <button
                key={tree.name}
                onClick={() => setView(tree.name)}
                disabled={view === tree.name}
              >
                {tree.name}
              </button>
            ))}
          </div>
        )}

        <span className="app__stage">stage: {stage}</span>
      </header>


      <main className="app__main">

        {stage === 'boot' && (
          <p className="app__notice">Starting the in-browser database…</p>
        )}

        {stage === 'ingesting' && (
          <p className="app__notice">Loading rows into the database…</p>
        )}

        {stage === 'querying' && (
          <p className="app__notice">Discovering datasets and running queries…</p>
        )}

        {stage === 'awaiting' && (
          <p className="app__notice">
            Upload a CSV or Excel file to begin.
          </p>
        )}

        {stage === 'empty' && (
          <p className="app__notice app__notice--error">
            The file was ingested, but no tree rows came back.
            Check the file has id, name and parentId columns with data in them.
          </p>
        )}

        {stage === 'error' && (
          <p className="app__notice app__notice--error">
            {database.error ?? uploadError}
          </p>
        )}

        {stage === 'showing' && (
          <div className="app__trees">

            {visibleTrees.map((tree) => (
              <section className="app__panel" key={tree.name}>
                <h3 className="app__panel-title">{tree.name}</h3>
                <div className="app__panel-body">
                  <TreeView
                    data={tree.rows}
                    renderTooltip={renderTooltip}
                    onNodeFocus={(node) => node && logEvent(tree.name, `Node '${node.label}' focused. ${node.childIds.length} children.`)}
                    onNodeClick={(node) => logEvent(tree.name, `Node '${node.label}' clicked. Value: ${node.data.metadata ?? '—'}`)}
                    onBackgroundClick={() => logEvent(tree.name, 'Background clicked.')}
                  />
                </div>
              </section>
            ))}

          </div>
        )}

        {stage === 'showing' && showConsole && (
          <div className="app__console">
            <div className="app__console-head">
              <span>Events</span>
              <div className="app__console-actions">
                <button onClick={() => setEvents([])}>Clear</button>
                <button onClick={() => setShowConsole(false)}>Hide</button>
              </div>
            </div>
            <div className="app__console-body">
              {events.length === 0
                ? <span className="app__console-hint">Interact with a tree — events appear here.</span>
                : events.map((e, i) => (
                    <div key={i}>[{e.time}] [{e.source}] {e.text}</div>
                  ))}
            </div>
          </div>
        )}

        {stage === 'showing' && !showConsole && (
          <button className="app__console-show" onClick={() => setShowConsole(true)}>
            Show events
          </button>
        )}

      </main>

    </div>
  );
}

export default App;