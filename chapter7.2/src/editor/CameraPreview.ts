import * as THREE from 'three/webgpu';
import { Camera } from '../components/Camera';
import type { Scene } from '../core/Scene';
import type { Engine } from '../core/Engine';
import { Container, Label } from '@playcanvas/pcui';

/**
 * CameraPreview - Shows a non-interactive preview of a selected camera
 * Displays at bottom right of the viewport when a camera component is selected
 *
 * Now uses PCUI for consistent styling and proper resize handling
 */
export class CameraPreview {
    private previewContainer: Container;
    private previewCanvas: HTMLCanvasElement;
    private previewRenderer: THREE.WebGPURenderer | null = null;
    private currentCamera: Camera | null = null;
    private isInitialized: boolean = false;
    private scene: Scene;
    private engine: Engine;
    private canvasContainer: Container;
    private readonly PREVIEW_WIDTH = 320;
    private readonly PREVIEW_HEIGHT = 180;

    constructor(scene: Scene, engine: Engine) {
        this.scene = scene;
        this.engine = engine;

        // Create PCUI preview container
        this.previewContainer = new Container({
            id: 'camera-preview',
            class: 'camera-preview',
            width: this.PREVIEW_WIDTH,
            height: this.PREVIEW_HEIGHT
        });

        // Apply custom styling
        this.previewContainer.dom.style.position = 'absolute';
        this.previewContainer.dom.style.bottom = '20px';
        this.previewContainer.dom.style.right = '20px';
        this.previewContainer.dom.style.border = '2px solid #4CAF50';
        this.previewContainer.dom.style.borderRadius = '4px';
        this.previewContainer.dom.style.overflow = 'hidden';
        this.previewContainer.dom.style.backgroundColor = '#1a1a1a';
        this.previewContainer.dom.style.display = 'none';
        this.previewContainer.dom.style.zIndex = '1000';
        this.previewContainer.dom.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.5)';

        // Create label
        const label = new Label({
            text: 'Camera Preview',
            class: 'camera-preview-label'
        });
        label.dom.style.position = 'absolute';
        label.dom.style.top = '0';
        label.dom.style.left = '0';
        label.dom.style.right = '0';
        label.dom.style.padding = '4px 8px';
        label.dom.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
        label.dom.style.color = 'white';
        label.dom.style.fontSize = '12px';
        label.dom.style.fontWeight = 'bold';
        label.dom.style.zIndex = '1001';
        this.previewContainer.append(label);

        // Create canvas container
        this.canvasContainer = new Container({
            class: 'camera-preview-canvas-container'
        });
        this.canvasContainer.dom.style.width = '100%';
        this.canvasContainer.dom.style.height = '100%';
        this.canvasContainer.dom.style.display = 'block';

        // Create preview canvas
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.style.width = '100%';
        this.previewCanvas.style.height = '100%';
        this.previewCanvas.style.display = 'block';
        this.canvasContainer.dom.appendChild(this.previewCanvas);

        this.previewContainer.append(this.canvasContainer);

        // Add to viewport container (will be added by EditorUI)
        const viewportContainer = document.getElementById('viewport');
        if (viewportContainer) {
            viewportContainer.appendChild(this.previewContainer.dom);
        }

        // Initialize renderer with proper size
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

            // Set size with proper pixel ratio to avoid blur
            this.previewRenderer.setSize(this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT);
            this.previewRenderer.setPixelRatio(window.devicePixelRatio);
            this.previewRenderer.setClearColor(new THREE.Color(0x1a1a1a), 1.0);

            await this.previewRenderer.init();
            this.isInitialized = true;

            console.log('📷 Camera preview renderer initialized');
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
            this.previewContainer.dom.style.display = 'block';

            // Ensure renderer is properly sized when showing preview
            if (this.isInitialized && this.previewRenderer) {
                requestAnimationFrame(() => {
                    this.previewRenderer!.setSize(this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT);
                    this.previewRenderer!.setPixelRatio(window.devicePixelRatio);
                });
            }
        } else {
            this.previewContainer.dom.style.display = 'none';
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
            this.previewContainer.dom.style.display = 'none';
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
        const parent = this.previewContainer.dom.parentNode;
        if (parent) {
            parent.removeChild(this.previewContainer.dom);
        }
    }

    /**
     * Get the PCUI container for this preview
     */
    public getContainer(): Container {
        return this.previewContainer;
    }
}
