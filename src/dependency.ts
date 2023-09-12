import * as vscode from 'vscode';
import { PackageInfo } from 'workspace-tools';
import * as path from 'path';

const resourcePath = path.join(__filename, '..', '..', 'resources');

const icons: Record<string, string | vscode.ThemeIcon> = {
    yarn: path.join(resourcePath, 'yarn.svg'),
    light: path.join(resourcePath, 'dependency_light.svg'),
    dark: path.join(resourcePath, 'dependency_light.svg'),
    lerna: path.join(resourcePath, 'lerna.svg'),
    bolt: new vscode.ThemeIcon('zap'),
};
export class Dependency extends vscode.TreeItem {
    constructor(
        public readonly pkg: PackageInfo & {
            tool?: string;
            children?: Set<string>;
        },
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly root: boolean = false
    ) {
        super(pkg.name, collapsibleState);
        this.tooltip = `${this.label}`;
        this.description = pkg.version;
        this.pkg = pkg;
        this.contextValue = root ? 'root' : 'dependency';
        this.iconPath = icons[this.pkg.tool as string] || icons.dark;
    }
}
