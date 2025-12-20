# Comprehensive Refactoring Plan: Game Engine → SuperSplat Pattern

## Phase 1: Foundation - Events Integration

### Step 1.1: Add Events to Core Classes

**File: `src/core/Scene.ts`**
```typescript
export class Scene {
    public events: Events;
    
    constructor(name: string, events: Events) {
        this.name = name;
        this.events = events;
        
        // Fire lifecycle events
        this.events.fire('scene.created', this);
    }
    
    // Keep direct access for performance-critical operations
    public add(gameObject: GameObject): void {
        // ... existing code
        this.events.fire('scene.objectAdded', gameObject);
    }
    
    public remove(gameObject: GameObject): void {
        // ... existing code
        this.events.fire('scene.objectRemoved', gameObject);
    }
}
```

**File: `src/core/Engine.ts`**
```typescript
export class Engine {
    public events: Events;  // Make events accessible
    
    constructor(canvasId: string, events: Events) {
        this.events = events;
        // ... existing code
        
        // Register engine in events for global access
        this.events.function('engine', () => this);
    }
}
```

### Step 1.2: Add Events to GameObject

**File: `src/core/GameObject.ts`**
```typescript
export class GameObject {
    // Quick access to scene's event bus
    public get events(): Events {
        return this.scene.events;
    }
}
```

---

## Phase 2: State Managers (Closure Pattern)

### Step 2.1: Create Editor State Manager

**File: `src/core/state/EditorState.ts`**
```typescript
import { Events } from '../../events';
import type { Engine } from '../Engine';

export const registerEditorState = (events: Events, engine: Engine) => {
    // Private state in closure
    let isPlaying = false;
    let isEditorMode = true;
    let isPaused = false;
    
    // Expose getters via events
    events.function('editor.isPlaying', () => isPlaying);
    events.function('editor.isEditorMode', () => isEditorMode);
    events.function('editor.isPaused', () => isPaused);
    
    // Handle state changes
    events.on('editor.play', () => {
        if (isPlaying) return;
        
        isPlaying = true;
        isPaused = false;
        engine.play();
        
        events.fire('editor.playStateChanged', { 
            isPlaying, 
            isEditorMode, 
            isPaused 
        });
    });
    
    events.on('editor.pause', () => {
        if (!isPlaying) return;
        
        isPaused = !isPaused;
        if (isPaused) {
            engine.pause();
        } else {
            engine.resume();
        }
        
        events.fire('editor.playStateChanged', { 
            isPlaying, 
            isEditorMode, 
            isPaused 
        });
    });
    
    events.on('editor.stop', () => {
        if (!isPlaying) return;
        
        isPlaying = false;
        isPaused = false;
        engine.stop();
        
        events.fire('editor.playStateChanged', { 
            isPlaying, 
            isEditorMode, 
            isPaused 
        });
    });
    
    events.on('editor.toggleMode', () => {
        isEditorMode = !isEditorMode;
        events.fire('editor.modeChanged', isEditorMode);
    });
};
```

### Step 2.2: Create Selection State Manager

**File: `src/core/state/SelectionState.ts`**
```typescript
import { Events } from '../../events';
import type { Scene } from '../Scene';
import type { GameObject } from '../GameObject';

export const registerSelectionState = (events: Events, scene: Scene) => {
    // Private state
    let selectedObject: GameObject | null = null;
    let selectedObjects: GameObject[] = [];
    let multiSelectEnabled = false;
    
    // Getters
    events.function('selection.get', () => selectedObject);
    events.function('selection.getAll', () => [...selectedObjects]);
    events.function('selection.isMultiSelect', () => multiSelectEnabled);
    
    // Single selection
    events.on('selection.set', (obj: GameObject | null) => {
        const previous = selectedObject;
        selectedObject = obj;
        selectedObjects = obj ? [obj] : [];
        
        events.fire('selection.changed', {
            current: selectedObject,
            previous: previous,
            all: selectedObjects
        });
    });
    
    // Multi-selection
    events.on('selection.add', (obj: GameObject) => {
        if (!selectedObjects.includes(obj)) {
            selectedObjects.push(obj);
            selectedObject = obj; // Last selected becomes primary
            
            events.fire('selection.changed', {
                current: selectedObject,
                previous: null,
                all: selectedObjects
            });
        }
    });
    
    events.on('selection.remove', (obj: GameObject) => {
        const index = selectedObjects.indexOf(obj);
        if (index !== -1) {
            selectedObjects.splice(index, 1);
            selectedObject = selectedObjects[selectedObjects.length - 1] || null;
            
            events.fire('selection.changed', {
                current: selectedObject,
                previous: obj,
                all: selectedObjects
            });
        }
    });
    
    events.on('selection.clear', () => {
        const previous = selectedObject;
        selectedObject = null;
        selectedObjects = [];
        
        events.fire('selection.changed', {
            current: null,
            previous: previous,
            all: []
        });
    });
    
    // Handle scene cleanup
    events.on('scene.objectRemoved', (obj: GameObject) => {
        if (selectedObject === obj) {
            events.fire('selection.set', null);
        } else if (selectedObjects.includes(obj)) {
            events.fire('selection.remove', obj);
        }
    });
};
```

