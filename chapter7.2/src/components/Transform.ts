import * as THREE from 'three/webgpu';
import { Component } from './Component';

/**
 * Transform component - thin wrapper around Three.js Object3D.
 * Delegates all transform operations directly to Object3D.
 * Three.js handles all matrix calculations automatically.
 */
export class Transform extends Component {
    // Three.js Object3D - single source of truth for transforms
    public object3D!: THREE.Object3D;

    public getTypeName(): string {
        return 'Transform';
    }

    // ===== LOCAL SPACE (relative to parent) =====

    public get localPosition(): THREE.Vector3 {
        return this.object3D.position;
    }

    public set localPosition(value: THREE.Vector3) {
        this.object3D.position.copy(value);
    }

    public get localRotation(): THREE.Euler {
        return this.object3D.rotation;
    }

    public set localRotation(value: THREE.Euler) {
        this.object3D.rotation.copy(value);
    }

    public get localScale(): THREE.Vector3 {
        return this.object3D.scale;
    }

    public set localScale(value: THREE.Vector3) {
        this.object3D.scale.copy(value);
    }

    // ===== WORLD SPACE (absolute) =====

    /**
     * Get world position (absolute position in scene)
     */
    public get position(): THREE.Vector3 {
        const worldPos = new THREE.Vector3();
        this.object3D.getWorldPosition(worldPos);
        return worldPos;
    }

    /**
     * Set world position
     */
    public set position(value: THREE.Vector3) {
        if (!this.object3D.parent) {
            // No parent, local = world
            this.object3D.position.copy(value);
        } else {
            // Has parent - convert world to local
            const localPos = this.object3D.parent.worldToLocal(value.clone());
            this.object3D.position.copy(localPos);
        }
    }

    /**
     * Get world rotation
     */
    public getWorldQuaternion(): THREE.Quaternion {
        const worldQuat = new THREE.Quaternion();
        this.object3D.getWorldQuaternion(worldQuat);
        return worldQuat;
    }

    /**
     * Get world scale
     */
    public getWorldScale(): THREE.Vector3 {
        const worldScale = new THREE.Vector3();
        this.object3D.getWorldScale(worldScale);
        return worldScale;
    }

    // ===== CONVENIENCE ACCESSORS =====
    // For backward compatibility, position/rotation/scale map to local values

    public get rotation(): THREE.Euler {
        return this.object3D.rotation;
    }

    public set rotation(value: THREE.Euler) {
        this.object3D.rotation.copy(value);
    }

    public get scale(): THREE.Vector3 {
        return this.object3D.scale;
    }

    public set scale(value: THREE.Vector3) {
        this.object3D.scale.copy(value);
    }

    // ===== HELPER METHODS =====

    /**
     * Get world position (same as position getter, for consistency)
     */
    public getWorldPosition(): THREE.Vector3 {
        const worldPos = new THREE.Vector3();
        this.object3D.getWorldPosition(worldPos);
        return worldPos;
    }

    /**
     * Get forward direction (local -Z axis in world space)
     */
    public getForward(): THREE.Vector3 {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.object3D.quaternion);
        return forward.normalize();
    }

    /**
     * Get right direction (local +X axis in world space)
     */
    public getRight(): THREE.Vector3 {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.object3D.quaternion);
        return right.normalize();
    }

    /**
     * Get up direction (local +Y axis in world space)
     */
    public getUp(): THREE.Vector3 {
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(this.object3D.quaternion);
        return up.normalize();
    }

    /**
     * Look at a target position
     */
    public lookAt(target: THREE.Vector3): void {
        this.object3D.lookAt(target);
    }

    /**
     * Serialize transform data
     */
    public serialize(): any {
        return {
            type: this.getTypeName(),
            enabled: this.enabled,
            position: {
                x: this.localPosition.x,
                y: this.localPosition.y,
                z: this.localPosition.z
            },
            rotation: {
                x: this.localRotation.x,
                y: this.localRotation.y,
                z: this.localRotation.z
            },
            scale: {
                x: this.localScale.x,
                y: this.localScale.y,
                z: this.localScale.z
            }
        };
    }

    /**
     * Deserialize transform data
     */
    public deserialize(data: any): void {
        super.deserialize(data);

        if (data.position) {
            this.object3D.position.set(data.position.x, data.position.y, data.position.z);
        }
        if (data.rotation) {
            this.object3D.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        }
        if (data.scale) {
            this.object3D.scale.set(data.scale.x, data.scale.y, data.scale.z);
        }
    }
}
