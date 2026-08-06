/**
 * Turns tree data into a nested tree plus the lookup maps the focus-statelayer needs. Accepts EITHER:
 *   - a flat array of rows with id / parentId, or
 *   - a nested JSON object with a children array
 * per the assignment's data prop requirement. Nested input is flattened into rows first, so validation, maps and layout share one code path.
 *
 * Zero dependencies. Runs before any layout library touches the data, and all validation lives here — by the time computeLayout sees the tree, it is
 * guaranteed to have exactly one root, no duplicates and no cycles.
 */


/**
 * Treats null, undefined, "", "   " and the literal string "null" as "no parent".
 *
 * scenarios.js returns real null for SQL NULL, but a raw CSV that skips the DB gives "". Both must read as the root.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isEmptyParent(value) {

  if (value === null || value === undefined) 
  {
    return true;
  }

  const asString = String(value).trim();

  return asString === '' || asString.toLowerCase() === 'null';

}




/**
 * @param {Array<Object>|Object} rows - Flat rows, or one nested root object.
 * @param {Object} [options]
 * @param {string} [options.idKey='id']
 * @param {string} [options.parentIdKey='parentId']
 * @param {string} [options.labelKey='name']
 * @param {string} [options.childrenKey='children'] - Nested input only.
 * @returns {import('./layoutContract').TreeResult}
 */
export function buildTree(rows, options = {}) {


  const idKey       = options.idKey       ?? 'id';
  const parentIdKey = options.parentIdKey ?? 'parentId';
  const labelKey    = options.labelKey    ?? 'name';
  const childrenKey = options.childrenKey ?? 'children';


  if (!Array.isArray(rows) && rows !== null && typeof rows === 'object') 
  {
    rows = flattenNested(rows, { idKey, parentIdKey, labelKey, childrenKey });
  }

  if (!Array.isArray(rows)) 
  {
    throw new Error('buildTree: data must be a flat array of rows or a nested object.');
  }

  if (rows.length === 0) 
  {
    throw new Error('buildTree: rows array is empty — nothing to lay out.');
  }


  /* -- Pass 1: create every node, catch id problems ---------------------- */

  const nodeById  = new Map();
  const seenAtRow = new Map();                       // id -> row index, for duplicate messages

  rows.forEach((row, index) => {

    if (row === null || typeof row !== 'object') 
    {
      throw new Error(`buildTree: row ${index} is not an object.`);
    }

    if (!(idKey in row)) 
    {
      const available = Object.keys(row).join(', ') || '(none)';

      throw new Error(
        `buildTree: row ${index} has no "${idKey}" column. Columns present: ${available}.`
      );
    }

    const id = String(row[idKey]).trim();

    if (id === '') 
    {
      throw new Error(
        `buildTree: row ${index} has an empty "${idKey}". ` +
        `Blank rows in the source file are the usual cause.`
      );
    }

    if (nodeById.has(id)) 
    {
      throw new Error(
        `buildTree: duplicate ${idKey} "${id}" at rows ${seenAtRow.get(id)} and ${index}.`
      );
    }

    seenAtRow.set(id, index);

    nodeById.set(id, {
      id,
      label: labelKey in row && row[labelKey] != null ? String(row[labelKey]) : id,
      data: row,
      children: [],
    });

  });


  /* -- Pass 2: wire parents, catch structural problems ------------------- */

  const childrenOf = new Map();
  const parentOf   = new Map();

  const rootIds = [];

  rows.forEach((row, index) => {

    const id        = String(row[idKey]).trim();
    const rawParent = row[parentIdKey];

    if (isEmptyParent(rawParent)) 
    {
      rootIds.push(id);
      parentOf.set(id, null);
      return;
    }

    const parentId = String(rawParent).trim();

    if (parentId === id) 
    {
      throw new Error(`buildTree: row ${index} ("${id}") is its own parent.`);
    }

    if (!nodeById.has(parentId)) 
    {
      throw new Error(
        `buildTree: row ${index} ("${id}") points at ${parentIdKey} "${parentId}", ` +
        `but no row has that ${idKey}.`
      );
    }

    parentOf.set(id, parentId);

    // Children land in row order, so the ORDER BY in scenarios.js is what
    // decides left-to-right sibling order in the final layout.
    nodeById.get(parentId).children.push(nodeById.get(id));

    if (!childrenOf.has(parentId)) 
    {
      childrenOf.set(parentId, []);
    }

    childrenOf.get(parentId).push(id);

  });


  if (rootIds.length === 0) 
  {
    throw new Error(
      `buildTree: no root found — every row has a ${parentIdKey}. ` +
      `Exactly one row must leave ${parentIdKey} empty.`
    );
  }

  if (rootIds.length > 1) 
  {
    const shown = rootIds.slice(0, 5).join(', ');
    const more  = rootIds.length > 5 ? ` (+${rootIds.length - 5} more)` : '';

    throw new Error(
      `buildTree: found ${rootIds.length} rows with an empty ${parentIdKey} — ` +
      `expected exactly 1. Offending ${idKey}s: ${shown}${more}.`
    );
  }


  const root = nodeById.get(rootIds[0]);


  /* -- Pass 3: anything unreachable from the root is in a cycle ---------- */

  const reachable = new Set();
  const stack     = [root];

  while (stack.length > 0) 
  {
    const node = stack.pop();

    if (reachable.has(node.id)) 
    {
      continue;
    }

    reachable.add(node.id);

    for (const child of node.children) 
    {
      stack.push(child);
    }
  }

  if (reachable.size !== nodeById.size) 
  {
    const stranded = [...nodeById.keys()].find((id) => !reachable.has(id));

    throw new Error(
      `buildTree: ${nodeById.size - reachable.size} rows are unreachable from the root — ` +
      `the ${parentIdKey} chain contains a cycle. Trace: ${describeCycle(stranded, parentOf)}.`
    );
  }


  console.log(`buildTree: ✅ ${nodeById.size} nodes, root "${root.id}", depth ${measureDepth(root)}.`);

  return {
    root,
    nodeById,
    childrenOf,
    parentOf,
    count: nodeById.size,
  };
}




