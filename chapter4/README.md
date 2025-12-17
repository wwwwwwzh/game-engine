# Chapter 4: Scene Management + Scene Editor

In Chapter 3, we built GameObjects, Components, and a basic editor. Now we'll make the hierarchy truly useful with drag-and-drop parent-child relationships, scene serialization, and multiple scene support.

## What You'll Learn

- **Hierarchical Transforms**: How child objects inherit parent transformations
- **Drag-and-Drop Hierarchy**: Reparenting objects visually
- **Scene Serialization**: Saving and loading scenes as JSON
- **Multiple Scenes**: Switching between levels
- **Editor Enhancements**: Context menus, renaming, deletion

## Understanding Hierarchical Transforms

When you parent one object to another, the child's transform becomes **relative to the parent**. This is fundamental to game development.

### Local vs. World Space

```
World Space: Absolute coordinates in the scene
Local Space: Coordinates relative to parent

Example:
- Parent at position (5, 0, 0)
- Child at LOCAL position (2, 0, 0)
- Child's WORLD position = (7, 0, 0)
```

**Why this matters:**
- A car's wheels are children of the car body
- Move the car → wheels move with it
- Rotate the wheels locally → they spin without affecting the car

### The Transform Hierarchy

```
Scene Root
├── Car (world pos: 10, 0, 0)
│   ├── Body (local pos: 0, 0, 0) → world: 10, 0, 0
│   ├── Wheel_FL (local pos: -1, -0.5, 1) → world: 9, -0.5, 1
│   └── Wheel_FR (local pos: 1, -0.5, 1) → world: 11, -0.5, 1
└── Tree (world pos: 20, 0, 5)
```

Moving the Car to (15, 0, 0) automatically moves all children.

## Implementing Hierarchical Transforms

First, let's enhance the Transform component to support local/world space conversions.

### Enhanced Transform

Update `src/core/Transform.ts`:

```typescript
import * as THREE from 'three';
import { Component } from './Component';

/**
 * Transform component handles position, rotation, and scale.
 * Supports hierarchical transforms (local vs. world space).
 */
export class Transform extends Component {
    // Local space values (relative to parent)
    private _localPosition: THREE.Vector3 = new THREE.Vector3();
    private _localRotation: THREE.Euler = new THREE.Euler();
    private _localScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
    
    // Cached world matrix
    private _worldMatrix: THREE.Matrix4 = new THREE.Matrix4();
    private _worldMatrixDirty: boolean = true;
    
    public getTypeName(): string {
        return 'Transform';
    }
    
    // ===== LOCAL SPACE (relative to parent) =====
    
    public get localPosition(): THREE.Vector3 {
        return this._localPosition;
    }
    
    public set localPosition(value: THREE.Vector3) {
        this._localPosition.copy(value);
        this.markDirty();
    }
    
    public get localRotation(): THREE.Euler {
        return this._localRotation;
    }
    
    public set localRotation(value: THREE.Euler) {
        this._localRotation.copy(value);
        this.markDirty();
    }
    
    public get localScale(): THREE.Vector3 {
        return this._localScale;
    }
    
    public set localScale(value: THREE.Vector3) {
        this._localScale.copy(value);
        this.markDirty();
    }
    
    // ===== WORLD SPACE (absolute) =====
    
    /**
     * Get world position (absolute position in scene)
     */
    public get position(): THREE.Vector3 {
        if (!this.gameObject?.parent) {
            return this._localPosition;
        }
        
        const worldPos = new THREE.Vector3();
        this.getWorldMatrix().decompose(worldPos, new THREE.Quaternion(), new THREE.Vector3());
        return worldPos;
    }
    
    /**
     * Set world position
     */
    public set position(value: THREE.Vector3) {
        if (!this.gameObject?.parent) {
            this._localPosition.copy(value);
        } else {
            // Convert world position to local
            const parentWorldMatrix = this.gameObject.parent.transform.getWorldMatrix();
            const parentInverse = parentWorldMatrix.clone().invert();
            const localPos = value.clone().applyMatrix4(parentInverse);
            this._localPosition.copy(localPos);
        }
        this.markDirty();
    }
    
    /**
     * Get the local transformation matrix
     */
    public getLocalMatrix(): THREE.Matrix4 {
        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion().setFromEuler(this._localRotation);
        matrix.compose(this._localPosition, quaternion, this._localScale);
        return matrix;
    }
    
    /**
     * Get the world transformation matrix
     */
    public getWorldMatrix(): THREE.Matrix4 {
        if (this._worldMatrixDirty) {
            this.updateWorldMatrix();
        }
        return this._worldMatrix;
    }
    
    /**
     * Update the cached world matrix
     */
    private updateWorldMatrix(): void {
        const localMatrix = this.getLocalMatrix();
        
        if (this.gameObject?.parent) {
            const parentMatrix = this.gameObject.parent.transform.getWorldMatrix();
            this._worldMatrix.multiplyMatrices(parentMatrix, localMatrix);
        } else {
            this._worldMatrix.copy(localMatrix);
        }
        
        this._worldMatrixDirty = false;
    }
    
    /**
     * Mark the world matrix as needing recalculation
     */
    public markDirty(): void {
        this._worldMatrixDirty = true;
        
        // Mark all children dirty too
        if (this.gameObject) {
            for (const child of this.gameObject.children) {
                child.transform.markDirty();
            }
        }
    }
    
    // ===== CONVENIENCE ACCESSORS =====
    // For backward compatibility, position/rotation/scale map to local values
    
    public get rotation(): THREE.Euler {
        return this._localRotation;
    }
    
    public set rotation(value: THREE.Euler) {
        this._localRotation.copy(value);
        this.markDirty();
    }
    
    public get scale(): THREE.Vector3 {
        return this._localScale;
    }
    
    public set scale(value: THREE.Vector3) {
        this._localScale.copy(value);
        this.markDirty();
    }
}
```

