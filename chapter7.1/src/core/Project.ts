import { Scene } from './Scene';
import { FileSystemManager } from './FileSystemManager';
import { SceneSerializer } from './SceneSerializer';
import { Events } from '../events';

/**
 * Project - Represents a complete game project.
 *
 * A project consists of:
 * - A root directory on disk
 * - ProjectSettings.json (project metadata)
 * - Assets/ folder with scenes, textures, models, etc.
 * - The currently active scene
 *
 * Lifecycle:
 * 1. create() - Initialize new project structure
 * 2. load() - Load existing project from disk
 * 3. save() - Save project state to disk
 * 4. close() - Clean up resources
 */
export class Project {
    public name: string;

    // Map of scene name to file path
    // e.g. "MainScene" -> "Assets/Scenes/MainScene.json"
    public scenes: Map<string, string> = new Map();

    // The currently active scene being edited
    public currentScene: Scene | null = null;

    // Current scene's file path
    private currentScenePath: string = '';

    // File system interface
    private fileSystem: FileSystemManager;

    // Events system
    private events: Events;

    // Project metadata
    public version: string = '1.0.0';
    public engineVersion: string = '0.7.0';
    public created: Date = new Date();
    public modified: Date = new Date();

    constructor(name: string, fileSystem: FileSystemManager, events: Events) {
        this.name = name;
        this.fileSystem = fileSystem;
        this.events = events;
    }

    /**
     * Create a new project structure on disk.
     *
     * Creates:
     * - Assets/Scenes/
     * - Assets/Prefabs/
     * - Assets/Textures/
     * - Assets/Models/
     * - Assets/Scripts/
     * - ProjectSettings.json
     * - DefaultScene.json
     */
    public async create(): Promise<boolean> {
        console.log(`Creating new project: ${this.name}`);

        // Create standard folder structure
        const folders = [
            'Assets',
            'Assets/Scenes',
            'Assets/Prefabs',
            'Assets/Textures',
            'Assets/Models',
            'Assets/Scripts'
        ];

        for (const folder of folders) {
            const success = await this.fileSystem.createDirectory(folder);
            if (!success) {
                console.error(`Failed to create folder: ${folder}`);
                return false;
            }
        }

        // Create a default scene
        const defaultScene = new Scene('DefaultScene', this.events);
        const scenePath = 'Assets/Scenes/DefaultScene.json';

        const saved = await this.saveScene(defaultScene, scenePath);
        if (!saved) {
            console.error('Failed to create default scene');
            return false;
        }

        // Register the default scene
        this.scenes.set('DefaultScene', scenePath);
        this.currentScene = defaultScene;
        this.currentScenePath = scenePath;

        // Save project settings
        const settingsSaved = await this.saveProjectSettings();
        if (!settingsSaved) {
            console.error('Failed to save project settings');
            return false;
        }

        console.log(`✅ Project created successfully`);
        console.log(`   Directory: ${this.fileSystem.getDirectoryName()}`);
        console.log(`   Scenes: ${this.scenes.size}`);

        return true;
    }

    /**
     * Load an existing project from disk.
     * Reads ProjectSettings.json and reconstructs project state.
     */
    public async load(): Promise<boolean> {
        console.log('Loading project...');

        // Read project settings
        const settingsJson = await this.fileSystem.readFile('ProjectSettings.json');
        if (!settingsJson) {
            console.error('ProjectSettings.json not found');
            console.error('This directory does not appear to be a valid project.');
            return false;
        }

        // Parse settings
        try {
            const settings = JSON.parse(settingsJson);

            this.name = settings.name || 'Unnamed Project';
            this.version = settings.version || '1.0.0';
            this.engineVersion = settings.engineVersion || '0.7.0';
            this.created = new Date(settings.created || Date.now());
            this.modified = new Date(settings.modified || Date.now());

            // Reconstruct scenes map
            this.scenes.clear();
            if (settings.scenes) {
                for (const [name, path] of Object.entries(settings.scenes)) {
                    this.scenes.set(name, path as string);
                }
            }

            console.log(`✅ Project loaded successfully`);
            console.log(`   Name: ${this.name}`);
            console.log(`   Version: ${this.version}`);
            console.log(`   Scenes: ${this.scenes.size}`);

            return true;

        } catch (error) {
            console.error('Failed to parse ProjectSettings.json:', error);
            return false;
        }
    }

