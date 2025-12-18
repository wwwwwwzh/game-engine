# Chapter 4.1 Refactoring Plan

## Executive Summary

The current architecture has **tight coupling and redundant synchronization** between custom classes and Three.js Object3D. This plan proposes making Three.js the **single source of truth** for transforms and scene hierarchy, with our custom classes acting as thin wrappers that leverage Three.js's powerful built-in systems.

---

## Current Architecture Problems

### 1. **Dual Transform Systems**
- **Custom Transform**: Maintains `_localPosition`, `_localRotation`, `_localScale`, and custom world matrix calculation
- **Three.js Object3D**: Has its own `position`, `rotation`, `scale`, `matrix`, `matrixWorld`
- **Problem**: We duplicate what Three.js already does perfectly, then sync constantly

### 2. **Renderer Does Too Much**
```typescript
// Renderer.ts lines 169-201
public update(deltaTime: number): void {
    // Camera smoothing (OK)
    // Re-sync scene (REDUNDANT)
    this.syncSceneToThree();
    // Sync all transforms EVERY FRAME (WASTEFUL)
    this.syncTransforms();
}
```
**Problems:**
- `syncSceneToThree()` called every frame even if nothing changed
- `syncTransforms()` iterates ALL GameObjects to push transforms to Object3D
- Renderer shouldn't manage GameObject hierarchy

### 3. **Hierarchy Management is Split**
- **GameObject** manages custom parent-child relationships
- **Renderer** handles Three.js scene graph hierarchy via `syncGameObjectHierarchy()`
- **MeshRenderer** links individual meshes
- **Problem**: Three responsibilities for one concept

### 4. **Manual Matrix Management**
```typescript
// MeshRenderer.ts line 47
this.mesh.matrixAutoUpdate = false;

// Transform.ts lines 161-172
public updateObject3D(): void {
    this.object3D.position.copy(this._localPosition);
    this.object3D.rotation.copy(this._localRotation);
    this.object3D.scale.copy(this._localScale);
    if (!this.object3D.matrixAutoUpdate) {
        this.object3D.updateMatrix();
    }
}
```
**Problem**: We disable Three.js's automatic matrix updates, then manually do what it would do anyway

### 5. **Cross-Class Coupling**
```
Renderer -> Scene -> GameObject -> Transform -> Object3D
   ↓                                    ↑
MeshRenderer ←──────────────────────────┘
```
**Current flow:**
1. GameObject changes → Transform.markDirty()
2. Every frame: Renderer.update() → syncTransforms() → Transform.updateObject3D()
3. MeshRenderer creates Object3D → Transform.linkObject3D()
4. Renderer.syncGameObjectHierarchy() adds Object3D to scene graph

**Problem**: Too many classes involved in simple operations

---

## Proposed Architecture

### Core Principle: **Three.js is the Authority**

Three.js Object3D already provides:
- ✅ Hierarchical transforms (local/world space)
- ✅ Automatic matrix updates
- ✅ Parent-child scene graph
- ✅ Efficient rendering
- ✅ World position/rotation/scale calculations

**Use it!**

---

## Detailed Refactoring Plan

### Phase 1: Transform Component Simplification

**Goal**: Make Transform a thin wrapper that delegates to Object3D

#### Current State:
```typescript
class Transform extends Component {
    private _localPosition: Vector3;     // REDUNDANT
    private _localRotation: Euler;       // REDUNDANT
    private _localScale: Vector3;        // REDUNDANT
    private _worldMatrix: Matrix4;       // REDUNDANT
    public object3D: Object3D | null;

    get position() { /* custom world calc */ }
    set position(v) { /* custom conversion */ }
    updateObject3D() { /* manual sync */ }
    markDirty() { /* custom dirty tracking */ }
}
```

#### New State:
```typescript
class Transform extends Component {
    public object3D: THREE.Object3D;  // Always exists, never null

    // Getters/setters directly delegate to object3D
    get localPosition(): Vector3 {
        return this.object3D.position;
    }
    set localPosition(value: Vector3) {
        this.object3D.position.copy(value);
    }

    get position(): Vector3 {
        const pos = new THREE.Vector3();
        this.object3D.getWorldPosition(pos);
        return pos;
    }
    set position(value: Vector3) {
        if (!this.gameObject?.parent) {
            this.object3D.position.copy(value);
        } else {
            // Let Three.js handle world-to-local conversion
            this.object3D.parent!.worldToLocal(value);
            this.object3D.position.copy(value);
        }
    }

    // Same pattern for rotation, scale
    // Remove: markDirty(), updateObject3D(), getLocalMatrix(), etc.
}
```

