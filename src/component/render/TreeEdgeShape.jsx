import { memo } from 'react';

import { useEdgeFocusClass } from './focusStore';




/**
 * One edge path. Active when its source is the focused node — those are the
 * edges connecting the active node to its children. Same memo-plus-subscription
 * shape as TreeNodeShape, for the same reason.
 */
const TreeEdgeShape = memo(function TreeEdgeShape({

  edge,
  store,
  classForState,

}) {


  const focusClass = useEdgeFocusClass(store, edge.sourceId);


  return (
    <path
      className={`tree-view__edge ${classForState(focusClass)}`}
      d={edge.path}
      fill="none"
      data-focus={focusClass}
    />
  );
});

export default TreeEdgeShape;