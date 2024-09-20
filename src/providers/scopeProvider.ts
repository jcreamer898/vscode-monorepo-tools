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

export class ScoperPovider
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

    if (element && element.id) {
      const groupPath = path.join(
        this.workspaceRoot,
        ".scoper",
        "groups",
        `${element.id}.json`
      );
      const group = await readJson(groupPath);

      // Hurray for nested ternaries...
      const pkgsOrExprs = group.packages.length
        ? group.packages
        : group.expressions.length
        ? group.expressions
        : [];

      const addGroupItem = new TreeItem(
        "Add Group",
        TreeItemCollapsibleState.None
      );
      const description = pkgsOrExprs.join("\n");
      addGroupItem.iconPath = new ThemeIcon("package");
      addGroupItem.tooltip = description;
      addGroupItem.command = {
        command: "vscode-monorepo-tools.scoper.addGroup",
        title: "Add Group",
        arguments: [element.id],
      };

      const editGroup = new TreeItem(
        "Edit Group",
        TreeItemCollapsibleState.None
      );
      editGroup.iconPath = new ThemeIcon("edit");
      editGroup.tooltip = groupPath;
      editGroup.description = groupPath;
      editGroup.command = {
        command: "vscode-monorepo-tools.openFile",
        title: "Add Group",
        arguments: [groupPath],
      };

      const contact = new TreeItem(
        group.contact,
        TreeItemCollapsibleState.None
      );
      contact.iconPath = new ThemeIcon("mail");
      contact.command = {
        command: "vscode-monorepo-tools.goToUrl",
        title: "Contact",
        arguments: [`mailto:${group.contact}`],
      };

      return [contact, addGroupItem, editGroup];
    }

    const groups = await fs.readdirSync(
      path.join(this.workspaceRoot, ".scoper", "groups"),
      "utf8"
    );
    for (const group of groups) {
      const id = group.toString().replace(".json", "");
      const groupItem = new TreeItem(id);
      groupItem.iconPath = new ThemeIcon("folder");
      groupItem.id = id;
      groupItem.collapsibleState = TreeItemCollapsibleState.Collapsed;
      groupItem.command = {
        command: "vscode-monorepo-tools.scoper.openGroup",
        title: "Open Group",
        arguments: [id],
      };

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
