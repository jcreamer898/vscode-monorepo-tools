import {
    TreeDataProvider,
    EventEmitter,
    TreeItem,
    TreeItemCollapsibleState,
    Event,
} from 'vscode';
import { getPackages, Package } from '@manypkg/get-packages';
import { findRoot } from '@manypkg/find-root';
import { Dependency } from './dependency';
import { getDependentsGraph } from '@changesets/get-dependents-graph';
import pkgUp from 'pkg-up';
import * as path from 'path';
import * as fs from 'fs';
import { readJson } from './readJson';

type TreeChangeEvent = Dependency | undefined | null | void;

export class MonorepoDependenciesProvider
    implements TreeDataProvider<Dependency> {
    private _onDidChangeTreeData: EventEmitter<TreeChangeEvent> = new EventEmitter<TreeChangeEvent>();
    readonly onDidChangeTreeData: Event<TreeChangeEvent> = this
        ._onDidChangeTreeData.event;

    workspaceRoot: string;
    workspacePkgJson: Record<string, any>;
    workspaceTool!: string;
    rootPkg!: Dependency;

    /**
     * Dependency graph for a given workspace root
     */
    graph: Map<string, string[]> = new Map<string, string[]>();

    /**
     * Map of packages in workspaceRoot
     */
    packages: Map<string, Dependency> = new Map();

    activePackage!: Dependency;

    constructor(workspaceRoot: string, pkgJson: any) {
        this.workspaceRoot = workspaceRoot;
        this.workspacePkgJson = pkgJson;
    }

    /**
     * Forces the tree view to refresh
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get an inviditual tree item
     * @param element
     * @returns
     */
    getTreeItem(element: Dependency): TreeItem {
        return element;
    }

    /**
     * Get a list of tree items, this fires for the top level and each element
     * @param element
     * @returns
     */
    async getChildren(element: Dependency): Promise<Dependency[]> {
        const graph = await this.loadGraph();

        // Return the top level tree
        if (!element && graph) {
            const root = this.getRoot();
            return root ? [root] : [];
        }

        if (element.pkg.packageJson.name === this.workspacePkgJson.name) {
            return Array.from(this.packages.values());
        }

        const deps = graph?.get(element.label as string);

        if (deps) {
            return deps?.map(
                (name: string) => this.packages.get(name) as Dependency
            );
        }

        return [];
    }

    getRoot() {
        return this.rootPkg;
    }

    getParent(element: Dependency) {
        if (!element) {
            return this.getRoot();
        }

        return null;
    }

    async getFirst() {
        await this.loadGraph();
        const [, pkg] = this.packages.entries().next().value;
        return pkg;
    }

    /**
     * Load a cached graph or create a new one
     * @returns
     */
    async loadGraph() {
        if (this.graph.size > 0) {
            return this.graph;
        }

        if (!this.workspacePkgJson) {
            return new Map<string, string[]>();
        }

        const packages = await getPackages(this.workspaceRoot);
        const graph = await getDependentsGraph(packages);

        this.graph = graph;
        this.workspaceTool = packages.tool;

        packages.packages.forEach((pkg) =>
            this.packages.set(
                pkg.packageJson.name,
                new Dependency(pkg, TreeItemCollapsibleState.Collapsed)
            )
        );

        return graph;
    }

    /**
     * Load a new workspace root from which to establish a graph
     * @param root
     * @param pkgJson
     */
    async loadGraphFromFile(filename: string) {
        try {
            let cwd = path.dirname(filename);

            const packageForFilename = (await pkgUp({ cwd })) as string;
            const rootPackageDir = await findRoot(cwd);

            this.workspaceRoot = rootPackageDir;
            this.workspacePkgJson = readJson(
                path.join(rootPackageDir, 'package.json')
            );

            this.rootPkg = new Dependency(
                {
                    packageJson: this
                        .workspacePkgJson as Package['packageJson'],
                    dir: this.workspaceRoot,
                },
                TreeItemCollapsibleState.Expanded,
                true
            );

            this.clearGraph();
            await this.loadGraph();

            const pkgName = readJson(packageForFilename).name;
            this.activePackage = this.packages.get(pkgName) as Dependency;
            this.refresh();
        } catch (e) {
            console.error(`Problem loading graph: ${e.message}`);
        }
    }

    /**
     * Resets the current graph
     */
    clearGraph() {
        this.graph = new Map<string, string[]>();
        this.packages = new Map<string, Dependency>();
    }

    statusText() {
        return this.workspacePkgJson
            ? `Workspace: ${this.workspacePkgJson.name}, ${this.packages.size} packages`
            : 'Workspace: Loading...';
    }

    titleText() {
        if (!this.workspacePkgJson) {
            return 'Workspace: Loading...';
        }

        return `${this.workspacePkgJson.name}`;
    }

    scriptRunner(dependency: Dependency, script: string) {
        if (dependency.root) {
            if (script === 'install') {
                switch (this.workspaceTool) {
                    case 'yarn':
                        return `yarn`;
                    case 'lerna':
                        return `lerna bootstrap`;
                    case 'bolt':
                        return `bolt`;
                    default:
                        return null;
                }
            } else {
                switch (this.workspaceTool) {
                    case 'yarn':
                        return `yarn workspaces run ${script}`;
                    case 'lerna':
                        return `lerna run ${script}`;
                    case 'bolt':
                        return `bolt ws run ${script}`;
                    default:
                        return null;
                }
            }
        } else {
            switch (this.workspaceTool) {
                case 'yarn':
                    return `yarn workspace ${dependency.pkg.packageJson.name} run ${script}`;
                case 'lerna':
                    return `lerna run --scope ${dependency.pkg.packageJson.name} ${script}`;
                case 'bolt':
                    return `bolt w ${dependency.pkg.packageJson.name} run ${script}`;
                default:
                    return null;
            }
        }
    }
}
