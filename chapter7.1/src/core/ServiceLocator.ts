import type { Engine } from './Engine';
import type { InputManager } from './InputManager';

/**
 * ServiceLocator - Provides clean access to engine services.
 * Components can access InputManager, Scene, etc. without window hacks.
 */
export class ServiceLocator {
    private static engine: Engine | null = null;

    /**
     * Register the engine (called once at startup)
     */
    public static registerEngine(engine: Engine): void {
        this.engine = engine;
    }

    /**
     * Get the engine instance
     */
    public static getEngine(): Engine {
        if (!this.engine) {
            throw new Error('Engine not registered with ServiceLocator');
        }
        return this.engine;
    }

    /**
     * Get the InputManager
     */
    public static getInput(): InputManager {
        return this.getEngine().getInputManager();
    }

    /**
     * Get the current scene
     */
    public static getScene() {
        return this.getEngine().getScene();
    }

    /**
     * Check if in play mode
     */
    public static isPlaying(): boolean {
        return this.getEngine().isPlaying;
    }
}
