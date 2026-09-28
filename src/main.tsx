import { applyThemeClass, readStoredTheme, resolveTheme } from "@/lib/theme";
import { applyLayoutClass } from "@/lib/platform";

// 主题与布局标记都要在第一帧之前挂好，否则会闪一下亮色或桌面侧边栏
applyThemeClass(resolveTheme(readStoredTheme()));
applyLayoutClass();

import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
