# Event Bus Refactoring Plan: Chapter 7.1

## Executive Summary

This document outlines a comprehensive plan to refactor the game engine to use a **single centralized Events object** for communication, eliminating ServiceLocator and window hacks entirely.

**Architecture Principles**:
1. **Proper dependency injection** - Components get references they need via constructors
2. **Events for communication** - Bidirectional event-based messaging for cross-component interaction
3. **Function registry for cross-cutting getters only** - Things like `getSelectedObjectId()` that are truly global state

**Current State**: Window hacks, ServiceLocator anti-pattern, tight coupling
**Target State**: Clean dependencies, event-driven communication, ServiceLocator deleted
**Impact**: ~18 files modified, much cleaner architecture

---

## Architecture Vision

### Current Problems

```typescript
// PROBLEM 1: Window Hacks
const engine = (window as any).engine as Engine;
this.input = engine.getInputManager();

// PROBLEM 2: ServiceLocator Anti-Pattern
const scene = ServiceLocator.getScene();
const go = scene.findById(selectedId);

// PROBLEM 3: Tight Coupling
editorUI.selectObject(objectId);
hierarchyPanel.refresh();  // Direct call cascade
inspectorPanel.refresh();
```

### Target Architecture

```typescript
// PRINCIPLE 1: Proper Dependency Injection
class CameraPreview {
    constructor(scene: Scene, events: Events) {
        this.scene = scene;  // Direct reference, not ServiceLocator!
        this.events = events;
    }
}

// PRINCIPLE 2: Events for Communication (Request/Response)
class EditorCameraController {
    frameSelected() {
        // Request via event - use individual args!
        this.events.fire('scene:findObjectById', selectedId, (gameObject) => {
            if (gameObject) this.frameObject(gameObject);
        });
    }
}

class Scene {
    setupEventListeners() {
        // Respond via callback
        this.events.on('scene:findObjectById', (id, callback) => {
            const go = this.getGameObject(id);
            callback(go);
        }, this);
    }
}

// PRINCIPLE 3: Function Registry for True Cross-Cutting State
events.function('getSelectedObjectId', () => editorUI.selectedObjectId);

class SomeComponent {
    update() {
        const selectedId = events.invoke('getSelectedObjectId');
    }
}
```

---

## Core Concepts

### Pattern 1: Events for State Changes (Pub/Sub)

**Use for**: Notifications, state changes broadcasted to many listeners

```typescript
// ONE emitter, MANY listeners
// fire() supports up to 8 arguments - use them directly!
this.events.fire('object:selected', 'abc123', 'previous-id');

// Multiple components react
hierarchyPanel.on('object:selected', (objectId, previousId) => {
    this.refresh();
}, this);
inspectorPanel.on('object:selected', (objectId) => {
    this.refresh();
}, this);
```

---

### Pattern 2: Events for Requests (Callback Pattern)

**Use for**: Request/response when you need data from another component

```typescript
// REQUEST: Need to find object by ID
// Use individual arguments, not objects!
this.events.fire('scene:findObjectById', 'abc123', (gameObject) => {
    console.log('Found:', gameObject);
});

// RESPONSE: Scene handles request
this.events.on('scene:findObjectById', (id, callback) => {
    const go = this.getGameObject(id);
    callback(go);
}, this);
```

**Alternative**: Direct reference is better if possible!

```typescript
// BETTER: Just hold a reference
class CameraPreview {
    constructor(scene: Scene, events: Events) {
        this.scene = scene;  // Direct reference
    }

    update() {
        const cameras = this.scene.getAllGameObjects()
            .filter(go => go.getComponent(Camera));
    }
}
```

---

### Pattern 3: Function Registry (Cross-Cutting Getters Only)

**Use ONLY for**: Truly global state that many components need (like selection)

```typescript
// REGISTER: EditorUI owns selection state
events.function('getSelectedObjectId', () => this.selectedObjectId);

// INVOKE: Anyone can get selected ID
const selectedId = events.invoke('getSelectedObjectId');
```

**DO NOT USE for**: Services that should be dependency-injected (Scene, Input, etc.)

---

## Pattern Decision Guide

### ❌ BEFORE (Bad Patterns)

