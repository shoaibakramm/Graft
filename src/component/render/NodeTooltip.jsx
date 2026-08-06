import {
  useFloating,
  useClientPoint,
  useInteractions,
  offset,
  flip,
  shift,
  FloatingPortal,
} from '@floating-ui/react';




/**
 * HTML tooltip tracking the cursor over the active node.
 *
 * Floating UI does the part that is genuinely hard to hand-roll: keeping the
 * tooltip inside the viewport. offset() lifts it off the cursor, flip() moves
 * it below when the node is near the top edge, shift() slides it sideways at
 * the left and right edges.
 *
 * The tooltip is HTML in a portal, not SVG — the brief asks for HTML tooltips,
 * and a portal to <body> means no SVG transform or overflow rule can clip it.
 *
 * Content comes entirely from renderTooltip(payload); this component knows
 * nothing about what the rows mean.
 */
export default function NodeTooltip({ payload, renderTooltip, clientPoint }) {


  const open = payload !== null;


  const { refs, floatingStyles, context } = useFloating({
    open,
    placement: 'top',
    middleware: [
      offset(14),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
    ],
  });


  // Anchors the tooltip to cursor coordinates instead of a reference element.
  // The coordinates arrive as props from TreeView's mousemove capture, so the
  // tooltip follows the pointer while it stays inside the active node.
  useClientPoint(context, {
    enabled: open,
    x: clientPoint?.x ?? 0,
    y: clientPoint?.y ?? 0,
  });

  useInteractions([]);


  if (!open) 
  {
    return null;
  }


  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        className="tree-view__tooltip"
        style={floatingStyles}
        role="tooltip"
      >
        {renderTooltip(payload)}
      </div>
    </FloatingPortal>
  );
}