/**
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDBConnection} connection
 * @param {string} tableName 
 * @param {Array<Object>} rows
 * @returns {Promise<{ tableName: string, rowCount: number, columns: string[] }>}
 */
export async function ingestData(connection, tableName, rows) {


    if (!connection) 
    {
        throw new Error('ingestData: no DuckDB connection provided.');
    }

    if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') 
    {
        throw new Error('ingestData: tableName must be a non-empty string.');
    }

    if (!Array.isArray(rows)) 
    {
        throw new Error('ingestData: rows must be an array.');
    }

    const safeTableName = tableName.trim().replace(/[^a-zA-Z0-9_]/g, '_');

    try {

        await connection.query(`DROP TABLE IF EXISTS "${safeTableName}"`);
        console.log(`ingestData: dropped existing table "${safeTableName}" if it existed.`);

        if (rows.length === 0) 
        {
          console.warn(`ingestData: rows array is empty. "${safeTableName}" will be created with no data.`);

          await connection.query(`CREATE TABLE "${safeTableName}" (empty_placeholder VARCHAR)`);

          return {
            tableName: safeTableName,
            rowCount: 0,
            columns: [],
          };

        }


        const columns = Object.keys(rows[0]).map((col) => col.trim().replace(/[^a-zA-Z0-9_]/g, '_'));


        console.log(`ingestData: detected columns —`, columns);

        const columnDefs = columns.map((col) => `"${col}" VARCHAR`).join(', ');


        const createSQL = `CREATE TABLE "${safeTableName}" (${columnDefs})`;

        console.log(`ingestData: creating table with SQL —`, createSQL);


        
        await connection.query(createSQL);


        const BATCH_SIZE = 500;

        
        let totalInserted = 0;


        for (let i = 0; i < rows.length; i += BATCH_SIZE) 
        {



            const batch = rows.slice(i, i + BATCH_SIZE);

            const originalKeys = Object.keys(rows[0]);

            const valuesClauses = batch.map((row) => {
            
                const values = originalKeys.map((originalCol) => {


                    const val = row[originalCol];

                    // Real SQL NULL for missing/empty cells — this is what makes
                    // COALESCE and NULLIF in the scenario queries actually work.
                    if (val === null || val === undefined || String(val).trim() === '') 
                    {
                        return 'NULL';
                    }

                    const escaped = String(val).trim().replace(/'/g, "''");

                    return `'${escaped}'`;

                });

                return `(${values.join(', ')})`;
          
            });

        
          const insertSQL = `INSERT INTO "${safeTableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES ${valuesClauses.join(', ')}`;

          await connection.query(insertSQL);


          totalInserted += batch.length;

          console.log(`ingestData: inserted ${totalInserted}/${rows.length} rows...`);

        }

        console.log(`ingestData: ✅ done. Table "${safeTableName}" ready with ${totalInserted} rows.`);

        return {
          tableName: safeTableName,
          rowCount: totalInserted,
          columns,
        };

    } catch (error) {
        throw new Error(`ingestData: failed — ${error.message}`);
    }
}