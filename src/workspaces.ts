import {
  getPackageInfos,
  createDependencyMap,
  getWorkspaceRoot,
  PackageInfo,
  PackageInfos,
} from "workspace-tools";
import { getWorkspaceManagerAndRoot } from "workspace-tools/lib/workspaces/implementations";

const workspaceCache: Map<string, PackageInfos> = new Map();

export type WorkspaceDependencyTree = Map<string, Set<string>>;

export const getRootWorkspace = (root: string) => {
  return getWorkspaceRoot(root);
};

/**
 * The APIs of WS Tools are not very stable, so just adding a bit of consistency
 * @param root
 * @returns
 */
export const getWorkspaces = (root: string) => {
  let workspaces: PackageInfos;

  if (!workspaceCache.has(root)) {
    workspaces = getPackageInfos(root);
  } else {
    workspaces = workspaceCache.get(root)!;
  }

  return workspaces;
};

export const getWorkspaceTool = (root: string) => {
  return getWorkspaceManagerAndRoot(root)?.manager;
};

/**
 * Might need to occasionally clear the cache
 */
export const clearWorkspaceCache = () => {
  workspaceCache.clear();
};

export const getDependencyTree = (workspaces: PackageInfos) => {
  // For whatever reason, this thing doesn't return workspaces that have no dependencies
  const graph = createDependencyMap(workspaces);

  // Therefore we have to iterate through all of them, and find the ones that have dependencies
  let packageGraph: Map<string, Set<string>> = new Map();
  Object.entries(workspaces).forEach(([, pkg]) => {
    const deps = graph.dependencies.get(pkg.name) || new Set();

    packageGraph.set(pkg.name, deps);
  });

  return packageGraph;
};
