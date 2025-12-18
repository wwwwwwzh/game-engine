import type { GameObject } from '../core/GameObject';

/**
 * Base class for all components.
 * Components add behavior and properties to GameObjects.
 * 
 * This is ENGINE code - it runs in both editor and runtime.
 */
export abstract class Component {
    /**
     * The GameObject this component is attached to.
     * Set automatically when component is added to a GameObject.
     */
    public gameObject!: GameObject;
    
    /**
     * Quick access to transform (every GameObject has one)
     */
    public get transform() {
        return this.gameObject.transform;
    }
    
    /**
     * Is this component enabled?
     * Disabled components don't update.
     */
    public enabled: boolean = true;
    
    /**
     * Has Start been called yet?
     */
    private _started: boolean = false;
    
    /**
     * Called when component is first created (before Start)
     * Use for internal initialization
     */
    public awake(): void {
        // Override in derived classes
    }
    
    /**
     * Called before the first Update, after all Awakes
     * Use for initialization that depends on other components
     */
    public start(): void {
        // Override in derived classes
    }
    
    /**
     * Called every frame while component is enabled
     * @param deltaTime Time since last frame in seconds
     */
    public update(deltaTime: number): void {
        // Override in derived classes
    }
    
    /**
     * Called when component is destroyed
     * Use for cleanup
     */
    public onDestroy(): void {
        // Override in derived classes
    }
    
    /**
     * Internal update - handles lifecycle
     * DO NOT OVERRIDE - Override update() instead
     */
    public _internalUpdate(deltaTime: number): void {
        if (!this.enabled) return;
        
        // Call start once before first update
        if (!this._started) {
            this.start();
            this._started = true;
        }
        
        this.update(deltaTime);
    }
    
    /**
     * Get component type name (for debugging and editor)
     */
    public getTypeName(): string {
        return this.constructor.name;
    }
}
