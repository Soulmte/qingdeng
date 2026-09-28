/**
 * 建立 jsdom 环境，必须在导入 React 之前执行。
 * 仅用于 scripts/interaction-check.tsx。
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  pretendToBeVisual: true,
  url: "http://localhost/",
});

/** Node 里部分全局属性只有 getter，必须用 defineProperty 覆盖 */
function defineGlobal(key: string, value: unknown) {
  Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
}

const record = (target: Record<string, unknown>, key: string, value: unknown) => {
  target[key] = value;
};

// 先把 jsdom 的 DOM 类补齐：Node 内置的（Event 等）必须换成 jsdom 的，
// 否则 jsdom 的节点会以「不是 Event 实例」为由拒绝 dispatchEvent
defineGlobal("window", dom.window);
defineGlobal("document", dom.window.document);
defineGlobal("navigator", dom.window.navigator);
defineGlobal("getComputedStyle", dom.window.getComputedStyle.bind(dom.window));
defineGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
  setTimeout(() => callback(Date.now()), 0) as unknown as number,
);
defineGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
defineGlobal("IS_REACT_ACT_ENVIRONMENT", true);

const JS_DOM_OVERRIDES = [
  "HTMLElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLDivElement",
  "HTMLSpanElement",
  "SVGElement",
  "Element",
  "Node",
  "DocumentFragment",
  "Text",
  "Event",
  "CustomEvent",
  "KeyboardEvent",
  "MouseEvent",
  "FocusEvent",
  "PointerEvent",
] as const;

for (const key of JS_DOM_OVERRIDES) {
  const value = (dom.window as unknown as Record<string, unknown>)[key];
  if (value !== undefined) defineGlobal(key, value);
}

// 其余 Node 尚未提供的浏览器全局，统一补上，避免逐个踩坑
Object.getOwnPropertyNames(dom.window).forEach((key) => {
  if (key in globalThis) return;
  try {
    defineGlobal(key, (dom.window as unknown as Record<string, unknown>)[key]);
  } catch {
    // 只读或不可配置的属性跳过即可
  }
});

const windowRecord = dom.window as unknown as Record<string, unknown>;

/** jsdom 没有 PointerEvent，react-aria 的按钮需要它 */
class FakePointerEvent extends dom.window.MouseEvent {
  pointerId = 1;
  pointerType = "mouse";
  isPrimary = true;
  width = 1;
  height = 1;
  pressure = 0.5;
}

record(windowRecord, "PointerEvent", FakePointerEvent);
defineGlobal("PointerEvent", FakePointerEvent);

/** react-aria 会用它探测 beforeinput 支持情况，jsdom 里也没有 */
class FakeInputEvent extends dom.window.Event {
  data: string | null = null;
  inputType = "insertText";
  isComposing = false;
}

record(windowRecord, "InputEvent", FakeInputEvent);
defineGlobal("InputEvent", FakeInputEvent);

/** HeroUI 的部分组件会用到，测试里给个空实现 */
class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

record(windowRecord, "ResizeObserver", FakeResizeObserver);
defineGlobal("ResizeObserver", FakeResizeObserver);

/** react-aria 会读 CSS.supports / CSS.escape，jsdom 没实现 */
const fakeCss = {
  escape: (value: string) => value,
  supports: () => false,
};

record(windowRecord, "CSS", fakeCss);
defineGlobal("CSS", fakeCss);

record(windowRecord, "matchMedia", (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
}));
