import * as THREE from '../three';
import { GameObject } from './GameObject';
import type { Component } from '../components/Component';
import { EditorObjectRegistry } from '../editor/EditorObjectRegistry';
import { Events } from '../events';

export class Scene {
    public name: string;
    public events: Events;  // Event bus for scene-level events
    private rootGameObjects: GameObject[] = [];
    private allGameObjects: Map<string, GameObject> = new Map();
    private _loaded: boolean = false;

    // Three.js scene for rendering
    private threeScene: THREE.Scene;

    constructor(name: string = 'Untitled Scene', events: Events) {
        this.name = name;
        this.events = events;
        this.threeScene = new THREE.Scene();
        this.threeScene.name = name;

        // Fire scene created event
        this.events.fire('scene.created', this);
    }

    /**
     * Get the Three.js scene for rendering
     */
    public getThreeScene(): THREE.Scene {
        return this.threeScene;
    }

    // lifecycle methods
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

    public get loaded(): boolean {
        return this._loaded;
    }

    public load(): void {
        this._loaded = true;
        this.events.fire('scene.loaded', this);
    }

    // Unload the scene and destroy all GameObjects
    // Note: Does not destroy editor-only objects (grid, gizmos, etc.)
    public unload(): void {
        console.log('Unloading scene:', this.name);

        // Only destroy actual game objects, not editor helpers
        for (const go of [...this.allGameObjects.values()]) {
            go.destroy();
        }

        // Clear the Three.js scene but preserve editor objects
        // Use EditorObjectRegistry to filter out editor objects
        const objectsToRemove = EditorObjectRegistry.filterGameObjects(
            Array.from(this.threeScene.children)
        );
        console.log('Removing', objectsToRemove.length, 'game objects from scene');

        // Remove game objects from Three.js scene
        for (const obj of objectsToRemove) {
            this.threeScene.remove(obj);
        }

        this.rootGameObjects = [];
        this.allGameObjects.clear();
        this._loaded = false;

        this.events.fire('scene.unloaded', this);
    }

    public clear(): void {
        for (const go of [...this.allGameObjects.values()]) {
            go.destroy();
        }
        this.rootGameObjects = [];
        this.allGameObjects.clear();
    }

    

    // GameObjects management
    public addGameObject(gameObject: GameObject): void {
        gameObject.scene = this;
        this.allGameObjects.set(gameObject.id, gameObject);

        if (!gameObject.parent) {
            this.rootGameObjects.push(gameObject);

            // Add to Three.js scene
            this.threeScene.add(gameObject.getObject3D());
        }

        // Also register all children
        for (const child of gameObject.children) {
            this.addGameObject(child);
        }

        // Fire event after object is added
        this.events.fire('scene.objectAdded', gameObject);
    }

    public removeGameObject(gameObject: GameObject): void {
        this.allGameObjects.delete(gameObject.id);

        const rootIndex = this.rootGameObjects.indexOf(gameObject);
        if (rootIndex !== -1) {
            this.rootGameObjects.splice(rootIndex, 1);

            // Remove from Three.js scene
            this.threeScene.remove(gameObject.getObject3D());
        }

        gameObject.scene = null;

        // Fire event after object is removed
        this.events.fire('scene.objectRemoved', gameObject);
    }

    // Methods for GameObject reparenting like in Hierarchy panel dragging
    public _addToRoots(gameObject: GameObject): void {
        if (!this.rootGameObjects.includes(gameObject)) {
            this.rootGameObjects.push(gameObject);

            // Add to Three.js scene
            this.threeScene.add(gameObject.getObject3D());
        }
    }

    public _removeFromRoots(gameObject: GameObject): void {
        const index = this.rootGameObjects.indexOf(gameObject);
        if (index !== -1) {
            this.rootGameObjects.splice(index, 1);

            // Remove from Three.js scene
            this.threeScene.remove(gameObject.getObject3D());
        }
    }


    // Search methods
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

    /**
     * Find all components of a specific type in the scene
     */
    public findComponentsOfType<T extends Component>(type: new () => T): T[] {
        const components: T[] = [];
        for (const go of this.allGameObjects.values()) {
            const component = go.getComponent(type);
            if (component) {
                components.push(component);
            }
        }
        return components;
    }
}
