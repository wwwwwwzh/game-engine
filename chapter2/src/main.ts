import { Engine } from './core/Engine';

/**
 * Entry point for the game engine
 */

console.log('='.repeat(50));
console.log('🎮 GAME ENGINE - CHAPTER 2');
console.log('The Rendering Foundation');
console.log('='.repeat(50));

// Create and start the engine
const engine = new Engine('game-canvas');
engine.start();

// Make engine accessible from browser console for debugging
(window as any).engine = engine;

console.log('💡 Tip: Access the engine from console with "window.engine"');
console.log('💡 Try: window.engine.stop() or window.engine.start()');
console.log('💡 Try: window.engine.getRenderer().getCamera().position.z = 10');


