import type { EditorUI } from './EditorUI';
import { GameObject } from '../core/GameObject';
import { MeshRenderer } from '../components/MeshRenderer';
import * as THREE from 'three/webgpu';
import { Scene } from '../core/Scene';

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
    private contentElement: HTMLElement;
    private dragState: DragState = {
        dragging: null,
        dropTarget: null,
        dropPosition: null
    };
    private expandedNodes: Set<string> = new Set();

    constructor(editorUI: EditorUI, scene: Scene | null) {
        this.editorUI = editorUI;
        this.scene = scene;
        this.contentElement = document.getElementById('hierarchy-content') as HTMLElement;

        // Handle drop on empty space (make root)
        this.contentElement.addEventListener('dragover', (e) => {
            if (e.target === this.contentElement) {
                e.preventDefault();
            }
        });

        this.contentElement.addEventListener('drop', (e) => {
            if (e.target === this.contentElement && this.dragState.dragging) {
                e.preventDefault();
                this.dragState.dragging.setParent(null);
                this.dragState.dragging = null;
                this.refresh();
            }
        });

        // Listen for scene changes from project
        this.editorUI.getEngine().events.on('project.sceneChanged', (data: any) => {
            this.scene = data.scene;
            this.refresh();
        });
    }

    public refresh(): void {
        if (!this.scene) {
            this.contentElement.innerHTML = '<div class="empty-state">No scene loaded</div>';
            return;
        }

        const rootObjects = this.scene.getRootGameObjects();

        this.contentElement.innerHTML = '';

        if (rootObjects.length === 0) {
            this.contentElement.innerHTML = '<div class="empty-state">No objects in scene</div>';
            return;
        }

        // Render tree
        for (const go of rootObjects) {
            const node = this.createTreeNode(go, 0);
            this.contentElement.appendChild(node);
        }

        // Add root drop zone
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone-root';
        dropZone.textContent = 'Drop here to make root';
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-active');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-active');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.dragState.dragging) {
                this.dragState.dragging.setParent(null);
                this.dragState.dragging = null;
                this.refresh();
            }
        });
        this.contentElement.appendChild(dropZone);
    }

    private createTreeNode(go: GameObject, depth: number): HTMLElement {
        const node = document.createElement('div');
        node.className = 'tree-node';
        node.dataset.id = go.id;

        const item = this.createTreeItem(go, depth);
        node.appendChild(item);

        // Children container
        if (go.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children';

            if (!this.expandedNodes.has(go.id)) {
                childrenContainer.classList.add('collapsed');
            }

            for (const child of go.children) {
                childrenContainer.appendChild(this.createTreeNode(child, depth + 1));
            }

            node.appendChild(childrenContainer);
        }

        return node;
    }

    private createTreeItem(go: GameObject, depth: number): HTMLElement {
        const item = document.createElement('div');
        item.className = 'tree-item';
        item.style.paddingLeft = `${depth * 16 + 8}px`;
        item.draggable = true;

        const selectedObject = this.scene!.events.invoke('selection.get') as GameObject | null;
        if (selectedObject && go.id === selectedObject.id) {
            item.classList.add('selected');
        }

        // Toggle arrow
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        if (go.children.length > 0) {
            toggle.classList.add('has-children');
            toggle.textContent = this.expandedNodes.has(go.id) ? '▼' : '▶';
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleExpanded(go.id);
            });
        }
        item.appendChild(toggle);

        // Icon
        const icon = document.createElement('span');
        icon.className = 'tree-icon';
        icon.textContent = go.children.length > 0 ? '📁' : '📦';
        item.appendChild(icon);

        // Name
        const name = document.createElement('span');
        name.className = 'tree-name';
        name.textContent = go.name;
        item.appendChild(name);

        // Click to select
        item.addEventListener('click', () => {
            this.editorUI.getEngine().events.fire('selection.set', go);
        });

        // Double-click to rename
        item.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.startRename(item, go);
        });

        // Right-click context menu
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, go);
        });

        // Drag events
        this.setupDragEvents(item, go);

        return item;
    }

    private setupDragEvents(item: HTMLElement, go: GameObject): void {
        item.addEventListener('dragstart', (e) => {
            this.dragState.dragging = go;
            item.classList.add('dragging');
            e.dataTransfer!.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            this.dragState.dragging = null;
            item.classList.remove('dragging');
            this.clearAllDropIndicators();
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!this.dragState.dragging || this.dragState.dragging === go) return;
            if (this.dragState.dragging.isAncestorOf(go)) return;

            const rect = item.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const height = rect.height;

            this.clearAllDropIndicators();

            if (y < height * 0.25) {
                // Drop above
                item.classList.add('drag-over-above');
                this.dragState.dropPosition = 'above';
            } else if (y > height * 0.75) {
                // Drop below
                item.classList.add('drag-over-below');
                this.dragState.dropPosition = 'below';
            } else {
                // Drop as child
                item.classList.add('drag-over-child');
                this.dragState.dropPosition = 'child';
            }

            this.dragState.dropTarget = go;
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over-above', 'drag-over-below', 'drag-over-child');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!this.dragState.dragging || !this.dragState.dropTarget) return;
            if (this.dragState.dragging === this.dragState.dropTarget) return;

            const dragged = this.dragState.dragging;
            const target = this.dragState.dropTarget;

            switch (this.dragState.dropPosition) {
                case 'child':
                    dragged.setParent(target);
                    this.expandedNodes.add(target.id);
                    break;

                case 'above':
                case 'below':
                    // Same parent as target
                    dragged.setParent(target.parent);
                    // Adjust sibling order
                    const targetIndex = target.getSiblingIndex();
                    const newIndex = this.dragState.dropPosition === 'above'
                        ? targetIndex
                        : targetIndex + 1;
                    dragged.setSiblingIndex(newIndex);
                    break;
            }

            this.dragState = { dragging: null, dropTarget: null, dropPosition: null };
            this.refresh();
        });
    }

    private clearAllDropIndicators(): void {
        const items = this.contentElement.querySelectorAll('.tree-item');
        items.forEach(item => {
            item.classList.remove('drag-over-above', 'drag-over-below', 'drag-over-child');
        });
    }

    private toggleExpanded(id: string): void {
        if (this.expandedNodes.has(id)) {
            this.expandedNodes.delete(id);
        } else {
            this.expandedNodes.add(id);
        }
        this.refresh();
    }

    private startRename(item: HTMLElement, go: GameObject): void {
        const nameSpan = item.querySelector('.tree-name') as HTMLElement;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tree-name-input';
        input.value = go.name;

        nameSpan.replaceWith(input);
        input.focus();
        input.select();

        const finishRename = () => {
            const newName = input.value.trim() || go.name;
            go.name = newName;
            this.refresh();
            this.editorUI.refreshInspector();
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishRename();
            if (e.key === 'Escape') this.refresh();
        });
    }

    private showContextMenu(e: MouseEvent, go: GameObject): void {
        // Remove existing menu
        document.querySelector('.context-menu')?.remove();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        const items = [
            { label: '📝 Rename', action: () => {
                const item = this.contentElement.querySelector(`[data-id="${go.id}"] > .tree-item`);
                if (item) this.startRename(item as HTMLElement, go);
            }},
            { label: '📋 Duplicate', action: () => this.duplicateObject(go) },
            { label: '📁 Create Empty Child', action: () => this.createEmptyChild(go) },
            { separator: true },
            { label: '🗑️ Delete', action: () => this.deleteObject(go), danger: true }
        ];

        for (const itemDef of items) {
            if (itemDef.separator) {
                const sep = document.createElement('div');
                sep.className = 'context-menu-separator';
                menu.appendChild(sep);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                if (itemDef.danger) menuItem.classList.add('danger');
                menuItem.textContent = itemDef.label!;
                menuItem.addEventListener('click', () => {
                    itemDef.action!();
                    menu.remove();
                });
                menu.appendChild(menuItem);
            }
        }

        document.body.appendChild(menu);

        // Close on click outside
        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

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
