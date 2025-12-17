import { GameObject } from './GameObject';
import type { Component } from '../components/Component';

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
