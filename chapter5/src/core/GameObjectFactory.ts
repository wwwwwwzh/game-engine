import * as THREE from 'three/webgpu';;
import { GameObject } from './GameObject';
import { MeshRenderer } from '../components/MeshRenderer';
import { Rotator } from '../components/Rotator';
import { PlayerController } from '../components/PlayerController';

/**
 * Factory for creating common GameObject types.
 * This is ENGINE code but provides convenient creation methods.
 */
export class GameObjectFactory {
    /**
     * Create a cube GameObject
     */
    public static createCube(name: string = "Cube"): GameObject {
        const gameObject = new GameObject(name);
        
        // Add MeshRenderer
        const renderer = new MeshRenderer();
        gameObject.addComponent(renderer);
        
        // Create cube geometry and material
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            shininess: 100,
            specular: 0x444444
        });

        renderer.setGeometry(geometry);
        renderer.setMaterial(material);

        // Add Rotator component for auto-rotation
        const rotator = new Rotator();
        rotator.speed = 1.0; // 1 radian per second
        rotator.axis = 'y'; // Rotate around Y axis
        gameObject.addComponent(rotator);

        return gameObject;
    }
    
    /**
     * Create a sphere GameObject
     */
    public static createSphere(name: string = "Sphere"): GameObject {
        const gameObject = new GameObject(name);

        // Add MeshRenderer
        const renderer = new MeshRenderer();
        gameObject.addComponent(renderer);

        // Create sphere geometry and material
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            shininess: 100,
            specular: 0x444444
        });

        renderer.setGeometry(geometry);
        renderer.setMaterial(material);

        return gameObject;
    }

    /**
     * Create a player-controlled cube
     */
    public static createPlayer(name: string = "Player"): GameObject {
        const gameObject = new GameObject(name);

        // Add MeshRenderer
        const renderer = new MeshRenderer();
        gameObject.addComponent(renderer);

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0x0088ff,  // Blue for player
            shininess: 100,
            specular: 0x444444
        });

        renderer.setGeometry(geometry);
        renderer.setMaterial(material);

        // Add PlayerController
        const controller = new PlayerController();
        gameObject.addComponent(controller);

        return gameObject;
    }
}
