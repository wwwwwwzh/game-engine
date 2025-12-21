# Chapter 7.2: Professional UI with PCUI

## Overview

In Chapter 7.1, we built our editor UI from scratch using vanilla DOM manipulation. This taught us the fundamentals of UI construction, event handling, and state management. Now we'll **completely replace** that custom UI code with PCUI, PlayCanvas's professional UI library.

**What you'll learn:**
- How to integrate a professional UI component library
- Observer pattern for reactive data binding
- Declarative UI construction vs. imperative DOM manipulation
- How 200+ lines of custom UI becomes ~50 lines with a library

**What changes:**
- Replace `HierarchyPanel.ts` with PCUI TreeView (~200 lines → ~60 lines)
- Replace `InspectorPanel.ts` with PCUI property controls (~250 lines → ~80 lines)
- Replace `ProjectPanel.ts` with PCUI GridView (~150 lines → ~50 lines)
- Add Observer pattern for automatic UI synchronization
- Professional styling (dark theme, collapsible panels)

**What stays the same:**
- All game engine code (Engine, GameObject, Components)
- All editor logic (selection, project management, events)
- Scene management and serialization

---

## Step 1: Install PCUI and Dependencies

First, install PCUI and its required Observer library:

```bash
npm install @playcanvas/pcui@latest @playcanvas/observer@latest
```

**Package breakdown:**
- `@playcanvas/pcui` - UI component library (~600KB)
- `@playcanvas/observer` - Reactive data binding system (~20KB)

---

## Step 2: Update HTML Structure

Replace the entire `index.html` with a cleaner structure optimized for PCUI:

**File:** `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Engine - Chapter 7.2 (PCUI)</title>
</head>
<body>
    <!-- PCUI automatically injects its styles, we just need containers -->
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Why simpler?**
- No manual panel structure - PCUI will create it programmatically
- No custom CSS file needed - PCUI brings its own professional styling
- Single `#app` container for the entire editor interface

---

## Step 3: Create UI State Manager with Observer

PCUI uses the **Observer pattern** for reactive UI updates. Instead of manually calling `refresh()` everywhere, observers automatically notify the UI when data changes.

**File:** `src/editor/EditorState.ts` (NEW FILE)

```typescript
import { Observer } from '@playcanvas/observer';
import type { GameObject } from '../core/GameObject';
import type { Scene } from '../core/Scene';
import type { Project } from '../core/Project';

/**
 * EditorState - Central observable state for the editor UI.
 * 
 * When properties change, PCUI components linked to this observer
 * automatically update. This eliminates manual refresh() calls.
 */
export class EditorState extends Observer {
    constructor() {
        super({
            // Selection
            selectedObject: null as GameObject | null,
            
            // Scene hierarchy (array of root objects)
            sceneRoots: [] as GameObject[],
            
            // Current scene
            currentScene: null as Scene | null,
            
            // Project
            currentProject: null as Project | null,
            
            // Playmode
            isPlaying: false,
            
            // Stats
            fps: 0,
            
            // Inspector data (computed from selectedObject)
            selectedObjectName: '',
            selectedObjectPosition: { x: 0, y: 0, z: 0 },
            selectedObjectRotation: { x: 0, y: 0, z: 0 },
            selectedObjectScale: { x: 1, y: 1, z: 1 }
        });
    }
    
    /**
     * Update selection and automatically compute inspector data
     */
    setSelectedObject(obj: GameObject | null): void {
        this.set('selectedObject', obj);
        
        if (obj) {
            this.set('selectedObjectName', obj.name);
            const pos = obj.transform.position;
            const rot = obj.transform.rotation;
            const scale = obj.transform.scale;
            
            this.set('selectedObjectPosition', { x: pos.x, y: pos.y, z: pos.z });
            this.set('selectedObjectRotation', { x: rot.x, y: rot.y, z: rot.z });
            this.set('selectedObjectScale', { x: scale.x, y: scale.y, z: scale.z });
        } else {
            this.set('selectedObjectName', '');
        }
    }
    
    /**
     * Update scene hierarchy
     */
    setSceneRoots(roots: GameObject[]): void {
        this.set('sceneRoots', roots);
    }
    
    /**
     * Update transform from inspector input
     */
    updatePosition(value: { x: number; y: number; z: number }): void {
        const obj = this.get('selectedObject') as GameObject | null;
        if (obj) {
            obj.transform.position.set(value.x, value.y, value.z);
            this.set('selectedObjectPosition', value);
        }
    }
    
    updateRotation(value: { x: number; y: number; z: number }): void {
        const obj = this.get('selectedObject') as GameObject | null;
        if (obj) {
            obj.transform.rotation.set(value.x, value.y, value.z);
            this.set('selectedObjectRotation', value);
        }
    }
    
    updateScale(value: { x: number; y: number; z: number }): void {
        const obj = this.get('selectedObject') as GameObject | null;
        if (obj) {
            obj.transform.scale.set(value.x, value.y, value.z);
            this.set('selectedObjectScale', value);
        }
    }
}
```

