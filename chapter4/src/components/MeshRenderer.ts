import * as THREE from 'three';
import { Component } from './Component';

/**
 * MeshRenderer component - renders a 3D mesh.
 * 
 * This is ENGINE code - works in both editor and runtime.
 * The mesh is visible in both editor and game.
 */
export class MeshRenderer extends Component {
    private mesh: THREE.Mesh | null = null;
    private geometry: THREE.BufferGeometry | null = null;
    private material: THREE.Material | null = null;
    
    /**
     * Set the mesh geometry
     */
    public setGeometry(geometry: THREE.BufferGeometry): void {
        this.geometry = geometry;
        this.updateMesh();
    }
    
    /**
     * Set the mesh material
     */
    public setMaterial(material: THREE.Material): void {
        this.material = material;
        this.updateMesh();
    }
    
    /**
     * Update the Three.js mesh
     */
    private updateMesh(): void {
        if (!this.geometry || !this.material) return;

        // Create mesh if it doesn't exist
        if (!this.mesh) {
            this.mesh = new THREE.Mesh(this.geometry, this.material);

            // Link to transform
            if (this.gameObject?.transform) {
                this.gameObject.transform.linkObject3D(this.mesh);
            }

            // Important: Set matrixAutoUpdate to false since we're managing transforms manually
            this.mesh.matrixAutoUpdate = false;
        } else {
            // Update existing mesh
            this.mesh.geometry = this.geometry;
            this.mesh.material = this.material;
        }
    }
    
    /**
     * Get the Three.js mesh
     */
    public getMesh(): THREE.Mesh | null {
        return this.mesh;
    }
    
    /**
     * Clean up
     */
    public onDestroy(): void {
        if (this.mesh) {
            // Remove from parent (Three.js scene)
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }

            // Dispose geometry and material
            this.mesh.geometry.dispose();
            if (this.mesh.material instanceof THREE.Material) {
                this.mesh.material.dispose();
            }
        }
    }
}
