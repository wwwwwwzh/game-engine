# Chapter 3: The Entity-Component Architecture + Editor Foundation

## The Game vs. The Game Engine: A Critical Distinction

Before we write a single line of code, we need to understand a fundamental concept that separates professional game engines from simple game code: **the separation between the engine and the game**.

### What's the Difference?

Think about Microsoft Word:
- **The application (Word)** is the tool that lets you write documents
- **Your document** is what you create using Word
- Word doesn't care what you write—it just provides the tools to write

A game engine works the same way:
- **The engine** is the tool that lets you make games
- **Your game** is what you create using the engine
- The engine doesn't know if you're making a platformer, an FPS, or a puzzle game—it just provides the tools

**This is the key insight**: Unity, Unreal, and every professional engine are tools for making games, not games themselves.

### Why This Matters for Our Code

When we write our engine, we need to ask of every class we create:

**"Is this part of the ENGINE or part of a GAME?"**

Let's categorize what we've built so far:

**Engine (Runtime) Classes:**
- `Engine` - The core game loop
- `Renderer` - Rendering system
- `Scene` - Container for game objects
- Math utilities (Vector3Utils, Transform, etc.)

These classes are **engine code**. They don't know what game you're making. They work the same whether you're making Space Invaders or Dark Souls.

**Game Classes (we haven't made any yet):**
- `PlayerController` - Specific to your game's player
- `EnemyAI` - Specific to your game's enemies
- `HealthSystem` - Specific to your game's health mechanics

### The Third Category: Editor

But there's a third category of code we haven't discussed yet: **editor code**.

**Editor Classes:**
- `EditorUI` - The editor interface
- `Hierarchy Panel` - Shows objects in the scene
- `Inspector Panel` - Shows object properties
- `Gizmos` - Visual manipulation tools

**Critical distinction**: Editor code runs only in the editor, not in your shipped game.

When Unity builds your game for distribution, it strips out all editor code. Your players never see the hierarchy panel or inspector—they only see your game running.

### The Architecture

```
┌─────────────────────────────────────┐
│         YOUR GAME CODE              │  ← Game-specific
│   (Player, Enemies, Game Logic)     │
├─────────────────────────────────────┤
│         ENGINE RUNTIME              │  ← Runs in both
│  (Scene, GameObject, Components,    │     editor and game
│   Renderer, Physics, etc.)          │
├─────────────────────────────────────┤
│         EDITOR CODE                 │  ← Editor only
│  (UI Panels, Gizmos, Inspectors)    │
└─────────────────────────────────────┘
```

### How This Affects Our File Structure

We'll organize our code to reflect this:

```
src/
├── core/              ← Engine runtime (runs everywhere)
│   ├── Engine.ts
│   ├── GameObject.ts
│   ├── Component.ts
│   └── Scene.ts
├── rendering/         ← Engine runtime
│   └── Renderer.ts
├── math/              ← Engine runtime
│   └── ...
├── editor/            ← Editor only (stripped from builds)
│   ├── EditorUI.ts
│   ├── HierarchyPanel.ts
│   ├── InspectorPanel.ts
│   └── EditorCamera.ts
└── game/              ← Your game code (what you make)
    └── (empty for now, you'll fill this in)
```

### Editor vs. Runtime: The Same Classes, Different Modes

Here's where it gets interesting: Classes like `Scene`, `GameObject`, and `Camera` exist in **both** contexts, but behave differently:

**Runtime Mode (Playing the game):**
- `Scene` manages active game objects
- `Camera` is positioned by game code
- `GameObject` updates according to game logic
- Input controls the player

**Editor Mode (Editing the scene):**
- `Scene` is being edited, not played
- `Camera` is controlled by editor navigation
- `GameObject` can be selected and moved with gizmos
- Input controls the editor camera and object selection

**The engine classes themselves don't change—but the engine runs in different "modes".**

Think of it like a car:
- In "Drive," the steering wheel controls the car's direction
- In "Park," the steering wheel does nothing
- It's the same steering wheel, but the car's mode changes what it does

Our engine will work the same way:

```typescript
class Engine {
    private isEditorMode: boolean = true;  // Start in editor mode
    private isPlaying: boolean = false;     // Not playing by default
    
    public play() {
        this.isPlaying = true;
        // Game starts, game logic takes over
    }
    
    public stop() {
        this.isPlaying = false;
        // Back to editor, editor controls take over
    }
}
```

### The Component Pattern: Building Blocks

Now that we understand the engine/game/editor distinction, let's talk about how we structure game objects.

**The problem with inheritance:**

In traditional object-oriented programming, you might do this:

```typescript
class Entity { }
class MovableEntity extends Entity { }
class Enemy extends MovableEntity { }
class FlyingEnemy extends Enemy { }
class FlyingEnemyThatShoots extends FlyingEnemy { }
```

This gets messy fast:
- What if you want a flying enemy that doesn't move?
- What if you want a movable entity that shoots?
- Every combination needs a new class

**The component solution:**

Instead, we use **composition over inheritance**:

```typescript
// Base object (just a container)
const enemy = new GameObject("Enemy");

// Add capabilities as components
enemy.addComponent(new Transform());      // Position in world
enemy.addComponent(new MeshRenderer());   // Visual appearance
enemy.addComponent(new Rigidbody());      // Physics
enemy.addComponent(new EnemyAI());        // Enemy behavior
enemy.addComponent(new HealthSystem());   // Can take damage
```

Want a different enemy type? Just change the components:

```typescript
const flyingEnemy = new GameObject("Flying Enemy");
flyingEnemy.addComponent(new Transform());
flyingEnemy.addComponent(new MeshRenderer());
flyingEnemy.addComponent(new FlyingMovement());  // Different movement
flyingEnemy.addComponent(new EnemyAI());
flyingEnemy.addComponent(new HealthSystem());
```

**Benefits:**
- **Reusable**: Components work on any GameObject
- **Flexible**: Mix and match to create anything
- **Understandable**: Each component has one job
- **Testable**: Test components in isolation

This is how Unity, Unreal, and every modern engine works.

### Component Lifecycle

Components have a lifecycle—events that happen at specific times:

```
GameObject Created
    ↓
Awake() called on all components    ← Initialize, set up references
    ↓
Start() called on all components    ← Begin behavior (after all Awake)
    ↓
┌─────────────────┐
│  Update() loop  │ ← Every frame during play
└─────────────────┘
    ↓
OnDestroy() called                  ← Clean up
    ↓
GameObject Destroyed
```

**Why two initialization methods (Awake and Start)?**

- **Awake**: Called immediately when component is created. Use for setting up internal state.
- **Start**: Called after all Awakes. Use when you need to reference other components (they're guaranteed to be awake).

Example:
```typescript
class PlayerController extends Component {
    private rigidbody: Rigidbody;
    
    awake() {
        // Get reference to another component
        // Safe because all components have been created
        this.rigidbody = this.gameObject.getComponent(Rigidbody);
    }
    
    start() {
        // Now safe to use rigidbody (it's definitely awake)
        this.rigidbody.mass = 10;
    }
    
    update(deltaTime: number) {
        // Called every frame
        if (Input.getKey('w')) {
            this.rigidbody.addForce(new Vector3(0, 0, -1));
        }
    }
}
```

### Transform: The Universal Component

Every GameObject has one component that's **always** there: `Transform`.

`Transform` stores:
- **Position**: Where is this object in 3D space?
- **Rotation**: Which direction is it facing?
- **Scale**: How big is it?

Why is Transform always present?
- **Every object exists somewhere in space**
- Even UI elements have a position
- Even invisible objects (like spawn points) have a location

In Unity, you literally cannot remove the Transform component—it's fundamental to what a GameObject is.

We'll do the same: when you create a GameObject, it automatically gets a Transform.

## The Implementation: Building the Component System

Now that we understand the concepts, let's build it.

### Project Structure

We'll create this structure:

```
chapter3/
├── src/
│   ├── core/
│   │   ├── Engine.ts           (updated)
│   │   ├── GameObject.ts       (new!)
│   │   ├── Component.ts        (new!)
│   │   └── Scene.ts            (new!)
│   ├── components/
│   │   ├── Transform.ts        (new!)
│   │   └── MeshRenderer.ts     (new!)
│   ├── editor/                 (new!)
│   │   ├── EditorUI.ts         (new!)
│   │   ├── HierarchyPanel.ts   (new!)
│   │   └── InspectorPanel.ts   (new!)
│   ├── rendering/
│   │   └── Renderer.ts         (updated)
│   ├── math/
│   │   └── (from chapter 2)
│   └── main.ts                 (updated)
├── index.html                  (updated for editor UI)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### The Component Base Class

Let's start with the foundation. Create `src/core/Component.ts`:

```typescript
import type { GameObject } from './GameObject';

/**
 * Base class for all components.
 * Components add behavior and properties to GameObjects.
 * 
 * This is ENGINE code - it runs in both editor and runtime.
 */
export abstract class Component {
    /**
     * The GameObject this component is attached to.
     * Set automatically when component is added to a GameObject.
     */
    public gameObject!: GameObject;
    
    /**
     * Quick access to transform (every GameObject has one)
     */
    public get transform() {
        return this.gameObject.transform;
    }
    
    /**
     * Is this component enabled?
     * Disabled components don't update.
     */
    public enabled: boolean = true;
    
    /**
     * Has Start been called yet?
     */
    private _started: boolean = false;
    
    /**
     * Called when component is first created (before Start)
     * Use for internal initialization
     */
    public awake(): void {
        // Override in derived classes
    }
    
    /**
     * Called before the first Update, after all Awakes
     * Use for initialization that depends on other components
     */
    public start(): void {
        // Override in derived classes
    }
    
    /**
     * Called every frame while component is enabled
     * @param deltaTime Time since last frame in seconds
     */
    public update(deltaTime: number): void {
        // Override in derived classes
    }
    
    /**
     * Called when component is destroyed
     * Use for cleanup
     */
    public onDestroy(): void {
        // Override in derived classes
    }
    
    /**
     * Internal update - handles lifecycle
     * DO NOT OVERRIDE - Override update() instead
     */
    public _internalUpdate(deltaTime: number): void {
        if (!this.enabled) return;
        
        // Call start once before first update
        if (!this._started) {
            this.start();
            this._started = true;
        }
        
        this.update(deltaTime);
    }
    
    /**
     * Get component type name (for debugging and editor)
     */
    public getTypeName(): string {
        return this.constructor.name;
    }
}
```

**Key design decisions:**

1. **`gameObject` property**: Every component knows what GameObject it's on
2. **`transform` getter**: Convenient shortcut (you'll use this constantly)
3. **`enabled` flag**: Turn components on/off without removing them
4. **`_started` flag**: Ensures Start only runs once
5. **`_internalUpdate`**: Handles lifecycle logic, so derived classes just override `update()`
6. **Abstract class**: You never create a raw Component, only derived classes

### The GameObject Class

Create `src/core/GameObject.ts`:

```typescript
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
```

**Key design decisions:**

1. **Transform is special**: Created automatically, cannot be removed
2. **Component lifecycle**: awake() called immediately when added
3. **Hierarchy support**: Parent-child relationships built-in
4. **Scene reference**: Knows what scene it belongs to
5. **Active state**: Can disable entire GameObject
6. **Unique IDs**: Every GameObject has a unique identifier
7. **Tags**: For categorizing objects (we'll use this later for collision, etc.)

### The Scene Class

Create `src/core/Scene.ts`:

```typescript
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
```

**Key design decisions:**

1. **Two lists**: Root objects (for hierarchy) and all objects (for lookup)
2. **Find methods**: Multiple ways to search for objects
3. **Load/Unload**: Scenes can be loaded and unloaded
4. **Update propagation**: Scene updates all GameObjects, which update components
5. **Clear vs. Unload**: Clear removes objects but keeps scene loaded

### The Transform Component

Create `src/components/Transform.ts`:

```typescript
import * as THREE from 'three';
import { Component } from '../core/Component';

/**
 * Transform component - position, rotation, scale.
 * Every GameObject has exactly one Transform.
 * 
 * This is ENGINE code - works in both editor and runtime.
 * In editor, Transform can be manipulated with gizmos.
 * In runtime, Transform is controlled by game logic.
 */
export class Transform extends Component {
    /**
     * Local position (relative to parent)
     */
    public position: THREE.Vector3;
    
    /**
     * Local rotation (Euler angles in radians)
     */
    public rotation: THREE.Euler;
    
    /**
     * Local scale
     */
    public scale: THREE.Vector3;
    
    /**
     * Three.js Object3D for rendering
     * This is created when MeshRenderer is added
     */
    public object3D: THREE.Object3D | null = null;
    
    constructor() {
        super();
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.scale = new THREE.Vector3(1, 1, 1);
    }
    
    /**
     * Update the Three.js object if it exists
     */
    public updateObject3D(): void {
        if (this.object3D) {
            this.object3D.position.copy(this.position);
            this.object3D.rotation.copy(this.rotation);
            this.object3D.scale.copy(this.scale);
        }
    }
    
    /**
     * Link a Three.js Object3D to this transform
     */
    public linkObject3D(object: THREE.Object3D): void {
        this.object3D = object;
        this.updateObject3D();
    }
    
    /**
     * Translate (move) by a vector
     */
    public translate(translation: THREE.Vector3): void {
        this.position.add(translation);
        this.updateObject3D();
    }
    
    /**
     * Rotate by Euler angles
     */
    public rotate(rotation: THREE.Euler): void {
        this.rotation.x += rotation.x;
        this.rotation.y += rotation.y;
        this.rotation.z += rotation.z;
        this.updateObject3D();
    }
    
    /**
     * Look at a target position
     */
    public lookAt(target: THREE.Vector3): void {
        if (this.object3D) {
            this.object3D.lookAt(target);
            this.rotation.copy(this.object3D.rotation);
        }
    }
    
    /**
     * Get world position (accounting for parent hierarchy)
     */
    public getWorldPosition(): THREE.Vector3 {
        if (this.object3D) {
            const worldPos = new THREE.Vector3();
            this.object3D.getWorldPosition(worldPos);
            return worldPos;
        }
        return this.position.clone();
    }
    
    /**
     * Get forward direction (local -Z axis in world space)
     */
    public getForward(): THREE.Vector3 {
        if (this.object3D) {
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(this.object3D.quaternion);
            return forward.normalize();
        }
        return new THREE.Vector3(0, 0, -1);
    }
    
    /**
     * Get right direction (local +X axis in world space)
     */
    public getRight(): THREE.Vector3 {
        if (this.object3D) {
            const right = new THREE.Vector3(1, 0, 0);
            right.applyQuaternion(this.object3D.quaternion);
            return right.normalize();
        }
        return new THREE.Vector3(1, 0, 0);
    }
    
    /**
     * Get up direction (local +Y axis in world space)
     */
    public getUp(): THREE.Vector3 {
        if (this.object3D) {
            const up = new THREE.Vector3(0, 1, 0);
            up.applyQuaternion(this.object3D.quaternion);
            return up.normalize();
        }
        return new THREE.Vector3(0, 1, 0);
    }
}
```

**Key design decisions:**

1. **Links to Three.js**: Transform can sync with a Three.js Object3D for rendering
2. **Local space**: Position/rotation/scale are relative to parent
3. **World space methods**: Can get world position and directions
4. **Auto-update**: Moving the transform updates the visual object

### The MeshRenderer Component

Create `src/components/MeshRenderer.ts`:

```typescript
import * as THREE from 'three';
import { Component } from '../core/Component';
import { Transform } from './Transform';

/**
 * MeshRenderer component - renders a 3D mesh.
 * 
 * This is ENGINE code - works in both editor and runtime.
 * The mesh is visible in both editor and game.
 * Note how Mesh object automatically links to Transform component and how Transform automatically updates the Mesh object in the MeshRenderer component
 */
export class MeshRenderer extends Component {
    private mesh: THREE.Mesh | null = null;
    private geometry: THREE.BufferGeometry | null = null;
    private material: THREE.Material | null = null;
    
    /**
     * Set the mesh geometry
     */
    public setGeometry(geometry: THREE.BufferGeometry): void {
        this.geometry = geometry;
        this.updateMesh();
    }
    
    /**
     * Set the mesh material
     */
    public setMaterial(material: THREE.Material): void {
        this.material = material;
        this.updateMesh();
    }
    
    /**
     * Update the Three.js mesh
     */
    private updateMesh(): void {
        if (!this.geometry || !this.material) return;
        
        // Create mesh if it doesn't exist
        if (!this.mesh) {
            this.mesh = new THREE.Mesh(this.geometry, this.material);
            
            // Link to transform
            const transform = this.gameObject.getComponent(Transform);
            if (transform) {
                transform.linkObject3D(this.mesh);
            }
        } else {
            // Update existing mesh
            this.mesh.geometry = this.geometry;
            this.mesh.material = this.material;
        }
    }
    
    /**
     * Get the Three.js mesh
     */
    public getMesh(): THREE.Mesh | null {
        return this.mesh;
    }
    
    /**
     * Clean up
     */
    public onDestroy(): void {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            if (this.mesh.material instanceof THREE.Material) {
                this.mesh.material.dispose();
            }
        }
    }
}
```

### Updating the Renderer

Now we need to update the Renderer to work with our new Scene system. Update `src/rendering/Renderer.ts`:

```typescript
import * as THREE from 'three';
import { exponentialDecayVector3 } from '../math/Vector3Utils';
import type { Scene } from '../core/Scene';
import { MeshRenderer } from '../components/MeshRenderer';

/**
 * Manages the Three.js renderer, scene, camera, and rendering pipeline. It basically syncs our Scene object to the THREE.Scene object and manages rendering through THREE.WebGLRenderer 
 * 
 * This is ENGINE code - works in both editor and runtime.
 */
export class Renderer {
    private renderer: THREE.WebGLRenderer;
    private threeScene: THREE.Scene;  // Renamed to avoid confusion with our Scene class
    private camera: THREE.PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    
    // Current scene being rendered
    private currentScene: Scene | null = null;
    
    // Smooth camera movement
    private targetCameraPosition: THREE.Vector3;
    private cameraDecayRate: number = 5.0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        
        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x1a1a1a, 1.0);
        
        // Create Three.js scene (for rendering)
        this.threeScene = new THREE.Scene();
        
        // Create camera
        const fov = 75;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1;
        const far = 1000;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.z = 5;
        
        this.targetCameraPosition = this.camera.position.clone();
        
        // Add default lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.threeScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 7.5);
        this.threeScene.add(directionalLight);
        
        console.log('🎨 Renderer initialized');
    }
    
    /**
     * Set the scene to render
     */
    public setScene(scene: Scene): void {
        // Clear old scene from Three.js
        if (this.currentScene) {
            this.clearThreeScene();
        }
        
        this.currentScene = scene;
        
        // Add all GameObjects with MeshRenderer to Three.js scene
        this.syncSceneToThree();
        
        console.log(`🎬 Renderer now rendering scene: ${scene.name}`);
    }
    
    /**
     * Sync our Scene's GameObjects to the Three.js scene
     */
    private syncSceneToThree(): void {
        if (!this.currentScene) return;
        
        const allObjects = this.currentScene.getAllGameObjects();
        
        for (const gameObject of allObjects) {
            const meshRenderer = gameObject.getComponent(MeshRenderer);
            if (meshRenderer) {
                const mesh = meshRenderer.getMesh();
                if (mesh && !this.threeScene.children.includes(mesh)) {
                    this.threeScene.add(mesh);
                }
            }
        }
    }
    
    /**
     * Clear the Three.js scene
     */
    private clearThreeScene(): void {
        // Remove all meshes (but keep lights)
        const objectsToRemove: THREE.Object3D[] = [];
        
        this.threeScene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                objectsToRemove.push(object);
            }
        });
        
        for (const object of objectsToRemove) {
            this.threeScene.remove(object);
        }
    }
    
    /**
     * Update (called every frame)
     */
    public update(deltaTime: number): void {
        // Smooth camera movement
        this.camera.position.copy(
            exponentialDecayVector3(
                this.camera.position,
                this.targetCameraPosition,
                this.cameraDecayRate,
                deltaTime
            )
        );
        
        // Re-sync scene in case new objects were added
        if (this.currentScene) {
            this.syncSceneToThree();
        }
    }
    
    /**
     * Render the current frame
     */
    public render(): void {
        this.renderer.render(this.threeScene, this.camera);
    }
    
    /**
     * Handle window resize
     */
    public onResize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    /**
     * Get the Three.js camera
     */
    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }
    
    /**
     * Set the target camera position
     */
    public setCameraTarget(position: THREE.Vector3): void {
        this.targetCameraPosition.copy(position);
    }
    
    /**
     * Clean up
     */
    public dispose(): void {
        this.clearThreeScene();
        this.renderer.dispose();
        console.log('🗑️  Renderer disposed');
    }
}
```

**Key changes:**
- Now renders GameObjects with MeshRenderer components
- Renamed internal Three.Scene to `threeScene` to avoid confusion
- `setScene()` method to switch between scenes
- `syncSceneToThree()` keeps Three.js in sync with our GameObject system

### Updating the Engine

Update `src/core/Engine.ts`:

```typescript
import { Renderer } from '../rendering/Renderer';
import { Scene } from './Scene';

