import type { EditorUI } from './EditorUI';

/**
 * HierarchyPanel shows all GameObjects in the scene.
 * 
 * This is EDITOR code - only runs in the editor.
 */
export class HierarchyPanel {
    private editorUI: EditorUI;
    private contentElement: HTMLElement;
    
    constructor(editorUI: EditorUI) {
        this.editorUI = editorUI;
        this.contentElement = document.getElementById('hierarchy-content') as HTMLElement;
        
        console.log('📋 Hierarchy panel initialized');
    }
    
    /**
     * Refresh the hierarchy display
     */
    public refresh(): void {
        const engine = this.editorUI.getEngine();
        const scene = engine.getScene();
        
        if (!scene) {
            this.contentElement.innerHTML = '<div class="empty-state">No scene loaded</div>';
            return;
        }
        
        const rootObjects = scene.getRootGameObjects();
        
        if (rootObjects.length === 0) {
            this.contentElement.innerHTML = '<div class="empty-state">No objects in scene</div>';
            return;
        }
        
        // Clear content
        this.contentElement.innerHTML = '';
        
        // Add each root GameObject
        for (const gameObject of rootObjects) {
            const item = this.createGameObjectItem(gameObject);
            this.contentElement.appendChild(item);
        }
    }
    
    /**
     * Create a DOM element for a GameObject
     */
    private createGameObjectItem(gameObject: any): HTMLElement {
        const item = document.createElement('div');
        item.className = 'gameobject-item';
        
        // Check if selected
        if (gameObject.id === this.editorUI.getSelectedObjectId()) {
            item.classList.add('selected');
        }
        
        // Icon
        const icon = document.createElement('span');
        icon.className = 'gameobject-icon';
        icon.textContent = '📦';
        item.appendChild(icon);
        
        // Name
        const name = document.createElement('span');
        name.textContent = gameObject.name;
        item.appendChild(name);
        
        // Click to select
        item.addEventListener('click', () => {
            this.editorUI.selectObject(gameObject.id);
        });
        
        return item;
    }
}