**Changes:**
1. **Remove duplicate storage**: No `_localPosition`, `_localRotation`, `_localScale`
2. **Remove custom matrix math**: Delete `_worldMatrix`, `getWorldMatrix()`, `updateWorldMatrix()`
3. **Remove manual sync**: Delete `updateObject3D()`, `markDirty()`
4. **Always create Object3D**: Initialize in constructor, never null
5. **Direct delegation**: All getters/setters use `this.object3D.*` directly

**Benefits:**
- ~100 lines of code deleted
- No sync overhead
- Three.js handles all matrix calculations automatically
- Single source of truth

---

### Phase 2: GameObject Manages Its Own Object3D

**Goal**: GameObject owns and manages the Three.js Object3D for hierarchy

#### Current State:
GameObject has hierarchy logic, but doesn't manage Object3D. MeshRenderer creates meshes, Renderer adds them to scene.

#### New State:
```typescript
class GameObject {
    public readonly transform: Transform;
    private object3D: THREE.Object3D;  // GameObject's Object3D
    private components: Component[] = [];

    constructor(name: string = 'GameObject') {
        this.id = `go_${nextId++}`;
        this.name = name;

        // Create Object3D first
        this.object3D = new THREE.Object3D();
        this.object3D.name = name;

        // Transform wraps this Object3D
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

    /**
     * Set parent - now handles both GameObject AND Object3D hierarchy
     */
    public setParent(newParent: GameObject | null, worldPositionStays: boolean = true): void {
        // ... existing validation ...

        // Update GameObject hierarchy (existing)
        this._parent = newParent;
        if (newParent) {
            newParent._addChild(this);
        }

        // Update Object3D hierarchy (NEW - replaces Renderer's job)
        if (newParent) {
            newParent.object3D.add(this.object3D, worldPositionStays);
        } else {
            // Becoming root - needs to be added to scene
            // Scene will handle this
            this.object3D.removeFromParent();
        }

        // Mark transform dirty if needed
        this.transform.markDirty();
    }
}
```

**Changes:**
1. **GameObject creates Object3D**: In constructor, before Transform
2. **Transform receives Object3D**: No longer creates it
3. **setParent() updates Object3D**: Directly manipulates Three.js scene graph
4. **Expose getObject3D()**: For Scene and components to access

**Benefits:**
- GameObject controls its own representation
- No separate sync step needed
- Parent-child changes immediately reflected in Three.js
- Clear ownership model

---

### Phase 3: MeshRenderer Becomes a Child

**Goal**: MeshRenderer adds mesh as child of GameObject's Object3D

#### Current State:
```typescript
class MeshRenderer extends Component {
    private mesh: THREE.Mesh | null;

    private updateMesh(): void {
        this.mesh = new THREE.Mesh(geometry, material);
        this.gameObject.transform.linkObject3D(this.mesh);  // WRONG
        this.mesh.matrixAutoUpdate = false;  // WRONG
    }
}
```
**Problem**: Mesh replaces GameObject's Object3D in Transform, breaking hierarchy

#### New State:
```typescript
class MeshRenderer extends Component {
    private mesh: THREE.Mesh | null;

    public getTypeName(): string {
        return 'MeshRenderer';
    }

    public setGeometry(geometry: THREE.BufferGeometry): void {
        this.geometry = geometry;
        this.updateMesh();
    }

    public setMaterial(material: THREE.Material): void {
        this.material = material;
        this.updateMesh();
    }

    private updateMesh(): void {
        if (!this.geometry || !this.material) return;

        if (!this.mesh) {
            this.mesh = new THREE.Mesh(this.geometry, this.material);

            // Add mesh as CHILD of GameObject's Object3D
            if (this.gameObject) {
                this.gameObject.getObject3D().add(this.mesh);
            }

            // Let Three.js handle matrix updates
            this.mesh.matrixAutoUpdate = true;  // CHANGED
        } else {
            this.mesh.geometry = this.geometry;
            this.mesh.material = this.material;
        }
    }

    public onDestroy(): void {
        if (this.mesh) {
            // Remove from parent Object3D
            this.gameObject?.getObject3D().remove(this.mesh);

            // Dispose resources
            this.mesh.geometry.dispose();
            if (this.mesh.material instanceof THREE.Material) {
                this.mesh.material.dispose();
            }
        }
    }
}
```

**Changes:**
1. **Mesh is child, not replacement**: `gameObject.getObject3D().add(mesh)`
2. **Enable automatic matrices**: `matrixAutoUpdate = true`
3. **Remove Transform.linkObject3D()**: Not needed
4. **onDestroy removes from parent**: `gameObject.getObject3D().remove(mesh)`

**Benefits:**
- Hierarchy: `GameObject(Object3D) -> Mesh`
- Transform applies to GameObject, which affects all children
- No manual matrix management
- Clean separation: GameObject has position, Mesh has visual

---

### Phase 4: Renderer Simplification

