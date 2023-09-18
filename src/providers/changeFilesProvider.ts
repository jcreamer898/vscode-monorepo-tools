import {
  TreeDataProvider,
  EventEmitter,
  TreeItem,
  Event,
  ThemeIcon,
} from "vscode";
import { PackageInfo } from "workspace-tools";
import * as path from "path";
import { getWorkspaces } from "../workspaces";
import { getChangeFiles } from "../beachball";
import { PackageInfos } from "beachball/lib/types/PackageInfo";

type TreeChangeEvent = TreeItem | undefined | null | void;

export class ChangeFilesProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: EventEmitter<TreeChangeEvent> =
    new EventEmitter<TreeChangeEvent>();
  readonly onDidChangeTreeData: Event<TreeChangeEvent> =
    this._onDidChangeTreeData.event;

  workspaceRoot: string;
  workspacePkgJson: PackageInfo;

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
  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  /**
   * Get a list of tree items, this fires for the top level and each element
   * @param element
   * @returns
   */
  async getChildren(element: TreeItem): Promise<TreeItem[]> {
    const children = [];

    const packageInfos = (await getWorkspaces(
      this.workspaceRoot
    )) as PackageInfos;

    const changeFiles = await getChangeFiles({
      workingDirectory: this.workspaceRoot,
      branch: "origin/main",
      packageInfos,
    });

    for (const change of changeFiles) {
      const changeItem = new TreeItem(
        `${change.change.packageName} - ${change.change.type}`
      );
      changeItem.iconPath = new ThemeIcon("git-commit");
      changeItem.command = {
        title: "Open Change File",
        command: "vscode-monorepo-tools.openFile",
        arguments: [path.join(this.workspaceRoot, "change", change.changeFile)],
      };

      children.push(changeItem);
    }

    return children;
  }

  async getRootItem() {
    let rootItem = {};

    return rootItem;
  }
}
