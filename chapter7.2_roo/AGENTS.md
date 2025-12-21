# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- Vite build target must be 'esnext' for WebGPU support (configured in vite.config.ts)
- Custom Events system in src/events.ts provides event handling and RPC-like function calls
- State managers (EditorState, SelectionState) use closure pattern and register via events
- ECS architecture: GameObject has always-present Transform component, Components implement ISerializable
- No testing framework configured; src/test.ts is a demo file
- Editor has play/edit modes managed through events