/**
 * The core game engine class.
 * Manages the game loop (calling Scene and Renderer update), timing, and lifecycle.
 * 
 * This is ENGINE code - but it has two modes:
 * - Editor mode: For editing scenes
 * - Play mode: For running the game
 */
export class Engine {
    private canvas: HTMLCanvasElement;
    private renderer: Renderer;
    private isRunning: boolean = false;
    private lastFrameTime: number = 0;
    private deltaTime: number = 0;
    private fps: number = 0;
    private frameCount: number = 0;
    private fpsUpdateTime: number = 0;
    private startTime: number = 0;
    private runTime: number = 0;
    
    // Scene management
    private currentScene: Scene | null = null;
    
    // Editor mode
    public isEditorMode: boolean = true;  // Start in editor mode
    public isPlaying: boolean = false;     // Is the game playing?
    
    // DOM elements for stats display
    private fpsElement: HTMLElement | null;
    private frametimeElement: HTMLElement | null;
    private runtimeElement: HTMLElement | null;

    constructor(canvasId: string = 'game-canvas') {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }
        this.canvas = canvas;
        
        this.renderer = new Renderer(this.canvas);
        
        this.fpsElement = document.getElementById('fps');
        this.frametimeElement = document.getElementById('frametime');
        this.runtimeElement = document.getElementById('runtime');
        
