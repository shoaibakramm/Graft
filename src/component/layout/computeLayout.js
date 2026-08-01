import * as hierarchy from '@antv/hierarchy';

const compactBox = hierarchy.compactBox ?? hierarchy.default?.compactBox;




/**
 * Turns the nested tree from buildTree into drawable geometry.
 * @param {import('./layoutContract').TreeNode} root
 * @param {Object} [options]
 * @param {'TB'|'BT'|'LR'|'RL'} [options.direction='TB']
 * @param {function(Object): number} [options.getWidth]
 * @param {function(Object): number} [options.getHeight]
 * @param {number} [options.siblingGap=24]
 * @param {number} [options.levelGap=60]
 * @returns {import('./layoutContract').LayoutResult}
 */
export function computeLayout(root, options = {}) {


  if (typeof compactBox !== 'function') 
  {
    throw new Error('computeLayout: could not resolve compactBox from @antv/hierarchy.');
  }

  if (!root || typeof root !== 'object') 
  {
    throw new Error('computeLayout: root must be the nested node returned by buildTree.');
  }

  if (!Array.isArray(root.children)) 
  {
    throw new Error(
      'computeLayout: root has no children array — did you pass raw rows instead of buildTree output?'
    );
  }


  const direction  = options.direction  ?? 'TB';
  const siblingGap = options.siblingGap ?? 24;
  const levelGap   = options.levelGap   ?? 60;

  const getWidth  = options.getWidth  ?? (() => 160);
  const getHeight = options.getHeight ?? (() => 48);


  const isVertical = direction === 'TB' || direction === 'BT';


  const hGap = (isVertical ? siblingGap : levelGap) / 2;
  
  const vGap = (isVertical ? levelGap : siblingGap) / 2;


  let positioned;

  try {

    positioned = compactBox(root, {
      direction,
      getId:     (d) => d.id,
      getWidth:  (d) => getWidth(d),
      getHeight: (d) => getHeight(d),
      getHGap:   () => hGap,
      getVGap:   () => vGap,
    });

  } catch (error) {

    throw new Error(`computeLayout: compactBox failed — ${error.message}`);

  }


  const nodes = [];

  const edges = [];

  walk(positioned, null, 0, nodes, edges, isVertical, getWidth, getHeight);


  if (nodes.length === 0) 
  {
    throw new Error('computeLayout: layout produced no nodes.');
  }


  const bounds = measureBounds(nodes);


  console.log(`computeLayout: ✅ ${nodes.length} nodes, ${edges.length} edges, ` + `${Math.round(bounds.width)}x${Math.round(bounds.height)}px.`);

  return { nodes, edges, bounds };
}




/**
 * Depth-first walk over the positioned tree, emitting one flat record per node and one per parent-child link.
 */
function walk(hierarchyNode, parentRecord, depth, nodes, edges, isVertical, getWidth, getHeight) {


  const original = hierarchyNode.data ?? hierarchyNode;


  const width  = getWidth(original);

  const height = getHeight(original);


  const left = hierarchyNode.x + ((hierarchyNode.width  ?? width)  - width)  / 2;

  const top  = hierarchyNode.y + ((hierarchyNode.height ?? height) - height) / 2;


  const record = {
    id: original.id,
    label: original.label ?? original.id,
    data: original.data ?? null,

    depth,

    x: left + width  / 2,            
    y: top  + height / 2,

    left,
    top,
    width,
    height,
  };

  nodes.push(record);



  if (parentRecord) 
  {
    edges.push({
      id: `${parentRecord.id}->${record.id}`,

      sourceId: parentRecord.id,
      targetId: record.id,

      sourceX: isVertical ? parentRecord.x : parentRecord.left + parentRecord.width,
      sourceY: isVertical ? parentRecord.top + parentRecord.height : parentRecord.y,

      targetX: isVertical ? record.x : record.left,
      targetY: isVertical ? record.top : record.y,
    });
  }


  for (const child of hierarchyNode.children ?? []) 
  {
    walk(child, record, depth + 1, nodes, edges, isVertical, getWidth, getHeight);
  }
}




/**
 * @param {Array<Object>} nodes
 * @returns {import('./layoutContract').LayoutBounds}
 */
function measureBounds(nodes) {

  let minX = Infinity;

  let minY = Infinity;
  
  let maxX = -Infinity;
  
  let maxY = -Infinity;

  for (const node of nodes) 
  {
    if (node.left < minX) minX = node.left;
    if (node.top  < minY) minY = node.top;

    if (node.left + node.width  > maxX) maxX = node.left + node.width;
    if (node.top  + node.height > maxY) maxY = node.top  + node.height;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width:  maxX - minX,
    height: maxY - minY,
  };
}