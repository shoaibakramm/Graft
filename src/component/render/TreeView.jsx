import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResizeObserver } from 'use-resize-observer';
import { zoomIdentity } from 'd3-zoom';

import { buildTree } from '../layout/buildTree';
import { computeLayout } from '../layout/computeLayout';
import { attachEdgePaths } from '../layout/edgePaths';
import { useZoom } from './useZoom';
import { createFocusStore } from './focusStore';
import TreeNodeShape from './TreeNodeShape';
import TreeEdgeShape from './TreeEdgeShape';
import ZoomControls from './ZoomControls';
import NodeTooltip from './NodeTooltip';

import './TreeView.css';




const DEFAULT_NODE_WIDTH  = () => 160;


const DEFAULT_NODE_HEIGHT = () => 48;




const DEFAULT_FOCUS_CLASSES = {
  idle:          'tree-view--idle',
  active:        'tree-view--active',
  childOfActive: 'tree-view--child-of-active',
  dimmed:        'tree-view--dimmed',
};


// zustand state keys are kebab-case FocusClass strings; the prop uses camelCase keys. This maps between them once.
const STATE_KEY = {
  'idle': 'idle',
  'active': 'active',
  'child-of-active': 'childOfActive',
  'dimmed': 'dimmed',
};




/**
 * The tree component.
 *
 * @param {import('./treeViewContract').TreeViewProps} props
 */
