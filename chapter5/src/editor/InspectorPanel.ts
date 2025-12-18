import type { EditorUI } from './EditorUI';

export class InspectorPanel {
    private editorUI: EditorUI;
    private contentElement: HTMLElement;

    constructor(editorUI: EditorUI) {
        this.editorUI = editorUI;
        this.contentElement = document.getElementById('inspector-content') as HTMLElement;
    }

    public refresh(): void {
        const selectedId = this.editorUI.getSelectedObjectId();

        if (!selectedId) {
            this.contentElement.innerHTML = '<div class="empty-state">Select an object to inspect</div>';
            return;
        }

        const scene = this.editorUI.getEngine().getScene();
        if (!scene) return;

        const go = scene.findById(selectedId);
        if (!go) {
            this.contentElement.innerHTML = '<div class="empty-state">Object not found</div>';
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
        content.innerHTML = '<div class="empty-state">No editable properties</div>';
        section.appendChild(content);

        this.contentElement.appendChild(section);
    }
}