        window.addEventListener('resize', () => this.onResize());
        
        console.log('🎮 Game Engine initialized');
        console.log('📝 Editor Mode: ON');
    }
    
    /**
     * Load a scene
     */
    public loadScene(scene: Scene): void {
        if (this.currentScene) {
            this.currentScene.unload();
        }
        
        this.currentScene = scene;
        this.currentScene.load();
        this.renderer.setScene(scene);
        
        console.log(`✅ Loaded scene: ${scene.name}`);
    }
    
    /**
     * Get the current scene
     */
    public getScene(): Scene | null {
        return this.currentScene;
    }
    
    /**
     * Enter play mode (start the game)
     */
    public play(): void {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        console.log('▶️  PLAY MODE');
        console.log('🎮 Game started');
    }
    
    /**
     * Exit play mode (stop the game)
     */
    public stop(): void {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        console.log('⏸️  EDITOR MODE');
        console.log('✋ Game stopped');
    }
    
    private onResize(): void {
        this.renderer.onResize(window.innerWidth, window.innerHeight);
    }
    
    public start(): void {
        if (this.isRunning) {
            console.warn('Engine is already running');
            return;
        }
        
        this.isRunning = true;
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;
        this.fpsUpdateTime = this.startTime;
        
        console.log('▶️  Engine started');
        
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    public stopEngine(): void {
        this.isRunning = false;
        console.log('⏸️  Engine stopped');
    }
    
    private gameLoop(timestamp: number): void {
        if (!this.isRunning) {
            return;
        }
        
        this.deltaTime = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;
        this.runTime = (timestamp - this.startTime) / 1000;
        
        this.frameCount++;
        const timeSinceFpsUpdate = timestamp - this.fpsUpdateTime;
        if (timeSinceFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / timeSinceFpsUpdate);
            this.frameCount = 0;
            this.fpsUpdateTime = timestamp;
            this.updateStats();
        }
        
        // THE GAME LOOP
        this.processInput();
        this.update(this.deltaTime);
        this.render();
        
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    private processInput(): void {
        // Input will be handled by InputManager in Chapter 5
    }
    
    private update(deltaTime: number): void {
        // Update renderer (camera movement, etc.)
        this.renderer.update(deltaTime);
        
        // Update scene ONLY if playing
        if (this.isPlaying && this.currentScene) {
            this.currentScene.update(deltaTime);
        }
        
        // In editor mode, don't update game logic
        // We'll add editor-specific updates in the editor classes
    }
    
    private render(): void {
        this.renderer.render();
    }
    
    private updateStats(): void {
        if (this.fpsElement) {
            this.fpsElement.textContent = this.fps.toString();
        }
        if (this.frametimeElement) {
            this.frametimeElement.textContent = (this.deltaTime * 1000).toFixed(2);
        }
        if (this.runtimeElement) {
            this.runtimeElement.textContent = this.runTime.toFixed(1);
        }
    }
    
    public getFPS(): number {
        return this.fps;
    }
    
    public getDeltaTime(): number {
        return this.deltaTime;
    }
    
    public getIsRunning(): boolean {
        return this.isRunning;
    }
    
    public getRenderer(): Renderer {
        return this.renderer;
    }
    
    public dispose(): void {
        this.renderer.dispose();
        if (this.currentScene) {
            this.currentScene.unload();
        }
    }
}
```

**Key additions:**
- `isEditorMode` and `isPlaying` flags
- `play()` and `stop()` methods for editor/play mode
- Scene only updates when playing (not in editor mode)
- `loadScene()` method

## Building the Editor UI

Now for the exciting part—building the editor interface! This is where we separate EDITOR code from ENGINE code.

### The HTML Structure

Update `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Game Engine - Chapter 3</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            background: #1a1a1a;
            color: #e0e0e0;
        }
        
        /* Main layout */
        #editor-container {
            display: flex;
            width: 100%;
            height: 100%;
        }
        
        /* Left sidebar - Hierarchy */
        #hierarchy-panel {
            width: 250px;
            background: #252525;
            border-right: 1px solid #3a3a3a;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        /* Center - Viewport */
        #viewport-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        
        /* Right sidebar - Inspector */
        #inspector-panel {
            width: 300px;
            background: #252525;
            border-left: 1px solid #3a3a3a;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        /* Panel headers */
        .panel-header {
            background: #2d2d2d;
            padding: 10px 15px;
            border-bottom: 1px solid #3a3a3a;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Panel content */
        .panel-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 10px;
        }
        
        /* Scrollbar styling */
        .panel-content::-webkit-scrollbar {
            width: 8px;
        }
        
        .panel-content::-webkit-scrollbar-track {
            background: #1a1a1a;
        }
        
        .panel-content::-webkit-scrollbar-thumb {
            background: #4a4a4a;
            border-radius: 4px;
        }
        
        .panel-content::-webkit-scrollbar-thumb:hover {
            background: #5a5a5a;
        }
        
        /* Toolbar */
        #toolbar {
            background: #2d2d2d;
            border-bottom: 1px solid #3a3a3a;
            padding: 8px 15px;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        /* Buttons */
        .btn {
            background: #3a3a3a;
            border: none;
            color: #e0e0e0;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-family: inherit;
            transition: background 0.2s;
        }
        
        .btn:hover {
            background: #4a4a4a;
        }
        
        .btn:active {
            background: #2a2a2a;
        }
        
        .btn.primary {
            background: #0d7c66;
        }
        
        .btn.primary:hover {
            background: #0e8c73;
        }
        
        .btn.danger {
            background: #c44536;
        }
        
        .btn.danger:hover {
            background: #d44f3f;
        }
        
        /* Canvas */
        #game-canvas {
            display: block;
            width: 100%;
            height: 100%;
            background: #1a1a1a;
        }
        
        /* Stats overlay */
        #stats {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #0f0;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            border-radius: 4px;
            pointer-events: none;
        }
        
        #stats div {
            margin: 2px 0;
        }
        
        /* GameObject list item */
        .gameobject-item {
            padding: 6px 10px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
            user-select: none;
        }
        
        .gameobject-item:hover {
            background: #3a3a3a;
        }
        
        .gameobject-item.selected {
            background: #0d7c66;
        }
        
        .gameobject-icon {
            font-size: 14px;
        }
        
        /* Component in inspector */
        .component {
            background: #2d2d2d;
            border-radius: 4px;
            margin-bottom: 10px;
            overflow: hidden;
        }
        
        .component-header {
            padding: 10px;
            background: #333;
            font-weight: 600;
            font-size: 12px;
            border-bottom: 1px solid #3a3a3a;
        }
        
        .component-body {
            padding: 10px;
        }
        
        .property {
            margin-bottom: 10px;
        }
        
        .property-label {
            font-size: 11px;
            color: #aaa;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .property-value {
            font-size: 13px;
            color: #e0e0e0;
            font-family: 'Courier New', monospace;
        }
        
        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #666;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div id="editor-container">
        <!-- Left Panel: Hierarchy -->
        <div id="hierarchy-panel">
            <div class="panel-header">Hierarchy</div>
            <div class="panel-content" id="hierarchy-content">
                <div class="empty-state">No objects in scene</div>
            </div>
        </div>
        
        <!-- Center: Viewport -->
        <div id="viewport-container">
            <div id="toolbar">
                <button class="btn primary" id="play-btn">▶ Play</button>
                <button class="btn" id="stop-btn" disabled>⏸ Stop</button>
                <div style="flex: 1"></div>
                <button class="btn" id="add-cube-btn">+ Add Cube</button>
                <button class="btn" id="add-sphere-btn">+ Add Sphere</button>
            </div>
            <div style="position: relative; flex: 1;">
                <canvas id="game-canvas"></canvas>
                <div id="stats">
                    <div>FPS: <span id="fps">0</span></div>
                    <div>Frame Time: <span id="frametime">0</span>ms</div>
                    <div>Mode: <span id="mode">EDITOR</span></div>
                </div>
            </div>
        </div>
        
        <!-- Right Panel: Inspector -->
        <div id="inspector-panel">
            <div class="panel-header">Inspector</div>
            <div class="panel-content" id="inspector-content">
                <div class="empty-state">Select an object to inspect</div>
            </div>
        </div>
    </div>
    
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Layout:**
- Left: Hierarchy (list of GameObjects)
- Center: Viewport (3D view + toolbar)
- Right: Inspector (properties of selected object)

