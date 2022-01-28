import { Dependency } from '../dependency';
import { readJson } from '../readJson';
import * as vscode from 'vscode';
import * as path from 'path';
import { MonorepoDependenciesProvider } from '../dependencyProvider';
import { scriptRunner } from '../scripts';

export class GoToPackageCommand {
    treeProvider: MonorepoDependenciesProvider;

    constructor(treeProvider: MonorepoDependenciesProvider) {
        this.treeProvider = treeProvider;
    }

    async run() {
        const deps = Array.from(this.treeProvider.graph.keys());

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

        const item = this.treeProvider.packages.get(selected.label);

        if (!item) {
            return;
        }

        const filePath = path.join(item?.pkg.dir, 'package.json');
        const uri = vscode.Uri.file(filePath);

        vscode.workspace.openTextDocument(uri).then((doc) => {
            vscode.window.showTextDocument(doc);
        });
    }
}
