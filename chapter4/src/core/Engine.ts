import { Renderer } from '../rendering/Renderer';
import { Scene } from './Scene';

/**
 * The core game engine class.
 * Manages the game loop, timing, and lifecycle.
 * 
 * This is ENGINE code - but it has two modes:
 * - Editor mode: For editing scenes
 * - Play mode: For running the game
 */
export class Engine {
    private canvas: HTMLCanvasElement;
    private renderer: Renderer;
    private isRunning: boolean = false;
    private lastFrameTime: number = 0;
    private deltaTime: number = 0;
    private fps: number = 0;
    private frameCount: number = 0;
    private fpsUpdateTime: number = 0;
    private startTime: number = 0;
    private runTime: number = 0;
    
    // Scene management
    private currentScene: Scene | null = null;
    
    // Editor mode
    public isEditorMode: boolean = true;  // Start in editor mode
    public isPlaying: boolean = false;     // Is the game playing?
    
    // DOM elements for stats display
    private fpsElement: HTMLElement | null;
    private frametimeElement: HTMLElement | null;
    private runtimeElement: HTMLElement | null;

    constructor(canvasId: string = 'game-canvas') {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }
        this.canvas = canvas;
        
        this.renderer = new Renderer(this.canvas);
        
        this.fpsElement = document.getElementById('fps');
        this.frametimeElement = document.getElementById('frametime');
        this.runtimeElement = document.getElementById('runtime');
        
        window.addEventListener('resize', () => this.onResize());
        
        console.log('🎮 Game Engine initialized');
        console.log('📝 Editor Mode: ON');
    }
    
    /**
     * Load a scene
     */
    public loadScene(scene: Scene): void {
        if (this.currentScene) {
            this.currentScene.unload();
        }
        
        this.currentScene = scene;
        this.currentScene.load();
        this.renderer.setScene(scene);
        
        console.log(`✅ Loaded scene: ${scene.name}`);
    }
    
    /**
     * Get the current scene
     */
    public getScene(): Scene | null {
        return this.currentScene;
    }
    
    /**
     * Enter play mode (start the game)
     */
    public play(): void {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        console.log('▶️  PLAY MODE');
        console.log('🎮 Game started');
    }
    
    /**
     * Exit play mode (stop the game)
     */
    public stop(): void {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        console.log('⏸️  EDITOR MODE');
        console.log('✋ Game stopped');
    }
    
    private onResize(): void {
        this.renderer.onResize(window.innerWidth, window.innerHeight);
    }
    
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
        
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    public stopEngine(): void {
        this.isRunning = false;
        console.log('⏸️  Engine stopped');
    }
    
    private gameLoop(timestamp: number): void {
        if (!this.isRunning) {
            return;
        }
        
        this.deltaTime = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;
        this.runTime = (timestamp - this.startTime) / 1000;
        
        this.frameCount++;
        const timeSinceFpsUpdate = timestamp - this.fpsUpdateTime;
        if (timeSinceFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / timeSinceFpsUpdate);
            this.frameCount = 0;
            this.fpsUpdateTime = timestamp;
            this.updateStats();
        }
        
        // THE GAME LOOP
        this.processInput();
        this.update(this.deltaTime);
        this.render();
        
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    private processInput(): void {
        // Input will be handled by InputManager in Chapter 5
    }
    
    private update(deltaTime: number): void {
        // Update renderer (camera movement, etc.)
        this.renderer.update(deltaTime);
        
        // Update scene ONLY if playing
        if (this.isPlaying && this.currentScene) {
            this.currentScene.update(deltaTime);
        }
        
        // In editor mode, don't update game logic
        // We'll add editor-specific updates in the editor classes
    }
    
    private render(): void {
        this.renderer.render();
    }
    
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
    
    public getFPS(): number {
        return this.fps;
    }
    
    public getDeltaTime(): number {
        return this.deltaTime;
    }
    
    public getIsRunning(): boolean {
        return this.isRunning;
    }
    
    public getRenderer(): Renderer {
        return this.renderer;
    }
    
    public dispose(): void {
        this.renderer.dispose();
        if (this.currentScene) {
            this.currentScene.unload();
        }
    }
}

