import * as THREE from 'three/webgpu';
import { Camera } from '../components/Camera';
import type { Scene } from '../core/Scene';
import type { Engine } from '../core/Engine';

/**
 * CameraGizmo - Visualizes camera frustums in the editor
 * Shows the field of view and clipping planes of Camera components
 */
export class CameraGizmo {
    private gizmos: Map<Camera, THREE.CameraHelper> = new Map();
    private scene: THREE.Scene;
    private gameScene: Scene;
    private engine: Engine;

    constructor(scene: THREE.Scene, gameScene: Scene, engine: Engine) {
        this.scene = scene;
        this.gameScene = gameScene;
        this.engine = engine;
    }

    /**
     * Update gizmos for all cameras in the scene
     */
    update(): void {
        // Only show gizmos in editor mode
        const isPlaying = this.engine.events.invoke('editor.isPlaying') as boolean;
        if (isPlaying) {
            this.hideAll();
            return;
        }

        // Get all cameras in the scene
        const cameras = this.getAllCameras(this.gameScene);

        // Remove gizmos for cameras that no longer exist
        const currentCameras = new Set(cameras);
        for (const [camera, helper] of this.gizmos.entries()) {
            if (!currentCameras.has(camera)) {
                this.removeGizmo(camera);
            }
        }

        // Add or update gizmos for existing cameras
        for (const camera of cameras) {
            this.updateGizmo(camera);
        }
    }

    /**
     * Get all Camera components in the scene
     */
    private getAllCameras(scene: any): Camera[] {
        // Use the Scene's built-in findComponentsOfType method
        return scene.findComponentsOfType(Camera);
    }

    /**
     * Update or create a gizmo for a camera
     */
    private updateGizmo(camera: Camera): void {
        let helper = this.gizmos.get(camera);

        if (!helper) {
            // Create new helper
            helper = new THREE.CameraHelper(camera.threeCamera);
            helper.userData.isEditorHelper = true; // Mark as editor object

            // Set faint cyan colors for the frustum lines
            const faintCyan = new THREE.Color(0x4dd0e1);
            const faintGray = new THREE.Color(0x666666);
            helper.setColors(faintCyan, faintCyan, faintGray, faintGray, faintGray);

            this.scene.add(helper);
            this.gizmos.set(camera, helper);
        }

        // Ensure camera projection matrix is up to date
        camera.threeCamera.updateProjectionMatrix();

        // Update the helper geometry (responds to camera property changes)
        helper.update();

        // Don't show gizmo for the active rendering camera
        const renderer = this.engine.getRenderer();
        const activeCamera = renderer.getActiveCamera();
        helper.visible = activeCamera !== camera.threeCamera;
    }

    /**
     * Remove a gizmo for a camera
     */
    private removeGizmo(camera: Camera): void {
        const helper = this.gizmos.get(camera);
        if (helper) {
            this.scene.remove(helper);
            helper.dispose();
            this.gizmos.delete(camera);
        }
    }

    /**
     * Hide all gizmos (used in play mode)
     */
    private hideAll(): void {
        for (const helper of this.gizmos.values()) {
            helper.visible = false;
        }
    }

    /**
     * Clean up all gizmos
     */
    dispose(): void {
        for (const helper of this.gizmos.values()) {
            this.scene.remove(helper);
            helper.dispose();
        }
        this.gizmos.clear();
    }
}
