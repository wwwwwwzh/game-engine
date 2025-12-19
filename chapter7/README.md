# Chapter 7: Asset Management + Project System

## Introduction

In Chapter 6, we built a sophisticated camera system with professional viewport navigation. We implemented the ServiceLocator pattern for clean service access, created a Camera component that works as a child of GameObject's Object3D, and built an EditorCameraController with intuitive controls (pan, orbit, zoom, fly mode). We added visual camera editing tools including frustum gizmos, preview overlays, and a viewport orientation gizmo for quick camera alignment.

But there's a fundamental problem that makes our engine unusable for real work: **nothing persists**.

Every time we refresh the browser, everything we've painstakingly created—our scene hierarchy, GameObject transforms, component configurations, camera setups—all vanishes into the void. We're building sandcastles at high tide. This is unacceptable for any tool that aspires to be a real game engine.

Professional game engines solve this through comprehensive **asset management** and **project systems**. Unity has its Project window showing a folder hierarchy of assets. Unreal has its Content Browser. Godot has its FileSystem dock. These aren't just nice-to-haves—they're the foundation that makes iterative game development possible.

### The Core Problems We're Solving

**Problem 1: Ephemeral State**
Our entire editor state lives only in JavaScript memory. Close the browser tab, and it's gone forever. This makes it impossible to:
- Work on a game over multiple sessions
- Share projects with team members
- Version control our work
- Back up our progress

**Problem 2: No Asset Organization**
We can create GameObjects with MeshRenderers, but:
- Where do textures come from?
- How do we load 3D models?
- Where do we store custom materials?
- How do we manage multiple scenes?
- What about sounds, scripts, prefabs?

**Problem 3: No File System Integration**
Professional tools integrate with the operating system's file system. You can:
- Drag a texture from Finder/Explorer into Unity
- Edit a script in VS Code and have Unity detect the change
- Organize assets in folders that actually exist on disk
- Use standard file operations (copy, move, delete)

Our web-based engine needs this too, despite running in a browser.

### What We're Building in This Chapter

We'll implement a complete asset management and project persistence system:

1. **File System Access API Integration** - Connect our browser app to the user's actual file system
2. **Project Structure** - Create a standard folder hierarchy (Assets/, Scenes/, etc.)
3. **Asset Manager** - Load, cache, and manage textures, models, and other resources
4. **Project Panel UI** - Visual browser for navigating and managing assets
5. **Save System** - Serialize scenes and project settings to JSON files on disk
6. **Keyboard Shortcuts** - Cmd/Ctrl+S to save like a native application
7. **Asset Loading** - Asynchronous loading with caching and reference counting

By the end of this chapter, you'll be able to:
- Create a new project in a folder on your computer
- Create and arrange GameObjects in a scene
- Press Cmd/Ctrl+S to save everything
- Close the browser
- Reopen the project and find everything exactly as you left it
- See your project files in Finder/Explorer as actual JSON files

This transforms our toy into a tool.

---

## Concepts

### Understanding the File System Access API

Web applications traditionally run in a security sandbox that prevents them from accessing the user's file system. This is good for security—you don't want random websites reading your files. But it's terrible for productivity applications like IDEs, image editors, or game engines.

The **File System Access API** (formerly called Native File System API) bridges this gap. It lets web apps request permission to read and write files in specific directories, giving us the power of desktop applications while maintaining security through user consent.

**How It Works:**

```typescript
// 1. Request directory access (shows browser's folder picker dialog)
const dirHandle = await window.showDirectoryPicker({
    mode: 'readwrite'  // Request both read and write access
});

// 2. User explicitly chooses a folder - now we have permission

// 3. Get a file handle
const fileHandle = await dirHandle.getFileHandle('scene.json', { 
    create: true  // Create if it doesn't exist
});

// 4. Write to the file
const writable = await fileHandle.createWritable();
await writable.write(JSON.stringify(sceneData));
await writable.close();

// 5. Read from the file later
const file = await fileHandle.getFile();
const text = await file.text();
const data = JSON.parse(text);
```

**Security Model:**

The API is designed with safety in mind:
- **User Intent**: The user must explicitly click "Allow" in the browser's permission dialog
- **Per-Directory**: Permission is granted per-directory, not system-wide
- **Session-Based**: By default, permissions don't persist across browser sessions (though they can with the right permissions)
- **No Silent Access**: Apps can't read/write files without user action

**Browser Support (as of 2024):**

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome/Edge | ✅ v86+ | Full support |
| Opera | ✅ v72+ | Full support |
| Safari | ❌ | Not yet (Apple is evaluating) |
| Firefox | ❌ | Not yet (Mozilla has concerns about UX) |

For unsupported browsers, we can fall back to traditional download/upload:
- **Save**: Generate a Blob and trigger a download
- **Load**: Use an `<input type="file">` to let users upload

**Why This Matters for Game Engines:**

1. **Real Projects**: Your game project exists as actual files on disk, not just browser memory
2. **Version Control**: You can commit your project to Git like any code project
3. **External Tools**: Edit a script in VS Code, and the engine sees the change
4. **Team Collaboration**: Share a project folder via Dropbox/Google Drive
5. **Professional Workflow**: Works like Unity, Godot, or any desktop engine

### Project Structure Architecture

Professional game engines organize projects in a standardized folder structure. Let's examine Unity's approach and then design ours:

**Unity's Project Structure:**
```
MyGame/
├── Assets/
│   ├── Scenes/
│   ├── Scripts/
│   ├── Prefabs/
│   ├── Materials/
│   ├── Textures/
│   ├── Models/
│   ├── Audio/
│   └── Resources/
├── Library/           (generated, cached data)
├── Packages/          (package dependencies)
├── ProjectSettings/   (project configuration)
└── Temp/             (temporary files)
```

**Our Structure** (simplified but extensible):
```
MyGame/
├── Assets/
│   ├── Scenes/
│   │   ├── MainScene.json
│   │   └── Level1.json
│   ├── Prefabs/
│   │   └── Player.prefab.json
│   ├── Textures/
│   │   ├── player_diffuse.png
│   │   └── ground_normal.png
│   ├── Models/
│   │   ├── character.gltf
│   │   └── building.glb
│   └── Scripts/
│       ├── PlayerController.ts
│       └── EnemyAI.ts
├── ProjectSettings.json
└── .gitignore
```

**Why This Structure?**

