import { DependencyTreeItem } from "../dependency";
import { readJson } from "../readJson";
import * as vscode from "vscode";
import * as path from "path";
import { MonorepoDependenciesProvider } from "../dependencyProvider";
import { scriptRunner } from "../scripts";

export class AddDependencyCommand {
  treeProvider: MonorepoDependenciesProvider;

  constructor(treeProvider: MonorepoDependenciesProvider) {
    this.treeProvider = treeProvider;
  }

  async run(node: DependencyTreeItem) {
    const deps = Array.from(this.treeProvider.graph.keys());

    if (!deps) {
      return;
    }

    const selected = await vscode.window.showQuickPick(
      [
        ...deps.map((key: string) => ({
          label: key,
          description: key,
        })),
      ],
      {
        canPickMany: true,
      }
    );

    if (!selected) {
      return;
    }

    const terminal =
      vscode.window.terminals.find((t) => t.name === `Run Script`) ||
      vscode.window.createTerminal(`Run Script`);
    terminal.show();
    terminal.sendText(`cd ${this.treeProvider.workspaceRoot}`);

    for (let item of selected) {
      const cmd = scriptRunner(
        this.treeProvider.workspaceTool,
        node,
        "add",
        item.label
      );

      if (!cmd) {
        return;
      }

      terminal.sendText(cmd);
    }

    this.treeProvider.refreshGraph();
  }
}
