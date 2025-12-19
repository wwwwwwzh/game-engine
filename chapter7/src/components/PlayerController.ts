import { Component } from './Component';
import type { Engine } from '../core/Engine';
import type { InputManager } from '../core/InputManager';

/**
 * PlayerController - Example component showing game input usage.
 * This is GAME code - only active in play mode.
 */
export class PlayerController extends Component {
    public moveSpeed: number = 5.0;
    public turnSpeed: number = 2.0;

    private input!: InputManager;

    public awake(): void {
        // Get InputManager from engine
        // This is a bit awkward - we'll improve this in Chapter 6 with proper service location
        const engine = (window as any).engine as Engine;
        this.input = engine.getInputManager();
    }

    public update(deltaTime: number): void {
        // Only process input in play mode
        const engine = (window as any).engine as Engine;
        if (!engine.isPlaying) return;

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
