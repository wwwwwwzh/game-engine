engine fires lifecycle events

scene, renderer and editor subscribes

UI fire events that editor subscribes, which acts as a hub to fire events that scene subscribes. Tools are not editor objects and directly reference scene. 

Scene fires scene change events and editor subscribes





Reasons:

Immediate Access to Core Objects: Tools need direct access to:

scene.camera.entity.camera - For gizmo creation
scene.gizmoLayer - For rendering gizmos
scene.app.root - For adding entities
scene.add(element) / scene.remove(element) - For managing scene elements
scene.forceRender - For triggering renders


Performance: Avoiding event overhead for frequent operations (every frame during drag)
Type Safety: Direct references provide compile-time type checking

```ts
class BoxSelection {
    constructor(events: Events, scene: Scene, canvasContainer: Container) {
        // DIRECT REFERENCE for scene manipulation
        scene.add(box);
        gizmo.attach([box.pivot]);
        
        // EVENT BUS for cross-cutting concerns
        events.fire('select.byBox', op, [p.x, p.y, p.z, lenX, lenY, lenZ]);
    }
}
```

## Pattern Decision Matrix

| Concern | Use Direct Reference | Use Event Bus |
|---------|---------------------|---------------|
| **Frequent access** (e.g., every frame) | ✓ | ✗ |
| **Core object access** (scene graph, camera) | ✓ | ✗ |
| **UI → Business Logic** | ✗ | ✓ |
| **Cross-cutting concerns** (undo/redo) | ✗ | ✓ |
| **Multiple listeners needed** | ✗ | ✓ |
| **Type safety critical** | ✓ | ~ |

## Architecture Layers
```
┌─────────────────────────────────────────┐
│ UI Layer (PCUI Components)              │
│ - No direct scene access                │
│ - Only uses event bus                   │
└─────────────────────────────────────────┘
              ↓ (events only)
┌─────────────────────────────────────────┐
│ Application Layer (Editor Events)       │
│ - Uses event bus for coordination       │
│ - Receives: UI events                   │
│ - Fires: Business logic events          │
└─────────────────────────────────────────┘
              ↓ (events + refs)
┌─────────────────────────────────────────┐
│ Tool Layer (Transform, Selection Tools) │
│ - Direct scene reference for perf       │
│ - Event bus for coordination            │
└─────────────────────────────────────────┘
              ↓ (direct manipulation)
┌─────────────────────────────────────────┐
│ Scene Layer (Scene, Elements, Splats)   │
│ - Core 3D scene graph                   │
│ - Fires events for state changes        │
└─────────────────────────────────────────┘
```



## Communication Patterns Summary

### **1. Direct References (Tools → Scene)**

**Why Tools Have Direct Scene Reference:**
```typescript
// main.ts - Tool instantiation
toolManager.register('move', new MoveTool(events, scene));
toolManager.register('boxSelection', new BoxSelection(events, scene, canvasContainer));
```

**Reasons:**
- **Immediate Access to Core Objects**: Tools need direct access to:
  - `scene.camera.entity.camera` - For gizmo creation
  - `scene.gizmoLayer` - For rendering gizmos
  - `scene.app.root` - For adding entities
  - `scene.add(element)` / `scene.remove(element)` - For managing scene elements
  - `scene.forceRender` - For triggering renders

- **Performance**: Avoiding event overhead for frequent operations (every frame during drag)

- **Type Safety**: Direct references provide compile-time type checking

**Example from TransformTool:**
```typescript
constructor(gizmo: TransformGizmo, events: Events, scene: Scene) {
    const pivotEntity = new Entity('gizmoPivot');
    scene.app.root.addChild(pivotEntity);  // Direct scene manipulation
    
    gizmo.on('transform:move', () => {
        scene.forceRender = true;  // Direct property access
    });
}
```

### **2. Event Bus Pattern (Editor Logic)**

**Why Other Code Uses Events:**
```typescript
// editor.ts - Register event handlers
const registerEditorEvents = (events: Events, editHistory: EditHistory, scene: Scene) => {
    events.on('select.all', () => {
        selectedSplats().forEach((splat) => {
            events.fire('edit.add', new SelectAllOp(splat));
        });
    });
}
```

