import { Container, Button, Label } from '@playcanvas/pcui';
import '@playcanvas/pcui/styles'; // Import PCUI dark theme
import type { Engine } from '../core/Engine';
import { HierarchyPanel } from './HierarchyPanel';
import { InspectorPanel } from './InspectorPanel';
import { ProjectPanel } from './ProjectPanel';
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
import * as THREE from 'three/webgpu';
import { GameObject } from '../core/GameObject';

/**
 * EditorUI - Main editor interface built with PCUI.
 *
 * Before (7.1): Manual DOM construction, custom CSS
 * After (7.2): PCUI layout system, professional components
 *
 * IMPORTANT: Still uses Events bus (not Observer) for state management
 */
export class EditorUI {
    private engine: Engine;

    // Panels (now PCUI-based)
    private hierarchyPanel: HierarchyPanel;
    private inspectorPanel: InspectorPanel;
    private projectPanel: ProjectPanel;

    // Editor tools (unchanged from 7.1)
    private editorCameraController: EditorCameraController;
    private editorGrid: EditorGrid;
    private cameraGizmo: CameraGizmo | null = null;
    private cameraPreview: CameraPreview;
    private viewportGizmo: ViewportGizmo;

    // Project system (unchanged from 7.1)
    private project: Project | null = null;
    private fileSystem: FileSystemManager;
    private assetManager: AssetManager;

    // PCUI containers
    private rootContainer: Container;
    private playBtn!: Button;
    private stopBtn!: Button;
    private statsLabel!: Label;

    constructor(engine: Engine) {
        this.engine = engine;

        const scene = engine.getScene()!;
        const events = engine.events;

        // Create PCUI panels (pass Events bus, not Observer)
        this.hierarchyPanel = new HierarchyPanel(events, scene);
        this.inspectorPanel = new InspectorPanel(events, scene);
        this.projectPanel = new ProjectPanel();

        // Create project system
        this.fileSystem = new FileSystemManager();
        this.assetManager = new AssetManager();

        // Build PCUI layout
        this.rootContainer = this.buildLayout();

        // Create editor tools (same as 7.1)
        this.editorCameraController = new EditorCameraController(engine);
        engine.setEditorCamera(this.editorCameraController);

        this.editorGrid = new EditorGrid();
        this.editorGrid.addToScene(scene.getThreeScene());

        this.viewportGizmo = new ViewportGizmo();
        this.cameraPreview = new CameraPreview(engine);

        // Setup gizmo click callback
        this.viewportGizmo.onAlign((direction, viewName) => {
            this.editorCameraController.alignToView(direction, viewName);
        });

        // Pass viewport gizmo to editor camera controller
        this.editorCameraController.setViewportGizmo(this.viewportGizmo);

        // Add gizmo to scene
        scene.getThreeScene().add(this.viewportGizmo.getObject3D());

        // Create camera gizmo
        this.cameraGizmo = new CameraGizmo(scene.getThreeScene(), scene, engine);

        // Setup event listeners (Events bus pattern)
        this.setupEventListeners();

        console.log('🎨 PCUI Editor initialized');
    }

