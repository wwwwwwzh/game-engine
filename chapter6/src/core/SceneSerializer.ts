import { Scene } from './Scene';
import { GameObject } from './GameObject';
import { MeshRenderer } from '../components/MeshRenderer';
import { Rotator } from '../components/Rotator';
import { Camera } from '../components/Camera';

/**
 * Handles converting scenes to/from JSON format.
 */
export class SceneSerializer {
    /**
     * Serialize a scene to JSON
     */
    public static serialize(scene: Scene): string {
        const data = {
            name: scene.name,
            gameObjects: scene.getRootGameObjects().map(go => this.serializeGameObject(go))
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * Serialize a single GameObject and its children
     */
    private static serializeGameObject(go: GameObject): any {
        return go.serialize();
    }

    /**
     * Deserialize JSON into a scene
     */
    public static deserialize(json: string, scene: Scene): void {
        const data = JSON.parse(json);

        scene.name = data.name;
        scene.clear();

        for (const goData of data.gameObjects) {
            const gameObject = this.deserializeGameObject(goData, null);
            scene.addGameObject(gameObject);
        }
    }

    /**
     * Deserialize a single GameObject
     */
    private static deserializeGameObject(data: any, parent: GameObject | null): GameObject {
        const go = new GameObject(data.name);

        // Set basic properties (but NOT transform yet)
        go.tag = data.tag || 'Untagged';
        go.active = data.active !== false;

        // Set parent BEFORE deserializing transform
        // This is important because setParent(parent, false) resets the transform
        if (parent) {
            go.setParent(parent, false);
        }

        // Now deserialize transform (after parenting)
        if (data.transform) {
            go.transform.deserialize(data.transform);
        }

        // Add components
        for (const compData of data.components || []) {
            this.deserializeComponent(go, compData);
        }

        // Deserialize children
        for (const childData of data.children || []) {
            this.deserializeGameObject(childData, go);
        }

        return go;
    }

    /**
     * Deserialize a component and add to GameObject
     */
    private static deserializeComponent(go: GameObject, data: any): void {
        if (data.type === 'MeshRenderer') {
            const renderer = go.addComponent(new MeshRenderer());
            renderer.deserialize(data);
        } else if (data.type === 'Rotator') {
            const rotator = go.addComponent(new Rotator());
            rotator.deserialize(data);
        } else if (data.type === 'Camera') {
            const camera = go.addComponent(new Camera());
            camera.deserialize(data);
        }

        // Add more component types here as needed
        // Each component type should implement its own deserialize method
    }
}
