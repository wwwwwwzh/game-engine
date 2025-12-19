import * as THREE from 'three/webgpu';
import type { Engine } from '../core/Engine';
import type { EditorUI } from './EditorUI';
import type { Scene } from '../core/Scene';

/**
 * ViewportSelector - Handles clicking objects in the 3D viewport.
 * Uses raycasting to convert 2D mouse clicks to 3D object selection.
 */
export class ViewportSelector {
    private engine: Engine;
    private editorUI: EditorUI;
    private raycaster: THREE.Raycaster;
    private canvas: HTMLCanvasElement;

    constructor(engine: Engine, editorUI: EditorUI) {
        this.engine = engine;
        this.editorUI = editorUI;
        this.raycaster = new THREE.Raycaster();
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen for clicks on canvas
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    }

    private onCanvasClick(e: MouseEvent): void {
        // Only handle clicks in editor mode
        if (this.engine.isPlaying) return;

        const input = this.engine.getInputManager();
        const mouse = input.getNormalizedMousePosition();

        // Perform raycast
        const camera = this.engine.getRenderer().getCamera();
        this.raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);

        // Check if viewport gizmo was clicked first (priority over scene objects)
        if (this.editorUI.handleViewportGizmoClick(this.raycaster)) {
            return; // Gizmo handled the click, don't process further
        }

        const scene = this.engine.getScene();
        if (!scene) return;

        // Get all renderable objects in the scene
        const threeScene = scene.getThreeScene();
        const intersects = this.raycaster.intersectObjects(threeScene.children, true);

        if (intersects.length > 0) {
            // Filter out editor-only objects (grid, axes, helpers)
            let clickedObject3D = null;
            for (const intersect of intersects) {
                const obj = intersect.object;
                // Skip editor helpers - check the object and its parents
                if (this.isEditorHelper(obj)) {
                    continue;
                }
                clickedObject3D = obj;
                break;
            }

            if (!clickedObject3D) {
                // Only hit editor objects, treat as empty space
                this.editorUI.selectObject(null);
                return;
            }

            // Find the GameObject that owns this mesh
            const gameObject = this.findGameObjectForObject3D(clickedObject3D, scene);

            if (gameObject) {
                // Check if Shift is held for multi-selection
                const isMultiSelect = input.isKeyDown('Shift');

                if (isMultiSelect) {
                    // TODO: Implement multi-selection in Chapter 5.1
                    console.log('Multi-select not yet implemented');
                } else {
                    // Single selection
                    this.editorUI.selectObject(gameObject.id);
                }
            }
        } else {
            // Clicked empty space - deselect
            this.editorUI.selectObject(null);
        }
    }

    /**
     * Check if an object is an editor helper (grid, axes, lights, etc.)
     */
    private isEditorHelper(object: THREE.Object3D): boolean {
        // Check if this object or any parent is an editor helper
        let current: THREE.Object3D | null = object;
        while (current) {
            if (current.name === 'EditorGrid' ||
                current.name === 'EditorAxes' ||
                current.type === 'GridHelper' ||
                current.type === 'AxesHelper' ||
                current.type === 'DirectionalLight' ||
                current.type === 'AmbientLight') {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    /**
     * Find the GameObject that owns a given Object3D.
     * The Object3D might be a Mesh (child), so we traverse up to find the GameObject's root Object3D.
     */
    private findGameObjectForObject3D(object3D: THREE.Object3D, scene: Scene): any {
        let current = object3D;

        // Traverse up to find the root Object3D (the one directly in the scene)
        while (current.parent && current.parent !== scene.getThreeScene()) {
            current = current.parent;
        }

        // Now find the GameObject that owns this Object3D
        const allGameObjects = scene.getAllGameObjects();
        for (const go of allGameObjects) {
            if (go.getObject3D() === current) {
                return go;
            }
        }

        return null;
    }
}