    /**
     * Build the entire editor layout using PCUI
     */
    private buildLayout(): Container {
        // Root container (flex row)
        const root = new Container({
            id: 'editor-root',
            flex: true,
            flexDirection: 'row'
        });

        // Left panel: Hierarchy + Project
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

        // Center: Toolbar + Viewport
        const centerPanel = new Container({
            flex: true,
            flexDirection: 'column',
            flexGrow: 1
        });
        centerPanel.append(this.createToolbar());
        centerPanel.append(this.createViewport());

        // Right panel: Inspector
        const rightPanel = new Container({
            flex: true,
            flexDirection: 'column',
            width: 300,
            resizable: 'left',
            resizeMin: 250,
            resizeMax: 500
        });
        rightPanel.append(this.inspectorPanel.getElement());

        // Assemble
        root.append(leftPanel);
        root.append(centerPanel);
        root.append(rightPanel);

        // Mount to DOM
        const app = document.getElementById('app')!;
        app.appendChild(root.dom);

        return root;
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

        // Play/Stop buttons
        this.playBtn = new Button({ text: '▶ Play' });
        this.playBtn.on('click', () => this.engine.events.fire('editor.play'));

        this.stopBtn = new Button({ text: '⏹ Stop', enabled: false });
        this.stopBtn.on('click', () => this.engine.events.fire('editor.stop'));

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

        // Stats
        this.statsLabel = new Label({ text: 'FPS: 0 | Mode: EDITOR' });

        // Assemble
        toolbar.append(this.playBtn);
        toolbar.append(this.stopBtn);
        toolbar.append(addCubeBtn);
        toolbar.append(addSphereBtn);
        toolbar.append(addEmptyBtn);
        toolbar.append(newProjectBtn);
        toolbar.append(openProjectBtn);
        toolbar.append(this.statsLabel);

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

        let canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'game-canvas';
        }

