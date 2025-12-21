# Project Debug Rules (Non-Obvious Only)

- Global objects exposed for debugging: window.engine, window.events, window.scene, window.editor
- Trigger editor actions via events.fire(): "editor.play", "editor.stop", "editor.pause"
- Access state via events.invoke(): "editor.isPlaying", "selection.get"
- Engine switches camera automatically in play mode - finds first Camera component in scene
- Input state cleared at end of each frame - consumers must check current frame state