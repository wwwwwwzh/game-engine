# Project Coding Rules (Non-Obvious Only)

- Use custom Events system from src/events.ts instead of standard Node.js events (provides RPC-like function calls)
- State managers register via events.function() for global access (see EditorState.ts, SelectionState.ts)
- All Components must implement ISerializable interface for scene serialization
- GameObject parenting uses Three.js Object3D.attach() which preserves world transform
- Renderer initialization depends on scene's threeScene - created after scene.load()
- InputManager is a singleton - access via InputManager.initialize() and getInstance()