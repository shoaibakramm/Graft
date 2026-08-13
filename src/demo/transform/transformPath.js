import { queryDB } from '../db/queryDB';




/**
 * Transformer for the path format.
 *
 *   path,label,type,owner
 *   /company,Global HQ,root,Amara Osei
 *   /company/tech,Technology,division,Ravi Chandra
 *
 * There is no id column and no parent column. Hierarchy lives entirely in the string: a node's parent is its own path minus the last segment. The path
 * doubles as the id, which is already unique by construction.
 *
 * The chain, as CTEs so nothing is left behind in the database:
 *
 *   s1_clean   trim, drop blank paths, normalise trailing slashes
 *   s2_parent  derive parent_path by stripping the last /segment
 *   s3_root    null out any parent that does not exist as a row of its own
 *   final      project to id / name / parentId / metadata
 *
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDBConnection} connection
 * @param {string} rawTable
 * @param {string[]} columns
 * @returns {Promise<import('./formatContract').CanonicalRow[]>}
 */
export async function transformPath(connection, rawTable, columns) {


  const actual = (name) => columns.find((c) => c.trim().toLowerCase() === name);

  const quote = (name) => `"${String(name).replace(/"/g, '""')}"`;


  const pathCol = quote(actual('path'));



  // Everything else is optional — a path file might carry only paths.
  const labelCol = actual('label') ? quote(actual('label')) : null;

  const metadataParts = ['type', 'owner']
    .filter((n) => actual(n))
    .map((n) => quote(actual(n)));


  const metadataExpr = metadataParts.length
    ? `NULLIF(CONCAT_WS(' | ', ${metadataParts.join(', ')}), '')`
    : `NULL`;





  // No label column: fall back to the last path segment, which reads better than the whole path.
  const nameExpr = labelCol
    ? `COALESCE(NULLIF(TRIM(${labelCol}), ''), REGEXP_REPLACE(clean_path, '^.*/', ''))`
    : `REGEXP_REPLACE(clean_path, '^.*/', '')`;




  const sql = `
    WITH s1_clean AS (
      SELECT
        -- One trailing slash is a typo, not a level: /company/ is /company.
        REGEXP_REPLACE(TRIM(${pathCol}), '/+$', '') AS clean_path,
        *
      FROM "${rawTable}"
      WHERE ${pathCol} IS NOT NULL
        AND TRIM(${pathCol}) != ''
        AND REGEXP_REPLACE(TRIM(${pathCol}), '/+$', '') != ''
    ),

    s2_parent AS (
      SELECT
        clean_path,
        -- Strip the final /segment. '/company' has nothing above it, so this
        -- yields '' — which s3 turns into NULL, marking the root.
        REGEXP_REPLACE(clean_path, '/[^/]+$', '') AS parent_path,
        *
      FROM s1_clean
    ),

    s3_root AS (
      SELECT
        clean_path,
        -- A parent path that no row actually declares cannot be pointed at, so
        -- that node becomes a root too. Without this, a file listing only
        -- /a/b/c and not /a/b would produce a dangling parent reference.
        CASE
          WHEN parent_path = '' THEN NULL
          WHEN parent_path NOT IN (SELECT clean_path FROM s1_clean) THEN NULL
          ELSE parent_path
        END AS parent_path,
        *
      FROM s2_parent
    )

    SELECT
      clean_path   AS id,
      ${nameExpr}  AS name,
      parent_path  AS parentId,
      ${metadataExpr} AS metadata
    FROM s3_root
    -- Shallow paths first, then alphabetically: parents before children, and
    -- siblings in a readable order.
    ORDER BY ${nameExpr} ASC
  `;



  
  const rows = await queryDB(connection, sql);

  console.log(`transformPath: ✅ ${rows.length} canonical rows.`);

  return rows;
}