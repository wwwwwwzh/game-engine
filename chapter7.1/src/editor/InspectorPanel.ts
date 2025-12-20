import type { EditorUI } from './EditorUI';
import { Camera } from '../components/Camera';
import { Scene } from '../core/Scene';
import { GameObject } from '../core/GameObject';

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
        const header = document.createElement('div');
        header.className = 'object-header';
        const nameInput = document.createElement('input');
        nameInput.value = go.name;
        nameInput.addEventListener('change', () => {
            go.name = nameInput.value;
            this.editorUI.refresh();
        });
        header.appendChild(nameInput);
        this.contentElement.appendChild(header);

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
        const section = document.createElement('div');
        section.className = 'component-section';

        const header = document.createElement('div');
        header.className = 'component-header';
        header.textContent = '🔄 Transform';
        section.appendChild(header);

        const content = document.createElement('div');
        content.className = 'component-content';

        // Position
        content.appendChild(this.createVector3Row('Position', go.transform.localPosition, (v) => {
            go.transform.localPosition.copy(v);
        }));

        // Rotation (in degrees)
        const rotDegrees = {
            x: go.transform.localRotation.x * (180 / Math.PI),
            y: go.transform.localRotation.y * (180 / Math.PI),
            z: go.transform.localRotation.z * (180 / Math.PI)
        };
        content.appendChild(this.createVector3Row('Rotation', rotDegrees, (v) => {
            go.transform.localRotation.set(
                v.x * (Math.PI / 180),
                v.y * (Math.PI / 180),
                v.z * (Math.PI / 180)
            );
        }));

        // Scale
        content.appendChild(this.createVector3Row('Scale', go.transform.localScale, (v) => {
            go.transform.localScale.copy(v);
        }));

        section.appendChild(content);
        this.contentElement.appendChild(section);
    }

    private createVector3Row(label: string, values: any, onChange: (v: any) => void): HTMLElement {
        const row = document.createElement('div');
        row.className = 'property-row';

        const labelEl = document.createElement('div');
        labelEl.className = 'property-label';
        labelEl.textContent = label;
        row.appendChild(labelEl);

        const inputContainer = document.createElement('div');
        inputContainer.className = 'property-value vector3-input';

        for (const axis of ['x', 'y', 'z']) {
            const axisLabel = document.createElement('span');
            axisLabel.className = `axis-label axis-${axis}`;
            axisLabel.textContent = axis.toUpperCase();
            inputContainer.appendChild(axisLabel);

            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'property-input';
            input.value = values[axis].toFixed(2);
            input.step = '0.1';

            input.addEventListener('change', () => {
                values[axis] = parseFloat(input.value) || 0;
                onChange(values);
            });

            inputContainer.appendChild(input);
        }

        row.appendChild(inputContainer);
        return row;
    }

    private addComponentSection(component: any): void {
        const section = document.createElement('div');
        section.className = 'component-section';

        const header = document.createElement('div');
        header.className = 'component-header';
        header.textContent = `📦 ${component.getTypeName()}`;
        section.appendChild(header);

        const content = document.createElement('div');
        content.className = 'component-content';

        // Special handling for Camera component
        if (component instanceof Camera) {
            this.addCameraProperties(content, component);
        } else {
            content.innerHTML = '<div class="empty-state">No editable properties</div>';
        }

        section.appendChild(content);

        this.contentElement.appendChild(section);
    }

    private addCameraProperties(content: HTMLElement, camera: Camera): void {
        // Field of View
        content.appendChild(this.createNumberRow('Field of View', camera.fieldOfView, (value) => {
            camera.fieldOfView = value;
        }, { min: 1, max: 179, step: 1 }));

        // Near Clip Plane
        content.appendChild(this.createNumberRow('Near Clip', camera.nearClipPlane, (value) => {
            camera.nearClipPlane = value;
        }, { min: 0.01, max: 100, step: 0.01 }));

        // Far Clip Plane
        content.appendChild(this.createNumberRow('Far Clip', camera.farClipPlane, (value) => {
            camera.farClipPlane = value;
        }, { min: 1, max: 10000, step: 1 }));

        // Aspect (read-only)
        const aspectRow = document.createElement('div');
        aspectRow.className = 'property-row';
        aspectRow.innerHTML = `
            <div class="property-label">Aspect</div>
            <div class="property-value">
                <input type="text" class="property-input" value="${camera.aspect.toFixed(3)}" disabled>
            </div>
        `;
        content.appendChild(aspectRow);
    }

    private createNumberRow(
        label: string,
        value: number,
        onChange: (value: number) => void,
        options: { min?: number; max?: number; step?: number } = {}
    ): HTMLElement {
        const row = document.createElement('div');
        row.className = 'property-row';

        const labelEl = document.createElement('div');
        labelEl.className = 'property-label';
        labelEl.textContent = label;
        row.appendChild(labelEl);

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'property-input';
        input.value = value.toFixed(2);
        if (options.min !== undefined) input.min = options.min.toString();
        if (options.max !== undefined) input.max = options.max.toString();
        if (options.step !== undefined) input.step = options.step.toString();

        input.addEventListener('change', () => {
            const newValue = parseFloat(input.value) || value;
            onChange(newValue);
        });

        const valueContainer = document.createElement('div');
        valueContainer.className = 'property-value';
        valueContainer.appendChild(input);
        row.appendChild(valueContainer);

        return row;
    }

    private addAddComponentButton(go: any): void {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.padding = '10px';
        buttonContainer.style.textAlign = 'center';

        const button = document.createElement('button');
        button.className = 'btn';
        button.textContent = '+ Add Component';
        button.style.width = '100%';

        button.addEventListener('click', () => {
            this.showAddComponentMenu(go, button);
        });

        buttonContainer.appendChild(button);
        this.contentElement.appendChild(buttonContainer);
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
