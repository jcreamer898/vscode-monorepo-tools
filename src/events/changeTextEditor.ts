import * as vscode from "vscode";
import { DependencyTreeItem } from "../dependency";
import { MonorepoDependenciesProvider } from "../dependencyProvider";
import { MonorepoChangedPackagesProvider } from "../changedPackageProvider";
import { MonorepoDetailsProvider } from "../providers/detailsProvider";

export class ChangeTextEditorEvent {
  treeProvider: MonorepoDependenciesProvider;
  treeView: vscode.TreeView<DependencyTreeItem | vscode.TreeItem>;
  changedPackagesProvider: MonorepoChangedPackagesProvider;
  statusBarItem: vscode.StatusBarItem;
  detailsProvider: MonorepoDetailsProvider;

  constructor(
    treeProvider: MonorepoDependenciesProvider,
    treeView: vscode.TreeView<DependencyTreeItem | vscode.TreeItem>,
    statusBarItem: vscode.StatusBarItem,
    changedPackagesProvider: MonorepoChangedPackagesProvider,
    detailsProvider: MonorepoDetailsProvider
  ) {
    this.treeProvider = treeProvider;
    this.treeView = treeView;
    this.statusBarItem = statusBarItem;
    this.changedPackagesProvider = changedPackagesProvider;
    this.detailsProvider = detailsProvider;
  }

  async run() {
    const filename = vscode.window.activeTextEditor?.document.fileName;

    if (!filename) {
      return;
    }

    // TODO: move more data into some sort of global store
    await this.treeProvider.setActiveFile(filename);
    await this.changedPackagesProvider.loadGraphFromFile(filename);

    // this.treeView.title = this.treeProvider.titleText();
    this.statusBarItem.text = this.treeProvider.statusText();

    // TODO: sthis is bad, don't do this, move the workspace state to something else
    this.detailsProvider.workspaceRoot = this.treeProvider.workspaceRoot;
    this.detailsProvider.refresh();
  }
}
