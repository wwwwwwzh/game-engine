import {
    Container,
    Label,
    TextInput,
    NumericInput,
    Panel
} from '@playcanvas/pcui';
import type { GameObject } from '../core/GameObject';
import type { Scene } from '../core/Scene';
import type { Events } from '../events';
import { Camera } from '../components/Camera';

/**
 * InspectorPanel - Object inspector using PCUI property controls.
 *
 * Before (7.1): ~250 lines of manual input creation
 * After (7.2): ~90 lines using PCUI components
 *
 * Uses Events bus to get selected object (closure pattern from SelectionState)
 */
export class InspectorPanel {
    private container: Container;
    private scene: Scene | null;
    private events: Events;

    constructor(events: Events, scene: Scene | null) {
        this.events = events;
        this.scene = scene;

        // Create main container
        this.container = new Container({
            class: 'inspector-panel',
            flex: true,
            flexDirection: 'column',
            width: '100%'
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
        this.container.clear();

        // Get selected object from Events bus (closure pattern)
        const selectedObject = this.events.invoke('selection.get') as GameObject | null;

        if (!selectedObject) {
            const emptyLabel = new Label({
                text: 'Select an object to inspect',
                class: 'empty-state'
            });
            this.container.append(emptyLabel);
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

        this.container.append(nameInput);

        // Transform panel
        const transformPanel = this.createTransformPanel(selectedObject);
        this.container.append(transformPanel);

        // Component panels
        for (const component of selectedObject.getAllComponents()) {
            const componentPanel = this.createComponentPanel(component);
            if (componentPanel) {
                this.container.append(componentPanel);
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
            obj.transform.position,
            (x, y, z) => obj.transform.position.set(x, y, z)
        ));

        // Rotation
        panel.append(new Label({ text: 'Rotation' }));
        panel.append(this.createVector3Input(
            obj.transform.rotation,
            (x, y, z) => obj.transform.rotation.set(x, y, z)
        ));

        // Scale
        panel.append(new Label({ text: 'Scale' }));
        panel.append(this.createVector3Input(
            obj.transform.scale,
            (x, y, z) => obj.transform.scale.set(x, y, z)
        ));

        return panel;
    }

    /**
     * Create X/Y/Z numeric inputs
     */
    private createVector3Input(
        value: { x: number; y: number; z: number },
        onChange: (x: number, y: number, z: number) => void
    ): Container {
        const container = new Container({
            flex: true,
            flexDirection: 'row'
        });

        const xInput = new NumericInput({
            value: value.x,
            placeholder: 'X',
            precision: 2,
            step: 0.1
        });
        xInput.on('change', (v: number) => onChange(v, value.y, value.z));

        const yInput = new NumericInput({
            value: value.y,
            placeholder: 'Y',
            precision: 2,
            step: 0.1
        });
        yInput.on('change', (v: number) => onChange(value.x, v, value.z));

        const zInput = new NumericInput({
            value: value.z,
            placeholder: 'Z',
            precision: 2,
            step: 0.1
        });
        zInput.on('change', (v: number) => onChange(value.x, value.y, v));

        container.append(new Label({ text: 'X' }));
        container.append(xInput);
        container.append(new Label({ text: 'Y' }));
        container.append(yInput);
        container.append(new Label({ text: 'Z' }));
        container.append(zInput);

        return container;
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

    getElement(): Container {
        return this.container;
    }
}
