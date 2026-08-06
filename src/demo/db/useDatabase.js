import { useState, useEffect, useCallback } from 'react';
import { initDB } from './initDB';
import { ingestData } from './ingestData';
import { listColumns, listDatasets, queryDataset, queryWholeTable } from './scenarios';

/**
 * useDatabase hook
 *
 * Manages the full DuckDB lifecycle:
 * - Initializes DuckDB once when the hook first mounts
 * - Exposes an ingest function to load parsed rows into DuckDB
 * - Exposes runDiscovery(), which finds every dataset in the table and
 *   returns one tree's rows per dataset — no scenario names hardcoded
 * - Tracks loading/error/ready states
 *
 * Usage:
 * const {
 *   isReady,       // true when DuckDB is initialized and ready
 *   isIngesting,   // true while data is being loaded into DuckDB
 *   isQuerying,    // true while SQL queries are running
 *   error,         // string error message if anything fails, null otherwise
 *   ingest,        // function(rows) — loads rows into DuckDB
 *   runDiscovery,  // function() — returns [{ name, rows }] per dataset found
 * } = useDatabase()
 */
export function useDatabase() {
  // The DuckDB connection — null until initialized
  const [connection, setConnection] = useState(null);

  // The table name of the currently ingested data
  const [tableName, setTableName] = useState(null);

  // Status flags
  const [isReady, setIsReady] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);

  // Error state — null means no error
  const [error, setError] = useState(null);

  // DB init info for debugging
  const [dbInfo, setDbInfo] = useState(null);

  /**
   * Initialize DuckDB when the hook first mounts. Runs exactly once.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        console.log('useDatabase: initializing DuckDB...');
        setError(null);
        setIsReady(false);

        const { connection: conn } = await initDB();

        if (cancelled) return;

        setConnection(conn);
        setDbInfo({
          version: await conn.query('SELECT version()').then(
            (r) => r.toArray()[0].toJSON()['version()']
          ),
        });
        setIsReady(true);
        console.log('useDatabase: ✅ DuckDB ready.');

      } catch (err) {
        if (cancelled) return;
        console.error('useDatabase: initialization failed —', err);
        setError(`Database initialization failed: ${err.message}`);
        setIsReady(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * ingest(rows)
   *
   * Takes parsed rows and loads them into DuckDB under the fixed table name
   * 'tree_data', dropping any previous upload.
   */
  const ingest = useCallback(async (rows) => {
    if (!connection) {
      setError('Cannot ingest: database is not ready yet.');
      return;
    }

    if (!Array.isArray(rows)) {
      setError('Cannot ingest: rows must be an array.');
      return;
    }

    try {
      setIsIngesting(true);
      setError(null);
      console.log(`useDatabase: ingesting ${rows.length} rows...`);

      const result = await ingestData(connection, 'tree_data', rows);

      setTableName(result.tableName);

      if (result.rowCount === 0) {
        console.warn('useDatabase: no rows ingested.');
        return;
      }

      console.log(`useDatabase: ✅ ingested ${result.rowCount} rows into "${result.tableName}".`);

    } catch (err) {
      console.error('useDatabase: ingestion failed —', err);
      setError(`Data ingestion failed: ${err.message}`);
    } finally {
      setIsIngesting(false);
    }
  }, [connection]);

  /**
   * runDiscovery()
   *
   * Looks at the ingested table and returns one entry per tree found:
   *   - table has a "dataset" column -> one entry per distinct value
   *   - no "dataset" column          -> one entry for the whole table
   *
   * @returns {Promise<Array<{ name: string, rows: Array<Object> }>>}
   */
  const runDiscovery = useCallback(async () => {
    if (!connection || !tableName) {
      setError('Cannot query: no data has been ingested yet.');
      return [];
    }

    try {
      setIsQuerying(true);
      setError(null);
      console.log('useDatabase: discovering datasets...');

      const columns = await listColumns(connection, tableName);

      // The one hard requirement on any uploaded file.
      for (const required of ['id', 'name', 'parentId']) {
        if (!columns.includes(required)) {
          setError(
            `The uploaded file has no "${required}" column. ` +
            `Columns found: ${columns.join(', ')}. ` +
            `Files need id, name and parentId to form a tree.`
          );
          return [];
        }
      }

      if (!columns.includes('dataset')) {
        console.log('useDatabase: no dataset column — treating the table as one tree.');
        const rows = await queryWholeTable(connection, tableName, columns);
        return [{ name: 'Tree', rows }];
      }

      const datasets = await listDatasets(connection, tableName);

      if (datasets.length === 0) {
        console.log('useDatabase: dataset column present but empty — one tree.');
        const rows = await queryWholeTable(connection, tableName, columns);
        return [{ name: 'Tree', rows }];
      }

      console.log(`useDatabase: found ${datasets.length} dataset(s) —`, datasets);

      const results = [];

      for (const datasetValue of datasets) {
        const rows = await queryDataset(connection, tableName, columns, datasetValue);
        results.push({ name: datasetValue, rows });
      }

      return results;

    } catch (err) {
      console.error('useDatabase: discovery failed —', err);
      setError(`Query failed: ${err.message}`);
      return [];
    } finally {
      setIsQuerying(false);
    }
  }, [connection, tableName]);

  return {
    // Status
    isReady,
    isIngesting,
    isQuerying,
    error,
    dbInfo,

    // Data state
    tableName,
    hasData: tableName !== null,

    // Functions
    ingest,
    runDiscovery,
  };
}