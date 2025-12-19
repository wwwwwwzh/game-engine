import { Engine } from './core/Engine';
import { Scene } from './core/Scene';
import { EditorUI } from './editor/EditorUI';
import { ServiceLocator } from './core/ServiceLocator';

console.log('='.repeat(50));
console.log('🎮 GAME ENGINE - CHAPTER 7');
console.log('Asset Management + Project System');
console.log('='.repeat(50));

// Create engine
const engine = new Engine('game-canvas');

// Register with ServiceLocator (for components to access services)
ServiceLocator.registerEngine(engine);

// Create a default scene
const scene = new Scene("DefaultScene");
engine.loadScene(scene);

// Create editor UI (this initializes project system)
const editor = new EditorUI(engine);
engine.setEditorUI(editor);

// Start the engine
engine.start();

// Make accessible from console for debugging
(window as any).engine = engine;
(window as any).ServiceLocator = ServiceLocator;
(window as any).editor = editor;

console.log('💡 Access from console:');
console.log('  - window.engine (the engine)');
console.log('  - window.scene (current scene)');
console.log('  - window.editor (editor UI)');
console.log('');
console.log('💡 Try these actions:');
console.log('  1. Click "New Project" and choose a folder');
console.log('  2. Add some cubes/spheres');
console.log('  3. Press Cmd/Ctrl+S to save');
console.log('  4. Refresh the browser');
console.log('  5. Click "Open Project" and choose same folder');
console.log('  6. Your scene is restored! 🎉');
console.log('');
console.log('💡 Keyboard shortcuts:');
console.log('  - Cmd/Ctrl+S: Save project');
console.log('  - Cmd/Ctrl+O: Open project');
console.log('  - Cmd/Ctrl+N: New project');
