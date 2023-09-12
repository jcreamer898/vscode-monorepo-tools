import {
    TreeDataProvider,
    EventEmitter,
    TreeItem,
    TreeItemCollapsibleState,
    Event,
    window,
} from 'vscode';
import { findRoot } from '@manypkg/find-root';
import { Dependency } from './dependency';
import {
    getPackageInfos,
    createDependencyMap,
    createPackageGraph,
    PackageInfo,
} from 'workspace-tools';
import { getWorkspaceManagerAndRoot } from 'workspace-tools/lib/workspaces/implementations';
import pkgUp from 'pkg-up';
import * as path from 'path';
import { readJson } from './readJson';
import { installScripts, packageRunScripts, rootRunScripts } from './scripts';

type TreeChangeEvent = Dependency | undefined | null | void;

export class MonorepoDependenciesProvider
    implements TreeDataProvider<Dependency>
{
    private _onDidChangeTreeData: EventEmitter<TreeChangeEvent> =
        new EventEmitter<TreeChangeEvent>();
    readonly onDidChangeTreeData: Event<TreeChangeEvent> =
        this._onDidChangeTreeData.event;

    workspaceRoot: string;
    workspacePkgJson: PackageInfo;
    workspaceTool!: string;
    rootPkg!: Dependency;

    /**
     * Dependency graph for a given workspace root
     */
    graph: Map<string, Set<string>> = new Map<string, Set<string>>();

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
    private refresh(): void {
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

        if (element.root) {
            return Array.from(this.packages.values());
        }

        if (element.pkg.children) {
            let keys = Array.from(element.pkg.children.keys());
            return keys.map((name: string) => {
                const dep = this.packages.get(name) as Dependency;

                if (keys.includes(element.pkg.name)) {
                    window.showInformationMessage(
                        `Circular dependency: ${element.pkg.name} -> ${dep.pkg.name}`
                    );
                }

                return dep;
            });
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
     * @param force Forces the graph to refresh and not use cache
     * @returns
     */
    async loadGraph(force = false) {
        if (!force && this.graph.size > 0) {
            return this.graph;
        }

        if (!this.workspacePkgJson) {
            return new Map<string, Set<string>>();
        }
        console.log({ root: this.workspaceRoot });
        const packages = getPackageInfos(this.workspaceRoot);
        console.log({ packages });
        const tool = getWorkspaceManagerAndRoot(this.workspaceRoot)?.manager;
        const graph = createDependencyMap(packages);
        const actualGraph = createPackageGraph(packages);
        console.log({ actualGraph });

        this.graph = graph.dependencies;
        console.log('load graph!');
        console.log(graph);
        this.workspaceTool = tool || 'unknown';

        Object.entries(packages).forEach(([, pkg]) => {
            const deps = graph.dependencies.get(pkg.name);

            this.packages.set(
                pkg.name,
                new Dependency(
                    { ...pkg, tool: this.workspaceTool, children: deps },
                    deps?.size
                        ? TreeItemCollapsibleState.Collapsed
                        : TreeItemCollapsibleState.None
                )
            );
        });

        return graph;
    }

    async refreshGraph() {
        await this.loadGraph(true);
        this.refresh();
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

            this.clearGraph();
            await this.loadGraph();

            this.rootPkg = new Dependency(
                {
                    ...this.workspacePkgJson,
                    path: this.workspaceRoot,
                    tool: this.workspaceTool,
                },
                TreeItemCollapsibleState.Expanded,
                true
            );

            const pkgName = readJson(packageForFilename).name;
            this.activePackage = this.packages.get(pkgName) as Dependency;
            this.refresh();
        } catch (e) {
            console.error(`Problem loading graph: ${e}`);
        }
    }

    /**
     * Resets the current graph
     */
    clearGraph() {
        this.graph = new Map<string, Set<string>>();
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
}
