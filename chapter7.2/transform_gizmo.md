This is a great architectural setup. You have a clean separation of concerns with your Event Bus pattern and `EditorUI`.

To integrate Gizmos (Move, Rotate, Scale) and Pivots (Local/World space) into your existing code, we need to do three specific things:

1. **Create a `GizmoManager` class** to wrap the standard Three.js `TransformControls`.
2. **Update `EditorCameraController**` to allow it to be disabled (so you don't orbit while dragging the gizmo).
3. **Wire it up in `EditorUI**` to connect your selection events and add toolbar buttons.

Here is the step-by-step implementation.

###Step 1: Create the Gizmo ManagerCreate a new file `src/editor/GizmoManager.ts`. This encapsulates the logic so your `EditorUI` stays clean.

```typescript
// src/editor/GizmoManager.ts
import * as THREE from 'three/webgpu';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { EditorCameraController } from './EditorCameraController';
import type { GameObject } from '../core/GameObject';

export class GizmoManager {
    private controls: TransformControls;
    private scene: THREE.Scene;
    private cameraControls: EditorCameraController;

    constructor(
        camera: THREE.Camera,
        domElement: HTMLElement,
        scene: THREE.Scene,
        cameraControls: EditorCameraController
    ) {
        this.scene = scene;
        this.cameraControls = cameraControls;

        // Initialize Three.js TransformControls
        this.controls = new TransformControls(camera, domElement);
        
        // Add the gizmo visual helper to the scene
        this.scene.add(this.controls.getHelper());

        // EVENT: Disable camera orbit when dragging the gizmo
        this.controls.addEventListener('dragging-changed', (event) => {
            this.cameraControls.enabled = !event.value;
        });

        // SHORTCUTS: Listen for Q, W, E, R keys
        window.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    /**
     * Attach the gizmo to a specific GameObject
     */
    public attach(gameObject: GameObject | null) {
        if (gameObject) {
            // We attach to the underlying Three.js Object3D
            this.controls.attach(gameObject.getObject3D());
        } else {
            this.controls.detach();
        }
    }

    public setMode(mode: 'translate' | 'rotate' | 'scale') {
        this.controls.setMode(mode);
    }

    /**
     * Toggle Pivot: Local vs World space
     */
    public setSpace(space: 'local' | 'world') {
        this.controls.setSpace(space);
    }

    public update() {
        // TransformControls usually handles its own updates, 
        // but if you have custom logic, put it here.
    }

    public dispose() {
        this.controls.dispose();
        this.scene.remove(this.controls.getHelper());
    }

    private onKeyDown(event: KeyboardEvent) {
        // Only handle shortcuts if not typing in an input field
        if (document.activeElement instanceof HTMLInputElement) return;

        switch (event.key.toLowerCase()) {
            case 'w': // Move
                this.controls.setMode('translate');
                break;
            case 'e': // Rotate
                this.controls.setMode('rotate');
                break;
            case 'r': // Scale
                this.controls.setMode('scale');
                break;
            case 'q': // Toggle Local/World
                this.controls.setSpace(this.controls.space === 'local' ? 'world' : 'local');
                break;
        }
    }
}

```

###Step 2: Update `EditorCameraController.ts`We need to add an `enabled` flag so the GizmoManager can pause camera movement while you are dragging an arrow.

**Modify `src/editor/EditorCameraController.ts`:**

```typescript
export class EditorCameraController {
    // ... existing properties ...
    
    // 1. ADD THIS PROPERTY
    public enabled: boolean = true; 

    // ... constructor ...

    public update(deltaTime: number): void {
        // 2. ADD THIS CHECK AT THE VERY TOP
        if (!this.enabled || this.engine.isPlaying) return;

        // ... rest of your existing update logic ...
    }
    
    // ... rest of the class ...
}

```

###Step 3: Wire it into `EditorUI.ts`This is the main integration. We need to instantiate the manager, link it to the selection event, and add buttons to your toolbar.

**Modify `src/editor/EditorUI.ts`:**

**A. Imports & Properties**

```typescript
// Add import
import { GizmoManager } from './GizmoManager';

export class EditorUI {
    // ... existing properties ...
    
    // Add property
    private gizmoManager: GizmoManager; 

    constructor(engine: Engine) {
        // ... existing initialization ...
        
        this.editorCameraController = new EditorCameraController(engine);
        engine.setEditorCamera(this.editorCameraController);

        // --- INSERT THIS BLOCK ---
        // Create Gizmo Manager
        this.gizmoManager = new GizmoManager(
            engine.getRenderer().getCamera(),
            document.getElementById('game-canvas')!, // The canvas element
            scene.getThreeScene(),
            this.editorCameraController
        );
        // -------------------------

        // ... rest of constructor ...
    }

```

**B. Update `setupEventListeners**`
Connect the selection system to the gizmo.

```typescript
    private setupEventListeners(): void {
        const events = this.engine.events;

        // ... existing listeners ...

        // Selection changes
        events.on('selection.changed', (data: any) => {
            // ... existing highlight logic ...

            // --- INSERT THIS ---
            // Attach/Detach Gizmo
            this.gizmoManager.attach(data.current);
            // -------------------
            
            // ... existing camera preview logic ...
        });
        
        // ... existing listeners ...
    }

```

**C. Update `createToolbar**`
Add the buttons for Move, Rotate, Scale, and Local/World.

```typescript
    private createToolbar(): Container {
        const toolbar = new Container({
            class: 'toolbar',
            flex: true,
            flexDirection: 'row',
            alignItems: 'center' // Make sure buttons align nicely
        });

        // ... Play/Stop buttons ...

        // --- ADD GIZMO BUTTONS ---
        const moveBtn = new Button({ text: '✚ Move (W)' });
        moveBtn.on('click', () => this.gizmoManager.setMode('translate'));

        const rotateBtn = new Button({ text: '↻ Rotate (E)' });
        rotateBtn.on('click', () => this.gizmoManager.setMode('rotate'));

        const scaleBtn = new Button({ text: '⤢ Scale (R)' });
        scaleBtn.on('click', () => this.gizmoManager.setMode('scale'));

        const spaceBtn = new Button({ text: '🌐 World/Local (Q)' });
        spaceBtn.on('click', () => {
            // Toggle logic could be fancier, but this works
            this.gizmoManager.setSpace(
                (spaceBtn.text as string).includes('World') ? 'local' : 'world'
            );
            // Update button text to reflect next state
            spaceBtn.text = (spaceBtn.text as string).includes('World') ? '📦 Local (Q)' : '🌐 World (Q)';
        });
        // -------------------------

        // ... Add buttons to toolbar container ...
        toolbar.append(this.playBtn);
        toolbar.append(this.stopBtn);
        
        // Add spacer or separator if you want
        toolbar.append(moveBtn);
        toolbar.append(rotateBtn);
        toolbar.append(scaleBtn);
        toolbar.append(spaceBtn);

        // ... rest of existing buttons ...
        
        return toolbar;
    }

```

###Summary of Changes1. **`GizmoManager`** handles the logic of "When I drag this arrow, disable the camera."
2. **`Selection.Changed`** event automatically snaps the gizmo to whatever you click in the hierarchy or viewport.
3. **Keyboard Shortcuts (W,E,R,Q)** are now active via the GizmoManager.
4. **`TransformControls`** automatically handles the math for updating the object's position/rotation/scale, so your `InspectorPanel` will update automatically if you re-click the object (or if you add a listener to the gizmo's `change` event to fire a `scene.hierarchyChanged` event).

**One final pro-tip:**
If you notice the Inspector values don't update *while* you drag the gizmo, add this listener inside `GizmoManager` constructor:

```typescript
this.controls.addEventListener('change', () => {
    // Fire this event so InspectorPanel refreshes the position numbers in real-time
    // You might need to pass the 'events' bus to GizmoManager to do this.
    // events.fire('inspector.refresh'); 
});

```