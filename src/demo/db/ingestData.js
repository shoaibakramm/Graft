/**
 * The "L" in ELT — Load.
 *
 * Rows go into DuckDB exactly as they arrived from the parser. Column names
 * are preserved verbatim, so a BI export keeps "Level 1" with its space and
 * capital L rather than being quietly renamed to Level_1. Every value lands as
 * VARCHAR; empty cells become real SQL NULL.
 *
 * No reshaping happens here. All of that is the "T" — a series of SQL queries
 * that run afterwards against this raw table.
 *
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


    // The table name is ours, not the client's, so it stays sanitized.
    const safeTableName = tableName.trim().replace(/[^a-zA-Z0-9_]/g, '_');


    try {

        await connection.query(`DROP TABLE IF EXISTS "${safeTableName}"`);

        if (rows.length === 0) 
        {
            console.warn(`ingestData: rows array is empty. "${safeTableName}" will be created with no data.`);

            await connection.query(`CREATE TABLE "${safeTableName}" (empty_placeholder VARCHAR)`);

            return { tableName: safeTableName, rowCount: 0, columns: [] };
        }


        // Column names exactly as the file had them. Double quotes let DuckDB
        // accept spaces, punctuation and mixed case; a name containing a double
        // quote escapes it by doubling, same as a string literal.
        const columns = Object.keys(rows[0]);

        const quote = (name) => `"${String(name).replace(/"/g, '""')}"`;

        console.log('ingestData: loading raw columns —', columns);

        const columnDefs = columns.map((col) => `${quote(col)} VARCHAR`).join(', ');

        await connection.query(`CREATE TABLE "${safeTableName}" (${columnDefs})`);


        const BATCH_SIZE = 500;

        let totalInserted = 0;

        const columnList = columns.map(quote).join(', ');


        for (let i = 0; i < rows.length; i += BATCH_SIZE) 
        {

            const batch = rows.slice(i, i + BATCH_SIZE);

            const valuesClauses = batch.map((row) => {

                const values = columns.map((col) => {

                    const val = row[col];

                    // Real SQL NULL for missing/empty cells — this is what lets
                    // COALESCE and NULLIF work in the transform queries.
                    if (val === null || val === undefined || String(val).trim() === '') 
                    {
                        return 'NULL';
                    }

                    return `'${String(val).trim().replace(/'/g, "''")}'`;
                });

                return `(${values.join(', ')})`;
            });

            await connection.query(
                `INSERT INTO "${safeTableName}" (${columnList}) VALUES ${valuesClauses.join(', ')}`
            );

            totalInserted += batch.length;
        }

        console.log(`ingestData: ✅ loaded ${totalInserted} raw rows into "${safeTableName}".`);

        return {
            tableName: safeTableName,
            rowCount: totalInserted,
            columns,
        };

    } catch (error) {
        throw new Error(`ingestData: failed — ${error.message}`);
    }
}