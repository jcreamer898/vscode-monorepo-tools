import { MonorepoDependenciesProvider } from "../dependencyProvider";
import { executeTerminalScript, scriptRunner } from "../scripts";

export class NewPackageCommand {
  treeProvider: MonorepoDependenciesProvider;

  constructor(treeProvider: MonorepoDependenciesProvider) {
    this.treeProvider = treeProvider;
  }

  async run() {
    const rootPkg = this.treeProvider.rootPkg;
    // TODO: document that having a generate script is required
    if (!rootPkg.workspace?.scripts?.generate) {
      return;
    }

    const cmd = scriptRunner(
      this.treeProvider.workspaceTool,
      this.treeProvider.rootPkg,
      rootPkg.workspace?.scripts?.generate
    );

    if (!cmd) {
      return;
    }

    executeTerminalScript(`cd ${this.treeProvider.workspaceRoot}`);
    executeTerminalScript(cmd);
  }
}
