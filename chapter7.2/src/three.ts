/**
 * Three.js Barrel Export
 *
 * This file re-exports from either 'three' or 'three/webgpu' based on ENGINE_CONFIG.
 *
 * To switch between WebGL and WebGPU:
 * 1. Change ENGINE_CONFIG.renderer in config.ts to 'webgl' or 'webgpu'
 * 2. Uncomment the appropriate export line below
 *
 * All files should import from this file:
 *   import * as THREE from './three';
 */

// WEBGPU MODE (default) - Uncomment this line for WebGPU
// export * from 'three/webgpu';

// WEBGL MODE - Uncomment this line for WebGL (and comment the line above)
export * from 'three';

export type RendererType = 'webgpu' | 'webgl';

export const ENGINE_CONFIG = {
    /**
     * Renderer type to use
     * Change this to 'webgl' to use WebGLRenderer instead of WebGPURenderer
     */
    // renderer: 'webgpu' as RendererType,
    renderer: 'webgl' as RendererType,
};
