import * as THREE from '../three';
import { Component } from './Component';

/**
 * Camera component - wraps Three.js camera.
 * Added as CHILD of GameObject's Object3D (like MeshRenderer).
 *
 * Standard properties:
 * - fieldOfView (fov)
 * - nearClipPlane (near)
 * - farClipPlane (far)
 * - aspect (calculated from viewport)
 */
export class Camera extends Component {
    public threeCamera: THREE.PerspectiveCamera;

    // Camera properties
    private _fieldOfView: number = 60;
    private _nearClipPlane: number = 0.1;
    private _farClipPlane: number = 100;

    constructor() {
        super();

        // Create Three.js camera with default values
        const aspect = window.innerWidth / window.innerHeight;
        this.threeCamera = new THREE.PerspectiveCamera(
            this._fieldOfView,
            aspect,
            this._nearClipPlane,
            this._farClipPlane
        );

        // Important: Camera will be added as CHILD of GameObject's Object3D
        this.threeCamera.name = 'Camera';
    }

    public awake(): void {
        // Add camera as child of GameObject's Object3D
        // This way, camera inherits GameObject's transform
        this.gameObject.getObject3D().add(this.threeCamera);

        console.log(`📷 Camera added to ${this.gameObject.name}`);
    }

    /**
     * Get the underlying Three.js camera
     */
    public getThreeCamera(): THREE.PerspectiveCamera {
        return this.threeCamera;
    }

    // ===== STANDARD CAMERA API =====

    /**
     * Field of view in degrees (vertical)
     */
    public get fieldOfView(): number {
        return this._fieldOfView;
    }

    public set fieldOfView(value: number) {
        this._fieldOfView = value;
        this.threeCamera.fov = value;
        this.threeCamera.updateProjectionMatrix();
    }

    /**
     * Near clipping plane distance
     */
    public get nearClipPlane(): number {
        return this._nearClipPlane;
    }

    public set nearClipPlane(value: number) {
        this._nearClipPlane = value;
        this.threeCamera.near = value;
        this.threeCamera.updateProjectionMatrix();
    }

    /**
     * Far clipping plane distance
     */
    public get farClipPlane(): number {
        return this._farClipPlane;
    }

    public set farClipPlane(value: number) {
        this._farClipPlane = value;
        this.threeCamera.far = value;
        this.threeCamera.updateProjectionMatrix();
    }

    /**
     * Aspect ratio (read-only, set by viewport)
     */
    public get aspect(): number {
        return this.threeCamera.aspect;
    }

    /**
     * Update aspect ratio when viewport size changes
     */
    public setAspect(aspect: number): void {
        this.threeCamera.aspect = aspect;
        this.threeCamera.updateProjectionMatrix();
    }

    /**
     * Get world-space ray from screen position (for raycasting)
     * @param screenPos Normalized screen position (-1 to 1)
     */
    public screenPointToRay(screenPos: THREE.Vector2): THREE.Ray {
        const ray = new THREE.Ray();
        const origin = new THREE.Vector3();
        const direction = new THREE.Vector3();

        // Get ray origin and direction
        this.threeCamera.getWorldPosition(origin);
        direction.set(screenPos.x, screenPos.y, 0.5);
        direction.unproject(this.threeCamera);
        direction.sub(origin).normalize();

        ray.set(origin, direction);
        return ray;
    }

    public getTypeName(): string {
        return 'Camera';
    }

    public serialize(): any {
        return {
            ...super.serialize(),
            fieldOfView: this._fieldOfView,
            nearClipPlane: this._nearClipPlane,
            farClipPlane: this._farClipPlane
        };
    }

    public deserialize(data: any): void {
        super.deserialize(data);

        if (data.fieldOfView !== undefined) this.fieldOfView = data.fieldOfView;
        if (data.nearClipPlane !== undefined) this.nearClipPlane = data.nearClipPlane;
        if (data.farClipPlane !== undefined) this.farClipPlane = data.farClipPlane;
    }

    public onDestroy(): void {
        // Remove camera from GameObject's Object3D
        if (this.gameObject) {
            this.gameObject.getObject3D().remove(this.threeCamera);
        }
    }
}
