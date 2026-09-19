import { createRoot, type Root } from "react-dom/client";

export interface GeetorusReactRootHost {
  __geetorusReactRoot?: Root;
}

type CreateRoot = (container: Parameters<typeof createRoot>[0]) => Root;

/**
 * Keep one React root per browser window even if Vite evaluates the entry
 * module more than once during a development reload.
 */
export function getOrCreateGeetorusReactRoot(
  host: object,
  container: Parameters<typeof createRoot>[0],
  create: CreateRoot = createRoot,
): Root {
  const rootHost = host as GeetorusReactRootHost;
  if (rootHost.__geetorusReactRoot) return rootHost.__geetorusReactRoot;

  const root = create(container);
  rootHost.__geetorusReactRoot = root;
  return root;
}
