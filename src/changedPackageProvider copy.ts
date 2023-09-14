import {
  TreeDataProvider,
  EventEmitter,
  TreeItem,
  TreeItemCollapsibleState,
  Event,
  window,
} from "vscode";
import { getPackages, Package } from "@manypkg/get-packages";
import { findRoot } from "@manypkg/find-root";
import { DependencyTreeItem } from "./dependency";
import {
  PackageInfo,
  getChangedPackages,
  getPackageInfos,
} from "workspace-tools";
import { PackageInfos } from "beachball/lib/types/PackageInfo";
import { getWorkspaceManagerAndRoot } from "workspace-tools/lib/workspaces/implementations";
// import { getDependentsGraph } from '@changesets/get-dependents-graph';
import { getChangedPackagesSinceRef } from "@changesets/git";
import pkgUp from "pkg-up";
import * as path from "path";
import * as fs from "fs";
import { readJson } from "./readJson";
import { installScripts, packageRunScripts, rootRunScripts } from "./scripts";
import { checkChangeFiles } from "./beachball";

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
    await this.loadGraph();
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
    await this.loadGraph();
    const [, pkg] = this.packages.entries().next().value;
    return pkg;
  }

  async loadGraph(force = false) {
    const changes = getChangedPackages(this.workspaceRoot, "main");
    const tool = getWorkspaceManagerAndRoot(this.workspaceRoot)?.manager;
    const workspaces = getPackageInfos(this.workspaceRoot);

    // This is a hack because of a bug in beachball
    for (let [, ws] of Object.entries(workspaces)) {
      ws.combinedOptions = ws.combinedOptions || {};
    }

    this.packageInfos = workspaces as PackageInfos;
    this.packages = new Map();

    for (let [, workspace] of Object.entries(workspaces)) {
      this.packages.set(
        workspace.name,
        new DependencyTreeItem(
          {
            ...workspace,
            tool,
            children: new Set(),
          },
          TreeItemCollapsibleState.Collapsed
        )
      );
    }

    for (let change of changes) {
      const pkg = this.packages.get(change);

      if (!pkg) {
        continue;
      }

      this.changedPackages.set(pkg?.workspace.name as string, pkg);
    }

    return this.changedPackages;
  }

  async refreshGraph() {
    await this.loadGraph(true);
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
      await this.loadGraph();

      this.rootPkg = new DependencyTreeItem(
        {
          ...this.workspacePkgJson,
          dir: this.workspaceRoot,
          tool: this.workspaceTool,
        },
        TreeItemCollapsibleState.Expanded,
        true
      );

      const pkgName = readJson(packageForFilename).name;
      this.activePackage = this.packages.get(pkgName) as DependencyTreeItem;

      const needsChanges = await checkChangeFiles({
        branch: "main",
        workingDirectory: rootPackageDir,
        packageInfos: this.packageInfos,
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

      this.refresh();
    } catch (e) {
      console.error(`Problem loading graph: ${e}`);
    }
  }

  /**
   * Resets the current graph
   */
  clearGraph() {
    this.graph = new Map<string, string[]>();
    this.packages = new Map<string, DependencyTreeItem>();
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
