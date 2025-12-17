import type { Engine } from '../core/Engine';
import { HierarchyPanel } from './HierarchyPanel';
import { InspectorPanel } from './InspectorPanel';
import { GameObjectFactory } from '../core/GameObjectFactory';

/**
 * EditorUI manages the editor interface.
 * 
 * This is EDITOR code - only runs in the editor, not in builds.
 */
export class EditorUI {
    private engine: Engine;
    private hierarchyPanel: HierarchyPanel;
    private inspectorPanel: InspectorPanel;
    
    // UI elements
    private playButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private addCubeButton: HTMLButtonElement;
    private addSphereButton: HTMLButtonElement;
    private modeElement: HTMLElement;
    
    // Selected GameObject ID
    private selectedObjectId: string | null = null;
    
    constructor(engine: Engine) {
        this.engine = engine;
        
        // Get UI elements
        this.playButton = document.getElementById('play-btn') as HTMLButtonElement;
        this.stopButton = document.getElementById('stop-btn') as HTMLButtonElement;
        this.addCubeButton = document.getElementById('add-cube-btn') as HTMLButtonElement;
        this.addSphereButton = document.getElementById('add-sphere-btn') as HTMLButtonElement;
        this.modeElement = document.getElementById('mode') as HTMLElement;
        
        // Create panels
        this.hierarchyPanel = new HierarchyPanel(this);
        this.inspectorPanel = new InspectorPanel(this);
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('🎨 Editor UI initialized');
    }
    
    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Play/Stop buttons
        this.playButton.addEventListener('click', () => this.onPlayClicked());
        this.stopButton.addEventListener('click', () => this.onStopClicked());
        
        // Add object buttons
        this.addCubeButton.addEventListener('click', () => this.onAddCube());
        this.addSphereButton.addEventListener('click', () => this.onAddSphere());
    }
    
    /**
     * Play button clicked
     */
    private onPlayClicked(): void {
        this.engine.play();
        this.playButton.disabled = true;
        this.stopButton.disabled = false;
        this.modeElement.textContent = 'PLAYING';
        this.modeElement.style.color = '#0f0';
        
        // Disable editing in play mode
        this.addCubeButton.disabled = true;
        this.addSphereButton.disabled = true;
    }
    
    /**
     * Stop button clicked
     */
    private onStopClicked(): void {
        this.engine.stop();
        this.playButton.disabled = false;
        this.stopButton.disabled = true;
        this.modeElement.textContent = 'EDITOR';
        this.modeElement.style.color = '#0f0';
        
        // Re-enable editing
        this.addCubeButton.disabled = false;
        this.addSphereButton.disabled = false;
    }
    
    /**
     * Add a cube to the scene
     */
    private onAddCube(): void {
        const scene = this.engine.getScene();
        if (!scene) {
            console.warn('No scene loaded');
            return;
        }
        
        const cube = GameObjectFactory.createCube();
        scene.addGameObject(cube);
        this.refresh();
        
        console.log('✅ Cube added to scene');
    }
    
    /**
     * Add a sphere to the scene
     */
    private onAddSphere(): void {
        const scene = this.engine.getScene();
        if (!scene) {
            console.warn('No scene loaded');
            return;
        }
        
        const sphere = GameObjectFactory.createSphere();
        sphere.transform.position.x = 2; // Offset so it doesn't overlap cube
        scene.addGameObject(sphere);
        this.refresh();
        
        console.log('✅ Sphere added to scene');
    }
    
    /**
     * Get the engine
     */
    public getEngine(): Engine {
        return this.engine;
    }
    
    /**
     * Select a GameObject
     */
    public selectObject(objectId: string | null): void {
        this.selectedObjectId = objectId;
        this.hierarchyPanel.refresh();
        this.inspectorPanel.refresh();
    }
    
    /**
     * Get selected GameObject ID
     */
    public getSelectedObjectId(): string | null {
        return this.selectedObjectId;
    }
    
    /**
     * Refresh the entire UI
     */
    public refresh(): void {
        this.hierarchyPanel.refresh();
        this.inspectorPanel.refresh();
    }
}
