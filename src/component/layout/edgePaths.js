import * as xyflow from '@xyflow/react';


const getSmoothStepPath = xyflow.getSmoothStepPath ?? xyflow.default?.getSmoothStepPath;



const Position = xyflow.Position ?? xyflow.default?.Position ?? {
  Top: 'top',
  Bottom: 'bottom',
  Left: 'left',
  Right: 'right',
};



const ANCHORS = {
  TB: [Position.Bottom, Position.Top],
  BT: [Position.Top,    Position.Bottom],
  LR: [Position.Right,  Position.Left],
  RL: [Position.Left,   Position.Right],
};




/**
 * @param {import('./layoutContract').PositionedEdge[]} edges
 * @param {Object} [options]
 * @param {'TB'|'BT'|'LR'|'RL'} [options.direction='TB'] 
 * @param {number} [options.borderRadius=8] 
 * @param {number} [options.offset=20] 
 * @returns {import('./layoutContract').DrawableEdge[]}
 */
export function attachEdgePaths(edges, options = {}) {


  if (typeof getSmoothStepPath !== 'function') 
  {
    throw new Error(
      'attachEdgePaths: could not resolve getSmoothStepPath from @xyflow/react. ' +
      `Exports seen: ${Object.keys(xyflow).slice(0, 12).join(', ')}`
    );
  }

  if (!Array.isArray(edges)) 
  {
    throw new Error('attachEdgePaths: edges must be an array.');
  }


  const direction    = options.direction    ?? 'TB';
  const borderRadius = options.borderRadius ?? 8;
  const offset       = options.offset       ?? 20;


  const anchors = ANCHORS[direction];

  if (!anchors) 
  {
    throw new Error(
      `attachEdgePaths: unknown direction "${direction}". Expected one of ${Object.keys(ANCHORS).join(', ')}.`
    );
  }

  const [sourcePosition, targetPosition] = anchors;


  return edges.map((edge, index) => {

    if (!Number.isFinite(edge?.sourceX) || !Number.isFinite(edge?.sourceY) || !Number.isFinite(edge?.targetX) || !Number.isFinite(edge?.targetY)) 
    {
      throw new Error(
        `attachEdgePaths: edge ${index} ("${edge?.id ?? '?'}") has non-numeric anchors. ` +
        `Did it come from computeLayout?`
      );
    }

    const [path, labelX, labelY] = getSmoothStepPath({

      sourceX: edge.sourceX,
      sourceY: edge.sourceY,
      sourcePosition,

      targetX: edge.targetX,
      targetY: edge.targetY,
      targetPosition,

      borderRadius,
      offset,

    });

    return { ...edge, path, labelX, labelY };

  });
}