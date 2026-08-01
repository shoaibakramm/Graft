import { queryDB } from './queryDB';

/**
 * All scenario queries live here.
 * 
 * Every scenario query:
 * 1. Takes a DuckDB connection and a table name
 * 2. Runs a SQL query filtering/transforming the data
 * 3. Returns an array of node objects in the shape:
 *    { id, name, parentId, metadata }
 * 
 * This shape is what Phase 3 (d3-hierarchy layout engine) expects.
 * parentId must be null (not "") for root nodes.
 */

/**
 * Scenario A — Corporate Org Chart
 * 
 * Filters rows where dataset = 'orgchart'.
 * Returns nodes shaped for the tree layout engine.
 * 
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDBConnection} connection
 * @param {string} tableName - The ingested DuckDB table name
 * @returns {Promise<Array<{ id: string, name: string, parentId: string|null, metadata: string }>>}
 */
export async function queryOrgChart(connection, tableName) {
  const sql = `
    SELECT
      id,
      name,
      -- Convert empty string parentId to NULL
      -- d3-hierarchy uses NULL (not "") to identify the root node
      CASE
        WHEN parentId IS NULL OR TRIM(parentId) = ''
        THEN NULL
        ELSE TRIM(parentId)
      END AS parentId,
      -- Combine department and metadata into one tooltip string
      COALESCE(department, '') || ' | ' || COALESCE(metadata, '') AS metadata
    FROM "${tableName}"
    WHERE LOWER(TRIM(dataset)) = 'orgchart'
    ORDER BY CAST(level AS INTEGER) ASC, id ASC
  `;

  try {
    const rows = await queryDB(connection, sql);

    // Validate we got at least one row
    if (rows.length === 0) {
      console.warn('queryOrgChart: no rows returned. Is the dataset column correct?');
    }

    // Validate there is exactly one root node (parentId === null)
    const roots = rows.filter((r) => r.parentId === null || r.parentId === 'null');
    if (roots.length === 0) {
      console.warn('queryOrgChart: no root node found (no row with empty parentId).');
    }
    if (roots.length > 1) {
      console.warn(`queryOrgChart: found ${roots.length} root nodes. Tree layout expects exactly 1.`);
    }

    console.log(`queryOrgChart: ✅ returned ${rows.length} nodes.`);
    return rows;

  } catch (error) {
    throw new Error(`queryOrgChart: failed — ${error.message}`);
  }
}

/**
 * Scenario B — Website Navigation Taxonomy
 * 
 * Filters rows where dataset = 'navtaxonomy'.
 * Returns nodes shaped for the tree layout engine.
 * 
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDBConnection} connection
 * @param {string} tableName - The ingested DuckDB table name
 * @returns {Promise<Array<{ id: string, name: string, parentId: string|null, metadata: string }>>}
 */
export async function queryNavTaxonomy(connection, tableName) {
  const sql = `
    SELECT
      id,
      name,
      -- Same NULL conversion as Scenario A
      CASE
        WHEN parentId IS NULL OR TRIM(parentId) = ''
        THEN NULL
        ELSE TRIM(parentId)
      END AS parentId,
      -- Use department as page type, metadata as description
      COALESCE(department, '') || ' | ' || COALESCE(metadata, '') AS metadata
    FROM "${tableName}"
    WHERE LOWER(TRIM(dataset)) = 'navtaxonomy'
    ORDER BY CAST(level AS INTEGER) ASC, id ASC
  `;

  try {
    const rows = await queryDB(connection, sql);

    // Validate we got at least one row
    if (rows.length === 0) {
      console.warn('queryNavTaxonomy: no rows returned. Is the dataset column correct?');
    }

    // Validate root node
    const roots = rows.filter((r) => r.parentId === null || r.parentId === 'null');
    if (roots.length === 0) {
      console.warn('queryNavTaxonomy: no root node found.');
    }
    if (roots.length > 1) {
      console.warn(`queryNavTaxonomy: found ${roots.length} root nodes. Tree layout expects exactly 1.`);
    }

    console.log(`queryNavTaxonomy: ✅ returned ${rows.length} nodes.`);
    return rows;

  } catch (error) {
    throw new Error(`queryNavTaxonomy: failed — ${error.message}`);
  }
}

/**
 * Utility: lists all distinct dataset values in the table.
 * Useful for debugging — tells you what datasets are present
 * in whatever file was uploaded.
 * 
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDBConnection} connection
 * @param {string} tableName
 * @returns {Promise<string[]>}
 */
export async function listDatasets(connection, tableName) {
  const sql = `
    SELECT DISTINCT TRIM(dataset) AS dataset
    FROM "${tableName}"
    WHERE dataset IS NOT NULL AND TRIM(dataset) != ''
    ORDER BY dataset ASC
  `;

  try {
    const rows = await queryDB(connection, sql);
    const datasets = rows.map((r) => r.dataset);
    console.log(`listDatasets: found datasets —`, datasets);
    return datasets;
  } catch (error) {
    throw new Error(`listDatasets: failed — ${error.message}`);
  }
}