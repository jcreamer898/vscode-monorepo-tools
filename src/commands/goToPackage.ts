import { DependencyTreeItem } from "../dependency";
import { readJson } from "../readJson";
import * as vscode from "vscode";
import * as path from "path";
import { MonorepoDependenciesProvider } from "../dependencyProvider";
import { scriptRunner } from "../scripts";

export class GoToPackageCommand {
  treeProvider: MonorepoDependenciesProvider;

  constructor(treeProvider: MonorepoDependenciesProvider) {
    this.treeProvider = treeProvider;
  }

  async run() {
    const deps = Array.from(this.treeProvider.items.keys());

    if (!deps) {
      return;
    }

    const selected = await vscode.window.showQuickPick([
      ...deps.map((key: string) => ({
        label: key,
        description: key,
      })),
    ]);

    if (!selected) {
      return;
    }

    const item = this.treeProvider.items.get(selected.label);

    if (!item) {
      return;
    }

    console.log(item.workspace.packageJsonPath);
    const filePath = path.join(item.workspace.packageJsonPath);
    const uri = vscode.Uri.file(filePath);

    vscode.workspace.openTextDocument(uri).then((doc) => {
      vscode.window.showTextDocument(doc);
    });
  }
}
