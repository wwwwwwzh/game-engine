import { GameObject } from './GameObject';
import type { Component } from './Component';

/**
 * Scene manages all GameObjects in the current level/area.
 * You can have multiple scenes and switch between them.
 * 
 * This is ENGINE code - it runs in both editor and runtime.
 * In editor mode, Scene is being edited.
 * In play mode, Scene runs the game.
 */
export class Scene {
    /**
     * Scene name
     */
    public name: string;
    
    /**
     * All root GameObjects in this scene
     * (GameObjects without parents)
     */
    private rootGameObjects: GameObject[] = [];
    
    /**
     * Flat list of all GameObjects for quick lookup
     */
    private allGameObjects: Map<string, GameObject> = new Map();
    
    /**
     * Is this scene currently loaded?
     */
    private _loaded: boolean = false;
    
    constructor(name: string = "Untitled Scene") {
        this.name = name;
        console.log(`🎬 Scene created: ${this.name}`);
    }
    
    /**
     * Is this scene loaded?
     */
    public get loaded(): boolean {
        return this._loaded;
    }
    
    /**
     * Add a GameObject to this scene
     */
    public addGameObject(gameObject: GameObject): void {
        // Add to scene reference
        gameObject.scene = this;
        
        // Add to all objects map
        this.allGameObjects.set(gameObject.id, gameObject);
        
        // If no parent, it's a root object
        if (!gameObject.parent) {
            this.rootGameObjects.push(gameObject);
        }
        
        console.log(`  📍 Added ${gameObject.name} to scene ${this.name}`);
    }
    
    /**
     * Remove a GameObject from this scene
     */
    public removeGameObject(gameObject: GameObject): void {
        this.allGameObjects.delete(gameObject.id);
        
        const index = this.rootGameObjects.indexOf(gameObject);
        if (index !== -1) {
            this.rootGameObjects.splice(index, 1);
        }
        
        gameObject.scene = null;
    }
    
    /**
     * Find a GameObject by name
     */
    public find(name: string): GameObject | null {
        for (const gameObject of this.allGameObjects.values()) {
            if (gameObject.name === name) {
                return gameObject;
            }
        }
        return null;
    }
    
    /**
     * Find a GameObject by ID
     */
    public findById(id: string): GameObject | null {
        return this.allGameObjects.get(id) || null;
    }
    
    /**
     * Find all GameObjects with a specific tag
     */
    public findByTag(tag: string): GameObject[] {
        const result: GameObject[] = [];
        for (const gameObject of this.allGameObjects.values()) {
            if (gameObject.tag === tag) {
                result.push(gameObject);
            }
        }
        return result;
    }
    
    /**
     * Find all GameObjects with a specific component type
     */
    public findObjectsWithComponent<T extends Component>(type: new () => T): GameObject[] {
        const result: GameObject[] = [];
        for (const gameObject of this.allGameObjects.values()) {
            if (gameObject.getComponent(type)) {
                result.push(gameObject);
            }
        }
        return result;
    }
    
    /**
     * Get all root GameObjects
     */
    public getRootGameObjects(): ReadonlyArray<GameObject> {
        return this.rootGameObjects;
    }
    
    /**
     * Get all GameObjects (including children)
     */
    public getAllGameObjects(): GameObject[] {
        return Array.from(this.allGameObjects.values());
    }
    
    /**
     * Update all GameObjects in the scene
     */
    public update(deltaTime: number): void {
        // Update all GameObjects (they'll update their components)
        for (const gameObject of this.allGameObjects.values()) {
            gameObject._internalUpdate(deltaTime);
        }
    }
    
    /**
     * Load the scene
     */
    public load(): void {
        if (this._loaded) {
            console.warn(`Scene ${this.name} is already loaded`);
            return;
        }
        
        this._loaded = true;
        console.log(`✅ Scene loaded: ${this.name}`);
    }
    
    /**
     * Unload the scene
     */
    public unload(): void {
        if (!this._loaded) {
            console.warn(`Scene ${this.name} is not loaded`);
            return;
        }
        
        // Destroy all GameObjects
        for (const gameObject of [...this.allGameObjects.values()]) {
            gameObject.destroy();
        }
        
        this.rootGameObjects = [];
        this.allGameObjects.clear();
        this._loaded = false;
        
        console.log(`❌ Scene unloaded: ${this.name}`);
    }
    
    /**
     * Clear the scene without unloading
     */
    public clear(): void {
        for (const gameObject of [...this.allGameObjects.values()]) {
            gameObject.destroy();
        }
        
        this.rootGameObjects = [];
        this.allGameObjects.clear();
        
        console.log(`🧹 Scene cleared: ${this.name}`);
    }
}
