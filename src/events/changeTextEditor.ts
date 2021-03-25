import * as vscode from 'vscode';
import { Dependency } from '../dependency';
import { MonorepoDependenciesProvider } from '../dependencyProvider';

export class ChangeTextEditorEvent {
    treeProvider: MonorepoDependenciesProvider;
    treeView: vscode.TreeView<Dependency>;
    statusBarItem: vscode.StatusBarItem;

    constructor(
        treeProvider: MonorepoDependenciesProvider,
        treeView: vscode.TreeView<Dependency>,
        statusBarItem: vscode.StatusBarItem
    ) {
        this.treeProvider = treeProvider;
        this.treeView = treeView;
        this.statusBarItem = statusBarItem;
    }

    async run() {
        const filename = vscode.window.activeTextEditor?.document.fileName;

        if (!filename) {
            return;
        }

        await this.treeProvider.loadGraphFromFile(filename);

        this.treeView.title = this.treeProvider.titleText();
        this.statusBarItem.text = this.treeProvider.statusText();
    }
}