### Step 2.3: Create Input State Manager

**File: `src/core/state/InputState.ts`**
```typescript
import { Events } from '../../events';
import type { InputManager } from '../InputManager';

export const registerInputState = (events: Events, input: InputManager) => {
    // Expose input via events (for non-performance-critical access)
    events.function('input', () => input);
    
    // Optional: Expose specific input queries
    events.function('input.isKeyDown', (key: string) => input.isKeyDown(key));
    events.function('input.getKeyDown', (key: string) => input.getKeyDown(key));
    
    // Fire events for important inputs (for UI/editor)
    // Note: Don't fire every frame - only on state changes
    const keysToWatch = ['Escape', 'Delete', 'f', 'g', 'r', 'w', 'e'];
    
    keysToWatch.forEach(key => {
        let wasDown = false;
        
        setInterval(() => {
            const isDown = input.isKeyDown(key);
            if (isDown && !wasDown) {
                events.fire('input.keyPressed', key);
            }
            wasDown = isDown;
        }, 16); // Check ~60 times per second
    });
};
```

---

## Phase 3: Component Refactoring

### Step 3.1: Update Component Base Class

**File: `src/components/Component.ts`**
```typescript
export abstract class Component implements ISerializable {
    public gameObject!: GameObject;
    
    // Quick access to events via GameObject
    protected get events(): Events {
        return this.gameObject.events;
    }
    
    // Quick access to scene
    protected get scene(): Scene {
        return this.gameObject.scene;
    }
    
    // ... rest of existing code
}
```

### Step 3.2: Refactor PlayerController

**File: `src/components/PlayerController.ts`**
```typescript
import { Component } from './Component';
import type { InputManager } from '../core/InputManager';

export class PlayerController extends Component {
    public moveSpeed: number = 5.0;
    public turnSpeed: number = 2.0;
    
    private input!: InputManager;
    
    public awake(): void {
        // Get input via events (performance-critical, so we cache it)
        this.input = this.events.invoke('input') as InputManager;
        
        if (!this.input) {
            console.error('InputManager not registered in events');
        }
    }
    
    public update(deltaTime: number): void {
        // Query play state via events
        const isPlaying = this.events.invoke('editor.isPlaying') as boolean;
        if (!isPlaying) return;
        
        // WASD movement
        const moveDir = { x: 0, y: 0, z: 0 };
        
        if (this.input.isKeyDown('w')) moveDir.z -= 1;
        if (this.input.isKeyDown('s')) moveDir.z += 1;
        if (this.input.isKeyDown('a')) moveDir.x -= 1;
        if (this.input.isKeyDown('d')) moveDir.x += 1;
        
        // Apply movement
        if (moveDir.x !== 0 || moveDir.z !== 0) {
            const length = Math.sqrt(moveDir.x * moveDir.x + moveDir.z * moveDir.z);
            moveDir.x /= length;
            moveDir.z /= length;
            
            this.transform.localPosition.x += moveDir.x * this.moveSpeed * deltaTime;
            this.transform.localPosition.z += moveDir.z * this.moveSpeed * deltaTime;
        }
        
        // Arrow keys for rotation
        if (this.input.isKeyDown('ArrowLeft')) {
            this.transform.localRotation.y += this.turnSpeed * deltaTime;
        }
        if (this.input.isKeyDown('ArrowRight')) {
            this.transform.localRotation.y -= this.turnSpeed * deltaTime;
        }
        
        // Space to jump
        if (this.input.getKeyDown(' ')) {
            this.transform.localPosition.y += 1;
        }
    }
    
    public getTypeName(): string {
        return 'PlayerController';
    }
}
```

---

## Phase 4: Editor UI Refactoring

### Step 4.1: Decouple EditorUI from Engine

