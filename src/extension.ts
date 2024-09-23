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
import { MonorepoDetailsProvider } from "./providers/detailsProvider";
import { ChangeFilesProvider } from "./providers/changeFilesProvider";
import { clearWorkspaceCache } from "./workspaces";
import { ScoperPovider } from "./providers/scopeProvider";
import { ScopedSearchCommand } from "./commands/scopedSearch";

const pkgUp = require("pkg-up");

let statusBarItem: vscode.StatusBarItem;
let treeProvider: MonorepoDependenciesProvider;
let changedPackagesProvider: MonorepoChangedPackagesProvider;
let treeView: vscode.TreeView<DependencyTreeItem | vscode.TreeItem>;
let changedPackagesView: vscode.TreeView<DependencyTreeItem>;
let changeFilesView: vscode.TreeView<vscode.TreeItem>;
let scoperView: vscode.TreeView<vscode.TreeItem>;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

type CommandCallback = Parameters<typeof vscode.commands.registerCommand>[1];
const register = (name: string, callback: CommandCallback) => {
  return vscode.commands.registerCommand(name, callback);
};

export async function activate({ subscriptions }: vscode.ExtensionContext) {
  // TODO: build forEachWorkspace into this thing
  const folders = vscode.workspace.workspaceFolders;

  if (!folders?.length) {
    return;
  }

  const cwd = folders[0].uri.fsPath;
  const pkg = await pkgUp({ cwd: cwd });

  treeProvider = new MonorepoDependenciesProvider(cwd, pkg);
  changedPackagesProvider = new MonorepoChangedPackagesProvider(cwd, pkg);
  const detailsProvider = new MonorepoDetailsProvider(cwd, pkg);

  await treeProvider.loadDependencyTree(cwd);

  const scopeProvider = new ScoperPovider(cwd, pkg);

  const changeFilesProvider = new ChangeFilesProvider(cwd, pkg);
  treeView = vscode.window.createTreeView("monorepoDependencies", {
    treeDataProvider: treeProvider,
  });

  treeView = vscode.window.createTreeView("monorepoDetails", {
    treeDataProvider: detailsProvider,
  });
  scoperView = vscode.window.createTreeView("scoper", {
    treeDataProvider: scopeProvider,
  });

  // TODO: only load this tree view when beachball is present
  changedPackagesView = vscode.window.createTreeView("changedPackages", {
    treeDataProvider: changedPackagesProvider,
  });
  changeFilesView = vscode.window.createTreeView("changeFiles", {
    treeDataProvider: changeFilesProvider,
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
    changedPackagesProvider,
    detailsProvider,
    changeFilesProvider,
    pkg
  );

  const commands: Record<string, CommandCallback> = {
    [loadPackagesCommand]: async () => {
      clearWorkspaceCache();
      const first = await treeProvider.getFirst();
      treeView.reveal(first);
    },
    "vscode-monorepo-tools.goToPackage": (node: DependencyTreeItem) => {
      const filePath = path.join(node.workspace.packageJsonPath);
      const uri = vscode.Uri.file(filePath);

      vscode.workspace.openTextDocument(uri).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
    },
    "vscode-monorepo-tools.showPackage": (node: DependencyTreeItem) => {
      const filePath = path.join(node.workspace.packageJsonPath);
      const uri = vscode.Uri.file(filePath);
      vscode.commands.executeCommand("revealInExplorer", uri);
    },
    "vscode-monorepo-tools.runPkgScript": (node) =>
      new RunScriptCommand(treeProvider).run(node),
    "vscode-monorepo-tools.goToPackageSearch": (node) =>
      new GoToPackageCommand(treeProvider).run(),
    "vscode-monorepo-tools.addDependency": (node) => {
      new AddDependencyCommand(treeProvider).run(node);
    },
    "vscode-monorepo-tools.searchInPackage": (node) => {
      new SearchInPackageCommand(treeProvider).run(node);
    },
    "vscode-monorepo-tools.goToRoot": () => {
      const filePath = path.join(treeProvider.workspaceRoot, "package.json");
      const uri = vscode.Uri.file(filePath);
      vscode.workspace.openTextDocument(uri).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
    },
    "vscode-monorepo-tools.goToUrl": (url: string) => {
      vscode.env.openExternal(vscode.Uri.parse(url));
    },
    "vscode-monorepo-tools.openFile": (url: string) => {
      const uri = vscode.Uri.file(url);
      vscode.workspace.openTextDocument(uri).then((doc) => {
        vscode.window.showTextDocument(doc);
        vscode.commands.executeCommand("revealInExplorer", uri);
      });
    },
    "vscode-monorepo-tools.runChange": (url: string) => {
      const terminal =
        vscode.window.terminals.find((t) => t.name === `Change Files`) ||
        vscode.window.createTerminal(`Change Files`);

      terminal.show();
      terminal.sendText(`cd ${cwd}`);
      terminal.sendText(`yarn change`);
    },
    "vscode-monorepo-tools.scoper.addGroup": (name: string) => {
      const terminal =
        vscode.window.terminals.find((t) => t.name === `Scoper`) ||
        vscode.window.createTerminal(`Scoper`);

      terminal.show();
      terminal.sendText(`cd ${cwd}`);
      terminal.sendText(`yarn scoper add ${name}`);
      terminal.sendText(`yarn scoper apply`);
    },
    "vscode-monorepo-tools.scoper.reset": () => {
      const terminal =
        vscode.window.terminals.find((t) => t.name === `Scoper`) ||
        vscode.window.createTerminal(`Scoper`);

      terminal.show();
      terminal.sendText(`cd ${cwd}`);
      terminal.sendText(`yarn scoper reset`);
    },
    "vscode-monorepo-tools.scoper.status": () => {
      const terminal =
        vscode.window.terminals.find((t) => t.name === `Scoper`) ||
        vscode.window.createTerminal(`Scoper`);

      terminal.show();
      terminal.sendText(`cd ${cwd}`);
      terminal.sendText(`yarn scoper status`);
    },
    "vscode-monorepo-tools.scopedSearch": () =>
      new ScopedSearchCommand(treeProvider).run(),
  };

  const changeTextEditorSubscription =
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        editorChange.run(editor.document.fileName);
      }
    });

  subscriptions.push(
    changeTextEditorSubscription,
    treeView,
    statusBarItem,
    ...Object.entries(commands).map(([name, callback]) =>
      register(name, callback)
    ),
    changeFilesView
  );

  // TODO: there is no reason for this I don't think
  // vscode.commands.registerCommand(
  //     'vscode-monorepo-tools.install',
  //     (node) => new InstallCommand(treeProvider).run(node)
  // ),
  // TODO: make this more intuitive, right now it only adds things to /packages
  vscode.commands.registerCommand("vscode-monorepo-tools.addPackage", () =>
    new NewPackageCommand(treeProvider).run()
  );

  statusBarItem.show();
  statusBarItem.text = "Loading workspace...";

  await editorChange.run(pkg);
}

// this method is called when your extension is deactivated
export function deactivate() {}