1. **Assets/** - All game content lives here
   - Easy to find things
   - Maps to the asset browser UI
   - Can be version controlled selectively

2. **Scenes/** - Each level/scene is a separate file
   - Work on different scenes without conflicts
   - Load scenes independently
   - Reference scenes by path

3. **Prefabs/** - Reusable GameObject templates
   - Will implement in Chapter 19
   - Allows instance-override workflows

4. **Type-Based Folders** - Organize by content type
   - Textures/, Models/, Scripts/
   - Makes batch operations easy
   - Helps asset pipeline tools

5. **ProjectSettings.json** - Configuration lives in one place
   - Project name, version
   - List of all scenes
   - Build settings (future)
   - Input mappings (future)

**The Project Settings File:**

```json
{
  "name": "MyAwesomeGame",
  "version": "1.0.0",
  "engine_version": "0.7.0",
  "scenes": {
    "MainScene": "Assets/Scenes/MainScene.json",
    "Level1": "Assets/Scenes/Level1.json"
  },
  "startup_scene": "MainScene",
  "created": "2024-12-18T10:30:00Z",
  "modified": "2024-12-18T14:45:00Z"
}
```

This file serves as the "manifest" that defines what makes a folder a valid project.

### Asset Loading Strategies

When we talk about "loading an asset," we're really talking about several distinct strategies, each with trade-offs:

#### 1. Synchronous Loading (Blocking)

**What it is:**
The program stops and waits for the asset to load before continuing.

```typescript
// Hypothetical synchronous API (doesn't actually exist for images)
const texture = loadTextureSync('player.png');
console.log('Texture loaded!'); // Only runs after texture is ready
```

**Pros:**
- Simple code flow
- Asset is definitely ready when you need it

**Cons:**
- **Freezes the entire application** during loading
- Terrible user experience (unresponsive UI)
- Not possible for most web APIs (they're async by design)

**When to use:** Never, really. Web browsers intentionally make this difficult to prevent frozen pages.

#### 2. Asynchronous Loading (Non-Blocking)

**What it is:**
Start loading the asset, but let the program continue running. Get notified when it's done.

```typescript
// Modern async/await
const texture = await loadTextureAsync('player.png');
console.log('Texture loaded!');

// Or with promises
loadTextureAsync('player.png').then(texture => {
    console.log('Texture loaded!');
});
```

**Pros:**
- Application stays responsive
- Can show loading progress
- Can load multiple assets in parallel
- This is how web APIs work

**Cons:**
- More complex code flow (async/await, promises)
- Need to handle "not ready yet" states
- Race conditions if not careful

**When to use:** Default choice for web engines. Everything else builds on this.

#### 3. Lazy Loading (On-Demand)

**What it is:**
Don't load the asset until it's actually needed. Load-on-demand.

```typescript
class LazyTexture {
    private texture: THREE.Texture | null = null;
    
    async getTexture(): Promise<THREE.Texture> {
        if (!this.texture) {
            this.texture = await loadTextureAsync(this.path);
        }
        return this.texture;
    }
}
```

**Pros:**
- Faster initial startup (don't load everything)
- Lower memory usage (only load what's used)
- Good for large projects with many assets

**Cons:**
- Possible hitches when assets load mid-game
- Need placeholder/fallback assets
- More complex code

**When to use:** Large open-world games, asset streaming, progressive web apps.

#### 4. Preloading with Caching

**What it is:**
Load assets ahead of time and keep them in memory for instant access.

```typescript
class AssetManager {
    private cache = new Map<string, any>();
    
    async preload(paths: string[]): Promise<void> {
        for (const path of paths) {
            const texture = await loadTextureAsync(path);
            this.cache.set(path, texture);
        }
    }
    
    getTexture(path: string): THREE.Texture | null {
        return this.cache.get(path) || null;
    }
}
```

**Pros:**
- No loading hitches during gameplay
- Instant access once preloaded
- Can show loading screen with progress

**Cons:**
- Higher memory usage (keeping everything in RAM)
- Longer initial load time
- Need to decide what to preload

**When to use:** Level-based games, loading screens, assets used throughout the game.

**Our Approach:**

We'll use **asynchronous loading with caching**:
```typescript
// First access: Load from disk
const texture = await assetManager.loadTexture('player.png');  // Loads from disk

// Second access: Return cached version
const sameTex = await assetManager.loadTexture('player.png');  // Instant, from cache

// When done: Release reference
assetManager.release('player.png');  // Decrement reference count
```

This gives us the responsiveness of async loading with the performance of caching.

### Reference Counting and Memory Management

Imagine three GameObjects all using the same texture:

```
GameObject "Player"    → Material → Texture "player.png"
GameObject "Enemy1"    → Material → Texture "player.png"
GameObject "Enemy2"    → Material → Texture "player.png"
```

When should we unload "player.png" from memory?
- Not when Player is destroyed (Enemy1 and Enemy2 still need it)
- Not when Enemy1 is destroyed (Player and Enemy2 still need it)
- Only when **all three** are destroyed (no one needs it anymore)

This is what **reference counting** solves.

**How Reference Counting Works:**

```typescript
interface Asset {
    path: string;
    data: THREE.Texture;
    refCount: number;  // How many things reference this asset
}

// When loading
async loadTexture(path: string): Promise<THREE.Texture> {
    const cached = this.cache.get(path);
    if (cached) {
        cached.refCount++;  // Increment: one more user
        return cached.data;
    }
    
    // Load fresh
    const texture = await this.textureLoader.loadAsync(path);
    this.cache.set(path, { path, data: texture, refCount: 1 });
    return texture;
}

// When done using
release(path: string): void {
    const asset = this.cache.get(path);
    if (!asset) return;
    
    asset.refCount--;  // Decrement: one less user
    
    if (asset.refCount === 0) {
        // No one needs this anymore
        asset.data.dispose();  // Free GPU memory
        this.cache.delete(path);  // Free RAM
        console.log(`Unloaded ${path}`);
    }
}
```

**Lifecycle Example:**

```
1. Player loads → refCount = 1
2. Enemy1 loads (cached) → refCount = 2
3. Enemy2 loads (cached) → refCount = 3
4. Player destroyed → refCount = 2 (still in memory)
5. Enemy1 destroyed → refCount = 1 (still in memory)
6. Enemy2 destroyed → refCount = 0 → UNLOAD from memory
```

**Why This Matters:**

Without reference counting:
- **Memory leaks**: Assets never get unloaded, RAM grows forever
- **Premature unloading**: Asset gets unloaded while still in use, causing crashes
- **Duplicate loading**: Same asset loaded multiple times, wasting memory

With reference counting:
- **Automatic cleanup**: Assets unload exactly when no longer needed
- **Shared efficiently**: One copy in memory, used by many
- **No manual tracking**: The system handles it

**Limitations:**

Reference counting can't detect **circular references**:
```
Asset A references Asset B
Asset B references Asset A
Both have refCount > 0, but neither is reachable
```

For this, you'd need a **tracing garbage collector** (like JavaScript's built-in GC). But for assets, circular references are rare, so reference counting works well.

### Asset Types and Loaders

Different asset types require different loading strategies. Let's examine each:

#### Textures (Images)

**Formats:** PNG, JPG, WebP, GIF
**Loader:** Three.js TextureLoader (wraps browser's Image API)

```typescript
const loader = new THREE.TextureLoader();
const texture = await loader.loadAsync('path/to/texture.png');

// Texture properties
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;
```

**Memory considerations:**
- A 1024×1024 RGBA texture uses 4MB of GPU memory (1024 × 1024 × 4 bytes)
- Mipmaps add ~33% more (1/4 + 1/16 + 1/64 + ...)
- JPG is smaller on disk but same size in GPU memory

**Best practices:**
- Use power-of-2 dimensions (512, 1024, 2048) for mipmapping
- Compress textures (use WebP or basis universal)
- Use texture atlases to reduce draw calls

#### 3D Models

**Formats:** GLTF (.gltf, .glb), OBJ, FBX
**Loader:** Three.js GLTFLoader, OBJLoader

```typescript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const gltf = await loader.loadAsync('path/to/model.gltf');

// GLTF structure
gltf.scene      // THREE.Group - the loaded scene graph
gltf.scenes     // Array of scenes
gltf.cameras    // Array of cameras
gltf.animations // Array of animation clips
```

**Why GLTF?**
- Open standard (Khronos Group, makers of OpenGL)
- Supports PBR materials
- Includes animations, skins, morph targets
- Compact binary format (.glb)
- Industry standard (used by Google, Microsoft, Adobe)

**Model loading pitfalls:**
- Models can be huge (thousands of vertices, multiple textures)
- Need progress callbacks for loading screens
- May need to scale/rotate to match your coordinate system
- Textures are separate files that also need loading

#### Audio

**Formats:** MP3, WAV, OGG
**Loader:** Web Audio API

```typescript
const audioContext = new AudioContext();
const response = await fetch('path/to/sound.mp3');
const arrayBuffer = await response.arrayBuffer();
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
```

**Spatial 3D audio:**
```typescript
const listener = new THREE.AudioListener();
camera.add(listener);  // Listener follows camera

const sound = new THREE.PositionalAudio(listener);
sound.setBuffer(audioBuffer);
gameObject.add(sound);  // Sound comes from GameObject position
```

We'll implement audio properly in Chapter 16.

#### Scenes

**Format:** Custom JSON
**Loader:** Our SceneSerializer (from Chapter 4)

```json
{
  "name": "Level1",
  "gameObjects": [
    {
      "name": "Player",
      "transform": { "position": [0, 1, 0] },
      "components": [
        { "type": "MeshRenderer", "geometry": "box" },
        { "type": "PlayerController", "speed": 5.0 }
      ]
    }
  ]
}
```

Scene loading is special because it creates entire GameObject hierarchies with components.

#### Scripts

**Format:** TypeScript/JavaScript
**Loader:** Dynamic import()

```typescript
// Load a script module dynamically
const module = await import('./Scripts/PlayerController.ts');
const PlayerController = module.default;

// Create component instance
const component = new PlayerController();
```

This enables hot-reloading—edit a script and reload it without restarting the engine.

### Serialization Deep Dive

**Serialization** = Converting live objects in memory to a format that can be stored/transmitted (usually JSON or binary)

**Deserialization** = Reconstructing live objects from stored data

This is harder than it sounds because:

#### Challenge 1: Object References

```typescript
// In memory
const material = new Material();
const renderer1 = new MeshRenderer();
const renderer2 = new MeshRenderer();
renderer1.material = material;  // Both point to same object
renderer2.material = material;

// How to represent in JSON?
{
  "renderers": [
    { "material": "???" },  // How to reference shared material?
    { "material": "???" }
  ]
}
```

**Solution:** Use unique IDs
```json
{
  "materials": [
    { "id": "mat_001", "color": "#ff0000" }
  ],
  "renderers": [
    { "materialRef": "mat_001" },
    { "materialRef": "mat_001" }
  ]
}
```

#### Challenge 2: Circular References

```typescript
// GameObject has parent
gameObject.parent = parentObject;

// Parent has children array
parentObject.children = [gameObject];

// This creates a cycle: gameObject → parent → children → gameObject
```

**Solution:** Only serialize one direction (parent → children), reconstruct the other (children → parent) during deserialization.

#### Challenge 3: Functions and Behavior

```typescript
class MyComponent {
    public speed = 5;
    
    public update(dt: number) {
        this.transform.position.x += this.speed * dt;
    }
}
```

You can't serialize functions. You can only serialize:
- Numbers, strings, booleans
- Objects (as key-value pairs)
- Arrays

**Solution:** Store component **type** and **data**:
```json
{
  "type": "MyComponent",
  "data": { "speed": 5 }
}
```

Then during deserialization:
```typescript
const ComponentClass = getComponentClass(data.type);  // Look up class
const component = new ComponentClass();  // Create instance
component.deserialize(data.data);  // Restore data
```

The component's code (update function) comes from the source code, not the saved data.

#### Challenge 4: Three.js Objects

Three.js objects like Mesh, Material, Texture can't be directly serialized to JSON.

**Solution:** Store enough info to recreate them:
```json
{
  "type": "MeshRenderer",
  "geometryType": "box",
  "materialColor": "#00ff00"
}
```

Then during deserialization:
```typescript
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshPhongMaterial({ 
    color: data.materialColor 
});
const mesh = new THREE.Mesh(geometry, material);
```

**Our Serialization Strategy:**

1. **GameObjects** serialize to JSON with:
   - Name, tag, active state
   - Transform (position, rotation, scale)
   - List of components (type + data)
   - Children (recursive)

2. **Components** implement `serialize()` and `deserialize()`:
```typescript
interface ISerializable {
    serialize(): any;
    deserialize(data: any): void;
}
```

3. **References** use IDs and get resolved after deserialization

4. **Complex objects** (meshes, textures) store paths/metadata and get recreated

### The Project Workflow Loop

Let's walk through a complete user workflow to understand how all the pieces fit together:

#### Workflow: Creating a New Project

**User Action:** Clicks "New Project" button

**Engine Response:**
1. `FileSystemManager.openDirectory()` → Shows browser's folder picker
2. User chooses/creates folder "MyGame"
3. Engine has read/write permission to "MyGame"
4. `Project.create()` is called:
   ```typescript
   - Create folder structure (Assets/, Assets/Scenes/, etc.)
   - Create ProjectSettings.json
   - Create default scene (DefaultScene.json)
   - Add default scene to project.scenes map
   ```
5. ProjectPanel displays folder tree
6. Engine is ready for work

**Result on Disk:**
```
MyGame/
├── Assets/
│   ├── Scenes/
│   │   └── DefaultScene.json
│   ├── Prefabs/
│   ├── Textures/
│   ├── Models/
│   └── Scripts/
└── ProjectSettings.json
```

#### Workflow: Creating GameObjects

**User Action:** Clicks "Add Cube" button

**Engine Response:**
1. `GameObjectFactory.createCube()` creates GameObject
2. GameObject added to current scene
3. GameObject appears in Hierarchy panel
4. Scene is now "dirty" (has unsaved changes)

**In Memory:** GameObject exists, but not yet saved to disk

#### Workflow: Saving (Cmd/Ctrl+S)

**User Action:** Presses Cmd/Ctrl+S

**Engine Response:**
1. `Project.saveCurrentScene()` is called
2. `SceneSerializer.serialize(scene)` converts scene to JSON
3. `FileSystemManager.writeFile('Assets/Scenes/DefaultScene.json', json)` saves to disk
4. Scene is no longer "dirty"

**Result:** Changes are persisted. User can now close browser safely.

#### Workflow: Opening Existing Project

**User Action:** Clicks "Open Project", chooses "MyGame" folder

**Engine Response:**
1. `FileSystemManager.openDirectory()` gets permission
2. `Project.load()` is called:
   ```typescript
   - Read ProjectSettings.json
   - Parse scene list
   - Store project metadata
   ```
3. User can now select which scene to load
4. `Project.loadScene('Assets/Scenes/DefaultScene.json')`:
   ```typescript
   - Read JSON file
   - SceneSerializer.deserialize(json, scene)
   - Reconstruct GameObjects, components, hierarchy
   - Load any referenced assets
   ```
5. Scene appears in viewport exactly as it was saved

**Result:** Continuity. Work resumes where it left off.

This is the power of proper asset management and persistence.

---

## Implementation

Now let's build this system step by step. We'll implement:
1. File System Access API wrapper
2. Project class for project management
3. AssetManager for loading and caching
4. ProjectPanel UI for visual browsing
5. Integration into EditorUI
6. Keyboard shortcuts for save

### Step 0: Understanding Our Dependencies

Before we start coding, let's clarify what we're building on from Chapter 6:

**From Chapter 6 we have:**
- `ServiceLocator` for accessing engine services
- `Scene` and `SceneSerializer` for scene management
- `GameObject` with `serialize()` and `deserialize()` methods
- `Component` base class with serialization interface
- `EditorUI` managing hierarchy, inspector, and viewport panels

**What's new in Chapter 7:**
- File system integration
- Project structure
- Asset loading system
- Visual asset browser

Let's start building.

### Step 1: File System Manager (Browser ↔ Disk Bridge)

The `FileSystemManager` class wraps the File System Access API and provides a clean interface for reading/writing files.

**Why we need this class:**
- Abstracts away API complexity
- Handles permissions and errors
- Provides path-based file operations (like Node.js fs module)
- Will eventually support fallback for unsupported browsers

Create `src/core/FileSystemManager.ts`:

```typescript
/**
 * FileSystemManager - Wraps File System Access API for cross-browser compatibility.
 * 
 * Responsibilities:
 * - Request directory access from user
 * - Read/write files in the project directory
 * - Create directories recursively
 * - List directory contents
 * - Handle errors gracefully
 * 
 * Browser Support:
 * - Chrome/Edge 86+
 * - Opera 72+
 * - Safari: Not yet
 * - Firefox: Not yet
 * 
 * Future: Add fallback to download/upload for unsupported browsers
 */