**File: `src/editor/EditorUI.ts`**
```typescript
import { Events } from '../events';

export class EditorUI {
    private events: Events;
    
    // Remove direct engine reference
    constructor(events: Events) {
        this.events = events;
        this.setupEventHandlers();
        this.createUI();
    }
    
    private setupEventHandlers(): void {
        // Listen to state changes
        this.events.on('editor.playStateChanged', (state: any) => {
            this.updatePlayButton(state.isPlaying, state.isPaused);
        });
        
        this.events.on('selection.changed', (data: any) => {
            this.updateInspector(data.current);
            this.updateHierarchy();
        });
        
        this.events.on('scene.objectAdded', () => {
            this.updateHierarchy();
        });
        
        this.events.on('scene.objectRemoved', () => {
            this.updateHierarchy();
        });
    }
    
    private createUI(): void {
        this.createPlayControls();
        this.createHierarchy();
        this.createInspector();
    }
    
    private createPlayControls(): void {
        const toolbar = document.createElement('div');
        toolbar.className = 'toolbar';
        
        const playButton = document.createElement('button');
        playButton.textContent = '▶ Play';
        playButton.addEventListener('click', () => {
            this.events.fire('editor.play');
        });
        
        const pauseButton = document.createElement('button');
        pauseButton.textContent = '⏸ Pause';
        pauseButton.addEventListener('click', () => {
            this.events.fire('editor.pause');
        });
        
        const stopButton = document.createElement('button');
        stopButton.textContent = '⏹ Stop';
        stopButton.addEventListener('click', () => {
            this.events.fire('editor.stop');
        });
        
        toolbar.appendChild(playButton);
        toolbar.appendChild(pauseButton);
        toolbar.appendChild(stopButton);
        document.body.appendChild(toolbar);
    }
    
    private updatePlayButton(isPlaying: boolean, isPaused: boolean): void {
        // Update button states based on play state
        // No direct engine access needed!
    }
    
    private updateInspector(selectedObject: GameObject | null): void {
        // Get scene via events if needed
        const scene = this.events.invoke('engine')?.getScene();
        // ... update inspector UI
    }
    
    private selectObject(objectId: string | null): void {
        // Fire selection event instead of direct manipulation
        const scene = this.events.invoke('engine')?.getScene();
        const obj = scene?.findById(objectId);
        this.events.fire('selection.set', obj);
    }
}
```

---

## Phase 5: Main Entry Point Integration

### Step 5.1: Update main.ts

**File: `src/main.ts`**
```typescript
import { Engine } from './core/Engine';
import { Scene } from './core/Scene';
import { Events } from './events';
import { EditorUI } from './editor/EditorUI';
import { GameObject } from './core/GameObject';
import { MeshRenderer } from './components/MeshRenderer';
import { PlayerController } from './components/PlayerController';
import * as THREE from 'three/webgpu';

// Import state managers
import { registerEditorState } from './core/state/EditorState';
import { registerSelectionState } from './core/state/SelectionState';
import { registerInputState } from './core/state/InputState';

// 1. CREATE EVENT BUS
const events = new Events();

// 2. CREATE ENGINE (with events)
const engine = new Engine('game-canvas', events);

// 3. CREATE SCENE (with events)
const scene = new Scene('Main Scene', events);

// 4. REGISTER STATE MANAGERS
registerEditorState(events, engine);
registerSelectionState(events, scene);
registerInputState(events, engine.getInputManager());

// 5. LOAD SCENE
engine.loadScene(scene);

// 6. CREATE EDITOR UI (with events only)
const editorUI = new EditorUI(events);

// 7. CREATE GAME OBJECTS
const player = new GameObject('Player');
const meshRenderer = player.addComponent(MeshRenderer);
meshRenderer.setGeometry(new THREE.BoxGeometry(1, 2, 1));
meshRenderer.setMaterial(new THREE.MeshStandardNodeMaterial({ color: 0x00ff00 }));

const playerController = player.addComponent(PlayerController);
playerController.moveSpeed = 5.0;

scene.add(player);

// 8. START ENGINE
engine.start();

// 9. EXPOSE FOR DEBUGGING (optional)
(window as any).events = events;
(window as any).scene = scene;

console.log('✅ Game Engine initialized with Events pattern');
```

---

## Phase 6: Remove ServiceLocator (Deprecated)

### Step 6.1: Mark ServiceLocator as Deprecated

**File: `src/core/ServiceLocator.ts`**
```typescript
/**
 * @deprecated Use Events pattern instead
 * This class will be removed in future versions.
 * 
 * Instead of:
 *   ServiceLocator.getInput()
 * Use:
 *   this.events.invoke('input')
 */
export class ServiceLocator {
    // Keep for backwards compatibility but add deprecation warnings
    public static getInput(): InputManager {
        console.warn('ServiceLocator.getInput() is deprecated. Use events.invoke("input") instead.');
        return this.getEngine().getInputManager();
    }
    
    // ... other methods with deprecation warnings
}
```

### Step 6.2: Migration Guide Comment

