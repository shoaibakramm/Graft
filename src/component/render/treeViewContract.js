/**
 * The public API of <TreeView>.
 *
 */




/**
 * A raw input row. Any object shape works; the accessor props below say which keys to read. Both a flat array with parentId and a nested object are accepted — see the data prop.
 *
 * @typedef {Object} TreeViewRow
 */




/**
 * Class names applied per focus state. Class names rather than style objects so the dim and undim can carry a CSS transition.
 *
 * Every field is optional; anything omitted falls back to the component's own default class, so a caller can override one state without redeclaring all of them.
 *
 * @typedef {Object} FocusStateStyles
 * @property {string} [active]         - The hovered node, and its edges.
 * @property {string} [childOfActive]  - Immediate children of the hovered node.
 * @property {string} [dimmed]         - Everything else, while something is hovered.
 * @property {string} [idle]           - Every node, while nothing is hovered.
 */




/**
 * What an event handler receives. The original row is passed back untouched so the caller can read fields the component never knew about.
 *
 * @typedef {Object} TreeViewNodeEvent
 * @property {string} id
 * @property {string} label
 * @property {TreeViewRow} data        - The caller's own row object.
 * @property {number} depth
 * @property {number} x                - Layout coordinates, not screen pixels.
 * @property {number} y
 * @property {string[]} childIds
 * @property {string|null} parentId
 */




/**
 * @typedef {Object} TreeViewProps
 *
 * -- Data -----------------------------------------------------------------
 *
 * @property {TreeViewRow[]} data
 *   Flat array of rows. Exactly one row must have an empty parentId.
 *
 * @property {string} [idKey='id']
 * @property {string} [parentIdKey='parentId']
 * @property {string} [labelKey='name']
 *   Which keys to read. These are the accessor props — nothing about the caller's column names is hardcoded.
 *
 * -- Layout ---------------------------------------------------------------
 *
 * @property {'TB'|'BT'|'LR'|'RL'} [direction='TB']
 * @property {function(TreeViewNodeEvent): number} [getNodeWidth]
 * @property {function(TreeViewNodeEvent): number} [getNodeHeight]
 *   Per node, in px. Constant by default; vary them to size nodes by label length or subtree weight.
 *
 * @property {number} [siblingGap=24]
 * @property {number} [levelGap=60]
 *
 * -- Edges ----------------------------------------------------------------
 *
 * @property {number} [edgeRadius=8]
 *   Corner rounding on the orthogonal elbows. 0 for square corners.
 *   Note: clamped by available space — see edgeOffset.
 *
 * @property {number} [edgeOffset=12]
 *   Straight run before the first turn. Must leave room for edgeRadius:
 *   edgeOffset <= levelGap / 2 - 2 * edgeRadius, or the radius gets clamped.
 *
 * -- Focus ----------------------------------------------------------------
 *
 * @property {FocusStateStyles} [focusStateStyles]
 *   Class names per state. Focus is driven by hover.
 *
 * @property {boolean} [dimOnFocus=true]
 *   Whether unrelated nodes are pushed to the background at all.
 *
 * -- Tooltip --------------------------------------------------------------
 *
 * @property {function(TreeViewNodeEvent): React.ReactNode} [renderTooltip]
 *   Returns tooltip content for the active node. Omit for no tooltips — the
 *   component supplies no default content, since it cannot know which of the
 *   caller's fields are worth showing.
 *
 * -- Zoom -----------------------------------------------------------------
 *
 * @property {[number, number]} [scaleExtent=[0.1, 4]]
 * @property {boolean} [fitOnMount=true]
 * @property {number} [fitPadding=40]
 *
 * -- Events ---------------------------------------------------------------
 *
 * @property {function(TreeViewNodeEvent|null): void} [onNodeFocus]
 *   Fires with the node on hover in, and with null on hover out.
 *
 * @property {function(TreeViewNodeEvent, MouseEvent): void} [onNodeClick]
 *
 * @property {function(MouseEvent): void} [onBackgroundClick]
 *   Fires only on a genuine click — a click that moved far enough to be a pan
 *   is swallowed by the zoom behaviour.
 *
 * @property {function({k: number, x: number, y: number}): void} [onZoom]
 *
 * @property {function(Error): void} [onLayoutError]
 *   Called when the data cannot form a tree — multiple roots, a cycle, a
 *   missing parent. The component renders its error state either way; this is
 *   for the caller to log or surface it.
 *
 * -- Presentation ---------------------------------------------------------
 *
 * @property {string} [className]
 */