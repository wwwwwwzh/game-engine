import { Component } from './Component';
import type { Events } from '../events';

/**
 * SplatMeshComponent - Integrates Spark.js SplatMesh into the game engine
 * 
 * This component allows you to add 3D Gaussian Splatting objects (like the butterfly)
 * to GameObjects in your scene.
 */
export class SplatMeshComponent extends Component {
    private splatMesh: any = null; // Will be set after dynamic import
    private url: string;
    private loaded: boolean = false;
    private isInitialized: boolean = false;

    constructor(url: string = 'https://sparkjs.dev/assets/splats/butterfly.spz') {
        super();
        this.url = url;
    }

    /**
     * Get the SplatMesh instance
     */
    public getSplatMesh(): any {
        return this.splatMesh;
    }

    /**
     * Check if the SplatMesh is loaded
     */
    public isSplatMeshLoaded(): boolean {
        return this.loaded;
    }

    /**
     * Load and initialize the SplatMesh
     */
    private async loadSplatMesh(): Promise<void> {
        if (this.loaded || this.isInitialized) return;

        try {
            // Dynamically import Spark.js and SplatMesh using import map
            const sparkModule = await import('@sparkjsdev/spark');
            const SplatMesh = sparkModule.SplatMesh;
            
            // Create the SplatMesh instance
            this.splatMesh = new SplatMesh({ url: this.url });

            // Add as a child of the GameObject's Object3D (not directly to scene)
            // This way it follows the GameObject's transform automatically
            this.gameObject.getObject3D().add(this.splatMesh);

            this.splatMesh.raycast = () => {}

            // Store the original raycast function
            // const originalRaycast = this.splatMesh.raycast.bind(this.splatMesh);

            // // Wrap raycast to handle errors gracefully
            // // Spark's raycast uses WebAssembly which may not be ready immediately
            // this.splatMesh.raycast = (raycaster: any, intersects: any[]) => {
            //     try {
            //         originalRaycast(raycaster, intersects);
            //     } catch (error) {
            //         console.warn('SplatMesh raycast error:', error);
            //         // Silently ignore raycast errors (WASM might not be ready yet)
            //         // The parent GameObject's Object3D can still be clicked
            //     }
            // };

            this.loaded = true;
            this.isInitialized = true;

            console.log(`🦋 SplatMesh loaded: ${this.url}`);
        } catch (error) {
            console.error('Failed to load SplatMesh:', error);
            throw error;
        }
    }

    /**
     * Override the Component's start method
     */
    public async start(): Promise<void> {
        await this.loadSplatMesh();
    }


    /**
     * Override the Component's onDestroy method
     */
    public onDestroy(): void {
        if (this.splatMesh) {
            // Remove from parent (GameObject's Object3D)
            this.splatMesh.removeFromParent();

            // Dispose of resources
            if (this.splatMesh.dispose) {
                this.splatMesh.dispose();
            }
        }

        this.splatMesh = null;
        this.loaded = false;
        this.isInitialized = false;
    }

    /**
     * Override serialize to include URL
     */
    public serialize(): any {
        const base = super.serialize();
        return {
            ...base,
            url: this.url
        };
    }

    /**
     * Override deserialize to restore URL
     */
    public deserialize(data: any): void {
        super.deserialize(data);
        if (data.url) {
            this.url = data.url;
        }
    }
}