// search.action.openEditor;

import { DependencyTreeItem } from "../dependency";
import { readJson } from "../readJson";
import * as vscode from "vscode";
import * as path from "path";
import { MonorepoDependenciesProvider } from "../dependencyProvider";
import { scriptRunner } from "../scripts";

export class SearchInPackageCommand {
  treeProvider: MonorepoDependenciesProvider;

  constructor(treeProvider: MonorepoDependenciesProvider) {
    this.treeProvider = treeProvider;
  }

  async run(node: DependencyTreeItem) {
    const filePath = path.join(node.workspace.dir);
    vscode.commands.executeCommand("workbench.action.findInFiles", {
      query: "",
      filesToInclude: filePath,
    });
  }
}
