import * as THREE from '../three';
import { EditorObjectRegistry } from './EditorObjectRegistry';

/**
 * EditorGrid - Renders a coordinate grid in the editor.
 * Helps visualize the ground plane and coordinate system.
 */
export class EditorGrid {
    private gridHelper: THREE.GridHelper;
    private axesHelper: THREE.AxesHelper;

    constructor() {
        // Create grid helper (size, divisions, colorCenterLine, colorGrid)
        this.gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
        this.gridHelper.name = 'EditorGrid';

        // Make grid non-raycastable for better performance
        this.gridHelper.raycast = () => {};

        // Register as editor object
        EditorObjectRegistry.register(this.gridHelper);

        // Create axes helper (size)
        // Red = X axis, Green = Y axis, Blue = Z axis
        this.axesHelper = new THREE.AxesHelper(5);
        this.axesHelper.name = 'EditorAxes';

        // Make axes non-raycastable
        this.axesHelper.raycast = () => {};

        // Register as editor object
        EditorObjectRegistry.register(this.axesHelper);
    }

    /**
     * Add grid and axes to the scene
     */
    public addToScene(scene: THREE.Scene): void {
        scene.add(this.gridHelper);
        scene.add(this.axesHelper);
    }

    /**
     * Remove grid and axes from the scene
     */
    public removeFromScene(scene: THREE.Scene): void {
        scene.remove(this.gridHelper);
        scene.remove(this.axesHelper);
    }

    /**
     * Show/hide the grid
     */
    public setVisible(visible: boolean): void {
        this.gridHelper.visible = visible;
        this.axesHelper.visible = visible;
    }

    /**
     * Get the grid helper
     */
    public getGridHelper(): THREE.GridHelper {
        return this.gridHelper;
    }

    /**
     * Get the axes helper
     */
    public getAxesHelper(): THREE.AxesHelper {
        return this.axesHelper;
    }
}
