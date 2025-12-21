import { Component } from './Component';
import { InputManager } from '../core/InputManager';

/**
 * PlayerController - Example component showing game input usage.
 * This is GAME code - only active in play mode.
 *
 * Uses InputManager singleton for easy access!
 */
export class PlayerController extends Component {
    public moveSpeed: number = 5.0;
    public turnSpeed: number = 2.0;

    private input: InputManager = InputManager.getInstance();

    public start(): void {
        // Input is already initialized from singleton
    }

    public update(deltaTime: number): void {
        // Query play state via events
        const isPlaying = this.gameObject.scene!.events.invoke('editor.isPlaying') as boolean;
        if (!isPlaying) return;

        // WASD movement
        const moveDir = { x: 0, y: 0, z: 0 };

        if (this.input.isKeyDown('w')) moveDir.z -= 1;
        if (this.input.isKeyDown('s')) moveDir.z += 1;
        if (this.input.isKeyDown('a')) moveDir.x -= 1;
        if (this.input.isKeyDown('d')) moveDir.x += 1;

        // Apply movement
        if (moveDir.x !== 0 || moveDir.z !== 0) {
            // Normalize diagonal movement
            const length = Math.sqrt(moveDir.x * moveDir.x + moveDir.z * moveDir.z);
            moveDir.x /= length;
            moveDir.z /= length;

            // Move relative to current position
            this.transform.localPosition.x += moveDir.x * this.moveSpeed * deltaTime;
            this.transform.localPosition.z += moveDir.z * this.moveSpeed * deltaTime;
        }

        // Arrow keys for rotation
        if (this.input.isKeyDown('ArrowLeft')) {
            this.transform.localRotation.y += this.turnSpeed * deltaTime;
        }
        if (this.input.isKeyDown('ArrowRight')) {
            this.transform.localRotation.y -= this.turnSpeed * deltaTime;
        }

        // Space to jump (just moves up for now)
        if (this.input.getKeyDown(' ')) {
            this.transform.localPosition.y += 1;
        }
    }

    public getTypeName(): string {
        return 'PlayerController';
    }
}
