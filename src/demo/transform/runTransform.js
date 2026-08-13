import { detectFormat } from './detectFormat';
import { transformCanonical } from './transformCanonical';
import { transformPath } from './transformPath';
import { transformPivot } from './transformPivot';




/**
 *
 * Sniffs the raw table's columns, picks the matching transformer, and runs it. Every transformer shares one signature — (connection, rawTable, columns) —
 * and returns canonical rows, so adding a fourth client format later means writing one file and adding one line to the map below.
 */
const TRANSFORMERS = {
  canonical: transformCanonical,
  path: transformPath,
  pivot: transformPivot,
};




/**
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDBConnection} connection
 * @param {string} rawTable - The table ingestData loaded, column names intact.
 * @param {string[]} columns
 * @returns {Promise<{
 *   rows: import('./formatContract').CanonicalRow[],
 *   format: import('./formatContract').FormatId,
 *   label: string,
 * }>}
 */
export async function runTransform(connection, rawTable, columns) {


  const detection = detectFormat(columns);


  if (detection.format === 'unknown') 
  {
    throw new Error(`Unrecognised file format — ${detection.reason}`);
  }


  const transformer = TRANSFORMERS[detection.format];

  if (!transformer) 
  {
    throw new Error(`No transformer registered for format "${detection.format}".`);
  }


  console.log(`runTransform: "${detection.label}" — ${detection.reason}.`);


  let rows;

  try {

    rows = await transformer(connection, rawTable, columns);

  } catch (error) {

    throw new Error(`${detection.label} transform failed — ${error.message}`);

  }


  if (rows.length === 0) 
  {
    throw new Error(
      `${detection.label} transform produced no rows. ` +
      `The file matched this format but had no usable data in it.`
    );
  }


  return {
    rows,
    format: detection.format,
    label: detection.label,
  };
}