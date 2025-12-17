import { Scene } from './Scene';
import { GameObject } from './GameObject';
import { MeshRenderer } from '../components/MeshRenderer';
import * as THREE from 'three';

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
        const transform = go.transform;

        const data: any = {
            name: go.name,
            tag: go.tag,
            active: go.active,
            transform: {
                position: {
                    x: transform.localPosition.x,
                    y: transform.localPosition.y,
                    z: transform.localPosition.z
                },
                rotation: {
                    x: transform.localRotation.x,
                    y: transform.localRotation.y,
                    z: transform.localRotation.z
                },
                scale: {
                    x: transform.localScale.x,
                    y: transform.localScale.y,
                    z: transform.localScale.z
                }
            },
            components: [],
            children: go.children.map(child => this.serializeGameObject(child))
        };

        // Serialize components (skip Transform, it's handled separately)
        for (const component of go.getAllComponents()) {
            if (component.getTypeName() === 'Transform') continue;

            const componentData = this.serializeComponent(component);
            if (componentData) {
                data.components.push(componentData);
            }
        }

        return data;
    }

    /**
     * Serialize a component
     */
    private static serializeComponent(component: any): any {
        const typeName = component.getTypeName();

        if (typeName === 'MeshRenderer') {
            return {
                type: 'MeshRenderer',
                geometryType: component.geometryType || 'box',
                color: component.material?.color?.getHex() || 0x00ff00
            };
        }

        // Add more component types as needed
        return null;
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
        go.tag = data.tag || 'Untagged';
        go.active = data.active !== false;

        // Set transform
        if (data.transform) {
            const t = data.transform;
            go.transform.localPosition.set(t.position.x, t.position.y, t.position.z);
            go.transform.localRotation.set(t.rotation.x, t.rotation.y, t.rotation.z);
            go.transform.localScale.set(t.scale.x, t.scale.y, t.scale.z);
        }

        // Add components
        for (const compData of data.components || []) {
            this.deserializeComponent(go, compData);
        }

        // Set parent
        if (parent) {
            go.setParent(parent, false);
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

            // Create geometry based on type
            let geometry: THREE.BufferGeometry;
            switch (data.geometryType) {
                case 'sphere':
                    geometry = new THREE.SphereGeometry(0.5, 32, 32);
                    break;
                case 'box':
                default:
                    geometry = new THREE.BoxGeometry(1, 1, 1);
            }

            const material = new THREE.MeshPhongMaterial({
                color: data.color || 0x00ff00,
                shininess: 100
            });

            renderer.setGeometry(geometry);
            renderer.setMaterial(material);
            (renderer as any).geometryType = data.geometryType || 'box';
        }

        // Add more component types here
    }
}
