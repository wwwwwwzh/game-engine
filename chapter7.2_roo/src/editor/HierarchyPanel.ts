import type { EditorUI } from './EditorUI';
import { GameObject } from '../core/GameObject';
import { MeshRenderer } from '../components/MeshRenderer';
import * as THREE from 'three/webgpu';
import { Scene } from '../core/Scene';

// Import PCUI components
import { TreeView, TreeViewItem } from '@playcanvas/pcui';

interface DragState {
    dragging: GameObject | null;
    dropTarget: GameObject | null;
    dropPosition: 'above' | 'below' | 'child' | null;
}

/**
 * HierarchyPanel with drag-and-drop support for reparenting.
 */
export class HierarchyPanel {
    private editorUI: EditorUI;
    private scene: Scene | null;
    private treeView: TreeView;
    private dragState: DragState = {
        dragging: null,
        dropTarget: null,
        dropPosition: null
    };
    private expandedNodes: Set<string> = new Set();
    private treeItems: Map<string, TreeViewItem> = new Map();

    constructor(editorUI: EditorUI, scene: Scene | null) {
        this.editorUI = editorUI;
        this.scene = scene;

        // Create PCUI TreeView
        this.treeView = new TreeView({
            allowRenaming: true,
            allowReordering: true,
            allowDrag: true
        });

        // Handle reordering (drag-and-drop)
        this.treeView.on('reorder', (movedItem: TreeViewItem, targetItem: TreeViewItem, type: string) => {
            // Find the GameObjects
            const movedGo = this.findGameObjectForTreeItem(movedItem);
            const targetGo = this.findGameObjectForTreeItem(targetItem);

            if (!movedGo || !targetGo) return;

            switch (type) {
                case 'before':
                    // Insert before target
                    movedGo.setParent(targetGo.parent);
                    movedGo.setSiblingIndex(targetGo.getSiblingIndex());
                    break;
                case 'after':
                    // Insert after target
                    movedGo.setParent(targetGo.parent);
                    movedGo.setSiblingIndex(targetGo.getSiblingIndex() + 1);
                    break;
                case 'into':
                    // Make child of target
                    movedGo.setParent(targetGo);
                    this.expandedNodes.add(targetGo.id);
                    break;
            }

            // Refresh to update the tree
            this.refresh();
        });

        // Append to hierarchy content
        const contentElement = document.getElementById('hierarchy-content') as HTMLElement;
        if (contentElement) {
            contentElement.appendChild(this.treeView.dom);
        }

        // Listen for scene changes from project
        this.editorUI.getEngine().events.on('project.sceneChanged', (data: any) => {
            this.scene = data.scene;
            this.refresh();
        });
    }

    public refresh(): void {
        // Clear existing items
        this.treeView.clear();
        this.treeItems.clear();

        if (!this.scene) {
            // Could add an empty state item, but for now just leave empty
            return;
        }

        const rootObjects = this.scene.getRootGameObjects();

        if (rootObjects.length === 0) {
            // Could add an empty state item
            return;
        }

        // Create tree items for root objects
        for (const go of rootObjects) {
            const treeItem = this.createTreeItem(go);
            this.treeView.append(treeItem);
        }
    }

    private createTreeItem(go: GameObject): TreeViewItem {
        const icon = go.children.length > 0 ? 'E139' : 'E208'; // Folder or file icon
        const allowDrop = go.children.length > 0; // Allow dropping on folders

        const treeItem = new TreeViewItem({
            text: go.name,
            icon: icon,
            allowDrop: allowDrop
        });

        // Store reference for later updates
        this.treeItems.set(go.id, treeItem);

        // Click to select
        treeItem.on('select', () => {
            this.editorUI.getEngine().events.fire('selection.set', go);
        });

        // Rename handling
        treeItem.on('rename', (newName: string) => {
            go.name = newName;
            this.editorUI.refreshInspector();
        });

        // Add children recursively
        for (const child of go.children) {
            const childItem = this.createTreeItem(child);
            treeItem.append(childItem);
        }

        // Set expanded state
        treeItem.open = this.expandedNodes.has(go.id);

        // Handle expand/collapse
        treeItem.on('open', () => {
            this.expandedNodes.add(go.id);
        });

        treeItem.on('close', () => {
            this.expandedNodes.delete(go.id);
        });

        return treeItem;
    }

    private findGameObjectForTreeItem(treeItem: TreeViewItem): GameObject | null {
        for (const [goId, item] of this.treeItems.entries()) {
            if (item === treeItem) {
                if (!this.scene) return null;
                return this.scene.findById(goId);
            }
        }
        return null;
    }

    // PCUI handles drag-and-drop internally with allowReordering and allowDrag
    // Context menu can be implemented later if needed

    private duplicateObject(go: GameObject): void {
        // Simple duplication - copies name and transform
        const scene = this.editorUI.getEngine().getScene();
        if (!scene) return;

        const duplicate = new (go.constructor as any)(go.name + ' (Copy)');
        duplicate.transform.localPosition.copy(go.transform.localPosition);
        duplicate.transform.localRotation.copy(go.transform.localRotation);
        duplicate.transform.localScale.copy(go.transform.localScale);

        // Copy MeshRenderer if present
        const renderer = go.getComponent(MeshRenderer);
        if (renderer) {
            const newRenderer = duplicate.addComponent(new (MeshRenderer)());
            // Clone geometry and material
            if ((renderer as any).mesh) {
                const mesh = (renderer as any).mesh as THREE.Mesh;
                newRenderer.setGeometry(mesh.geometry.clone());
                newRenderer.setMaterial((mesh.material as THREE.Material).clone());
            }
        }

        duplicate.setParent(go.parent);
        scene.addGameObject(duplicate);
        this.refresh();
    }

    private createEmptyChild(go: GameObject): void {
        const scene = this.editorUI.getEngine().getScene();
        if (!scene) return;

        const child = new GameObject('Empty');
        child.setParent(go, false);
        scene.addGameObject(child);
        this.expandedNodes.add(go.id);
        this.refresh();
    }

    private deleteObject(go: GameObject): void {
        const selectedObject = this.scene!.events.invoke('selection.get') as GameObject | null;
        if (selectedObject && go.id === selectedObject.id) {
            this.editorUI.getEngine().events.fire('selection.clear');
        }
        go.destroy();
        this.refresh();
    }
}
