import {
  TreeDataProvider,
  EventEmitter,
  TreeItem,
  TreeItemCollapsibleState,
  Event,
  window,
  workspace,
} from "vscode";
import { DependencyTreeItem } from "./dependency";
import { PackageInfo, getChangedPackages } from "workspace-tools";
import { PackageInfos } from "beachball/lib/types/PackageInfo";
import * as path from "path";
import { checkChangeFiles } from "./beachball";
import {
  getWorkspaceChangedPackages,
  getWorkspaceRoot,
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
    const changes = await this.loadChangedPackages();

    if (!changes.size) {
      return [];
    }

    let children = [];
    for (let [, dependency] of changes.entries()) {
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

  async loadChangedPackages() {
    const mainBranch =
      workspace.getConfiguration("monorepoTools").get<string>("mainBranch") ||
      "origin/main";

    const workspaces = getWorkspaces(this.workspaceRoot);
    const changedPackages = await getWorkspaceChangedPackages(
      this.workspaceRoot,
      mainBranch
    );

    // This is a hack because of a bug in beachball
    for (let [, ws] of Object.entries(workspaces)) {
      ws.combinedOptions = ws.combinedOptions || {};
    }

    const needsChanges = await checkChangeFiles({
      branch: mainBranch,
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
            window.terminals.find((t) => t.name === `Change Files`) ||
            window.createTerminal(`Change Files`);

          terminal.show();
          terminal.sendText(`yarn change`);
        });
    }

    const changedPackagesMap = new Map<string, DependencyTreeItem>();
    for (let change of changedPackages) {
      const pkg = workspaces[change];

      if (!pkg) {
        continue;
      }

      const needsChangeFile = needsChanges.includes(change);

      changedPackagesMap.set(
        pkg?.name as string,
        new DependencyTreeItem(
          {
            ...pkg,
            tool: needsChangeFile ? "error" : "check",
          },
          TreeItemCollapsibleState.None
        )
      );
    }

    return changedPackagesMap;
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

  titleText() {
    if (!this.workspacePkgJson) {
      return "Workspace: Loading...";
    }

    return `${this.workspacePkgJson.name}`;
  }
}
