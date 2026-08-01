/**
 * Shapes passed between the Phase 3 layout files.
 *
 * Input comes from scenarios.js (or fixtures.js while testing) as a flat
 * array of rows. Output is pure geometry — no React, no DOM.
 */




/**
 * One row as it arrives from a scenario query.
 *
 * @typedef {Object} SourceRow
 * @property {string} id
 * @property {string} name
 * @property {string|null} parentId   - null, "" or absent marks the root.
 * @property {string} [metadata]
 */




/**
 * A node in the nested tree that buildTree produces.
 *
 * @typedef {Object} TreeNode
 * @property {string} id
 * @property {string} label
 * @property {SourceRow} data          - The original row, untouched.
 * @property {TreeNode[]} children     - Empty array for leaves, never undefined.
 */




/**
 * Everything buildTree returns. The maps exist so focus-state lookups are
 * O(1) instead of walking the tree on every hover.
 *
 * @typedef {Object} TreeResult
 * @property {TreeNode} root
 * @property {Map<string, TreeNode>} nodeById
 * @property {Map<string, string[]>} childrenOf     - id -> child ids
 * @property {Map<string, string|null>} parentOf    - id -> parent id, null at root
 * @property {number} count
 */




/**
 * A node after compactBox has assigned it a position.
 *
 * @typedef {Object} PositionedNode
 * @property {string} id
 * @property {string} label
 * @property {SourceRow} data
 * @property {number} depth
 * @property {number} x        - Centre of the box.
 * @property {number} y        - Centre of the box.
 * @property {number} left     - Box origin.
 * @property {number} top
 * @property {number} width
 * @property {number} height
 */




/**
 * One parent-child link, with the anchor points already resolved so the path
 * generator does no geometry of its own.
 *
 * @typedef {Object} PositionedEdge
 * @property {string} id
 * @property {string} sourceId
 * @property {string} targetId
 * @property {number} sourceX  - On the parent's outgoing edge.
 * @property {number} sourceY
 * @property {number} targetX  - On the child's incoming edge.
 * @property {number} targetY
 */




/**
 * @typedef {Object} LayoutBounds
 * @property {number} minX
 * @property {number} minY
 * @property {number} maxX
 * @property {number} maxY
 * @property {number} width
 * @property {number} height
 */




/**
 * What computeLayout returns.
 *
 * @typedef {Object} LayoutResult
 * @property {PositionedNode[]} nodes
 * @property {PositionedEdge[]} edges
 * @property {LayoutBounds} bounds
 */




/**
 * A PositionedEdge with its SVG path string attached, from edgePaths.js.
 *
 * @typedef {PositionedEdge & { path: string }} DrawableEdge
 */






/*
SourceRow[]  (flat, from scenarios.js/fixtures.js)
     │  buildTree()
     ▼
TreeResult { root: TreeNode, nodeById, childrenOf, parentOf, count }
     │  compactBox()
     ▼
LayoutResult { nodes: PositionedNode[], edges: PositionedEdge[], bounds }
     │  edgePaths.js
     ▼
DrawableEdge[]  (edges with .path strings, ready to render)
*/