**Reasons:**
- **Decoupling**: UI doesn't need to know about EditHistory, Scene internals
- **Multiple Listeners**: Many components can react to same event
- **Testability**: Can mock events without full system
- **Dynamic Behavior**: Can add/remove listeners at runtime

### **3. Hybrid Pattern (Tools)**

Tools use **both** patterns strategically:

```typescript
class BoxSelection {
    constructor(events: Events, scene: Scene, canvasContainer: Container) {
        // DIRECT REFERENCE for scene manipulation
        scene.add(box);
        gizmo.attach([box.pivot]);
        
        // EVENT BUS for cross-cutting concerns
        events.fire('select.byBox', op, [p.x, p.y, p.z, lenX, lenY, lenZ]);
    }
}
```

## Pattern Decision Matrix

| Concern | Use Direct Reference | Use Event Bus |
|---------|---------------------|---------------|
| **Frequent access** (e.g., every frame) | ✓ | ✗ |
| **Core object access** (scene graph, camera) | ✓ | ✗ |
| **UI → Business Logic** | ✗ | ✓ |
| **Cross-cutting concerns** (undo/redo) | ✗ | ✓ |
| **Multiple listeners needed** | ✗ | ✓ |
| **Type safety critical** | ✓ | ~ |

## Architecture Layers

```
┌─────────────────────────────────────────┐
│ UI Layer (PCUI Components)              │
│ - No direct scene access                │
│ - Only uses event bus                   │
└─────────────────────────────────────────┘
              ↓ (events only)
┌─────────────────────────────────────────┐
│ Application Layer (Editor Events)       │
│ - Uses event bus for coordination       │
│ - Receives: UI events                   │
│ - Fires: Business logic events          │
└─────────────────────────────────────────┘
              ↓ (events + refs)
┌─────────────────────────────────────────┐
│ Tool Layer (Transform, Selection Tools) │
│ - Direct scene reference for perf       │
│ - Event bus for coordination            │
└─────────────────────────────────────────┘
              ↓ (direct manipulation)
┌─────────────────────────────────────────┐
│ Scene Layer (Scene, Elements, Splats)   │
│ - Core 3D scene graph                   │
│ - Fires events for state changes        │
└─────────────────────────────────────────┘
```

## Key Insight

**Tools bridge the performance-critical scene layer with the flexible event-driven application layer:**

- **Downward** (to Scene): Direct references for performance
- **Upward** (to App/UI): Event bus for decoupling
- **Sideways** (to other Tools): Event bus for coordination

This hybrid approach gives the best of both worlds: **performance where it matters, flexibility where it's needed**.## Why Camera and Selection Don't Directly Reference Scene

### **1. They DO Have Scene References Available**

```typescript
// main.ts - They receive scene reference
registerEditorEvents(events, editHistory, scene);
registerSelectionEvents(events, scene);
```

But notice they're **registration functions**, not classes:

```typescript
// selection.ts
const registerSelectionEvents = (events: Events, scene: Scene) => {
    let selection: Splat = null;  // Closure state
    
    const setSelection = (splat: Splat) => {
        // ...logic
        events.fire('selection.changed', selection, prev);
    };
    
    // Register as function on event bus
    events.function('selection', () => {
        return selection;
    });
    
    events.on('selection', (splat: Splat) => {
        setSelection(splat);
    });
}
```

### **2. The Key Difference: State Management Pattern**

**Tools** = **Stateful Objects**
```typescript
class MoveTool extends TransformTool {
    // Object with methods and internal state
    constructor(events: Events, scene: Scene) {
        this.scene = scene;  // Store reference
    }
}
```

**Selection/Camera** = **Stateless Event Handlers** (Closure-based)
```typescript
const registerSelectionEvents = (events: Events, scene: Scene) => {
    // Module pattern - encapsulated state in closure
    let selection: Splat = null;  // Private state
    
    // Expose via event bus
    events.function('selection', () => selection);
}
```

### **3. Why This Design Choice?**

**A. Single Source of Truth**

Selection state needs to be accessible from **many different places**:

```typescript
// Tools need selection
const pivot = events.invoke('pivot') as Pivot;
const selection = events.invoke('selection') as Splat;

// UI needs selection
const selectedSplats = () => {
    const selected = events.invoke('selection') as Splat;
    return selected?.visible ? [selected] : [];
};

// Transform handlers need selection
events.on('pivot.started', (pivot: Pivot) => {
    if (this.splat) {  // this.splat = events.invoke('selection')
        this.start();
    }
});
```

**Direct reference would require:**
```typescript
// BAD: Everyone needs to import selection module
import { getSelection } from './selection';

// Creates tight coupling
const selection = getSelection();
```

**Event bus provides:**
```typescript
// GOOD: Decoupled access
const selection = events.invoke('selection');
```

**B. Consistency with Application State Pattern**

Notice how ALL application state uses the same pattern:

```typescript
// editor.ts - All state managed via events
let activeMode = 'centers';
let cameraOverlay = true;
let outlineSelection = false;
let viewBands = scene.config.show.shBands;

// Expose getters
events.function('camera.mode', () => activeMode);
events.function('camera.overlay', () => cameraOverlay);
events.function('view.outlineSelection', () => outlineSelection);
events.function('view.bands', () => viewBands);

// Expose setters
events.on('camera.setMode', (mode: string) => setCameraMode(mode));
events.on('camera.setOverlay', (value: boolean) => setCameraOverlay(value));
```

This creates **uniform access pattern** across the entire app!

**C. Testability & Dependency Injection**

```typescript
// Easy to mock in tests
const mockEvents = new Events();
mockEvents.function('selection', () => mockSplat);

// Can't mock direct references as easily
```

**D. Temporal Decoupling**

Selection might not exist when tools are created:

```typescript
// Tool created first
toolManager.register('move', new MoveTool(events, scene));

// Selection set later
events.fire('selection', someSplat);

// Tool can always get current selection
const current = events.invoke('selection');
```

### **4. When Scene Reference IS Used**

Selection DOES use scene reference, but only for **scene queries**:

```typescript
const registerSelectionEvents = (events: Events, scene: Scene) => {
    events.on('selection.next', () => {
        // Direct scene access for iteration
        const splats = scene.getElementsByType(ElementType.splat) as Splat[];
        // ...
    });
    
    events.on('scene.elementRemoved', (element: Element) => {
        if (element === selection) {
            // Query scene for alternatives
            const splats = scene.getElementsByType(ElementType.splat) as Splat[];
            // ...
        }
    });
}
```

**Used for**: Querying scene structure  
**NOT used for**: Storing state or exposing APIs

## Architecture Comparison

### **Tools (Class-based, Direct References)**
```typescript
class BoxSelection {
    scene: Scene;  // Direct reference
    active = false;  // Object state
    
    constructor(events: Events, scene: Scene) {
        this.scene = scene;
    }
    
    activate() {
        this.scene.add(box);  // Direct manipulation
    }
}
```

**When to use:**
- Need object lifecycle (activate/deactivate)
- Need performance (frequent scene access)
- Encapsulated behavior (tool-specific logic)

### **State Managers (Closure-based, Event Bus)**
```typescript
const registerSelectionEvents = (events: Events, scene: Scene) => {
    let selection: Splat = null;  // Closure state
    
    events.function('selection', () => selection);  // Global getter
    events.on('selection', (s) => { selection = s; });  // Global setter
}
```

**When to use:**
- Global application state
- Needs wide accessibility
- Single source of truth
- Reactive updates (many listeners)

## Summary

**Why selection/camera don't directly expose references:**

1. ✅ **Uniform access pattern** - All app state via events
2. ✅ **Decoupling** - No import dependencies
3. ✅ **Single source of truth** - One getter, many consumers
4. ✅ **Reactivity** - Changes broadcast automatically
5. ✅ **Testability** - Easy to mock
6. ✅ **Temporal decoupling** - Can access before initialization

**Tools use direct references because:**

1. ✅ **Performance** - Frequent scene manipulation
2. ✅ **Encapsulation** - Tool-specific scene interactions
3. ✅ **Type safety** - Compile-time checks
4. ✅ **Object lifecycle** - Clear activate/deactivate

It's a **pragmatic hybrid** - use the right pattern for the right purpose! 🎯