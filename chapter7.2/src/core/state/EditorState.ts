import { Events } from '../../events';
import type { Engine } from '../Engine';

/**
 * Editor State Manager
 * Manages play/pause/stop state using closure pattern
 */
export const registerEditorState = (events: Events, engine: Engine) => {
    // Private state in closure - inaccessible from outside
    let isPlaying = false;
    let isEditorMode = true;
    let isPaused = false;

    // Expose getters via events
    events.function('editor.isPlaying', () => isPlaying);
    events.function('editor.isEditorMode', () => isEditorMode);
    events.function('editor.isPaused', () => isPaused);

    // Handle state changes
    events.on('editor.play', () => {
        if (isPlaying) return;

        isPlaying = true;
        isPaused = false;
        engine.play();

        events.fire('editor.playStateChanged', {
            isPlaying,
            isEditorMode,
            isPaused
        });

        console.log('🎮 EditorState: Play mode activated');
    });

    events.on('editor.pause', () => {
        if (!isPlaying) return;

        isPaused = !isPaused;
        // Note: Engine doesn't have pause/resume methods yet
        // This just toggles the flag for now

        events.fire('editor.playStateChanged', {
            isPlaying,
            isEditorMode,
            isPaused
        });

        console.log(isPaused ? '⏸️  EditorState: Paused' : '▶️  EditorState: Resumed');
    });

    events.on('editor.stop', () => {
        if (!isPlaying) return;

        isPlaying = false;
        isPaused = false;
        engine.stop();

        events.fire('editor.playStateChanged', {
            isPlaying,
            isEditorMode,
            isPaused
        });

        console.log('⏹️  EditorState: Stop - back to editor mode');
    });

    events.on('editor.toggleMode', () => {
        isEditorMode = !isEditorMode;
        events.fire('editor.modeChanged', isEditorMode);
        console.log(`📝 EditorState: Mode changed to ${isEditorMode ? 'Editor' : 'Runtime'}`);
    });

    console.log('✅ EditorState manager registered');
};
