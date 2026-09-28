/**
 * 仅供 scripts/dom-check.tsx 与 scripts/interaction-check.tsx 在 Node 里替换 Tauri 运行时依赖，
 * 不参与应用打包。
 * 写操作会被记进 `executed`，便于断言「某次交互真的落库了」。
 */
export const executed: [string, unknown[] | undefined][] = [];

const execute = async (sql: string, params?: unknown[]) => {
  executed.push([sql, params]);
};

const noop = async () => undefined;

export default {
  load: async () => ({ execute, select: async () => [] }),
  execute,
  select: async () => [],
};

export const invoke = noop;

// 动态导入的插件也会被 esbuild 静态解析，@tauri-apps/api/core 的导出得补齐
export class Resource {
  constructor(readonly rid: number) {}
  async close() {}
}

export class Channel<T = unknown> {
  readonly id = 0;
  onmessage?: (message: T) => void;
  async send() {}
}

// @tauri-apps/api/core 里被其它插件用到的导出
export const addPluginListener = async () => ({ unregister: async () => undefined });

export const getCurrentWindow = () => ({
  setFullscreen: noop,
  setAlwaysOnTop: noop,
  isFullscreen: async () => false,
});

// @tauri-apps/plugin-notification 的导出
export const isPermissionGranted = async () => false;
export const requestPermission = async () => "denied";
export const sendNotification = () => undefined;