**Goal**: Make Renderer a thin wrapper over WebGPURenderer

#### Current State (Lines 169-201):
```typescript
public update(deltaTime: number): void {
    // Camera smoothing
    this.camera.position.copy(exponentialDecayVector3(...));

    // Re-sync scene EVERY FRAME (wasteful)
    if (this.currentScene) {
        this.syncSceneToThree();
        this.syncTransforms();  // Worst offender
    }
}

private syncSceneToThree(): void {
    // Complex recursive traversal
    const rootObjects = this.currentScene.getRootGameObjects();
    for (const gameObject of rootObjects) {
        this.syncGameObjectHierarchy(gameObject);  // 35 lines
    }
}

private syncGameObjectHierarchy(gameObject: any): void {
    // 28 lines of complex logic
    // Queries components, builds hierarchy, adds to scene
}

private syncTransforms(): void {
    // Iterates ALL GameObjects EVERY FRAME
    const allObjects = this.currentScene.getAllGameObjects();
    for (const gameObject of allObjects) {
        transform.updateObject3D();  // Manual sync
    }
}
```

#### New State:
```typescript
export class Renderer {
    private renderer: THREE.WebGPURenderer;
    private threeScene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    private isInitialized: boolean = false;

    // Removed: currentScene, syncSceneToThree, syncGameObjectHierarchy, syncTransforms

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGPURenderer({
            canvas: canvas,
            antialias: true,
            forceWebGL: false
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(new THREE.Color(0x1a1a1a), 1.0);

        this.threeScene = new THREE.Scene();

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.threeScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 7.5);
        this.threeScene.add(directionalLight);

        this.initializeRenderer();
    }

    private async initializeRenderer(): Promise<void> {
        await this.renderer.init();
        this.isInitialized = true;
        console.log('🎨 Renderer initialized');
    }

    /**
     * Get the Three.js scene for adding root objects
     */
    public getThreeScene(): THREE.Scene {
        return this.threeScene;
    }

    /**
     * Render the current frame
     */
    public render(): void {
        if (!this.isInitialized) return;
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
     * Get camera (for camera controls, etc.)
     */
    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }

    /**
     * Clean up
     */
    public dispose(): void {
        this.renderer.dispose();
    }
}
```

**Removed Methods:**
- ❌ `setScene(scene: Scene)` - Scene manages itself now
- ❌ `update(deltaTime: number)` - No sync needed
- ❌ `syncSceneToThree()` - GameObject does this
- ❌ `syncGameObjectHierarchy()` - GameObject does this
- ❌ `syncTransforms()` - Three.js does this
- ❌ `clearThreeScene()` - Scene.unload() handles this

**New Responsibility:**
- Provide access to `threeScene` so Scene can add root GameObjects
- Render each frame
- Handle resize
- Manage camera (possibly extract to CameraController later)

**Benefits:**
- 150+ lines of code deleted
- Zero per-frame overhead
- Simple, focused class
- Easy to understand and maintain

---

### Phase 5: Scene Manages Three.js Scene

**Goal**: Scene adds/removes GameObject Object3Ds from Three.js scene

#### Current State:
Scene just tracks GameObjects. Renderer does the Three.js work.

#### New State:
```typescript
export class Scene {
    public name: string;
    private rootGameObjects: GameObject[] = [];
    private allGameObjects: Map<string, GameObject> = new Map();
    private threeScene: THREE.Scene | null = null;  // NEW
    private _loaded: boolean = false;

    /**
     * Link this Scene to a Three.js scene for rendering
     */
    public linkThreeScene(threeScene: THREE.Scene): void {
        this.threeScene = threeScene;

        // Add existing root objects
        for (const go of this.rootGameObjects) {
            this.threeScene.add(go.getObject3D());
        }
    }

    public addGameObject(gameObject: GameObject): void {
        gameObject.scene = this;
        this.allGameObjects.set(gameObject.id, gameObject);

        if (!gameObject.parent) {
            this.rootGameObjects.push(gameObject);

            // Add to Three.js scene if linked
            if (this.threeScene) {
                this.threeScene.add(gameObject.getObject3D());
            }
        }

        // Register children recursively
        for (const child of gameObject.children) {
            this.addGameObject(child);
        }
    }

    public removeGameObject(gameObject: GameObject): void {
        this.allGameObjects.delete(gameObject.id);

        const rootIndex = this.rootGameObjects.indexOf(gameObject);
        if (rootIndex !== -1) {
            this.rootGameObjects.splice(rootIndex, 1);

            // Remove from Three.js scene
            if (this.threeScene) {
                this.threeScene.remove(gameObject.getObject3D());
            }
        }

        gameObject.scene = null;
    }

    // Internal methods for GameObject.setParent()
    public _addToRoots(gameObject: GameObject): void {
        if (!this.rootGameObjects.includes(gameObject)) {
            this.rootGameObjects.push(gameObject);

            // Add to Three.js scene
            if (this.threeScene) {
                this.threeScene.add(gameObject.getObject3D());
            }
        }
    }

    public _removeFromRoots(gameObject: GameObject): void {
        const index = this.rootGameObjects.indexOf(gameObject);
        if (index !== -1) {
            this.rootGameObjects.splice(index, 1);

            // Remove from Three.js scene
            if (this.threeScene) {
                this.threeScene.remove(gameObject.getObject3D());
            }
        }
    }

    public unload(): void {
        // Remove all from Three.js scene
        if (this.threeScene) {
            for (const go of this.rootGameObjects) {
                this.threeScene.remove(go.getObject3D());
            }
        }

        // Destroy all GameObjects
        for (const go of [...this.allGameObjects.values()]) {
            go.destroy();
        }

        this.rootGameObjects = [];
        this.allGameObjects.clear();
        this._loaded = false;
    }
}
```

