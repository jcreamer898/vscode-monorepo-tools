import {
  TreeDataProvider,
  EventEmitter,
  TreeItem,
  TreeItemCollapsibleState,
  Event,
  workspace,
  env,
  window,
  Uri,
  ThemeIcon,
} from "vscode";
import { DependencyTreeItem } from "../dependency";
import { PackageInfo } from "workspace-tools";
import * as path from "path";
import { readJson } from "../readJson";
import {
  getWorkspaceRoot,
  getWorkspaceTool,
  getWorkspaces,
} from "../workspaces";

type TreeChangeEvent = DependencyTreeItem | undefined | null | void;

export class MonorepoDetailsProvider
  implements TreeDataProvider<DependencyTreeItem | TreeItem>
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
  refresh(): void {
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
  ): Promise<(DependencyTreeItem | TreeItem)[]> {
    const children = [];

    const root = await this.getRootItem();
    const repoUrl =
      typeof root.workspace.repository === "string"
        ? root.workspace.repository
        : root.workspace.repository?.url;

    children.push(root);

    const repoItem = new TreeItem("Repository", TreeItemCollapsibleState.None);

    repoItem.id = "repository";
    repoItem.iconPath = new ThemeIcon("package");
    repoItem.label = "Repository";
    repoItem.description = repoUrl;
    repoItem.contextValue = "repository";
    repoItem.command = {
      command: "vscode-monorepo-tools.goToUrl",
      title: "Open Repository",
      arguments: [repoUrl],
    };

    children.push(repoItem);

    if (root.workspace.bugs?.url) {
      const help = new TreeItem("Get Help", TreeItemCollapsibleState.None);
      help.iconPath = new ThemeIcon("question");
      help.command = {
        command: "vscode-monorepo-tools.goToUrl",
        title: "Open Help",
        arguments: [root.workspace.bugs?.url],
      };
      help.description = root.workspace.bugs?.url;
      children.push(help);
    }

    if (root.workspace.homepage) {
      const homepage = new TreeItem("Homepage", TreeItemCollapsibleState.None);
      homepage.iconPath = new ThemeIcon("home");
      homepage.command = {
        command: "vscode-monorepo-tools.goToUrl",
        title: "Open Help",
        arguments: [root.workspace.homepage],
      };
      homepage.description = root.workspace.homepage;
      children.push(homepage);
    }

    return children;
  }

  async getRootItem() {
    const root = getWorkspaceRoot(this.workspaceRoot)!;
    const tool =
      workspace
        .getConfiguration("monorepoTools")
        .get<string>("workspaceToolOverride") || getWorkspaceTool(root);
    const workspaces = getWorkspaces(this.workspaceRoot);
    const pkg = await readJson(path.join(root, "package.json"));

    const rootItem = new DependencyTreeItem(
      {
        ...pkg,
        packageJsonPath: path.join(root, "package.json"),
        tool,
        children: [],
      },
      TreeItemCollapsibleState.None,
      true
    );

    rootItem.description = `${Object.keys(workspaces).length} packages`;
    rootItem.tooltip = pkg.description;

    return rootItem;
  }
}