### The EditorUI Class

Create `src/editor/EditorUI.ts`:

```typescript
import type { Engine } from '../core/Engine';
import { HierarchyPanel } from './HierarchyPanel';
import { InspectorPanel } from './InspectorPanel';

/**
 * EditorUI manages the editor interface.
 * 
 * This is EDITOR code - only runs in the editor, not in builds.
 */
export class EditorUI {
    private engine: Engine;
    private hierarchyPanel: HierarchyPanel;
    private inspectorPanel: InspectorPanel;
    
    // UI elements
    private playButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private addCubeButton: HTMLButtonElement;
    private addSphereButton: HTMLButtonElement;
    private modeElement: HTMLElement;
    
    // Selected GameObject ID
    private selectedObjectId: string | null = null;
    
    constructor(engine: Engine) {
        this.engine = engine;
        
        // Get UI elements
        this.playButton = document.getElementById('play-btn') as HTMLButtonElement;
        this.stopButton = document.getElementById('stop-btn') as HTMLButtonElement;
        this.addCubeButton = document.getElementById('add-cube-btn') as HTMLButtonElement;
        this.addSphereButton = document.getElementById('add-sphere-btn') as HTMLButtonElement;
        this.modeElement = document.getElementById('mode') as HTMLElement;
        
        // Create panels
        this.hierarchyPanel = new HierarchyPanel(this);
        this.inspectorPanel = new InspectorPanel(this);
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('🎨 Editor UI initialized');
    }
    
    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Play/Stop buttons
        this.playButton.addEventListener('click', () => this.onPlayClicked());
        this.stopButton.addEventListener('click', () => this.onStopClicked());
        
        // Add object buttons
        this.addCubeButton.addEventListener('click', () => this.onAddCube());
        this.addSphereButton.addEventListener('click', () => this.onAddSphere());
    }
    
    /**
     * Play button clicked
     */
    private onPlayClicked(): void {
        this.engine.play();
        this.playButton.disabled = true;
        this.stopButton.disabled = false;
        this.modeElement.textContent = 'PLAYING';
        this.modeElement.style.color = '#0f0';
        
        // Disable editing in play mode
        this.addCubeButton.disabled = true;
        this.addSphereButton.disabled = true;
    }
    
    /**
     * Stop button clicked
     */
    private onStopClicked(): void {
        this.engine.stop();
        this.playButton.disabled = false;
        this.stopButton.disabled = true;
        this.modeElement.textContent = 'EDITOR';
        this.modeElement.style.color = '#0f0';
        
        // Re-enable editing
        this.addCubeButton.disabled = false;
        this.addSphereButton.disabled = false;
    }
    
    /**
     * Add a cube to the scene
     */
    private onAddCube(): void {
        const scene = this.engine.getScene();
        if (!scene) {
            console.warn('No scene loaded');
            return;
        }
        
        // We'll implement this after creating some example components
        console.log('Add cube clicked - will implement after creating helper methods');
    }
    
    /**
     * Add a sphere to the scene
     */
    private onAddSphere(): void {
        const scene = this.engine.getScene();
        if (!scene) {
            console.warn('No scene loaded');
            return;
        }
        
        console.log('Add sphere clicked - will implement after creating helper methods');
    }
    
    /**
     * Get the engine
     */
    public getEngine(): Engine {
        return this.engine;
    }
    
    /**
     * Select a GameObject
     */
    public selectObject(objectId: string | null): void {
        this.selectedObjectId = objectId;
        this.hierarchyPanel.refresh();
        this.inspectorPanel.refresh();
    }
    
    /**
     * Get selected GameObject ID
     */
    public getSelectedObjectId(): string | null {
        return this.selectedObjectId;
    }
    
    /**
     * Refresh the entire UI
     */
    public refresh(): void {
        this.hierarchyPanel.refresh();
        this.inspectorPanel.refresh();
    }
}
```

