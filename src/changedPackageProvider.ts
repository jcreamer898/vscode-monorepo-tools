import {
  TreeDataProvider,
  EventEmitter,
  TreeItem,
  TreeItemCollapsibleState,
  Event,
  window,
} from "vscode";
import { DependencyTreeItem } from "./dependency";
import { PackageInfo, getChangedPackages } from "workspace-tools";
import { PackageInfos } from "beachball/lib/types/PackageInfo";
import * as path from "path";
import { checkChangeFiles } from "./beachball";
import {
  getWorkspaceRoot,
  getWorkspaceTool,
  getWorkspaces,
} from "./workspaces";

type TreeChangeEvent = DependencyTreeItem | undefined | null | void;

export class MonorepoChangedPackagesProvider
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
  graph: Map<string, string[]> = new Map<string, string[]>();

  /**
   * Map of packages in workspaceRoot
   */
  packages: Map<string, DependencyTreeItem> = new Map();

  packageInfos!: PackageInfos;

  changedPackages: Map<string, DependencyTreeItem> = new Map();

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
    await this.loadChangedPackages();
    const changes = this.changedPackages;

    if (!changes.size) {
      return [];
    }

    let children = [];
    for (let [name, dependency] of changes.entries()) {
      children.push(dependency);
    }
    return children;
  }

  getRoot() {
    return (
      this.rootPkg ||
      new DependencyTreeItem(
        {
          ...this.workspacePkgJson,
          path: this.workspaceRoot,
          tool: "unknown",
        },
        TreeItemCollapsibleState.Expanded,
        true
      )
    );
  }

  getParent(element: DependencyTreeItem) {
    if (!element) {
      return this.getRoot();
    }

    return null;
  }

  async getFirst() {
    await this.loadChangedPackages();
    const [, pkg] = this.packages.entries().next().value;
    return pkg;
  }

  async loadChangedPackages() {
    const tool = getWorkspaceTool(this.workspaceRoot);
    const workspaces = getWorkspaces(this.workspaceRoot);

    // This is a hack because of a bug in beachball
    for (let [, ws] of Object.entries(workspaces)) {
      ws.combinedOptions = ws.combinedOptions || {};
    }

    const needsChanges = await checkChangeFiles({
      branch: "main",
      workingDirectory: this.workspaceRoot,
      // TODO: align the beachball and workspace-tools types
      packageInfos: workspaces as PackageInfos,
    });

    if (needsChanges.length) {
      window
        .showWarningMessage(
          `Changes needed in the following packages:`,
          ...needsChanges
        )
        .then((...args) => {
          if (!args.some(Boolean)) {
            return;
          }

          const terminal =
            window.terminals.find((t) => t.name === `Beachball`) ||
            window.createTerminal(`Beachball`);

          terminal.show();
          terminal.sendText(`yarn beachball change`);
        });
    }

    for (let change of needsChanges) {
      const pkg = workspaces[change];

      if (!pkg) {
        continue;
      }

      this.changedPackages.set(
        pkg?.name as string,
        new DependencyTreeItem(
          {
            ...pkg,
            tool,
          },
          TreeItemCollapsibleState.None
        )
      );
    }

    return this.changedPackages;
  }

  async refreshGraph() {
    await this.loadChangedPackages();
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
      const rootPackageDir = await getWorkspaceRoot(cwd)!;

      this.workspaceRoot = rootPackageDir;

      this.refresh();
    } catch (e) {
      console.error(`Problem loading graph: ${e}`);
    }
  }

  statusText() {
    return this.workspacePkgJson
      ? `Workspace: ${this.workspacePkgJson.name}, ${this.packages.size} packages`
      : "Workspace: Loading...";
  }

  titleText() {
    if (!this.workspacePkgJson) {
      return "Workspace: Loading...";
    }

    return `${this.workspacePkgJson.name}`;
  }
}