export class FileSystemManager {
    // Root directory handle - represents the project folder
    private rootHandle: FileSystemDirectoryHandle | null = null;
    
    // Check if browser supports File System Access API
    private supportsFileSystem: boolean;

    constructor() {
        // Feature detection
        this.supportsFileSystem = 'showDirectoryPicker' in window;
        
        if (!this.supportsFileSystem) {
            console.warn('⚠️ File System Access API not supported in this browser.');
            console.warn('   Please use Chrome, Edge, or Opera for full functionality.');
        } else {
            console.log('✅ File System Access API supported');
        }
    }

    /**
     * Request access to a directory from the user.
     * Shows the browser's native folder picker dialog.
     * 
     * @returns true if access granted, false if cancelled/denied
     */
    public async openDirectory(): Promise<boolean> {
        if (!this.supportsFileSystem) {
            alert('File System Access API not supported in this browser.\nPlease use Chrome, Edge, or Opera.');
            return false;
        }

        try {
            // Show folder picker - this is the critical permission request
            this.rootHandle = await window.showDirectoryPicker({
                mode: 'readwrite'  // Request both read and write access
            });
            
            console.log(`📁 Opened directory: ${this.rootHandle.name}`);
            return true;
            
        } catch (error) {
            // User cancelled the picker (AbortError) - not really an error
            if ((error as any).name === 'AbortError') {
                console.log('Directory picker cancelled by user');
                return false;
            }
            
            // Some other error occurred
            console.error('Failed to open directory:', error);
            return false;
        }
    }

    /**
     * Check if we currently have access to a directory
     */
    public hasDirectory(): boolean {
        return this.rootHandle !== null;
    }

    /**
     * Get the root directory handle (for advanced use cases)
     */
    public getRootHandle(): FileSystemDirectoryHandle | null {
        return this.rootHandle;
    }

    /**
     * Get the project directory name
     */
    public getDirectoryName(): string {
        return this.rootHandle?.name || '';
    }

    /**
     * Read a file as text from the project directory.
     * 
     * @param path Path relative to project root, e.g. "Assets/Scenes/Main.json"
     * @returns File contents as string, or null if file doesn't exist/error
     */
    public async readFile(path: string): Promise<string | null> {
        if (!this.rootHandle) {
            console.warn('No directory open. Call openDirectory() first.');
            return null;
        }

        try {
            // Navigate to the file
            const fileHandle = await this.getFileHandle(path, false);
            if (!fileHandle) {
                console.warn(`File not found: ${path}`);
                return null;
            }

            // Read the file
            const file = await fileHandle.getFile();
            const text = await file.text();
            
            console.log(`📖 Read file: ${path} (${text.length} chars)`);
            return text;
            
        } catch (error) {
            console.error(`Failed to read file ${path}:`, error);
            return null;
        }
    }

    /**
     * Write text to a file in the project directory.
     * Creates the file if it doesn't exist, overwrites if it does.
     * 
     * @param path Path relative to project root
     * @param content String content to write
     * @returns true if successful, false if error
     */
    public async writeFile(path: string, content: string): Promise<boolean> {
        if (!this.rootHandle) {
            console.warn('No directory open. Call openDirectory() first.');
            return false;
        }

        try {
            // Navigate to the file (create if needed)
            const fileHandle = await this.getFileHandle(path, true);
            if (!fileHandle) {
                console.error(`Could not create file handle for: ${path}`);
                return false;
            }

            // Write the file
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            
            console.log(`💾 Wrote file: ${path} (${content.length} chars)`);
            return true;
            
        } catch (error) {
            console.error(`Failed to write file ${path}:`, error);
            return false;
        }
    }

    /**
     * Create a directory (and parent directories if needed).
     * Like `mkdir -p` in Unix.
     * 
     * @param path Path relative to project root, e.g. "Assets/Scenes/Level1"
     * @returns true if successful, false if error
     */
    public async createDirectory(path: string): Promise<boolean> {
        if (!this.rootHandle) {
            console.warn('No directory open');
            return false;
        }

        try {
            // Split path into parts: "Assets/Scenes" -> ["Assets", "Scenes"]
            const parts = path.split('/').filter(p => p.length > 0);
            
            // Navigate through each part, creating as needed
            let currentHandle = this.rootHandle;
            for (const part of parts) {
                currentHandle = await currentHandle.getDirectoryHandle(part, { 
                    create: true  // Create if doesn't exist
                });
            }

            console.log(`📁 Created directory: ${path}`);
            return true;
            
        } catch (error) {
            console.error(`Failed to create directory ${path}:`, error);
            return false;
        }
    }

    /**
     * Check if a file exists.
     * 
     * @param path Path relative to project root
     * @returns true if file exists, false otherwise
     */
    public async fileExists(path: string): Promise<boolean> {
        if (!this.rootHandle) return false;
        
        try {
            const handle = await this.getFileHandle(path, false);
            return handle !== null;
        } catch {
            return false;
        }
    }