### The HierarchyPanel Class

Create `src/editor/HierarchyPanel.ts`:

```typescript
import type { EditorUI } from './EditorUI';

/**
 * HierarchyPanel shows all GameObjects in the scene.
 * 
 * This is EDITOR code - only runs in the editor.
 */
export class HierarchyPanel {
    private editorUI: EditorUI;
    private contentElement: HTMLElement;
    
    constructor(editorUI: EditorUI) {
        this.editorUI = editorUI;
        this.contentElement = document.getElementById('hierarchy-content') as HTMLElement;
        
        console.log('📋 Hierarchy panel initialized');
    }
    
    /**
     * Refresh the hierarchy display
     */
    public refresh(): void {
        const engine = this.editorUI.getEngine();
        const scene = engine.getScene();
        
        if (!scene) {
            this.contentElement.innerHTML = '<div class="empty-state">No scene loaded</div>';
            return;
        }
        
        const rootObjects = scene.getRootGameObjects();
        
        if (rootObjects.length === 0) {
            this.contentElement.innerHTML = '<div class="empty-state">No objects in scene</div>';
            return;
        }
        
        // Clear content
        this.contentElement.innerHTML = '';
        
        // Add each root GameObject
        for (const gameObject of rootObjects) {
            const item = this.createGameObjectItem(gameObject);
            this.contentElement.appendChild(item);
        }
    }
    
    /**
     * Create a DOM element for a GameObject
     */
    private createGameObjectItem(gameObject: any): HTMLElement {
        const item = document.createElement('div');
        item.className = 'gameobject-item';
        
        // Check if selected
        if (gameObject.id === this.editorUI.getSelectedObjectId()) {
            item.classList.add('selected');
        }
        
        // Icon
        const icon = document.createElement('span');
        icon.className = 'gameobject-icon';
        icon.textContent = '📦';
        item.appendChild(icon);
        
        // Name
        const name = document.createElement('span');
        name.textContent = gameObject.name;
        item.appendChild(name);
        
        // Click to select
        item.addEventListener('click', () => {
            this.editorUI.selectObject(gameObject.id);
        });
        
        return item;
    }
}
```

