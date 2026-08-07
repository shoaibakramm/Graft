import { createStore } from 'zustand';
import { useStore } from 'zustand';




/**
 * Focus state for one TreeView instance.
 *
 * Two layers of focus:
 *   focusedId — hover, transient, cleared on mouse leave
 *   pinnedId  — click, sticky, cleared by a background click
 * Hover wins while active; the pin holds after the mouse leaves. This matches the yFiles reference behaviour: hover previews, click locks it in.
 *
 * Why a store instead of useState in TreeView: with focusedId in component state, every hover re-renders every node and every edge, because they all read that state through props. At 500 nodes that is visible hover lag.
 * With a store, each node subscribes to its OWN derived state — "what is my focus class" — and re-renders only when that answer changes.
 *
 * Why createStore (vanilla) rather than the create() hook: create() makes a MODULE-LEVEL singleton, which two TreeView instances on the same screen would share — hovering in the left tree would dim the right one. So
 * TreeView builds one store per instance and passes it down.
 */




/**
 * @typedef {'idle'|'active'|'child-of-active'|'dimmed'} FocusClass
 */




/**
 * @param {Map<string, string[]>} childrenOf - From buildTree, id -> child ids.
 * @returns {import('zustand').StoreApi}
 */
export function createFocusStore(childrenOf) {

  return createStore((set) => ({

    focusedId: null,

    pinnedId: null,

    childrenOf,

    setFocus: (id) => set({ focusedId: id }),

    clearFocus: () => set({ focusedId: null }),

    setPin: (id) => set({ pinnedId: id }),

    clearPin: () => set({ pinnedId: null }),

  }));
}




/**
 * The one selector everything hangs on. Answers "what state is node X in".
 *
 * @param {Object} state - The store's current state.
 * @param {string} nodeId
 * @returns {FocusClass}
 */
export function focusClassOf(state, nodeId) {

  // Hover previews; a click pins. Hover wins while active, the pin holds
  // after the mouse leaves.
  const focusedId = state.focusedId ?? state.pinnedId;

  const { childrenOf } = state;

  if (focusedId === null) 
  {
    return 'idle';
  }

  if (focusedId === nodeId) 
  {
    return 'active';
  }

  if (childrenOf.get(focusedId)?.includes(nodeId)) 
  {
    return 'child-of-active';
  }

  return 'dimmed';
}




/**
 * Subscribe one node to its own focus class.
 *
 * The selector returns a string, so zustand's equality check re-renders this
 * subscriber only when the string changes — the whole point of the store.
 *
 * @param {import('zustand').StoreApi} store
 * @param {string} nodeId
 * @returns {FocusClass}
 */
export function useFocusClass(store, nodeId) {

  return useStore(store, (state) => focusClassOf(state, nodeId));
}




/**
 * Same idea for an edge. An edge is active when its source is the focused (or pinned) node — those are the edges connecting the active node to its children, which the brief says to highlight.
 *
 * @param {import('zustand').StoreApi} store
 * @param {string} sourceId
 * @returns {'idle'|'active'|'dimmed'}
 */
export function useEdgeFocusClass(store, sourceId) {

  return useStore(store, (state) => {

    const focusedId = state.focusedId ?? state.pinnedId;

    if (focusedId === null) 
    {
      return 'idle';
    }

    return focusedId === sourceId ? 'active' : 'dimmed';

  });
}