import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Asset types supported by the engine
 */
export type AssetType = 'texture' | 'model' | 'audio' | 'scene' | 'script';

/**
 * Asset metadata and loaded data
 */
export interface Asset {
    id: string;           // Unique identifier (usually the path)
    name: string;         // Display name
    type: AssetType;      // Asset type
    path: string;         // File path
    data: any;           // The loaded asset (Texture, GLTF, etc.)
    refCount: number;    // How many things reference this asset
    size?: number;       // File size in bytes (if known)
}

/**
 * AssetManager - Central hub for loading, caching, and managing all game assets.
 *
 * Features:
 * - Async loading with caching
 * - Reference counting for automatic cleanup
 * - Support for textures, models, audio, scenes
 * - Progress tracking for loading screens
 * - Memory management
 *
 * Usage:
 * ```typescript
 * const texture = await assetManager.loadTexture('Assets/Textures/player.png');
 * // Use texture...
 * assetManager.release('Assets/Textures/player.png');  // When done
 * ```
 */
export class AssetManager {
    // Asset cache: path -> Asset
    private assets: Map<string, Asset> = new Map();

    // Three.js loaders
    private textureLoader: THREE.TextureLoader;
    private gltfLoader: GLTFLoader;

    // Loading progress tracking
    private loadingCount: number = 0;
    private totalToLoad: number = 0;

    // Callbacks for loading progress
    public onLoadStart?: () => void;
    public onLoadProgress?: (loaded: number, total: number) => void;
    public onLoadComplete?: () => void;

    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = new GLTFLoader();

