# Architecture Discussion: Custom vs Three.js Transforms

## Current Issue
We're maintaining TWO transform systems:
1. Our custom Transform with local/world matrices
2. Three.js Object3D transforms

This creates redundancy and complexity.

## Options for Simplification

### Option A: Minimal Custom Layer (Recommended for Learning)
Keep the current approach but acknowledge it's for learning purposes:
- Custom GameObject hierarchy teaches concepts
- Easy to understand parent-child relationships
- Shows how game engines work under the hood
- **Trade-off**: More code, less performant

### Option B: Use Three.js Directly (Recommended for Production)
Simplify by using Three.js's built-in systems:

```typescript
// GameObject becomes a thin wrapper
export class GameObject extends THREE.Object3D {
    public components: Component[] = [];

    // Three.js already has:
    // - position, rotation, scale (local)
    // - parent/children hierarchy
    // - add(child), remove(child)
    // - getWorldPosition(), etc.
}

// No separate Transform component needed!
// MeshRenderer just adds the mesh as a child:
export class MeshRenderer extends Component {
    awake() {
        const mesh = new THREE.Mesh(geometry, material);
        this.gameObject.add(mesh); // GameObject IS an Object3D
    }
}
```

**Benefits:**
- 50% less code
- Better performance (no sync overhead)
- Leverage Three.js's optimized systems
- Standard approach used by many Three.js frameworks

### Option C: Hybrid (Current Implementation)
Custom GameObject + sync to Three.js
- More control over GameObject API
- Can add custom features
- **Current problem**: Doing extra work without clear benefit

## Recommendation

For **Chapter 4 of this tutorial**, the current approach is fine for learning purposes - it demonstrates:
- How transforms work
- Parent-child relationships
- Local vs world space

For a **real game engine**, I'd recommend Option B - use Three.js directly and don't reinvent the wheel.

## What Would Change with Option B?

```typescript
// Much simpler Transform:
export class Transform {
    constructor(private object3D: THREE.Object3D) {}

    get position() { return this.object3D.position; }
    get rotation() { return this.object3D.rotation; }
    get scale() { return this.object3D.scale; }

    // No custom matrix math needed - Three.js handles it!
}

// GameObject becomes simpler:
export class GameObject extends THREE.Object3D {
    public readonly transform: Transform;

    constructor(name: string) {
        super();
        this.name = name;
        this.transform = new Transform(this);
    }
}
```