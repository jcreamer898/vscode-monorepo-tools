import * as vscode from "vscode";
import * as path from "path";
import { MonorepoDependenciesProvider } from "../dependencyProvider";
import { QuickPickItem } from "vscode";
import { MonorepoWorkspace } from "../dependency";

export class ScopedSearchCommand {
  treeProvider: MonorepoDependenciesProvider;

  constructor(treeProvider: MonorepoDependenciesProvider) {
    this.treeProvider = treeProvider;
  }

  async run() {
    const workspacePackages = Array.from(this.treeProvider.items.keys());

    if (!workspacePackages) {
      return;
    }

    const quickPickItems: QuickPickItem[] = workspacePackages.map((key) => {
      const description =
        this.treeProvider.items.get(key)?.workspace?.description;
      return {
        label: key,
        description: description,
      };
    });

    const selectedKey = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: "Select a package to search within",
      canPickMany: false,
    });

    if (!selectedKey) {
      // If the user cancels the selection, just return
      return;
    }

    const selectedPackage = this.treeProvider.items.get(selectedKey.label);
    if (!selectedPackage) {
      // If there is no package data associated with the key, return
      return;
    }

    const treeItems = this.treeProvider.getChildrenRecursively(selectedPackage);

    const directoriesToInclude = treeItems
      .map((treeItem) =>
        path.relative(
          this.treeProvider.workspaceRoot,
          path.dirname(treeItem.workspace.packageJsonPath)
        )
      )
      .join(", ");

    // Trigger the search panel with the filesToInclude field pre-filled
    vscode.commands.executeCommand("workbench.action.findInFiles", {
      filesToInclude: directoriesToInclude,
    });
  }
}
