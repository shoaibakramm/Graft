/**
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
 * @param {Array<Object>} rows 
 * @param {Object} [options]
 * @param {string} [options.idKey='id']
 * @param {string} [options.parentIdKey='parentId']
 * @param {string} [options.labelKey='name']
 * @returns {import('./layoutContract').TreeResult}
 */
export function buildTree(rows, options = {}) {


  const idKey       = options.idKey       ?? 'id';
  const parentIdKey = options.parentIdKey ?? 'parentId';
  const labelKey    = options.labelKey    ?? 'name';


  if (!Array.isArray(rows)) 
  {
    throw new Error('buildTree: rows must be an array.');
  }

  if (rows.length === 0) 
  {
    throw new Error('buildTree: rows array is empty — nothing to lay out.');
  }


  /* -- Pass 1: create every node, catch id problems ---------------------- */

  const nodeById  = new Map();
  const seenAtRow = new Map();

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
    path.push(current);                           
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