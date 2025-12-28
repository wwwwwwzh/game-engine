import * as THREE from '../three';
import { ENGINE_CONFIG } from '../three';

/**
 * Renderer - thin wrapper around Three.js Renderer.
 * Manages rendering pipeline and camera.
 * Scene provides the Three.js scene to render.
 *
 * This is ENGINE code - works in both editor and runtime.
 * Supports both WebGLRenderer and WebGPURenderer based on config.
 */
export class Renderer {
    private renderer: any; // Can be WebGLRenderer or WebGPURenderer depending on config
    private editorCamera: THREE.PerspectiveCamera;  // Rename camera to editorCamera
    private activeCamera: THREE.PerspectiveCamera;   // Currently active camera
    private canvas: HTMLCanvasElement;
    private isInitialized: boolean = false;

    constructor(canvas: HTMLCanvasElement, threeScene: THREE.Scene) {
        this.canvas = canvas;

        // Create renderer based on config
        if (ENGINE_CONFIG.renderer === 'webgpu') {
            this.renderer = new THREE.WebGPURenderer({
                canvas: canvas,
                antialias: true,
                forceWebGL: false  // Let it use WebGPU if available
            });
        } else {
            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
            });
        }

        // Use canvas actual size, not window size
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(new THREE.Color(0x1a1a1a), 1.0);

        // Create editor camera
        const fov = 50;
        const aspect = width / height;
        const near = 0.1;
        const far = 1000;
        this.editorCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);

        // Start with editor camera as active
        this.activeCamera = this.editorCamera;

        // Add default lighting to the provided scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        threeScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 7.5);
        threeScene.add(directionalLight);

        console.log(`🎨 Renderer initialized (${ENGINE_CONFIG.renderer})`);

        // Initialize the renderer (async for WebGPU, sync for WebGL)
        this.initializeRenderer();
        document.body.appendChild(this.renderer.domElement);
    }

    private async initializeRenderer(): Promise<void> {
        try {
            if (ENGINE_CONFIG.renderer === 'webgpu') {
                // WebGPU requires async initialization
                await (this.renderer as any).init();
                const backend = (this.renderer as any).backend;
                console.log(`   Backend: ${backend.constructor.name}`);
            } else {
                // WebGL is ready immediately
                console.log(`   Backend: WebGLRenderer`);
            }
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize renderer:', error);
        }
    }

    /**
     * Render the current frame
     * @param threeScene The Three.js scene to render
     */
    public render(threeScene: THREE.Scene): void {
        if (!this.isInitialized) return;
        this.renderer.render(threeScene, this.activeCamera);
    }

    /**
     * Handle window resize
     */
    public onResize(width: number, height: number): void {
        this.activeCamera.aspect = width / height;
        this.activeCamera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Get the editor camera
     */
    public getCamera(): THREE.PerspectiveCamera {
        return this.editorCamera;
    }

    /**
     * Get the currently active camera
     */
    public getActiveCamera(): THREE.PerspectiveCamera {
        return this.activeCamera;
    }

    /**
     * Set the active camera for rendering
     * @param camera The camera to use, or null to use editor camera
     */
    public setActiveCamera(camera: THREE.PerspectiveCamera | null): void {
        if (camera) {
            this.activeCamera = camera;
        } else {
            // Fall back to editor camera
            this.activeCamera = this.editorCamera;
        }
    }

    /**
     * Clean up
     */
    public dispose(): void {
        this.renderer.dispose();
        console.log('🗑️  Renderer disposed');
    }
}
