import { Dependency } from '../dependency';
import { readJson } from '../readJson';
import * as vscode from 'vscode';
import * as path from 'path';
import { MonorepoDependenciesProvider } from '../dependencyProvider';

export class InstallCommand {
    treeProvider: MonorepoDependenciesProvider;

    constructor(treeProvider: MonorepoDependenciesProvider) {
        this.treeProvider = treeProvider;
    }

    async run(node: Dependency) {
        const cmd = this.treeProvider.scriptRunner(node, 'install');

        if (!cmd) {
            return;
        }

        const terminal =
            vscode.window.terminals.find((t) => t.name === `Run Script`) ||
            vscode.window.createTerminal(`Run Script`);

        terminal.show();
        terminal.sendText(`cd ${this.treeProvider.workspaceRoot}`);
        terminal.sendText(cmd);
    }
}
