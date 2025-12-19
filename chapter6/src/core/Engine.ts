import { Renderer } from '../rendering/Renderer';
import { Scene } from './Scene';
import { InputManager } from './InputManager';
import type { EditorCameraController } from '../editor/EditorCameraController';
import type { EditorUI } from '../editor/EditorUI';
import { Camera } from '../components/Camera';

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
    private inputManager: InputManager;
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

    // Editor camera
    private editorCamera: EditorCameraController | null = null;

    // Editor UI
    private editorUI: EditorUI | null = null;

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

        // Create InputManager
        this.inputManager = new InputManager(this.canvas);

        // Note: Renderer will be created when first scene is loaded
        // This is because Renderer needs the scene's threeScene
        this.renderer = null as any; // Will be set in loadScene

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

        // Create renderer with scene's threeScene on first load
        if (!this.renderer) {
            this.renderer = new Renderer(this.canvas, scene.getThreeScene());
        }

        console.log(`✅ Loaded scene: ${scene.name}`);
    }
    
    /**
     * Get the current scene
     */
    public getScene(): Scene | null {
        return this.currentScene;
    }

    /**
     * Get the InputManager
     */
    public getInputManager(): InputManager {
        return this.inputManager;
    }

    /**
     * Set editor camera controller (called by EditorUI)
     */
    public setEditorCamera(editorCamera: EditorCameraController): void {
        this.editorCamera = editorCamera;
    }

    /**
     * Set editor UI (called after EditorUI is created)
     */
    public setEditorUI(editorUI: EditorUI): void {
        this.editorUI = editorUI;
    }

    /**
     * Enter play mode (start the game)
     */
    public play(): void {
        if (this.isPlaying) return;

        this.isPlaying = true;
        console.log('▶️  PLAY MODE');
        console.log('🎮 Game started');

        // Find Camera component in scene and use it if present
        this.switchToGameCamera();
    }

    /**
     * Exit play mode (stop the game)
     */
    public stop(): void {
        if (!this.isPlaying) return;

        this.isPlaying = false;

        // Switch back to editor camera
        this.renderer.setActiveCamera(null);

        console.log('⏸️  EDITOR MODE');
        console.log('✋ Game stopped');
    }

    /**
     * Switch to game camera in play mode
     */
    private switchToGameCamera(): void {
        const scene = this.getScene();
        if (!scene) return;

        // Find first Camera component in scene
        const allObjects = scene.getAllGameObjects();
        for (const go of allObjects) {
            const camera = go.getComponent(Camera);
            if (camera) {
                this.renderer.setActiveCamera(camera.getThreeCamera());
                console.log(`📷 Using game camera: ${go.name}`);
                return;
            }
        }

        console.log('⚠️  No Camera component found, using editor camera');
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

        // Clear per-frame input state at END of frame
        this.inputManager.update();

        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    private processInput(): void {
        // In editor mode, editor UI handles input
        // In play mode, game scripts handle input
        // InputManager just tracks state - consumers decide what to do with it
    }
    
    private update(deltaTime: number): void {
        // Update editor camera in editor mode
        if (!this.isPlaying && this.editorCamera) {
            this.editorCamera.update(deltaTime);
        }

        // Update editor UI (for gizmos, etc.)
        if (this.editorUI) {
            this.editorUI.update();
        }

        // Update scene ONLY if playing
        if (this.isPlaying && this.currentScene) {
            this.currentScene.update(deltaTime);
        }
    }

    private render(): void {
        // Render the current scene's Three.js scene
        if (this.currentScene) {
            this.renderer.render(this.currentScene.getThreeScene());
        }
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