## Enhanced GameObject Hierarchy

Update `src/core/GameObject.ts` to properly manage reparenting:

```typescript
import { Component } from './Component';
import { Transform } from './Transform';
import type { Scene } from './Scene';

let nextId = 1;

export class GameObject {
    public readonly id: string;
    public name: string;
    public tag: string = 'Untagged';
    public scene: Scene | null = null;
    
    private _active: boolean = true;
    private _parent: GameObject | null = null;
    private _children: GameObject[] = [];
    private components: Component[] = [];
    
    public readonly transform: Transform;
    
    constructor(name: string = 'GameObject') {
        this.id = `go_${nextId++}`;
        this.name = name;
        
        // Transform is always present
        this.transform = new Transform();
        this.transform.gameObject = this;
        this.components.push(this.transform);
    }
    
    public get active(): boolean {
        return this._active;
    }
    
    public set active(value: boolean) {
        this._active = value;
    }
    
    // ===== COMPONENT METHODS =====
    
    public addComponent<T extends Component>(component: T): T {
        component.gameObject = this;
        this.components.push(component);
        component.awake();
        return component;
    }
    
    public getComponent<T extends Component>(type: new () => T): T | null {
        for (const component of this.components) {
            if (component instanceof type) {
                return component as T;
            }
        }
        return null;
    }
    
    public removeComponent(component: Component): void {
        if (component instanceof Transform) {
            console.warn('Cannot remove Transform component');
            return;
        }
        
        const index = this.components.indexOf(component);
        if (index !== -1) {
            component.onDestroy();
            this.components.splice(index, 1);
        }
    }
    
    public getAllComponents(): Component[] {
        return [...this.components];
    }
    
    public _internalUpdate(deltaTime: number): void {
        if (!this._active) return;
        
        for (const component of this.components) {
            component._internalUpdate(deltaTime);
        }
    }
    
    public destroy(): void {
        // Destroy all children first
        for (const child of [...this._children]) {
            child.destroy();
        }
        
        // Remove from parent
        if (this._parent) {
            this._parent._removeChild(this);
        }
        
        // Destroy components
        for (const component of [...this.components]) {
            component.onDestroy();
        }
        this.components = [];
        
        // Remove from scene
        if (this.scene) {
            this.scene.removeGameObject(this);
        }
    }
    
    // ===== HIERARCHY METHODS =====
    
    public get parent(): GameObject | null {
        return this._parent;
    }
    
    /**
     * Set parent with optional world position preservation
     */
    public setParent(newParent: GameObject | null, worldPositionStays: boolean = true): void {
        if (newParent === this) {
            console.warn('Cannot parent object to itself');
            return;
        }
        
        // Check for circular reference
        if (newParent && this.isAncestorOf(newParent)) {
            console.warn('Cannot create circular parent reference');
            return;
        }
        
        // Store world position if needed
        const worldPos = worldPositionStays ? this.transform.position.clone() : null;
        
        // Remove from old parent
        if (this._parent) {
            this._parent._removeChild(this);
        }
        
        // Update scene's root list
        if (this.scene) {
            if (this._parent === null && newParent !== null) {
                // Was root, now has parent
                this.scene._removeFromRoots(this);
            } else if (this._parent !== null && newParent === null) {
                // Had parent, now root
                this.scene._addToRoots(this);
            }
        }
        
        // Set new parent
        this._parent = newParent;
        
        // Add to new parent
        if (newParent) {
            newParent._addChild(this);
        }
        
        // Restore world position
        if (worldPos) {
            this.transform.position = worldPos;
        }
        
        // Mark transform dirty
        this.transform.markDirty();
    }
    
    /**
     * Check if this object is an ancestor of another
     */
    public isAncestorOf(other: GameObject): boolean {
        let current = other.parent;
        while (current) {
            if (current === this) return true;
            current = current.parent;
        }
        return false;
    }
    
    public get children(): ReadonlyArray<GameObject> {
        return this._children;
    }
    
    public getChild(name: string): GameObject | null {
        return this._children.find(c => c.name === name) || null;
    }
    
    public findChild(name: string): GameObject | null {
        for (const child of this._children) {
            if (child.name === name) return child;
            const found = child.findChild(name);
            if (found) return found;
        }
        return null;
    }
    
    /**
     * Get sibling index (position among siblings)
     */
    public getSiblingIndex(): number {
        if (!this._parent) {
            return this.scene?.getRootGameObjects().indexOf(this) ?? 0;
        }
        return this._parent._children.indexOf(this);
    }
    
    /**
     * Set sibling index (reorder among siblings)
     */
    public setSiblingIndex(index: number): void {
        const siblings = this._parent ? this._parent._children : 
            (this.scene?.getRootGameObjects() as GameObject[] || []);
        
        const currentIndex = siblings.indexOf(this);
        if (currentIndex === -1) return;
        
        // Remove from current position
        siblings.splice(currentIndex, 1);
        
        // Insert at new position
        index = Math.max(0, Math.min(index, siblings.length));
        siblings.splice(index, 0, this);
    }
    
    // Internal methods for parent/child management
    public _addChild(child: GameObject): void {
        if (!this._children.includes(child)) {
            this._children.push(child);
        }
    }
    
    public _removeChild(child: GameObject): void {
        const index = this._children.indexOf(child);
        if (index !== -1) {
            this._children.splice(index, 1);
        }
    }
}
```

