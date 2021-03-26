import { Dependency } from '../dependency';
import { readJson } from '../readJson';
import * as vscode from 'vscode';
import * as path from 'path';
import { MonorepoDependenciesProvider } from '../dependencyProvider';
import fs from 'fs';
import mkdirp from 'mkdirp';
import Handlebars from 'handlebars';
import { EventEmitter } from 'events';

export class NewPackageCommand {
    treeProvider: MonorepoDependenciesProvider;

    constructor(treeProvider: MonorepoDependenciesProvider) {
        this.treeProvider = treeProvider;
    }

    async run(node: Dependency) {
        const name = await vscode.window.showInputBox({
            value: 'Package Name',
        });
        const destination = await vscode.window.showInputBox({
            value: `${node.pkg.dir}/packages`,
        });
        const description = await vscode.window.showInputBox({
            value: 'Description of this new package',
        });

        if (!name || !destination) {
            return;
        }

        const customTemplate = vscode.workspace
            .getConfiguration('monorepoTools')
            .get<string>('packageJsonTemplate');

        if (vscode.workspace.workspaceFolders && customTemplate) {
        }

        const templatePath =
            vscode.workspace.workspaceFolders && customTemplate
                ? path.resolve(
                      vscode.workspace.workspaceFolders[0].uri.fsPath,
                      customTemplate
                  )
                : path.join(
                      __filename,
                      '..',
                      '..',
                      'templates',
                      'package.json.hbs'
                  );
        const contents = await (
            await fs.promises.readFile(templatePath)
        ).toString();
        const template = Handlebars.compile(contents);

        const destClean = path.join(destination, name.replace(/\@[^/]+/, ''));
        await mkdirp(destClean);
        await mkdirp(path.join(destClean, 'src'));
        await fs.promises.writeFile(
            path.join(destClean, 'package.json'),
            template({ name, description })
        );
        await fs.promises.writeFile(
            path.join(destClean, 'src', 'index.ts'),
            '// Generated from vscode-monorepo-tools. Have fun!'
        );

        await this.treeProvider.refreshGraph();
    }
}
