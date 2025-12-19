import * as THREE from 'three/webgpu';
import type { Engine } from '../core/Engine';
import { HierarchyPanel } from './HierarchyPanel';
import { InspectorPanel } from './InspectorPanel';
import { SceneSerializer } from '../core/SceneSerializer';
import { GameObjectFactory } from '../core/GameObjectFactory';
import { GameObject } from '../core/GameObject';
import { ViewportSelector } from './ViewportSelector';
import { EditorCameraController } from './EditorCameraController';
import { EditorGrid } from './EditorGrid';
import { CameraGizmo } from './CameraGizmo';
import { CameraPreview } from './CameraPreview';
import { ViewportGizmo } from './ViewportGizmo';
import { Camera } from '../components/Camera';
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

    // Project system components
    private projectPanel: ProjectPanel;
    private project: Project | null = null;
    private fileSystem: FileSystemManager;
    private assetManager: AssetManager;

    private playButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private addCubeButton: HTMLButtonElement;
    private addSphereButton: HTMLButtonElement;
    private addEmptyButton: HTMLButtonElement;
    private addPlayerButton: HTMLButtonElement;
    // private saveButton: HTMLButtonElement;
    // private loadButton: HTMLButtonElement;
    private modeElement: HTMLElement;

    // Project buttons
    private openProjectButton: HTMLButtonElement;
    private newProjectButton: HTMLButtonElement;

    private selectedObjectId: string | null = null;

    constructor(engine: Engine) {
        this.engine = engine;

        this.playButton = document.getElementById('play-btn') as HTMLButtonElement;
        this.stopButton = document.getElementById('stop-btn') as HTMLButtonElement;
        this.addCubeButton = document.getElementById('add-cube-btn') as HTMLButtonElement;
        this.addSphereButton = document.getElementById('add-sphere-btn') as HTMLButtonElement;
        this.addEmptyButton = document.getElementById('add-empty-btn') as HTMLButtonElement;
        this.addPlayerButton = document.getElementById('add-player-btn') as HTMLButtonElement;
        // this.saveButton = document.getElementById('save-btn') as HTMLButtonElement;
        // this.loadButton = document.getElementById('load-btn') as HTMLButtonElement;
        this.modeElement = document.getElementById('mode') as HTMLElement;

        // Get project buttons
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

        // Initialize file system and asset manager
        this.fileSystem = new FileSystemManager();
        this.assetManager = new AssetManager();

        // Create project panel
        this.projectPanel = new ProjectPanel(this, this.assetManager);

        // Add project panel to UI
        this.addProjectPanelToUI();

        this.setupEventListeners();

        // Setup keyboard shortcuts (including Cmd/Ctrl+S)
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

        // Trigger resize to adjust canvas after adding project panel
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 0);
    }

    /**
     * Re-add editor objects to the current scene.
     * Call this after loading a new scene to restore grid, gizmos, etc.
     */
    private reAddEditorObjects(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const threeScene = scene.getThreeScene();

        // Re-add default lighting (same as Renderer constructor)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        threeScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 7.5);
        threeScene.add(directionalLight);

        // Re-add editor grid
        this.editorGrid.addToScene(threeScene);

        // Recreate camera gizmo with new scene
        this.cameraGizmo = new CameraGizmo(threeScene);

        // Re-add viewport gizmo
        if (this.viewportGizmo) {
            threeScene.add(this.viewportGizmo.getObject3D());
        }

        console.log('✅ Editor objects re-added to scene');
    }

    private setupEventListeners(): void {
        this.playButton.addEventListener('click', () => this.onPlay());
        this.stopButton.addEventListener('click', () => this.onStop());
        this.addCubeButton.addEventListener('click', () => this.onAddCube());
        this.addSphereButton.addEventListener('click', () => this.onAddSphere());
        this.addEmptyButton.addEventListener('click', () => this.onAddEmpty());
        this.addPlayerButton.addEventListener('click', () => this.onAddPlayer());

        // OLD save/load are now scene-only (will be deprecated)
        // this.saveButton.addEventListener('click', () => this.onSaveScene());
        // this.loadButton.addEventListener('click', () => this.onLoadScene());

        // Project buttons
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

    private onPlay(): void {
        this.engine.play();
        this.playButton.disabled = true;
        this.stopButton.disabled = false;
        this.modeElement.textContent = 'PLAYING';
        this.setEditingEnabled(false);

        // Hide grid in play mode
        this.editorGrid.setVisible(false);
    }

    private onStop(): void {
        this.engine.stop();
        this.playButton.disabled = false;
        this.stopButton.disabled = true;
        this.modeElement.textContent = 'EDITOR';
        this.setEditingEnabled(true);

        // Show grid in editor mode
        this.editorGrid.setVisible(true);
    }

    private setEditingEnabled(enabled: boolean): void {
        this.addCubeButton.disabled = !enabled;
        this.addSphereButton.disabled = !enabled;
        this.addEmptyButton.disabled = !enabled;
        this.addPlayerButton.disabled = !enabled;
        // this.saveButton.disabled = !enabled;
        // this.loadButton.disabled = !enabled;
    }

    private onAddCube(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const cube = GameObjectFactory.createCube();
        scene.addGameObject(cube);
        this.selectObject(cube.id);
        this.refresh();
    }

    private onAddSphere(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const sphere = GameObjectFactory.createSphere();
        scene.addGameObject(sphere);
        this.selectObject(sphere.id);
        this.refresh();
    }

    private onAddEmpty(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const empty = new GameObject('Empty');
        scene.addGameObject(empty);
        this.selectObject(empty.id);
        this.refresh();
    }

    private onAddPlayer(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const player = GameObjectFactory.createPlayer();
        player.transform.localPosition.set(0, 1, 0);  // Start above ground
        scene.addGameObject(player);
        this.selectObject(player.id);
        this.refresh();
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
                    this.reAddEditorObjects();
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
            this.reAddEditorObjects();
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

        // Visual feedback
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
        // if (!this.project) {
        //     // Fallback to old download behavior if no project
        //     const scene = this.engine.getScene();
        //     if (!scene) return;

        //     const json = SceneSerializer.serialize(scene);
        //     const blob = new Blob([json], { type: 'application/json' });
        //     const url = URL.createObjectURL(blob);
        //     const a = document.createElement('a');
        //     a.href = url;
        //     a.download = `${scene.name}.json`;
        //     a.click();
        //     URL.revokeObjectURL(url);

        //     console.log('💾 Scene downloaded (no project open)');
        //     return;
        // }

        // // If project is open, save to project
        // await this.onSaveProject();
    }

    /**
     * Load scene only (old behavior, now part of project)
     */
    private async onLoadScene(): Promise<void> {
        // if (!this.project) {
        //     // Fallback to old upload behavior if no project
        //     const input = document.createElement('input');
        //     input.type = 'file';
        //     input.accept = '.json';

        //     input.addEventListener('change', async () => {
        //         const file = input.files?.[0];
        //         if (!file) return;

        //         const json = await file.text();
        //         const scene = this.engine.getScene();
        //         if (!scene) return;

        //         SceneSerializer.deserialize(json, scene);
        //         this.selectObject(null);
        //         this.refresh();

        //         console.log('📂 Scene loaded from file (no project open)');
        //     });

        //     input.click();
        //     return;
        // }

        // // If project is open, show scene picker
        // this.showScenePicker();
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

    public getEngine(): Engine {
        return this.engine;
    }

    public selectObject(objectId: string | null): void {
        // Remove highlight from previous selection
        if (this.selectedObjectId) {
            this.removeHighlight(this.selectedObjectId);
        }

        this.selectedObjectId = objectId;

        // Add highlight to new selection
        if (objectId) {
            this.addHighlight(objectId);
        }

        // Update camera preview if selected object has a camera component
        const scene = this.engine.getScene();
        if (scene && objectId) {
            const go = scene.findById(objectId);
            if (go) {
                const camera = go.getComponent(Camera);
                this.cameraPreview.setCamera(camera);
            } else {
                this.cameraPreview.setCamera(null);
            }
        } else {
            this.cameraPreview.setCamera(null);
        }

        this.hierarchyPanel.refresh();
        this.inspectorPanel.refresh();
    }

    private addHighlight(objectId: string): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const go = scene.findById(objectId);
        if (!go) return;

        // Get the GameObject's Object3D
        const object3D = go.getObject3D();

        // Add outline effect by increasing scale slightly and changing material
        // (This is a simple approach; a proper outline shader would be better)
        // For now, we'll just mark it - visual feedback comes from hierarchy panel
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

    public getSelectedObjectId(): string | null {
        return this.selectedObjectId;
    }

    public refresh(): void {
        this.hierarchyPanel.refresh();
        this.inspectorPanel.refresh();
    }

    public refreshInspector(): void {
        this.inspectorPanel.refresh();
    }

    public update(): void {
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
     * @param raycaster The raycaster from the click
     * @returns True if gizmo handled the click
     */
    public handleViewportGizmoClick(raycaster: THREE.Raycaster): boolean {
        return this.viewportGizmo.handleClick(raycaster);
    }

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
}
