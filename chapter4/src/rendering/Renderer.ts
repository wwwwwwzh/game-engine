import * as THREE from 'three';
import { exponentialDecayVector3 } from '../math/Vector3Utils';
import type { Scene } from '../core/Scene';
import { MeshRenderer } from '../components/MeshRenderer';

/**
 * Manages the Three.js renderer, scene, camera, and rendering pipeline.
 * 
 * This is ENGINE code - works in both editor and runtime.
 */
export class Renderer {
    private renderer: THREE.WebGLRenderer;
    private threeScene: THREE.Scene;  // Renamed to avoid confusion with our Scene class
    private camera: THREE.PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    
    // Current scene being rendered
    private currentScene: Scene | null = null;
    
    // Smooth camera movement
    private targetCameraPosition: THREE.Vector3;
    private cameraDecayRate: number = 5.0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        
        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x1a1a1a, 1.0);
        
        // Create Three.js scene (for rendering)
        this.threeScene = new THREE.Scene();
        
        // Create camera
        const fov = 75;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1;
        const far = 1000;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.x = 5;
        this.camera.position.y = 5;
        this.camera.position.z = 5;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        
        this.targetCameraPosition = this.camera.position.clone();
        
        // Add default lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.threeScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 7.5);
        this.threeScene.add(directionalLight);
        
        console.log('🎨 Renderer initialized');
    }
    
    /**
     * Set the scene to render
     */
    public setScene(scene: Scene): void {
        // Clear old scene from Three.js
        if (this.currentScene) {
            this.clearThreeScene();
        }
        
        this.currentScene = scene;
        
        // Add all GameObjects with MeshRenderer to Three.js scene
        this.syncSceneToThree();
        
        console.log(`🎬 Renderer now rendering scene: ${scene.name}`);
    }
    
    /**
     * Sync our Scene's GameObjects to the Three.js scene
     */
    private syncSceneToThree(): void {
        if (!this.currentScene) return;

        // Only add root objects to the Three.js scene
        // Children will be added to their parents
        const rootObjects = this.currentScene.getRootGameObjects();

        for (const gameObject of rootObjects) {
            this.syncGameObjectHierarchy(gameObject);
        }
    }

    /**
     * Recursively sync a GameObject and its children to the Three.js hierarchy
     */
    private syncGameObjectHierarchy(gameObject: any): void {
        const meshRenderer = gameObject.getComponent(MeshRenderer);
        if (meshRenderer) {
            const mesh = meshRenderer.getMesh();
            if (mesh) {
                // Add to scene if root, or to parent if child
                if (!gameObject.parent) {
                    // Root object - add to scene
                    if (!this.threeScene.children.includes(mesh)) {
                        this.threeScene.add(mesh);
                    }
                } else {
                    // Child object - add to parent's mesh
                    const parentRenderer = gameObject.parent.getComponent(MeshRenderer);
                    if (parentRenderer) {
                        const parentMesh = parentRenderer.getMesh();
                        if (parentMesh && !parentMesh.children.includes(mesh)) {
                            parentMesh.add(mesh);
                        }
                    }
                }
            }
        }

        // Recursively sync children
        for (const child of gameObject.children) {
            this.syncGameObjectHierarchy(child);
        }
    }
    
    /**
     * Clear the Three.js scene
     */
    private clearThreeScene(): void {
        // Remove all meshes (but keep lights)
        const objectsToRemove: THREE.Object3D[] = [];
        
        this.threeScene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                objectsToRemove.push(object);
            }
        });
        
        for (const object of objectsToRemove) {
            this.threeScene.remove(object);
        }
    }
    
    /**
     * Update (called every frame)
     */
    public update(deltaTime: number): void {
        // Smooth camera movement
        this.camera.position.copy(
            exponentialDecayVector3(
                this.camera.position,
                this.targetCameraPosition,
                this.cameraDecayRate,
                deltaTime
            )
        );
        
        // Re-sync scene in case new objects were added
        if (this.currentScene) {
            this.syncSceneToThree();
            // Sync all transforms to their Object3D
            this.syncTransforms();
        }
    }
    
    /**
     * Sync all Transform components to their Object3D
     */
    private syncTransforms(): void {
        if (!this.currentScene) return;
        
        const allObjects = this.currentScene.getAllGameObjects();
        for (const gameObject of allObjects) {
            const transform = gameObject.transform;
            if (transform.object3D) {
                transform.updateObject3D();
            }
        }
    }
    
    /**
     * Render the current frame
     */
    public render(): void {
        this.renderer.render(this.threeScene, this.camera);
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
     * Set the target camera position
     */
    public setCameraTarget(position: THREE.Vector3): void {
        this.targetCameraPosition.copy(position);
    }
    
    /**
     * Clean up
     */
    public dispose(): void {
        this.clearThreeScene();
        this.renderer.dispose();
        console.log('🗑️  Renderer disposed');
    }
}

