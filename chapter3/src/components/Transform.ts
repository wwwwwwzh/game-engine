import * as THREE from 'three';
import { Component } from '../core/Component';

/**
 * Transform component - position, rotation, scale.
 * Every GameObject has exactly one Transform.
 * 
 * This is ENGINE code - works in both editor and runtime.
 * In editor, Transform can be manipulated with gizmos.
 * In runtime, Transform is controlled by game logic.
 */
export class Transform extends Component {
    /**
     * Local position (relative to parent)
     */
    public position: THREE.Vector3;
    
    /**
     * Local rotation (Euler angles in radians)
     */
    public rotation: THREE.Euler;
    
    /**
     * Local scale
     */
    public scale: THREE.Vector3;
    
    /**
     * Three.js Object3D for rendering
     * This is created when MeshRenderer is added
     */
    public object3D: THREE.Object3D | null = null;
    
    constructor() {
        super();
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.scale = new THREE.Vector3(1, 1, 1);
    }
    
    /**
     * Update the Three.js object if it exists
     */
    public updateObject3D(): void {
        if (this.object3D) {
            this.object3D.position.copy(this.position);
            this.object3D.rotation.copy(this.rotation);
            this.object3D.scale.copy(this.scale);
        }
    }
    
    /**
     * Link a Three.js Object3D to this transform
     */
    public linkObject3D(object: THREE.Object3D): void {
        this.object3D = object;
        this.updateObject3D();
    }
    
    /**
     * Translate (move) by a vector
     */
    public translate(translation: THREE.Vector3): void {
        this.position.add(translation);
        this.updateObject3D();
    }
    
    /**
     * Rotate by Euler angles
     */
    public rotate(rotation: THREE.Euler): void {
        this.rotation.x += rotation.x;
        this.rotation.y += rotation.y;
        this.rotation.z += rotation.z;
        this.updateObject3D();
    }
    
    /**
     * Look at a target position
     */
    public lookAt(target: THREE.Vector3): void {
        if (this.object3D) {
            this.object3D.lookAt(target);
            this.rotation.copy(this.object3D.rotation);
        }
    }
    
    /**
     * Get world position (accounting for parent hierarchy)
     */
    public getWorldPosition(): THREE.Vector3 {
        if (this.object3D) {
            const worldPos = new THREE.Vector3();
            this.object3D.getWorldPosition(worldPos);
            return worldPos;
        }
        return this.position.clone();
    }
    
    /**
     * Get forward direction (local -Z axis in world space)
     */
    public getForward(): THREE.Vector3 {
        if (this.object3D) {
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(this.object3D.quaternion);
            return forward.normalize();
        }
        return new THREE.Vector3(0, 0, -1);
    }
    
    /**
     * Get right direction (local +X axis in world space)
     */
    public getRight(): THREE.Vector3 {
        if (this.object3D) {
            const right = new THREE.Vector3(1, 0, 0);
            right.applyQuaternion(this.object3D.quaternion);
            return right.normalize();
        }
        return new THREE.Vector3(1, 0, 0);
    }
    
    /**
     * Get up direction (local +Y axis in world space)
     */
    public getUp(): THREE.Vector3 {
        if (this.object3D) {
            const up = new THREE.Vector3(0, 1, 0);
            up.applyQuaternion(this.object3D.quaternion);
            return up.normalize();
        }
        return new THREE.Vector3(0, 1, 0);
    }
}
