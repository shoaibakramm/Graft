import { queryDB } from './queryDB';




/**
 * Generic scenario queries. Nothing here knows what "orgchart" means — dataset values are DISCOVERED from the uploaded table, and one tree is produced per
 * value found. A table with no "dataset" column is treated as one whole tree.
 * The only column-name assumptions left are id / name / parentId (which the tree needs) and the optional dataset / level / department / metadata conventions this demo app documents for its input files.
 */


/**
 * Column names present on the table, via DESCRIBE.
 *
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDBConnection} connection
 * @param {string} tableName
 * @returns {Promise<string[]>}
 */
export async function listColumns(connection, tableName) {

  const rows = await queryDB(connection, `DESCRIBE "${tableName}"`);

  // DESCRIBE returns one row per column; the name lives in column_name.
  return rows.map((r) => r.column_name);
}




/**
 * Distinct non-empty dataset values, in alphabetical order.
 *
 * @returns {Promise<string[]>}
 */
export async function listDatasets(connection, tableName) {

  const sql = `
    SELECT DISTINCT TRIM(dataset) AS dataset
    FROM "${tableName}"
    WHERE dataset IS NOT NULL AND TRIM(dataset) != ''
    ORDER BY dataset ASC
  `;

  const rows = await queryDB(connection, sql);

  return rows.map((r) => r.dataset);
}




/**
 * Shared SELECT for tree rows. metadata / level / department are optional
 * conventions — columns the table actually has decide what goes in.
 *
 * - TRY_CAST instead of CAST: a junk value in "level" sorts last instead of
 *   killing the whole query.
 * - CONCAT_WS skips NULLs entirely, so a row missing department or metadata
 *   gets clean output instead of a dangling " | ".
 * - ORDER BY is load-bearing: buildTree preserves row order into sibling
 *   order, so this clause decides left-to-right placement in the diagram.
 */
function treeSQL(tableName, columns, whereClause) {

  const has = (name) => columns.includes(name);

  const metadataExpr =
    has('department') && has('metadata') ? `CONCAT_WS(' | ', department, metadata)`
    : has('metadata')                    ? `metadata`
    : has('department')                  ? `department`
    : `NULL`;

  const orderExpr = has('level')
    ? `TRY_CAST(level AS INTEGER) NULLS LAST, id ASC`
    : `id ASC`;

  return `
    SELECT
      id,
      name,
      TRIM(parentId) AS parentId,
      ${metadataExpr} AS metadata
    FROM "${tableName}"
    ${whereClause}
    ORDER BY ${orderExpr}
  `;
}




/**
 * Rows for one dataset value.
 *
 * @param {string} datasetValue - Escaped here; values come from listDatasets but may contain quotes if the file does.
 * @returns {Promise<Array<{id: string, name: string, parentId: string|null, metadata: string|null}>>}
 */
export async function queryDataset(connection, tableName, columns, datasetValue) {

  const escaped = String(datasetValue).replace(/'/g, "''");

  const sql = treeSQL(
    tableName,
    columns,
    `WHERE LOWER(TRIM(dataset)) = LOWER('${escaped}')`
  );

  const rows = await queryDB(connection, sql);

  warnOnRoots(rows, `queryDataset(${datasetValue})`);

  return rows;
}




/**
 * The whole table as one tree — for files with no dataset column.
 */
export async function queryWholeTable(connection, tableName, columns) {

  const rows = await queryDB(connection, treeSQL(tableName, columns, ''));

  warnOnRoots(rows, 'queryWholeTable');

  return rows;
}




function warnOnRoots(rows, label) {

  if (rows.length === 0) 
  {
    console.warn(`${label}: no rows returned.`);
    return;
  }

  const roots = rows.filter((r) => r.parentId === null);

  if (roots.length === 0) 
  {
    console.warn(`${label}: no root node found (no row with empty parentId).`);
  }

  if (roots.length > 1) 
  {
    console.warn(`${label}: found ${roots.length} root nodes. Tree layout expects exactly 1.`);
  }

  console.log(`${label}: ✅ returned ${rows.length} nodes.`);
}