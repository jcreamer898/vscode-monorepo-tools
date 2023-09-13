import {
  TreeDataProvider,
  EventEmitter,
  TreeItem,
  TreeItemCollapsibleState,
  Event,
  window,
} from "vscode";
import { findRoot } from "@manypkg/find-root";
import { DependencyTreeItem } from "./dependency";
import { PackageInfo } from "workspace-tools";
import { getWorkspaceManagerAndRoot } from "workspace-tools/lib/workspaces/implementations";
import pkgUp from "pkg-up";
import * as path from "path";
import { readJson } from "./readJson";
import { installScripts, packageRunScripts, rootRunScripts } from "./scripts";
import {
  WorkspaceDependencyTree,
  getDependencyTree,
  getRootWorkspace,
  getWorkspaceTool,
  getWorkspaces,
} from "./workspaces";

type TreeChangeEvent = DependencyTreeItem | undefined | null | void;

export class MonorepoDependenciesProvider
  implements TreeDataProvider<DependencyTreeItem>
{
  private _onDidChangeTreeData: EventEmitter<TreeChangeEvent> =
    new EventEmitter<TreeChangeEvent>();
  readonly onDidChangeTreeData: Event<TreeChangeEvent> =
    this._onDidChangeTreeData.event;

  workspaceRoot: string;
  workspacePkgJson: PackageInfo;
  workspaceTool!: string;
  rootPkg!: DependencyTreeItem;

  /**
   * Dependency graph for a given workspace root
   */
  graph: Map<string, Set<string>> = new Map<string, Set<string>>();

  /**
   * Map of packages in workspaceRoot
   */
  items: Map<string, DependencyTreeItem> = new Map();

  activePackage!: DependencyTreeItem;

  constructor(workspaceRoot: string, pkgJson: any) {
    this.workspaceRoot = workspaceRoot;
    this.workspacePkgJson = pkgJson;
  }

  /**
   * Forces the tree view to refresh
   */
  private refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get an inviditual tree item
   * @param element
   * @returns
   */
  getTreeItem(element: DependencyTreeItem): TreeItem {
    return element;
  }

  /**
   * Get a list of tree items, this fires for the top level and each element
   * @param element
   * @returns
   */
  async getChildren(
    element: DependencyTreeItem
  ): Promise<DependencyTreeItem[]> {
    let workspaces = getWorkspaces(this.workspaceRoot);
    let tree = getDependencyTree(workspaces);
    let tool = getWorkspaceTool(this.workspaceRoot);

    let items = [];
    for (const [name, workspace] of Object.entries(workspaces)) {
      let children = tree.get(name) || new Set();
      let workspaceInfo = {
        ...workspace,
        tool,
        children,
      };

      items.push(
        new DependencyTreeItem(
          workspaceInfo,
          TreeItemCollapsibleState.Collapsed
        )
      );
    }

    // Return the top level tree
    if (!element && tree.size) {
      const root = this.getRoot();
      return root ? [root] : [];
    }

    if (element.root) {
      const children = [];

      return Array.from(this.items.values());
    }

    if (element.workspace.children) {
      let keys = Array.from(element.workspace.children.keys());
      return keys.map((name: string) => {
        const dep = this.items.get(name) as DependencyTreeItem;

        if (keys.includes(element.workspace.name)) {
          window.showInformationMessage(
            `Circular dependency: ${element.workspace.name} -> ${dep.workspace.name}`
          );
        }

        return dep;
      });
    }

    return [];
  }

  getRoot() {
    let workspaceRoot = getRootWorkspace(this.workspaceRoot);
    return new DependencyTreeItem(
      {
        ...this.workspacePkgJson,
        packageJsonPath: this.workspaceRoot,
        tool: this.workspaceTool,
      },
      TreeItemCollapsibleState.Expanded,
      true
    );
  }

  getParent(element: DependencyTreeItem) {
    if (!element) {
      return this.getRoot();
    }

    return null;
  }

  async getFirst() {
    await this.loadDependencyTree();
    const [, pkg] = this.items.entries().next().value;
    return pkg;
  }

  // /**
  //  * Load a cached graph or create a new one
  //  * @param force Forces the graph to refresh and not use cache
  //  * @returns
  //  */
  // async loadDependencyTree(force = false): Promise<WorkspaceDependencyTree> {
  //   if (!force && this.graph.size > 0) {
  //     return this.graph;
  //   }

  //   if (!this.workspacePkgJson) {
  //     return new Map<string, Set<string>>();
  //   }

  //   // TODO:  maybe get rid of the `this.graph` property
  //   this.graph = graph;

  //   return graph;
  // }

  async refreshGraph() {
    await this.loadDependencyTree(true);
    this.refresh();
  }

  /**
   * Load a new workspace root from which to establish a graph
   * @param root
   * @param pkgJson
   */
  async loadGraphFromFile(filename: string) {
    try {
      let cwd = path.dirname(filename);

      const packageForFilename = (await pkgUp({ cwd })) as string;
      const rootPackageDir = await findRoot(cwd);

      this.workspaceRoot = rootPackageDir;
      this.workspacePkgJson = readJson(
        path.join(rootPackageDir, "package.json")
      );

      this.clearGraph();
      await this.loadDependencyTree();

      this.rootPkg = new DependencyTreeItem(
        {
          ...this.workspacePkgJson,
          packageJsonPath: this.workspaceRoot,
          tool: this.workspaceTool,
        },
        TreeItemCollapsibleState.Expanded,
        true
      );

      const pkgName = readJson(packageForFilename).name;
      this.activePackage = this.items.get(pkgName) as DependencyTreeItem;
      this.refresh();
    } catch (e) {
      console.error(`Problem loading graph: ${e}`);
    }
  }

  /**
   * Resets the current graph
   */
  clearGraph() {
    this.graph = new Map<string, Set<string>>();
    this.items = new Map<string, DependencyTreeItem>();
  }

  statusText() {
    return this.workspacePkgJson
      ? `Workspace: ${this.workspacePkgJson.name}, ${this.items.size} packages`
      : "Workspace: Loading...";
  }

  titleText() {
    if (!this.workspacePkgJson) {
      return "Workspace: Loading...";
    }

    return `${this.workspacePkgJson.name}`;
  }
}
