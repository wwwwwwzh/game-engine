import type { EditorUI } from './EditorUI';

/**
 * InspectorPanel shows properties of the selected GameObject.
 * 
 * This is EDITOR code - only runs in the editor.
 */
export class InspectorPanel {
    private editorUI: EditorUI;
    private contentElement: HTMLElement;
    
    constructor(editorUI: EditorUI) {
        this.editorUI = editorUI;
        this.contentElement = document.getElementById('inspector-content') as HTMLElement;
        
        console.log('🔍 Inspector panel initialized');
    }
    
    /**
     * Refresh the inspector display
     */
    public refresh(): void {
        const selectedId = this.editorUI.getSelectedObjectId();
        
        if (!selectedId) {
            this.contentElement.innerHTML = '<div class="empty-state">Select an object to inspect</div>';
            return;
        }
        
        const engine = this.editorUI.getEngine();
        const scene = engine.getScene();
        
        if (!scene) {
            this.contentElement.innerHTML = '<div class="empty-state">No scene loaded</div>';
            return;
        }
        
        const gameObject = scene.findById(selectedId);
        
        if (!gameObject) {
            this.contentElement.innerHTML = '<div class="empty-state">Object not found</div>';
            return;
        }
        
        // Clear content
        this.contentElement.innerHTML = '';
        
        // Add GameObject header
        const header = document.createElement('div');
        header.style.cssText = 'padding: 15px; border-bottom: 1px solid #3a3a3a; font-size: 16px; font-weight: 600;';
        header.textContent = gameObject.name;
        this.contentElement.appendChild(header);
        
        // Add components
        const components = gameObject.getAllComponents();
        for (const component of components) {
            const componentElement = this.createComponentElement(component);
            this.contentElement.appendChild(componentElement);
        }
    }
    
    /**
     * Create a DOM element for a component
     */
    private createComponentElement(component: any): HTMLElement {
        const element = document.createElement('div');
        element.className = 'component';
        
        // Header
        const header = document.createElement('div');
        header.className = 'component-header';
        header.textContent = component.getTypeName();
        element.appendChild(header);
        
        // Body
        const body = document.createElement('div');
        body.className = 'component-body';
        
        // Show properties based on component type
        if (component.getTypeName() === 'Transform') {
            this.addTransformProperties(body, component);
        } else {
            // Generic component display
            body.innerHTML = '<div class="property-value">No editable properties</div>';
        }
        
        element.appendChild(body);
        
        return element;
    }
    
    /**
     * Add Transform properties to the body
     */
    private addTransformProperties(body: HTMLElement, transform: any): void {
        // Position
        const positionProp = document.createElement('div');
        positionProp.className = 'property';
        positionProp.innerHTML = `
            <div class="property-label">Position</div>
            <div class="property-value">
                X: ${transform.position.x.toFixed(2)}, 
                Y: ${transform.position.y.toFixed(2)}, 
                Z: ${transform.position.z.toFixed(2)}
            </div>
        `;
        body.appendChild(positionProp);
        
        // Rotation
        const rotationProp = document.createElement('div');
        rotationProp.className = 'property';
        rotationProp.innerHTML = `
            <div class="property-label">Rotation (degrees)</div>
            <div class="property-value">
                X: ${(transform.rotation.x * 180 / Math.PI).toFixed(2)}, 
                Y: ${(transform.rotation.y * 180 / Math.PI).toFixed(2)}, 
                Z: ${(transform.rotation.z * 180 / Math.PI).toFixed(2)}
            </div>
        `;
        body.appendChild(rotationProp);
        
        // Scale
        const scaleProp = document.createElement('div');
        scaleProp.className = 'property';
        scaleProp.innerHTML = `
            <div class="property-label">Scale</div>
            <div class="property-value">
                X: ${transform.scale.x.toFixed(2)}, 
                Y: ${transform.scale.y.toFixed(2)}, 
                Z: ${transform.scale.z.toFixed(2)}
            </div>
        `;
        body.appendChild(scaleProp);
    }
}
