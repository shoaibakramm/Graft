import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';


const MANUAL_BUNDLES = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};





let instancePromise = null;

export function initDB() {

  if (!instancePromise) 
  {
    instancePromise = createDB().catch((error) => {
      instancePromise = null;
      throw error;
    });
  }

  return instancePromise;
}

export async function closeDB() {

  if (!instancePromise) 
  {
    return;
  }

  try {
    const { db, connection } = await instancePromise;
    await connection.close();
    await db.terminate();
  } catch {
    // already gone
  } finally {
    instancePromise = null;
  }
}



/**
 * @returns {Promise<{ db: duckdb.AsyncDuckDB, connection: duckdb.AsyncDuckDBConnection }>}
 */
async function createDB() {
  try {

    console.log('DuckDB: selecting best bundle for this browser...');

    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    
    
    console.log('DuckDB: selected bundle —', bundle);


    const worker = new Worker(bundle.mainWorker);



    const logger = new duckdb.ConsoleLogger();



    const db = new duckdb.AsyncDuckDB(logger, worker);




    console.log('DuckDB: instantiating WASM binary...');

    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);


    console.log('DuckDB: WASM binary ready.');


    const connection = await db.connect();
   
   
    console.log('DuckDB: connection established. DB is ready.');

    return { db, connection };

  } catch (error) {

    throw new Error(`initDB: failed to initialize DuckDB — ${error.message}`);
  
  }
}