**Key Concepts:**
- **Observer** is like a reactive store (similar to Vuex, Redux, or MobX)
- When `set()` is called, all linked UI components automatically update
- No more `hierarchyPanel.refresh()` and `inspectorPanel.refresh()` calls
- UI and data are "bound" together reactively

---

## Step 4: Replace HierarchyPanel with PCUI TreeView

Replace the entire `HierarchyPanel.ts` file:

**File:** `src/editor/HierarchyPanel.ts`

```typescript
import { Container, TreeView, TreeViewItem } from '@playcanvas/pcui';
import type { GameObject } from '../core/GameObject';
import type { EditorState } from './EditorState';

/**
 * HierarchyPanel - Scene hierarchy using PCUI TreeView.
 * 
 * Before (7.1): ~200 lines of manual DOM manipulation
 * After (7.2): ~60 lines using PCUI components
 */
export class HierarchyPanel {
    private container: Container;
    private treeView: TreeView;
    private editorState: EditorState;
    
    constructor(editorState: EditorState) {
        this.editorState = editorState;
        
        // Create container with header
        this.container = new Container({
            class: 'hierarchy-panel',
            flex: true,
            flexDirection: 'column'
        });
        
        // Create tree view
        this.treeView = new TreeView({
            allowDrag: true,
            allowReordering: true
        });
        
        this.container.append(this.treeView);
        
        // Listen for selection changes
        this.treeView.on('select', (item: TreeViewItem) => {
            const gameObject = (item as any).gameObject as GameObject;
            this.editorState.setSelectedObject(gameObject);
        });
        
        // Listen for scene changes from observer
        this.editorState.on('sceneRoots:set', () => {
            this.rebuild();
        });
        
        // Initial build
        this.rebuild();
    }
    
    /**
     * Rebuild tree from scene roots
     */
    private rebuild(): void {
        this.treeView.clear();
        
        const roots = this.editorState.get('sceneRoots') as GameObject[];
        if (!roots) return;
        
        for (const root of roots) {
            this.addGameObject(root, this.treeView);
        }
    }
    
    /**
     * Recursively add GameObject and children to tree
     */
    private addGameObject(gameObject: GameObject, parent: TreeView | TreeViewItem): void {
        const item = new TreeViewItem({
            text: gameObject.name,
            allowSelect: true
        });
        
        // Store reference for selection
        (item as any).gameObject = gameObject;
        
        // Add children recursively
        for (const child of gameObject.transform.children) {
            this.addGameObject(child.gameObject, item);
        }
        
        parent.append(item);
    }
    
    /**
     * Get the root PCUI element for mounting
     */
    getElement(): Container {
        return this.container;
    }
}
```

**What changed:**
- **200 lines → 60 lines**: No manual `createElement`, `appendChild`, event delegation
- **TreeView component**: Built-in support for hierarchy, drag-drop, selection
- **Observer pattern**: `sceneRoots:set` event automatically triggers rebuild
- **No refresh() method**: UI updates reactively when data changes

---

## Step 5: Replace InspectorPanel with PCUI Property Controls

