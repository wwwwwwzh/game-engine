import { Container, Button, Label, Panel } from '@playcanvas/pcui';
import '@playcanvas/pcui/styles'; // Import PCUI dark theme
import type { Engine } from '../core/Engine';
import { Scene } from '../core/Scene';
import { HierarchyPanel } from './HierarchyPanel';
import { InspectorPanel } from './InspectorPanel';
import { ProjectPanel } from './ProjectPanel';
import { EditorCameraController } from './EditorCameraController';
import { EditorGrid } from './EditorGrid';
import { CameraGizmo } from './CameraGizmo';
import { CameraPreview } from './CameraPreview';
import { ViewportGizmo } from './ViewportGizmo';
import { TransformGizmoManager } from './TransformGizmoManager';
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
    private scene: Scene;

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

    // Add property
    private transformGizmoManager: TransformGizmoManager;

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

        this.scene = engine.getScene()!;
        const events = engine.events;

        // Create PCUI panels (pass Events bus, not Observer)
        this.hierarchyPanel = new HierarchyPanel(events, this.scene);
        this.inspectorPanel = new InspectorPanel(events, this.scene);
        this.projectPanel = new ProjectPanel();

        // Create project system
        this.fileSystem = new FileSystemManager();
        this.assetManager = new AssetManager();

        // Build PCUI layout
        this.rootContainer = this.buildLayout();

        // Create editor tools (same as 7.1)
        this.editorCameraController = new EditorCameraController(engine);
        engine.setEditorCamera(this.editorCameraController);

        // --- INSERT THIS BLOCK ---
        // Create Gizmo Manager
        this.transformGizmoManager = new TransformGizmoManager(
            engine.getRenderer().getCamera(),
            document.getElementById('game-canvas')!, // The canvas element
            this.scene.getThreeScene(),
            this.editorCameraController,
            engine.events
        );
        // -------------------------

        this.editorGrid = new EditorGrid();
        this.editorGrid.addToScene(this.scene.getThreeScene());

        this.viewportGizmo = new ViewportGizmo();
        this.cameraPreview = new CameraPreview(this.scene, engine);

        // Setup gizmo click callback
        this.viewportGizmo.onAlign((direction, viewName) => {
            this.editorCameraController.alignToView(direction, viewName);
        });

        // Pass viewport gizmo to editor camera controller
        this.editorCameraController.setViewportGizmo(this.viewportGizmo);

        // Add gizmo to scene
        this.scene.getThreeScene().add(this.viewportGizmo.getObject3D());

        // Create camera gizmo
        this.cameraGizmo = new CameraGizmo(this.scene.getThreeScene(), this.scene, engine);

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
            flexDirection: 'column',
            width: '100%',
            height: '100%'
        });

        const upper = new Container({
            id: 'editor-root',
            flex: true,
            flexDirection: 'row',
            width: '100%',
            height: '100%',
        });


        // Center: Toolbar + Viewport
        const centerPanel = new Container({
            flex: true,
            flexDirection: 'column',
            flexGrow: 1
        });
        centerPanel.append(this.createToolbar());
        const viewport = this.createViewport();
        centerPanel.append(viewport);

        // Add floating gizmo toolbar to viewport
        const gizmoToolbar = this.createGizmoToolbar();
        viewport.dom.appendChild(gizmoToolbar.dom);

        upper.append(this.hierarchyPanel.getElement());
        upper.append(centerPanel);
        upper.append(this.inspectorPanel.getElement());
        root.append(upper);
        root.append(this.projectPanel.getElement());

        // Mount to DOM
        const app = document.getElementById('app')!;
        app.appendChild(root.dom);

        // Force a resize after the layout is mounted to fix initial blur
        requestAnimationFrame(() => {
            const viewport = centerPanel.dom.querySelector('#viewport') as HTMLElement;
            if (viewport) {
                const width = viewport.clientWidth;
                const height = viewport.clientHeight;
                this.engine.getRenderer().onResize(width, height);
                console.log(`🔧 Initial viewport resize: ${width}x${height}`);
            }
        });

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

        const addPlayerBtn = new Button({ text: '+ Player' });
        addPlayerBtn.on('click', () => this.onAddPlayer());

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
        toolbar.append(addPlayerBtn);
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
            flexGrow: 1,
        });

        let canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'game-canvas';
        }

        // Make canvas fill the container
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        viewport.dom.appendChild(canvas);

        // Handle resize
        viewport.on('resize', () => {
            const width = viewport.dom.clientWidth;
            const height = viewport.dom.clientHeight;
            this.engine.getRenderer().onResize(width, height);
        });

        return viewport;
    }

    /**
     * Create floating gizmo toolbar
     */
    private createGizmoToolbar(): Container {
        const gizmoToolbar = new Container({
            flex: true,
            flexDirection: 'row',
            // width: 300,
            height: 40,
            class: 'gizmo-toolbar'
        });

        // Position it at the bottom of the viewport
        gizmoToolbar.dom.style.position = 'absolute';
        gizmoToolbar.dom.style.bottom = '10px';
        gizmoToolbar.dom.style.left = '50%';
        gizmoToolbar.dom.style.transform = 'translateX(-50%)';
        gizmoToolbar.dom.style.zIndex = '1000';
        gizmoToolbar.dom.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        gizmoToolbar.dom.style.borderRadius = '5px';
        gizmoToolbar.dom.style.padding = '5px';

        // Create gizmo buttons
        const moveBtn = new Button({ text: '✚ Move (W)' });
        moveBtn.on('click', () => this.transformGizmoManager.setMode('translate'));

        const rotateBtn = new Button({ text: '↻ Rotate (E)' });
        rotateBtn.on('click', () => this.transformGizmoManager.setMode('rotate'));

        const scaleBtn = new Button({ text: '⤢ Scale (R)' });
        scaleBtn.on('click', () => this.transformGizmoManager.setMode('scale'));

        const spaceBtn = new Button({ text: '🌐 World/Local (Q)' });
        spaceBtn.on('click', () => {
            // Toggle logic
            this.transformGizmoManager.setSpace(
                (spaceBtn.text as string).includes('World') ? 'local' : 'world'
            );
            // Update button text
            spaceBtn.text = (spaceBtn.text as string).includes('World') ? '📦 Local (Q)' : '🌐 World (Q)';
        });

        // Add buttons to toolbar
        gizmoToolbar.append(moveBtn);
        gizmoToolbar.append(rotateBtn);
        gizmoToolbar.append(scaleBtn);
        gizmoToolbar.append(spaceBtn);

        // Make it draggable
        this.makeDraggable(gizmoToolbar.dom);

        return gizmoToolbar;
    }

    /**
     * Make an element draggable
     */
    private makeDraggable(element: HTMLElement): void {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        const onMouseDown = (e: MouseEvent) => {
            // Allow dragging from the container or its children
            if (!element.contains(e.target as Node)) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            // Get the current position relative to the viewport
            const rect = element.getBoundingClientRect();
            const viewportRect = element.parentElement!.getBoundingClientRect();
            initialLeft = rect.left - viewportRect.left;
            initialTop = rect.top - viewportRect.top;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
            element.style.cursor = 'grabbing';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Set absolute positioning
            element.style.left = `${initialLeft + deltaX}px`;
            element.style.top = `${initialTop + deltaY}px`;
            element.style.transform = 'none'; // Remove centering transform
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            element.style.cursor = 'grab';
        };

        element.addEventListener('mousedown', onMouseDown);
        element.style.cursor = 'grab';
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

            this.transformGizmoManager.attach(data.current);

            // Update camera preview if selected object has a camera component
            if (this.scene && data.current) {
                const camera = data.current.getComponent(Camera);
                this.cameraPreview.setCamera(camera);
            } else {
                this.cameraPreview.setCamera(null);
            }
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

            if (this.transformGizmoManager) {
                this.transformGizmoManager.updateScene(data.scene.getThreeScene());
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
        this.engine.events.fire('editor.objectAdded', cube);
    }

    private onAddSphere(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const sphere = GameObjectFactory.createSphere('Sphere');
        scene.addGameObject(sphere);
        this.engine.events.fire('editor.objectAdded', sphere);
    }

    private onAddPlayer(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const empty = GameObjectFactory.createPlayer('Empty');
        scene.addGameObject(empty);
        this.engine.events.fire('editor.objectAdded', empty);
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

        // Update gizmo manager
        this.transformGizmoManager.update();

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