```typescript
// BAD: ServiceLocator for everything
const scene = ServiceLocator.getScene();
const input = ServiceLocator.getInput();
const isPlaying = ServiceLocator.isPlaying();

// BAD: Window hacks
const engine = (window as any).engine;
const editor = (window as any).editor;
```

### ✅ AFTER (Good Patterns)

```typescript
// GOOD: Constructor injection for services
class EditorCameraController {
    constructor(camera: Camera, input: InputManager, events: Events) {
        this.input = input;    // Direct reference
        this.events = events;
    }
}

// GOOD: Events for state notifications
this.events.fire('engine:play');
this.events.on('engine:play', this.onPlay, this);

// GOOD: Function registry ONLY for cross-cutting getters
const selectedId = events.invoke('getSelectedObjectId');

// GOOD: Direct references when you own the relationship
class CameraPreview {
    constructor(scene: Scene, events: Events) {
        this.scene = scene;  // CameraPreview needs Scene, so pass it!
    }
}
```

---

## Phase 1: Foundation

### Step 1.1: Initialize Events in Engine

**File**: `src/core/Engine.ts`

```typescript
import { Events } from '../events';

export class Engine {
    public readonly events: Events;

    private inputManager: InputManager;
    private renderer: Renderer;
    private scene: Scene | null = null;
    private isPlaying: boolean = false;

    constructor(canvasId: string) {
        // FIRST: Create event bus
        this.events = new Events();

        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) {
            throw new Error(`Canvas with id "${canvasId}" not found`);
        }

        // Pass events to subsystems
        this.inputManager = new InputManager(canvas, this.events);
        this.renderer = new Renderer(canvas, this.events);

        // Setup event handlers
        this.setupEngineEventHandlers();

        // ... rest of initialization ...
    }

    private setupEngineEventHandlers(): void {
        // Engine doesn't register functions - only emits/listens to events
    }
}
```

---

### Step 1.2: Make Events Global

**File**: `main.ts`

**BEFORE**:
```typescript
import { ServiceLocator } from './core/ServiceLocator';

const engine = new Engine('game-canvas');
ServiceLocator.registerEngine(engine);

(window as any).engine = engine;
(window as any).ServiceLocator = ServiceLocator;
(window as any).editor = editor;
```

**AFTER**:
```typescript
// ServiceLocator import removed

const engine = new Engine('game-canvas');


// Dev debugging only
if (import.meta.env.DEV) {
    (window as any).__DEBUG__ = { engine, scene, editor };
}
```

---

### Step 1.3: Document Event Patterns

**File**: `src/events.ts` (add header documentation)

```typescript
/**
 * EVENTS - Global Communication Bus
 *
 * =============================================================================
 * THREE COMMUNICATION PATTERNS:
 * =============================================================================
 *
 * 1. PUB/SUB EVENTS (State Notifications)
 *    - One emitter, many listeners
 *    - Use for: State changes, lifecycle events
 *    - IMPORTANT: Use individual args (up to 8), NOT objects!
 *    - Example:
 *        events.fire('object:selected', objectId, previousId);
 *        events.on('object:selected', (objectId, previousId) => {...}, scope);
 *
 * 2. REQUEST/RESPONSE EVENTS (Optional - prefer direct refs)
 *    - Request with callback
 *    - Use when: Can't hold direct reference
 *    - IMPORTANT: Use individual args (up to 8), NOT objects!
 *    - Example:
 *        events.fire('scene:findObjectById', id, callback);
 *        events.on('scene:findObjectById', (id, callback) => {...}, scope);
 *
 * 3. FUNCTION REGISTRY (Cross-Cutting Getters Only)
 *    - Get truly global state
 *    - Use ONLY for: Things like selection that everyone needs
 *    - Example:
 *        events.function('getSelectedObjectId', () => selectedId);
 *        const id = events.invoke('getSelectedObjectId');
 *
 * =============================================================================
 * EVENT NAMING CONVENTION:
 * =============================================================================
 *
 * Format: "namespace:action"
 *
 * Namespaces:
 *   engine:     Engine lifecycle (play, stop, resize)
 *   scene:      Scene operations (loaded, objectAdded, objectRemoved)
 *   object:     GameObject state (created, destroyed, selected, deselected)
 *   component:  Component lifecycle (added, removed)
 *   input:      Input events (keyDown, mouseMove, etc.)
 *   project:    Project state (opened, saved)
 *   editor:     Editor UI (gizmoModeChanged, toolChanged)
 *
 * =============================================================================
 * FUNCTION NAMING: camelCase (for cross-cutting getters only)
 * =============================================================================
 *
 *   getSelectedObjectId() -> string | null
 *
 * DO NOT USE for service access - use dependency injection instead!
 *
 * =============================================================================
 */

export class EventHandle { ... }
export class EventHandler { ... }

type FunctionCallback = (...args: any[]) => any;

class Events extends EventHandler {
    functions = new Map<string, FunctionCallback>();

    function(name: string, fn: FunctionCallback) {
        if (this.functions.has(name)) {
            throw new Error(`error: function ${name} already exists`);
        }
        this.functions.set(name, fn);
    }

    invoke(name: string, ...args: any[]) {
        const fn = this.functions.get(name);
        if (!fn) {
            console.log(`error: function not found '${name}'`);
            return;
        }
        return fn(...args);
    }
}

export { Events };
```