Replace the entire `InspectorPanel.ts` file:

**File:** `src/editor/InspectorPanel.ts`

```typescript
import { 
    Container, 
    Label, 
    TextInput, 
    VectorInput,
    Panel,
    BindingTwoWay
} from '@playcanvas/pcui';
import type { EditorState } from './EditorState';

/**
 * InspectorPanel - Object inspector using PCUI property controls.
 * 
 * Before (7.1): ~250 lines of manual input creation
 * After (7.2): ~80 lines using PCUI bound inputs
 */
export class InspectorPanel {
    private container: Container;
    private editorState: EditorState;
    
    // Cached UI elements
    private nameInput: TextInput;
    private positionInput: VectorInput;
    private rotationInput: VectorInput;
    private scaleInput: VectorInput;
    
    constructor(editorState: EditorState) {
        this.editorState = editorState;
        
        // Create main container
        this.container = new Container({
            class: 'inspector-panel',
            flex: true,
            flexDirection: 'column'
        });
        
        // Name input with two-way binding
        this.nameInput = new TextInput({
            placeholder: 'Object Name',
            binding: new BindingTwoWay()
        });
        this.nameInput.link(editorState, 'selectedObjectName');
        
        // Transform panel (collapsible)
        const transformPanel = new Panel({
            headerText: 'Transform',
            collapsible: true,
            collapsed: false
        });
        
        // Position input with two-way binding
        this.positionInput = new VectorInput({
            dimensions: 3,
            placeholder: ['X', 'Y', 'Z'],
            binding: new BindingTwoWay()
        });
        this.positionInput.link(editorState, 'selectedObjectPosition');
        this.positionInput.on('change', (value: number[]) => {
            editorState.updatePosition({ x: value[0], y: value[1], z: value[2] });
        });
        
        // Rotation input
        this.rotationInput = new VectorInput({
            dimensions: 3,
            placeholder: ['X', 'Y', 'Z'],
            binding: new BindingTwoWay()
        });
        this.rotationInput.link(editorState, 'selectedObjectRotation');
        this.rotationInput.on('change', (value: number[]) => {
            editorState.updateRotation({ x: value[0], y: value[1], z: value[2] });
        });
        
        // Scale input
        this.scaleInput = new VectorInput({
            dimensions: 3,
            placeholder: ['X', 'Y', 'Z'],
            binding: new BindingTwoWay()
        });
        this.scaleInput.link(editorState, 'selectedObjectScale');
        this.scaleInput.on('change', (value: number[]) => {
            editorState.updateScale({ x: value[0], y: value[1], z: value[2] });
        });
        
        // Build layout
        transformPanel.append(new Label({ text: 'Position' }));
        transformPanel.append(this.positionInput);
        transformPanel.append(new Label({ text: 'Rotation' }));
        transformPanel.append(this.rotationInput);
        transformPanel.append(new Label({ text: 'Scale' }));
        transformPanel.append(this.scaleInput);
        
        this.container.append(this.nameInput);
        this.container.append(transformPanel);
        
        // Listen for selection changes
        editorState.on('selectedObject:set', () => {
            this.updateVisibility();
        });
        
        this.updateVisibility();
    }
    
    /**
     * Show/hide inspector based on selection
     */
    private updateVisibility(): void {
        const hasSelection = this.editorState.get('selectedObject') !== null;
        this.container.hidden = !hasSelection;
    }
    
    getElement(): Container {
        return this.container;
    }
}
```

**What changed:**
- **250 lines → 80 lines**: PCUI provides pre-built property controls
- **Two-way binding**: `link()` automatically syncs UI ↔ data
- **Collapsible panels**: Professional inspector sections
- **VectorInput**: Specialized component for X/Y/Z values
- **No manual DOM updates**: Observer pattern handles everything

---

## Step 6: Replace ProjectPanel with PCUI GridView

Replace the entire `ProjectPanel.ts` file:

**File:** `src/editor/ProjectPanel.ts`