        viewport.dom.appendChild(canvas);
        return viewport;
    }

    /**
     * Setup event listeners (Events bus pattern - same as 7.1)
     */
    private setupEventListeners(): void {
        const events = this.engine.events;

        // Play/Stop state changes
        events.on('editor.play', () => {
            this.playBtn.enabled = false;
            this.stopBtn.enabled = true;
            this.editorGrid.setVisible(false);
        });

        events.on('editor.stop', () => {
            this.playBtn.enabled = true;
            this.stopBtn.enabled = false;
            this.editorGrid.setVisible(true);
        });

        // Selection changes
        events.on('selection.changed', (data: any) => {
            // Update highlights
            if (data.previous) {
                this.removeHighlight(data.previous.id);
            }
            if (data.current) {
                this.addHighlight(data.current.id);
            }

            // Update camera preview if selected object has a camera component
            const scene = this.engine.getScene();
            if (scene && data.current) {
                const camera = data.current.getComponent(Camera);
                this.cameraPreview.setCamera(camera);
            } else {
                this.cameraPreview.setCamera(null);
            }

            // Refresh panels
            this.refresh();
        });

        // Project scene changes
        events.on('project.sceneChanged', (data: any) => {
            console.log('🎨 EditorUI: Handling scene change event');

            // Load the new scene into the engine
            this.engine.loadScene(data.scene);

            // Re-add editor objects (grid, gizmos, etc.)
            this.reAddEditorObjects();

            // Update camera preview with new scene
            if (this.cameraPreview) {
                this.cameraPreview.updateScene(data.scene);
            }

            // Update camera gizmo with new scene
            if (this.cameraGizmo) {
                this.cameraGizmo.dispose();
                this.cameraGizmo = new CameraGizmo(
                    data.scene.getThreeScene(),
                    data.scene,
                    this.engine
                );
            }

            // Refresh UI
            this.refresh();
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
     * Re-add editor objects to the current scene.
     */
    private reAddEditorObjects(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const threeScene = scene.getThreeScene();

        // Re-add default lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        threeScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 7.5);
        threeScene.add(directionalLight);

        // Re-add editor grid
        this.editorGrid.addToScene(threeScene);

        // Recreate camera gizmo with new scene
        this.cameraGizmo = new CameraGizmo(threeScene, scene, this.engine);

        // Re-add viewport gizmo
        if (this.viewportGizmo) {
            threeScene.add(this.viewportGizmo.getObject3D());
        }

        console.log('✅ Editor objects re-added to scene');
    }

    // ========== TOOLBAR HANDLERS ==========

    private onAddCube(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const cube = GameObjectFactory.createCube('Cube');
        scene.addGameObject(cube);
        this.engine.events.fire('scene.hierarchyChanged');
    }

    private onAddSphere(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const sphere = GameObjectFactory.createSphere('Sphere');
        scene.addGameObject(sphere);
        this.engine.events.fire('scene.hierarchyChanged');
    }

    private onAddEmpty(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const empty = GameObjectFactory.createEmpty('Empty');
        scene.addGameObject(empty);
        this.engine.events.fire('scene.hierarchyChanged');
    }

    private async onNewProject(): Promise<void> {
        const name = prompt('Project name:', 'MyProject');
        if (!name) return;

        // Request directory access
        const success = await this.fileSystem.openDirectory();
        if (!success) {
            console.log('New project cancelled');
            return;
        }

        this.project = new Project(name, this.fileSystem, this.engine.events);
        const created = await this.project.create();

        if (!created) {
            alert('Failed to create project. Check console for errors.');
            this.project = null;
            return;
        }

        this.assetManager.setProject(this.project);
        this.projectPanel.setAssetManager(this.assetManager);

        console.log('📁 New project created:', name);
    }

    private async onOpenProject(): Promise<void> {
        // Request directory access
        const success = await this.fileSystem.openDirectory();
        if (!success) {
            console.log('Open project cancelled');
            return;
        }

        // Create project instance
        this.project = new Project('LoadedProject', this.fileSystem, this.engine.events);

        // Try to load project
        const loaded = await this.project.load();
        if (!loaded) {
            alert('This directory does not appear to be a valid project.\n\nUse "New Project" to create a project in this folder.');
            this.project = null;
            return;
        }

        this.assetManager.setProject(this.project);
        this.projectPanel.setAssetManager(this.assetManager);

        // Load the first scene (or default scene)
        const sceneNames = this.project.getSceneNames();
        if (sceneNames.length > 0) {
            const firstScenePath = this.project.getScenePath(sceneNames[0]);
            if (firstScenePath) {
                const scene = await this.project.loadScene(firstScenePath);
                if (scene) {
                    this.project.setCurrentScene(scene, firstScenePath);
                }
            }
        }

        console.log('📂 Project opened:', this.project.name);
    }

    private async onSaveProject(): Promise<void> {
        if (!this.project) {
            console.warn('No project to save');
            return;
        }

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

        console.log('💾 Project saved');
    }

    /**
     * Update FPS display
     */
    updateStats(fps: number): void {
        const isPlaying = this.engine.events.invoke('editor.isPlaying');
        const mode = isPlaying ? 'PLAYING' : 'EDITOR';
        this.statsLabel.text = `FPS: ${fps} | Mode: ${mode}`;
    }

    /**
     * Manual refresh (for external calls - same pattern as 7.1)
     */
    refresh(): void {
        this.hierarchyPanel.refresh();
        this.inspectorPanel.refresh();
    }

    private addHighlight(objectId: string): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const go = scene.findById(objectId);
        if (!go) return;

        const object3D = go.getObject3D();
        object3D.userData.selected = true;
    }

    private removeHighlight(objectId: string): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const go = scene.findById(objectId);
        if (!go) return;

        const object3D = go.getObject3D();
        object3D.userData.selected = false;
    }

    getEngine(): Engine {
        return this.engine;
    }

    /**
     * Update editor systems (called every frame)
     */
    update(): void {
        // Update camera gizmo
        if (this.cameraGizmo) {
            this.cameraGizmo.update();
        }

        // Update viewport gizmo to follow camera
        const camera = this.engine.getRenderer().getCamera();
        this.viewportGizmo.update(camera);

        // Only show viewport gizmo in editor mode
        this.viewportGizmo.setVisible(!this.engine.isPlaying);

        // Render camera preview
        this.cameraPreview.render();
    }

    /**
     * Handle viewport gizmo click
     */
    handleViewportGizmoClick(raycaster: THREE.Raycaster): boolean {
        return this.viewportGizmo.handleClick(raycaster);
    }

    /**
     * Get the asset manager
     */
    getAssetManager(): AssetManager {
        return this.assetManager;
    }

    /**
     * Get the current project
     */
    getProject(): Project | null {
        return this.project;
    }

    /**
     * Get the file system manager
     */
    getFileSystem(): FileSystemManager {
        return this.fileSystem;
    }
}
