/**
 * Automatic-runtime JSX shim. The build aliases `react/jsx-runtime` here so
 * compiled JSX calls the host dashboard's React (see sdk.ts), never a bundled
 * copy. `children` travel inside `props`, which createElement accepts as-is.
 */
import React from "./sdk";

type Props = Record<string, unknown> | null;

export const Fragment = React.Fragment;
export function jsx(type: Parameters<typeof React.createElement>[0], props: Props, key?: string) {
  return React.createElement(type, key === undefined ? props : { ...props, key });
}
export const jsxs = jsx;