---

## Phase 2: Core Engine Events

### Step 2.1: Engine Lifecycle Events

**File**: `src/core/Engine.ts`

```typescript
public play(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.scene?.onPlay();

    // EMIT: Play mode started
    this.events.fire('engine:play');
}

public stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.scene?.onStop();

    // EMIT: Play mode stopped
    this.events.fire('engine:stop');
}

public loadScene(scene: Scene): void {
    const oldScene = this.scene;
    this.scene = scene;
    this.renderer.setScene(scene);

    // Give scene access to events
    scene.setEvents(this.events);

    // EMIT: Scene loaded (individual args!)
    this.events.fire('scene:loaded', scene, oldScene);
}

private onResize = (): void => {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.renderer.setSize(width, height);

    // EMIT: Resize event (individual args!)
    this.events.fire('engine:resize', width, height);
};
```

**Who listens**: CameraGizmo, CameraPreview, EditorGrid (for play/stop)

---

### Step 2.2: Scene Events

**File**: `src/core/Scene.ts`

```typescript
export class Scene {
    private events: Events | null = null;

    // Engine calls this after loadScene
    public setEvents(events: Events): void {
        this.events = events;
    }

    public addGameObject(gameObject: GameObject, parent?: GameObject): void {
        // ... existing logic ...

        // EMIT: Object added (individual args!)
        if (this.events) {
            this.events.fire('scene:objectAdded', gameObject, parent || null);
        }
    }

    public removeGameObject(gameObject: GameObject): void {
        // ... existing logic ...

        // EMIT: Object removed (individual args!)
        if (this.events) {
            this.events.fire('scene:objectRemoved', gameObject);
        }
    }

    public getGameObject(id: string): GameObject | undefined {
        return this.allGameObjects.get(id);
    }

    public getAllGameObjects(): GameObject[] {
        return Array.from(this.allGameObjects.values());
    }
}
```

**Who listens**: HierarchyPanel, InspectorPanel

---

### Step 2.3: GameObject Events

**File**: `src/core/GameObject.ts`

```typescript
export class GameObject {
    constructor(name: string) {
        // ... existing initialization ...

        // EMIT: Object created (individual args!)
        const events = (window as any).events as Events;
        if (events) {
            events.fire('object:created', this);
        }
    }

    public addComponent<T extends Component>(componentClass: new () => T): T {
        const component = new componentClass();
        component.gameObject = this;
        this.components.push(component);

        if (component.awake) {
            component.awake();
        }

        // EMIT: Component added (individual args!)
        const events = (window as any).events as Events;
        if (events) {
            events.fire('component:added', this, component);
        }

        return component;
    }

    public removeComponent(component: Component): void {
        const index = this.components.indexOf(component);
        if (index === -1) return;

        this.components.splice(index, 1);

        // EMIT: Component removed (individual args!)
        const events = (window as any).events as Events;
        if (events) {
            events.fire('component:removed', this, component);
        }
    }

    public setActive(active: boolean): void {
        if (this.active === active) return;
        this.active = active;
        this.object3D.visible = active;

        // EMIT: Active changed (individual args!)
        const events = (window as any).events as Events;
        if (events) {
            events.fire('object:activeChanged', this, active);
        }
    }
}
```

---

## Phase 3: Editor - Proper Dependency Injection

### Step 3.1: EditorUI - Register Selection Getter

**File**: `src/editor/EditorUI.ts`