```typescript
import { Container, GridView, GridViewItem, Label } from '@playcanvas/pcui';
import type { AssetManager, Asset } from '../core/AssetManager';
import type { EditorState } from './EditorState';

/**
 * ProjectPanel - Asset browser using PCUI GridView.
 * 
 * Before (7.1): ~150 lines of card-based grid layout
 * After (7.2): ~50 lines using GridView component
 */
export class ProjectPanel {
    private container: Container;
    private gridView: GridView;
    private assetManager: AssetManager | null = null;
    private editorState: EditorState;
    
    constructor(editorState: EditorState) {
        this.editorState = editorState;
        
        this.container = new Container({
            class: 'project-panel',
            flex: true,
            flexDirection: 'column'
        });
        
        // Project header
        const header = new Label({
            text: 'Project Assets',
            class: 'panel-header'
        });
        
        // Grid view for assets
        this.gridView = new GridView();
        
        this.container.append(header);
        this.container.append(this.gridView);
    }
    
    /**
     * Set asset manager and refresh
     */
    setAssetManager(assetManager: AssetManager): void {
        this.assetManager = assetManager;
        this.refresh();
    }
    
    /**
     * Rebuild asset grid
     */
    refresh(): void {
        this.gridView.clear();
        
        if (!this.assetManager) return;
        
        const assets = this.assetManager.getAllAssets();
        
        for (const asset of assets) {
            const item = new GridViewItem({
                text: asset.name
            });
            
            // Store asset reference
            (item as any).asset = asset;
            
            // Add icon based on type
            const icon = this.getAssetIcon(asset.type);
            item.text = `${icon} ${asset.name}`;
            
            this.gridView.append(item);
        }
    }
    
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
    
    getElement(): Container {
        return this.container;
    }
}
```

**What changed:**
- **150 lines → 50 lines**: GridView handles layout automatically
- **GridViewItem**: Built-in asset card component
- **No manual card creation**: PCUI handles styling and layout

---

## Step 7: Rebuild EditorUI with PCUI Layout

Replace the entire `EditorUI.ts` file to use PCUI for layout:

**File:** `src/editor/EditorUI.ts`

