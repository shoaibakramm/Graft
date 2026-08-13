import { useState } from 'react';

import './App.css';

import FileUploader from './demo/upload/FileUploader';
import { useDatabase } from './demo/db/useDatabase';
import TreeView from './component/render/TreeView';






function App() {


  const database = useDatabase();



  const [uploadError, setUploadError] = useState(null);


  const [result, setResult] = useState(null);          // { rows, format, label }

  const [events, setEvents] = useState([]);



  const [showConsole, setShowConsole] = useState(true);



  async function handleDataParsed(rows) {

    setUploadError(null);

    setResult(null);


    const transformed = await database.loadAndTransform(rows);

    if (transformed) 
    {

      setResult(transformed);
    
    }

  }


  function handleUploadError(message) {

    setResult(null);
    
    setUploadError(message);
  
  }


  const logEvent = (text) => {
    setEvents((previous) => [
      { time: new Date().toLocaleTimeString(), text },
      ...previous.slice(0, 49),
    ]);
  };




  const renderTooltip = (node) => (
    <div>
      <strong>{node.label}</strong>
      {node.data.metadata ? <div>{node.data.metadata}</div> : null}
    </div>
  );



  const stage =
    !database.isReady && !database.error ? 'boot'
    : database.error || uploadError      ? 'error'
    : database.isWorking                 ? 'working'
    : result                             ? 'showing'
    : 'awaiting';




  return (
    <div className="app">

      <header className="app__header">
        <h1 className="app__title">The great App</h1>

        <FileUploader
          onDataParsed={handleDataParsed}
          onError={handleUploadError}
        />

        {stage === 'showing' && (
          <span className="app__format">
            {result.label} · {result.rows.length} nodes
          </span>
        )}

        <span className="app__stage">stage: {stage}</span>
      </header>


      <main className="app__main">

        {stage === 'boot' && (
          <p className="app__notice">Starting the in-browser database…</p>
        )}

        {stage === 'working' && (
          <p className="app__notice">Loading and transforming…</p>
        )}

        {stage === 'awaiting' && (
          <p className="app__notice">
            Upload a CSV or Excel file to begin.
          </p>
        )}

        {stage === 'error' && (
          <p className="app__notice app__notice--error">
            {database.error ?? uploadError}
          </p>
        )}

        {stage === 'showing' && (
          <div className="app__panel">
            <div className="app__panel-body">
              <TreeView
                data={result.rows}
                renderTooltip={renderTooltip}
                onNodeFocus={(node) => node && logEvent(`Node '${node.label}' focused. ${node.childIds.length} children.`)}
                onNodeClick={(node) => logEvent(`Node '${node.label}' clicked. Value: ${node.data.metadata ?? '—'}`)}
                onBackgroundClick={() => logEvent('Background clicked.')}
              />
            </div>
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
                ? <span className="app__console-hint">Interact with the tree — events appear here.</span>
                : events.map((e, i) => (
                    <div key={i}>[{e.time}] {e.text}</div>
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