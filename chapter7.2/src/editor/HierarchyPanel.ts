import { Container, Panel, TextInput, TreeView, TreeViewItem, Label } from '@playcanvas/pcui';
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
    private panel: Panel;
    private treeView: TreeView;
    private filter: TextInput;
    private scene: Scene | null;
    private events: Events;
    private gameObjectToItem: Map<GameObject, TreeViewItem> = new Map();
    private updatingSelection = false; // Prevent infinite loops

    constructor(events: Events, scene: Scene | null) {
        this.events = events;
        this.scene = scene;

        this.panel = new Panel({
            collapseHorizontally: true,
            collapsible: true,
            scrollable: true,
            headerText: 'Hierarchy',
            width: 200,
            height: '100%',
            resizable: 'right',
            resizeMin: 150,
            resizeMax: 500
        });
        

        // Create tree view
        this.treeView = new TreeView({
            allowDrag: true,
            allowReordering: true,
            allowRenaming: true,
        });

        this.filter = new TextInput({
            keyChange: true,
            placeholder: 'Filter',
            width: 'calc(100% - 14px)'
        });
        this.filter.on('change', (value) => {
            this.treeView.filter = value;
        });

        this.panel.append(this.treeView);
        this.panel.append(this.filter);

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

        // Update selection visually without rebuilding
        this.events.on('selection.changed', (data: any) => {
            this.updateSelection(data.current);
        });

        // Add new object to hierarchy
        this.events.on('editor.objectAdded', (obj: GameObject) => {
            this.addGameObject(obj, this.treeView);
            // Select the new object
            this.events.fire('selection.set', obj);
        });

        // Update object name in hierarchy
        this.events.on('editor.objectNameChange', (obj: GameObject) => {
            const item = this.gameObjectToItem.get(obj);
            if (item) {
                item.text = obj.name;
            }
        });
    }

    /**
     * Update selection without rebuilding tree
     */
    private updateSelection(gameObject: GameObject | null): void {
        if (this.updatingSelection) return; // Prevent infinite loops

        this.updatingSelection = true;

        // Deselect all items first
        if (gameObject) {
            const selected = this.gameObjectToItem.get(gameObject);
            for (const item of this.gameObjectToItem.values()) {
                
                if (item === selected) {
                    item.selected = true;
                } else {
                    item.selected = false;
                }
            }
        }

        this.updatingSelection = false;
    }

    /**
     * Rebuild tree from scene
     * Called manually when needed (same pattern as 7.1)
     */
    public refresh(): void {
        this.treeView.clear();
        this.gameObjectToItem.clear();

        if (!this.scene) return;

        const roots = this.scene.getRootGameObjects();

        for (const root of roots) {
            this.addGameObject(root, this.treeView);
        }
    }

    /**
     * Recursively add GameObject to tree
     */
    private addGameObject(
        gameObject: GameObject,
        parent: TreeView | TreeViewItem,
    ): void {
        const item = new TreeViewItem({
            text: gameObject.name,
            allowSelect: true,
        });

        // Store mapping for quick lookup
        this.gameObjectToItem.set(gameObject, item);

        item.on('select', () => {
            // Only fire event if this is a user action, not programmatic
            if (!this.updatingSelection) {
                this.events.fire('selection.set', gameObject);
            }
        });

        // Add children recursively
        for (const child of gameObject.children) {
            this.addGameObject(child, item);
        }

        // Append FIRST
        parent.append(item);
    }

    getElement(): Container {
        return this.panel;
    }
}