```typescript
import { Container, Button, Label } from '@playcanvas/pcui';
import '@playcanvas/pcui/styles'; // Import PCUI styles
import type { Engine } from '../core/Engine';
import { HierarchyPanel } from './HierarchyPanel';
import { InspectorPanel } from './InspectorPanel';
import { ProjectPanel } from './ProjectPanel';
import { EditorState } from './EditorState';
import { EditorCameraController } from './EditorCameraController';
import { EditorGrid } from './EditorGrid';
import { CameraGizmo } from './CameraGizmo';
import { CameraPreview } from './CameraPreview';
import { ViewportGizmo } from './ViewportGizmo';
import { Camera } from '../components/Camera';
import { Project } from '../core/Project';
import { AssetManager } from '../core/AssetManager';
import { FileSystemManager } from '../core/FileSystemManager';
import { GameObjectFactory } from '../core/GameObjectFactory';

/**
 * EditorUI - Main editor interface built with PCUI.
 * 
 * Before (7.1): Manual DOM construction, custom CSS
 * After (7.2): PCUI layout system, professional components
 */
export class EditorUI {
    private engine: Engine;
    private editorState: EditorState;
    
    // Panels
    private hierarchyPanel: HierarchyPanel;
    private inspectorPanel: InspectorPanel;
    private projectPanel: ProjectPanel;
    
    // Editor tools (unchanged from 7.1)
    private editorCameraController: EditorCameraController;
    private editorGrid: EditorGrid;
    private cameraGizmo: CameraGizmo | null = null;
    private cameraPreview: CameraPreview;
    private viewportGizmo: ViewportGizmo;
    
    // Project system
    private project: Project | null = null;
    private fileSystem: FileSystemManager;
    private assetManager: AssetManager;
    
    // Root container
    private rootContainer: Container;
    
    constructor(engine: Engine) {
        this.engine = engine;
        
        // Create observable state
        this.editorState = new EditorState();
        
        // Create panels
        this.hierarchyPanel = new HierarchyPanel(this.editorState);
        this.inspectorPanel = new InspectorPanel(this.editorState);
        this.projectPanel = new ProjectPanel(this.editorState);
        
        // Create project system
        this.fileSystem = new FileSystemManager();
        this.assetManager = new AssetManager(this.fileSystem);
        
        // Build UI layout
        this.buildLayout();
        
        // Create editor tools (same as 7.1)
        this.editorCameraController = new EditorCameraController(engine);
        engine.setEditorCamera(this.editorCameraController);
        
        const scene = engine.getScene();
        if (scene) {
            this.editorGrid = new EditorGrid();
            this.editorGrid.addToScene(scene.getThreeScene());
            
            this.viewportGizmo = new ViewportGizmo(engine, this.editorCameraController);
            this.cameraPreview = new CameraPreview(engine);
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Sync initial scene state
        this.syncSceneToState();
        
        console.log('🎨 PCUI Editor initialized');
    }
    
    /**
     * Build the editor layout using PCUI containers
     */
    private buildLayout(): void {
        // Root container (flex row)
        this.rootContainer = new Container({
            id: 'editor-root',
            flex: true,
            flexDirection: 'row'
        });
        
        // Left panel (Hierarchy + Project)
        const leftPanel = new Container({
            flex: true,
            flexDirection: 'column',
            width: 250,
            resizable: 'right',
            resizeMin: 200,
            resizeMax: 400
        });
        
        leftPanel.append(this.hierarchyPanel.getElement());
        leftPanel.append(this.projectPanel.getElement());
        
        // Center (Viewport + Toolbar)
        const centerPanel = new Container({
            flex: true,
            flexDirection: 'column',
            flexGrow: 1
        });
        
        const toolbar = this.createToolbar();
        const viewport = this.createViewport();
        
        centerPanel.append(toolbar);
        centerPanel.append(viewport);
        
        // Right panel (Inspector)
        const rightPanel = new Container({
            flex: true,
            flexDirection: 'column',
            width: 300,
            resizable: 'left',
            resizeMin: 250,
            resizeMax: 500
        });
        
        rightPanel.append(this.inspectorPanel.getElement());
        
        // Assemble layout
        this.rootContainer.append(leftPanel);
        this.rootContainer.append(centerPanel);
        this.rootContainer.append(rightPanel);
        
        // Mount to DOM
        const app = document.getElementById('app')!;
        app.appendChild(this.rootContainer.dom);
    }
    
    /**
     * Create toolbar with PCUI buttons
     */
    private createToolbar(): Container {
        const toolbar = new Container({
            class: 'toolbar',
            flex: true,
            flexDirection: 'row'
        });
        
        // Playmode buttons
        const playBtn = new Button({
            text: '▶ Play',
            class: 'primary'
        });
        playBtn.on('click', () => this.onPlay());
        
        const stopBtn = new Button({
            text: '⏹ Stop',
            enabled: false
        });
        stopBtn.on('click', () => this.onStop());
        
        // Add object buttons
        const addCubeBtn = new Button({ text: '+ Cube' });
        addCubeBtn.on('click', () => this.onAddCube());
        
        const addSphereBtn = new Button({ text: '+ Sphere' });
        addSphereBtn.on('click', () => this.onAddSphere());
        
        const addEmptyBtn = new Button({ text: '+ Empty' });
        addEmptyBtn.on('click', () => this.onAddEmpty());
        
        // Project buttons
        const newProjectBtn = new Button({ text: '📁 New' });
        newProjectBtn.on('click', () => this.onNewProject());
        
        const openProjectBtn = new Button({ text: '📂 Open' });
        openProjectBtn.on('click', () => this.onOpenProject());
        
        // Stats label
        const statsLabel = new Label({
            text: 'FPS: 0 | Mode: EDITOR'
        });
        
        // Assemble toolbar
        toolbar.append(playBtn);
        toolbar.append(stopBtn);
        toolbar.append(addCubeBtn);
        toolbar.append(addSphereBtn);
        toolbar.append(addEmptyBtn);
        toolbar.append(newProjectBtn);
        toolbar.append(openProjectBtn);
        toolbar.append(statsLabel);
        
        // Store references for later
        (this as any).playBtn = playBtn;
        (this as any).stopBtn = stopBtn;
        (this as any).statsLabel = statsLabel;
        
        return toolbar;
    }
    
    /**
     * Create viewport container for Three.js canvas
     */
    private createViewport(): Container {
        const viewport = new Container({
            id: 'viewport',
            flex: true,
            flexGrow: 1
        });
        
        // Get or create canvas
        let canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'game-canvas';
        }
        
        viewport.dom.appendChild(canvas);
        
        return viewport;
    }
    
    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        const events = this.engine.events;
        
        // Play/Stop events
        events.on('editor.play', () => {
            this.editorState.set('isPlaying', true);
            (this as any).playBtn.enabled = false;
            (this as any).stopBtn.enabled = true;
        });
        
        events.on('editor.stop', () => {
            this.editorState.set('isPlaying', false);
            (this as any).playBtn.enabled = true;
            (this as any).stopBtn.enabled = false;
        });
        
        // Scene changes
        events.on('project.sceneChanged', () => {
            this.syncSceneToState();
        });
        
        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                this.onSaveProject();
            }
        });
    }
    
    /**
     * Sync Three.js scene to observable state
     */
    private syncSceneToState(): void {
        const scene = this.engine.getScene();
        if (!scene) return;
        
        const roots = scene.getRootGameObjects();
        this.editorState.setSceneRoots(roots);
    }
    
    // ========== TOOLBAR HANDLERS ==========
    
    private onPlay(): void {
        this.engine.events.fire('editor.play');
    }
    
    private onStop(): void {
        this.engine.events.fire('editor.stop');
    }
    
    private onAddCube(): void {
        const scene = this.engine.getScene();
        if (!scene) return;
        
        const cube = GameObjectFactory.createCube('Cube');
        scene.addGameObject(cube);
        this.syncSceneToState();
    }
    
    private onAddSphere(): void {
        const scene = this.engine.getScene();
        if (!scene) return;
        
        const sphere = GameObjectFactory.createSphere('Sphere');
        scene.addGameObject(sphere);
        this.syncSceneToState();
    }
    
    private onAddEmpty(): void {
        const scene = this.engine.getScene();
        if (!scene) return;
        
        const empty = GameObjectFactory.createEmpty('Empty');
        scene.addGameObject(empty);
        this.syncSceneToState();
    }
    
    private async onNewProject(): void {
        const name = prompt('Project name:', 'MyProject');
        if (!name) return;
        
        this.project = await Project.create(name, this.fileSystem);
        this.assetManager.setProject(this.project);
        this.projectPanel.setAssetManager(this.assetManager);
        
        console.log('📁 New project created:', name);
    }
    
    private async onOpenProject(): void {
        const project = await Project.open(this.fileSystem);
        if (!project) return;
        
        this.project = project;
        this.assetManager.setProject(project);
        this.projectPanel.setAssetManager(this.assetManager);
        
        // Load default scene if exists
        const defaultScenePath = 'scenes/DefaultScene.json';
        const sceneData = await this.fileSystem.readFile(this.project.handle, defaultScenePath);
        
        if (sceneData) {
            // Deserialize and load scene
            console.log('📂 Project opened:', project.name);
        }
    }
    
    private async onSaveProject(): void {
        if (!this.project) {
            console.warn('No project to save');
            return;
        }
        
        await this.project.save(this.fileSystem);
        console.log('💾 Project saved');
    }
    
    /**
     * Update FPS display (called from main loop)
     */
    updateStats(fps: number): void {
        const isPlaying = this.editorState.get('isPlaying');
        const mode = isPlaying ? 'PLAYING' : 'EDITOR';
        (this as any).statsLabel.text = `FPS: ${fps} | Mode: ${mode}`;
    }
    
    // ========== PUBLIC API ==========
    
    getEngine(): Engine {
        return this.engine;
    }
    
    refresh(): void {
        this.syncSceneToState();
    }
}
```