## Enhanced Scene Class

Update `src/core/Scene.ts` to support hierarchy operations:

```typescript
import { GameObject } from './GameObject';
import type { Component } from './Component';

export class Scene {
    public name: string;
    private rootGameObjects: GameObject[] = [];
    private allGameObjects: Map<string, GameObject> = new Map();
    private _loaded: boolean = false;
    
    constructor(name: string = 'Untitled Scene') {
        this.name = name;
    }
    
    public get loaded(): boolean {
        return this._loaded;
    }
    
    public addGameObject(gameObject: GameObject): void {
        gameObject.scene = this;
        this.allGameObjects.set(gameObject.id, gameObject);
        
        if (!gameObject.parent) {
            this.rootGameObjects.push(gameObject);
        }
        
        // Also register all children
        for (const child of gameObject.children) {
            this.addGameObject(child);
        }
    }
    
    public removeGameObject(gameObject: GameObject): void {
        this.allGameObjects.delete(gameObject.id);
        
        const rootIndex = this.rootGameObjects.indexOf(gameObject);
        if (rootIndex !== -1) {
            this.rootGameObjects.splice(rootIndex, 1);
        }
        
        gameObject.scene = null;
    }
    
    // Methods for GameObject reparenting
    public _addToRoots(gameObject: GameObject): void {
        if (!this.rootGameObjects.includes(gameObject)) {
            this.rootGameObjects.push(gameObject);
        }
    }
    
    public _removeFromRoots(gameObject: GameObject): void {
        const index = this.rootGameObjects.indexOf(gameObject);
        if (index !== -1) {
            this.rootGameObjects.splice(index, 1);
        }
    }
    
    public find(name: string): GameObject | null {
        for (const go of this.allGameObjects.values()) {
            if (go.name === name) return go;
        }
        return null;
    }
    
    public findById(id: string): GameObject | null {
        return this.allGameObjects.get(id) || null;
    }
    
    public findByTag(tag: string): GameObject[] {
        return Array.from(this.allGameObjects.values()).filter(go => go.tag === tag);
    }
    
    public getRootGameObjects(): GameObject[] {
        return this.rootGameObjects;
    }
    
    public getAllGameObjects(): GameObject[] {
        return Array.from(this.allGameObjects.values());
    }
    
    public update(deltaTime: number): void {
        // Only update root objects; they'll update their children
        for (const go of this.rootGameObjects) {
            this.updateGameObject(go, deltaTime);
        }
    }
    
    private updateGameObject(go: GameObject, deltaTime: number): void {
        go._internalUpdate(deltaTime);
        for (const child of go.children) {
            this.updateGameObject(child, deltaTime);
        }
    }
    
    public load(): void {
        this._loaded = true;
    }
    
    public unload(): void {
        for (const go of [...this.allGameObjects.values()]) {
            go.destroy();
        }
        this.rootGameObjects = [];
        this.allGameObjects.clear();
        this._loaded = false;
    }
    
    public clear(): void {
        for (const go of [...this.allGameObjects.values()]) {
            go.destroy();
        }
        this.rootGameObjects = [];
        this.allGameObjects.clear();
    }
}
```

