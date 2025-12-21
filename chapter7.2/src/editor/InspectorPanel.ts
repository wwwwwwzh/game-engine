import {
    Panel,
    Label,
    LabelGroup,
    TextInput,
    NumericInput,
    VectorInput
} from '@playcanvas/pcui';
import type { GameObject } from '../core/GameObject';
import { Transform } from '../components/Transform';
import type { Scene } from '../core/Scene';
import type { Events } from '../events';
import { Camera } from '../components/Camera';

/**
 * InspectorPanel - Object inspector using PCUI property controls.
 *
 * Uses Events bus to get selected object (closure pattern from SelectionState)
 */
export class InspectorPanel {
    private panel: Panel;
    private scene: Scene | null;
    private events: Events;

    constructor(events: Events, scene: Scene | null) {
        this.events = events;
        this.scene = scene;

        // Create main panel
        this.panel = new Panel({
            collapseHorizontally: true,
            collapsible: true,
            scrollable: true,
            headerText: 'Inspector',
            width: 300,
            height: '100%',
            resizable: 'left',
            resizeMin: 300,
            resizeMax: 600
        });

        // Listen to Events for updates
        this.setupEventListeners();

        // Initial refresh
        this.refresh();
    }

    private setupEventListeners(): void {
        // Refresh when selection changes
        this.events.on('selection.changed', () => {
            this.refresh();
        });

        // Refresh when scene changes
        this.events.on('project.sceneChanged', (data: any) => {
            this.scene = data.scene;
            this.refresh();
        });
    }

    /**
     * Rebuild inspector UI
     * Called manually when selection/scene changes (same pattern as 7.1)
     */
    public refresh(): void {
        this.panel.clear();

        // Get selected object from Events bus (closure pattern)
        const selectedObject = this.events.invoke('selection.get') as GameObject | null;

        if (!selectedObject) {
            const emptyLabel = new Label({
                text: 'Select an object to inspect',
                class: 'empty-state'
            });
            this.panel.append(emptyLabel);
            return;
        }

        // Name input
        const nameInput = new TextInput({
            value: selectedObject.name,
            placeholder: 'Object Name'
        });
        nameInput.on('change', (value: string) => {
            selectedObject.name = value;
            // Fire event to refresh hierarchy
            this.events.fire('scene.hierarchyChanged');
        });

        this.panel.append(nameInput);

        // Transform panel
        const transformPanel = this.createTransformPanel(selectedObject);
        this.panel.append(transformPanel);

        // Component panels
        for (const component of selectedObject.getAllComponents()) {
            if (!(component instanceof Transform)) {
                const componentPanel = this.createComponentPanel(component);
                if (componentPanel) {
                    this.panel.append(componentPanel);
                }
            }
        }
    }

    /**
     * Create transform section with position/rotation/scale
     */
    private createTransformPanel(obj: GameObject): Panel {
        const panel = new Panel({
            headerText: 'Transform',
            collapsible: true,
            collapsed: false
        });

        // Position
        panel.append(new Label({ text: 'Position' }));
        panel.append(this.createVector3Input(
            obj.transform.localPosition,
            (x, y, z) => obj.transform.localPosition.set(x, y, z)
        ));

        // Rotation
        panel.append(new Label({ text: 'Rotation' }));
        panel.append(this.createVector3Input(
            obj.transform.localRotation,
            (x, y, z) => obj.transform.localRotation.set(x* (Math.PI / 180), y* (Math.PI / 180), z* (Math.PI / 180))
        ));

        // Scale
        panel.append(new Label({ text: 'Scale' }));
        panel.append(this.createVector3Input(
            obj.transform.localScale,
            (x, y, z) => obj.transform.localScale.set(x, y, z)
        ));

        return panel;
    }

    /**
     * Create X/Y/Z numeric inputs
     */
    private createVector3Input(
        value: { x: number; y: number; z: number },
        onChange: (x: number, y: number, z: number) => void
    ): LabelGroup {
        const vectorInput = new VectorInput({
            dimensions: 3,
            value: [value.x, value.y, value.z],
            // min: 0,
            // max: 1,
            placeholder: ['X', 'Y', 'Z'],
            precision: 5,
            // step: 0.1
        });

        vectorInput.on('change', (v: number[]) => {
            onChange(v[0], v[1], v[2]);
        });

        return new LabelGroup({
            text: '3D Vector',
            field: vectorInput
        });
    }

    /**
     * Create component-specific panel
     */
    private createComponentPanel(component: any): Panel | null {
        if (component instanceof Camera) {
            return this.createCameraPanel(component);
        }

        // Default component display
        const panel = new Panel({
            headerText: component.getTypeName(),
            collapsible: true,
            collapsed: false
        });

        panel.append(new Label({
            text: 'No editable properties',
            class: 'empty-state'
        }));

        return panel;
    }

    /**
     * Camera component panel
     */
    private createCameraPanel(camera: Camera): Panel {
        const panel = new Panel({
            headerText: 'Camera',
            collapsible: true,
            collapsed: false
        });

        // FOV
        panel.append(new Label({ text: 'Field of View' }));
        const fovInput = new NumericInput({
            value: camera.fieldOfView,
            min: 1,
            max: 179,
            precision: 0
        });
        fovInput.on('change', (v: number) => {
            camera.fieldOfView = v;
        });
        panel.append(fovInput);

        // Near clip
        panel.append(new Label({ text: 'Near Clip' }));
        const nearInput = new NumericInput({
            value: camera.nearClipPlane,
            min: 0.01,
            max: 100,
            precision: 2,
            step: 0.01
        });
        nearInput.on('change', (v: number) => {
            camera.nearClipPlane = v;
        });
        panel.append(nearInput);

        // Far clip
        panel.append(new Label({ text: 'Far Clip' }));
        const farInput = new NumericInput({
            value: camera.farClipPlane,
            min: 1,
            max: 10000,
            precision: 0
        });
        farInput.on('change', (v: number) => {
            camera.farClipPlane = v;
        });
        panel.append(farInput);

        return panel;
    }

    getElement(): panel {
        return this.panel;
    }
}