```typescript
export class EditorUI {
    private events: Events;
    private selectedObjectId: string | null = null;

    constructor(engine: Engine) {
        this.engine = engine;
        this.events = engine.events;

        // ... existing initialization ...

        // Register ONLY cross-cutting state (selection)
        this.registerEditorFunctions();

        // Initialize panels with proper dependencies
        this.initializePanels();
    }

    private registerEditorFunctions(): void {
        // ONLY register getters for truly global state
        this.events.function('getSelectedObjectId', () => {
            return this.selectedObjectId;
        });

        // DO NOT register actions - use events instead
        // DO NOT register services - use dependency injection instead
    }

    private initializePanels(): void {
        // Pass scene reference directly (not via ServiceLocator!)
        const scene = this.engine.getScene();

        this.hierarchyPanel = new HierarchyPanel(
            document.getElementById('hierarchy-panel')!,
            this.events,
            this
        );

        this.inspectorPanel = new InspectorPanel(
            document.getElementById('inspector-panel')!,
            this.events,
            this
        );

        this.projectPanel = new ProjectPanel(
            document.getElementById('project-panel')!,
            this.events,
            this
        );
    }

    // BEFORE: Direct calls to panels
    // public selectObject(objectId: string | null): void {
    //     this.selectedObjectId = objectId;
    //     this.hierarchyPanel.refresh();
    //     this.inspectorPanel.refresh();
    // }

    // AFTER: Emit event, panels listen
    public selectObject(objectId: string | null): void {
        const previousId = this.selectedObjectId;
        this.selectedObjectId = objectId;

        // Update visual feedback
        this.selectionOutline.setSelectedObject(objectId);

        // EMIT: Selection changed (individual args!)
        this.events.fire('object:selected', objectId, previousId);
    }
}
```

---

### Step 3.2: Panels Listen to Events

**File**: `src/editor/HierarchyPanel.ts`

```typescript
export class HierarchyPanel {
    private events: Events;
    private editorUI: EditorUI;

    constructor(container: HTMLElement, events: Events, editorUI: EditorUI) {
        this.container = container;
        this.events = events;
        this.editorUI = editorUI;

        this.initialize();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen for events that require refresh
        // Listeners receive individual args, not objects!
        this.events.on('object:selected', (objectId, previousId) => {
            this.refresh();
        }, this);
        this.events.on('scene:objectAdded', (gameObject, parent) => {
            this.refresh();
        }, this);
        this.events.on('scene:objectRemoved', (gameObject) => {
            this.refresh();
        }, this);
        this.events.on('object:activeChanged', (gameObject, active) => {
            this.refresh();
        }, this);
        this.events.on('scene:loaded', (scene, previousScene) => {
            this.refresh();
        }, this);
    }

    public refresh(): void {
        // ... existing refresh logic ...
        // Can use: this.editorUI.engine.getScene()
        // Or: events.invoke('getScene') if Scene registered a getter
        // Better: Store scene reference directly
    }
}
```

**File**: `src/editor/InspectorPanel.ts`

```typescript
export class InspectorPanel {
    private events: Events;

    constructor(container: HTMLElement, events: Events, editorUI: EditorUI) {
        this.events = events;
        this.editorUI = editorUI;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listeners receive individual args!
        this.events.on('object:selected', (objectId, previousId) => {
            this.refresh();
        }, this);
        this.events.on('component:added', (gameObject, component) => {
            this.refresh();
        }, this);
        this.events.on('component:removed', (gameObject, component) => {
            this.refresh();
        }, this);
        this.events.on('object:activeChanged', (gameObject, active) => {
            this.refresh();
        }, this);
    }

    public refresh(): void {
        // Get selected object ID via function registry
        const selectedId = this.events.invoke('getSelectedObjectId') as string | null;
        if (!selectedId) {
            this.clear();
            return;
        }

        // Get scene to find object
        const scene = this.editorUI.engine.getScene();
        if (!scene) return;

        const gameObject = scene.getGameObject(selectedId);
        // ... render inspector ...
    }
}
```

---

### Step 3.3: Fix EditorCameraController - Proper Injection

**File**: `src/editor/EditorCameraController.ts`

