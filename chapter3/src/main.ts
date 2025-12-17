import { Engine } from './core/Engine';
import { Scene } from './core/Scene';
import { EditorUI } from './editor/EditorUI';

console.log('='.repeat(50));
console.log('🎮 GAME ENGINE - CHAPTER 3');
console.log('Entity-Component Architecture + Editor');
console.log('='.repeat(50));

// Create engine
const engine = new Engine('game-canvas');

// Create a scene
const scene = new Scene("Main Scene");
engine.loadScene(scene);

// Create editor UI
const editor = new EditorUI(engine);

// Start the engine
engine.start();

// Make accessible from console
(window as any).engine = engine;
(window as any).scene = scene;
(window as any).editor = editor;

console.log('💡 Access from console:');
console.log('  - window.engine (the engine)');
console.log('  - window.scene (current scene)');
console.log('  - window.editor (editor UI)');
console.log('💡 Try clicking "Add Cube" or "Add Sphere"!');