    /**
     * Check if a directory exists.
     * 
     * @param path Path relative to project root
     * @returns true if directory exists, false otherwise
     */
    public async directoryExists(path: string): Promise<boolean> {
        if (!this.rootHandle) return false;
        
        try {
            await this.getDirectoryHandle(path, false);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * List all entries (files and directories) in a directory.
     * Non-recursive.
     * 
     * @param path Directory path relative to project root (empty string = root)
     * @returns Array of entry names
     */
    public async listDirectory(path: string = ''): Promise<string[]> {
        if (!this.rootHandle) return [];

        try {
            // Get the directory handle
            const dirHandle = path 
                ? await this.getDirectoryHandle(path, false)
                : this.rootHandle;
                
            if (!dirHandle) return [];

            // Iterate through entries
            const entries: string[] = [];
            for await (const entry of dirHandle.values()) {
                entries.push(entry.name);
            }

            return entries.sort();  // Alphabetical order
            
        } catch (error) {
            console.error(`Failed to list directory ${path}:`, error);
            return [];
        }
    }

    /**
     * Delete a file.
     * 
     * @param path Path relative to project root
     * @returns true if successful, false if error
     */
    public async deleteFile(path: string): Promise<boolean> {
        if (!this.rootHandle) return false;

        try {
            const parts = path.split('/').filter(p => p);
            const fileName = parts.pop()!;
            
            // Navigate to parent directory
            let dirHandle = this.rootHandle;
            for (const part of parts) {
                dirHandle = await dirHandle.getDirectoryHandle(part);
            }

            // Remove the file
            await dirHandle.removeEntry(fileName);
            console.log(`🗑️ Deleted file: ${path}`);
            return true;
            
        } catch (error) {
            console.error(`Failed to delete file ${path}:`, error);
            return false;
        }
    }

    // ===== PRIVATE HELPER METHODS =====

    /**
     * Navigate to a file handle from a path.
     * Helper method used internally.
     * 
     * @param path Path like "Assets/Scenes/Main.json"
     * @param create Whether to create the file if it doesn't exist
     * @returns FileSystemFileHandle or null
     */
    private async getFileHandle(
        path: string, 
        create: boolean
    ): Promise<FileSystemFileHandle | null> {
        if (!this.rootHandle) return null;

        try {
            // Split path: "Assets/Scenes/Main.json" -> ["Assets", "Scenes"], "Main.json"
            const parts = path.split('/').filter(p => p.length > 0);
            const fileName = parts.pop()!;
            
            // Navigate to parent directory
            let dirHandle = this.rootHandle;
            for (const part of parts) {
                dirHandle = await dirHandle.getDirectoryHandle(part, { 
                    create: create  // Create parent dirs if needed
                });
            }

            // Get file handle
            return await dirHandle.getFileHandle(fileName, { create });
            
        } catch (error) {
            if (create) {
                console.error(`Failed to get/create file handle for ${path}:`, error);
            }
            return null;
        }
    }

    /**
     * Navigate to a directory handle from a path.
     * Helper method used internally.
     * 
     * @param path Path like "Assets/Scenes"
     * @param create Whether to create the directory if it doesn't exist
     * @returns FileSystemDirectoryHandle or null
     */
    private async getDirectoryHandle(
        path: string,
        create: boolean
    ): Promise<FileSystemDirectoryHandle | null> {
        if (!this.rootHandle) return null;

        try {
            const parts = path.split('/').filter(p => p.length > 0);
            let dirHandle = this.rootHandle;

            for (const part of parts) {
                dirHandle = await dirHandle.getDirectoryHandle(part, { create });
            }

            return dirHandle;
            
        } catch (error) {
            if (create) {
                console.error(`Failed to get/create directory handle for ${path}:`, error);
            }
            return null;
        }
    }
}
```

**Key Design Decisions:**

1. **Path-based API**: Users specify "Assets/Scenes/Main.json" instead of navigating handles manually
2. **Automatic directory creation**: Writing to "Assets/New/file.json" creates "Assets/New/" automatically
3. **Error handling**: Returns null/false instead of throwing, with console logging for debugging
4. **Async throughout**: All file operations are async (matches web platform APIs)

### Step 2: Project Class (Project State and Persistence)

The `Project` class represents a game project and manages its lifecycle.

**Responsibilities:**
- Create project folder structure
- Load/save project settings
- Track scenes in the project
- Save/load individual scenes
- Coordinate with FileSystemManager for disk operations

Create `src/core/Project.ts`:

```typescript
import { Scene } from './Scene';
import { FileSystemManager } from './FileSystemManager';
import { SceneSerializer } from './SceneSerializer';

/**
 * Project - Represents a complete game project.
 * 
 * A project consists of:
 * - A root directory on disk
 * - ProjectSettings.json (project metadata)
 * - Assets/ folder with scenes, textures, models, etc.
 * - The currently active scene
 * 
 * Lifecycle:
 * 1. create() - Initialize new project structure
 * 2. load() - Load existing project from disk
 * 3. save() - Save project state to disk
 * 4. close() - Clean up resources
 */
export class Project {
    public name: string;
    
    // Map of scene name to file path
    // e.g. "MainScene" -> "Assets/Scenes/MainScene.json"
    public scenes: Map<string, string> = new Map();
    
    // The currently active scene being edited
    public currentScene: Scene | null = null;
    
    // Current scene's file path
    private currentScenePath: string = '';
    
    // File system interface
    private fileSystem: FileSystemManager;
    
    // Project metadata
    public version: string = '1.0.0';
    public engineVersion: string = '0.7.0';
    public created: Date = new Date();
    public modified: Date = new Date();

    constructor(name: string, fileSystem: FileSystemManager) {
        this.name = name;
        this.fileSystem = fileSystem;
    }

    /**
     * Create a new project structure on disk.
     * 
     * Creates:
     * - Assets/Scenes/
     * - Assets/Prefabs/
     * - Assets/Textures/
     * - Assets/Models/
     * - Assets/Scripts/
     * - ProjectSettings.json
     * - DefaultScene.json
     */
    public async create(): Promise<boolean> {
        console.log(`Creating new project: ${this.name}`);

        // Create standard folder structure
        const folders = [
            'Assets',
            'Assets/Scenes',
            'Assets/Prefabs',
            'Assets/Textures',
            'Assets/Models',
            'Assets/Scripts'
        ];

        for (const folder of folders) {
            const success = await this.fileSystem.createDirectory(folder);
            if (!success) {
                console.error(`Failed to create folder: ${folder}`);
                return false;
            }
        }

        // Create a default scene
        const defaultScene = new Scene('DefaultScene');
        const scenePath = 'Assets/Scenes/DefaultScene.json';
        
        const saved = await this.saveScene(defaultScene, scenePath);
        if (!saved) {
            console.error('Failed to create default scene');
            return false;
        }

        // Register the default scene
        this.scenes.set('DefaultScene', scenePath);
        this.currentScene = defaultScene;
        this.currentScenePath = scenePath;

        // Save project settings
        const settingsSaved = await this.saveProjectSettings();
        if (!settingsSaved) {
            console.error('Failed to save project settings');
            return false;
        }

        console.log(`✅ Project created successfully`);
        console.log(`   Directory: ${this.fileSystem.getDirectoryName()}`);
        console.log(`   Scenes: ${this.scenes.size}`);
        
        return true;
    }

    /**
     * Load an existing project from disk.
     * Reads ProjectSettings.json and reconstructs project state.
     */
    public async load(): Promise<boolean> {
        console.log('Loading project...');

        // Read project settings
        const settingsJson = await this.fileSystem.readFile('ProjectSettings.json');
        if (!settingsJson) {
            console.error('ProjectSettings.json not found');
            console.error('This directory does not appear to be a valid project.');
            return false;
        }

        // Parse settings
        try {
            const settings = JSON.parse(settingsJson);
            
            this.name = settings.name || 'Unnamed Project';
            this.version = settings.version || '1.0.0';
            this.engineVersion = settings.engineVersion || '0.7.0';
            this.created = new Date(settings.created || Date.now());
            this.modified = new Date(settings.modified || Date.now());
            
            // Reconstruct scenes map
            this.scenes.clear();
            if (settings.scenes) {
                for (const [name, path] of Object.entries(settings.scenes)) {
                    this.scenes.set(name, path as string);
                }
            }

            console.log(`✅ Project loaded successfully`);
            console.log(`   Name: ${this.name}`);
            console.log(`   Version: ${this.version}`);
            console.log(`   Scenes: ${this.scenes.size}`);
            
            return true;
            
        } catch (error) {
            console.error('Failed to parse ProjectSettings.json:', error);
            return false;
        }
    }

    /**
     * Save project settings to ProjectSettings.json
     */
    public async saveProjectSettings(): Promise<boolean> {
        this.modified = new Date();

        const settings = {
            name: this.name,
            version: this.version,
            engineVersion: this.engineVersion,
            created: this.created.toISOString(),
            modified: this.modified.toISOString(),
            scenes: Object.fromEntries(this.scenes)  // Convert Map to object
        };

        const json = JSON.stringify(settings, null, 2);  // Pretty print with 2-space indent
        return await this.fileSystem.writeFile('ProjectSettings.json', json);
    }

    /**
     * Save a scene to disk.
     * 
     * @param scene The scene to save
     * @param filepath Path relative to project root, e.g. "Assets/Scenes/Level1.json"
     */
    public async saveScene(scene: Scene, filepath: string): Promise<boolean> {
        console.log(`Saving scene: ${scene.name} to ${filepath}`);

        // Serialize scene to JSON
        const json = SceneSerializer.serialize(scene);
        
        // Write to disk
        const success = await this.fileSystem.writeFile(filepath, json);
        
        if (success) {
            console.log(`✅ Scene saved: ${scene.name}`);
        }
        
        return success;
    }

    /**
     * Load a scene from disk.
     * 
     * @param filepath Path relative to project root
     * @returns Loaded scene, or null if failed
     */
    public async loadScene(filepath: string): Promise<Scene | null> {
        console.log(`Loading scene from: ${filepath}`);

        // Read file
        const json = await this.fileSystem.readFile(filepath);
        if (!json) {
            console.error(`Failed to read scene file: ${filepath}`);
            return null;
        }

        // Deserialize
        try {
            const scene = new Scene('LoadedScene');
            SceneSerializer.deserialize(json, scene);
            
            console.log(`✅ Scene loaded: ${scene.name}`);
            console.log(`   GameObjects: ${scene.getAllGameObjects().length}`);
            
            return scene;
            
        } catch (error) {
            console.error(`Failed to deserialize scene:`, error);
            return null;
        }
    }

    /**
     * Save the currently active scene.
     * This is what gets called when the user presses Cmd/Ctrl+S.
     */
    public async saveCurrentScene(): Promise<boolean> {
        if (!this.currentScene) {
            console.warn('No current scene to save');
            return false;
        }

        if (!this.currentScenePath) {
            console.error('Current scene has no file path');
            return false;
        }

        return await this.saveScene(this.currentScene, this.currentScenePath);
    }

    /**
     * Set the current scene being edited.
     * 
     * @param scene The scene to make active
     * @param filepath The scene's file path
     */
    public setCurrentScene(scene: Scene, filepath: string): void {
        this.currentScene = scene;
        this.currentScenePath = filepath;
        
        // Register scene if not already registered
        if (!this.scenes.has(scene.name)) {
            this.scenes.set(scene.name, filepath);
        }
    }

    /**
     * Create a new scene in the project.
     * 
     * @param name Scene name
     * @returns The created scene
     */
    public async createNewScene(name: string): Promise<Scene | null> {
        const scenePath = `Assets/Scenes/${name}.json`;
        
        // Check if scene already exists
        const exists = await this.fileSystem.fileExists(scenePath);
        if (exists) {
            console.error(`Scene already exists: ${name}`);
            return null;
        }

        // Create new scene
        const scene = new Scene(name);
        
        // Save to disk
        const saved = await this.saveScene(scene, scenePath);
        if (!saved) {
            console.error(`Failed to save new scene: ${name}`);
            return null;
        }

        // Register scene
        this.scenes.set(name, scenePath);
        
        // Save project settings to include new scene
        await this.saveProjectSettings();
        
        console.log(`✅ Created new scene: ${name}`);
        return scene;
    }

    /**
     * Get list of all scene names in the project.
     */
    public getSceneNames(): string[] {
        return Array.from(this.scenes.keys()).sort();
    }

    /**
     * Get the file path for a scene by name.
     */
    public getScenePath(name: string): string | null {
        return this.scenes.get(name) || null;
    }

    /**
     * Close the project and clean up.
     */
    public close(): void {
        this.currentScene = null;
        this.currentScenePath = '';
        this.scenes.clear();
        
        console.log('Project closed');
    }
}
```

**Key Design Decisions:**

1. **Scenes Map**: Stores scene name → file path mapping for quick lookup
2. **Current Scene Tracking**: Knows which scene is being edited for quick save
3. **Automatic Registration**: New scenes automatically added to ProjectSettings.json
4. **Path Conventions**: All paths relative to project root, scenes in Assets/Scenes/

### Step 3: Asset Manager (Loading and Caching)

The `AssetManager` handles loading, caching, and managing all game assets.

**Core Concepts:**
- **Caching**: Load once, return cached copy on subsequent requests
- **Reference Counting**: Track how many objects use each asset
- **Async Loading**: Non-blocking asset loading with progress
- **Automatic Cleanup**: Unload assets when refCount reaches 0

Create `src/core/AssetManager.ts`:

```typescript
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Asset types supported by the engine
 */
export type AssetType = 'texture' | 'model' | 'audio' | 'scene' | 'script';

/**
 * Asset metadata and loaded data
 */
export interface Asset {
    id: string;           // Unique identifier (usually the path)
    name: string;         // Display name
    type: AssetType;      // Asset type
    path: string;         // File path
    data: any;           // The loaded asset (Texture, GLTF, etc.)
    refCount: number;    // How many things reference this asset
    size?: number;       // File size in bytes (if known)
}

/**
 * AssetManager - Central hub for loading, caching, and managing all game assets.
 * 
 * Features:
 * - Async loading with caching
 * - Reference counting for automatic cleanup
 * - Support for textures, models, audio, scenes
 * - Progress tracking for loading screens
 * - Memory management
 * 
 * Usage:
 * ```typescript
 * const texture = await assetManager.loadTexture('Assets/Textures/player.png');
 * // Use texture...
 * assetManager.release('Assets/Textures/player.png');  // When done
 * ```
 */
export class AssetManager {
    // Asset cache: path -> Asset
    private assets: Map<string, Asset> = new Map();
    
    // Three.js loaders
    private textureLoader: THREE.TextureLoader;
    private gltfLoader: GLTFLoader;
    
    // Loading progress tracking
    private loadingCount: number = 0;
    private totalToLoad: number = 0;
    
    // Callbacks for loading progress
    public onLoadStart?: () => void;
    public onLoadProgress?: (loaded: number, total: number) => void;
    public onLoadComplete?: () => void;

    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = new GLTFLoader();
        
        console.log('📦 AssetManager initialized');
    }

    // ===== TEXTURE LOADING =====

    /**
     * Load a texture from file.
     * Returns cached version if already loaded.
     * 
     * @param path Path to texture file (relative to project root or absolute URL)
     * @param name Optional display name (defaults to filename)
     * @returns Loaded texture, or null if failed
     */
    public async loadTexture(path: string, name?: string): Promise<THREE.Texture | null> {
        // Check cache first
        const cached = this.assets.get(path);
        if (cached && cached.type === 'texture') {
            cached.refCount++;
            console.log(`📦 Texture from cache: ${cached.name} (refs: ${cached.refCount})`);
            return cached.data as THREE.Texture;
        }

        // Load from disk
        try {
            this.startLoading();
            
            const texture = await this.textureLoader.loadAsync(path);
            
            // Configure texture (sensible defaults)
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = true;
            
            // Create asset entry
            const asset: Asset = {
                id: path,
                name: name || this.getFileNameFromPath(path),
                type: 'texture',
                path,
                data: texture,
                refCount: 1
            };

            this.assets.set(path, asset);
            this.finishLoading();
            
            console.log(`✅ Loaded texture: ${asset.name}`);
            return texture;
            
        } catch (error) {
            this.finishLoading();
            console.error(`Failed to load texture ${path}:`, error);
            return null;
        }
    }

    // ===== MODEL LOADING =====

    /**
     * Load a 3D model (GLTF/GLB format).
     * Returns a clone of cached model if already loaded.
     * 
     * @param path Path to model file
     * @param name Optional display name
     * @returns Loaded model scene graph, or null if failed
     */
    public async loadModel(path: string, name?: string): Promise<THREE.Group | null> {
        // Check cache
        const cached = this.assets.get(path);
        if (cached && cached.type === 'model') {
            cached.refCount++;
            console.log(`📦 Model from cache: ${cached.name} (refs: ${cached.refCount})`);
            // Return a CLONE so each usage can be modified independently
            return cached.data.scene.clone() as THREE.Group;
        }

        // Load from disk
        try {
            this.startLoading();
            
            const gltf = await this.gltfLoader.loadAsync(path);
            
            // Create asset entry (store full GLTF, not just scene)
            const asset: Asset = {
                id: path,
                name: name || this.getFileNameFromPath(path),
                type: 'model',
                path,
                data: gltf,  // Store entire GLTF object (includes animations, cameras, etc.)
                refCount: 1
            };

            this.assets.set(path, asset);
            this.finishLoading();
            
            console.log(`✅ Loaded model: ${asset.name}`);
            console.log(`   Meshes: ${this.countMeshes(gltf.scene)}`);
            console.log(`   Animations: ${gltf.animations.length}`);
            
            // Return a clone
            return gltf.scene.clone() as THREE.Group;
            
        } catch (error) {
            this.finishLoading();
            console.error(`Failed to load model ${path}:`, error);
            return null;
        }
    }

    // ===== BATCH LOADING =====

    /**
     * Load multiple assets in parallel.
     * Useful for loading screens.
     * 
     * @param paths Array of asset paths to load
     * @returns Map of path -> loaded asset
     */
    public async loadBatch(paths: string[]): Promise<Map<string, any>> {
        console.log(`Loading batch of ${paths.length} assets...`);
        
        this.totalToLoad = paths.length;
        this.loadingCount = 0;
        
        if (this.onLoadStart) {
            this.onLoadStart();
        }

        // Load all in parallel
        const promises = paths.map(async (path) => {
            const ext = this.getFileExtension(path);
            
            let asset = null;
            if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
                asset = await this.loadTexture(path);
            } else if (['.gltf', '.glb'].includes(ext)) {
                asset = await this.loadModel(path);
            }
            
            return [path, asset] as [string, any];
        });

        const results = await Promise.all(promises);
        
        if (this.onLoadComplete) {
            this.onLoadComplete();
        }

        return new Map(results);
    }