**BEFORE** (ServiceLocator):
```typescript
export class EditorCameraController {
    constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
        this.camera = camera;
        this.canvas = canvas;
        this.input = ServiceLocator.getInput();  // BAD
    }

    frameSelected(): void {
        const editorUI = (window as any).editor;  // BAD
        const selectedId = editorUI.selectedObjectId;
        const scene = ServiceLocator.getScene();  // BAD
        const go = scene.getGameObject(selectedId);
    }
}
```

**AFTER** (Proper injection):
```typescript
export class EditorCameraController {
    private input: InputManager;
    private events: Events;
    private scene: Scene;

    constructor(
        camera: THREE.PerspectiveCamera,
        canvas: HTMLCanvasElement,
        input: InputManager,
        scene: Scene,
        events: Events
    ) {
        this.camera = camera;
        this.canvas = canvas;
        this.input = input;      // Direct reference
        this.scene = scene;      // Direct reference
        this.events = events;
    }

    frameSelected(): void {
        // Get selected ID via function registry (truly cross-cutting)
        const selectedId = this.events.invoke('getSelectedObjectId') as string | null;
        if (!selectedId) return;

        // Use direct scene reference
        const gameObject = this.scene.getGameObject(selectedId);
        if (!gameObject) return;

        // ... frame logic ...
    }
}
```

**File**: `src/core/Engine.ts` - Update EditorCameraController creation

```typescript
constructor(canvasId: string) {
    // ... existing setup ...

    // Create editor camera controller with proper dependencies
    this.editorCameraController = new EditorCameraController(
        this.renderer.camera,
        canvas,
        this.inputManager,    // Direct reference
        this.scene!,          // Direct reference (or pass later)
        this.events           // Events for cross-cutting concerns
    );
}
```

---

### Step 3.4: Fix CameraPreview - Direct Scene Reference

**File**: `src/editor/gizmos/CameraPreview.ts`

**BEFORE** (ServiceLocator):
```typescript
export class CameraPreview {
    update(): void {
        if (ServiceLocator.isPlaying()) {  // BAD
            this.hide();
            return;
        }

        const scene = ServiceLocator.getScene();  // BAD
        const cameras = scene.getAllCameras();
    }
}
```

**AFTER** (Direct reference + events):
```typescript
export class CameraPreview {
    private scene: Scene;
    private events: Events;
    private isPlaying: boolean = false;

    constructor(scene: Scene, events: Events, engine: Engine) {
        this.scene = scene;      // Direct reference!
        this.events = events;
        this.engine = engine;

        this.initialize();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen for play/stop (no args for these events)
        this.events.on('engine:play', () => {
            this.isPlaying = true;
            this.hide();
        }, this);

        this.events.on('engine:stop', () => {
            this.isPlaying = false;
            this.show();
        }, this);

        // Listen for scene changes (individual args!)
        this.events.on('scene:loaded', (scene, previousScene) => {
            this.scene = scene;  // Update reference
            this.update();
        }, this);
    }

    update(): void {
        if (this.isPlaying) return;

        // Use direct scene reference
        const allObjects = this.scene.getAllGameObjects();
        const cameras = allObjects.filter(go => go.getComponent(Camera));
        // ... render previews ...
    }
}
```

---

### Step 3.5: Fix CameraGizmo - Direct References

**File**: `src/editor/gizmos/CameraGizmo.ts`

**BEFORE** (ServiceLocator):
```typescript
export class CameraGizmo {
    update(): void {
        if (ServiceLocator.isPlaying()) {
            this.container.style.display = 'none';
            return;
        }

        const scene = ServiceLocator.getScene();
        const renderer = ServiceLocator.getEngine()?.getRenderer();
        // ...
    }
}
```

**AFTER** (Direct references):
```typescript
export class CameraGizmo {
    private scene: Scene;
    private renderer: Renderer;
    private events: Events;
    private isPlaying: boolean = false;

    constructor(scene: Scene, renderer: Renderer, events: Events) {
        this.scene = scene;
        this.renderer = renderer;
        this.events = events;

        this.initialize();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.events.on('engine:play', () => {
            this.isPlaying = true;
            this.container.style.display = 'none';
        }, this);

        this.events.on('engine:stop', () => {
            this.isPlaying = false;
            this.container.style.display = 'block';
        }, this);

        // Individual args!
        this.events.on('scene:loaded', (scene, previousScene) => {
            this.scene = scene;
            this.updateButtons();
        }, this);
    }

    update(): void {
        if (this.isPlaying) return;

        // Use direct references
        const cameras = this.scene.getAllGameObjects()
            .filter(go => go.getComponent(Camera));
        // ...
    }
}
```

