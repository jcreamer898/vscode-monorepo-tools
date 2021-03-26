import { Dependency } from './dependency';
import * as vscode from 'vscode';

export const scriptRunner = (
    workspaceTool: string,
    dependency: Dependency,
    script: string,
    ...args: any[]
) => {
    if (dependency.root) {
        if (script === 'install') {
            return installScripts(workspaceTool);
        } else {
            return rootRunScripts(workspaceTool, script);
        }
    }

    if (script === 'add') {
        const [addPackage] = args;

        return addScripts(
            workspaceTool,
            dependency.pkg.packageJson.name,
            addPackage
        );
    }

    return packageRunScripts(
        workspaceTool,
        dependency.pkg.packageJson.name,
        script
    );
};

export const installScripts = (workspaceTool: string) => {
    switch (workspaceTool) {
        case 'yarn':
            return (
                vscode.workspace
                    .getConfiguration('monorepoTools')
                    .get('yarnInstallCommand') || `yarn`
            );
        case 'lerna':
            return (
                vscode.workspace
                    .getConfiguration('monorepoTools')
                    .get('lernaInstallCommand') || `lerna bootstrap`
            );
        case 'bolt':
            return (
                vscode.workspace
                    .getConfiguration('monorepoTools')
                    .get('boltInstallCommand') || `bolt`
            );
        default:
            return null;
    }
};

export const rootRunScripts = (workspaceTool: string, script: string) => {
    switch (workspaceTool) {
        case 'yarn':
            return `yarn workspaces run ${script}`;
        case 'lerna':
            return `lerna run ${script}`;
        case 'bolt':
            return `bolt ws run ${script}`;
        default:
            return null;
    }
};

export const packageRunScripts = (
    workspaceTool: string,
    pkgName: string,
    script: string
) => {
    switch (workspaceTool) {
        case 'yarn':
            return `yarn workspace ${pkgName} run ${script}`;
        case 'lerna':
            return `lerna run --scope ${pkgName} ${script}`;
        case 'bolt':
            return `bolt w ${pkgName} run ${script}`;
        default:
            return null;
    }
};

export const addScripts = (
    workspaceTool: string,
    pkgName: string,
    addPackage: string
) => {
    switch (workspaceTool) {
        case 'yarn':
            // TODO: figure out a way to do this in yarn workspaces
            return null;
        case 'lerna':
            return `lerna add --scope ${pkgName} ${addPackage}`;
        case 'bolt':
            return `bolt w ${pkgName} add ${addPackage}`;
        default:
            return null;
    }
};