import { memo } from 'react';

import { useFocusClass } from './focusStore';




/**
 * One node. Subscribes to its own focus class and nothing else, so a hover
 * re-renders the handful of nodes whose class changed rather than the whole
 * tree — that is the entire reason this is a separate component instead of
 * inline JSX in TreeView.
 *
 * memo matters here: without it, TreeView re-rendering (a zoom, a resize)
 * would re-render every node anyway and the store buys nothing.
 */
const TreeNodeShape = memo(function TreeNodeShape({

  node,
  store,
  classForState,
  onHoverIn,
  onHoverOut,
  onClick,
  labelText,

}) {


  const focusClass = useFocusClass(store, node.id);


  return (
    <g
      className={`tree-view__node ${classForState(focusClass)}`}
      transform={`translate(${node.left}, ${node.top})`}
      onMouseEnter={() => onHoverIn(node.id)}
      onMouseLeave={onHoverOut}
      onClick={(event) => {
        event.stopPropagation();                     // keep it off the background handler
        onClick(node.id, event);
      }}
      data-focus={focusClass}
    >

      <rect
        className="tree-view__node-box"
        width={node.width}
        height={node.height}
        rx="6"
      />

      <text
        className="tree-view__node-label"
        x={node.width / 2}
        y={node.height / 2}
        dominantBaseline="central"
        textAnchor="middle"
      >
        {labelText}
      </text>

    </g>
  );
});

export default TreeNodeShape;