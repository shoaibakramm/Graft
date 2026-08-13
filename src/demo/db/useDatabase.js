import { useState, useEffect, useCallback } from 'react';

import { initDB } from './initDB';
import { ingestData } from './ingestData';
import { runTransform } from '../transform/runTransform';




/**
 * Owns the DuckDB lifecycle and the ELT run.
 *
 * loadAndTransform(rows) does the whole thing in one call: Load the parsed rows raw, then Transform them in SQL. Keeping it as one function avoids the stale
 * closure problem the old two-step version had — the table name never has to survive a React render to reach the query.
 *
 * Usage:
 *   const { isReady, isWorking, error, loadAndTransform } = useDatabase()
 *   const result = await loadAndTransform(parsedRows)
 *   // result -> { rows, format, label } or null on failure
 */
export function useDatabase() {


  const [connection, setConnection] = useState(null);


  const [isReady, setIsReady] = useState(false);


  const [isWorking, setIsWorking] = useState(false);


  const [error, setError] = useState(null);

  
  const [dbInfo, setDbInfo] = useState(null);


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
   * The full ELT run for one uploaded file.
   *
   * @param {Array<Object>} rows - Parsed rows, exactly as the file had them.
   * @returns {Promise<{rows: Array<Object>, format: string, label: string}|null>}
   */
  const loadAndTransform = useCallback(async (rows) => {


    if (!connection) 
    {
      setError('Database is not ready yet.');
      return null;
    }

    if (!Array.isArray(rows) || rows.length === 0) 
    {
      setError('The file contained no rows.');
      return null;
    }



    try {

      setIsWorking(true);
      setError(null);

      // L — raw, column names untouched.
      const loaded = await ingestData(connection, 'raw_upload', rows);

      if (loaded.rowCount === 0) 
      {
        setError('The file contained no rows.');
        return null;
      }

      // T — sniff the format, run its SQL chain.
      const result = await runTransform(connection, loaded.tableName, loaded.columns);

      console.log(`useDatabase: ✅ ${result.rows.length} canonical rows from ${result.label}.`);

      return result;

    } catch (err) {

      console.error('useDatabase: ELT run failed —', err);

      setError(err.message);

      return null;

    } finally {
      setIsWorking(false);
    }

  }, [connection]);




  return {
    isReady,
    isWorking,
    error,
    dbInfo,
    loadAndTransform,
  };
}