---

### Step 3.6: Update EditorUI to Pass Dependencies

**File**: `src/editor/EditorUI.ts`

```typescript
constructor(engine: Engine) {
    this.engine = engine;
    this.events = engine.events;

    // ... existing setup ...

    const scene = engine.getScene()!;
    const renderer = engine.getRenderer();

    // Create gizmos with proper dependencies
    this.cameraGizmo = new CameraGizmo(
        scene,      // Direct reference
        renderer,   // Direct reference
        this.events
    );

    this.cameraPreview = new CameraPreview(
        scene,      // Direct reference
        this.events,
        engine
    );

    this.editorGrid = new EditorGrid(
        renderer.scene,  // THREE.Scene
        this.events
    );
}
```

---

## Phase 4: Component Updates

### Step 4.1: Remove Window Hacks from PlayerController

**File**: `src/components/PlayerController.ts`

**BEFORE** (window hacks):
```typescript
export class PlayerController extends Component {
    private input: InputManager | null = null;

    start(): void {
        const engine = (window as any).engine as Engine;
        this.input = engine.getInputManager();
    }

    update(deltaTime: number): void {
        const engine = (window as any).engine as Engine;
        if (!engine.isPlaying) return;

        // ... movement ...
    }
}
```

**AFTER** (events):
```typescript
export class PlayerController extends Component {
    private input: InputManager | null = null;
    private isPlaying: boolean = false;

    start(): void {
        // Get events from global
        const events = (window as any).events as Events;

        // Get InputManager - we need it for polling
        // Option 1: Via function registry (if registered)
        this.input = events.invoke('getInput') as InputManager;

        // Option 2: Request via event callback pattern (individual args!)
        events.fire('engine:getInput', (input: InputManager) => {
            this.input = input;
        });

        // Listen for play/stop state
        events.on('engine:play', () => {
            this.isPlaying = true;
        }, this);

        events.on('engine:stop', () => {
            this.isPlaying = false;
        }, this);
    }

    update(deltaTime: number): void {
        if (!this.isPlaying || !this.input) return;

        // ... movement logic ...
    }
}
```

**DECISION POINT**: Should Engine register `getInput` in function registry?

**Option A - Register in Engine**:
```typescript
// Engine.ts
private registerEngineFunctions(): void {
    // Register input access for game components
    this.events.function('getInput', () => this.inputManager);
}
```

**Option B - Components hold reference via callback**:
```typescript
// Engine.ts
private setupEngineEventHandlers(): void {
    // Individual args!
    this.events.on('engine:getInput', (callback) => {
        callback(this.inputManager);
    }, this);
}
```

**RECOMMENDATION**: Use Option A for InputManager since it's truly needed by game components and polling-based.

---

### Step 4.2: Engine Registers Minimal Functions

**File**: `src/core/Engine.ts`

```typescript
private registerEngineFunctions(): void {
    // ONLY register what's truly needed for game components
    // InputManager - components need to poll input
    this.events.function('getInput', () => this.inputManager);

    // DO NOT register:
    // - getScene() - use dependency injection or events
    // - getRenderer() - use dependency injection
    // - isPlaying() - use events (engine:play/stop)
}
```

---

## Phase 5: Delete ServiceLocator

### Step 5.1: Remove All ServiceLocator Imports

**Files to update**:
- `src/editor/gizmos/CameraGizmo.ts` - Remove import
- `src/editor/gizmos/CameraPreview.ts` - Remove import
- `src/editor/EditorCameraController.ts` - Remove import
- `main.ts` - Remove import and registration

**Search pattern**: `import.*ServiceLocator` - Should find 0 results after this phase

---

### Step 5.2: Delete ServiceLocator File

**File**: `src/core/ServiceLocator.ts`

**ACTION**: Delete entire file

---

### Step 5.3: Update main.ts

**File**: `main.ts`

**BEFORE**:
```typescript
import { ServiceLocator } from './core/ServiceLocator';

const engine = new Engine('game-canvas');
ServiceLocator.registerEngine(engine);

const scene = new Scene('Main Scene');
// ... setup scene ...

const editor = new EditorUI(engine);
engine.setEditorUI(editor);

(window as any).engine = engine;
(window as any).ServiceLocator = ServiceLocator;
(window as any).editor = editor;
```

