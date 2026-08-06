import { useCallback, useEffect, useRef, useState } from 'react';

import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';




/**
 * Wires d3-zoom to an SVG element and hands the current transform back as
 * React state.
 *
 * Division of labour: d3 owns the gesture handling on the real DOM node —
 * wheel, drag, pinch — and React owns rendering. The transform d3 emits is
 * mirrored into state, and the caller applies it to ONE wrapping <g>.
 *
 * svgRef is a CALLBACK ref, not a ref object. The SVG mounts late — only after
 * the container reports a size — and a plain ref object would leave the mount
 * effect running once against null and never again. The callback fires at the
 * moment the element exists, which re-runs the attach effect.
 *
 * @param {Object} options
 * @param {[number, number]} [options.scaleExtent=[0.1, 4]]
 * @param {function({k:number,x:number,y:number}): void} [options.onZoom]
 * @returns {{
 *   svgRef: function(SVGSVGElement|null): void,
 *   ready: boolean,
 *   transform: {k: number, x: number, y: number},
 *   zoomBy: function(number): void,
 *   zoomTo: function(Object): void,
 *   reset: function(): void,
 * }}
 */
export function useZoom({ scaleExtent = [0.1, 4], onZoom } = {}) {


  const [svgElement, setSvgElement] = useState(null);

  const svgRef = useCallback((node) => {
    setSvgElement(node);
  }, []);


  const behaviourRef = useRef(null);

  const [transform, setTransform] = useState(zoomIdentity);

  // True only while a behaviour is attached to a live element. Callers gate
  // their initial fit on this, otherwise the fit can fire into the void during
  // the one render where the SVG exists but the effect has not run yet.
  const [ready, setReady] = useState(false);


  const onZoomRef = useRef(onZoom);

  useEffect(() => {
    onZoomRef.current = onZoom;
  });


  useEffect(() => {

    if (!svgElement) 
    {
      setReady(false);
      return;
    }


    const behaviour = zoom()
      .scaleExtent(scaleExtent)
      // A click that wobbles a few px is still a click, not a pan. Without
      // this, node clicks on a normal mouse frequently register as drags and
      // the click handlers in step 10 never fire.
      .clickDistance(4)
      .on('zoom', (event) => {

        setTransform(event.transform);

        if (onZoomRef.current) 
        {
          onZoomRef.current({
            k: event.transform.k,
            x: event.transform.x,
            y: event.transform.y,
          });
        }

      });


    behaviourRef.current = behaviour;

    const selection = select(svgElement);

    selection.call(behaviour);

    setReady(true);


    return () => {
      selection.on('.zoom', null);                   // removes every d3 listener
      behaviourRef.current = null;
      setReady(false);
    };

  }, [svgElement, scaleExtent[0], scaleExtent[1]]);  // eslint-disable-line react-hooks/exhaustive-deps


  /**
   * Multiply the current scale — 1.2 to zoom in a notch, 1/1.2 out.
   * Goes through the behaviour so its internal state stays in sync; setting
   * the transform attribute directly would make the next wheel event jump.
   */
  const zoomBy = useCallback((factor) => {

    if (svgElement && behaviourRef.current) 
    {
      behaviourRef.current.scaleBy(select(svgElement), factor);
    }

  }, [svgElement]);


  /** Jump to an absolute transform, e.g. the fit-to-view from TreeView. */
  const zoomTo = useCallback((targetTransform) => {

    if (svgElement && behaviourRef.current) 
    {
      behaviourRef.current.transform(select(svgElement), targetTransform);
    }

  }, [svgElement]);


  const reset = useCallback(() => zoomTo(zoomIdentity), [zoomTo]);


  return { svgRef, ready, transform, zoomBy, zoomTo, reset };
}