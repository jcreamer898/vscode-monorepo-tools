import * as vscode from 'vscode';
import { Dependency } from '../dependency';
import { MonorepoDependenciesProvider } from '../dependencyProvider';
import { MonorepoChangedPackagesProvider } from '../changedPackageProvider';

export class ChangeTextEditorEvent {
    treeProvider: MonorepoDependenciesProvider;
    treeView: vscode.TreeView<Dependency>;
    changedPackagesProvider: MonorepoChangedPackagesProvider;
    statusBarItem: vscode.StatusBarItem;

    constructor(
        treeProvider: MonorepoDependenciesProvider,
        treeView: vscode.TreeView<Dependency>,
        statusBarItem: vscode.StatusBarItem,
        changedPackagesProvider: MonorepoChangedPackagesProvider
    ) {
        this.treeProvider = treeProvider;
        this.treeView = treeView;
        this.statusBarItem = statusBarItem;
        this.changedPackagesProvider = changedPackagesProvider;
    }

    async run() {
        const filename = vscode.window.activeTextEditor?.document.fileName;

        if (!filename) {
            return;
        }

        await this.treeProvider.loadGraphFromFile(filename);
        await this.changedPackagesProvider.loadGraphFromFile(filename);

        this.treeView.title = this.treeProvider.titleText();
        this.statusBarItem.text = this.treeProvider.statusText();
    }
}
