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
import fs from "fs";

type TreeChangeEvent = DependencyTreeItem | undefined | null | void;

export class ScopePRovider
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

    console.log(element);

    if (element && element.id) {
      const groupPath = path.join(
        this.workspaceRoot,
        ".scoper",
        "groups",
        element.id
      );
      const group = await readJson(groupPath);
      const pkgsOrExprs = group.packages || group.expressions || [];

      return [
        pkgsOrExprs.packages.map((pkg: string) => {
          const item = new TreeItem(pkg, TreeItemCollapsibleState.None);
          item.iconPath = new ThemeIcon("package");
          item.id = group.name;
          item.tooltip = group.contact;
          return item;
        }),
      ];
    }

    // const root = await this.getRootItem();
    // const repoUrl =
    //   typeof root.workspace.repository === "string"
    //     ? root.workspace.repository
    //     : root.workspace.repository?.url;

    // children.push(root);

    const groups = await fs.readdirSync(
      path.join(this.workspaceRoot, ".scoper", "groups"),
      "utf8"
    );
    for (const group of groups) {
      const groupItem = new TreeItem(group.toString().replace(".json", ""));
      groupItem.iconPath = new ThemeIcon("folder");
      groupItem.id = group;
      groupItem.collapsibleState = TreeItemCollapsibleState.Expanded;

      children.push(groupItem);
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
