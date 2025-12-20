import { Engine } from './core/Engine';
import { Scene } from './core/Scene';
import { EditorUI } from './editor/EditorUI';
import { Events } from './events';

// Import state managers
import { registerEditorState } from './core/state/EditorState';
import { registerSelectionState } from './core/state/SelectionState';

console.log('='.repeat(50));
console.log('🎮 GAME ENGINE - CHAPTER 7.1');
console.log('Events System + State Managers');
console.log('='.repeat(50));

// 1. CREATE EVENT BUS
const events = new Events();
console.log('✅ Event bus created');

// 2. CREATE ENGINE (with events)
const engine = new Engine('game-canvas', events);

// 3. CREATE SCENE (with events)
const scene = new Scene("DefaultScene", events);

// 4. REGISTER STATE MANAGERS
console.log('\n📦 Registering state managers...');
registerEditorState(events, engine);
registerSelectionState(events, scene);

// 5. LOAD SCENE
engine.loadScene(scene);

// 6. CREATE EDITOR UI (with engine for now - will be refactored later)
const editor = new EditorUI(engine);
engine.setEditorUI(editor);

// 7. START ENGINE
engine.start();

// 8. EXPOSE FOR DEBUGGING
(window as any).engine = engine;
(window as any).events = events;
(window as any).editor = editor;
(window as any).scene = scene;

console.log('\n💡 Access from console:');
console.log('  - window.engine (the engine)');
console.log('  - window.events (event bus)');
console.log('  - window.scene (current scene)');
console.log('  - window.editor (editor UI)');
console.log('');
console.log('💡 Try events system:');
console.log('  - events.fire("editor.play") - Start play mode');
console.log('  - events.fire("editor.stop") - Stop play mode');
console.log('  - events.invoke("editor.isPlaying") - Check if playing');
console.log('  - events.invoke("selection.get") - Get selected object');
console.log('');
console.log('💡 Keyboard shortcuts:');
console.log('  - Cmd/Ctrl+S: Save project');
console.log('  - Cmd/Ctrl+O: Open project');
console.log('  - Cmd/Ctrl+N: New project');
console.log('');
console.log('✅ Game Engine initialized with Events pattern');