    /**
     * Save project settings to ProjectSettings.json
     */
    public async saveProjectSettings(): Promise<boolean> {
        this.modified = new Date();

        const settings = {
            name: this.name,
            version: this.version,
            engineVersion: this.engineVersion,
            created: this.created.toISOString(),
            modified: this.modified.toISOString(),
            scenes: Object.fromEntries(this.scenes)  // Convert Map to object
        };

        const json = JSON.stringify(settings, null, 2);  // Pretty print with 2-space indent
        return await this.fileSystem.writeFile('ProjectSettings.json', json);
    }

    /**
     * Save a scene to disk.
     *
     * @param scene The scene to save
     * @param filepath Path relative to project root, e.g. "Assets/Scenes/Level1.json"
     */
    public async saveScene(scene: Scene, filepath: string): Promise<boolean> {
        console.log(`Saving scene: ${scene.name} to ${filepath}`);

        // Serialize scene to JSON
        const json = SceneSerializer.serialize(scene);

        // Write to disk
        const success = await this.fileSystem.writeFile(filepath, json);

        if (success) {
            console.log(`✅ Scene saved: ${scene.name}`);
        }

        return success;
    }

    /**
     * Load a scene from disk.
     *
     * @param filepath Path relative to project root
     * @returns Loaded scene, or null if failed
     */
    public async loadScene(filepath: string): Promise<Scene | null> {
        console.log(`Loading scene from: ${filepath}`);

        // Read file
        const json = await this.fileSystem.readFile(filepath);
        if (!json) {
            console.error(`Failed to read scene file: ${filepath}`);
            return null;
        }

        // Deserialize
        try {
            const scene = new Scene('LoadedScene', this.events);
            SceneSerializer.deserialize(json, scene);

            console.log(`✅ Scene loaded: ${scene.name}`);
            console.log(`   GameObjects: ${scene.getAllGameObjects().length}`);

            return scene;

        } catch (error) {
            console.error(`Failed to deserialize scene:`, error);
            return null;
        }
    }

    /**
     * Save the currently active scene.
     * This is what gets called when the user presses Cmd/Ctrl+S.
     */
    public async saveCurrentScene(): Promise<boolean> {
        if (!this.currentScene) {
            console.warn('No current scene to save');
            return false;
        }

        if (!this.currentScenePath) {
            console.error('Current scene has no file path');
            return false;
        }

        return await this.saveScene(this.currentScene, this.currentScenePath);
    }

    /**
     * Set the current scene being edited.
     *
     * @param scene The scene to make active
     * @param filepath The scene's file path
     */
    public setCurrentScene(scene: Scene, filepath: string): void {
        const previousScene = this.currentScene;
        this.currentScene = scene;
        this.currentScenePath = filepath;

        // Register scene if not already registered
        if (!this.scenes.has(scene.name)) {
            this.scenes.set(scene.name, filepath);
        }

        // Fire event to notify all systems that the scene has changed
        this.events.fire('project.sceneChanged', {
            scene: scene,
            filepath: filepath,
            previousScene: previousScene
        });

        console.log(`📦 Project: Scene changed to "${scene.name}"`);
    }

    /**
     * Create a new scene in the project.
     *
     * @param name Scene name
     * @returns The created scene
     */
    public async createNewScene(name: string): Promise<Scene | null> {
        const scenePath = `Assets/Scenes/${name}.json`;

        // Check if scene already exists
        const exists = await this.fileSystem.fileExists(scenePath);
        if (exists) {
            console.error(`Scene already exists: ${name}`);
            return null;
        }

        // Create new scene
        const scene = new Scene(name, this.events);

        // Save to disk
        const saved = await this.saveScene(scene, scenePath);
        if (!saved) {
            console.error(`Failed to save new scene: ${name}`);
            return null;
        }

        // Register scene
        this.scenes.set(name, scenePath);

        // Save project settings to include new scene
        await this.saveProjectSettings();

        console.log(`✅ Created new scene: ${name}`);
        return scene;
    }

    /**
     * Get list of all scene names in the project.
     */
    public getSceneNames(): string[] {
        return Array.from(this.scenes.keys()).sort();
    }

    /**
     * Get the file path for a scene by name.
     */
    public getScenePath(name: string): string | null {
        return this.scenes.get(name) || null;
    }

    /**
     * Close the project and clean up.
     */
    public close(): void {
        this.currentScene = null;
        this.currentScenePath = '';
        this.scenes.clear();

        console.log('Project closed');
    }
}
