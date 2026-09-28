/**
 * 给静态结构检查（scripts/dom-check.tsx）一个「Windows 桌面 + Tauri」的环境假设，
 * 否则平台能力判断在 Node 里全部为否，设置页会隐藏桌面独有的几行，断言就失去代表性。
 * 仅用于检查脚本，不参与应用打包。
 */
function defineGlobal(key: string, value: unknown) {
  Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
}

const storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

defineGlobal("window", {
  __TAURI_INTERNALS__: {},
  localStorage: storage,
  setInterval: () => 0,
  clearInterval: () => undefined,
  setTimeout: () => 0,
  clearTimeout: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
});

defineGlobal("localStorage", storage);

defineGlobal("navigator", {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  platform: "Win32",
});