**AFTER**:
```typescript
// No ServiceLocator import!

const engine = new Engine('game-canvas');
// No ServiceLocator.registerEngine!

const scene = new Scene('Main Scene');
// ... setup scene ...

const editor = new EditorUI(engine);
engine.setEditorUI(editor);

// Single global: events
(window as any).events = engine.events;

// Optional dev debugging
if (import.meta.env.DEV) {
    (window as any).__DEBUG__ = { engine, editor };
}
```

---

## Event Catalog

### Events (Pub/Sub)

**NOTE**: All events use individual arguments (up to 8), NOT packed objects!

**Engine**:
- `engine:play` - Play mode started
  - Args: (none)
- `engine:stop` - Play mode stopped
  - Args: (none)
- `engine:resize` - Window resized
  - Args: `(width: number, height: number)`

**Scene**:
- `scene:loaded` - Scene loaded
  - Args: `(scene: Scene, previousScene: Scene | null)`
- `scene:objectAdded` - Object added
  - Args: `(gameObject: GameObject, parent: GameObject | null)`
- `scene:objectRemoved` - Object removed
  - Args: `(gameObject: GameObject)`

**Object**:
- `object:created` - GameObject created
  - Args: `(gameObject: GameObject)`
- `object:selected` - Object selected
  - Args: `(objectId: string | null, previousId: string | null)`
- `object:activeChanged` - Active toggled
  - Args: `(gameObject: GameObject, active: boolean)`

**Component**:
- `component:added` - Component added
  - Args: `(gameObject: GameObject, component: Component)`
- `component:removed` - Component removed
  - Args: `(gameObject: GameObject, component: Component)`

**Project**:
- `project:opened` - Project opened
  - Args: `(project: Project)`
- `project:saved` - Project saved
  - Args: `(project: Project)`

**Editor**:
- `editor:gizmoModeChanged` - Gizmo mode changed
  - Args: `(mode: 'translate' | 'rotate' | 'scale')`

---

### Functions (Cross-Cutting Getters Only)

**Selection State** (truly global):
- `getSelectedObjectId()` → string | null

**Engine Services** (for game components that need polling):
- `getInput()` → InputManager

**That's it!** Everything else uses dependency injection or events.

---

## Constructor Signature Changes Summary

### Before → After

```typescript
// EditorCameraController
BEFORE: (camera, canvas)
AFTER:  (camera, canvas, input, scene, events)

// CameraPreview
BEFORE: ()
AFTER:  (scene, events, engine)

// CameraGizmo
BEFORE: ()
AFTER:  (scene, renderer, events)

// EditorGrid
BEFORE: (scene)
AFTER:  (scene, events)

// HierarchyPanel
BEFORE: (container, editorUI)
AFTER:  (container, events, editorUI)

// InspectorPanel
BEFORE: (container, editorUI)
AFTER:  (container, events, editorUI)

// ProjectPanel
BEFORE: (container, editorUI)
AFTER:  (container, events, editorUI)
```

---

## File Change Summary

**Deleted** (1):
- ❌ `src/core/ServiceLocator.ts`

**Core** (4):
- ✏️ `src/core/Engine.ts` - Add events, emit lifecycle, register minimal functions
- ✏️ `src/core/Scene.ts` - Store events, emit scene events
- ✏️ `src/core/GameObject.ts` - Emit object/component events
- ✏️ `src/core/InputManager.ts` - Accept events in constructor

**Events** (1):
- ✏️ `src/events.ts` - Add documentation

**Components** (1):
- ✏️ `src/components/PlayerController.ts` - Use events instead of window

**Editor** (9):
- ✏️ `src/editor/EditorUI.ts` - Register selection getter, emit events, pass deps
- ✏️ `src/editor/HierarchyPanel.ts` - Accept events, listen
- ✏️ `src/editor/InspectorPanel.ts` - Accept events, listen
- ✏️ `src/editor/ProjectPanel.ts` - Accept events, listen
- ✏️ `src/editor/EditorCameraController.ts` - Accept input/scene/events directly
- ✏️ `src/editor/gizmos/CameraGizmo.ts` - Accept scene/renderer/events
- ✏️ `src/editor/gizmos/CameraPreview.ts` - Accept scene/events
- ✏️ `src/editor/gizmos/EditorGrid.ts` - Accept events
- ✏️ `src/editor/ViewportGizmo.ts` - May need events

