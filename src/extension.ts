// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import path from "path";
import { DependencyTreeItem } from "./dependency";
import { MonorepoDependenciesProvider } from "./dependencyProvider";
import { RunScriptCommand } from "./commands/runScript";
import { ChangeTextEditorEvent } from "./events/changeTextEditor";
import { InstallCommand } from "./commands/installScript";
import { NewPackageCommand } from "./commands/newPackage";
import { AddDependencyCommand } from "./commands/addDependency";
import { SearchInPackageCommand } from "./commands/searchInPackage";
import { GoToPackageCommand } from "./commands/goToPackage";
import { MonorepoChangedPackagesProvider } from "./changedPackageProvider";

const pkgUp = require("pkg-up");

let statusBarItem: vscode.StatusBarItem;
let treeProvider: MonorepoDependenciesProvider;
let changedPackagesProvider: MonorepoChangedPackagesProvider;
let treeView: vscode.TreeView<DependencyTreeItem>;
let changedPackagesView: vscode.TreeView<DependencyTreeItem>;

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
  changedPackagesProvider = new MonorepoChangedPackagesProvider(cwd, pkg);
  treeView = vscode.window.createTreeView("monorepoDependencies", {
    treeDataProvider: treeProvider,
  });

  changedPackagesView = vscode.window.createTreeView("changedPackages", {
    treeDataProvider: changedPackagesProvider,
  });

  const loadPackagesCommand = "vscode-monorepo-tools.loadPackages";

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  statusBarItem.command = loadPackagesCommand;

  const editorChange = new ChangeTextEditorEvent(
    treeProvider,
    treeView,
    statusBarItem,
    changedPackagesProvider
  );
  subscriptions.push(
    vscode.commands.registerCommand(loadPackagesCommand, async () => {
      const first = await treeProvider.getFirst();
      treeView.reveal(first);
    }),
    vscode.commands.registerCommand(
      "vscode-monorepo-tools.goToPackage",
      (node: DependencyTreeItem) => {
        const filePath = path.join(node.workspace.packageJsonPath);
        const uri = vscode.Uri.file(filePath);

        vscode.workspace.openTextDocument(uri).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      }
    ),
    vscode.commands.registerCommand(
      "vscode-monorepo-tools.showPackage",
      (node: DependencyTreeItem) => {
        const filePath = path.join(node.workspace.packageJsonPath);
        const uri = vscode.Uri.file(filePath);
        vscode.commands.executeCommand("revealInExplorer", uri);
      }
    ),
    vscode.window.onDidChangeActiveTextEditor(() => editorChange.run()),
    treeView,
    statusBarItem,
    vscode.commands.registerCommand(
      "vscode-monorepo-tools.runPkgScript",
      (node) => new RunScriptCommand(treeProvider).run(node)
    ),
    vscode.commands.registerCommand(
      "vscode-monorepo-tools.goToPackageSearch",
      (node) => new GoToPackageCommand(treeProvider).run()
    ),
    // TODO: there is no reason for this I don't think
    // vscode.commands.registerCommand(
    //     'vscode-monorepo-tools.install',
    //     (node) => new InstallCommand(treeProvider).run(node)
    // ),
    // TODO: make this more intuitive, right now it only adds things to /packages
    // vscode.commands.registerCommand(
    //     'vscode-monorepo-tools.addPackage',
    //     (node) => new NewPackageCommand(treeProvider).run(node)
    // ),
    vscode.commands.registerCommand(
      "vscode-monorepo-tools.addDependency",
      (node) => {
        new AddDependencyCommand(treeProvider).run(node);
      }
    ),
    vscode.commands.registerCommand(
      "vscode-monorepo-tools.searchInPackage",
      (node) => {
        new SearchInPackageCommand(treeProvider).run(node);
      }
    )
  );

  statusBarItem.show();
  statusBarItem.text = "Loading workspace...";

  await editorChange.run();
}

// this method is called when your extension is deactivated
export function deactivate() {}
