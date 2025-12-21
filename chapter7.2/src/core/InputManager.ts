/**
 * InputManager - Centralized input handling for keyboard and mouse.
 * Tracks input state and provides clean API for querying.
 *
 * Singleton pattern - accessible globally for both editor and game code.
 */
export class InputManager {
    private static instance: InputManager | null = null;

    // Keyboard state
    private keysDown: Set<string> = new Set();
    private keysPressed: Set<string> = new Set();  // This frame only
    private keysReleased: Set<string> = new Set(); // This frame only

    // Mouse state
    private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
    private mouseDelta: { x: number; y: number } = { x: 0, y: 0 };
    private mouseButtons: Set<number> = new Set();
    private mouseButtonsPressed: Set<number> = new Set();
    private mouseButtonsReleased: Set<number> = new Set();
    private mouseWheelDelta: number = 0;

    // Canvas for relative coordinates
    private canvas: HTMLCanvasElement;

    private constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.setupEventListeners();
        console.log('⌨️  InputManager initialized (singleton)');
    }

    /**
     * Initialize the singleton instance.
     * Must be called once at application startup.
     */
    public static initialize(canvas: HTMLCanvasElement): InputManager {
        if (InputManager.instance) {
            console.warn('InputManager already initialized');
            return InputManager.instance;
        }
        InputManager.instance = new InputManager(canvas);
        return InputManager.instance;
    }

    /**
     * Get the singleton instance.
     * Throws if not initialized.
     */
    public static getInstance(): InputManager {
        if (!InputManager.instance) {
            throw new Error('InputManager not initialized. Call InputManager.initialize() first.');
        }
        return InputManager.instance;
    }

    /**
     * For testing: reset the singleton
     */
    public static reset(): void {
        InputManager.instance = null;
    }

    private setupEventListeners(): void {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));

        // Mouse wheel
        this.canvas.addEventListener('wheel', (e) => this.onMouseWheel(e), { passive: false });

        // Prevent context menu on right-click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (!this.keysDown.has(e.key)) {
            this.keysPressed.add(e.key);
        }
        this.keysDown.add(e.key);
    }

    private onKeyUp(e: KeyboardEvent): void {
        this.keysDown.delete(e.key);
        this.keysReleased.add(e.key);
    }

    private onMouseMove(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const newX = e.clientX - rect.left;
        const newY = e.clientY - rect.top;

        this.mouseDelta.x = newX - this.mousePosition.x;
        this.mouseDelta.y = newY - this.mousePosition.y;

        this.mousePosition.x = newX;
        this.mousePosition.y = newY;
    }

    private onMouseDown(e: MouseEvent): void {
        if (!this.mouseButtons.has(e.button)) {
            this.mouseButtonsPressed.add(e.button);
        }
        this.mouseButtons.add(e.button);
    }

    private onMouseUp(e: MouseEvent): void {
        this.mouseButtons.delete(e.button);
        this.mouseButtonsReleased.add(e.button);
    }

    private onMouseWheel(e: WheelEvent): void {
        e.preventDefault();
        this.mouseWheelDelta = e.deltaY;
    }

    /**
     * Call at end of each frame to clear per-frame events
     */
    public update(): void {
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.mouseButtonsPressed.clear();
        this.mouseButtonsReleased.clear();
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        this.mouseWheelDelta = 0;
    }

    // ===== KEYBOARD API =====

    /**
     * Is key currently pressed?
     */
    public isKeyDown(key: string): boolean {
        return this.keysDown.has(key);
    }

    /**
     * Was key pressed THIS frame?
     */
    public getKeyDown(key: string): boolean {
        return this.keysPressed.has(key);
    }

    /**
     * Was key released THIS frame?
     */
    public getKeyUp(key: string): boolean {
        return this.keysReleased.has(key);
    }

    // ===== MOUSE API =====

    /**
     * Get current mouse position relative to canvas
     */
    public getMousePosition(): { x: number; y: number } {
        return { ...this.mousePosition };
    }

    /**
     * Get mouse movement since last frame
     */
    public getMouseDelta(): { x: number; y: number } {
        return { ...this.mouseDelta };
    }

    /**
     * Get normalized mouse position (-1 to 1)
     */
    public getNormalizedMousePosition(): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (this.mousePosition.x / rect.width) * 2 - 1,
            y: -(this.mousePosition.y / rect.height) * 2 + 1
        };
    }

    /**
     * Is mouse button currently pressed?
     */
    public isMouseButtonDown(button: number): boolean {
        return this.mouseButtons.has(button);
    }

    /**
     * Was mouse button pressed THIS frame?
     */
    public getMouseButtonDown(button: number): boolean {
        return this.mouseButtonsPressed.has(button);
    }

    /**
     * Was mouse button released THIS frame?
     */
    public getMouseButtonUp(button: number): boolean {
        return this.mouseButtonsReleased.has(button);
    }

    // ===== MOUSE WHEEL API =====

    /**
     * Get mouse wheel delta this frame
     */
    public getMouseWheelDelta(): number {
        return this.mouseWheelDelta;
    }
}