**What changed:**
- **No manual HTML**: Everything built with PCUI Container/Button/Label
- **Resizable panels**: Built-in with `resizable` property
- **Flex layout**: PCUI handles responsive layout automatically
- **Cleaner code**: ~300 lines vs ~500 lines in 7.1

---

## Step 8: Update Main Entry Point

Update `main.ts` to initialize the PCUI editor:

**File:** `src/main.ts`

```typescript
import { Engine } from './core/Engine';
import { Scene } from './core/Scene';
import { EditorUI } from './editor/EditorUI';
import { Events } from './events';

console.log('='.repeat(50));
console.log('🎮 GAME ENGINE - CHAPTER 7.2');
console.log('Professional UI with PCUI');
console.log('='.repeat(50));

// 1. Create event bus
const events = new Events();

// 2. Create engine
const engine = new Engine('game-canvas', events);

// 3. Create scene
const scene = new Scene("DefaultScene", events);

// 4. Load scene
engine.loadScene(scene);

// 5. Create PCUI editor
const editor = new EditorUI(engine);
engine.setEditorUI(editor);

// 6. Start engine
engine.start();

// 7. Update FPS display in main loop
setInterval(() => {
    const fps = Math.round(1000 / engine.getDeltaTime());
    editor.updateStats(fps);
}, 100);

// 8. Expose for debugging
(window as any).engine = engine;
(window as any).events = events;
(window as any).editor = editor;
(window as any).scene = scene;

console.log('✅ PCUI Editor initialized');
```

