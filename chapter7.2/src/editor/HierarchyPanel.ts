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
    private treeRoot: TreeViewItem;
    private filter: TextInput;
    private scene: Scene | null;
    private events: Events;
    private gameObjectToItem: Map<GameObject, TreeViewItem> = new Map();
    private itemToGameObject: Map<TreeViewItem, GameObject> = new Map();
    private updatingSelection = false; // Prevent infinite loops
    private lastSelectedItem: TreeViewItem | null = null;

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

        this.panel.append(this.filter);
        this.panel.append(this.treeView);
        this.treeRoot = new TreeViewItem({ text: 'Scene' });
        this.treeView.append(this.treeRoot);

        

        // Listen to Events bus for updates (same pattern as 7.1)
        this.setupEventListeners();

        // Initial build
        this.refresh();

        // Setup drag handling
        this.setupDragHandling();
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
            this.addGameObject(obj, this.treeRoot);
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


    private setupDragHandling(): void {
        this.treeView.on('reparent', (reparented) => {
            const { item, oldParent, newParent, index } = reparented[0];
            console.log('Reparenting item:', item, 'old:', oldParent, 'new:', newParent, 'index:', index);
            const gameObject = this.itemToGameObject.get(item);
            const oldParentGameObject = this.itemToGameObject.get(oldParent);
            const newParentGameObject = this.itemToGameObject.get(newParent);


            if (!gameObject || !newParentGameObject) return;

            // Check 1: Cannot parent to itself

            // Check 2: Cannot parent to a descendant (circular reference)
            if (newParentGameObject && gameObject.isAncestorOf(newParentGameObject)) {
                console.warn('Cannot create circular parent reference');
                this.refresh(); // Revert visual changes
                return;
            }

            // --- Apply Changes ---

            // 1. Update Parent
            // We use worldPositionStays=true to mimic standard editor behavior (object stays visually in place)
            // Note: If newParent === oldParent, setParent returns early internally, which is fine.
            gameObject.setParent(newParentGameObject, true);

            // 2. Update Sibling Index
            // setParent() appends the object to the end of the children list by default.
            // We must call setSiblingIndex() to apply the specific drag position.
            gameObject.setSiblingIndex(index);
            
            // Optional: Fire hierarchy change event if other systems need to know
            // this.events.fire('hierarchy.modified'); 
        });
    }
    /**
     * Update selection without rebuilding tree
     */
    private updateSelection(gameObject: GameObject | null): void {
        if (this.updatingSelection) return;
        this.updatingSelection = true;
        // console.log('Updating selection to:', gameObject?.name);

        // 1. Deselect the previously selected item
        if (this.lastSelectedItem && this.lastSelectedItem.parent) {
             this.lastSelectedItem.selected = false;
        }

        // 2. Select the new item
        if (gameObject) {
            const item = this.gameObjectToItem.get(gameObject);
            if (item) {
                item.selected = true;
                this.lastSelectedItem = item;
            } else {
                this.lastSelectedItem = null;
            }
        } else {
            this.lastSelectedItem = null;
        }

        this.updatingSelection = false;
    }
    /**
     * Rebuild tree from scene
     * Called manually when needed (same pattern as 7.1)
     */
    public refresh(): void {
        this.treeView.clearTreeItems();
        this.treeRoot = new TreeViewItem({ text: 'Scene' });
        this.treeView.append(this.treeRoot);
        this.gameObjectToItem.clear();
        this.itemToGameObject.clear();
        this.lastSelectedItem = null

        if (!this.scene) return;

        const roots = this.scene.getRootGameObjects();

        for (const root of roots) {
            this.addGameObject(root, this.treeRoot);
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
            // allowSelect: true,
            // allowDrop: true,
        });

        // Store mappings for quick lookup
        this.gameObjectToItem.set(gameObject, item);
        this.itemToGameObject.set(item, gameObject);

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
