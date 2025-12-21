// src/editor/GizmoManager.ts
import * as THREE from 'three/webgpu';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { EditorCameraController } from './EditorCameraController';
import type { GameObject } from '../core/GameObject';
import type { Events } from '../events';

export class TransformGizmoManager {
    private controls: TransformControls;
    private scene: THREE.Scene;
    private cameraControls: EditorCameraController;
    private events: Events;

    constructor(
        camera: THREE.Camera,
        domElement: HTMLElement,
        scene: THREE.Scene,
        cameraControls: EditorCameraController,
        events: Events
    ) {
        this.scene = scene;
        this.cameraControls = cameraControls;
        this.events = events;

        // Initialize Three.js TransformControls
        this.controls = new TransformControls(camera, domElement);

        // Add the gizmo visual helper to the scene
        this.scene.add(this.controls.getHelper());

        // EVENT: Disable camera orbit when dragging the gizmo
        this.controls.addEventListener('dragging-changed', (event) => {
            this.cameraControls.enabled = !event.value;
        });

        // EVENT: Fire event when gizmo changes for inspector updates
        this.controls.addEventListener('change', () => {
            this.events.fire('transform.changed', { mode: this.controls.mode });
        });

        // SHORTCUTS: Listen for Q, W, E, R keys
        window.addEventListener('keydown', (event) => this.onKeyDown(event));

        this.registerEvents();
    }

    private registerEvents() {
        // this.events.on('editor.objectAdded', (gameObject: GameObject) => {
        //     // Attach gizmo to the new GameObject
        //     this.attach(gameObject);
        // });
    }

    public updateScene(scene: THREE.Scene) {
        // Remove helper from old scene
        this.dispose();
        this.scene = scene;
        // Add helper to new scene
        this.scene.add(this.controls.getHelper());
    }

    /**
     * Attach the gizmo to a specific GameObject
     */
    public attach(gameObject: GameObject | null) {
        console.log('attach', gameObject);
        if (gameObject) {
            // We attach to the underlying Three.js Object3D
            this.controls.attach(gameObject.getObject3D());
        } else {
            this.controls.detach();
        }
    }

    public setMode(mode: 'translate' | 'rotate' | 'scale') {
        this.controls.setMode(mode);
    }

    /**
     * Toggle Pivot: Local vs World space
     */
    public setSpace(space: 'local' | 'world') {
        this.controls.setSpace(space);
    }

    public update() {
        // TransformControls usually handles its own updates,
        // but if you have custom logic, put it here.
    }

    public dispose() {
        this.controls.dispose();
        this.scene.remove(this.controls.getHelper());
    }

    private onKeyDown(event: KeyboardEvent) {
        // Only handle shortcuts if not typing in an input field
        if (document.activeElement instanceof HTMLInputElement) return;

        switch (event.key.toLowerCase()) {
            case 'w': // Move
                this.controls.setMode('translate');
                break;
            case 'e': // Rotate
                this.controls.setMode('rotate');
                break;
            case 'r': // Scale
                this.controls.setMode('scale');
                break;
            case 'q': // Toggle Local/World
                this.controls.setSpace(this.controls.space === 'local' ? 'world' : 'local');
                break;
        }
    }
}