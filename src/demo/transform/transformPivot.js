import { queryDB } from '../db/queryDB';
import { levelColumns } from './detectFormat';



/**
 * Transformer for the denormalized pivot / BI export format.
 *
 *   Level 1,      Level 2,        Level 3,        Headcount,  Budget
 *   Amara Osei,   Ravi Chandra,   Priya Nair,     12,         850000
 *   Amara Osei,   Ravi Chandra,   Diego Marquez,  8,          620000
 *   Amara Osei,   Marcus Webb,    ,               2,          150000
 *
 * The hard one. Each row is a complete branch, not a node — so the row count does not match the node count, and every non-leaf node exists only
 * implicitly, repeated across the rows that pass through it. Those nodes have to be invented by de-duplication.
 *
 * The chain, as CTEs so nothing is left behind in the database:
 *
 *   s1_unpivot   one row per filled cell: (src_row, level, name)
 *   s2_edges     each cell paired with the cell one level up in the SAME row
 *   s3_nodes     DISTINCT on (level, name) — 5 branch rows become 8 nodes
 *   s4_ids       a stable synthetic id per node
 *   final        join ids back onto the parent side, project to canonical
 *
 * The level columns are read from the file rather than hardcoded, so Level 1..3 and Level 1..8 both work.
 *
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDBConnection} connection
 * @param {string} rawTable
 * @param {string[]} columns
 * @returns {Promise<import('./formatContract').CanonicalRow[]>}
 */
export async function transformPivot(connection, rawTable, columns) {


  const quote = (name) => `"${String(name).replace(/"/g, '""')}"`;


  const levels = levelColumns(columns);

  if (levels.length < 2) 
  {

    throw new Error(`transformPivot: needs at least two "Level N" columns, found ${levels.length}.`);
  
  }


  // Measure columns are whatever is left over — Headcount, Budget, anything else the client sent. They belong to the LEAF of each branch, since that is
  // the row's subject; a parent's numbers would be a sum we have no mandate to compute.
  const levelNames = new Set(levels.map((l) => l.name));

  const measureCols = columns.filter((c) => !levelNames.has(c));


  // s1: unpivot. One SELECT per level column, UNION ALL'd. Written out rather  than using DuckDB's UNPIVOT so the level number is explicit and the measures ride along for the leaf-detection in the final projection.
  const unpivotParts = levels.map((lvl) => `
      SELECT
        src_row,
        ${lvl.level} AS level,
        TRIM(${quote(lvl.name)}) AS name,
        ${measureCols.length
          ? measureCols.map((m) => `${quote(m)} AS ${quote(m)}`).join(', ')
          : `NULL AS unused_measure`}
      FROM numbered
      WHERE ${quote(lvl.name)} IS NOT NULL AND TRIM(${quote(lvl.name)}) != ''
  `);


  // The measure string attached to a node — only meaningful for the deepest cell of a row, so it is applied in the final SELECT via the leaf test.
  const measureExpr = measureCols.length
    ? `NULLIF(CONCAT_WS(' | ', ${measureCols
        .map((m) => `CASE WHEN child.${quote(m)} IS NOT NULL THEN CONCAT('${m.replace(/'/g, "''")}: ', child.${quote(m)}) END`)
        .join(', ')}), '')`
    : `NULL`;


  const sql = `
    WITH numbered AS (
      -- A stable row number so cells can be matched back to their own branch.
      SELECT ROW_NUMBER() OVER () AS src_row, * FROM "${rawTable}"
    ),

    s1_unpivot AS (
      ${unpivotParts.join('\n      UNION ALL\n')}
    ),

    s2_edges AS (
      SELECT
        child.level,
        child.name,
        parent.name AS parent_name,
        child.src_row,
        -- Deepest filled cell in this branch: the row's actual subject.
        (child.level = (SELECT MAX(level) FROM s1_unpivot s WHERE s.src_row = child.src_row))
          AS is_leaf_of_row,
        ${measureCols.length ? measureCols.map((m) => `child.${quote(m)}`).join(', ') : 'NULL AS unused_measure'}
      FROM s1_unpivot child
      LEFT JOIN s1_unpivot parent
        ON parent.src_row = child.src_row
       AND parent.level  = child.level - 1
    ),

    s3_nodes AS (
      -- The de-duplication that invents the implicit nodes. Amara appears in
      -- every row; MIN(parent_name) is a no-op for her (all NULL) and picks the
      -- single real parent for everyone else, since a node's parent is the same
      -- in every branch it appears in.
      SELECT
        level,
        name,
        MIN(parent_name) AS parent_name,
        MAX(CASE WHEN is_leaf_of_row THEN 1 ELSE 0 END) AS is_leaf,
        ${measureCols.length
          ? measureCols.map((m) => `MAX(CASE WHEN is_leaf_of_row THEN ${quote(m)} END) AS ${quote(m)}`).join(', ')
          : 'NULL AS unused_measure'}
      FROM s2_edges
      GROUP BY level, name
    ),

    s4_ids AS (
      -- Level in the id keeps two same-named people at different depths apart,
      -- and makes the ids readable while debugging.
      SELECT
        CONCAT('n', level, '_', ROW_NUMBER() OVER (PARTITION BY level ORDER BY name)) AS id,
        *
      FROM s3_nodes
    )

    SELECT
      child.id       AS id,
      child.name     AS name,
      parent.id      AS parentId,
      CASE WHEN child.is_leaf = 1 THEN ${measureExpr} ELSE NULL END AS metadata
    FROM s4_ids child
    LEFT JOIN s4_ids parent
      ON parent.name  = child.parent_name
     AND parent.level = child.level - 1
    ORDER BY child.level, child.name
  `;


  const rows = await queryDB(connection, sql);

  console.log(`transformPivot: ✅ ${rows.length} canonical rows from a pivot export.`);

  return rows;
}