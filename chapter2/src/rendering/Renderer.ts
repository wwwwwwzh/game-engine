import * as THREE from 'three';
import { exponentialDecayVector3 } from '../math/Vector3Utils';

/**
 * Manages the Three.js renderer, scene, camera, and rendering pipeline.
 */
export class Renderer {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    
    // Test objects (we'll remove these in later chapters)
    private cube: THREE.Mesh | null = null;
    private rotationSpeed: number = 1.0; // radians per second
    
    // Smooth camera movement
    private targetCameraPosition: THREE.Vector3;
    private cameraDecayRate: number = 5.0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        
        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,  // Smooth edges
            alpha: false      // Opaque background
        });
        
        // Set initial size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio); // Handle retina displays
        
        // Set background color
        this.renderer.setClearColor(0x1a1a1a, 1.0); // Dark gray, fully opaque
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        const fov = 75; // Field of view in degrees
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1; // Near clipping plane
        const far = 1000; // Far clipping plane
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        
        // Position camera
        this.camera.position.x = 5; // Move camera back so we can see objects at origin
        this.camera.position.y = 5; // Move camera back so we can see objects at origin
        this.camera.position.z = 5; // Move camera back so we can see objects at origin
        this.camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at the center of the scene
        
        // Initialize target position to current camera position
        this.targetCameraPosition = this.camera.position.clone();
        
        // Initialize test scene
        this.initializeTestScene();
        
        console.log('🎨 Renderer initialized');
        console.log(`WebGL Version: ${this.renderer.capabilities.version}`);
    }
    
    /**
     * Create a test scene with a cube and lights
     * This will be replaced in later chapters with a proper scene system
     */
    private initializeTestScene(): void {
        // Create a cube
        const geometry = new THREE.BoxGeometry(2, 2, 2); // width, height, depth
        
        // Create a material with color
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,      // Green
            shininess: 100,       // How shiny (0-100+)
            specular: 0x444444    // Specular highlight color
        });
        
        // Combine geometry and material into a mesh
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);
        
        // Add ambient light (soft overall illumination)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // white, 50% intensity
        this.scene.add(ambientLight);
        
        // Add directional light (like sunlight)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // white, full intensity
        directionalLight.position.set(5, 10, 7.5); // Position it above and to the side
        this.scene.add(directionalLight);
        
        console.log('✨ Test scene created: 1 cube, 2 lights');
    }
    
    /**
     * Update scene (called every frame)
     * @param deltaTime Time since last frame in seconds
     */
    public update(deltaTime: number): void {
        // Rotate the cube
        if (this.cube) {
            // Rotate on multiple axes for interesting motion
            this.cube.rotation.x += this.rotationSpeed * deltaTime;
            this.cube.rotation.y += this.rotationSpeed * deltaTime * 0.7; // Slightly different speed
        }
        
        // Smooth camera movement using exponential decay
        this.camera.position.copy(
            exponentialDecayVector3(
                this.camera.position,
                this.targetCameraPosition,
                this.cameraDecayRate,
                deltaTime
            )
        );
    }
    
    /**
     * Render the current frame
     */
    public render(): void {
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Handle window resize
     */
    public onResize(width: number, height: number): void {
        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix(); // Must call this after changing camera properties
        
        // Update renderer size
        this.renderer.setSize(width, height);
        
        console.log(`📐 Renderer resized to ${width}x${height}`);
    }
    
    /**
     * Get the Three.js scene (for adding objects later)
     */
    public getScene(): THREE.Scene {
        return this.scene;
    }
    
    /**
     * Get the Three.js camera (for manipulation later)
     */
    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }
    
    /**
     * Set the target camera position (it will smoothly move there)
     */
    public setCameraTarget(position: THREE.Vector3): void {
        this.targetCameraPosition.copy(position);
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        // Dispose of geometries and materials
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (object.material instanceof THREE.Material) {
                    object.material.dispose();
                }
            }
        });
        
        this.renderer.dispose();
        console.log('🗑️  Renderer disposed');
    }
}


