import * as THREE from '../three';
import type { Engine } from '../core/Engine';
import type { InputManager } from '../core/InputManager';
import type { Scene } from '../core/Scene';
import { EditorObjectRegistry } from './EditorObjectRegistry';
import type { ViewportGizmo } from './ViewportGizmo';

/**
 * EditorCameraController - Professional viewport navigation.
 *
 * Position-Target System Explained:
 * ================================
 * Instead of just storing camera position + rotation, we store:
 * - position: Where camera IS
 * - target: What camera is LOOKING AT
 * - distance: How far apart they are
 *
 * This makes operations intuitive:
 * - Orbit: Rotate position around target (target stays fixed)
 * - Pan: Move both position and target together
 * - Zoom: Change distance, recalculate position
 * - Frame: Set target to object, calculate new position
 *
 * We use spherical coordinates (yaw, pitch, distance) which convert to:
 * position = target + (distance * direction_from_angles)
 *
 * Controls:
 * - Middle mouse drag: Pan (move position and target together)
 * - Right mouse drag: Orbit/Look (rotate around target)
 * - Mouse wheel: Zoom (change distance)
 * - Alt + Left drag: Orbit around target
 * - F key: Frame selected object
 * - Right mouse + WASD/QE: Fly mode (Q=down, E=up)
 */
export class EditorCameraController {
    private engine: Engine;
    private camera: THREE.PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    private raycaster: THREE.Raycaster;
    private viewportGizmo: ViewportGizmo | null = null;

    // Position-target system
    private position: THREE.Vector3;
    private target: THREE.Vector3;  // What we're looking at
    private distance: number = 10;  // Distance from target

    // Rotation state (spherical coordinates for easy orbiting)
    private yaw: number = 0;    // Horizontal rotation (radians)
    private pitch: number = 0;  // Vertical rotation (radians)

    // Settings
    private panSpeed: number = 0.01;
    private rotateSpeed: number = 0.005;
    private zoomSpeed: number = 0.1;
    private flySpeed: number = 10;

    // Input state
    private isMiddleMouseDown: boolean = false;
    private isRightMouseDown: boolean = false;
    private isAltDown: boolean = false;

    // Interpolation state
    private isInterpolating: boolean = false;
    private interpolationStartPosition: THREE.Vector3 = new THREE.Vector3();
    private interpolationEndPosition: THREE.Vector3 = new THREE.Vector3();
    private interpolationStartTarget: THREE.Vector3 = new THREE.Vector3();
    private interpolationEndTarget: THREE.Vector3 = new THREE.Vector3();
    private interpolationStartQuaternion: THREE.Quaternion = new THREE.Quaternion();
    private interpolationEndQuaternion: THREE.Quaternion = new THREE.Quaternion();
    private interpolationElapsed: number = 0;
    private interpolationDuration: number = 1;

    // 1. ADD THIS PROPERTY
    public enabled: boolean = true;

    constructor(engine: Engine) {
        this.engine = engine;
        this.camera = engine.getRenderer().getCamera();
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.raycaster = new THREE.Raycaster();

        // Initialize camera position and target
        this.position = new THREE.Vector3(0, 0, this.distance);
        this.target = new THREE.Vector3(0, 0, 0);

        // Calculate initial yaw/pitch from position
        this.updateYawPitchFromPosition();

        // Set initial camera transform
        this.updateCameraTransform();

        // Setup canvas click listener for object selection
        this.setupClickListener();

        console.log('🎥 Editor camera controller initialized');
        console.log('   Position-target system: orbit, pan, zoom all feel natural');
        console.log('   Click handling: viewport selection integrated');
    }

    /**
     * Set the viewport gizmo reference (called by EditorUI)
     */
    public setViewportGizmo(gizmo: ViewportGizmo): void {
        this.viewportGizmo = gizmo;
    }

    /**
     * Setup click listener for object selection
     */
    private setupClickListener(): void {
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    }