### The InspectorPanel Class

Create `src/editor/InspectorPanel.ts`:

```typescript
import type { EditorUI } from './EditorUI';

/**
 * InspectorPanel shows properties of the selected GameObject.
 * 
 * This is EDITOR code - only runs in the editor.
 */
export class InspectorPanel {
    private editorUI: EditorUI;
    private contentElement: HTMLElement;
    
    constructor(editorUI: EditorUI) {
        this.editorUI = editorUI;
        this.contentElement = document.getElementById('inspector-content') as HTMLElement;
        
        console.log('🔍 Inspector panel initialized');
    }
    
    /**
     * Refresh the inspector display
     */
    public refresh(): void {
        const selectedId = this.editorUI.getSelectedObjectId();
        
        if (!selectedId) {
            this.contentElement.innerHTML = '<div class="empty-state">Select an object to inspect</div>';
            return;
        }
        
        const engine = this.editorUI.getEngine();
        const scene = engine.getScene();
        
        if (!scene) {
            this.contentElement.innerHTML = '<div class="empty-state">No scene loaded</div>';
            return;
        }
        
        const gameObject = scene.findById(selectedId);
        
        if (!gameObject) {
            this.contentElement.innerHTML = '<div class="empty-state">Object not found</div>';
            return;
        }
        
        // Clear content
        this.contentElement.innerHTML = '';
        
        // Add GameObject header
        const header = document.createElement('div');
        header.style.cssText = 'padding: 15px; border-bottom: 1px solid #3a3a3a; font-size: 16px; font-weight: 600;';
        header.textContent = gameObject.name;
        this.contentElement.appendChild(header);
        
        // Add components
        const components = gameObject.getAllComponents();
        for (const component of components) {
            const componentElement = this.createComponentElement(component);
            this.contentElement.appendChild(componentElement);
        }
    }
    
    /**
     * Create a DOM element for a component
     */
    private createComponentElement(component: any): HTMLElement {
        const element = document.createElement('div');
        element.className = 'component';
        
        // Header
        const header = document.createElement('div');
        header.className = 'component-header';
        header.textContent = component.getTypeName();
        element.appendChild(header);
        
        // Body
        const body = document.createElement('div');
        body.className = 'component-body';
        
        // Show properties based on component type
        if (component.getTypeName() === 'Transform') {
            this.addTransformProperties(body, component);
        } else {
            // Generic component display
            body.innerHTML = '<div class="property-value">No editable properties</div>';
        }
        
        element.appendChild(body);
        
        return element;
    }
    
    /**
     * Add Transform properties to the body
     */
    private addTransformProperties(body: HTMLElement, transform: any): void {
        // Position
        const positionProp = document.createElement('div');
        positionProp.className = 'property';
        positionProp.innerHTML = `
            <div class="property-label">Position</div>
            <div class="property-value">
                X: ${transform.position.x.toFixed(2)}, 
                Y: ${transform.position.y.toFixed(2)}, 
                Z: ${transform.position.z.toFixed(2)}
            </div>
        `;
        body.appendChild(positionProp);
        
        // Rotation
        const rotationProp = document.createElement('div');
        rotationProp.className = 'property';
        rotationProp.innerHTML = `
            <div class="property-label">Rotation (degrees)</div>
            <div class="property-value">
                X: ${(transform.rotation.x * 180 / Math.PI).toFixed(2)}, 
                Y: ${(transform.rotation.y * 180 / Math.PI).toFixed(2)}, 
                Z: ${(transform.rotation.z * 180 / Math.PI).toFixed(2)}
            </div>
        `;
        body.appendChild(rotationProp);
        
        // Scale
        const scaleProp = document.createElement('div');
        scaleProp.className = 'property';
        scaleProp.innerHTML = `
            <div class="property-label">Scale</div>
            <div class="property-value">
                X: ${transform.scale.x.toFixed(2)}, 
                Y: ${transform.scale.y.toFixed(2)}, 
                Z: ${transform.scale.z.toFixed(2)}
            </div>
        `;
        body.appendChild(scaleProp);
    }
}
```