    // ===== REFERENCE COUNTING =====

    /**
     * Release a reference to an asset.
     * Decrements reference count. When count reaches 0, asset is unloaded.
     * 
     * @param path Asset path
     */
    public release(path: string): void {
        const asset = this.assets.get(path);
        if (!asset) {
            console.warn(`Attempted to release unknown asset: ${path}`);
            return;
        }

        asset.refCount--;
        console.log(`Released ${asset.name} (refs: ${asset.refCount})`);

        if (asset.refCount <= 0) {
            this.unload(path);
        }
    }

    /**
     * Unload an asset from memory immediately.
     * Frees GPU memory and removes from cache.
     * 
     * @param path Asset path
     */
    private unload(path: string): void {
        const asset = this.assets.get(path);
        if (!asset) return;

        // Dispose based on type
        switch (asset.type) {
            case 'texture':
                (asset.data as THREE.Texture).dispose();
                break;
            case 'model':
                // Dispose all geometries and materials in the model
                const gltf = asset.data;
                gltf.scene.traverse((object: any) => {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach((mat: THREE.Material) => mat.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
                break;
        }

        this.assets.delete(path);
        console.log(`🗑️ Unloaded asset: ${asset.name}`);
    }

    // ===== QUERIES =====

    /**
     * Get all loaded assets
     */
    public getAllAssets(): Asset[] {
        return Array.from(this.assets.values());
    }

    /**
     * Get assets of a specific type
     */
    public getAssetsByType(type: AssetType): Asset[] {
        return this.getAllAssets().filter(asset => asset.type === type);
    }

    /**
     * Get an asset by path (if loaded)
     */
    public getAsset(path: string): Asset | null {
        return this.assets.get(path) || null;
    }

    /**
     * Check if an asset is loaded
     */
    public isLoaded(path: string): boolean {
        return this.assets.has(path);
    }

    /**
     * Get total number of loaded assets
     */
    public getLoadedCount(): number {
        return this.assets.size;
    }

    /**
     * Get total memory usage (approximate, in MB)
     */
    public getMemoryUsage(): number {
        let totalBytes = 0;

        for (const asset of this.assets.values()) {
            if (asset.type === 'texture') {
                const tex = asset.data as THREE.Texture;
                if (tex.image) {
                    // RGBA = 4 bytes per pixel
                    totalBytes += tex.image.width * tex.image.height * 4;
                    // Add mipmaps (~33% more)
                    totalBytes *= 1.33;
                }
            }
            // Models are harder to estimate, skip for now
        }

        return totalBytes / (1024 * 1024);  // Convert to MB
    }

    // ===== CLEANUP =====

    /**
     * Unload all assets and clear cache.
     * Call when closing a project or scene.
     */
    public clearAll(): void {
        console.log(`Clearing all assets (${this.assets.size} total)...`);

        // Dispose all
        for (const [path, asset] of this.assets) {
            // Don't call this.unload() because it would modify the map during iteration
            switch (asset.type) {
                case 'texture':
                    (asset.data as THREE.Texture).dispose();
                    break;
                case 'model':
                    const gltf = asset.data;
                    gltf.scene.traverse((object: any) => {
                        if (object.geometry) object.geometry.dispose();
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach((m: THREE.Material) => m.dispose());
                            } else {
                                object.material.dispose();
                            }
                        }
                    });
                    break;
            }
        }

        this.assets.clear();
        console.log('✅ All assets cleared');
    }

    // ===== PRIVATE HELPERS =====

    private startLoading(): void {
        this.loadingCount++;
        if (this.onLoadProgress) {
            this.onLoadProgress(this.loadingCount, this.totalToLoad);
        }
    }

    private finishLoading(): void {
        // Progress callback handled in batch loading
    }

    private getFileNameFromPath(path: string): string {
        const parts = path.split('/');
        return parts[parts.length - 1];
    }

    private getFileExtension(path: string): string {
        const match = path.match(/\.[^.]+$/);
        return match ? match[0].toLowerCase() : '';
    }

    private countMeshes(object: THREE.Object3D): number {
        let count = 0;
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                count++;
            }
        });
        return count;
    }
}
```

**Key Design Decisions:**

1. **Clone on Return**: Models are cloned so each instance can be modified independently
2. **Automatic Disposal**: Three.js resources properly disposed when unloaded
3. **Progress Tracking**: Callbacks for loading screens
4. **Type Safety**: Asset interface ensures type-safe access
5. **Memory Estimation**: Approximate memory usage for debugging

### Step 4: Project Panel UI (Visual Asset Browser)

Now we build the UI component that displays the project's asset structure. This is equivalent to Unity's Project window or Unreal's Content Browser.

**What the ProjectPanel does:**
- Shows project name and folder structure
- Displays loaded assets as cards with icons/thumbnails
- Allows clicking assets to select them
- Shows asset metadata (type, size, references)
- Provides refresh button to rescan assets

**Design Philosophy:**

Most game engines have a two-pane asset browser:
- **Left pane**: Folder tree (Assets/Scenes/, Assets/Textures/, etc.)
- **Right pane**: Asset grid showing contents of selected folder

We'll implement a simplified version that shows:
- Folder tree (non-interactive for now, visual only)
- Asset grid showing all currently loaded assets

Future enhancements (Chapter 19+):
- Clickable folder tree
- Folder filtering
- Asset thumbnails (actual previews, not just icons)
- Asset context menu (rename, delete, duplicate)
- Drag-and-drop to viewport

Create `src/editor/ProjectPanel.ts`:

```typescript
import type { EditorUI } from './EditorUI';
import type { Project } from '../core/Project';
import type { AssetManager, Asset } from '../core/AssetManager';

