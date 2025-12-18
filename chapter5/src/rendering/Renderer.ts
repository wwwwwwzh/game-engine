import * as THREE from 'three/webgpu';

/**
 * Renderer - thin wrapper around Three.js WebGPURenderer.
 * Manages rendering pipeline and camera.
 * Scene provides the Three.js scene to render.
 *
 * This is ENGINE code - works in both editor and runtime.
 */
export class Renderer {
    private renderer: THREE.WebGPURenderer;
    private camera: THREE.PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    private isInitialized: boolean = false;

    constructor(canvas: HTMLCanvasElement, threeScene: THREE.Scene) {
        this.canvas = canvas;

        // Create WebGPU renderer
        this.renderer = new THREE.WebGPURenderer({
            canvas: canvas,
            antialias: true,
            forceWebGL: false  // Let it use WebGPU if available
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(new THREE.Color(0x1a1a1a), 1.0);

        // Create camera
        const fov = 75;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1;
        const far = 1000;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);

        // Add default lighting to the provided scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        threeScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 7.5);
        threeScene.add(directionalLight);

        console.log('🎨 Renderer initialized');

        // Initialize the renderer (async for WebGPU)
        this.initializeRenderer();
    }

    private async initializeRenderer(): Promise<void> {
        try {
            await this.renderer.init();
            this.isInitialized = true;

            // Check which backend is being used
            const backend = this.renderer.backend;
            console.log(`   Backend: ${backend.constructor.name}`);
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
        this.renderer.render(threeScene, this.camera);
    }

    /**
     * Handle window resize
     */
    public onResize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Get the Three.js camera
     */
    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }

    /**
     * Clean up
     */
    public dispose(): void {
        this.renderer.dispose();
        console.log('🗑️  Renderer disposed');
    }
}
