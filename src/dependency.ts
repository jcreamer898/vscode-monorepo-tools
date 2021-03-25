import * as vscode from 'vscode';
import { Package } from '@manypkg/get-packages';
import * as path from 'path';

export class Dependency extends vscode.TreeItem {
    constructor(
        public readonly pkg: Package,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly root: boolean = false
    ) {
        super(pkg.packageJson.name, collapsibleState);
        this.tooltip = `${this.label}`;
        this.description = pkg.packageJson.version;
        this.pkg = pkg;
        this.contextValue = root ? 'root' : 'dependency';
    }

    iconPath = {
        light: path.join(
            __filename,
            '..',
            '..',
            'resources',
            'dependency_light.svg'
        ),
        dark: path.join(__filename, '..', '..', 'resources', 'dependency.svg'),
    };
}
