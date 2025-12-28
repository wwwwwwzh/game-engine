import * as THREE from '../three';
import { Component } from './Component';

/**
 * MeshRenderer component - renders a 3D mesh.
 * Adds mesh as a child of GameObject's Object3D.
 *
 * This is ENGINE code - works in both editor and runtime.
 * The mesh is visible in both editor and game.
 */
export class MeshRenderer extends Component {
    private mesh: THREE.Mesh | null = null;
    private geometry: THREE.BufferGeometry | null = null;
    private material: THREE.Material | null = null;

    public getTypeName(): string {
        return 'MeshRenderer';
    }

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
            this.mesh.name = 'Mesh';

            // Add mesh as CHILD of GameObject's Object3D
            if (this.gameObject) {
                this.gameObject.getObject3D().add(this.mesh);
            }

            // Let Three.js handle matrix updates automatically
            this.mesh.matrixAutoUpdate = true;
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
            // Remove from GameObject's Object3D
            if (this.gameObject) {
                this.gameObject.getObject3D().remove(this.mesh);
            }

            // Dispose geometry and material
            if (this.geometry) {
                this.geometry.dispose();
            }
            if (this.material instanceof THREE.Material) {
                this.material.dispose();
            }
        }
    }

    /**
     * Serialize MeshRenderer data
     */
    public serialize(): any {
        const data = super.serialize();

        // Store geometry type (for recreating geometry on load)
        const geometryType = (this as any).geometryType || 'box';

        // Store material color
        let color = 0x00ff00;
        if (this.material && 'color' in this.material) {
            color = (this.material as any).color.getHex();
        }

        return {
            ...data,
            geometryType,
            color
        };
    }

    /**
     * Deserialize MeshRenderer data
     */
    public deserialize(data: any): void {
        super.deserialize(data);

        // Store geometry type for later use
        (this as any).geometryType = data.geometryType || 'box';

        // Create geometry based on type
        let geometry: THREE.BufferGeometry;
        switch (data.geometryType) {
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.5, 32, 32);
                break;
            case 'box':
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }

        const material = new THREE.MeshPhongMaterial({
            color: data.color || 0x00ff00,
            shininess: 100
        });

        this.setGeometry(geometry);
        this.setMaterial(material);
    }
}
