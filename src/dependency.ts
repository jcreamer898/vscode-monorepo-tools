import * as vscode from 'vscode';
import { Package } from '@manypkg/get-packages';
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
        public readonly pkg: Package & {
            tool?: string;
            children?: string[];
        },
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly root: boolean = false
    ) {
        super(pkg.packageJson.name, collapsibleState);
        this.tooltip = `${this.label}`;
        this.description = pkg.packageJson.version;
        this.pkg = pkg;
        this.contextValue = root ? 'root' : 'dependency';
        this.iconPath = icons[this.pkg.tool as string] || icons.dark;
    }
}
