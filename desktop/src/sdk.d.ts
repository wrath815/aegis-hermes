/**
 * The slice of `@hermes/plugin-sdk` this plugin uses. The real module is
 * injected by Hermes Desktop at load time (see
 * website/docs/developer-guide/desktop-plugin-sdk.md); nothing here is bundled.
 */
declare module "@hermes/plugin-sdk" {
  import type { ReactNode } from "react";

  export interface ReadableAtom<T> { get(): T }
  export function useValue<T>(atom: ReadableAtom<T>): T;

  export interface PluginContribution {
    id: string;
    area: string;
    title?: string;
    order?: number;
    data?: unknown;
    render?: () => ReactNode;
  }

  export interface PluginContext {
    readonly source: string;
    register(c: PluginContribution): () => void;
    registerMany(cs: PluginContribution[]): () => void;
    rest<T>(path: string, opts?: { method?: string; body?: unknown }): Promise<T>;
    onDispose(fn: () => void): void;
  }

  export interface HermesPlugin {
    id: string;
    name?: string;
    defaultEnabled?: boolean;
    register(ctx: PluginContext): void;
  }

  export const host: {
    state: { model: ReadableAtom<string>; gateway: ReadableAtom<string>; busy: ReadableAtom<boolean> };
    navigate(path: string): void;
  };

  export function useTheme(): { themeName: string };

  export const ROUTES_AREA: string;
  export const SIDEBAR_NAV_AREA: string;
  export const THEMES_AREA: string;
  export const PALETTE_AREA: string;
  export const TITLEBAR_AREAS: { left: string; center: string; right: string };
}
