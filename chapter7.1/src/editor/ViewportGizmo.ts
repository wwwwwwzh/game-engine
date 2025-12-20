import * as THREE from 'three/webgpu';

/**
 * ViewportGizmo - A Unity-like viewport orientation gizmo.
 *
 * Structure:
 * - Central cube
 * - 6 cones pointing in each cardinal direction (+X, -X, +Y, -Y, +Z, -Z)
 *
 * Behavior:
 * - Rotates to match the viewport camera's orientation
 * - Clicking on a cone aligns the camera to that view direction
 * - Rendered as a regular Object3D in the scene
 */
export class ViewportGizmo {
    private gizmoGroup: THREE.Group;

    // Interactive cone meshes with metadata
    private cones: Array<{ mesh: THREE.Mesh; direction: THREE.Vector3; name: string }> = [];

    // Callback for camera alignment
    private onAlignCallback: ((direction: THREE.Vector3, viewName: string) => void) | null = null;

    constructor() {
        // Create the gizmo group
        this.gizmoGroup = new THREE.Group();
        this.gizmoGroup.userData.isEditorHelper = true; // Mark as editor-only object

        // Build the gizmo geometry
        this.buildGizmo();

        console.log('🧭 Viewport gizmo initialized');
    }

    /**
     * Build the gizmo: central cube + 6 cones
     */
    private buildGizmo(): void {
        // Central cube
        const cubeGeometry = new THREE.BoxGeometry(0.5,0.5,0.5);
        const cubeMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.3,
            roughness: 0.7
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.userData.isEditorHelper = true;
        this.gizmoGroup.add(cube);

        // 6 cones for the cardinal directions
        const coneGeometry = new THREE.ConeGeometry(0.12, 0.35, 8);
        const coneDistance = 0.5; // Distance from center

        const directions = [
            { dir: new THREE.Vector3(1, 0, 0), color: 0xff0000, name: 'Right', label: '+X' },   // Right (Red)
            { dir: new THREE.Vector3(-1, 0, 0), color: 0xff6666, name: 'Left', label: '-X' },   // Left (Light Red)
            { dir: new THREE.Vector3(0, 1, 0), color: 0x00ff00, name: 'Top', label: '+Y' },     // Top (Green)
            { dir: new THREE.Vector3(0, -1, 0), color: 0x66ff66, name: 'Bottom', label: '-Y' }, // Bottom (Light Green)
            { dir: new THREE.Vector3(0, 0, 1), color: 0x0000ff, name: 'Front', label: '+Z' },   // Front (Blue)
            { dir: new THREE.Vector3(0, 0, -1), color: 0x6666ff, name: 'Back', label: '-Z' },   // Back (Light Blue)
        ];

        directions.forEach((data) => {
            const material = new THREE.MeshStandardMaterial({
                color: data.color,
                metalness: 0.3,
                roughness: 0.5
            });
            const cone = new THREE.Mesh(coneGeometry, material);

            // Position the cone
            cone.position.copy(data.dir.clone().multiplyScalar(coneDistance));

            // Orient the cone to point outward
            // Cones point up by default (0, 1, 0), we need to rotate them
            const up = new THREE.Vector3(0, -1, 0);
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(up, data.dir);
            cone.quaternion.copy(quaternion);

            // Store metadata for interaction
            cone.userData.direction = data.dir.clone();
            cone.userData.viewName = data.name;
            cone.userData.isGizmoCone = true;
            cone.userData.isEditorHelper = true;

            this.cones.push({
                mesh: cone,
                direction: data.dir.clone(),
                name: data.name
            });

            this.gizmoGroup.add(cone);
        });
    }

    /**
     * Get the gizmo Object3D to add to scene
     */
    public getObject3D(): THREE.Group {
        return this.gizmoGroup;
    }

    /**
     * Update gizmo rotation and position to follow camera
     * @param camera The camera to track
     */
    public update(camera: THREE.Camera): void {
        // Position the gizmo near the camera (bottom-right corner of view)
        const offset = new THREE.Vector3();
        camera.getWorldDirection(offset);

        // Place gizmo in bottom-right corner by offsetting from camera
        // Calculate position based on camera's view
        const distance = 15; // Distance from camera
        const rightOffset = 3;
        const downOffset = 5;

        // Get camera's right and up vectors
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        right.setFromMatrixColumn(camera.matrix, 0);
        up.setFromMatrixColumn(camera.matrix, 1);

        // Position: camera + forward*distance + right*offset + down*offset
        this.gizmoGroup.position.copy(camera.position);
        this.gizmoGroup.position.addScaledVector(offset, distance);
        this.gizmoGroup.position.addScaledVector(right, rightOffset);
        this.gizmoGroup.position.addScaledVector(up, downOffset);

        // DON'T copy camera rotation - the gizmo should stay fixed in world space
        // This way the cones always point to their world-space directions
        // and the gizmo appears to rotate as you move the camera around
        this.gizmoGroup.quaternion.identity();
    }

    /**
     * Check if a click hit one of the cones
     * @param raycaster The raycaster from the click
     * @returns True if a cone was clicked
     */
    public handleClick(raycaster: THREE.Raycaster): boolean {
        const coneMeshes = this.cones.map(c => c.mesh);
        const intersects = raycaster.intersectObjects(coneMeshes, false);

        if (intersects.length > 0) {
            const firstHit = intersects[0].object;
            if (firstHit.userData.isGizmoCone) {
                const direction = firstHit.userData.direction as THREE.Vector3;
                const viewName = firstHit.userData.viewName as string;

                if (this.onAlignCallback) {
                    this.onAlignCallback(direction.clone(), viewName);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Set callback for when a direction cone is clicked
     */
    public onAlign(callback: (direction: THREE.Vector3, viewName: string) => void): void {
        this.onAlignCallback = callback;
    }

    /**
     * Set visibility of the gizmo
     */
    public setVisible(visible: boolean): void {
        this.gizmoGroup.visible = visible;
    }

    /**
     * Clean up
     */
    public dispose(): void {
        this.gizmoGroup.clear();
        this.cones = [];
    }
}
