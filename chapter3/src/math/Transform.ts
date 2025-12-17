import * as THREE from 'three';

/**
 * Transform class - encapsulates position, rotation, and scale
 * This will later become a component, but for now it's a utility class
 */
export class Transform {
    public position: THREE.Vector3;
    public rotation: THREE.Euler;
    public scale: THREE.Vector3;
    
    // Link to a Three.js object
    private object3D: THREE.Object3D | null = null;

    constructor(position?: THREE.Vector3, rotation?: THREE.Euler, scale?: THREE.Vector3) {
        this.position = position ? position.clone() : new THREE.Vector3(0, 0, 0);
        this.rotation = rotation ? rotation.clone() : new THREE.Euler(0, 0, 0);
        this.scale = scale ? scale.clone() : new THREE.Vector3(1, 1, 1);
    }
    
    /**
     * Link this transform to a Three.js Object3D
     */
    public linkToObject3D(object: THREE.Object3D): void {
        this.object3D = object;
        this.syncToObject3D();
    }
    
    /**
     * Sync our transform values to the linked Object3D
     */
    public syncToObject3D(): void {
        if (this.object3D) {
            this.object3D.position.copy(this.position);
            this.object3D.rotation.copy(this.rotation);
            this.object3D.scale.copy(this.scale);
        }
    }
    
    /**
     * Sync from the linked Object3D to our transform values
     */
    public syncFromObject3D(): void {
        if (this.object3D) {
            this.position.copy(this.object3D.position);
            this.rotation.copy(this.object3D.rotation);
            this.scale.copy(this.object3D.scale);
        }
    }
    
    /**
     * Translate (move) by a vector
     */
    public translate(translation: THREE.Vector3): void {
        this.position.add(translation);
        this.syncToObject3D();
    }
    
    /**
     * Rotate by euler angles (in radians)
     */
    public rotate(rotation: THREE.Euler): void {
        this.rotation.x += rotation.x;
        this.rotation.y += rotation.y;
        this.rotation.z += rotation.z;
        this.syncToObject3D();
    }
    
    /**
     * Look at a target position
     */
    public lookAt(target: THREE.Vector3): void {
        if (this.object3D) {
            this.object3D.lookAt(target);
            this.syncFromObject3D();
        }
    }
    
    /**
     * Get the forward direction (local -Z axis in world space)
     */
    public getForward(): THREE.Vector3 {
        const forward = new THREE.Vector3(0, 0, -1);
        if (this.object3D) {
            forward.applyQuaternion(this.object3D.quaternion);
        }
        return forward.normalize();
    }
    
    /**
     * Get the right direction (local +X axis in world space)
     */
    public getRight(): THREE.Vector3 {
        const right = new THREE.Vector3(1, 0, 0);
        if (this.object3D) {
            right.applyQuaternion(this.object3D.quaternion);
        }
        return right.normalize();
    }
    
    /**
     * Get the up direction (local +Y axis in world space)
     */
    public getUp(): THREE.Vector3 {
        const up = new THREE.Vector3(0, 1, 0);
        if (this.object3D) {
            up.applyQuaternion(this.object3D.quaternion);
        }
        return up.normalize();
    }
    
    /**
     * Clone this transform
     */
    public clone(): Transform {
        return new Transform(this.position, this.rotation, this.scale);
    }
}