export default function TreeView({

  data,

  idKey       = 'id',
  parentIdKey = 'parentId',
  labelKey    = 'name',

  direction  = 'TB',
  siblingGap = 24,
  levelGap   = 60,

  getNodeWidth  = DEFAULT_NODE_WIDTH,
  getNodeHeight = DEFAULT_NODE_HEIGHT,

  edgeRadius = 8,
  edgeOffset = 12,

  scaleExtent = undefined,
  fitOnMount  = true,
  fitPadding  = 40,

  focusStateStyles = undefined,
  dimOnFocus = true,

  renderTooltip = undefined,

  onZoom,
  onNodeFocus,
  onNodeClick,
  onBackgroundClick,
  onLayoutError,

  className = '',

}) {


  const { ref: containerRef, width = 0, height = 0 } = useResizeObserver();


  const layout = useMemo(() => {

    try {

      const tree = buildTree(data, { idKey, parentIdKey, labelKey });



      const geometry = computeLayout(tree.root, {
        direction,
        siblingGap,
        levelGap,
        getWidth:  getNodeWidth,
        getHeight: getNodeHeight,
      });



      const edges = attachEdgePaths(geometry.edges, {
        direction,
        borderRadius: edgeRadius,
        offset: edgeOffset,
      });



      return { tree, geometry, edges, error: null };



    } catch (error) {


      return { tree: null, geometry: null, edges: null, error };


    }

  }, [
    data, idKey, parentIdKey, labelKey,
    direction, siblingGap, levelGap,
    getNodeWidth, getNodeHeight,
    edgeRadius, edgeOffset,
  ]);



  const { svgRef, ready, transform, zoomBy, zoomTo } = useZoom({
    ...(scaleExtent ? { scaleExtent } : {}),
    onZoom,
  });




  // One store per TreeView instance — module-level zustand would make two trees on one screen share focus. Rebuilt when the tree changes, since the childrenOf map inside it belongs to that tree.
  const focusStore = useMemo(
    () => createFocusStore(layout.tree?.childrenOf ?? new Map()),
    [layout.tree]
  );



  const onNodeFocusRef = useRef(onNodeFocus);


  useEffect(() => {
    onNodeFocusRef.current = onNodeFocus;
  });


  /**
   * Builds the event payload the contract promises. Only called when a callback actually exists, so the tree walk is not paid on every hover by callers who never listen.
   */
  const eventPayload = useCallback((nodeId) => {

    const record = layout.geometry?.nodes.find((n) => n.id === nodeId);

    if (!record) 
    {
      return null;
    }


    return {
      id: record.id,
      label: record.label,
      data: record.data,
      depth: record.depth,
      x: record.x,
      y: record.y,
      childIds: layout.tree.childrenOf.get(nodeId) ?? [],
      parentId: layout.tree.parentOf.get(nodeId) ?? null,
    };

  }, [layout.geometry, layout.tree]);



  // Tooltip needs the active node's payload and the cursor position. Neither goes in the focus store: the store fans out to every node and edge, and pushing a mousemove-frequency value through it would re-run every subscriber's selector on each pixel of movement. Plain state here reaches only TreeView and the tooltip.
  const [tooltipPayload, setTooltipPayload] = useState(null);



  const [cursorPoint, setCursorPoint] = useState(null);



  const handleHoverIn = useCallback((nodeId) => {


    focusStore.getState().setFocus(nodeId);


    const payload = eventPayload(nodeId);


    setTooltipPayload(payload);

    if (onNodeFocusRef.current) 
    {
      onNodeFocusRef.current(payload);
    }


  }, [focusStore, eventPayload]);


  const handleHoverOut = useCallback(() => {


    focusStore.getState().clearFocus();


    setTooltipPayload(null);

    if (onNodeFocusRef.current) 
    {
      onNodeFocusRef.current(null);
    }



  }, [focusStore]);


  // Only tracked while a tooltip could show; otherwise every mousemove over the canvas would set state for nothing.
  const handleMouseMove = useCallback((event) => {

    if (renderTooltip) 
    {
      setCursorPoint({ x: event.clientX, y: event.clientY });
    }


  }, [renderTooltip]);


  const onNodeClickRef = useRef(onNodeClick);


  const onBackgroundClickRef = useRef(onBackgroundClick);


  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
    onBackgroundClickRef.current = onBackgroundClick;
  });




  // A click pins the focus 
  const handleNodeClick = useCallback((nodeId, event) => {

    focusStore.getState().setPin(nodeId);



    if (onNodeClickRef.current) 
    {
      onNodeClickRef.current(eventPayload(nodeId), event);
    }


  }, [focusStore, eventPayload]);




  // Fires only on clicks that land on the SVG itself — empty canvas.
  const handleSvgClick = useCallback((event) => {

    if (event.target === event.currentTarget) 
    {

      focusStore.getState().clearPin();

      if (onBackgroundClickRef.current) 
      {

        onBackgroundClickRef.current(event);

      }
    }

  }, [focusStore]);




  /**
   * The fit maths as a zoom transform.
   */
  const computeFitTransform = useCallback(() => {



    if (!layout.geometry || width === 0 || height === 0) 
    {
      return zoomIdentity;
    }



    const { bounds } = layout.geometry;



    const usableWidth  = Math.max(1, width  - fitPadding * 2);


    const usableHeight = Math.max(1, height - fitPadding * 2);

    const k = Math.min(
      Math.min(usableWidth / (bounds.width || 1), usableHeight / (bounds.height || 1)),
      1
    );

    const centreX = bounds.minX + bounds.width  / 2;


    const centreY = bounds.minY + bounds.height / 2;



    return zoomIdentity
      .translate(width / 2 - k * centreX, height / 2 - k * centreY)
      .scale(k);

  }, [layout.geometry, width, height, fitPadding]);


  const fitToView = useCallback(() => {
    zoomTo(computeFitTransform());
  }, [zoomTo, computeFitTransform]);




  // Fit once, when the first real measurement, an attached zoom behaviour and a successful layout are all in. Refitting on every resize would fight the user's own panning, so hasFittedRef makes it once per data change.
  const hasFittedRef = useRef(false);



  useEffect(() => {
    hasFittedRef.current = false;                    // new data -> allow one refit
  }, [data]);

  useEffect(() => {


    if (!fitOnMount || hasFittedRef.current) 
    {
      return;
    }



    if (ready && layout.geometry && width > 0 && height > 0) 
    {
      hasFittedRef.current = true;
      fitToView();
    }

  }, [fitOnMount, ready, layout.geometry, width, height, fitToView]);


  const onLayoutErrorRef = useRef(onLayoutError);

  useEffect(() => {
    onLayoutErrorRef.current = onLayoutError;
  });



  useEffect(() => {

    if (layout.error && onLayoutErrorRef.current) 
    {
      onLayoutErrorRef.current(layout.error);
    }

  }, [layout.error]);


  /**
   * FocusClass string -> final class name, merging caller overrides over the defaults. dimOnFocus false downgrades dimmed to idle, which turns the background-push off without touching active styling.
   */
  const classForState = useCallback((focusClass) => {

    const effective = (!dimOnFocus && focusClass === 'dimmed') ? 'idle' : focusClass;

    const key = STATE_KEY[effective];

    return focusStateStyles?.[key] ?? DEFAULT_FOCUS_CLASSES[key];

  }, [focusStateStyles, dimOnFocus]);


  const hasSize = width > 0 && height > 0;


  return (
    <div ref={containerRef} className={`tree-view ${className}`}>

      {layout.error ? (

        <div className="tree-view__error">
          <p className="tree-view__error-title">This data cannot be drawn as a tree.</p>
          <p className="tree-view__error-detail">{layout.error.message}</p>
        </div>

      ) : hasSize ? (

        <>
          <svg
            ref={svgRef}
            className="tree-view__svg"
            width={width}
            height={height}
            role="img"
            aria-label={`Tree diagram, ${layout.geometry.nodes.length} nodes`}
            onMouseMove={handleMouseMove}
            onClick={handleSvgClick}
          >

            {/* The one element the zoom transform touches. Everything inside
                moves as a unit, so the browser composites a single transform
                instead of relaying hundreds of nodes. */}
            <g transform={transform.toString()}>

              <g className="tree-view__edges">
                {layout.edges.map((edge) => (
                  <TreeEdgeShape
                    key={edge.id}
                    edge={edge}
                    store={focusStore}
                    classForState={classForState}
                  />
                ))}
              </g>

              <g className="tree-view__nodes">
                {layout.geometry.nodes.map((node) => (
                  <TreeNodeShape
                    key={node.id}
                    node={node}
                    store={focusStore}
                    classForState={classForState}
                    onHoverIn={handleHoverIn}
                    onHoverOut={handleHoverOut}
                    onClick={handleNodeClick}
                    labelText={truncate(node.label, node.width)}
                  />
                ))}
              </g>

            </g>

          </svg>

          <ZoomControls
            onZoomIn={() => zoomBy(1.25)}
            onZoomOut={() => zoomBy(1 / 1.25)}
            onFit={fitToView}
          />

          {renderTooltip && (
            <NodeTooltip
              payload={tooltipPayload}
              renderTooltip={renderTooltip}
              clientPoint={cursorPoint}
            />
          )}
        </>

      ) : null}

    </div>
  );
}




/**
 * SVG text does not wrap or ellipsize on its own. Rough estimate at 8.2px per character, minus box padding.
 */
function truncate(label, boxWidth) {

  const usable = Math.max(0, boxWidth - 16);
  const maxChars = Math.floor(usable / 8.2);

  if (label.length <= maxChars) 
  {
    return label;
  }

  return label.slice(0, Math.max(1, maxChars - 1)) + '…';
}