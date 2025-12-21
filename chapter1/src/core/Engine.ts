/**
 * The core game engine class.
 * Manages the game loop, timing, and lifecycle.
 */
export class Engine {
    private canvas: HTMLCanvasElement;
    private isRunning: boolean = false;
    private lastFrameTime: number = 0;
    private deltaTime: number = 0;
    private fps: number = 0;
    private frameCount: number = 0;
    private fpsUpdateTime: number = 0;
    private startTime: number = 0;
    private runTime: number = 0;
    
    // DOM elements for stats display
    private fpsElement: HTMLElement | null;
    private frametimeElement: HTMLElement | null;
    private runtimeElement: HTMLElement | null;

    constructor(canvasId: string = 'game-canvas') {
        // Get the canvas element
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }
        this.canvas = canvas;
        
        // Set canvas size to match window
        this.resizeCanvas();
        
        // Get stats display elements
        this.fpsElement = document.getElementById('fps');
        this.frametimeElement = document.getElementById('frametime');
        this.runtimeElement = document.getElementById('runtime');
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        console.log('🎮 Game Engine initialized');
        console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    /**
     * Resize the canvas to match window size
     */
    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    /**
     * Start the game loop
     */
    public start(): void {
        if (this.isRunning) {
            console.warn('Engine is already running');
            return;
        }
        
        this.isRunning = true;
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;
        this.fpsUpdateTime = this.startTime;
        
        console.log('▶️  Engine started');
        
        // Start the game loop
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    /**
     * Stop the game loop
     */
    public stop(): void {
        this.isRunning = false;
        console.log('⏸️  Engine stopped');
    }
    
    /**
     * The main game loop - runs every frame
     */
    private gameLoop(timestamp: number): void {
        if (!this.isRunning) {
            return;
        }
        
        // Calculate delta time (time since last frame)
        this.deltaTime = (timestamp - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = timestamp;
        
        // Calculate runtime
        this.runTime = (timestamp - this.startTime) / 1000;
        
        // Update FPS counter every second
        this.frameCount++;
        const timeSinceFpsUpdate = timestamp - this.fpsUpdateTime;
        if (timeSinceFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / timeSinceFpsUpdate);
            this.frameCount = 0;
            this.fpsUpdateTime = timestamp;
            
            // Update display
            this.updateStats();
        }
        
        // === THE GAME LOOP ===
        this.processInput();
        this.update(this.deltaTime);
        this.render();
        // =====================
        
        // Schedule next frame
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    /**
     * Process input (keyboard, mouse, touch)
     * Called every frame before update
     */
    private processInput(): void {
        // In future chapters, we'll implement input handling here
        // For now, this is just a placeholder
    }
    
    /**
     * Update game state
     * Called every frame
     */
    private update(deltaTime: number): void {
        // In future chapters, we'll update game objects here
        // For now, we'll just log occasionally
        
        // Log every 60 frames (roughly once per second at 60 FPS)
        if (this.frameCount % 60 === 0) {
            console.log(`Update - DeltaTime: ${(deltaTime * 1000).toFixed(2)}ms, Runtime: ${this.runTime.toFixed(2)}s`);
        }
    }
    
    /**
     * Render the current frame
     * Called every frame after update
     */
    private render(): void {
        // Get 2D rendering context (we'll switch to WebGL/Three.js in Chapter 2)
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear the canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw a simple visualization - a pulsing circle
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 50 + Math.sin(this.runTime * 2) * 20; // Pulsing effect
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
        
        // Draw some text
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Game Engine - Chapter 1', centerX, centerY - 100);
        ctx.font = '16px monospace';
        ctx.fillText('The loop is running!', centerX, centerY + 100);
    }
    
    /**
     * Update the stats display
     */
    private updateStats(): void {
        if (this.fpsElement) {
            this.fpsElement.textContent = this.fps.toString();
        }
        if (this.frametimeElement) {
            this.frametimeElement.textContent = (this.deltaTime * 1000).toFixed(2);
        }
        if (this.runtimeElement) {
            this.runtimeElement.textContent = this.runTime.toFixed(1);
        }
    }
    
    /**
     * Get current FPS
     */
    public getFPS(): number {
        return this.fps;
    }
    
    /**
     * Get current delta time
     */
    public getDeltaTime(): number {
        return this.deltaTime;
    }
    
    /**
     * Check if engine is running
     */
    public getIsRunning(): boolean {
        return this.isRunning;
    }
}