Add to top of `ServiceLocator.ts`:
```typescript
/**
 * MIGRATION GUIDE: ServiceLocator → Events
 * 
 * OLD:
 *   const input = ServiceLocator.getInput();
 *   const scene = ServiceLocator.getScene();
 *   const isPlaying = ServiceLocator.isPlaying();
 * 
 * NEW:
 *   // In Component classes:
 *   const input = this.events.invoke('input');
 *   const scene = this.scene; // Direct access via Component
 *   const isPlaying = this.events.invoke('editor.isPlaying');
 * 
 *   // In other classes with Events injected:
 *   const input = events.invoke('input');
 *   const scene = events.invoke('engine').getScene();
 *   const isPlaying = events.invoke('editor.isPlaying');
 */
```

---

## Phase 7: Advanced Patterns (Optional)

### Step 7.1: Camera State Manager

**File: `src/core/state/CameraState.ts`**
```typescript
export const registerCameraState = (events: Events, scene: Scene) => {
    let activeCamera: Camera | null = null;
    let editorCamera: Camera | null = null;
    let cameraMode: 'editor' | 'game' = 'editor';
    
    events.function('camera.getActive', () => activeCamera);
    events.function('camera.getEditor', () => editorCamera);
    events.function('camera.getMode', () => cameraMode);
    
    events.on('camera.setActive', (camera: Camera) => {
        activeCamera = camera;
        events.fire('camera.changed', camera);
    });
    
    events.on('camera.setMode', (mode: 'editor' | 'game') => {
        cameraMode = mode;
        
        if (mode === 'editor' && editorCamera) {
            activeCamera = editorCamera;
        }
        
        events.fire('camera.modeChanged', mode);
        events.fire('camera.changed', activeCamera);
    });
    
    // Auto-switch camera on play/stop
    events.on('editor.playStateChanged', (state: any) => {
        if (state.isPlaying) {
            events.fire('camera.setMode', 'game');
        } else {
            events.fire('camera.setMode', 'editor');
        }
    });
};
```

### Step 7.2: Project State Manager

**File: `src/core/state/ProjectState.ts`**
```typescript
export const registerProjectState = (events: Events) => {
    let currentProject: Project | null = null;
    let isDirty = false;
    
    events.function('project.get', () => currentProject);
    events.function('project.isDirty', () => isDirty);
    
    events.on('project.open', (project: Project) => {
        currentProject = project;
        isDirty = false;
        events.fire('project.changed', project);
    });
    
    events.on('project.close', () => {
        currentProject = null;
        isDirty = false;
        events.fire('project.changed', null);
    });
    
    events.on('project.markDirty', () => {
        isDirty = true;
        events.fire('project.dirtyChanged', true);
    });
    
    events.on('project.save', async () => {
        if (currentProject) {
            await currentProject.save();
            isDirty = false;
            events.fire('project.saved', currentProject);
            events.fire('project.dirtyChanged', false);
        }
    });
    
    // Auto-mark dirty on scene changes
    events.on('scene.objectAdded', () => events.fire('project.markDirty'));
    events.on('scene.objectRemoved', () => events.fire('project.markDirty'));
};
```

---

## Migration Checklist

### ✅ Phase 1: Foundation
- [ ] Add Events to Engine constructor
- [ ] Add Events to Scene constructor
- [ ] Add events getter to GameObject
- [ ] Update main.ts to create Events instance

### ✅ Phase 2: State Managers
- [ ] Create EditorState manager
- [ ] Create SelectionState manager
- [ ] Create InputState manager
- [ ] Register all state managers in main.ts

### ✅ Phase 3: Components
- [ ] Add events getter to Component base class
- [ ] Refactor PlayerController to use events
- [ ] Test PlayerController in play mode

### ✅ Phase 4: Editor UI
- [ ] Remove Engine reference from EditorUI constructor
- [ ] Update EditorUI to use events for all interactions
- [ ] Update play/pause/stop buttons to fire events
- [ ] Update selection to use events

### ✅ Phase 5: Main Integration
- [ ] Update main.ts initialization order
- [ ] Test full editor workflow
- [ ] Verify play mode works

### ✅ Phase 6: Cleanup
- [ ] Mark ServiceLocator as deprecated
- [ ] Add migration guide
- [ ] Update all remaining ServiceLocator calls

### ✅ Phase 7: Advanced (Optional)
- [ ] Add CameraState manager
- [ ] Add ProjectState manager
- [ ] Add any custom state managers

---

## Testing Plan

1. **Unit Tests**: Mock Events object for each component
2. **Integration Tests**: Verify state managers coordinate correctly
3. **Manual Tests**:
   - Play/pause/stop workflow
   - Selection in editor
   - Player movement in play mode
   - Scene hierarchy updates
   - Inspector updates

---

## Benefits After Refactoring

✅ **No more window hacks**
✅ **No ServiceLocator anti-pattern**
✅ **Clear dependency injection**
✅ **Easy to mock for testing**
✅ **Follows SuperSplat best practices**
✅ **Decoupled UI from Engine**
✅ **Event-driven architecture**
✅ **Professional code structure**