/**
 * ProjectPanel - Visual asset browser showing project structure and loaded assets.
 * 
 * Layout:
 * ┌─────────────────────────────────┐
 * │ Project Name           [Refresh]│
 * ├─────────────────────────────────┤
 * │ Folder Tree                     │
 * │ 📁 Assets                       │
 * │   📄 Scenes                     │
 * │   📄 Textures                   │
 * │   📄 Models                     │
 * ├─────────────────────────────────┤
 * │ Asset Grid                      │
 * │ ┌────┐ ┌────┐ ┌────┐          │
 * │ │ 🖼️ │ │ 📦 │ │ 🎬 │          │
 * │ └────┘ └────┘ └────┘          │
 * └─────────────────────────────────┘
 * 
 * Responsibilities:
 * - Display project folder structure
 * - Show all loaded assets as cards
 * - Allow asset selection
 * - Show asset metadata
 * - Refresh asset list on demand
 */
export class ProjectPanel {
    private editorUI: EditorUI;
    private contentElement: HTMLElement;
    private project: Project | null = null;
    private assetManager: AssetManager;
    
    // Selected asset (for future features like preview)
    private selectedAsset: Asset | null = null;

    constructor(editorUI: EditorUI, assetManager: AssetManager) {
        this.editorUI = editorUI;
        this.assetManager = assetManager;
        
        // Create the panel's content element
        this.contentElement = document.createElement('div');
        this.contentElement.id = 'project-panel-content';
        this.contentElement.className = 'panel-content';
        this.contentElement.style.overflow = 'auto';

        console.log('📁 ProjectPanel initialized');
    }

    /**
     * Set the current project to display.
     * Called when a project is opened/created.
     */
    public setProject(project: Project | null): void {
        this.project = project;
        this.refresh();
    }

    /**
     * Refresh the entire panel.
     * Rebuilds folder tree and asset grid.
     */
    public refresh(): void {
        this.contentElement.innerHTML = '';

        if (!this.project) {
            // No project open - show empty state
            this.contentElement.innerHTML = `
                <div class="empty-state">
                    <p>No project open</p>
                    <p style="font-size: 11px; color: #666; margin-top: 8px;">
                        Click "New Project" or "Open Project" to get started
                    </p>
                </div>
            `;
            return;
        }

        // Build the UI
        this.renderHeader();
        this.renderFolderTree();
        this.renderAssetGrid();
    }

    /**
     * Render the project header with name and controls
     */
    private renderHeader(): void {
        const header = document.createElement('div');
        header.className = 'project-header';
        
        // Project name
        const nameElement = document.createElement('h3');
        nameElement.textContent = this.project!.name;
        nameElement.style.margin = '0';
        nameElement.style.fontSize = '13px';
        nameElement.style.fontWeight = '600';
        
        // Refresh button
        const refreshButton = document.createElement('button');
        refreshButton.className = 'btn btn-sm';
        refreshButton.innerHTML = '🔄';
        refreshButton.title = 'Refresh assets';
        refreshButton.addEventListener('click', () => {
            console.log('Refreshing assets...');
            this.refresh();
        });
        
        header.appendChild(nameElement);
        header.appendChild(refreshButton);
        this.contentElement.appendChild(header);
    }

    /**
     * Render the folder tree showing project structure.
     * Currently visual only - not interactive.
     */
    private renderFolderTree(): void {
        const treeContainer = document.createElement('div');
        treeContainer.className = 'folder-tree';

        // Standard Unity-like folder structure
        const folders = [
            { name: 'Assets', icon: '📁', indent: 0 },
            { name: 'Scenes', icon: '🎬', indent: 1 },
            { name: 'Prefabs', icon: '📦', indent: 1 },
            { name: 'Textures', icon: '🖼️', indent: 1 },
            { name: 'Models', icon: '🗿', indent: 1 },
            { name: 'Scripts', icon: '📝', indent: 1 }
        ];

        folders.forEach(folder => {
            const item = document.createElement('div');
            item.className = 'folder-item';
            item.style.paddingLeft = `${8 + folder.indent * 16}px`;
            
            // Add icon and name
            item.innerHTML = `
                <span style="margin-right: 6px;">${folder.icon}</span>
                <span>${folder.name}</span>
            `;
            
            // Hover effect
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#2a2d2e';
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
            
            // Click handler (future: filter assets by folder)
            item.addEventListener('click', () => {
                console.log(`Clicked folder: ${folder.name}`);
                // TODO: Filter assets by folder
            });
            
            treeContainer.appendChild(item);
        });

        this.contentElement.appendChild(treeContainer);
    }