## Scene Serialization

Now let's implement saving and loading scenes as JSON.

### SceneSerializer

Create `src/core/SceneSerializer.ts`:

```typescript
import { Scene } from './Scene';
import { GameObject } from './GameObject';
import { MeshRenderer } from '../components/MeshRenderer';
import * as THREE from 'three';

/**
 * Handles converting scenes to/from JSON format.
 */
export class SceneSerializer {
    /**
     * Serialize a scene to JSON
     */
    public static serialize(scene: Scene): string {
        const data = {
            name: scene.name,
            gameObjects: scene.getRootGameObjects().map(go => this.serializeGameObject(go))
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Serialize a single GameObject and its children
     */
    private static serializeGameObject(go: GameObject): any {
        const transform = go.transform;
        
        const data: any = {
            name: go.name,
            tag: go.tag,
            active: go.active,
            transform: {
                position: {
                    x: transform.localPosition.x,
                    y: transform.localPosition.y,
                    z: transform.localPosition.z
                },
                rotation: {
                    x: transform.localRotation.x,
                    y: transform.localRotation.y,
                    z: transform.localRotation.z
                },
                scale: {
                    x: transform.localScale.x,
                    y: transform.localScale.y,
                    z: transform.localScale.z
                }
            },
            components: [],
            children: go.children.map(child => this.serializeGameObject(child))
        };
        
        // Serialize components (skip Transform, it's handled separately)
        for (const component of go.getAllComponents()) {
            if (component.getTypeName() === 'Transform') continue;
            
            const componentData = this.serializeComponent(component);
            if (componentData) {
                data.components.push(componentData);
            }
        }
        
        return data;
    }
    
    /**
     * Serialize a component
     */
    private static serializeComponent(component: any): any {
        const typeName = component.getTypeName();
        
        if (typeName === 'MeshRenderer') {
            return {
                type: 'MeshRenderer',
                geometryType: component.geometryType || 'box',
                color: component.material?.color?.getHex() || 0x00ff00
            };
        }
        
        // Add more component types as needed
        return null;
    }
    
    /**
     * Deserialize JSON into a scene
     */
    public static deserialize(json: string, scene: Scene): void {
        const data = JSON.parse(json);
        
        scene.name = data.name;
        scene.clear();
        
        for (const goData of data.gameObjects) {
            const gameObject = this.deserializeGameObject(goData, null);
            scene.addGameObject(gameObject);
        }
    }
    
    /**
     * Deserialize a single GameObject
     */
    private static deserializeGameObject(data: any, parent: GameObject | null): GameObject {
        const go = new GameObject(data.name);
        go.tag = data.tag || 'Untagged';
        go.active = data.active !== false;
        
        // Set transform
        if (data.transform) {
            const t = data.transform;
            go.transform.localPosition.set(t.position.x, t.position.y, t.position.z);
            go.transform.localRotation.set(t.rotation.x, t.rotation.y, t.rotation.z);
            go.transform.localScale.set(t.scale.x, t.scale.y, t.scale.z);
        }
        
        // Add components
        for (const compData of data.components || []) {
            this.deserializeComponent(go, compData);
        }
        
        // Set parent
        if (parent) {
            go.setParent(parent, false);
        }
        
        // Deserialize children
        for (const childData of data.children || []) {
            this.deserializeGameObject(childData, go);
        }
        
        return go;
    }
    
    /**
     * Deserialize a component and add to GameObject
     */
    private static deserializeComponent(go: GameObject, data: any): void {
        if (data.type === 'MeshRenderer') {
            const renderer = go.addComponent(new MeshRenderer());
            
            // Create geometry based on type
            let geometry: THREE.BufferGeometry;
            switch (data.geometryType) {
                case 'sphere':
                    geometry = new THREE.SphereGeometry(0.5, 32, 32);
                    break;
                case 'box':
                default:
                    geometry = new THREE.BoxGeometry(1, 1, 1);
            }
            
            const material = new THREE.MeshPhongMaterial({
                color: data.color || 0x00ff00,
                shininess: 100
            });
            
            renderer.setGeometry(geometry);
            renderer.setMaterial(material);
            (renderer as any).geometryType = data.geometryType || 'box';
        }
        
        // Add more component types here
    }
}
```

