// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getPackages, Package, Packages } from '@manypkg/get-packages';
import { getDependentsGraph } from '@changesets/get-dependents-graph';
import * as path from 'path';
import * as fs from 'fs';
import { Dependency } from './dependency';
import { MonorepoDependenciesProvider } from './dependencyProvider';

const pkgUp = require('pkg-up');

let myStatusBarItem: vscode.StatusBarItem;
let treeProvider: MonorepoDependenciesProvider;
let treeView: vscode.TreeView<Dependency>;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate({ subscriptions }: vscode.ExtensionContext) {
    const folders = vscode.workspace.workspaceFolders;

    if (!folders?.length) {
        return;
    }

    const cwd = folders[0].uri.fsPath;
    const pkg = await pkgUp({ cwd: cwd });

    treeProvider = new MonorepoDependenciesProvider(cwd, pkg);
    treeView = vscode.window.createTreeView('monorepoDependencies', {
        treeDataProvider: treeProvider,
    });
    const loadPackagesCommand = 'vscode-monorepo-tools.loadPackages';

    myStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left
    );
    myStatusBarItem.command = loadPackagesCommand;

    subscriptions.push(
        vscode.commands.registerCommand(loadPackagesCommand, async () => {
            const first = await treeProvider.getFirst();
            treeView.reveal(first);
        }),
        vscode.commands.registerCommand(
            'vscode-monorepo-tools.goToPackage',
            (node: Dependency) => {
                const openPath = vscode.Uri.parse(
                    'file:///' + `${node.pkg.dir}/package.json`
                );
                vscode.workspace.openTextDocument(openPath).then((doc) => {
                    vscode.window.showTextDocument(doc);
                });
            }
        ),
        vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor),
        treeView,
        myStatusBarItem
    );

    myStatusBarItem.show();
    myStatusBarItem.text = 'Loading workspace';

    await onDidChangeActiveTextEditor();
}

const onDidChangeActiveTextEditor = async () => {
    const filename = vscode.window.activeTextEditor?.document.fileName;

    if (!filename) {
        return;
    }

    await treeProvider.setWorkspaceFromFile(filename);
    await treeProvider.loadGraph();

    treeProvider.refresh();
    treeView.title = treeProvider.titleText();
    myStatusBarItem.text = treeProvider.statusText();
};

// this method is called when your extension is deactivated
export function deactivate() {}
