import { Component } from './Component';

/**
 * Rotator component - rotates an object continuously.
 * This is an example GAME component (game-specific behavior).
 */
export class Rotator extends Component {
    /**
     * Rotation speed in radians per second
     */
    public speed: number = 1.0;

    /**
     * Rotation axis (default: Y axis)
     */
    public axis: 'x' | 'y' | 'z' = 'y';

    public getTypeName(): string {
        return 'Rotator';
    }

    public update(deltaTime: number): void {
        // Rotate around the specified axis
        // Transform directly modifies Object3D, no manual sync needed
        switch (this.axis) {
            case 'x':
                this.transform.rotation.x += this.speed * deltaTime;
                break;
            case 'y':
                this.transform.rotation.y += this.speed * deltaTime;
                break;
            case 'z':
                this.transform.rotation.z += this.speed * deltaTime;
                break;
        }
    }
}
