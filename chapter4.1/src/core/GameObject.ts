import * as THREE from 'three/webgpu';
import { Component } from '../components/Component';
import { Transform } from '../components/Transform';
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

    // GameObject owns its Object3D
    private object3D: THREE.Object3D;
    public readonly transform: Transform;

    constructor(name: string = 'GameObject') {
        this.id = `go_${nextId++}`;
        this.name = name;

        // Create Object3D first
        this.object3D = new THREE.Object3D();
        this.object3D.name = name;

        // Transform wraps the Object3D
        this.transform = new Transform();
        this.transform.object3D = this.object3D;
        this.transform.gameObject = this;
        this.components.push(this.transform);
    }

    /**
     * Get the underlying Three.js Object3D
     */
    public getObject3D(): THREE.Object3D {
        return this.object3D;
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

        // Update scene's root list BEFORE changing parent
        if (this.scene) {
            if (this._parent === null && newParent !== null) {
                // Was root, now has parent
                this.scene._removeFromRoots(this);
            } else if (this._parent !== null && newParent === null) {
                // Had parent, now root
                this.scene._addToRoots(this);
            }
        }

        // Remove from old parent's GameObject hierarchy
        if (this._parent) {
            this._parent._removeChild(this);
        }

        // Update GameObject parent
        this._parent = newParent;

        // Add to new parent's GameObject hierarchy
        if (newParent) {
            newParent._addChild(this);
        }

        // Update Three.js Object3D hierarchy
        if (newParent) {
            // Add to new parent's Object3D
            newParent.object3D.attach(this.object3D);

            // If NOT preserving world position, reset to local
            if (!worldPositionStays) {
                this.object3D.position.set(0, 0, 0);
                this.object3D.rotation.set(0, 0, 0);
                this.object3D.scale.set(1, 1, 1);
            }
        } else {
            // Becoming root - remove from current parent in Three.js
            this.object3D.removeFromParent();
        }
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