/**
 * Converts a nested JSON object into the flat rows the rest of buildTree
 * already understands, so validation, maps and layout stay untouched.
 *
 * Nested input often has no ids at all — path ids ("n0", "n0.1", "n0.1.2")
 * are generated for any node without one. Existing ids are kept.
 *
 * @param {Object} rootObject
 * @param {{idKey: string, parentIdKey: string, labelKey: string, childrenKey: string}} keys
 * @returns {Array<Object>}
 */
function flattenNested(rootObject, keys) {

  const { idKey, parentIdKey, labelKey, childrenKey } = keys;

  const rows = [];

  function visit(node, parentId, pathId) {

    if (node === null || typeof node !== 'object') 
    {
      throw new Error(`buildTree: nested node under parent "${parentId ?? 'root'}" is not an object.`);
    }

    const id = node[idKey] != null && String(node[idKey]).trim() !== ''
      ? String(node[idKey]).trim()
      : pathId;

    // Original fields survive minus the children array — the row IS the
    // caller's node, so tooltips and event payloads see their own data.
    const { [childrenKey]: children, ...rest } = node;

    rows.push({
      ...rest,
      [idKey]: id,
      [parentIdKey]: parentId,
      [labelKey]: node[labelKey] != null ? node[labelKey] : id,
    });

    (Array.isArray(children) ? children : []).forEach((child, index) => {
      visit(child, id, `${pathId}.${index}`);
    });

  }

  visit(rootObject, null, 'n0');

  return rows;
}




/**
 * Walks up the parent chain from a stranded node until it repeats, so the
 * error names the actual loop instead of just saying "cycle".
 *
 * @param {string} startId
 * @param {Map<string, string|null>} parentOf
 * @returns {string}
 */
function describeCycle(startId, parentOf) {

  const path = [];
  const seen = new Set();

  let current = startId;

  while (current != null && !seen.has(current)) 
  {
    seen.add(current);
    path.push(current);
    current = parentOf.get(current) ?? null;
  }

  if (current != null) 
  {
    path.push(current);                              // close the loop visibly
  }

  return path.join(' -> ');
}




/**
 * @param {Object} node
 * @returns {number}
 */
function measureDepth(node) {

  if (node.children.length === 0) 
  {
    return 1;
  }

  return 1 + Math.max(...node.children.map(measureDepth));
}