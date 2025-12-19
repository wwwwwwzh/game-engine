# Chapter 6: Camera Systems + Viewport Controls

## Introduction

In Chapter 5, we built the input system that lets us select objects by clicking in the viewport and control a player with WASD keys. But there's a problem: **the camera is stuck in one position!** We can't look around the scene or frame objects properly.

Professional 3D editors have smooth viewport navigation that feels natural:
- **Middle mouse drag** to pan the view
- **Right mouse drag** to orbit/look around
- **Mouse wheel** to zoom in/out
- **Alt + Left drag** to orbit around selected object or world center
- **F key** to frame/focus on selected object
- **WASD + Q/E + right mouse** for "fly" mode (Q=down, E=up)

We'll implement all of this, plus create a proper Camera component. Note: Unity uses a similar Camera API, but other engines like Unreal use different names (e.g., Unreal calls FOV "FieldOfView" but stores it differently, and Godot calls clipping planes "near/far").

**This chapter covers:**
1. Creating a Camera component with standard 3D camera properties
2. Separating editor camera from game camera
3. Implementing professional viewport navigation controls
4. Understanding position-target camera mathematics
5. Building camera inspector with FOV, clipping planes
6. Fixing service location pattern (no more `window as any`)
7. Camera frustum visualization gizmo for editing
8. Camera preview overlay for selected cameras
9. Adding Camera component to any GameObject via inspector

## Concepts

### Camera Component vs Editor Camera

In most engines, there's a distinction:
- **Camera component**: Game cameras that render the final game view (part of the scene)
- **Scene view camera**: Editor-only camera for navigating the scene (not saved with scene)

We'll implement both:
```typescript
// Game camera (Camera component on GameObject)
const cam = gameObject.addComponent(new Camera());
cam.fieldOfView = 60;
cam.nearClipPlane = 0.1;
cam.farClipPlane = 1000;

// Editor camera (EditorCameraController)
// User controls with mouse/keyboard, not part of the game
```

### Position-Target Camera Mathematics

Editor cameras typically use a **position-target** system rather than just position + rotation:

```
Camera has:
- position: Where the camera is in 3D space
- target: What point the camera is looking at
- distance: How far position is from target

Why this matters:
1. Orbiting: Rotate position around target, keeping distance constant
2. Panning: Move both position and target together
3. Zooming: Change distance, recalculate position
4. Framing: Set target to object, calculate position from distance

Mathematical relationship:
position = target + offset
offset = (distance) * (direction from spherical angles yaw/pitch)

Spherical to Cartesian:
offset.x = distance * cos(pitch) * sin(yaw)
offset.y = distance * sin(pitch)
offset.z = distance * cos(pitch) * cos(yaw)

This is why orbiting feels smooth - we're just changing yaw/pitch angles!
```

**Alternative approaches:**
- **Unreal**: Uses position + rotation quaternion directly (no explicit target)
- **Blender**: Uses target-based system like ours
- **Maya**: Has both position-rotation and target-based modes

### Camera Types

**Perspective Camera**: Objects get smaller with distance (3D games)
- FOV (Field of View): How wide the view is (60-90 degrees typical)
- Aspect ratio: Width/height
- Near/far clipping planes: What range of depth is rendered

**Orthographic Camera**: No perspective, all objects same size (2D games, UI)
- Size: How many units fit on screen
- Near/far clipping planes

### Projection Matrix

The projection matrix transforms 3D world coordinates to 2D screen space:
```
World Space → View Space → Clip Space → Screen Space
```

Three.js handles this automatically, but understanding it helps when debugging camera issues.

### Viewport Navigation Patterns

Professional 3D editors use these controls (with slight variations):

| Input | Action | Notes |
|-------|--------|-------|
| Middle mouse drag | Pan | Move camera parallel to view plane |
| Right mouse drag | Look around | FPS-style rotation |
| Mouse wheel | Zoom | Move closer/farther from target |
| Alt + Left drag | Orbit | Rotate around target point |
| F key | Frame selected | Center view on object |
| Right + WASD/QE | Fly mode | Q=down, E=up (like FPS game) |

