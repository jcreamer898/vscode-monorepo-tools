import {
  getPackageInfos,
  createDependencyMap,
  getWorkspaceRoot as wsGetWorkspaceRoot,
  PackageInfos,
  getChangedPackages,
} from "workspace-tools";
import fs from "fs";
import { getWorkspaceManagerAndRoot } from "workspace-tools/lib/workspaces/implementations";

const workspaceCache: Map<string, PackageInfos> = new Map();

export type WorkspaceDependencyTree = Map<string, Set<string>>;

export const getWorkspaceRoot = (root: string) => {
  return wsGetWorkspaceRoot(root);
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
    workspaceCache.set(root, workspaces);
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
  if (workspaceCache.size !== 0) {
    workspaceCache.clear();
  }
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

export const getWorkspaceChangedPackages = async (
  root: string,
  branch = "main"
) => {
  const rootFiles = fs.readdirSync(root);
  /**
   * Get changed packages here will return the packages that have changed
   * Keep in mind that if you have a file that doesn't match the ignored stuff, it will
   * tell you that the whole repo changed!
   */
  const changes = getChangedPackages(root, branch, [
    ...rootFiles.filter((file) => file !== "package.json"),
    "**/.vscode/**",
    "**/change/**",
  ]);
  return changes;
};
