import { Dependency } from '../dependency';
import { readJson } from '../readJson';
import * as vscode from 'vscode';
import * as path from 'path';
import { MonorepoDependenciesProvider } from '../dependencyProvider';

export class RunScriptCommand {
    treeProvider: MonorepoDependenciesProvider;

    constructor(treeProvider: MonorepoDependenciesProvider) {
        this.treeProvider = treeProvider;
    }

    async run(node: Dependency) {
        const filePath = path.join(node.pkg.dir, 'package.json');
        const json = readJson(filePath);
        const scripts = json.scripts || {};
        const scriptNames = Object.keys(scripts);

        const selected = await vscode.window.showQuickPick([
            {
                label: 'Custom',
                description: 'Run a custom script',
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

        if (selected.label === 'Custom') {
            script = (await vscode.window.showInputBox()) || '';
        }

        if (!script) {
            return;
        }

        const cmd = this.treeProvider.scriptRunner(node, script);

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