## Drag-and-Drop Hierarchy Panel

Now the exciting part: making the hierarchy panel support drag-and-drop for reparenting!

### Enhanced HierarchyPanel

Create `src/editor/HierarchyPanel.ts`:

```typescript
import type { EditorUI } from './EditorUI';
import type { GameObject } from '../core/GameObject';

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
    private contentElement: HTMLElement;
    private dragState: DragState = {
        dragging: null,
        dropTarget: null,
        dropPosition: null
    };
    private expandedNodes: Set<string> = new Set();
    
    constructor(editorUI: EditorUI) {
        this.editorUI = editorUI;
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
    }
    
    public refresh(): void {
        const scene = this.editorUI.getEngine().getScene();
        
        if (!scene) {
            this.contentElement.innerHTML = '<div class="empty-state">No scene loaded</div>';
            return;
        }
        
        const rootObjects = scene.getRootGameObjects();
        
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
        
        if (go.id === this.editorUI.getSelectedObjectId()) {
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
            this.editorUI.selectObject(go.id);
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
        const renderer = go.getComponent(require('../components/MeshRenderer').MeshRenderer);
        if (renderer) {
            const newRenderer = duplicate.addComponent(new (require('../components/MeshRenderer').MeshRenderer)());
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
        
        const { GameObject } = require('../core/GameObject');
        const child = new GameObject('Empty');
        child.setParent(go, false);
        scene.addGameObject(child);
        this.expandedNodes.add(go.id);
        this.refresh();
    }
    
    private deleteObject(go: GameObject): void {
        if (go.id === this.editorUI.getSelectedObjectId()) {
            this.editorUI.selectObject(null);
        }
        go.destroy();
        this.refresh();
    }
}
```

## Updated EditorUI

Update `src/editor/EditorUI.ts` to include scene save/load:

```typescript
import type { Engine } from '../core/Engine';
import { HierarchyPanel } from './HierarchyPanel';
import { InspectorPanel } from './InspectorPanel';
import { SceneSerializer } from '../core/SceneSerializer';
import { GameObjectFactory } from '../core/GameObjectFactory';

export class EditorUI {
    private engine: Engine;
    private hierarchyPanel: HierarchyPanel;
    private inspectorPanel: InspectorPanel;
    
    private playButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private addCubeButton: HTMLButtonElement;
    private addSphereButton: HTMLButtonElement;
    private addEmptyButton: HTMLButtonElement;
    private saveButton: HTMLButtonElement;
    private loadButton: HTMLButtonElement;
    private modeElement: HTMLElement;
    
    private selectedObjectId: string | null = null;
    
    constructor(engine: Engine) {
        this.engine = engine;
        
        this.playButton = document.getElementById('play-btn') as HTMLButtonElement;
        this.stopButton = document.getElementById('stop-btn') as HTMLButtonElement;
        this.addCubeButton = document.getElementById('add-cube-btn') as HTMLButtonElement;
        this.addSphereButton = document.getElementById('add-sphere-btn') as HTMLButtonElement;
        this.addEmptyButton = document.getElementById('add-empty-btn') as HTMLButtonElement;
        this.saveButton = document.getElementById('save-btn') as HTMLButtonElement;
        this.loadButton = document.getElementById('load-btn') as HTMLButtonElement;
        this.modeElement = document.getElementById('mode') as HTMLElement;
        
        this.hierarchyPanel = new HierarchyPanel(this);
        this.inspectorPanel = new InspectorPanel(this);
        
        this.setupEventListeners();
        
        console.log('🎨 Editor UI initialized');
    }
    
    private setupEventListeners(): void {
        this.playButton.addEventListener('click', () => this.onPlay());
        this.stopButton.addEventListener('click', () => this.onStop());
        this.addCubeButton.addEventListener('click', () => this.onAddCube());
        this.addSphereButton.addEventListener('click', () => this.onAddSphere());
        this.addEmptyButton.addEventListener('click', () => this.onAddEmpty());
        this.saveButton.addEventListener('click', () => this.onSave());
        this.loadButton.addEventListener('click', () => this.onLoad());
    }
    
    private onPlay(): void {
        this.engine.play();
        this.playButton.disabled = true;
        this.stopButton.disabled = false;
        this.modeElement.textContent = 'PLAYING';
        this.setEditingEnabled(false);
    }
    
    private onStop(): void {
        this.engine.stop();
        this.playButton.disabled = false;
        this.stopButton.disabled = true;
        this.modeElement.textContent = 'EDITOR';
        this.setEditingEnabled(true);
    }
    
    private setEditingEnabled(enabled: boolean): void {
        this.addCubeButton.disabled = !enabled;
        this.addSphereButton.disabled = !enabled;
        this.addEmptyButton.disabled = !enabled;
        this.saveButton.disabled = !enabled;
        this.loadButton.disabled = !enabled;
    }
    
    private onAddCube(): void {
        const scene = this.engine.getScene();
        if (!scene) return;
        
        const cube = GameObjectFactory.createCube();
        scene.addGameObject(cube);
        this.selectObject(cube.id);
        this.refresh();
    }
    
    private onAddSphere(): void {
        const scene = this.engine.getScene();
        if (!scene) return;
        
        const sphere = GameObjectFactory.createSphere();
        scene.addGameObject(sphere);
        this.selectObject(sphere.id);
        this.refresh();
    }
    
    private onAddEmpty(): void {
        const scene = this.engine.getScene();
        if (!scene) return;
        
        const { GameObject } = require('../core/GameObject');
        const empty = new GameObject('Empty');
        scene.addGameObject(empty);
        this.selectObject(empty.id);
        this.refresh();
    }
    
    private onSave(): void {
        const scene = this.engine.getScene();
        if (!scene) return;
        
        const json = SceneSerializer.serialize(scene);
        
        // Download as file
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scene.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('💾 Scene saved:', scene.name);
    }
    
    private onLoad(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;
            
            const json = await file.text();
            const scene = this.engine.getScene();
            if (!scene) return;
            
            SceneSerializer.deserialize(json, scene);
            this.engine.syncSceneToThree();
            this.selectObject(null);
            this.refresh();
            
            console.log('📂 Scene loaded:', scene.name);
        });
        
        input.click();
    }
    
    public getEngine(): Engine {
        return this.engine;
    }
    
    public selectObject(objectId: string | null): void {
        this.selectedObjectId = objectId;
        this.hierarchyPanel.refresh();
        this.inspectorPanel.refresh();
    }
    
    public getSelectedObjectId(): string | null {
        return this.selectedObjectId;
    }
    
    public refresh(): void {
        this.hierarchyPanel.refresh();
        this.inspectorPanel.refresh();
    }
    
    public refreshInspector(): void {
        this.inspectorPanel.refresh();
    }
}
```

