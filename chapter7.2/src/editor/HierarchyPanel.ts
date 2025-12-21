import { Container, TreeView, TreeViewItem, Label } from '@playcanvas/pcui';
import type { GameObject } from '../core/GameObject';
import type { Scene } from '../core/Scene';
import type { Events } from '../events';

/**
 * HierarchyPanel - Scene hierarchy using PCUI TreeView.
 *
 * Before (7.1): ~200 lines of manual DOM manipulation
 * After (7.2): ~60 lines using PCUI components
 *
 * Uses existing Events bus instead of Observer for consistency.
 */
export class HierarchyPanel {
    private container: Container;
    private header: Label;
    private treeView: TreeView;
    private scene: Scene | null;
    private events: Events;

    constructor(events: Events, scene: Scene | null) {
        this.events = events;
        this.scene = scene;

        // Create container
        this.container = new Container({
            class: 'hierarchy-panel',
            flex: true,
            flexDirection: 'column',
            width: '100%'
        });

        // Header
        this.header = new Label({
            text: 'Hierarchy',
            class: 'panel-header'
        });

        // Create tree view
        this.treeView = new TreeView({
            allowDrag: true,
            allowReordering: true
        });

        this.container.append(this.header);
        this.container.append(this.treeView);

        // Listen to PCUI selection
        this.treeView.on('select', (item: TreeViewItem) => {
            const gameObject = (item as any).gameObject as GameObject;
            // Fire selection event - state manager will handle it
            this.events.fire('selection.set', gameObject);
        });

        // Listen to Events bus for updates (same pattern as 7.1)
        this.setupEventListeners();

        // Initial build
        this.refresh();
    }

    private setupEventListeners(): void {
        // Rebuild when scene changes
        this.events.on('project.sceneChanged', (data: any) => {
            this.scene = data.scene;
            this.refresh();
        });

        // Rebuild when selection changes (to highlight selected)
        this.events.on('selection.changed', () => {
            this.refresh();
        });

        // Rebuild when hierarchy changes
        this.events.on('scene.hierarchyChanged', () => {
            this.refresh();
        });
    }

    /**
     * Rebuild tree from scene
     * Called manually when needed (same pattern as 7.1)
     */
    public refresh(): void {
        this.treeView.clear();

        if (!this.scene) return;

        const roots = this.scene.getRootGameObjects();
        const selected = this.events.invoke('selection.get') as GameObject | null;

        for (const root of roots) {
            this.addGameObject(root, this.treeView, selected);
        }
    }

    /**
     * Recursively add GameObject to tree
     */
    private addGameObject(
        gameObject: GameObject,
        parent: TreeView | TreeViewItem,
        selected: GameObject | null
    ): void {
        const item = new TreeViewItem({
            text: gameObject.name,
            allowSelect: true,
            selected: gameObject === selected
        });

        // Store reference for selection lookup
        (item as any).gameObject = gameObject;

        // Add children recursively
        for (const child of gameObject.transform.children) {
            this.addGameObject(child.gameObject, item, selected);
        }

        parent.append(item);
    }

    getElement(): Container {
        return this.container;
    }
}
