# Project Architecture Rules (Non-Obvious Only)

- Events system drives all inter-system communication - no direct method calls between Engine, Scene, EditorUI
- State managers encapsulate behavior using closure pattern - state private, exposed via event functions
- ECS design with mandatory Transform component - every GameObject has one automatically
- Editor/play mode separation: Engine switches cameras and updates different systems based on isPlaying flag
- Renderer depends on Scene's threeScene - initialization order critical (scene.load() before renderer creation)
- InputManager singleton pattern with per-frame state clearing