## Updated InspectorPanel

Update `src/editor/InspectorPanel.ts`:

```typescript
import type { EditorUI } from './EditorUI';

export class InspectorPanel {
    private editorUI: EditorUI;
    private contentElement: HTMLElement;
    
    constructor(editorUI: EditorUI) {
        this.editorUI = editorUI;
        this.contentElement = document.getElementById('inspector-content') as HTMLElement;
    }
    
    public refresh(): void {
        const selectedId = this.editorUI.getSelectedObjectId();
        
        if (!selectedId) {
            this.contentElement.innerHTML = '<div class="empty-state">Select an object to inspect</div>';
            return;
        }
        
        const scene = this.editorUI.getEngine().getScene();
        if (!scene) return;
        
        const go = scene.findById(selectedId);
        if (!go) {
            this.contentElement.innerHTML = '<div class="empty-state">Object not found</div>';
            return;
        }
        
        this.contentElement.innerHTML = '';
        
        // Object header with name input
        const header = document.createElement('div');
        header.className = 'object-header';
        const nameInput = document.createElement('input');
        nameInput.value = go.name;
        nameInput.addEventListener('change', () => {
            go.name = nameInput.value;
            this.editorUI.refresh();
        });
        header.appendChild(nameInput);
        this.contentElement.appendChild(header);
        
        // Transform section
        this.addTransformSection(go);
        
        // Other components
        for (const component of go.getAllComponents()) {
            if (component.getTypeName() === 'Transform') continue;
            this.addComponentSection(component);
        }
    }
    
    private addTransformSection(go: any): void {
        const section = document.createElement('div');
        section.className = 'component-section';
        
        const header = document.createElement('div');
        header.className = 'component-header';
        header.textContent = '🔄 Transform';
        section.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'component-content';
        
        // Position
        content.appendChild(this.createVector3Row('Position', go.transform.localPosition, (v) => {
            go.transform.localPosition.copy(v);
            go.transform.markDirty();
        }));
        
        // Rotation (in degrees)
        const rotDegrees = {
            x: go.transform.localRotation.x * (180 / Math.PI),
            y: go.transform.localRotation.y * (180 / Math.PI),
            z: go.transform.localRotation.z * (180 / Math.PI)
        };
        content.appendChild(this.createVector3Row('Rotation', rotDegrees, (v) => {
            go.transform.localRotation.set(
                v.x * (Math.PI / 180),
                v.y * (Math.PI / 180),
                v.z * (Math.PI / 180)
            );
            go.transform.markDirty();
        }));
        
        // Scale
        content.appendChild(this.createVector3Row('Scale', go.transform.localScale, (v) => {
            go.transform.localScale.copy(v);
            go.transform.markDirty();
        }));
        
        section.appendChild(content);
        this.contentElement.appendChild(section);
    }
    
    private createVector3Row(label: string, values: any, onChange: (v: any) => void): HTMLElement {
        const row = document.createElement('div');
        row.className = 'property-row';
        
        const labelEl = document.createElement('div');
        labelEl.className = 'property-label';
        labelEl.textContent = label;
        row.appendChild(labelEl);
        
        const inputContainer = document.createElement('div');
        inputContainer.className = 'property-value vector3-input';
        
        for (const axis of ['x', 'y', 'z']) {
            const axisLabel = document.createElement('span');
            axisLabel.className = `axis-label axis-${axis}`;
            axisLabel.textContent = axis.toUpperCase();
            inputContainer.appendChild(axisLabel);
            
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'property-input';
            input.value = values[axis].toFixed(2);
            input.step = '0.1';
            
            input.addEventListener('change', () => {
                values[axis] = parseFloat(input.value) || 0;
                onChange(values);
            });
            
            inputContainer.appendChild(input);
        }
        
        row.appendChild(inputContainer);
        return row;
    }
    
    private addComponentSection(component: any): void {
        const section = document.createElement('div');
        section.className = 'component-section';
        
        const header = document.createElement('div');
        header.className = 'component-header';
        header.textContent = `📦 ${component.getTypeName()}`;
        section.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'component-content';
        content.innerHTML = '<div class="empty-state">No editable properties</div>';
        section.appendChild(content);
        
        this.contentElement.appendChild(section);
    }
}
```

