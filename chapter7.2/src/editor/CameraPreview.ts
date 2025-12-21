import * as THREE from 'three/webgpu';
import { Camera } from '../components/Camera';
import type { Scene } from '../core/Scene';
import type { Engine } from '../core/Engine';

/**
 * CameraPreview - Shows a non-interactive preview of a selected camera
 * Displays at bottom right of the viewport when a camera component is selected
 */
export class CameraPreview {
    private previewContainer: HTMLDivElement;
    private previewCanvas: HTMLCanvasElement;
    private previewRenderer: THREE.WebGPURenderer | null = null;
    private currentCamera: Camera | null = null;
    private isInitialized: boolean = false;
    private scene: Scene;
    private engine: Engine;

    constructor(scene: Scene, engine: Engine) {
        this.scene = scene;
        this.engine = engine;
        // Create preview container
        this.previewContainer = document.createElement('div');
        this.previewContainer.id = 'camera-preview';
        this.previewContainer.style.position = 'absolute';
        this.previewContainer.style.bottom = '20px';
        this.previewContainer.style.right = '20px';
        this.previewContainer.style.width = '320px';
        this.previewContainer.style.height = '180px';
        this.previewContainer.style.border = '2px solid #4CAF50';
        this.previewContainer.style.borderRadius = '4px';
        this.previewContainer.style.overflow = 'hidden';
        this.previewContainer.style.backgroundColor = '#1a1a1a';
        this.previewContainer.style.display = 'none';
        this.previewContainer.style.zIndex = '1000';
        this.previewContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.5)';

        // Create label
        const label = document.createElement('div');
        label.textContent = 'Camera Preview';
        label.style.position = 'absolute';
        label.style.top = '0';
        label.style.left = '0';
        label.style.right = '0';
        label.style.padding = '4px 8px';
        label.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
        label.style.color = 'white';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.zIndex = '1001';
        this.previewContainer.appendChild(label);

        // Create preview canvas
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.style.width = '100%';
        this.previewCanvas.style.height = '100%';
        this.previewCanvas.style.display = 'block';
        this.previewContainer.appendChild(this.previewCanvas);

        // Add to viewport container
        const viewportContainer = document.getElementById('viewport-container');
        if (viewportContainer) {
            viewportContainer.appendChild(this.previewContainer);
        }

        // Initialize renderer
        this.initializeRenderer();

    }

    private async initializeRenderer(): Promise<void> {
        try {
            // Create WebGPU renderer for preview
            this.previewRenderer = new THREE.WebGPURenderer({
                canvas: this.previewCanvas,
                antialias: true,
                forceWebGL: false
            });

            this.previewRenderer.setSize(320, 180);
            this.previewRenderer.setPixelRatio(window.devicePixelRatio);
            this.previewRenderer.setClearColor(new THREE.Color(0x1a1a1a), 1.0);

            await this.previewRenderer.init();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize camera preview renderer:', error);
        }
    }

    /**
     * Set the camera to preview
     */
    public setCamera(camera: Camera | null): void {
        this.currentCamera = camera;

        if (camera) {
            this.previewContainer.style.display = 'block';
        } else {
            this.previewContainer.style.display = 'none';
        }
    }

    /**
     * Update the scene being previewed (called when project loads a new scene)
     */
    public updateScene(scene: Scene): void {
        this.scene = scene;
        console.log('📷 CameraPreview: Scene updated');
    }

    /**
     * Render the preview
     */
    public render(): void {
        if (!this.isInitialized || !this.previewRenderer || !this.currentCamera) {
            return;
        }

        // Only show preview in editor mode
        const isPlaying = this.engine.events.invoke('editor.isPlaying') as boolean;
        if (isPlaying) {
            this.previewContainer.style.display = 'none';
            return;
        }

        // Render the preview
        this.previewRenderer.render(
            this.scene.getThreeScene(),
            this.currentCamera.threeCamera
        );
    }

    /**
     * Clean up
     */
    public dispose(): void {
        if (this.previewRenderer) {
            this.previewRenderer.dispose();
        }
        if (this.previewContainer.parentNode) {
            this.previewContainer.parentNode.removeChild(this.previewContainer);
        }
    }
}
