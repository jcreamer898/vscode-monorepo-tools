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

type TreeChangeEvent = Dependency | undefined | null | void;

export class MonorepoDependenciesProvider
    implements TreeDataProvider<Dependency> {
    private _onDidChangeTreeData: EventEmitter<TreeChangeEvent> = new EventEmitter<TreeChangeEvent>();
    readonly onDidChangeTreeData: Event<TreeChangeEvent> = this
        ._onDidChangeTreeData.event;

    workspaceRoot: string;

    workspacePkgJson: Record<string, any>;

    /**
     * Dependency graph for a given workspace root
     */
    graph: Map<string, string[]> = new Map<string, string[]>();

    /**
     * Map of packages in workspaceRoot
     */
    packages!: Map<string, Package>;

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
            return Array.from(graph?.keys()).map((key) => {
                const pkg = this.packages.get(key);

                return new Dependency(
                    pkg as Package,
                    TreeItemCollapsibleState.Collapsed
                );
            });
        }

        const deps = graph?.get(element.label as string);

        if (deps) {
            return deps?.map(
                (name) =>
                    new Dependency(
                        this.packages.get(name) as Package,
                        TreeItemCollapsibleState.Collapsed
                    )
            );
        }

        return [];
    }

    getRoot() {
        return this.workspacePkgJson
            ? new Dependency(
                  {
                      packageJson: this
                          .workspacePkgJson as Package['packageJson'],
                      dir: this.workspaceRoot,
                  },
                  TreeItemCollapsibleState.Expanded
              )
            : null;
    }

    getParent(element: Dependency) {
        if (!element) {
            return new Dependency(
                {
                    packageJson: this
                        .workspacePkgJson as Package['packageJson'],
                    dir: this.workspaceRoot,
                },
                TreeItemCollapsibleState.Collapsed
            );
        }

        return null;
    }

    async getFirst() {
        await this.loadGraph();
        const [, pkg] = this.packages.entries().next().value;
        return new Dependency(pkg, TreeItemCollapsibleState.Collapsed);
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
        this.packages = new Map<string, Package>();
        packages.packages.forEach((pkg) =>
            this.packages.set(pkg.packageJson.name, pkg)
        );

        return graph;
    }

    /**
     * Load a new workspace root from which to establish a graph
     * @param root
     * @param pkgJson
     */
    async setWorkspaceFromFile(filename: string) {
        let cwd = path.dirname(filename);

        const packageForFilename = await pkgUp({ cwd });
        const rootPackageDir = await findRoot(cwd);

        this.workspaceRoot = rootPackageDir;
        this.workspacePkgJson = JSON.parse(
            fs
                .readFileSync(path.join(rootPackageDir, 'package.json'))
                .toString()
        );

        this.clearGraph();
    }

    /**
     * Resets the current graph
     */
    clearGraph() {
        this.graph = new Map<string, string[]>();
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
}
