import { useState, useEffect, useCallback } from 'react';
import { initDB } from './initDB';
import { ingestData } from './ingestData';
import { queryOrgChart, queryNavTaxonomy, listDatasets } from './scenarios';

/**
 * useDatabase hook
 * 
 * Manages the full DuckDB lifecycle:
 * - Initializes DuckDB once when the hook first mounts
 * - Exposes an ingest function to load parsed rows into DuckDB
 * - Exposes query functions for both scenarios
 * - Tracks loading/error/ready states
 * 
 * Usage:
 * const {
 *   isReady,       // true when DuckDB is initialized and ready
 *   isIngesting,   // true while data is being loaded into DuckDB
 *   isQuerying,    // true while a SQL query is running
 *   error,         // string error message if anything fails, null otherwise
 *   ingest,        // function(rows) — loads rows into DuckDB
 *   runOrgChart,   // function() — runs Scenario A query
 *   runNavTaxonomy // function() — runs Scenario B query
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
   * Initialize DuckDB when the hook first mounts.
   * This runs exactly once — the empty dependency array []
   * means useEffect only fires on mount.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        console.log('useDatabase: initializing DuckDB...');
        setError(null);
        setIsReady(false);

        const { db, connection: conn } = await initDB();

        // If the component unmounted while we were initializing,
        // don't update state (prevents memory leaks)
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

    // Cleanup function — runs if the component unmounts
    // Sets cancelled = true so any in-flight async work is ignored
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * ingest(rows)
   * 
   * Takes parsed rows from Phase 1 and loads them into DuckDB.
   * Always uses the table name 'tree_data' — dropping and
   * recreating it if the user uploads a new file.
   * 
   * @param {Array<Object>} rows - Parsed rows from FileUploader
   * @returns {Promise<void>}
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
            console.warn('useDatabase: no rows ingested — skipping scenario queries.');
            setIsIngesting(false);
            return;
        }

      console.log(`useDatabase: ✅ ingested ${result.rowCount} rows into "${result.tableName}".`);

      // List available datasets for debugging
      await listDatasets(connection, result.tableName);

    } catch (err) {
      console.error('useDatabase: ingestion failed —', err);
      setError(`Data ingestion failed: ${err.message}`);
    } finally {
      // Always turn off the ingesting flag whether we succeeded or failed
      setIsIngesting(false);
    }
  }, [connection]);

  /**
   * runOrgChart()
   * 
   * Runs the Scenario A SQL query and returns org chart nodes.
   * 
   * @returns {Promise<Array<Object>>}
   */
  const runOrgChart = useCallback(async () => {
    if (!connection || !tableName) {
      setError('Cannot query: no data has been ingested yet.');
      return [];
    }

    try {
      setIsQuerying(true);
      setError(null);
      console.log('useDatabase: running org chart query...');

      const rows = await queryOrgChart(connection, tableName);
      console.log(`useDatabase: ✅ org chart query returned ${rows.length} nodes.`);
      return rows;

    } catch (err) {
      console.error('useDatabase: org chart query failed —', err);
      setError(`Org chart query failed: ${err.message}`);
      return [];
    } finally {
      setIsQuerying(false);
    }
  }, [connection, tableName]);

  /**
   * runNavTaxonomy()
   * 
   * Runs the Scenario B SQL query and returns nav taxonomy nodes.
   * 
   * @returns {Promise<Array<Object>>}
   */
  const runNavTaxonomy = useCallback(async () => {
    if (!connection || !tableName) {
      setError('Cannot query: no data has been ingested yet.');
      return [];
    }

    try {
      setIsQuerying(true);
      setError(null);
      console.log('useDatabase: running nav taxonomy query...');

      const rows = await queryNavTaxonomy(connection, tableName);
      console.log(`useDatabase: ✅ nav taxonomy query returned ${rows.length} nodes.`);
      return rows;

    } catch (err) {
      console.error('useDatabase: nav taxonomy query failed —', err);
      setError(`Nav taxonomy query failed: ${err.message}`);
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
    runOrgChart,
    runNavTaxonomy,
  };
}