        console.log('📦 AssetManager initialized');
    }

    // ===== TEXTURE LOADING =====

    /**
     * Load a texture from file.
     * Returns cached version if already loaded.
     *
     * @param path Path to texture file (relative to project root or absolute URL)
     * @param name Optional display name (defaults to filename)
     * @returns Loaded texture, or null if failed
     */
    public async loadTexture(path: string, name?: string): Promise<THREE.Texture | null> {
        // Check cache first
        const cached = this.assets.get(path);
        if (cached && cached.type === 'texture') {
            cached.refCount++;
            console.log(`📦 Texture from cache: ${cached.name} (refs: ${cached.refCount})`);
            return cached.data as THREE.Texture;
        }

        // Load from disk
        try {
            this.startLoading();

            const texture = await this.textureLoader.loadAsync(path);

            // Configure texture (sensible defaults)
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = true;

            // Create asset entry
            const asset: Asset = {
                id: path,
                name: name || this.getFileNameFromPath(path),
                type: 'texture',
                path,
                data: texture,
                refCount: 1
            };

            this.assets.set(path, asset);
            this.finishLoading();

            console.log(`✅ Loaded texture: ${asset.name}`);
            return texture;

        } catch (error) {
            this.finishLoading();
            console.error(`Failed to load texture ${path}:`, error);
            return null;
        }
    }

    // ===== MODEL LOADING =====

    /**
     * Load a 3D model (GLTF/GLB format).
     * Returns a clone of cached model if already loaded.
     *
     * @param path Path to model file
     * @param name Optional display name
     * @returns Loaded model scene graph, or null if failed
     */
    public async loadModel(path: string, name?: string): Promise<THREE.Group | null> {
        // Check cache
        const cached = this.assets.get(path);
        if (cached && cached.type === 'model') {
            cached.refCount++;
            console.log(`📦 Model from cache: ${cached.name} (refs: ${cached.refCount})`);
            // Return a CLONE so each usage can be modified independently
            return cached.data.scene.clone() as THREE.Group;
        }

        // Load from disk
        try {
            this.startLoading();

            const gltf = await this.gltfLoader.loadAsync(path);

            // Create asset entry (store full GLTF, not just scene)
            const asset: Asset = {
                id: path,
                name: name || this.getFileNameFromPath(path),
                type: 'model',
                path,
                data: gltf,  // Store entire GLTF object (includes animations, cameras, etc.)
                refCount: 1
            };

            this.assets.set(path, asset);
            this.finishLoading();

            console.log(`✅ Loaded model: ${asset.name}`);
            console.log(`   Meshes: ${this.countMeshes(gltf.scene)}`);
            console.log(`   Animations: ${gltf.animations.length}`);

            // Return a clone
            return gltf.scene.clone() as THREE.Group;

        } catch (error) {
            this.finishLoading();
            console.error(`Failed to load model ${path}:`, error);
            return null;
        }
    }

    // ===== BATCH LOADING =====

    /**
     * Load multiple assets in parallel.
     * Useful for loading screens.
     *
     * @param paths Array of asset paths to load
     * @returns Map of path -> loaded asset
     */
    public async loadBatch(paths: string[]): Promise<Map<string, any>> {
        console.log(`Loading batch of ${paths.length} assets...`);

        this.totalToLoad = paths.length;
        this.loadingCount = 0;

        if (this.onLoadStart) {
            this.onLoadStart();
        }

        // Load all in parallel
        const promises = paths.map(async (path) => {
            const ext = this.getFileExtension(path);

            let asset = null;
            if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
                asset = await this.loadTexture(path);
            } else if (['.gltf', '.glb'].includes(ext)) {
                asset = await this.loadModel(path);
            }

            return [path, asset] as [string, any];
        });

        const results = await Promise.all(promises);

        if (this.onLoadComplete) {
            this.onLoadComplete();
        }

        return new Map(results);
    }

    // ===== REFERENCE COUNTING =====

    /**
     * Release a reference to an asset.
     * Decrements reference count. When count reaches 0, asset is unloaded.
     *
     * @param path Asset path
     */
    public release(path: string): void {
        const asset = this.assets.get(path);
        if (!asset) {
            console.warn(`Attempted to release unknown asset: ${path}`);
            return;
        }

        asset.refCount--;
        console.log(`Released ${asset.name} (refs: ${asset.refCount})`);

        if (asset.refCount <= 0) {
            this.unload(path);
        }
    }

    /**
     * Unload an asset from memory immediately.
     * Frees GPU memory and removes from cache.
     *
     * @param path Asset path
     */
    private unload(path: string): void {
        const asset = this.assets.get(path);
        if (!asset) return;

        // Dispose based on type
        switch (asset.type) {
            case 'texture':
                (asset.data as THREE.Texture).dispose();
                break;
            case 'model':
                // Dispose all geometries and materials in the model
                const gltf = asset.data;
                gltf.scene.traverse((object: any) => {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach((mat: THREE.Material) => mat.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
                break;
        }

        this.assets.delete(path);
        console.log(`🗑️ Unloaded asset: ${asset.name}`);
    }

    // ===== QUERIES =====

    /**
     * Get all loaded assets
     */
    public getAllAssets(): Asset[] {
        return Array.from(this.assets.values());
    }

    /**
     * Get assets of a specific type
     */
    public getAssetsByType(type: AssetType): Asset[] {
        return this.getAllAssets().filter(asset => asset.type === type);
    }

    /**
     * Get an asset by path (if loaded)
     */
    public getAsset(path: string): Asset | null {
        return this.assets.get(path) || null;
    }

    /**
     * Check if an asset is loaded
     */
    public isLoaded(path: string): boolean {
        return this.assets.has(path);
    }

    /**
     * Get total number of loaded assets
     */
    public getLoadedCount(): number {
        return this.assets.size;
    }

    /**
     * Get total memory usage (approximate, in MB)
     */
    public getMemoryUsage(): number {
        let totalBytes = 0;

        for (const asset of this.assets.values()) {
            if (asset.type === 'texture') {
                const tex = asset.data as THREE.Texture;
                if (tex.image) {
                    // RGBA = 4 bytes per pixel
                    totalBytes += tex.image.width * tex.image.height * 4;
                    // Add mipmaps (~33% more)
                    totalBytes *= 1.33;
                }
            }
            // Models are harder to estimate, skip for now
        }

        return totalBytes / (1024 * 1024);  // Convert to MB
    }

    // ===== CLEANUP =====

    /**
     * Unload all assets and clear cache.
     * Call when closing a project or scene.
     */
    public clearAll(): void {
        console.log(`Clearing all assets (${this.assets.size} total)...`);

        // Dispose all
        for (const [path, asset] of this.assets) {
            // Don't call this.unload() because it would modify the map during iteration
            switch (asset.type) {
                case 'texture':
                    (asset.data as THREE.Texture).dispose();
                    break;
                case 'model':
                    const gltf = asset.data;
                    gltf.scene.traverse((object: any) => {
                        if (object.geometry) object.geometry.dispose();
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach((m: THREE.Material) => m.dispose());
                            } else {
                                object.material.dispose();
                            }
                        }
                    });
                    break;
            }
        }

        this.assets.clear();
        console.log('✅ All assets cleared');
    }

    // ===== PRIVATE HELPERS =====

    private startLoading(): void {
        this.loadingCount++;
        if (this.onLoadProgress) {
            this.onLoadProgress(this.loadingCount, this.totalToLoad);
        }
    }

    private finishLoading(): void {
        // Progress callback handled in batch loading
    }

    private getFileNameFromPath(path: string): string {
        const parts = path.split('/');
        return parts[parts.length - 1];
    }

    private getFileExtension(path: string): string {
        const match = path.match(/\.[^.]+$/);
        return match ? match[0].toLowerCase() : '';
    }

    private countMeshes(object: THREE.Object3D): number {
        let count = 0;
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                count++;
            }
        });
        return count;
    }
}
