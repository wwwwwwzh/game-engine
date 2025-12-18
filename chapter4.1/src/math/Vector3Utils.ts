import * as THREE from 'three/webgpu';;
import { lerp } from './MathUtils';

/**
 * Utility functions for Vector3 operations
 */

/**
 * Linear interpolation between two vectors
 */
export function lerpVector3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
    return new THREE.Vector3(
        lerp(a.x, b.x, t),
        lerp(a.y, b.y, t),
        lerp(a.z, b.z, t)
    );
}

/**
 * Exponential decay for vectors
 */
export function exponentialDecayVector3(
    current: THREE.Vector3,
    target: THREE.Vector3,
    decay: number,
    deltaTime: number
): THREE.Vector3 {
    const diff = target.clone().sub(current);
    return current.clone().add(diff.multiplyScalar(1 - Math.exp(-decay * deltaTime)));
}

/**
 * Calculate the angle between two vectors in degrees
 */
export function angleBetween(a: THREE.Vector3, b: THREE.Vector3): number {
    return Math.acos(a.dot(b) / (a.length() * b.length())) * (180 / Math.PI);
}

/**
 * Project vector a onto vector b
 */
export function projectOnto(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
    const bNormalized = b.clone().normalize();
    return bNormalized.multiplyScalar(a.dot(bNormalized));
}

/**
 * Reflect a vector off a surface with the given normal
 */
export function reflect(vector: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
    return vector.clone().sub(
        normal.clone().multiplyScalar(2 * vector.dot(normal))
    );
}

/**
 * Check if two vectors are approximately equal
 */
export function approximatelyEqual(a: THREE.Vector3, b: THREE.Vector3, epsilon: number = 0.0001): boolean {
    return Math.abs(a.x - b.x) < epsilon &&
           Math.abs(a.y - b.y) < epsilon &&
           Math.abs(a.z - b.z) < epsilon;
}

/**
 * Get a random point within a sphere
 */
export function randomInSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2 * Math.PI;
    const phi = Math.acos(2 * v - 1);
    const r = Math.cbrt(Math.random()) * radius;
    
    return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
    );
}

/**
 * Get a random point on the surface of a sphere
 */
export function randomOnSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2 * Math.PI;
    const phi = Math.acos(2 * v - 1);
    
    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
    );
}