**Changes:**
1. **Store threeScene reference**: Link to Renderer's scene
2. **addGameObject adds to Three.js**: Immediate sync
3. **removeGameObject removes from Three.js**: Immediate sync
4. **_addToRoots/_removeFromRoots manage Three.js**: For reparenting

**Benefits:**
- Scene knows when objects are added/removed
- Immediate sync, no per-frame overhead
- Clear ownership: Scene owns scene graph

---

### Phase 6: Update Engine Integration

**Goal**: Engine creates Renderer and Scene, links them

#### New Engine.loadScene():
```typescript
export class Engine {
    private renderer: Renderer;
    private currentScene: Scene | null = null;

    public loadScene(scene: Scene): void {
        if (this.currentScene) {
            this.currentScene.unload();
        }

        this.currentScene = scene;
        this.currentScene.load();

        // Link scene to renderer's Three.js scene
        scene.linkThreeScene(this.renderer.getThreeScene());

        console.log(`✅ Loaded scene: ${scene.name}`);
    }

    private update(deltaTime: number): void {
        // Update scene ONLY if playing
        if (this.isPlaying && this.currentScene) {
            this.currentScene.update(deltaTime);
        }

        // No renderer.update() needed anymore
    }

    private render(): void {
        this.renderer.render();
    }
}
```

**Changes:**
1. **Remove Renderer.setScene()**: Scene handles its own Three.js integration
2. **Remove Renderer.update()**: No sync needed
3. **Scene.linkThreeScene()**: One-time setup

---

## Component Self-Synchronization Pattern

### Principle
Each component manages its own Three.js objects and adds them to GameObject's Object3D.

### Example: Future AudioSource Component
```typescript
class AudioSource extends Component {
    private listener: THREE.AudioListener;
    private audio: THREE.PositionalAudio;

    awake(): void {
        // Create Three.js audio objects
        this.listener = new THREE.AudioListener();
        this.audio = new THREE.PositionalAudio(this.listener);

        // Add to GameObject's Object3D
        this.gameObject!.getObject3D().add(this.audio);
    }

    onDestroy(): void {
        // Remove from GameObject's Object3D
        this.gameObject?.getObject3D().remove(this.audio);
    }
}
```

**Pattern:**
1. Component creates Three.js objects in `awake()`
2. Adds them to `gameObject.getObject3D()`
3. Removes them in `onDestroy()`
4. No Renderer involvement

---

## Migration Strategy

### Order of Implementation

1. **✅ Phase 1**: Refactor Transform (biggest impact, enables everything else)
2. **✅ Phase 2**: GameObject creates and owns Object3D
3. **✅ Phase 3**: MeshRenderer becomes child of GameObject's Object3D
4. **✅ Phase 4**: Simplify Renderer (delete sync code)
5. **✅ Phase 5**: Scene manages Three.js scene graph
6. **✅ Phase 6**: Update Engine integration

### Testing Strategy

After each phase:
1. Verify hierarchy works (parent-child)
2. Verify transforms work (position/rotation/scale)
3. Verify rendering works (objects visible)
4. Verify editor works (drag-and-drop, inspector)
5. Verify serialization works (save/load)

---

## Expected Outcomes

### Lines of Code Removed
- **Transform.ts**: ~100 lines (matrix math, sync logic)
- **Renderer.ts**: ~150 lines (sync methods)
- **Total**: ~250 lines deleted

### Performance Improvements
- ❌ **Before**: Iterate all GameObjects every frame to sync transforms
- ✅ **After**: Zero sync overhead, Three.js updates only dirty transforms

### Maintainability Improvements
- Simpler mental model: "GameObject wraps Object3D"
- Clear responsibilities: Each class does one thing
- Less coupling: Components self-manage
- Easier to extend: Follow the component pattern

