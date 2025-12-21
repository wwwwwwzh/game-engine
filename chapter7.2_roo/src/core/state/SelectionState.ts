import { Events } from '../../events';
import type { Scene } from '../Scene';
import type { GameObject } from '../GameObject';

/**
 * Selection State Manager
 * Manages object selection using closure pattern
 */
export const registerSelectionState = (events: Events, scene: Scene) => {
    // Private state in closure
    let selectedObject: GameObject | null = null;
    let selectedObjects: GameObject[] = [];
    let multiSelectEnabled = false;

    // Getters
    events.function('selection.get', () => selectedObject);
    events.function('selection.getAll', () => [...selectedObjects]);
    events.function('selection.isMultiSelect', () => multiSelectEnabled);

    // Single selection
    events.on('selection.set', (obj: GameObject | null) => {
        const previous = selectedObject;
        selectedObject = obj;
        selectedObjects = obj ? [obj] : [];

        events.fire('selection.changed', {
            current: selectedObject,
            previous: previous,
            all: selectedObjects
        });

        if (obj) {
            console.log(`🎯 SelectionState: Selected "${obj.name}"`);
        } else {
            console.log('🎯 SelectionState: Cleared selection');
        }
    });

    // Multi-selection
    events.on('selection.add', (obj: GameObject) => {
        if (!selectedObjects.includes(obj)) {
            selectedObjects.push(obj);
            selectedObject = obj; // Last selected becomes primary

            events.fire('selection.changed', {
                current: selectedObject,
                previous: null,
                all: selectedObjects
            });

            console.log(`🎯 SelectionState: Added "${obj.name}" to selection (${selectedObjects.length} total)`);
        }
    });

    events.on('selection.remove', (obj: GameObject) => {
        const index = selectedObjects.indexOf(obj);
        if (index !== -1) {
            selectedObjects.splice(index, 1);
            selectedObject = selectedObjects[selectedObjects.length - 1] || null;

            events.fire('selection.changed', {
                current: selectedObject,
                previous: obj,
                all: selectedObjects
            });

            console.log(`🎯 SelectionState: Removed "${obj.name}" from selection (${selectedObjects.length} remaining)`);
        }
    });

    events.on('selection.clear', () => {
        const previous = selectedObject;
        selectedObject = null;
        selectedObjects = [];

        events.fire('selection.changed', {
            current: null,
            previous: previous,
            all: []
        });

        console.log('🎯 SelectionState: Cleared selection');
    });

    // Handle scene cleanup - clear selection if selected object is removed
    events.on('scene.objectRemoved', (obj: GameObject) => {
        if (selectedObject === obj) {
            events.fire('selection.set', null);
        } else if (selectedObjects.includes(obj)) {
            events.fire('selection.remove', obj);
        }
    });

    console.log('✅ SelectionState manager registered');
};