**Entry** (1):
- ✏️ `main.ts` - Remove ServiceLocator, expose window.events

**Total**: 18 files (1 deleted, 17 modified)

---

## Implementation Order

### Phase 1: Foundation (2-3 hours)
1. Add events to Engine constructor
2. Make events global in main.ts
3. Document patterns in events.ts
4. Test: `window.events` accessible

### Phase 2: Core Events (2-3 hours)
5. Engine lifecycle events (play/stop/resize)
6. Scene events (loaded/objectAdded/objectRemoved)
7. GameObject events (created/selected/activeChanged/component)
8. Test: Events firing in console

### Phase 3: Editor (4-5 hours) ⭐ BIGGEST PHASE
9. EditorUI - register selection getter, emit events
10. Update all panel constructors to accept events
11. Panels listen to events instead of manual refresh
12. Update EditorCameraController constructor (add input/scene/events)
13. Update CameraPreview constructor (add scene/events)
14. Update CameraGizmo constructor (add scene/renderer/events)
15. Update EditorGrid constructor (add events)
16. Update Engine to pass dependencies to all editor components
17. Test: Selection, refresh, play/stop all working

### Phase 4: Components (1-2 hours)
18. PlayerController - use events
19. Engine - register getInput function
20. Test: PlayerController working in play mode

### Phase 5: Delete ServiceLocator (1 hour) ⭐ SATISFYING
21. Remove all ServiceLocator imports
22. Delete ServiceLocator.ts
23. Update main.ts
24. Full integration test
25. Celebrate! 🎉

**Total**: 10-14 hours across 2-3 weeks

---

## Testing Checklist

**Phase 1**:
- [ ] Engine starts without errors
- [ ] `window.events` exists
- [ ] Can call `events.on()` and `events.fire()`

**Phase 2**:
- [ ] Play/stop emits events
- [ ] Scene load emits events
- [ ] Adding object emits event
- [ ] Adding component emits event

**Phase 3** (Critical):
- [ ] Click object in viewport → selects
- [ ] Click object in hierarchy → selects
- [ ] Inspector refreshes on selection
- [ ] Hierarchy refreshes on selection
- [ ] Create object → hierarchy updates
- [ ] Delete object → hierarchy updates
- [ ] Play → gizmos hide
- [ ] Stop → gizmos show
- [ ] Camera preview works
- [ ] Frame selected works

**Phase 4**:
- [ ] PlayerController moves in play mode
- [ ] PlayerController stops in edit mode
- [ ] No console errors

**Phase 5**:
- [ ] No ServiceLocator imports
- [ ] File deleted
- [ ] Everything still works
- [ ] No window.engine or window.editor (except __DEBUG__)

---

## Success Criteria

✅ ServiceLocator.ts deleted
✅ Zero `import ServiceLocator` statements
✅ Zero window.engine hacks
✅ Single global: `window.events`
✅ Function registry has ONLY: getSelectedObjectId, getInput
✅ All editor components use proper dependency injection
✅ All cross-component communication via events
✅ No performance regression
✅ All tests pass

---

## Architecture Philosophy

### The Three Pillars

1. **Dependency Injection** - "If you need it often, pass it in the constructor"
   - CameraPreview needs Scene → pass Scene directly
   - EditorCameraController needs InputManager → pass it directly

2. **Events for Communication** - "If you're notifying or requesting, use events"
   - Object selected → fire event, many listeners react
   - Need to find object → fire event with callback (or use direct ref)

3. **Function Registry for Cross-Cutting Getters** - "If EVERYONE needs it, register it"
   - Selected object ID → everyone needs this
   - InputManager → game components need to poll input

### Anti-Patterns to Avoid

❌ ServiceLocator everywhere (hidden global)
❌ window.engine/window.editor everywhere (explicit globals)
❌ Registering actions in function registry (use events)
❌ Registering services in function registry (use dependency injection)
❌ Direct method calls between components (use events)

---

**Document Version**: 3.0 - Clean Architecture
**Last Updated**: 2025-12-20
**Key Principle**: Dependency injection first, events second, function registry sparingly
