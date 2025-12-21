import type { EditorUI } from './EditorUI';
import { Camera } from '../components/Camera';
import { Scene } from '../core/Scene';
import { GameObject } from '../core/GameObject';

// Import PCUI components
import { LabelGroup, NumericInput, VectorInput, TextInput, Button } from '@playcanvas/pcui';

export class InspectorPanel {
    private editorUI: EditorUI;
    private contentElement: HTMLElement;
    private scene: Scene | null;

    constructor(editorUI: EditorUI, scene: Scene | null) {
        this.editorUI = editorUI;
        this.scene = scene;
        this.contentElement = document.getElementById('inspector-content') as HTMLElement;

        // Listen for scene changes from project
        this.editorUI.getEngine().events.on('project.sceneChanged', (data: any) => {
            this.scene = data.scene;
            this.refresh();
        });
    }

    public refresh(): void {
        const go = this.scene!.events.invoke('selection.get') as GameObject | null;

        if (!go) {
            this.contentElement.innerHTML = '<div class="empty-state">Select an object to inspect</div>';
            return;
        }

        this.contentElement.innerHTML = '';

        // Object header with name input
        const nameInput = new TextInput({
            value: go.name
        });
        nameInput.on('change', (value: string) => {
            go.name = value;
            this.editorUI.refresh();
        });

        const header = new LabelGroup({
            text: 'Name',
            field: nameInput
        });
        this.contentElement.appendChild(header.dom);

        // Transform section
        this.addTransformSection(go);

        // Other components
        for (const component of go.getAllComponents()) {
            if (component.getTypeName() === 'Transform') continue;
            this.addComponentSection(component);
        }

        // Add Component button
        this.addAddComponentButton(go);
    }

    private addTransformSection(go: any): void {
        // Position
        const positionInput = new VectorInput({
            dimensions: 3,
            value: [go.transform.localPosition.x, go.transform.localPosition.y, go.transform.localPosition.z],
            precision: 2,
            step: 0.1
        });
        positionInput.on('change', (value: number[]) => {
            go.transform.localPosition.set(value[0], value[1], value[2]);
        });

        const positionGroup = new LabelGroup({
            text: 'Position',
            field: positionInput
        });
        this.contentElement.appendChild(positionGroup.dom);

        // Rotation (in degrees)
        const rotDegrees = [
            go.transform.localRotation.x * (180 / Math.PI),
            go.transform.localRotation.y * (180 / Math.PI),
            go.transform.localRotation.z * (180 / Math.PI)
        ];
        const rotationInput = new VectorInput({
            dimensions: 3,
            value: rotDegrees,
            precision: 1,
            step: 1
        });
        rotationInput.on('change', (value: number[]) => {
            go.transform.localRotation.set(
                value[0] * (Math.PI / 180),
                value[1] * (Math.PI / 180),
                value[2] * (Math.PI / 180)
            );
        });

        const rotationGroup = new LabelGroup({
            text: 'Rotation',
            field: rotationInput
        });
        this.contentElement.appendChild(rotationGroup.dom);

        // Scale
        const scaleInput = new VectorInput({
            dimensions: 3,
            value: [go.transform.localScale.x, go.transform.localScale.y, go.transform.localScale.z],
            precision: 2,
            step: 0.1
        });
        scaleInput.on('change', (value: number[]) => {
            go.transform.localScale.set(value[0], value[1], value[2]);
        });

        const scaleGroup = new LabelGroup({
            text: 'Scale',
            field: scaleInput
        });
        this.contentElement.appendChild(scaleGroup.dom);
    }



    private addComponentSection(component: any): void {
        // Special handling for Camera component
        if (component instanceof Camera) {
            this.addCameraProperties(component);
        }
        // Other components can be added here later
    }

    private addCameraProperties(camera: Camera): void {
        // Field of View
        const fovInput = new NumericInput({
            value: camera.fieldOfView,
            min: 1,
            max: 179,
            step: 1,
            precision: 0
        });
        fovInput.on('change', (value: number) => {
            camera.fieldOfView = value;
        });

        const fovGroup = new LabelGroup({
            text: 'Field of View',
            field: fovInput
        });
        this.contentElement.appendChild(fovGroup.dom);

        // Near Clip Plane
        const nearInput = new NumericInput({
            value: camera.nearClipPlane,
            min: 0.01,
            max: 100,
            step: 0.01,
            precision: 2
        });
        nearInput.on('change', (value: number) => {
            camera.nearClipPlane = value;
        });

        const nearGroup = new LabelGroup({
            text: 'Near Clip',
            field: nearInput
        });
        this.contentElement.appendChild(nearGroup.dom);

        // Far Clip Plane
        const farInput = new NumericInput({
            value: camera.farClipPlane,
            min: 1,
            max: 10000,
            step: 1,
            precision: 0
        });
        farInput.on('change', (value: number) => {
            camera.farClipPlane = value;
        });

        const farGroup = new LabelGroup({
            text: 'Far Clip',
            field: farInput
        });
        this.contentElement.appendChild(farGroup.dom);

        // Aspect (read-only)
        const aspectInput = new TextInput({
            value: camera.aspect.toFixed(3)
        });
        // Make it read-only by not attaching change events

        const aspectGroup = new LabelGroup({
            text: 'Aspect',
            field: aspectInput
        });
        this.contentElement.appendChild(aspectGroup.dom);
    }



    private addAddComponentButton(go: any): void {
        const button = new Button({
            text: '+ Add Component'
        });

        button.on('click', () => {
            this.showAddComponentMenu(go, button.dom);
        });

        this.contentElement.appendChild(button.dom);
    }

    private showAddComponentMenu(go: any, buttonElement: HTMLElement): void {
        // Create a simple dropdown menu
        const menu = document.createElement('div');
        menu.style.position = 'absolute';
        menu.style.backgroundColor = '#2a2a2a';
        menu.style.border = '1px solid #444';
        menu.style.borderRadius = '4px';
        menu.style.padding = '5px 0';
        menu.style.zIndex = '10000';
        menu.style.minWidth = '200px';
        menu.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.5)';

        // Position the menu relative to the button
        const rect = buttonElement.getBoundingClientRect();
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.bottom + 5}px`;

        // Add Camera option
        const cameraOption = document.createElement('div');
        cameraOption.textContent = '📷 Camera';
        cameraOption.style.padding = '8px 15px';
        cameraOption.style.cursor = 'pointer';
        cameraOption.style.color = '#fff';
        cameraOption.addEventListener('mouseover', () => {
            cameraOption.style.backgroundColor = '#3a3a3a';
        });
        cameraOption.addEventListener('mouseout', () => {
            cameraOption.style.backgroundColor = 'transparent';
        });
        cameraOption.addEventListener('click', () => {
            // Check if GameObject already has a Camera component
            if (go.getComponent(Camera)) {
                alert('GameObject already has a Camera component');
            } else {
                const camera = new Camera();
                go.addComponent(camera);
                this.editorUI.refresh();
            }
            // Remove menu and cleanup event listener
            if (menu.parentNode) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', closeMenu);
        });
        menu.appendChild(cameraOption);

        // Close menu when clicking outside
        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                if (menu.parentNode) {
                    document.body.removeChild(menu);
                }
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);

        document.body.appendChild(menu);
    }
}
