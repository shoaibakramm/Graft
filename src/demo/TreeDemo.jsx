import { useCallback, useState } from 'react';

import TreeView from '../component/render/TreeView';
import * as fixtures from '../component/layout/fixtures';




const VALID_FIXTURES = [
  'chain',
  'orgChart',
  'navTaxonomy',
  'wideTree',
  'singleNode',
  'emptyStringRoot',
];




/**
 * Phase 4 demo page, two modes:
 *   single — one tree with a fixture picker (the step 3-10 workbench)
 *   split  — two instances side by side (the step 11 requirement)
 */
export default function TreeDemo() {


  const [mode, setMode] = useState('single');

  const [fixtureName, setFixtureName] = useState('orgChart');

  const [events, setEvents] = useState([]);

  const [showConsole, setShowConsole] = useState(false);


  const log = useCallback((source, text) => {
    setEvents((previous) => [
      `${source}: ${text}`,
      ...previous.slice(0, 19),
    ]);
  }, []);


  const renderTooltip = useCallback((node) => (
    <div>
      <strong>{node.label}</strong>
      {node.data.metadata ? <div>{node.data.metadata}</div> : null}
      <div style={{ opacity: 0.7 }}>
        depth {node.depth} · {node.childIds.length} child{node.childIds.length === 1 ? '' : 'ren'}
      </div>
    </div>
  ), []);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', gap: 12, padding: 16 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

        <strong>Phase 4</strong>

        <button onClick={() => setMode(mode === 'single' ? 'split' : 'single')}>
          {mode === 'single' ? 'Split view' : 'Single view'}
        </button>

        <button onClick={() => setShowConsole((previous) => !previous)}>
          {showConsole ? 'Hide events' : 'Show events'}
        </button>

        {mode === 'single' && (
          <select
            value={fixtureName}
            onChange={(event) => setFixtureName(event.target.value)}
          >
            {VALID_FIXTURES.map((name) => (
              <option key={name} value={name}>
                {name} ({fixtures[name].length} rows)
              </option>
            ))}
          </select>
        )}

      </div>

      {mode === 'single' ? (

        <div style={{ flex: 1, minHeight: 0, position: 'relative', ...panelBorder }}>
          <TreeView
            data={fixtures[fixtureName]}
            renderTooltip={renderTooltip}
            onNodeFocus={(node) => node && log('tree', `focus ${node.label}`)}
            onNodeClick={(node) => log('tree', `click ${node.label}`)}
            onBackgroundClick={() => log('tree', 'background click')}
          />
        </div>

      ) : (

        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>

          <section style={panelStyle}>
            <h3 style={headingStyle}>Scenario A — org chart</h3>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <TreeView
                data={fixtures.orgChart}
                renderTooltip={renderTooltip}
                onNodeFocus={(node) => node && log('A', `focus ${node.label}`)}
                onNodeClick={(node) => log('A', `click ${node.label}`)}
                onBackgroundClick={() => log('A', 'background click')}
              />
            </div>
          </section>

          <section style={panelStyle}>
            <h3 style={headingStyle}>Scenario B — nav taxonomy</h3>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <TreeView
                data={fixtures.navTaxonomy}
                renderTooltip={renderTooltip}
                onNodeFocus={(node) => node && log('B', `focus ${node.label}`)}
                onNodeClick={(node) => log('B', `click ${node.label}`)}
                onBackgroundClick={() => log('B', 'background click')}
              />
            </div>
          </section>

        </div>

      )}

      {showConsole && (
        <div style={consoleStyle}>
          {events.length === 0
            ? <span style={{ opacity: 0.5 }}>Interact with a tree — events land here.</span>
            : events.map((line, index) => <div key={index}>{line}</div>)}
        </div>
      )}

    </div>
  );
}




const panelBorder = {
  border: '1px solid #dde2e8',
  borderRadius: 8,
  overflow: 'hidden',
  background: '#ffffff',
};

const panelStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  ...panelBorder,
};

const headingStyle = {
  margin: 0,
  padding: '8px 12px',
  fontSize: 13,
  borderBottom: '1px solid #eef1f5',
};

const consoleStyle = {
  height: 110,
  overflowY: 'auto',
  padding: '8px 12px',
  border: '1px solid #dde2e8',
  borderRadius: 8,
  background: '#1d2430',
  color: '#c7e0c9',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 12,
};