    /**
     * Handle canvas clicks for object selection
     */
    private onCanvasClick(e: MouseEvent): void {
        // Only handle clicks in editor mode
        if (this.engine.isPlaying) return;

        const input = this.engine.getInputManager();
        const mouse = input.getNormalizedMousePosition();

        // Perform raycast
        this.raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), this.camera);

        // Check if viewport gizmo was clicked first (priority over scene objects)
        if (this.viewportGizmo && this.viewportGizmo.handleClick(this.raycaster)) {
            return; // Gizmo handled the click, don't process further
        }

        const scene = this.engine.getScene();
        if (!scene) return;

        // Get all renderable objects in the scene
        const threeScene = scene.getThreeScene();
        const intersects = this.raycaster.intersectObjects(threeScene.children, true);

        if (intersects.length > 0) {
            // Filter out editor-only objects (grid, axes, helpers)
            let clickedObject3D = null;
            for (const intersect of intersects) {
                const obj = intersect.object;
                // Skip editor helpers
                if (EditorObjectRegistry.isEditorObject(obj)) {
                    continue;
                }
                clickedObject3D = obj;
                break;
            }

            if (!clickedObject3D) {
                // Only hit editor objects, treat as empty space
                this.engine.events.fire('selection.set', null);
                return;
            }

            // Find the GameObject that owns this mesh
            const gameObject = this.findGameObjectForObject3D(clickedObject3D, scene);

            if (gameObject) {
                // Check if Shift is held for multi-selection
                const isMultiSelect = input.isKeyDown('Shift');

                if (isMultiSelect) {
                    // Multi-select: add to selection
                    this.engine.events.fire('selection.add', gameObject);
                } else {
                    // Single selection
                    this.engine.events.fire('selection.set', gameObject);
                }
            }
        } else {
            // Clicked empty space - deselect
            this.engine.events.fire('selection.set', null);
        }
    }

    /**
     * Find the GameObject that owns a given Object3D.
     * The Object3D might be a Mesh (child), so we traverse up to find the GameObject's root Object3D.
     */
    private findGameObjectForObject3D(object3D: THREE.Object3D, scene: Scene): any {
        let current = object3D;

        // Traverse up to find the root Object3D (the one directly in the scene)
        while (current.parent && current.parent !== scene.getThreeScene()) {
            current = current.parent;
        }

        // Now find the GameObject that owns this Object3D
        const allGameObjects = scene.getAllGameObjects();
        for (const go of allGameObjects) {
            if (go.getObject3D() === current) {
                return go;
            }
        }

        return null;
    }

    /**
     * Update camera every frame
     */
    public update(deltaTime: number): void {
        // 2. ADD THIS CHECK AT THE VERY TOP
        if (!this.enabled || this.engine.isPlaying) return;

        const input = this.engine.getInputManager();
        const mouseDelta = input.getMouseDelta();

        // Track mouse buttons
        this.isMiddleMouseDown = input.isMouseButtonDown(1);
        this.isRightMouseDown = input.isMouseButtonDown(2);
        this.isAltDown = input.isKeyDown('Alt');

        // Handle different navigation modes
        if (this.isMiddleMouseDown) {
            // Middle mouse: Pan
            this.handlePan(mouseDelta);
        } else if (this.isAltDown && input.isMouseButtonDown(0)) {
            // Alt + Left mouse: Orbit around target
            this.handleOrbit(mouseDelta);
        } else if (this.isRightMouseDown) {
            // Right mouse: Look/Orbit OR Fly mode with WASD/QE
            if (this.isMoving(input)) {
                this.handleFly(deltaTime, mouseDelta, input);
            } else {
                this.handleLook(mouseDelta);
            }
        }

        // Mouse wheel: Zoom
        this.handleZoom(input);

        // F key: Frame selected object
        if (input.getKeyDown('f')) {
            this.frameSelectedObject();
        }

        // Update camera transform
        this.updateCameraTransform();
    }

    /**
     * Pan camera (move parallel to view plane)
     * Both position AND target move together
     */
    private handlePan(mouseDelta: { x: number; y: number }): void {
        // Get camera's right and up vectors
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();

        right.setFromMatrixColumn(this.camera.matrix, 0); // Right vector
        up.setFromMatrixColumn(this.camera.matrix, 1);    // Up vector

        // Pan based on mouse delta
        const panX = -mouseDelta.x * this.panSpeed * this.distance;
        const panY = mouseDelta.y * this.panSpeed * this.distance;

        // Move both target and position (maintaining their relationship)
        this.target.addScaledVector(right, panX);
        this.target.addScaledVector(up, panY);
        this.position.addScaledVector(right, panX);
        this.position.addScaledVector(up, panY);
    }

    /**
     * Orbit camera around target
     * Position changes, target stays fixed
     */
    private handleOrbit(mouseDelta: { x: number; y: number }): void {
        this.yaw += mouseDelta.x * this.rotateSpeed;
        this.pitch += mouseDelta.y * this.rotateSpeed;

        // Clamp pitch to avoid gimbal lock
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

        // Update position based on spherical coordinates
        // position = target + offset (calculated from yaw/pitch/distance)
        this.updatePositionFromYawPitch();
    }

    /**
     * Look around (orbit, but move target with camera)
     * Both position and target change to maintain distance
     */
    private handleLook(mouseDelta: { x: number; y: number }): void {
        this.yaw += mouseDelta.x * this.rotateSpeed;
        this.pitch += mouseDelta.y * this.rotateSpeed;

        // Clamp pitch
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

        // what direction is camera looking at
        const direction = new THREE.Vector3();
        direction.x = Math.cos(this.pitch) * Math.sin(this.yaw);
        direction.y = - Math.sin(this.pitch);
        direction.z = - Math.cos(this.pitch) * Math.cos(this.yaw);

        this.target.copy(this.position).addScaledVector(direction, this.distance);
        // console.log('   Look: target updated to', this.target);
        // console.log(' yaw:', this.yaw, 'pitch:', this.pitch);
    }

    /**
     * Fly mode (WASD/QE with right mouse held)
     * Q = move down, E = move up (like swimming/flying in games)
     */
    private handleFly(deltaTime: number, mouseDelta: { x: number; y: number }, input: any): void {
        // Update look direction
        this.handleLook(mouseDelta);

        // Get movement direction vectors
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();

        this.camera.getWorldDirection(forward);
        right.setFromMatrixColumn(this.camera.matrix, 0);

        // WASD/QE movement
        let moveDir = new THREE.Vector3();

        if (input.isKeyDown('w')) moveDir.add(forward);
        if (input.isKeyDown('s')) moveDir.sub(forward);
        if (input.isKeyDown('d')) moveDir.add(right);
        if (input.isKeyDown('a')) moveDir.sub(right);
        if (input.isKeyDown('e')) moveDir.y += 1;  // Up
        if (input.isKeyDown('q')) moveDir.y -= 1;  // Down

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            const speed = input.isKeyDown('Shift') ? this.flySpeed * 3 : this.flySpeed;

            // Move both position and target (maintaining their relationship)
            this.position.addScaledVector(moveDir, speed * deltaTime);
            this.target.addScaledVector(moveDir, speed * deltaTime);
        }
    }

    /**
     * Zoom (move closer/farther from target)
     * Only distance changes, angles stay the same
     */
    private handleZoom(input: any): void {
        const wheelDelta = input.getMouseWheelDelta();

        if (wheelDelta !== 0) {
            // Zoom in/out by changing distance
            const zoomFactor = 1 + (wheelDelta * this.zoomSpeed * 0.001);
            this.distance *= zoomFactor;
            this.distance = Math.max(0.1, Math.min(1000, this.distance));

            // Recalculate position from new distance
            this.updatePositionFromYawPitch();
        }
    }

    /**
     * Frame selected object (F key)
     * Set target to object position, adjust distance to fit
     */
    private frameSelectedObject(): void {
        const scene = this.engine.getScene();
        if (!scene) return;

        // Get selected object from events
        const go = this.engine.events.invoke('selection.get');
        if (!go) {
            // No selection, frame world origin
            this.target.set(0, 0, 0);
            this.distance = 10;
            this.updatePositionFromYawPitch();
            return;
        }

        // Set target to object position
        const worldPos = go.transform.getWorldPosition();
        this.target.copy(worldPos);

        // Calculate distance based on current camera position to object
        const currentDistance = this.position.distanceTo(worldPos);

        // Use current distance, or a minimum of 5 if very close
        this.distance = Math.max(currentDistance, 5);

        this.updatePositionFromYawPitch();
    }

    /**
     * Check if movement keys are pressed
     */
    private isMoving(input: any): boolean {
        return input.isKeyDown('w') ||
               input.isKeyDown('a') ||
               input.isKeyDown('s') ||
               input.isKeyDown('d') ||
               input.isKeyDown('q') ||
               input.isKeyDown('e');
    }

    /**
     * Update position from yaw/pitch (spherical to cartesian)
     * This is the core math: position = target + offset
     * where offset comes from spherical coordinates
     */
    private updatePositionFromYawPitch(): void {
        // Spherical to Cartesian conversion
        this.position.x = this.target.x - this.distance * Math.cos(this.pitch) * Math.sin(this.yaw);
        this.position.y = this.target.y + this.distance * Math.sin(this.pitch);
        this.position.z = this.target.z + this.distance * Math.cos(this.pitch) * Math.cos(this.yaw);
    }

    /**
     * Update yaw/pitch from current position (cartesian to spherical)
     * Used when initializing or setting camera position directly
     */
    private updateYawPitchFromPosition(): void {
        const offset = new THREE.Vector3().subVectors(this.position, this.target);
        this.distance = offset.length();

        // Cartesian to Spherical conversion
        this.yaw = Math.atan2(offset.x, offset.z);
        this.pitch = Math.asin(offset.y / this.distance);
    }


    /**
     * Apply camera transform (position + look at target)
     * @param interpolate If true, starts interpolating to current position/target
     * @param duration Duration of interpolation in seconds (if interpolate is true)
     */
    private updateCameraTransform(interpolate: boolean = false, duration: number = 1): void {
        if (interpolate && !this.isInterpolating) {
            // Schedule interpolation
            this.isInterpolating = true;
            this.interpolationElapsed = 0;
            this.interpolationDuration = Math.max(duration, 0.01);

            // Store current camera state as start point
            this.interpolationStartPosition.copy(this.camera.position);
            this.interpolationStartQuaternion.copy(this.camera.quaternion);

            // Store target state as end point
            this.interpolationEndPosition.copy(this.position);
            this.interpolationEndTarget.copy(this.target);
            
            // Calculate what the end quaternion should be when looking at target from position
            const tempCamera = new THREE.PerspectiveCamera();
            tempCamera.position.copy(this.position);
            tempCamera.lookAt(this.target);
            this.interpolationEndQuaternion.copy(tempCamera.quaternion);
        }

        // Update interpolation timing if active
        if (this.isInterpolating) {
            this.interpolationElapsed += (1 / 60); // Approximate deltaTime, could be passed if needed
        }

        let displayPosition = this.position;
        let displayQuaternion = this.camera.quaternion;

        // If interpolating, calculate interpolated position and rotation
        if (this.isInterpolating && this.interpolationElapsed < this.interpolationDuration) {
            const progress = this.interpolationElapsed / this.interpolationDuration;
            // Use smooth easing (ease-in-out cubic)
            const easeT = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            displayPosition = new THREE.Vector3().lerpVectors(
                this.interpolationStartPosition,
                this.interpolationEndPosition,
                easeT
            );
            
            // Use spherical linear interpolation (slerp) for smooth rotation
            displayQuaternion = new THREE.Quaternion().slerpQuaternions(
                this.interpolationStartQuaternion,
                this.interpolationEndQuaternion,
                easeT
            );
        } else if (this.isInterpolating && this.interpolationElapsed >= this.interpolationDuration) {
            // Interpolation complete
            displayPosition = this.interpolationEndPosition;
            displayQuaternion = this.interpolationEndQuaternion;
            this.isInterpolating = false;
            this.updateYawPitchFromPosition();
        }

        this.camera.position.copy(displayPosition);
        this.camera.quaternion.copy(displayQuaternion);
        this.camera.lookAt(this.target);
        this.camera.updateMatrixWorld(true);
    }

    /**
     * Get current target position
     */
    public getTarget(): THREE.Vector3 {
        return this.target.clone();
    }

    /**
     * Set camera position and target directly
     */
    public setPositionAndTarget(position: THREE.Vector3, target: THREE.Vector3): void {
        this.position.copy(position);
        this.target.copy(target);
        this.updateYawPitchFromPosition();
        this.updateCameraTransform();
    }

    /**
     * Align camera to a specific view direction
     * @param direction The direction to view from (e.g., [1,0,0] for right view)
     * @param viewName The name of the view (for logging)
     */
    public alignToView(direction: THREE.Vector3, viewName: string): void {
        // Position camera in the given direction from the target
        this.position.copy(this.target).addScaledVector(direction, this.distance);

        // Update yaw/pitch to match new position
        this.updateYawPitchFromPosition();
        this.updateCameraTransform(true,0.4);

        console.log(`📐 Camera aligned to ${viewName} view`);
    }
}
