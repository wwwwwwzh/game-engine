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

    private playButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private addCubeButton: HTMLButtonElement;
    private addSphereButton: HTMLButtonElement;
    private addEmptyButton: HTMLButtonElement;
    private addPlayerButton: HTMLButtonElement;
    private saveButton: HTMLButtonElement;
    private loadButton: HTMLButtonElement;
    private modeElement: HTMLElement;

    private selectedObjectId: string | null = null;

    constructor(engine: Engine) {
        this.engine = engine;

        this.playButton = document.getElementById('play-btn') as HTMLButtonElement;
        this.stopButton = document.getElementById('stop-btn') as HTMLButtonElement;
        this.addCubeButton = document.getElementById('add-cube-btn') as HTMLButtonElement;
        this.addSphereButton = document.getElementById('add-sphere-btn') as HTMLButtonElement;
        this.addEmptyButton = document.getElementById('add-empty-btn') as HTMLButtonElement;
        this.addPlayerButton = document.getElementById('add-player-btn') as HTMLButtonElement;
        this.saveButton = document.getElementById('save-btn') as HTMLButtonElement;
        this.loadButton = document.getElementById('load-btn') as HTMLButtonElement;
        this.modeElement = document.getElementById('mode') as HTMLElement;

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

        this.setupEventListeners();

        console.log('🎨 Editor UI initialized');
    }

    private setupEventListeners(): void {
        this.playButton.addEventListener('click', () => this.onPlay());
        this.stopButton.addEventListener('click', () => this.onStop());
        this.addCubeButton.addEventListener('click', () => this.onAddCube());
        this.addSphereButton.addEventListener('click', () => this.onAddSphere());
        this.addEmptyButton.addEventListener('click', () => this.onAddEmpty());
        this.addPlayerButton.addEventListener('click', () => this.onAddPlayer());
        this.saveButton.addEventListener('click', () => this.onSave());
        this.loadButton.addEventListener('click', () => this.onLoad());
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
        this.saveButton.disabled = !enabled;
        this.loadButton.disabled = !enabled;
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

    private onSave(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        const json = SceneSerializer.serialize(scene);

        // Download as file
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scene.name}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('💾 Scene saved:', scene.name);
    }

    private onLoad(): void {
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

            console.log('📂 Scene loaded:', scene.name);
        });

        input.click();
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
}
