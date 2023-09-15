import * as vscode from "vscode";
import { PackageInfo } from "workspace-tools";
import * as path from "path";

const resourcePath = path.join(__filename, "..", "..", "resources");

const icons: Record<string, string | vscode.ThemeIcon> = {
  yarn: path.join(resourcePath, "yarn.svg"),
  light: path.join(resourcePath, "dependency_light.svg"),
  dark: path.join(resourcePath, "dependency_light.svg"),
  lerna: path.join(resourcePath, "lerna.svg"),
  bolt: new vscode.ThemeIcon("zap"),
  check: new vscode.ThemeIcon("check"),
  error: new vscode.ThemeIcon("error"),
};

export type MonorepoWorkspace = PackageInfo & {
  /**
   * The tool used to manage this workspace
   */
  tool?: keyof typeof icons;
  /**
   * The child dependencies of this workspace
   */
  children?: Set<string>;
};

/**
 * Represents a workspace or dependency in the dependency tree view
 */
export class DependencyTreeItem extends vscode.TreeItem {
  /**
   * Tooltip for onhover of this item
   */
  tooltip?: string | vscode.MarkdownString | undefined;
  /**
   * Description of this item
   */
  description?: string | undefined;
  /**
   * Root or dependency
   */
  contextValue?: "root" | "dependency" | "repository";
  /**
   * Icon for this item
   */
  iconPath?: string | vscode.Uri | vscode.ThemeIcon | undefined;
  /**
   * The workspace this item represents
   */
  workspace: MonorepoWorkspace;
  /**
   * Is this item the root of the tree
   */
  root: boolean;

  constructor(
    workspace: MonorepoWorkspace,
    collapsibleState: vscode.TreeItemCollapsibleState,
    root: boolean = false
  ) {
    super(workspace.name, collapsibleState);

    this.tooltip = `${this.label}`;
    this.description = workspace.version;
    this.workspace = workspace;
    this.contextValue = root ? "root" : "dependency";
    this.iconPath = icons[this.workspace.tool as string] || icons.dark;
    this.root = root;
  }
}