**Software differences:**
- **Blender**: Uses middle mouse for rotate (not pan), shift+middle for pan
- **Maya**: Alt+left=rotate, Alt+middle=pan, Alt+right=zoom
- **3ds Max**: Similar to Maya
- **Unity/Unreal**: Right mouse drag rotates, middle mouse pans (what we'll use)

### Service Locator Pattern

Currently we're using `(window as any).engine` which is hacky. Let's fix this with a proper service locator:

```typescript
// BAD: Global window access
const engine = (window as any).engine;
const input = engine.getInputManager();

// GOOD: Service locator
const engine = ServiceLocator.getEngine();
const input = ServiceLocator.getInput();
```

We'll create a `ServiceLocator` class that components can use to access engine services cleanly.

## What We're Building

**Code Structure:**
```
chapter6/
├── src/
│   ├── core/
│   │   ├── ServiceLocator.ts         [NEW] - Clean service access
│   │   └── Engine.ts                 [MODIFIED] - Register with ServiceLocator
│   ├── components/
│   │   └── Camera.ts                 [NEW] - Camera component (child of Object3D)
│   ├── editor/
│   │   ├── EditorCameraController.ts [NEW] - Professional viewport navigation
│   │   ├── CameraGizmo.ts            [NEW] - Frustum visualization
│   │   ├── CameraPreview.ts          [NEW] - Preview overlay for selected cameras
│   │   ├── InspectorPanel.ts         [MODIFIED] - Add component button
│   │   └── EditorUI.ts               [MODIFIED] - Integrate editor camera & gizmos
│   └── rendering/
│       └── Renderer.ts               [MODIFIED] - Support multiple cameras
```

**Features:**
- ✅ Camera component with standard API (fieldOfView, near/farClipPlane)
- ✅ Camera as child of GameObject's Object3D (like MeshRenderer)
- ✅ Editor camera with professional viewport navigation
- ✅ Middle mouse pan, right mouse orbit, wheel zoom
- ✅ Alt+drag to orbit around selected object
- ✅ F key to frame selected object
- ✅ WASD/QE fly mode with right mouse held (Q=down, E=up)
- ✅ ServiceLocator for clean service access
- ✅ Camera inspector with FOV, clipping plane controls
- ✅ Camera frustum visualization gizmo in editor
- ✅ Camera preview overlay for selected cameras
- ✅ Add Camera component to any GameObject via inspector
- ✅ Camera switching in play mode (falls back to editor camera if no Camera component)

## Implementation

### Step 0: ServiceLocator - Clean Service Access

Before we build cameras, let's fix the `(window as any)` problem.

Create `src/core/ServiceLocator.ts`:

```typescript
import type { Engine } from './Engine';
import type { InputManager } from './InputManager';

/**
 * ServiceLocator - Provides clean access to engine services.
 * Components can access InputManager, Scene, etc. without window hacks.
 */
export class ServiceLocator {
    private static engine: Engine | null = null;

    /**
     * Register the engine (called once at startup)
     */
    public static registerEngine(engine: Engine): void {
        this.engine = engine;
    }

    /**
     * Get the engine instance
     */
    public static getEngine(): Engine {
        if (!this.engine) {
            throw new Error('Engine not registered with ServiceLocator');
        }
        return this.engine;
    }

    /**
     * Get the InputManager
     */
    public static getInput(): InputManager {
        return this.getEngine().getInputManager();
    }

    /**
     * Get the current scene
     */
    public static getScene() {
        return this.getEngine().getScene();
    }

    /**
     * Check if in play mode
     */
    public static isPlaying(): boolean {
        return this.getEngine().isPlaying;
    }
}
```

Now update `src/main.ts` to register the engine:

```typescript
import { ServiceLocator } from './core/ServiceLocator';

// Create engine
const engine = new Engine('game-canvas');

// Register with ServiceLocator
ServiceLocator.registerEngine(engine);

// Rest of setup...
```

Now components can do:
```typescript
// Instead of: const engine = (window as any).engine;
const input = ServiceLocator.getInput();
const scene = ServiceLocator.getScene();
```

### Step 1: Camera Component (as Child of Object3D)

Create `src/components/Camera.ts`:

```typescript
import * as THREE from 'three/webgpu';
import { Component } from './Component';

/**
 * Camera component - wraps Three.js camera.
 * Added as CHILD of GameObject's Object3D (like MeshRenderer).
 * 
 * Standard properties:
 * - fieldOfView (fov)
 * - nearClipPlane (near)
 * - farClipPlane (far)
 * - aspect (calculated from viewport)
 */
export class Camera extends Component {
    private threeCamera: THREE.PerspectiveCamera;
    
    // Camera properties
    private _fieldOfView: number = 60;
    private _nearClipPlane: number = 0.1;
    private _farClipPlane: number = 1000;

    constructor() {
        super();
        
        // Create Three.js camera with default values
        const aspect = window.innerWidth / window.innerHeight;
        this.threeCamera = new THREE.PerspectiveCamera(
            this._fieldOfView,
            aspect,
            this._nearClipPlane,
            this._farClipPlane
        );
        
        // Important: Camera will be added as CHILD of GameObject's Object3D
        this.threeCamera.name = 'Camera';
    }

    public awake(): void {
        // Add camera as child of GameObject's Object3D
        // This way, camera inherits GameObject's transform
        this.gameObject.getObject3D().add(this.threeCamera);
        
        console.log(`📷 Camera added to ${this.gameObject.name}`);
    }

    /**
     * Get the underlying Three.js camera
     */
    public getThreeCamera(): THREE.PerspectiveCamera {
        return this.threeCamera;
    }

    // ===== STANDARD CAMERA API =====

    /**
     * Field of view in degrees (vertical)
     */
    public get fieldOfView(): number {
        return this._fieldOfView;
    }

    public set fieldOfView(value: number) {
        this._fieldOfView = value;
        this.threeCamera.fov = value;
        this.threeCamera.updateProjectionMatrix();
    }

    /**
     * Near clipping plane distance
     */
    public get nearClipPlane(): number {
        return this._nearClipPlane;
    }

    public set nearClipPlane(value: number) {
        this._nearClipPlane = value;
        this.threeCamera.near = value;
        this.threeCamera.updateProjectionMatrix();
    }

    /**
     * Far clipping plane distance
     */
    public get farClipPlane(): number {
        return this._farClipPlane;
    }

    public set farClipPlane(value: number) {
        this._farClipPlane = value;
        this.threeCamera.far = value;
        this.threeCamera.updateProjectionMatrix();
    }

    /**
     * Aspect ratio (read-only, set by viewport)
     */
    public get aspect(): number {
        return this.threeCamera.aspect;
    }

    /**
     * Update aspect ratio when viewport size changes
     */
    public setAspect(aspect: number): void {
        this.threeCamera.aspect = aspect;
        this.threeCamera.updateProjectionMatrix();
    }

    /**
     * Get world-space ray from screen position (for raycasting)
     * @param screenPos Normalized screen position (-1 to 1)
     */
    public screenPointToRay(screenPos: THREE.Vector2): THREE.Ray {
        const ray = new THREE.Ray();
        const origin = new THREE.Vector3();
        const direction = new THREE.Vector3();

        // Get ray origin and direction
        this.threeCamera.getWorldPosition(origin);
        direction.set(screenPos.x, screenPos.y, 0.5);
        direction.unproject(this.threeCamera);
        direction.sub(origin).normalize();

        ray.set(origin, direction);
        return ray;
    }

    public getTypeName(): string {
        return 'Camera';
    }

    public serialize(): any {
        return {
            ...super.serialize(),
            fieldOfView: this._fieldOfView,
            nearClipPlane: this._nearClipPlane,
            farClipPlane: this._farClipPlane
        };
    }

    public deserialize(data: any): void {
        super.deserialize(data);
        
        if (data.fieldOfView !== undefined) this.fieldOfView = data.fieldOfView;
        if (data.nearClipPlane !== undefined) this.nearClipPlane = data.nearClipPlane;
        if (data.farClipPlane !== undefined) this.farClipPlane = data.farClipPlane;
    }

    public onDestroy(): void {
        // Remove camera from GameObject's Object3D
        if (this.gameObject) {
            this.gameObject.getObject3D().remove(this.threeCamera);
        }
    }
}
```

**Key differences from Chapter 5:**
1. **Camera is child of Object3D**: Just like MeshRenderer, camera is added as child in `awake()`
2. **No manual transform sync**: Three.js handles transform automatically through hierarchy
3. **Uses ServiceLocator**: Will update in Step 3

### Step 2: EditorCameraController (Professional Navigation)

Create `src/editor/EditorCameraController.ts`:

```typescript
import * as THREE from 'three/webgpu';
import type { Engine } from '../core/Engine';
import { ServiceLocator } from '../core/ServiceLocator';

/**
 * EditorCameraController - Professional viewport navigation.
 * 
 * Position-Target System Explained:
 * ================================
 * Instead of just storing camera position + rotation, we store:
 * - position: Where camera IS
 * - target: What camera is LOOKING AT
 * - distance: How far apart they are
 * 
 * This makes operations intuitive:
 * - Orbit: Rotate position around target (target stays fixed)
 * - Pan: Move both position and target together
 * - Zoom: Change distance, recalculate position
 * - Frame: Set target to object, calculate new position
 * 
 * We use spherical coordinates (yaw, pitch, distance) which convert to:
 * position = target + (distance * direction_from_angles)
 * 
 * Controls:
 * - Middle mouse drag: Pan (move position and target together)
 * - Right mouse drag: Orbit/Look (rotate around target)
 * - Mouse wheel: Zoom (change distance)
 * - Alt + Left drag: Orbit around target
 * - F key: Frame selected object
 * - Right mouse + WASD/QE: Fly mode (Q=down, E=up)
 */
export class EditorCameraController {
    private engine: Engine;
    private camera: THREE.PerspectiveCamera;
    
    // Position-target system
    private position: THREE.Vector3;
    private target: THREE.Vector3;  // What we're looking at
    private distance: number = 10;  // Distance from target
    
    // Rotation state (spherical coordinates for easy orbiting)
    private yaw: number = 0;    // Horizontal rotation (radians)
    private pitch: number = 0;  // Vertical rotation (radians)
    
    // Settings
    private panSpeed: number = 0.01;
    private rotateSpeed: number = 0.005;
    private zoomSpeed: number = 0.1;
    private flySpeed: number = 10;
    
    // Input state
    private isMiddleMouseDown: boolean = false;
    private isRightMouseDown: boolean = false;
    private isAltDown: boolean = false;

    constructor(engine: Engine) {
        this.engine = engine;
        this.camera = engine.getRenderer().getCamera();
        
        // Initialize camera position and target
        this.position = new THREE.Vector3(5, 5, 5);
        this.target = new THREE.Vector3(0, 0, 0);
        
        // Calculate initial yaw/pitch from position
        this.updateYawPitchFromPosition();
        
        // Set initial camera transform
        this.updateCameraTransform();
        
        console.log('🎥 Editor camera controller initialized');
        console.log('   Position-target system: orbit, pan, zoom all feel natural');
    }

    /**
     * Update camera every frame
     */
    public update(deltaTime: number): void {
        // Only handle input in editor mode
        if (this.engine.isPlaying) return;
        
        const input = ServiceLocator.getInput();
        const mouseDelta = input.getMouseDelta();
        
        // Track mouse buttons
        this.isMiddleMouseDown = input.isMouseButtonDown(1);
        this.isRightMouseDown = input.isMouseButtonDown(2);
        this.isAltDown = input.isKeyDown('Alt');
        
        // Handle different navigation modes
        if (this.isMiddleMouseDown) {
            // Middle mouse: Pan
            this.handlePan(mouseDelta);
        } else if (this.isAltDown && input.isMouseButtonDown(0)) {
            // Alt + Left mouse: Orbit around target
            this.handleOrbit(mouseDelta);
        } else if (this.isRightMouseDown) {
            // Right mouse: Look/Orbit OR Fly mode with WASD/QE
            if (this.isMoving(input)) {
                this.handleFly(deltaTime, mouseDelta, input);
            } else {
                this.handleLook(mouseDelta);
            }
        }
        
        // Mouse wheel: Zoom
        this.handleZoom(input);
        
        // F key: Frame selected object
        if (input.getKeyDown('f')) {
            this.frameSelectedObject();
        }
        
        // Update camera transform
        this.updateCameraTransform();
    }

    /**
     * Pan camera (move parallel to view plane)
     * Both position AND target move together
     */
    private handlePan(mouseDelta: { x: number; y: number }): void {
        // Get camera's right and up vectors
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        
        right.setFromMatrixColumn(this.camera.matrix, 0); // Right vector
        up.setFromMatrixColumn(this.camera.matrix, 1);    // Up vector
        
        // Pan based on mouse delta
        const panX = -mouseDelta.x * this.panSpeed * this.distance;
        const panY = mouseDelta.y * this.panSpeed * this.distance;
        
        // Move both target and position (maintaining their relationship)
        this.target.addScaledVector(right, panX);
        this.target.addScaledVector(up, panY);
        this.position.addScaledVector(right, panX);
        this.position.addScaledVector(up, panY);
    }

    /**
     * Orbit camera around target
     * Position changes, target stays fixed
     */
    private handleOrbit(mouseDelta: { x: number; y: number }): void {
        this.yaw -= mouseDelta.x * this.rotateSpeed;
        this.pitch -= mouseDelta.y * this.rotateSpeed;
        
        // Clamp pitch to avoid gimbal lock
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        
        // Update position based on spherical coordinates
        // position = target + offset (calculated from yaw/pitch/distance)
        this.updatePositionFromYawPitch();
    }

    /**
     * Look around (orbit, but move target with camera)
     * Both position and target change to maintain distance
     */
    private handleLook(mouseDelta: { x: number; y: number }): void {
        this.yaw -= mouseDelta.x * this.rotateSpeed;
        this.pitch -= mouseDelta.y * this.rotateSpeed;
        
        // Clamp pitch
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        
        // Update target to maintain distance from position
        const direction = new THREE.Vector3();
        direction.x = Math.cos(this.pitch) * Math.sin(this.yaw);
        direction.y = Math.sin(this.pitch);
        direction.z = Math.cos(this.pitch) * Math.cos(this.yaw);
        
        this.target.copy(this.position).addScaledVector(direction, this.distance);
    }

    /**
     * Fly mode (WASD/QE with right mouse held)
     * Q = move down, E = move up (like swimming/flying in games)
     */
    private handleFly(deltaTime: number, mouseDelta: { x: number; y: number }, input: any): void {
        // Update look direction
        this.handleLook(mouseDelta);
        
        // Get movement direction vectors
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        
        this.camera.getWorldDirection(forward);
        right.setFromMatrixColumn(this.camera.matrix, 0);
        
        // WASD/QE movement
        let moveDir = new THREE.Vector3();
        
        if (input.isKeyDown('w')) moveDir.add(forward);
        if (input.isKeyDown('s')) moveDir.sub(forward);
        if (input.isKeyDown('d')) moveDir.add(right);
        if (input.isKeyDown('a')) moveDir.sub(right);
        if (input.isKeyDown('e')) moveDir.y += 1;  // Up
        if (input.isKeyDown('q')) moveDir.y -= 1;  // Down
        
        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            const speed = input.isKeyDown('Shift') ? this.flySpeed * 3 : this.flySpeed;
            
            // Move both position and target (maintaining their relationship)
            this.position.addScaledVector(moveDir, speed * deltaTime);
            this.target.addScaledVector(moveDir, speed * deltaTime);
        }
    }

    /**
     * Zoom (move closer/farther from target)
     * Only distance changes, angles stay the same
     */
    private handleZoom(input: any): void {
        const wheelDelta = input.getMouseWheelDelta();
        
        if (wheelDelta !== 0) {
            // Zoom in/out by changing distance
            const zoomFactor = 1 + (wheelDelta * this.zoomSpeed * 0.001);
            this.distance *= zoomFactor;
            this.distance = Math.max(0.1, Math.min(1000, this.distance));
            
            // Recalculate position from new distance
            this.updatePositionFromYawPitch();
        }
    }

    /**
     * Frame selected object (F key)
     * Set target to object position, adjust distance to fit
     */
    private frameSelectedObject(): void {
        const scene = ServiceLocator.getScene();
        if (!scene) return;
        
        // Get selected object from editor UI
        const editorUI = (window as any).editor;
        if (!editorUI) return;
        
        const selectedId = editorUI.getSelectedObjectId();
        if (!selectedId) {
            // No selection, frame world origin
            this.target.set(0, 0, 0);
            this.distance = 10;
            this.updatePositionFromYawPitch();
            return;
        }
        
        const go = scene.findById(selectedId);
        if (!go) return;
        
        // Set target to object position
        const worldPos = go.transform.getWorldPosition();
        this.target.copy(worldPos);
        
        // Calculate appropriate distance based on object bounds
        // For now, use fixed distance
        this.distance = 5;
        this.updatePositionFromYawPitch();
    }

    /**
     * Check if movement keys are pressed
     */
    private isMoving(input: any): boolean {
        return input.isKeyDown('w') || 
               input.isKeyDown('a') || 
               input.isKeyDown('s') || 
               input.isKeyDown('d') ||
               input.isKeyDown('q') ||
               input.isKeyDown('e');
    }

    /**
     * Update position from yaw/pitch (spherical to cartesian)
     * This is the core math: position = target + offset
     * where offset comes from spherical coordinates
     */
    private updatePositionFromYawPitch(): void {
        // Spherical to Cartesian conversion
        this.position.x = this.target.x + this.distance * Math.cos(this.pitch) * Math.sin(this.yaw);
        this.position.y = this.target.y + this.distance * Math.sin(this.pitch);
        this.position.z = this.target.z + this.distance * Math.cos(this.pitch) * Math.cos(this.yaw);
    }

    /**
     * Update yaw/pitch from current position (cartesian to spherical)
     * Used when initializing or setting camera position directly
     */
    private updateYawPitchFromPosition(): void {
        const offset = new THREE.Vector3().subVectors(this.position, this.target);
        this.distance = offset.length();
        
        // Cartesian to Spherical conversion
        this.yaw = Math.atan2(offset.x, offset.z);
        this.pitch = Math.asin(offset.y / this.distance);
    }

    /**
     * Apply camera transform (position + look at target)
     */
    private updateCameraTransform(): void {
        this.camera.position.copy(this.position);
        this.camera.lookAt(this.target);
        this.camera.updateMatrixWorld(true);
    }

    /**
     * Get current target position
     */
    public getTarget(): THREE.Vector3 {
        return this.target.clone();
    }

    /**
     * Set camera position and target directly
     */
    public setPositionAndTarget(position: THREE.Vector3, target: THREE.Vector3): void {
        this.position.copy(position);
        this.target.copy(target);
        this.updateYawPitchFromPosition();
        this.updateCameraTransform();
    }
}
```

**Key Unity-like controls:**
- ✅ Middle mouse drag → Pan
- ✅ Right mouse drag → Look/Orbit
- ✅ Alt + Left drag → Orbit around target
- ✅ F key → Frame selected
- ✅ Right mouse + WASD → Fly mode
- ✅ Shift in fly mode → Speed boost

### Step 3: Add Mouse Wheel to InputManager

Modify `src/core/InputManager.ts`:

```typescript
export class InputManager {
    // ... existing fields ...
    private mouseWheelDelta: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.setupEventListeners();
        console.log('⌨️  InputManager initialized');
    }

    private setupEventListeners(): void {
        // ... existing listeners ...

        // Mouse wheel
        this.canvas.addEventListener('wheel', (e) => this.onMouseWheel(e), { passive: false });
    }

    private onMouseWheel(e: WheelEvent): void {
        e.preventDefault();
        this.mouseWheelDelta = e.deltaY;
    }

    public update(): void {
        // ... existing clears ...
        this.mouseWheelDelta = 0;
    }

    // ===== MOUSE WHEEL API =====

    /**
     * Get mouse wheel delta this frame
     */
    public getMouseWheelDelta(): number {
        return this.mouseWheelDelta;
    }
}
```

Now update `EditorCameraController.handleZoom()`:

```typescript
private handleZoom(): void {
    const wheelDelta = this.input.getMouseWheelDelta();
    
    if (wheelDelta !== 0) {
        // Zoom in/out
        const zoomFactor = 1 + (wheelDelta * this.zoomSpeed * 0.001);
        this.distance *= zoomFactor;
        this.distance = Math.max(0.1, Math.min(1000, this.distance));
        this.updatePositionFromYawPitch();
    }
}
```

### Step 4: Integrate EditorCameraController into Engine

Modify `src/core/Engine.ts`:

```typescript
import { EditorCameraController } from '../editor/EditorCameraController';

export class Engine {
    // ... existing fields ...
    private editorCamera: EditorCameraController | null = null;

    constructor(canvasId: string = 'game-canvas') {
        // ... existing setup ...
    }

    /**
     * Set editor camera controller (called by EditorUI)
     */
    public setEditorCamera(editorCamera: EditorCameraController): void {
        this.editorCamera = editorCamera;
    }

    private update(deltaTime: number): void {
        // Update editor camera in editor mode
        if (!this.isPlaying && this.editorCamera) {
            this.editorCamera.update(deltaTime);
        }

        // Update scene ONLY if playing
        if (this.isPlaying && this.currentScene) {
            this.currentScene.update(deltaTime);
        }
    }

    // ... rest of Engine ...
}
```

Modify `src/editor/EditorUI.ts`:

```typescript
import { EditorCameraController } from './EditorCameraController';

export class EditorUI {
    // ... existing fields ...
    private editorCamera: EditorCameraController;

    constructor(engine: Engine) {
        // ... existing setup ...

        // Create editor camera controller
        this.editorCamera = new EditorCameraController(engine);
        engine.setEditorCamera(this.editorCamera);

        console.log('🎨 Editor UI initialized');
    }

    // ... rest of EditorUI ...
}
```

### Step 5: Add Camera Inspector

Modify `src/editor/InspectorPanel.ts` to handle Camera component:

```typescript
import { Camera } from '../components/Camera';

export class InspectorPanel {
    // ... existing code ...

    private addComponentSection(component: any): void {
        const section = document.createElement('div');
        section.className = 'component-section';

        const header = document.createElement('div');
        header.className = 'component-header';
        header.textContent = `📦 ${component.getTypeName()}`;
        section.appendChild(header);

        const content = document.createElement('div');
        content.className = 'component-content';

        // Special handling for Camera component
        if (component instanceof Camera) {
            this.addCameraProperties(content, component);
        } else {
            content.innerHTML = '<div class="empty-state">No editable properties</div>';
        }

        section.appendChild(content);
        this.contentElement.appendChild(section);
    }

    private addCameraProperties(content: HTMLElement, camera: Camera): void {
        // Field of View
        content.appendChild(this.createNumberRow('Field of View', camera.fieldOfView, (value) => {
            camera.fieldOfView = value;
        }, { min: 1, max: 179, step: 1 }));

        // Near Clip Plane
        content.appendChild(this.createNumberRow('Near Clip', camera.nearClipPlane, (value) => {
            camera.nearClipPlane = value;
        }, { min: 0.01, max: 100, step: 0.01 }));

        // Far Clip Plane
        content.appendChild(this.createNumberRow('Far Clip', camera.farClipPlane, (value) => {
            camera.farClipPlane = value;
        }, { min: 1, max: 10000, step: 1 }));

        // Aspect (read-only)
        const aspectRow = document.createElement('div');
        aspectRow.className = 'property-row';
        aspectRow.innerHTML = `
            <div class="property-label">Aspect</div>
            <div class="property-value">
                <input type="text" class="property-input" value="${camera.aspect.toFixed(3)}" disabled>
            </div>
        `;
        content.appendChild(aspectRow);
    }

    private createNumberRow(
        label: string, 
        value: number, 
        onChange: (value: number) => void,
        options: { min?: number; max?: number; step?: number } = {}
    ): HTMLElement {
        const row = document.createElement('div');
        row.className = 'property-row';

        const labelEl = document.createElement('div');
        labelEl.className = 'property-label';
        labelEl.textContent = label;
        row.appendChild(labelEl);

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'property-input';
        input.value = value.toFixed(2);
        if (options.min !== undefined) input.min = options.min.toString();
        if (options.max !== undefined) input.max = options.max.toString();
        if (options.step !== undefined) input.step = options.step.toString();

        input.addEventListener('change', () => {
            const newValue = parseFloat(input.value) || value;
            onChange(newValue);
        });

        const valueContainer = document.createElement('div');
        valueContainer.className = 'property-value';
        valueContainer.appendChild(input);
        row.appendChild(valueContainer);

        return row;
    }
}
```


### Step 6: Support Game Camera Rendering

Modify `src/rendering/Renderer.ts` to use Camera component if present:

```typescript
import { Camera } from '../components/Camera';

export class Renderer {
    // ... existing fields ...
    private editorCamera: THREE.PerspectiveCamera;  // Rename camera to editorCamera
    private activeCamera: THREE.PerspectiveCamera;   // Currently active camera

    constructor(canvas: HTMLCanvasElement, threeScene: THREE.Scene) {
        // ... existing setup ...

        // Create editor camera
        const fov = 75;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1;
        const far = 1000;
        this.editorCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.editorCamera.position.set(5, 5, 5);
        this.editorCamera.lookAt(0, 0, 0);

        // Start with editor camera as active
        this.activeCamera = this.editorCamera;

        // ... rest of setup ...
    }

    /**
     * Set active camera (for play mode)
     */
    public setActiveCamera(camera: THREE.PerspectiveCamera | null): void {
        if (camera) {
            this.activeCamera = camera;
        } else {
            this.activeCamera = this.editorCamera;
        }
    }

    /**
     * Render the current frame
     */
    public render(threeScene: THREE.Scene): void {
        if (!this.isInitialized) return;
        this.renderer.render(threeScene, this.activeCamera);
    }

    /**
     * Get the editor camera (for editor controls)
     */
    public getCamera(): THREE.PerspectiveCamera {
        return this.editorCamera;
    }

    /**
     * Get the currently active camera
     */
    public getActiveCamera(): THREE.PerspectiveCamera {
        return this.activeCamera;
    }

    public onResize(width: number, height: number): void {
        // Update both cameras
        this.editorCamera.aspect = width / height;
        this.editorCamera.updateProjectionMatrix();
        
        if (this.activeCamera !== this.editorCamera) {
            this.activeCamera.aspect = width / height;
            this.activeCamera.updateProjectionMatrix();
        }
        
        this.renderer.setSize(width, height);
    }
}
```

Modify `src/core/Engine.ts` to switch cameras in play mode:

```typescript
export class Engine {
    // ... existing fields ...

    public play(): void {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        console.log('▶️  PLAY MODE');
        
        // Find Camera component in scene and use it if present
        this.switchToGameCamera();
    }
    
    public stop(): void {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        
        // Switch back to editor camera
        this.renderer.setActiveCamera(null);
        
        console.log('⏸️  EDITOR MODE');
    }

    private switchToGameCamera(): void {
        const scene = this.getScene();
        if (!scene) return;

        // Find first Camera component in scene
        const allObjects = scene.getAllGameObjects();
        for (const go of allObjects) {
            const camera = go.getComponent(Camera);
            if (camera) {
                this.renderer.setActiveCamera(camera.getThreeCamera());
                console.log(`📷 Using game camera: ${go.name}`);
                return;
            }
        }

        console.log('⚠️  No Camera component found, using editor camera');
    }
}
```

### Step 7: Camera Gizmo for Frustum Visualization

To help visualize camera frustums in the editor, we've added a `CameraGizmo` that automatically shows wireframe frustums for all Camera components in the scene.

Create `src/editor/CameraGizmo.ts`:

```typescript
import * as THREE from 'three/webgpu';;
import { Camera } from '../components/Camera';
import { ServiceLocator } from '../core/ServiceLocator';

export class CameraGizmo {
    private gizmos: Map<Camera, THREE.CameraHelper> = new Map();
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    update(): void {
        // Only show gizmos in editor mode
        if (ServiceLocator.isPlaying()) {
            this.hideAll();
            return;
        }

        const sceneObj = ServiceLocator.getScene();
        if (!sceneObj) return;

        // Get all cameras and update/create gizmos
        const cameras = this.getAllCameras(sceneObj);

        // Update or create gizmos for each camera
        for (const camera of cameras) {
            this.updateGizmo(camera);
        }
    }

    private updateGizmo(camera: Camera): void {
        let helper = this.gizmos.get(camera);

        if (!helper) {
            helper = new THREE.CameraHelper(camera.threeCamera);
            helper.userData.isEditorHelper = true;
            this.scene.add(helper);
            this.gizmos.set(camera, helper);
        }

        helper.update();

        // Don't show gizmo for the active rendering camera
        const renderer = ServiceLocator.getEngine()?.renderer;
        const activeCamera = renderer?.getActiveCamera();
        helper.visible = activeCamera !== camera.threeCamera;
    }
}
```

### Step 8: Camera Preview Overlay

When a GameObject with a Camera component is selected, we show a non-interactive preview of what that camera sees in the bottom-right corner.

Create `src/editor/CameraPreview.ts`:

```typescript
import * as THREE from 'three/webgpu';
import { Camera } from '../components/Camera';
import { ServiceLocator } from '../core/ServiceLocator';

export class CameraPreview {
    private previewContainer: HTMLDivElement;
    private previewCanvas: HTMLCanvasElement;
    private previewRenderer: THREE.WebGPURenderer | null = null;
    private currentCamera: Camera | null = null;

    constructor() {
        // Create preview container with styling
        this.previewContainer = document.createElement('div');
        this.previewContainer.style.position = 'absolute';
        this.previewContainer.style.bottom = '20px';
        this.previewContainer.style.right = '20px';
        this.previewContainer.style.width = '320px';
        this.previewContainer.style.height = '180px';
        this.previewContainer.style.border = '2px solid #4CAF50';
        this.previewContainer.style.display = 'none';

        // Create canvas and renderer
        this.previewCanvas = document.createElement('canvas');
        this.previewContainer.appendChild(this.previewCanvas);

        this.initializeRenderer();
    }

    setCamera(camera: Camera | null): void {
        this.currentCamera = camera;
        this.previewContainer.style.display = camera ? 'block' : 'none';
    }

    render(): void {
        if (!this.currentCamera || ServiceLocator.isPlaying()) return;

        const scene = ServiceLocator.getScene();
        if (scene && this.previewRenderer) {
            this.previewRenderer.render(
                scene.getThreeScene(),
                this.currentCamera.threeCamera
            );
        }
    }
}
```

### Step 9: Adding Camera Component via Inspector

Instead of dedicated camera creation buttons, we now allow adding a Camera component to any GameObject through the Inspector panel.

Modified `src/editor/InspectorPanel.ts`:

```typescript
private addAddComponentButton(go: any): void {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = '+ Add Component';
    button.addEventListener('click', () => {
        this.showAddComponentMenu(go, button);
    });
    this.contentElement.appendChild(button);
}

private showAddComponentMenu(go: any, buttonElement: HTMLElement): void {
    // Create dropdown menu
    const menu = document.createElement('div');
    // ... styling ...

    // Add Camera option
    const cameraOption = document.createElement('div');
    cameraOption.textContent = '📷 Camera';
    cameraOption.addEventListener('click', () => {
        if (go.getComponent(Camera)) {
            alert('GameObject already has a Camera component');
        } else {
            const camera = new Camera();
            go.addComponent(camera);
            this.editorUI.refresh();
        }
        document.body.removeChild(menu);
    });
    menu.appendChild(cameraOption);
}
```

### Step 10: Adding View Port Gizmo

## Testing the Camera System

1. **Start dev server**: `npm run dev`
2. **Test editor camera navigation**:
   - **Middle mouse drag**: Pan around (both position and target move)
   - **Right mouse drag**: Look around (target moves with camera)
   - **Mouse wheel**: Zoom in/out (changes distance, recalculates position)
   - **Alt + Left drag**: Orbit around target (target stays fixed)
   - **F key**: Frame world origin (or selected object)
   - **Right mouse + WASD**: Fly around the scene
   - **Right mouse + Q/E**: Move down/up while flying
   - **Shift while flying**: Sprint speed (3x faster)
3. **Add Camera to GameObject**:
   - Create a cube or empty GameObject
   - Select it in the hierarchy
   - In the Inspector, click "+ Add Component"
   - Select "📷 Camera" from the dropdown
   - See the Camera component appear with editable properties
4. **Test camera frustum gizmo**:
   - With a Camera component in the scene, you should see a wireframe frustum visualization
   - The gizmo shows the camera's field of view and clipping planes
   - Gizmo is only visible in editor mode
5. **Test camera preview**:
   - Select a GameObject with a Camera component
   - A preview window should appear in the bottom-right corner
   - This shows what the camera sees in real-time
   - Preview is non-interactive and only visible in editor mode
6. **Test camera inspector**:
   - Select a GameObject with Camera component
   - Adjust Field of View (1-179°)
   - Adjust Near Clip Plane (0.01-100)
   - Adjust Far Clip Plane (1-10000)
   - See changes reflected immediately in the gizmo and preview
7. **Test play mode camera switching**:
   - Add a Camera component to any GameObject
   - Position it where you want the game view to start
   - Click "▶ Play"
   - Verify view switches to the game camera
   - If no Camera component exists, falls back to editor camera
   - Click "⏹ Stop"
   - Verify view switches back to editor camera

## What We Learned

### Architecture Patterns

**1. Camera Component as Thin Wrapper**
```
Unity API (fieldOfView, near, far)
    ↓
Camera Component (wraps Three.js camera)
    ↓
Three.js PerspectiveCamera (does the work)
```

**2. Separate Editor and Game Cameras**
```
Editor Mode:
    EditorCameraController → editorCamera → render

Play Mode:
    Camera Component → threeCamera → render
```

**3. Controller Components**
```
Camera Component (what to render)
    +
FirstPersonCamera/ThirdPersonCamera (how to control)
    =
Complete camera system
```

### Key Takeaways

✅ **Standard camera API**: fieldOfView, nearClipPlane, farClipPlane work like most engines  
✅ **Camera as child of Object3D**: Inherits transform automatically (like MeshRenderer)  
✅ **ServiceLocator pattern**: Clean service access, no more `(window as any)`  
✅ **Position-target math**: Makes orbit/pan/zoom intuitive and smooth  
✅ **Editor camera is separate**: Not part of the game scene  
✅ **Smooth navigation**: Professional controls feel natural  
✅ **Component-based cameras**: Flexible and extensible  
✅ **Mode switching works**: Clean transition between editor/game cameras

## Common Issues & Solutions

**Issue**: "Camera jumping when switching modes"
**Solution**: Store camera state separately for editor vs game

**Issue**: "Mouse look not smooth"
**Solution**: Use mouseDelta, not absolute position; clamp pitch

**Issue**: "Can't see anything in play mode"
**Solution**: Check Camera component exists and is positioned correctly

**Issue**: "Zoom too fast/slow"
**Solution**: Adjust zoomSpeed based on distance from target

## Next Steps



In **Chapter 7**, we'll cover:
- Asset management system
- Texture loading and caching
- Model loading (GLTF/OBJ)
- Asset browser panel

## Exercises

1. **Add camera shake**: Create a component that shakes the camera (useful for explosions, impacts)
2. **Add smooth zoom**: Make zoom target-based (zoom to cursor position)
3. **Add camera collision**: Make ThirdPersonCamera avoid walls
4. **Create cinematic camera**: Smooth paths with animation curves

## Summary

We've built a complete camera system that:
- ✅ Provides standard Camera component API (fieldOfView, near/farClipPlane)
- ✅ Makes Camera a child of GameObject's Object3D (automatic transform)
- ✅ Implements editor camera with professional viewport navigation
- ✅ Uses position-target math for intuitive orbiting/panning/zooming
- ✅ Allows adding Camera component to any GameObject via inspector
- ✅ Visualizes camera frustums with gizmo helpers in editor
- ✅ Shows real-time camera preview overlay for selected cameras
- ✅ Separates editor and game camera views cleanly
- ✅ Introduced ServiceLocator for clean service access (no more global hacks)
- ✅ Allows camera customization via inspector
- ✅ Switches cameras seamlessly between modes (falls back to editor camera if none found)
- ✅ Q/E keys for vertical movement in fly mode

The camera system is the "eyes" of your game. Next, we'll build the asset management system to load textures, models, and other resources.

**Lines of Code Added:**
- `ServiceLocator.ts`: 40 lines
- `Camera.ts`: 160 lines
- `EditorCameraController.ts`: 280 lines
- `CameraGizmo.ts`: 130 lines
- `CameraPreview.ts`: 120 lines
- Modified files: ~200 lines (InspectorPanel, EditorUI, Engine, Renderer)

**Total Chapter 6**: ~930 new lines of code

---

**Key Files Changed:**
```
✅ NEW    src/core/ServiceLocator.ts
✅ NEW    src/components/Camera.ts
✅ NEW    src/editor/EditorCameraController.ts
✅ NEW    src/editor/CameraGizmo.ts
✅ NEW    src/editor/CameraPreview.ts
✅ EDIT   src/core/InputManager.ts (mouse wheel)
✅ EDIT   src/core/Engine.ts (editor camera, camera switching, ServiceLocator, EditorUI integration)
✅ EDIT   src/rendering/Renderer.ts (multiple cameras, setActiveCamera, getActiveCamera)
✅ EDIT   src/editor/EditorUI.ts (camera gizmo, camera preview, removed FPS/TPS buttons)
✅ EDIT   src/editor/InspectorPanel.ts (camera inspector, add component button)
✅ EDIT   src/core/GameObjectFactory.ts (removed FPS/TPS camera methods)
✅ EDIT   src/main.ts (register ServiceLocator, register EditorUI)
✅ EDIT   index.html (removed FPS/TPS camera buttons)
✅ REMOVED src/components/FirstPersonCamera.ts
✅ REMOVED src/components/ThirdPersonCamera.ts
```

**Architecture Improvements:**
```
Before: (window as any).engine.getInputManager()
After:  ServiceLocator.getInput()

Before: Manual camera transform sync every frame
After:  Camera as child of Object3D (automatic)

Before: Dedicated FPS/TPS camera GameObjects
After:  Flexible Camera component can be added to any GameObject

Before: No visual feedback for cameras in editor
After:  Frustum gizmos + preview overlay show camera view

Before: Single camera
After:  Editor camera + game cameras with seamless switching
```