## Updated HTML

Update `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Engine - Chapter 4</title>
    <link rel="stylesheet" href="/src/styles/editor.css">
</head>
<body>
    <div id="app">
        <!-- Hierarchy Panel -->
        <div id="hierarchy-panel" class="panel">
            <div class="panel-header">
                <span>Hierarchy</span>
            </div>
            <div class="panel-content" id="hierarchy-content"></div>
        </div>
        
        <!-- Viewport -->
        <div id="viewport-container">
            <div id="toolbar">
                <div class="toolbar-group">
                    <button class="btn primary" id="play-btn">▶ Play</button>
                    <button class="btn" id="stop-btn" disabled>⏹ Stop</button>
                </div>
                
                <div class="toolbar-separator"></div>
                
                <div class="toolbar-group">
                    <button class="btn" id="add-cube-btn">+ Cube</button>
                    <button class="btn" id="add-sphere-btn">+ Sphere</button>
                    <button class="btn" id="add-empty-btn">+ Empty</button>
                </div>
                
                <div class="toolbar-separator"></div>
                
                <div class="toolbar-group">
                    <button class="btn" id="save-btn">💾 Save</button>
                    <button class="btn" id="load-btn">📂 Load</button>
                </div>
                
                <div class="toolbar-spacer"></div>
                
                <div id="stats">
                    FPS: <span id="fps">0</span> | 
                    Mode: <span id="mode">EDITOR</span>
                </div>
            </div>
            
            <canvas id="game-canvas"></canvas>
        </div>
        
        <!-- Inspector Panel -->
        <div id="inspector-panel" class="panel">
            <div class="panel-header">Inspector</div>
            <div class="panel-content" id="inspector-content"></div>
        </div>
    </div>
    
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

## Exercises

### Exercise 1: Add "Create Parent" Feature
Add a button that creates an empty parent for the selected object.

### Exercise 2: Keyboard Shortcuts
Implement:
- Delete key to delete selected object
- Ctrl+D to duplicate
- F2 to rename

### Exercise 3: Multi-Selection
Allow selecting multiple objects with Ctrl+Click and move them together.

### Exercise 4: Copy/Paste
Implement Ctrl+C to copy and Ctrl+V to paste GameObjects.

### Exercise 5: Undo/Redo
Track hierarchy changes and allow undoing them.

## What We Learned

✅ **Hierarchical Transforms**: Local vs. world space  
✅ **Reparenting**: setParent with world position preservation  
✅ **Drag-and-Drop**: Visual reparenting in hierarchy  
✅ **Scene Serialization**: Save/load scenes as JSON  
✅ **Context Menus**: Right-click actions  
✅ **Inline Renaming**: Double-click to edit names  

## What's Next

In Chapter 5, we'll add the Input System:
- Keyboard and mouse input handling
- Input mapping system
- Viewport object selection by clicking
- Transform gizmos for visual manipulation

---

**Chapter 4 Complete** ✓

*Deliverable: Multiple scenes with hierarchical objects + editor with draggable tree view, context menus, and scene save/load*