import { Component } from './Component';
import { Transform } from '../components/Transform';
import type { Scene } from './Scene';

/**
 * GameObject is a container for components.
 * Everything in your game is a GameObject with different components.
 * 
 * This is ENGINE code - it runs in both editor and runtime.
 * In editor mode, GameObjects can be selected and manipulated.
 * In play mode, GameObjects run their game logic.
 */
export class GameObject {
    /**
     * Unique identifier for this GameObject
     */
    public readonly id: string;
    
    /**
     * Human-readable name (shown in editor)
     */
    public name: string;
    
    /**
     * Transform component (position, rotation, scale)
     * Every GameObject has one - it cannot be removed
     */
    public readonly transform: Transform;
    
    /**
     * All components attached to this GameObject
     */
    private components: Component[] = [];
    
    /**
     * The scene this GameObject belongs to
     */
    public scene: Scene | null = null;
    
    /**
     * Is this GameObject active?
     * Inactive GameObjects don't update and aren't rendered
     */
    private _active: boolean = true;
    
    /**
     * Parent GameObject (for hierarchy)
     */
    private _parent: GameObject | null = null;
    
    /**
     * Child GameObjects
     */
    private _children: GameObject[] = [];
    
    /**
     * Tags for categorizing GameObjects
     * e.g., "Player", "Enemy", "Collectible"
     */
    public tag: string = "";
    
    constructor(name: string = "GameObject") {
        this.id = GameObject.generateId();
        this.name = name;
        
        // Every GameObject gets a Transform automatically
        this.transform = new Transform();
        this.transform.gameObject = this;
        this.components.push(this.transform);
        
        console.log(`📦 GameObject created: ${this.name} (${this.id})`);
    }
    
    /**
     * Generate a unique ID for this GameObject
     */
    private static generateId(): string {
        return `go_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Is this GameObject active?
     */
    public get active(): boolean {
        return this._active;
    }
    
    /**
     * Set active state
     */
    public set active(value: boolean) {
        if (this._active === value) return;
        this._active = value;
        console.log(`${this.name} ${value ? 'activated' : 'deactivated'}`);
    }
    
    /**
     * Add a component to this GameObject
     */
    public addComponent<T extends Component>(component: T): T {
        // Check if component of this type already exists
        const existingComponent = this.getComponent(component.constructor as new () => T);
        if (existingComponent) {
            console.warn(`GameObject ${this.name} already has component ${component.getTypeName()}`);
            return existingComponent;
        }
        
        component.gameObject = this;
        this.components.push(component);
        
        // Call awake immediately
        component.awake();
        
        console.log(`  ➕ Component added: ${component.getTypeName()} to ${this.name}`);
        return component;
    }
    
    /**
     * Get a component of a specific type
     */
    public getComponent<T extends Component>(type: new () => T): T | null {
        for (const component of this.components) {
            if (component instanceof type) {
                return component as T;
            }
        }
        return null;
    }
    
    /**
     * Get all components of a specific type
     */
    public getComponents<T extends Component>(type: new () => T): T[] {
        const result: T[] = [];
        for (const component of this.components) {
            if (component instanceof type) {
                result.push(component as T);
            }
        }
        return result;
    }
    
    /**
     * Remove a component
     */
    public removeComponent<T extends Component>(component: T): void {
        // Cannot remove Transform
        if (component === this.transform) {
            console.error('Cannot remove Transform component');
            return;
        }
        
        const index = this.components.indexOf(component);
        if (index !== -1) {
            component.onDestroy();
            this.components.splice(index, 1);
            console.log(`  ➖ Component removed: ${component.getTypeName()} from ${this.name}`);
        }
    }
    
    /**
     * Get all components
     */
    public getAllComponents(): Component[] {
        return [...this.components];
    }
    
    /**
     * Update all components
     */
    public _internalUpdate(deltaTime: number): void {
        if (!this._active) return;
        
        for (const component of this.components) {
            component._internalUpdate(deltaTime);
        }
    }
    
    /**
     * Destroy this GameObject
     */
    public destroy(): void {
        // Remove from parent
        if (this._parent) {
            this._parent.removeChild(this);
        }
        
        // Destroy all children
        for (const child of [...this._children]) {
            child.destroy();
        }
        
        // Destroy all components
        for (const component of [...this.components]) {
            component.onDestroy();
        }
        this.components = [];
        
        // Remove from scene
        if (this.scene) {
            this.scene.removeGameObject(this);
        }
        
        console.log(`🗑️  GameObject destroyed: ${this.name}`);
    }
    
    // ===== HIERARCHY METHODS =====
    
    /**
     * Get parent GameObject
     */
    public get parent(): GameObject | null {
        return this._parent;
    }
    
    /**
     * Set parent GameObject
     */
    public set parent(newParent: GameObject | null) {
        // Remove from old parent
        if (this._parent) {
            this._parent.removeChild(this);
        }
        
        // Add to new parent
        this._parent = newParent;
        if (newParent) {
            newParent.addChild(this);
        }
    }
    
    /**
     * Add a child GameObject
     */
    private addChild(child: GameObject): void {
        if (!this._children.includes(child)) {
            this._children.push(child);
        }
    }
    
    /**
     * Remove a child GameObject
     */
    private removeChild(child: GameObject): void {
        const index = this._children.indexOf(child);
        if (index !== -1) {
            this._children.splice(index, 1);
        }
    }
    
    /**
     * Get all children
     */
    public get children(): ReadonlyArray<GameObject> {
        return this._children;
    }
    
    /**
     * Get child by name
     */
    public getChild(name: string): GameObject | null {
        for (const child of this._children) {
            if (child.name === name) {
                return child;
            }
        }
        return null;
    }
    
    /**
     * Find child recursively by name
     */
    public findChild(name: string): GameObject | null {
        // Check direct children
        for (const child of this._children) {
            if (child.name === name) {
                return child;
            }
        }
        
        // Check children's children
        for (const child of this._children) {
            const found = child.findChild(name);
            if (found) {
                return found;
            }
        }
        
        return null;
    }
}
