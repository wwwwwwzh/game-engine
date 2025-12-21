# Project Documentation Rules (Non-Obvious Only)

- Custom Events system in src/events.ts extends EventHandler with function() method for RPC calls
- State management uses closure pattern - private state inaccessible outside registered functions
- ECS requires Transform component on all GameObjects - automatically added in constructor
- Scene serialization handles components separately from GameObject hierarchy
- Editor UI manages camera controllers and gizmos, integrated via Engine.setEditorUI()