### Helper Methods for Creating GameObjects

Create `src/core/GameObjectFactory.ts`:

```typescript
import * as THREE from 'three';
import { GameObject } from './GameObject';
import { MeshRenderer } from '../components/MeshRenderer';

/**
 * Factory for creating common GameObject types.
 * This is ENGINE code but provides convenient creation methods.
 */
export class GameObjectFactory {
    /**
     * Create a cube GameObject
     */
    public static createCube(name: string = "Cube"): GameObject {
        const gameObject = new GameObject(name);
        
        // Add MeshRenderer
        const renderer = new MeshRenderer();
        gameObject.addComponent(renderer);
        
        // Create cube geometry and material
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x00ff00,
            shininess: 100,
            specular: 0x444444
        });
        
        renderer.setGeometry(geometry);
        renderer.setMaterial(material);
        
        return gameObject;
    }
    
    /**
     * Create a sphere GameObject
     */
    public static createSphere(name: string = "Sphere"): GameObject {
        const gameObject = new GameObject(name);
        
        // Add MeshRenderer
        const renderer = new MeshRenderer();
        gameObject.addComponent(renderer);
        
        // Create sphere geometry and material
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xff0000,
            shininess: 100,
            specular: 0x444444
        });
        
        renderer.setGeometry(geometry);
        renderer.setMaterial(material);
        
        return gameObject;
    }
}
```

### Update EditorUI to Use Factory

Update the `onAddCube` and `onAddSphere` methods in `EditorUI.ts`:

```typescript
import { GameObjectFactory } from '../core/GameObjectFactory';

// ... in EditorUI class:

private onAddCube(): void {
    const scene = this.engine.getScene();
    if (!scene) {
        console.warn('No scene loaded');
        return;
    }
    
    const cube = GameObjectFactory.createCube();
    scene.addGameObject(cube);
    this.refresh();
    
    console.log('✅ Cube added to scene');
}

private onAddSphere(): void {
    const scene = this.engine.getScene();
    if (!scene) {
        console.warn('No scene loaded');
        return;
    }
    
    const sphere = GameObjectFactory.createSphere();
    sphere.transform.position.x = 2; // Offset so it doesn't overlap cube
    scene.addGameObject(sphere);
    this.refresh();
    
    console.log('✅ Sphere added to scene');
}
```

### The Main Entry Point

Update `src/main.ts`:

```typescript
import { Engine } from './core/Engine';
import { Scene } from './core/Scene';
import { EditorUI } from './editor/EditorUI';

console.log('='.repeat(50));
console.log('🎮 GAME ENGINE - CHAPTER 3');
console.log('Entity-Component Architecture + Editor');
console.log('='.repeat(50));

// Create engine
const engine = new Engine('game-canvas');

// Create a scene
const scene = new Scene("Main Scene");
engine.loadScene(scene);

// Create editor UI
const editor = new EditorUI(engine);

// Start the engine
engine.start();

// Make accessible from console
(window as any).engine = engine;
(window as any).scene = scene;
(window as any).editor = editor;

console.log('💡 Access from console:');
console.log('  - window.engine (the engine)');
console.log('  - window.scene (current scene)');
console.log('  - window.editor (editor UI)');
console.log('💡 Try clicking "Add Cube" or "Add Sphere"!');
```

## Running Your Engine with Editor

Now let's see it all come together!

