import * as THREE from 'three';
import { Component } from './Component';

/**
 * Transform component handles position, rotation, and scale.
 * Supports hierarchical transforms (local vs. world space).
 */
export class Transform extends Component {
    // Local space values (relative to parent)
    private _localPosition: THREE.Vector3 = new THREE.Vector3();
    private _localRotation: THREE.Euler = new THREE.Euler();
    private _localScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

    // Cached world matrix
    private _worldMatrix: THREE.Matrix4 = new THREE.Matrix4();
    private _worldMatrixDirty: boolean = true;

    // Three.js Object3D for rendering
    public object3D: THREE.Object3D | null = null;

    public getTypeName(): string {
        return 'Transform';
    }

    // ===== LOCAL SPACE (relative to parent) =====

    public get localPosition(): THREE.Vector3 {
        return this._localPosition;
    }

    public set localPosition(value: THREE.Vector3) {
        this._localPosition.copy(value);
        this.markDirty();
    }

    public get localRotation(): THREE.Euler {
        return this._localRotation;
    }

    public set localRotation(value: THREE.Euler) {
        this._localRotation.copy(value);
        this.markDirty();
    }

    public get localScale(): THREE.Vector3 {
        return this._localScale;
    }

    public set localScale(value: THREE.Vector3) {
        this._localScale.copy(value);
        this.markDirty();
    }

    // ===== WORLD SPACE (absolute) =====

    /**
     * Get world position (absolute position in scene)
     */
    public get position(): THREE.Vector3 {
        if (!this.gameObject?.parent) {
            return this._localPosition;
        }

        const worldPos = new THREE.Vector3();
        this.getWorldMatrix().decompose(worldPos, new THREE.Quaternion(), new THREE.Vector3());
        return worldPos;
    }

    /**
     * Set world position
     */
    public set position(value: THREE.Vector3) {
        if (!this.gameObject?.parent) {
            this._localPosition.copy(value);
        } else {
            // Convert world position to local
            const parentWorldMatrix = this.gameObject.parent.transform.getWorldMatrix();
            const parentInverse = parentWorldMatrix.clone().invert();
            const localPos = value.clone().applyMatrix4(parentInverse);
            this._localPosition.copy(localPos);
        }
        this.markDirty();
    }

    /**
     * Get the local transformation matrix
     */
    public getLocalMatrix(): THREE.Matrix4 {
        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion().setFromEuler(this._localRotation);
        matrix.compose(this._localPosition, quaternion, this._localScale);
        return matrix;
    }

    /**
     * Get the world transformation matrix
     */
    public getWorldMatrix(): THREE.Matrix4 {
        if (this._worldMatrixDirty) {
            this.updateWorldMatrix();
        }
        return this._worldMatrix;
    }

    /**
     * Update the cached world matrix
     */
    private updateWorldMatrix(): void {
        const localMatrix = this.getLocalMatrix();

        if (this.gameObject?.parent) {
            const parentMatrix = this.gameObject.parent.transform.getWorldMatrix();
            this._worldMatrix.multiplyMatrices(parentMatrix, localMatrix);
        } else {
            this._worldMatrix.copy(localMatrix);
        }

        this._worldMatrixDirty = false;
    }

    /**
     * Mark the world matrix as needing recalculation
     */
    public markDirty(): void {
        this._worldMatrixDirty = true;

        // Mark all children dirty too
        if (this.gameObject) {
            for (const child of this.gameObject.children) {
                child.transform.markDirty();
            }
        }
    }

    // ===== CONVENIENCE ACCESSORS =====
    // For backward compatibility, position/rotation/scale map to local values

    public get rotation(): THREE.Euler {
        return this._localRotation;
    }

    public set rotation(value: THREE.Euler) {
        this._localRotation.copy(value);
        this.markDirty();
    }

    public get scale(): THREE.Vector3 {
        return this._localScale;
    }

    public set scale(value: THREE.Vector3) {
        this._localScale.copy(value);
        this.markDirty();
    }

    // ===== THREE.JS OBJECT3D INTEGRATION =====

    /**
     * Update the Three.js object if it exists
     */
    public updateObject3D(): void {
        if (this.object3D) {
            this.object3D.position.copy(this._localPosition);
            this.object3D.rotation.copy(this._localRotation);
            this.object3D.scale.copy(this._localScale);

            // Update the matrix if matrixAutoUpdate is disabled
            if (!this.object3D.matrixAutoUpdate) {
                this.object3D.updateMatrix();
            }
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
