import { Engine } from './core/Engine';
import { Scene } from './core/Scene';
import { EditorUI } from './editor/EditorUI';
import { Events } from './events';

// Import state managers
import { registerEditorState } from './core/state/EditorState';
import { registerSelectionState } from './core/state/SelectionState';

console.log('='.repeat(50));
console.log('🎮 GAME ENGINE - CHAPTER 7.2');
console.log('Professional UI with PCUI');
console.log('='.repeat(50));

// 1. Create event bus
const events = new Events();

const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
document.body.appendChild(canvas); // Temporary mount

// 2. Create engine
const engine = new Engine('game-canvas', events);

// 3. Create scene
const scene = new Scene("DefaultScene", events);

// 4. Register state managers
registerEditorState(events, engine);
registerSelectionState(events, scene);

// 5. Load scene
engine.loadScene(scene);

// 6. Create PCUI editor
const editor = new EditorUI(engine);
engine.setEditorUI(editor);

// 7. Start engine
engine.start();

// 8. Update FPS display in main loop
setInterval(() => {
    const fps = Math.round(1000 / engine.getDeltaTime());
    editor.updateStats(fps);
}, 100);

// 9. Expose for debugging
(window as any).engine = engine;
(window as any).events = events;
(window as any).editor = editor;
(window as any).scene = scene;

console.log('✅ PCUI Editor initialized');
