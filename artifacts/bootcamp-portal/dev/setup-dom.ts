/**
 * DOM environment setup for Node.js component tests.
 *
 * Loaded via `node --import ./dev/setup-dom.ts` BEFORE any test file, so all
 * DOM globals are in place when React and @testing-library/react are imported.
 */
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/" });
const g = globalThis as Record<string, unknown>;

/** Assign a global, falling back to Object.defineProperty when the property
 *  is non-writable (e.g. `navigator` on Node's globalThis). */
function setGlobal(name: string, value: unknown): void {
  try {
    g[name] = value;
  } catch {
    Object.defineProperty(globalThis, name, {
      value,
      writable: true,
      configurable: true,
    });
  }
}

setGlobal("window",   win);
setGlobal("document", win.document);
setGlobal("navigator", win.navigator);
setGlobal("location", win.location);
setGlobal("history",  win.history);

setGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
  win.requestAnimationFrame(cb));
setGlobal("cancelAnimationFrame", (id: number) =>
  win.cancelAnimationFrame(id));

setGlobal("HTMLElement",      win.HTMLElement);
setGlobal("Element",          win.Element);
setGlobal("Node",             win.Node);
setGlobal("NodeList",         win.NodeList);
setGlobal("Text",             win.Text);
setGlobal("Comment",          win.Comment);
setGlobal("DocumentFragment", win.DocumentFragment);
setGlobal("Event",            win.Event);
setGlobal("CustomEvent",      win.CustomEvent);
setGlobal("MouseEvent",       win.MouseEvent);
setGlobal("PointerEvent",     win.PointerEvent);
setGlobal("KeyboardEvent",    win.KeyboardEvent);
setGlobal("FocusEvent",       win.FocusEvent);
setGlobal("InputEvent",       win.InputEvent);
setGlobal("MutationObserver", win.MutationObserver);
setGlobal("getComputedStyle", (el: Element, pseudo?: string | null) =>
  win.getComputedStyle(
    el as unknown as Parameters<typeof win.getComputedStyle>[0],
    pseudo,
  ));