    /**
     * Render the asset grid showing all loaded assets.
     */
    private renderAssetGrid(): void {
        const gridContainer = document.createElement('div');
        gridContainer.className = 'asset-grid';

        const assets = this.assetManager.getAllAssets();

        if (assets.length === 0) {
            // No assets loaded
            gridContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <p>No assets loaded</p>
                    <p style="font-size: 11px; color: #666; margin-top: 8px;">
                        Assets will appear here as you use them in your scene
                    </p>
                </div>
            `;
        } else {
            // Show each asset as a card
            assets.forEach(asset => {
                const card = this.createAssetCard(asset);
                gridContainer.appendChild(card);
            });
            
            // Show summary
            const summary = document.createElement('div');
            summary.className = 'asset-summary';
            summary.innerHTML = `
                <span>${assets.length} asset${assets.length !== 1 ? 's' : ''} loaded</span>
                <span style="margin-left: 12px; color: #666;">
                    ~${this.assetManager.getMemoryUsage().toFixed(1)} MB
                </span>
            `;
            gridContainer.appendChild(summary);
        }

        this.contentElement.appendChild(gridContainer);
    }

    /**
     * Create a card element for an asset.
     * Shows icon, name, type, and reference count.
     */
    private createAssetCard(asset: Asset): HTMLElement {
        const card = document.createElement('div');
        card.className = 'asset-card';
        
        // Highlight if selected
        if (this.selectedAsset === asset) {
            card.classList.add('selected');
        }

        // Asset icon/thumbnail
        const thumbnail = document.createElement('div');
        thumbnail.className = 'asset-thumbnail';
        thumbnail.textContent = this.getAssetIcon(asset.type);
        
        // Asset name (truncated if too long)
        const name = document.createElement('div');
        name.className = 'asset-name';
        name.textContent = asset.name;
        name.title = asset.name;  // Full name on hover
        
        // Asset type badge
        const type = document.createElement('div');
        type.className = 'asset-type';
        type.textContent = asset.type;
        
        // Reference count badge (how many things use this asset)
        const refCount = document.createElement('div');
        refCount.className = 'asset-refs';
        refCount.textContent = `${asset.refCount} ref${asset.refCount !== 1 ? 's' : ''}`;
        refCount.title = `${asset.refCount} object${asset.refCount !== 1 ? 's' : ''} using this asset`;

        card.appendChild(thumbnail);
        card.appendChild(name);
        card.appendChild(type);
        card.appendChild(refCount);

        // Click to select
        card.addEventListener('click', () => {
            this.selectAsset(asset);
        });
        
        // Double-click to focus (future: open in inspector/preview)
        card.addEventListener('dblclick', () => {
            console.log(`Double-clicked asset: ${asset.name}`);
            // TODO: Show asset preview or inspector
        });

        return card;
    }

    /**
     * Select an asset in the panel.
     * Currently just visual feedback, but will enable preview/inspector in future.
     */
    private selectAsset(asset: Asset): void {
        this.selectedAsset = asset;
        
        console.log(`Selected asset: ${asset.name}`);
        console.log(`  Type: ${asset.type}`);
        console.log(`  Path: ${asset.path}`);
        console.log(`  References: ${asset.refCount}`);
        
        // Refresh to update selection styling
        this.refresh();
    }

    /**
     * Get emoji icon for asset type.
     * Eventually will be replaced with actual thumbnails.
     */
    private getAssetIcon(type: string): string {
        const icons: Record<string, string> = {
            texture: '🖼️',
            model: '📦',
            audio: '🔊',
            scene: '🎬',
            script: '📝'
        };
        return icons[type] || '📄';
    }

    /**
     * Get the panel's DOM element for mounting in UI
     */
    public getElement(): HTMLElement {
        return this.contentElement;
    }

    /**
     * Get currently selected asset (for future features)
     */
    public getSelectedAsset(): Asset | null {
        return this.selectedAsset;
    }
}
```

**Key Design Decisions:**

1. **Separation of Concerns**: ProjectPanel only handles display, not loading logic
2. **Asset Cards**: Grid layout with cards showing icon, name, type, ref count
3. **Empty States**: Helpful messages when no project or no assets
4. **Selection Tracking**: Prepares for future asset preview/inspector
5. **Memory Display**: Shows approximate memory usage for debugging

### Step 5: EditorUI Integration (Connecting the Pieces)

Now we integrate the project system into the main editor UI. This involves:
1. Adding FileSystemManager and AssetManager to EditorUI
2. Creating ProjectPanel instance
3. Handling project open/new/save actions
4. Implementing Cmd/Ctrl+S keyboard shortcut
5. Updating scene management to work with projects

Modify `src/editor/EditorUI.ts`:

```typescript
// Add new imports at the top
import { ProjectPanel } from './ProjectPanel';
import { Project } from '../core/Project';
import { AssetManager } from '../core/AssetManager';
import { FileSystemManager } from '../core/FileSystemManager';

export class EditorUI {
    private engine: Engine;
    private hierarchyPanel: HierarchyPanel;
    private inspectorPanel: InspectorPanel;
    private viewportSelector: ViewportSelector;
    private editorCameraController: EditorCameraController;
    private editorGrid: EditorGrid;
    private cameraGizmo: CameraGizmo | null = null;
    private cameraPreview: CameraPreview;
    private viewportGizmo: ViewportGizmo;
    
    // NEW: Project system components
    private projectPanel: ProjectPanel;
    private project: Project | null = null;
    private fileSystem: FileSystemManager;
    private assetManager: AssetManager;

    // Toolbar buttons
    private playButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private addCubeButton: HTMLButtonElement;
    private addSphereButton: HTMLButtonElement;
    private addEmptyButton: HTMLButtonElement;
    private addPlayerButton: HTMLButtonElement;
    private saveButton: HTMLButtonElement;
    private loadButton: HTMLButtonElement;
    private modeElement: HTMLElement;
    
    // NEW: Project buttons
    private openProjectButton: HTMLButtonElement;
    private newProjectButton: HTMLButtonElement;

    private selectedObjectId: string | null = null;

    constructor(engine: Engine) {
        this.engine = engine;

        // Get UI elements
        this.playButton = document.getElementById('play-btn') as HTMLButtonElement;
        this.stopButton = document.getElementById('stop-btn') as HTMLButtonElement;
        this.addCubeButton = document.getElementById('add-cube-btn') as HTMLButtonElement;
        this.addSphereButton = document.getElementById('add-sphere-btn') as HTMLButtonElement;
        this.addEmptyButton = document.getElementById('add-empty-btn') as HTMLButtonElement;
        this.addPlayerButton = document.getElementById('add-player-btn') as HTMLButtonElement;
        this.saveButton = document.getElementById('save-btn') as HTMLButtonElement;
        this.loadButton = document.getElementById('load-btn') as HTMLButtonElement;
        this.modeElement = document.getElementById('mode') as HTMLElement;
        
        // NEW: Get project buttons
        this.openProjectButton = document.getElementById('open-project-btn') as HTMLButtonElement;
        this.newProjectButton = document.getElementById('new-project-btn') as HTMLButtonElement;

        this.hierarchyPanel = new HierarchyPanel(this);
        this.inspectorPanel = new InspectorPanel(this);

        // Create ViewportSelector for click-to-select
        this.viewportSelector = new ViewportSelector(engine, this);

        // Create editor camera controller
        this.editorCameraController = new EditorCameraController(engine);
        engine.setEditorCamera(this.editorCameraController);

        // Create and add editor grid
        this.editorGrid = new EditorGrid();
        const scene = engine.getScene();
        if (scene) {
            this.editorGrid.addToScene(scene.getThreeScene());
        }

        // Create camera gizmo
        if (scene) {
            this.cameraGizmo = new CameraGizmo(scene.getThreeScene());
        }

        // Create camera preview
        this.cameraPreview = new CameraPreview();

        // Create viewport gizmo
        this.viewportGizmo = new ViewportGizmo();

        // Add gizmo to scene
        if (scene) {
            scene.getThreeScene().add(this.viewportGizmo.getObject3D());
        }

        // Setup gizmo click callback to align camera
        this.viewportGizmo.onAlign((direction, viewName) => {
            this.editorCameraController.alignToView(direction, viewName);
        });

        // NEW: Initialize file system and asset manager
        this.fileSystem = new FileSystemManager();
        this.assetManager = new AssetManager();

        // NEW: Create project panel
        this.projectPanel = new ProjectPanel(this, this.assetManager);

        // NEW: Add project panel to UI
        this.addProjectPanelToUI();

        this.setupEventListeners();
        
        // NEW: Setup keyboard shortcuts (including Cmd/Ctrl+S)
        this.setupKeyboardShortcuts();

        console.log('🎨 Editor UI initialized');
    }

    /**
     * Add project panel to the bottom of the viewport container
     */
    private addProjectPanelToUI(): void {
        // Create project panel container
        const container = document.createElement('div');
        container.id = 'project-panel';
        container.className = 'panel';
        container.style.borderTop = '1px solid #3a3a3a';
        container.style.height = '250px';
        container.style.minHeight = '250px';
        container.style.maxHeight = '250px';
        container.style.flexShrink = '0';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.overflow = 'hidden';

        // Panel header
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.textContent = 'Project';

        container.appendChild(header);
        container.appendChild(this.projectPanel.getElement());

        // Add to viewport container
        const viewportContainer = document.getElementById('viewport-container');
        if (viewportContainer) {
            viewportContainer.appendChild(container);
        }
    }

    private setupEventListeners(): void {
        this.playButton.addEventListener('click', () => this.onPlay());
        this.stopButton.addEventListener('click', () => this.onStop());
        this.addCubeButton.addEventListener('click', () => this.onAddCube());
        this.addSphereButton.addEventListener('click', () => this.onAddSphere());
        this.addEmptyButton.addEventListener('click', () => this.onAddEmpty());
        this.addPlayerButton.addEventListener('click', () => this.onAddPlayer());
        
        // OLD save/load are now scene-only (will be deprecated)
        this.saveButton.addEventListener('click', () => this.onSaveScene());
        this.loadButton.addEventListener('click', () => this.onLoadScene());
        
        // NEW: Project buttons
        this.openProjectButton.addEventListener('click', () => this.onOpenProject());
        this.newProjectButton.addEventListener('click', () => this.onNewProject());
    }

    /**
     * Setup keyboard shortcuts for common actions
     */
    private setupKeyboardShortcuts(): void {
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl+S to save project
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                this.onSaveProject();
            }
            
            // Cmd/Ctrl+O to open project
            if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
                e.preventDefault();
                this.onOpenProject();
            }
            
            // Cmd/Ctrl+N to new project
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                this.onNewProject();
            }
        });
        
        console.log('⌨️ Keyboard shortcuts registered');
        console.log('   Cmd/Ctrl+S: Save project');
        console.log('   Cmd/Ctrl+O: Open project');
        console.log('   Cmd/Ctrl+N: New project');
    }

    /**
     * Open an existing project
     */
    private async onOpenProject(): Promise<void> {
        console.log('Opening project...');

        // Request directory access
        const success = await this.fileSystem.openDirectory();
        if (!success) {
            console.log('Open project cancelled');
            return;
        }

        // Create project instance
        this.project = new Project('LoadedProject', this.fileSystem);
        
        // Try to load project
        const loaded = await this.project.load();
        if (!loaded) {
            alert('This directory does not appear to be a valid project.\n\nUse "New Project" to create a project in this folder.');
            this.project = null;
            return;
        }

        // Update project panel
        this.projectPanel.setProject(this.project);
        
        // Load the first scene (or default scene)
        const sceneNames = this.project.getSceneNames();
        if (sceneNames.length > 0) {
            const firstScenePath = this.project.getScenePath(sceneNames[0]);
            if (firstScenePath) {
                const scene = await this.project.loadScene(firstScenePath);
                if (scene) {
                    this.engine.loadScene(scene);
                    this.project.setCurrentScene(scene, firstScenePath);
                    this.refresh();
                }
            }
        }

        console.log(`✅ Project opened: ${this.project.name}`);
        console.log(`   Directory: ${this.fileSystem.getDirectoryName()}`);
        console.log(`   Scenes: ${sceneNames.join(', ')}`);
    }

    /**
     * Create a new project
     */
    private async onNewProject(): Promise<void> {
        console.log('Creating new project...');

        // Request directory access
        const success = await this.fileSystem.openDirectory();
        if (!success) {
            console.log('New project cancelled');
            return;
        }

        // Ask for project name
        const name = prompt('Project name:', 'MyGame');
        if (!name) {
            console.log('New project cancelled (no name)');
            return;
        }

        // Create project
        this.project = new Project(name, this.fileSystem);
        const created = await this.project.create();
        
        if (!created) {
            alert('Failed to create project. Check console for errors.');
            this.project = null;
            return;
        }

        // Update project panel
        this.projectPanel.setProject(this.project);
        
        // Load the default scene that was created
        if (this.project.currentScene) {
            this.engine.loadScene(this.project.currentScene);
            this.refresh();
        }

        console.log(`✅ Project created: ${name}`);
        console.log(`   Directory: ${this.fileSystem.getDirectoryName()}`);
    }

    /**
     * Save the entire project (Cmd/Ctrl+S)
     */
    private async onSaveProject(): Promise<void> {
        if (!this.project) {
            console.warn('No project to save');
            alert('No project open. Create or open a project first.');
            return;
        }

        console.log('Saving project...');

        // Save current scene
        if (this.project.currentScene) {
            const saved = await this.project.saveCurrentScene();
            if (!saved) {
                alert('Failed to save scene. Check console for errors.');
                return;
            }
        }

        // Save project settings
        const settingsSaved = await this.project.saveProjectSettings();
        if (!settingsSaved) {
            alert('Failed to save project settings. Check console for errors.');
            return;
        }

        console.log('💾 Project saved successfully');
        
        // Visual feedback (optional: show toast notification)
        this.showSaveConfirmation();
    }

    /**
     * Show visual confirmation that save succeeded
     */
    private showSaveConfirmation(): void {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.background = '#4CAF50';
        notification.style.color = 'white';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        notification.style.zIndex = '10000';
        notification.style.fontSize = '14px';
        notification.style.fontWeight = '500';
        notification.textContent = '✓ Project saved';
        
        document.body.appendChild(notification);
        
        // Fade out and remove after 2 seconds
        setTimeout(() => {
            notification.style.transition = 'opacity 0.3s';
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    /**
     * Save scene only (old behavior, now part of project save)
     */
    private async onSaveScene(): Promise<void> {
        if (!this.project) {
            // Fallback to old download behavior if no project
            const scene = this.engine.getScene();
            if (!scene) return;

            const json = SceneSerializer.serialize(scene);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${scene.name}.json`;
            a.click();
            URL.revokeObjectURL(url);

            console.log('💾 Scene downloaded (no project open)');
            return;
        }

        // If project is open, save to project
        await this.onSaveProject();
    }

    /**
     * Load scene only (old behavior, now part of project)
     */
    private async onLoadScene(): Promise<void> {
        if (!this.project) {
            // Fallback to old upload behavior if no project
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.addEventListener('change', async () => {
                const file = input.files?.[0];
                if (!file) return;

                const json = await file.text();
                const scene = this.engine.getScene();
                if (!scene) return;

                SceneSerializer.deserialize(json, scene);
                this.selectObject(null);
                this.refresh();

                console.log('📂 Scene loaded from file (no project open)');
            });

            input.click();
            return;
        }

        // If project is open, show scene picker
        this.showScenePicker();
    }

