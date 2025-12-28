# Renderer Configuration Guide

This project supports both **WebGL** and **WebGPU** renderers. You can easily switch between them.

## How to Switch Renderers

### Step 1: Update the Config File

Open [`src/config.ts`](src/config.ts) and change the `renderer` setting:

```typescript
export const ENGINE_CONFIG = {
    renderer: 'webgpu' as RendererType,  // Change to 'webgl' for WebGL
};
```

Options:
- `'webgpu'` - Use WebGPURenderer (modern, better performance, requires WebGPU support)
- `'webgl'` - Use WebGLRenderer (better compatibility, works on all browsers)

### Step 2: Update the Three.js Import

Open [`src/three.ts`](src/three.ts) and uncomment the appropriate line:

**For WebGPU (default):**
```typescript
// WEBGPU MODE (default) - Uncomment this line for WebGPU
export * from 'three/webgpu';

// WEBGL MODE - Uncomment this line for WebGL (and comment the line above)
// export * from 'three';
```

**For WebGL:**
```typescript
// WEBGPU MODE (default) - Uncomment this line for WebGPU
// export * from 'three/webgpu';

// WEBGL MODE - Uncomment this line for WebGL (and comment the line above)
export * from 'three';
```

### Step 3: Restart the Dev Server

After making these changes, restart your development server:

```bash
npm run dev
```

## Current Setup

All source files now import Three.js from the centralized barrel export:

```typescript
import * as THREE from '../three';  // or './three' depending on location
```

This allows switching between renderers without modifying individual files.

## Implementation Details

### Renderer Support

The [`Renderer` class](src/rendering/Renderer.ts) automatically detects the configured renderer type and initializes the appropriate renderer:

- **WebGPU**: Requires async initialization with `await renderer.init()`
- **WebGL**: Initializes synchronously, ready immediately

### Browser Compatibility

- **WebGPU**: Chrome 113+, Edge 113+, Safari 18+ (limited support)
- **WebGL**: All modern browsers

## Troubleshooting

### Build Errors After Switching

1. Stop the dev server
2. Clear the build cache: `rm -rf node_modules/.vite`
3. Restart: `npm run dev`

### WebGPU Not Working

Check browser support:
```javascript
if ('gpu' in navigator) {
    console.log('WebGPU is supported');
} else {
    console.log('WebGPU is not supported - use WebGL mode');
}
```

## Architecture

```
src/
├── config.ts           # Renderer configuration
├── three.ts            # Centralized Three.js export
├── rendering/
│   └── Renderer.ts     # Supports both WebGL and WebGPU
└── [all other files]   # Import from '../three'
```