1. Make sure you're in the `chapter3` directory
2. Run:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000`

You should see:
- **Left panel**: Hierarchy (empty at first)
- **Center**: 3D viewport with toolbar
- **Right panel**: Inspector (waiting for selection)
- **Toolbar**: Play/Stop buttons and Add Cube/Sphere buttons

**Try this:**
1. Click "Add Cube" → A green cube appears
2. Look at the Hierarchy → Shows "Cube"
3. Click "Cube" in hierarchy → Inspector shows Transform properties
4. Click "Add Sphere" → A red sphere appears to the right
5. Click "Sphere" in hierarchy → Inspector updates
6. Click **Play** → "Mode" changes to "PLAYING"
7. Click **Stop** → Back to "EDITOR"

**What's happening:**
- In **EDITOR mode**: Objects exist but don't update
- In **PLAY mode**: Objects would run their update() logic (we don't have any yet)
- The editor UI only exists in the editor—it wouldn't ship with your game

## Understanding What We Built

Let's review the architecture:

### Runtime Code (Engine)
These classes run in both editor and final game:
- `Engine` - Game loop and mode management
- `GameObject` - Container for components
- `Component` - Base for all behaviors
- `Scene` - Manages GameObjects
- `Transform` - Position/rotation/scale
- `MeshRenderer` - Renders a 3D mesh
- `Renderer` - WebGL rendering

### Editor Code
These classes ONLY run in the editor:
- `EditorUI` - Manages editor interface
- `HierarchyPanel` - Shows scene objects
- `InspectorPanel` - Shows object properties

### The Separation

```typescript
// In Engine.ts - this code runs everywhere
public update(deltaTime: number): void {
    this.renderer.update(deltaTime);
    
    // Only update game logic when playing
    if (this.isPlaying && this.currentScene) {
        this.currentScene.update(deltaTime);
    }
}
```

**In editor mode (`isPlaying = false`):**
- Scene doesn't update
- Objects are frozen
- You can modify them safely

**In play mode (`isPlaying = true`):**
- Scene updates every frame
- Component `update()` methods run
- Game logic executes

When you build your game for release, you'd:
1. Strip out all `src/editor/` code
2. Remove editor UI from HTML
3. Start in play mode automatically
4. Ship only the runtime code

## Common Patterns and Use Cases

### Creating a Custom Component

Let's create a simple Rotator component:

Create `src/components/Rotator.ts`:

```typescript
import { Component } from '../core/Component';

/**
 * Rotator component - rotates an object continuously.
 * This is an example GAME component (game-specific behavior).
 */
export class Rotator extends Component {
    /**
     * Rotation speed in radians per second
     */
    public speed: number = 1.0;
    
    /**
     * Rotation axis (default: Y axis)
     */
    public axis: 'x' | 'y' | 'z' = 'y';
    
    public update(deltaTime: number): void {
        // Rotate around the specified axis
        switch (this.axis) {
            case 'x':
                this.transform.rotation.x += this.speed * deltaTime;
                break;
            case 'y':
                this.transform.rotation.y += this.speed * deltaTime;
                break;
            case 'z':
                this.transform.rotation.z += this.speed * deltaTime;
                break;
        }
        
        // Update the visual object
        this.transform.updateObject3D();
    }
}
```

### Using the Custom Component

In `main.ts`, let's add a rotating cube:

```typescript
import { Rotator } from './components/Rotator';
import { GameObjectFactory } from './core/GameObjectFactory';

// ... after creating scene

// Add a rotating cube
const rotatingCube = GameObjectFactory.createCube("Rotating Cube");
rotatingCube.transform.position.set(-2, 0, 0);
rotatingCube.addComponent(new Rotator());
scene.addGameObject(rotatingCube);

console.log('🔄 Added rotating cube');
```

Now:
1. Refresh the page
2. You'll see "Rotating Cube" in hierarchy
3. Click **Play**
4. The cube rotates!
5. Click **Stop**
6. Rotation freezes

**This demonstrates the game/engine separation:**
- `Rotator` is **game code** (specific behavior)
- It uses **engine code** (`Component`, `Transform`)
- It only runs in **play mode**
- The **editor** can see it but doesn't run it while editing

## Exercises

### Exercise 1: Add More Shapes
Create factory methods for:
- Plane (flat surface)
- Cylinder
- Torus

Add buttons in the toolbar to create them.

### Exercise 2: Create an Oscillator Component
Make a component that moves an object up and down:
```typescript
export class Oscillator extends Component {
    public amplitude: number = 1.0;  // How far to move
    public frequency: number = 1.0;  // How fast to oscillate
    
    private startY: number = 0;
    
    public start(): void {
        this.startY = this.transform.position.y;
    }
    
    public update(deltaTime: number): void {
        // Hint: Use Math.sin(time * frequency) * amplitude
    }
}
```

### Exercise 3: Enhance the Inspector
Add more component types to the inspector display:
- Show MeshRenderer properties (geometry type, material color)
- Show custom component properties (Rotator speed, Oscillator amplitude)

### Exercise 4: Object Deletion
Add a "Delete" button that appears in the inspector when an object is selected. When clicked, it should destroy the GameObject and refresh the UI.

### Exercise 5: Duplicate Objects
Add a button to duplicate the selected GameObject (copy all its components).

### Exercise 6: Tag System
Add UI for:
- Setting an object's tag
- Filtering hierarchy by tag
- Color-coding objects by tag

### Exercise 7: Active State Toggle
Add a checkbox in the inspector to toggle `gameObject.active`. When inactive, the object shouldn't render or update.

### Exercise 8: Component Enable/Disable
Add checkboxes next to each component in the inspector to toggle `component.enabled`.

### Exercise 9: Create a Spinner Component
Make a component that spins on multiple axes:
```typescript
export class Spinner extends Component {
    public xSpeed: number = 0;
    public ySpeed: number = 1;
    public zSpeed: number = 0;
    
    // Implement update()
}
```

### Exercise 10: Build a "Prefab" System
Create a function that saves a GameObject's configuration to JSON:
```typescript
function saveAsPrefab(gameObject: GameObject): string {
    // Return JSON representation
}

function loadPrefab(json: string): GameObject {
    // Recreate GameObject from JSON
}
```

## What We've Learned

In this chapter, you learned:

✅ **The game vs. engine distinction** - Engine is a tool, game is what you build  
✅ **Runtime vs. editor code** - Code that runs everywhere vs. editor-only  
✅ **Component-based architecture** - Composition over inheritance  
✅ **GameObject system** - Containers for components  
✅ **Component lifecycle** - Awake, Start, Update, OnDestroy  
✅ **Scene management** - Organizing GameObjects  
✅ **Transform component** - Universal position/rotation/scale  
✅ **Editor/Play modes** - Editing vs. running  
✅ **Building an editor UI** - HTML/CSS panels  
✅ **Hierarchy and Inspector** - Core editor tools  
✅ **MeshRenderer component** - Linking to Three.js  

Most importantly, you now have a **working editor** that you can use to build games!

## What's Next

In Chapter 4, we'll enhance the scene system:
- Parent-child hierarchy (attach objects to each other)
- Scene saving and loading (JSON serialization)
- Multiple scenes (switch between levels)
- Scene transitions
- **Enhance hierarchy panel** with tree view
- **Add object creation menu** in editor
- **Implement scene save/load buttons**

You're no longer just writing code—you're building a tool that makes game development easier. Every feature you add makes your engine more powerful.

See you in Chapter 4!

---

**Chapter 3 Complete** ✓

*Deliverable: Component system with GameObjects + basic editor UI with hierarchy, inspector, and play/stop controls*