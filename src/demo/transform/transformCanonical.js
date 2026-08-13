import { queryDB } from '../db/queryDB';






/**
 * Transformer for the standard format — the file already has id, name and parentId, so this is the shortest chain in the set: one SELECT that trims
 * values and folds the optional columns into a metadata string.
 *
 * 
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDBConnection} connection
 * @param {string} rawTable - The table ingestData loaded, untouched.
 * @param {string[]} columns - Raw column names, as the file had them.
 * @returns {Promise<import('./formatContract').CanonicalRow[]>}
 */
export async function transformCanonical(connection, rawTable, columns) {


  const has = (name) => columns.some((c) => c.trim().toLowerCase() === name);

  // The file's own casing, since DuckDB identifiers are quoted below.
  const actual = (name) => columns.find((c) => c.trim().toLowerCase() === name);

  const quote = (name) => `"${String(name).replace(/"/g, '""')}"`;


  const idCol     = quote(actual('id'));
  const nameCol   = quote(actual('name'));
  const parentCol = quote(actual('parentid'));



  // Optional columns, folded into one tooltip string. CONCAT_WS drops NULLs rather than joining around them, so a row missing both gets '' not ' | '.
  const metadataParts = ['department', 'metadata']
    .filter(has)
    .map((n) => quote(actual(n)));



  const metadataExpr = metadataParts.length
    ? `NULLIF(CONCAT_WS(' | ', ${metadataParts.join(', ')}), '')`
    : `NULL`;




  // Sibling order. buildTree turns row order into left-to-right placement, so this clause is the only lever on how the tree reads. Numeric ids sort numerically; anything else falls back to text.
  const orderParts = [];


  
  if (has('level')) 
  {
    orderParts.push(`TRY_CAST(${quote(actual('level'))} AS INTEGER) NULLS LAST`);
  }

  orderParts.push(`TRY_CAST(${idCol} AS INTEGER) NULLS LAST`, `${idCol} ASC`);


  const sql = `
    SELECT
      TRIM(${idCol})     AS id,
      TRIM(${nameCol})   AS name,
      TRIM(${parentCol}) AS parentId,
      ${metadataExpr}    AS metadata
    FROM "${rawTable}"
    WHERE ${idCol} IS NOT NULL AND TRIM(${idCol}) != ''
    ORDER BY ${orderParts.join(', ')}
  `;


  const rows = await queryDB(connection, sql);

  console.log(`transformCanonical: ✅ ${rows.length} canonical rows.`);

  return rows;
}