---

## Step 9: Add Custom PCUI Styling (Optional)

While PCUI comes with professional default styles, you can customize:

**File:** `src/styles/pcui-overrides.css`

```css
/* Override PCUI theme colors */
:root {
    --pcui-background: #1e1e1e;
    --pcui-panel-background: #252526;
    --pcui-border-color: #3c3c3c;
    --pcui-text-color: #cccccc;
}

/* Custom toolbar styling */
.toolbar {
    background: var(--pcui-panel-background);
    padding: 8px;
    border-bottom: 1px solid var(--pcui-border-color);
}

/* Viewport fills available space */
#viewport {
    position: relative;
}

#viewport canvas {
    width: 100%;
    height: 100%;
    display: block;
}
```

Import in `main.ts`:
```typescript
import './styles/pcui-overrides.css';
```

---

## Step 10: Remove Old Files

Delete the following files (no longer needed):

```bash
rm src/styles/editor.css  # Replaced by PCUI styles
```

---

## Summary: Before vs After

### Code Comparison

| Component | Chapter 7.1 | Chapter 7.2 | Reduction |
|-----------|-------------|-------------|-----------|
| HierarchyPanel | ~200 lines | ~60 lines | **70%** |
| InspectorPanel | ~250 lines | ~80 lines | **68%** |
| ProjectPanel | ~150 lines | ~50 lines | **67%** |
| EditorUI | ~500 lines | ~300 lines | **40%** |
| **Total** | **~1100 lines** | **~490 lines** | **55%** |

### Features Gained

✅ **Professional appearance** (Unity/Unreal-style dark theme)  
✅ **Resizable panels** (drag panel edges to resize)  
✅ **Collapsible sections** (inspector panels fold/unfold)  
✅ **Two-way data binding** (UI ↔ data sync automatically)  
✅ **Observer pattern** (reactive state management)  
✅ **Specialized inputs** (VectorInput for X/Y/Z, ColorPicker, etc.)  
✅ **Grid/Tree layouts** (professional component organization)

### Concepts Learned

1. **Component Libraries**: How professional tools abstract UI complexity
2. **Observer Pattern**: Reactive programming for UI synchronization
3. **Declarative UI**: Describe what you want vs. how to build it
4. **Two-way Binding**: Automatic data ↔ view synchronization
5. **Composition**: Building complex UIs from simple components

---

## Next Steps

In **Chapter 8**, we'll add a **Material Editor** using PCUI's ColorPicker, SliderInput, and custom property panels.

In **Chapter 9**, we'll integrate **Monaco Editor** (VS Code's editor) for shader editing, building on the PCUI foundation.