    /**
     * Show a picker to switch between scenes in the project
     */
    private showScenePicker(): void {
        if (!this.project) return;

        const sceneNames = this.project.getSceneNames();
        if (sceneNames.length === 0) {
            alert('No scenes in project');
            return;
        }

        // Simple prompt for now (TODO: build proper UI picker)
        const choice = prompt(
            `Select scene to load:\n\n${sceneNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
            '1'
        );

        if (!choice) return;

        const index = parseInt(choice) - 1;
        if (index < 0 || index >= sceneNames.length) {
            alert('Invalid choice');
            return;
        }

        const sceneName = sceneNames[index];
        const scenePath = this.project.getScenePath(sceneName);
        if (!scenePath) return;

        // Load the scene
        this.project.loadScene(scenePath).then(scene => {
            if (scene) {
                this.engine.loadScene(scene);
                this.project!.setCurrentScene(scene, scenePath);
                this.refresh();
                console.log(`✅ Loaded scene: ${sceneName}`);
            }
        });
    }

    // ... rest of existing EditorUI methods (onPlay, onStop, etc.) remain unchanged ...

    /**
     * Get the asset manager (for other systems to use)
     */
    public getAssetManager(): AssetManager {
        return this.assetManager;
    }

    /**
     * Get the current project (for other systems to use)
     */
    public getProject(): Project | null {
        return this.project;
    }

    /**
     * Get the file system manager (for other systems to use)
     */
    public getFileSystem(): FileSystemManager {
        return this.fileSystem;
    }

    // ... rest of EditorUI implementation continues ...
}
```

**Key Integration Points:**

1. **Three Managers**: FileSystemManager, AssetManager, and Project work together
2. **Keyboard Shortcuts**: Professional Cmd/Ctrl+S workflow
3. **Graceful Fallback**: Old save/load buttons still work if no project open
4. **Visual Feedback**: Toast notification when save succeeds
5. **Scene Switching**: Simple prompt-based scene picker (will improve in future)

### Step 6: Update HTML for New Buttons

We need to add the "New Project" and "Open Project" buttons to the toolbar.

Modify `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Engine - Chapter 7</title>
    <link rel="stylesheet" href="/src/styles/editor.css">
</head>
<body>
    <div id="app">
        <!-- Hierarchy Panel -->
        <div id="hierarchy-panel" class="panel">
            <div class="panel-header">
                <span>Hierarchy</span>
            </div>
            <div class="panel-content" id="hierarchy-content"></div>
        </div>
        
        <!-- Viewport -->
        <div id="viewport-container">
            <div id="toolbar">
                <!-- NEW: Project management buttons -->
                <div class="toolbar-group">
                    <button class="btn" id="new-project-btn" title="Create new project (Cmd/Ctrl+N)">
                        📁 New Project
                    </button>
                    <button class="btn" id="open-project-btn" title="Open existing project (Cmd/Ctrl+O)">
                        📂 Open Project
                    </button>
                </div>
                
                <div class="toolbar-separator"></div>
                
                <!-- Play/Stop controls -->
                <div class="toolbar-group">
                    <button class="btn primary" id="play-btn">▶ Play</button>
                    <button class="btn" id="stop-btn" disabled>⏹ Stop</button>
                </div>
                
                <div class="toolbar-separator"></div>
                
                <!-- GameObject creation buttons -->
                <div class="toolbar-group">
                    <button class="btn" id="add-cube-btn">+ Cube</button>
                    <button class="btn" id="add-sphere-btn">+ Sphere</button>
                    <button class="btn" id="add-empty-btn">+ Empty</button>
                    <button class="btn" id="add-player-btn">+ Player</button>
                </div>

                <div class="toolbar-separator"></div>
                
                <!-- OLD: Scene save/load (now works with projects) -->
                <div class="toolbar-group">
                    <button class="btn" id="save-btn" title="Save project (Cmd/Ctrl+S)">
                        💾 Save
                    </button>
                    <button class="btn" id="load-btn" title="Load scene">
                        📂 Load
                    </button>
                </div>
                
                <div class="toolbar-spacer"></div>
                
                <!-- Stats display -->
                <div id="stats">
                    FPS: <span id="fps">0</span> | 
                    Mode: <span id="mode">EDITOR</span>
                </div>
            </div>
            
            <canvas id="game-canvas"></canvas>
        </div>
        
        <!-- Inspector Panel -->
        <div id="inspector-panel" class="panel">
            <div class="panel-header">Inspector</div>
            <div class="panel-content" id="inspector-content"></div>
        </div>
    </div>
    
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Changes:**
- Added "New Project" and "Open Project" buttons at start of toolbar
- Added keyboard shortcut hints in button titles
- Kept old save/load buttons (they now trigger project save when project is open)

### Step 7: CSS Styles for Project Panel

Add comprehensive styles for the project panel and asset browser.

Add to `src/styles/editor.css`:

```css
/* ============================================
   PROJECT PANEL STYLES - Chapter 7
   Asset browser and project management
   ============================================ */

/* Project Panel Container */
#project-panel {
    border-top: 1px solid #3a3a3a;
    height: 250px;
    min-height: 250px;
    max-height: 250px;
    flex-shrink: 0;
    overflow: hidden;
}

/* Project Header */
.project-header {
    padding: 8px 12px;
    background: #2d2d2d;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #3a3a3a;
}

.project-header h3 {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
    color: #ccc;
}

.btn-sm {
    padding: 4px 8px;
    font-size: 11px;
    min-width: auto;
}

/* Folder Tree */
.folder-tree {
    padding: 8px;
    border-bottom: 1px solid #3a3a3a;
    max-height: 100px;
    overflow-y: auto;
    background: #1e1e1e;
}

.folder-item {
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    border-radius: 3px;
    transition: background 0.15s;
    display: flex;
    align-items: center;
}

.folder-item:hover {
    background: #2a2d2e;
}

.folder-item.selected {
    background: #094771;
}

/* Asset Grid */
.asset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 8px;
    padding: 12px;
    overflow-y: auto;
    max-height: calc(250px - 150px);
    background: #252526;
}

/* Asset Card */
.asset-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
}

.asset-card:hover {
    background: #353535;
    border-color: #555;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.asset-card.selected {
    background: #094771;
    border-color: #569cd6;
}

/* Asset Thumbnail */
.asset-thumbnail {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    background: #1e1e1e;
    border-radius: 4px;
    margin-bottom: 6px;
    border: 1px solid #3a3a3a;
}

/* Asset Name */
.asset-name {
    font-size: 11px;
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #ccc;
    margin-bottom: 4px;
}

/* Asset Type Badge */
.asset-type {
    font-size: 9px;
    color: #888;
    text-transform: uppercase;
    background: #1e1e1e;
    padding: 2px 6px;
    border-radius: 3px;
    margin-bottom: 4px;
}

/* Asset Reference Count */
.asset-refs {
    font-size: 9px;
    color: #569cd6;
    background: rgba(86, 156, 214, 0.15);
    padding: 2px 6px;
    border-radius: 3px;
}

/* Asset Summary */
.asset-summary {
    grid-column: 1 / -1;
    padding: 8px;
    background: #1e1e1e;
    border-radius: 4px;
    font-size: 11px;
    color: #888;
    text-align: center;
    margin-top: 4px;
}

/* Empty State (when no assets) */
#project-panel-content .empty-state {
    padding: 40px 20px;
    text-align: center;
    color: #666;
}

#project-panel-content .empty-state p {
    margin: 0 0 4px 0;
    font-size: 13px;
}

/* Viewport Container Adjustments */
#viewport-container {
    flex: 1 1 auto;
    min-width: 400px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
}

/* Ensure canvas doesn't overflow with project panel */
#game-canvas {
    flex: 1;
    width: 100%;
    display: block;
}

/* Toolbar button improvements */
.btn {
    display: flex;
    align-items: center;
    gap: 6px;
}

.btn:active {
    transform: translateY(1px);
}

/* Keyboard shortcut hint */
.btn[title]:hover::after {
    content: attr(title);
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 11px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 1000;
}
```

**CSS Design Decisions:**

1. **Fixed Height Panel**: 250px height so it doesn't squish the viewport
2. **Grid Layout**: Responsive grid that adjusts to panel width
3. **Hover Effects**: Visual feedback on hover (lift, shadow, border)
4. **Color Coding**: Reference count uses accent color (blue)
5. **Empty States**: Friendly messages when no content
6. **Professional Polish**: Smooth transitions, proper spacing, visual hierarchy

### Step 8: Update main.ts for ServiceLocator

Finally, ensure the engine is properly registered with ServiceLocator so all our new systems can access it.

Modify `src/main.ts`:

```typescript
import { Engine } from './core/Engine';
import { Scene } from './core/Scene';
import { EditorUI } from './editor/EditorUI';
import { ServiceLocator } from './core/ServiceLocator';

console.log('='.repeat(50));
console.log('🎮 GAME ENGINE - CHAPTER 7');
console.log('Asset Management + Project System');
console.log('='.repeat(50));

// Create engine
const engine = new Engine('game-canvas');

// Register with ServiceLocator (for components to access services)
ServiceLocator.registerEngine(engine);

// Create a default scene
const scene = new Scene("DefaultScene");
engine.loadScene(scene);

// Create editor UI (this initializes project system)
const editor = new EditorUI(engine);
engine.setEditorUI(editor);

// Start the engine
engine.start();

// Make accessible from console for debugging
(window as any).engine = engine;
(window as any).scene = scene;
(window as any).editor = editor;

console.log('💡 Access from console:');
console.log('  - window.engine (the engine)');
console.log('  - window.scene (current scene)');
console.log('  - window.editor (editor UI)');
console.log('');
console.log('💡 Try these actions:');
console.log('  1. Click "New Project" and choose a folder');
console.log('  2. Add some cubes/spheres');
console.log('  3. Press Cmd/Ctrl+S to save');
console.log('  4. Refresh the browser');
console.log('  5. Click "Open Project" and choose same folder');
console.log('  6. Your scene is restored! 🎉');
console.log('');
console.log('💡 Keyboard shortcuts:');
console.log('  - Cmd/Ctrl+S: Save project');
console.log('  - Cmd/Ctrl+O: Open project');
console.log('  - Cmd/Ctrl+N: New project');
```

**Console Hints:**
- Clear instructions for testing the project system
- Keyboard shortcut reminders
- Step-by-step workflow to verify persistence