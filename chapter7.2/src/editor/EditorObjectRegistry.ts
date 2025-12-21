import * as THREE from 'three/webgpu';

/**
 * EditorObjectRegistry - Centralized management of editor-only objects.
 *
 * Design Pattern: Registry Pattern
 * - Single source of truth for what constitutes an "editor object"
 * - Avoids code duplication across Scene and ViewportSelector
 * - Makes it easy to add new editor object types
 *
 * Usage:
 * ```typescript
 * // When creating editor objects:
 * EditorObjectRegistry.register(gridHelper);
 *
 * // When checking objects:
 * if (EditorObjectRegistry.isEditorObject(someObject)) {
 *   // It's an editor object
 * }
 * ```
 */
export class EditorObjectRegistry {
    // Set of registered editor objects (by reference)
    private static registeredObjects = new WeakSet<THREE.Object3D>();

    // Known editor object names (for objects not explicitly registered)
    private static editorObjectNames = new Set<string>([
        'EditorGrid',
        'EditorAxes',
        'ViewportGizmo',
        'CameraGizmo',
        'CameraPreview'
    ]);

    // Known editor object types (for built-in helpers)
    private static editorObjectTypes = new Set<string>([
        'GridHelper',
        'AxesHelper',
        'DirectionalLight',
        'AmbientLight',
        'HemisphereLight',
        'CameraHelper',
        'BoxHelper',
        'LineSegments'  // Often used for gizmos
    ]);

    /**
     * Register an object as an editor-only object.
     * Also marks it with userData.isEditorObject = true.
     */
    public static register(object: THREE.Object3D): void {
        this.registeredObjects.add(object);
        object.userData.isEditorObject = true;
    }

    /**
     * Unregister an object (rarely needed).
     */
    public static unregister(object: THREE.Object3D): void {
        this.registeredObjects.delete(object);
        delete object.userData.isEditorObject;
    }

    /**
     * Check if an object is an editor object.
     * Checks multiple criteria:
     * 1. Explicitly registered objects
     * 2. Objects with userData.isEditorObject flag
     * 3. Objects with known editor names
     * 4. Objects with known editor types
     * 5. Parent objects that are editor objects
     */
    public static isEditorObject(object: THREE.Object3D): boolean {
        // Check the object and all its parents
        let current: THREE.Object3D | null = object;

        while (current) {
            // Check if explicitly registered
            if (this.registeredObjects.has(current)) {
                return true;
            }

            // Check userData flag
            if (current.userData?.isEditorObject === true) {
                return true;
            }

            // Check known names
            if (this.editorObjectNames.has(current.name)) {
                return true;
            }

            // Check known types
            if (this.editorObjectTypes.has(current.type)) {
                return true;
            }

            // Move up the hierarchy
            current = current.parent;
        }

        return false;
    }

    /**
     * Add a custom editor object name to the registry.
     * Useful for dynamically adding new editor object types.
     */
    public static registerName(name: string): void {
        this.editorObjectNames.add(name);
    }

    /**
     * Add a custom editor object type to the registry.
     */
    public static registerType(type: string): void {
        this.editorObjectTypes.add(type);
    }

    /**
     * Filter a list of objects to remove editor objects.
     * Returns only game objects.
     */
    public static filterGameObjects(objects: THREE.Object3D[]): THREE.Object3D[] {
        return objects.filter(obj => !this.isEditorObject(obj));
    }

    /**
     * Filter a list of objects to return only editor objects.
     */
    public static filterEditorObjects(objects: THREE.Object3D[]): THREE.Object3D[] {
        return objects.filter(obj => this.isEditorObject(obj));
    }

    /**
     * Clear all registered objects (useful for testing or cleanup).
     */
    public static clear(): void {
        this.registeredObjects = new WeakSet<THREE.Object3D>();
    }
}
