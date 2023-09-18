import { DependencyTreeItem } from "../dependency";
import { readJson } from "../readJson";
import * as vscode from "vscode";
import * as path from "path";
import { MonorepoDependenciesProvider } from "../dependencyProvider";
import { executeTerminalScript, scriptRunner } from "../scripts";

export class RunScriptCommand {
  treeProvider: MonorepoDependenciesProvider;

  constructor(treeProvider: MonorepoDependenciesProvider) {
    this.treeProvider = treeProvider;
  }

  async run(node?: DependencyTreeItem) {
    let filePath;

    if (!node) {
      filePath = path.join(this.treeProvider.workspaceRoot, "package.json");
      node = this.treeProvider.rootPkg;
    }

    filePath = path.join(node.workspace.packageJsonPath);
    const json = readJson(filePath);
    const scripts = json.scripts || {};
    const scriptNames = Object.keys(scripts);

    const selected = await vscode.window.showQuickPick([
      {
        label: "Custom",
        description: "Run a custom script",
      },
      ...scriptNames.map((key: string) => ({
        label: key,
        description: scripts[key],
      })),
    ]);

    if (!selected) {
      return;
    }

    let script = selected.label;

    if (selected.label === "Custom") {
      script = (await vscode.window.showInputBox()) || "";
    }

    if (!script) {
      return;
    }

    const cmd = scriptRunner(this.treeProvider.workspaceTool, node, script);

    if (!cmd) {
      return;
    }

    executeTerminalScript(`cd ${this.treeProvider.workspaceRoot}`);
    executeTerminalScript(cmd);
  }
}
