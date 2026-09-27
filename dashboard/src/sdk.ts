/**
 * Host bridge. The dashboard hands plugins React and its API client on
 * `window.__HERMES_PLUGIN_SDK__`; bundling a second React would break hooks,
 * so the build aliases every `react` import in this plugin to this module.
 * Types still come from @types/react, so components are checked normally.
 */
import type * as ReactTypes from "react";

interface HermesPluginSDK {
  React: typeof ReactTypes;
  // The host's API client; typed at each call site (see MissionControl.tsx).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: Record<string, (...args: any[]) => Promise<any>>;
  fetchJSON: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
}

const SDK = (window as unknown as { __HERMES_PLUGIN_SDK__?: HermesPluginSDK }).__HERMES_PLUGIN_SDK__;
if (!SDK) throw new Error("[aegis] Hermes plugin SDK missing — load this bundle from the dashboard.");

export const api = SDK.api;
export const fetchJSON = SDK.fetchJSON;

/** Where this plugin's static files are served (`/dashboard-plugins/aegis/`).
 *  Derived from the executing <script> so a dashboard mounted under a base
 *  path still resolves the images. Must be read at module evaluation. */
export const ASSET_BASE: string = (() => {
  const src = (document.currentScript as HTMLScriptElement | null)?.src ?? "";
  const cut = src.lastIndexOf("/dist/");
  return cut >= 0 ? `${src.slice(0, cut)}/dist/assets/` : "/dashboard-plugins/aegis/dist/assets/";
})();

const React = SDK.React;
export default React;
export const {
  Fragment, createElement, useState, useEffect, useMemo, useRef, useCallback, useContext, createContext,
} = React;
