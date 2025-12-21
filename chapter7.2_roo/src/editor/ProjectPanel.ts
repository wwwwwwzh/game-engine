import type { EditorUI } from './EditorUI';
import type { Project } from '../core/Project';
import type { AssetManager, Asset } from '../core/AssetManager';
import { GameObject } from '../core/GameObject';

// Import PCUI components
import { Button } from '@playcanvas/pcui';

/**
 * ProjectPanel - Visual asset browser showing project structure and loaded assets.
 *
 * Layout:
 * ┌─────────────────────────────────┐
 * │ Project Name           [Refresh]│
 * ├─────────────────────────────────┤
 * │ Folder Tree                     │
 * │ 📁 Assets                       │
 * │   📄 Scenes                     │
 * │   📄 Textures                   │
 * │   📄 Models                     │
 * ├─────────────────────────────────┤
 * │ Asset Grid                      │
 * │ ┌────┐ ┌────┐ ┌────┐          │
 * │ │ 🖼️ │ │ 📦 │ │ 🎬 │          │
 * │ └────┘ └────┘ └────┘          │
 * └─────────────────────────────────┘
 *
 * Responsibilities:
 * - Display project folder structure
 * - Show all loaded assets as cards
 * - Allow asset selection
 * - Show asset metadata
 * - Refresh asset list on demand
 */
export class ProjectPanel {
    private editorUI: EditorUI;
    private contentElement: HTMLElement;
    private project: Project | null = null;
    private assetManager: AssetManager;

    // Selected asset (for future features like preview)
    private selectedAsset: Asset | null = null;

    constructor(editorUI: EditorUI, assetManager: AssetManager) {
        this.editorUI = editorUI;
        this.assetManager = assetManager;

        // Create the panel's content element
        this.contentElement = document.createElement('div');
        this.contentElement.id = 'project-panel-content';
        this.contentElement.className = 'panel-content';
        this.contentElement.style.overflow = 'auto';

        console.log('📁 ProjectPanel initialized');
    }

    /**
     * Set the current project to display.
     * Called when a project is opened/created.
     */
    public setProject(project: Project | null): void {
        this.project = project;
        this.refresh();
    }

    /**
     * Refresh the entire panel.
     * Rebuilds folder tree and asset grid.
     */
    public refresh(): void {
        this.contentElement.innerHTML = '';

        if (!this.project) {
            // No project open - show empty state
            this.contentElement.innerHTML = `
                <div class="empty-state">
                    <p>No project open</p>
                    <p style="font-size: 11px; color: #666; margin-top: 8px;">
                        Click "New Project" or "Open Project" to get started
                    </p>
                </div>
            `;
            return;
        }

        // Build the UI
        this.renderHeader();
        this.renderFolderTree();
        this.renderAssetGrid();
    }

    /**
     * Render the project header with name and controls
     */
    private renderHeader(): void {
        const header = document.createElement('div');
        header.className = 'project-header';

        // Project name
        const nameElement = document.createElement('h3');
        nameElement.textContent = this.project!.name;
        nameElement.style.margin = '0';
        nameElement.style.fontSize = '13px';
        nameElement.style.fontWeight = '600';

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '4px';

        // Load asset button
        const loadButton = new Button({
            text: '📥',
            size: 'small'
        });
        loadButton.dom.title = 'Load asset from disk';
        loadButton.on('click', () => {
            this.onLoadAsset();
        });

        // Refresh button
        const refreshButton = new Button({
            text: '🔄',
            size: 'small'
        });
        refreshButton.dom.title = 'Refresh assets';
        refreshButton.on('click', () => {
            console.log('Refreshing assets...');
            this.refresh();
        });

        buttonContainer.appendChild(loadButton.dom);
        buttonContainer.appendChild(refreshButton.dom);

        header.appendChild(nameElement);
        header.appendChild(buttonContainer);
        this.contentElement.appendChild(header);
    }

    /**
     * Render the folder tree showing project structure.
     * Currently visual only - not interactive.
     */
    private renderFolderTree(): void {
        const treeContainer = document.createElement('div');
        treeContainer.className = 'folder-tree';

        // Standard Unity-like folder structure
        const folders = [
            { name: 'Assets', icon: '📁', indent: 0 },
            { name: 'Scenes', icon: '🎬', indent: 1 },
            { name: 'Prefabs', icon: '📦', indent: 1 },
            { name: 'Textures', icon: '🖼️', indent: 1 },
            { name: 'Models', icon: '🗿', indent: 1 },
            { name: 'Scripts', icon: '📝', indent: 1 }
        ];

        folders.forEach(folder => {
            const item = document.createElement('div');
            item.className = 'folder-item';
            item.style.paddingLeft = `${8 + folder.indent * 16}px`;

            // Add icon and name
            item.innerHTML = `
                <span style="margin-right: 6px;">${folder.icon}</span>
                <span>${folder.name}</span>
            `;

            // Hover effect
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#2a2d2e';
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });

            // Click handler (future: filter assets by folder)
            item.addEventListener('click', () => {
                console.log(`Clicked folder: ${folder.name}`);
                // TODO: Filter assets by folder
            });

            treeContainer.appendChild(item);
        });

        this.contentElement.appendChild(treeContainer);
    }

    /**
     * Render the asset grid showing all loaded assets.
     */
    private renderAssetGrid(): void {
        const gridContainer = document.createElement('div');
        gridContainer.className = 'asset-grid';

        const assets = this.assetManager.getAllAssets();

        if (assets.length === 0) {
            // No assets loaded
            gridContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <p>No assets loaded</p>
                    <p style="font-size: 11px; color: #666; margin-top: 8px;">
                        Assets will appear here as you use them in your scene
                    </p>
                </div>
            `;
        } else {
            // Show each asset as a card
            assets.forEach(asset => {
                const card = this.createAssetCard(asset);
                gridContainer.appendChild(card);
            });

            // Show summary
            const summary = document.createElement('div');
            summary.className = 'asset-summary';
            summary.innerHTML = `
                <span>${assets.length} asset${assets.length !== 1 ? 's' : ''} loaded</span>
                <span style="margin-left: 12px; color: #666;">
                    ~${this.assetManager.getMemoryUsage().toFixed(1)} MB
                </span>
            `;
            gridContainer.appendChild(summary);
        }

        this.contentElement.appendChild(gridContainer);
    }

    /**
     * Create a card element for an asset.
     * Shows icon, name, type, and reference count.
     */
    private createAssetCard(asset: Asset): HTMLElement {
        const card = document.createElement('div');
        card.className = 'asset-card';

        // Highlight if selected
        if (this.selectedAsset === asset) {
            card.classList.add('selected');
        }

        // Asset icon/thumbnail
        const thumbnail = document.createElement('div');
        thumbnail.className = 'asset-thumbnail';
        thumbnail.textContent = this.getAssetIcon(asset.type);

        // Asset name (truncated if too long)
        const name = document.createElement('div');
        name.className = 'asset-name';
        name.textContent = asset.name;
        name.title = asset.name;  // Full name on hover

        // Asset type badge
        const type = document.createElement('div');
        type.className = 'asset-type';
        type.textContent = asset.type;

        // Reference count badge (how many things use this asset)
        const refCount = document.createElement('div');
        refCount.className = 'asset-refs';
        refCount.textContent = `${asset.refCount} ref${asset.refCount !== 1 ? 's' : ''}`;
        refCount.title = `${asset.refCount} object${asset.refCount !== 1 ? 's' : ''} using this asset`;

        card.appendChild(thumbnail);
        card.appendChild(name);
        card.appendChild(type);
        card.appendChild(refCount);

        // Click to select
        card.addEventListener('click', () => {
            this.selectAsset(asset);
        });

        // Double-click to instantiate asset in scene
        card.addEventListener('dblclick', () => {
            console.log(`Double-clicked asset: ${asset.name}`);
            this.instantiateAssetInScene(asset);
        });

        return card;
    }

    /**
     * Select an asset in the panel.
     * Currently just visual feedback, but will enable preview/inspector in future.
     */
    private selectAsset(asset: Asset): void {
        this.selectedAsset = asset;

        console.log(`Selected asset: ${asset.name}`);
        console.log(`  Type: ${asset.type}`);
        console.log(`  Path: ${asset.path}`);
        console.log(`  References: ${asset.refCount}`);

        // Refresh to update selection styling
        this.refresh();
    }

    /**
     * Instantiate an asset in the scene at origin.
     * Creates a new GameObject with the appropriate components based on asset type.
     */
    private instantiateAssetInScene(asset: Asset): void {
        const scene = this.editorUI.getEngine().getScene();
        if (!scene) {
            console.warn('No scene to instantiate asset into');
            return;
        }

        // Create GameObject based on asset type
        let gameObject: GameObject | null = null;

        switch (asset.type) {
            case 'model':
                // Create GameObject and add model as child
                gameObject = new GameObject(asset.name);

                // Get a fresh clone of the model from AssetManager
                // This ensures each instance has its own copy
                const modelClone = asset.data.scene.clone();

                // Add the model directly to the GameObject's Object3D
                gameObject.getObject3D().add(modelClone);

                console.log(`✅ Instantiated model: ${asset.name}`);
                break;

            case 'texture':
                // For textures, create a simple plane to display them
                console.log('⚠️ Texture instantiation not yet implemented');
                console.log('   (TODO: Create plane with texture material)');
                return;

            case 'scene':
                console.log('⚠️ Scene loading from project panel not yet implemented');
                return;

            default:
                console.warn(`Cannot instantiate asset type: ${asset.type}`);
                return;
        }

        if (gameObject) {
            // Add to scene at origin
            gameObject.transform.localPosition.set(0, 0, 0);
            scene.addGameObject(gameObject);

            // Select the new object in the editor
            this.editorUI.getEngine().events.fire('selection.set', gameObject);
            this.editorUI.refresh();

            console.log(`   Created at origin (0, 0, 0)`);
        }
    }

    /**
     * Load an asset from disk.
     * Opens file picker for user to select asset files.
     */
    private async onLoadAsset(): Promise<void> {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gltf,.glb,.png,.jpg,.jpeg,.webp';
        input.multiple = true; // Allow selecting multiple files

        input.addEventListener('change', async () => {
            const files = input.files;
            if (!files || files.length === 0) return;

            console.log(`Loading ${files.length} asset(s)...`);

            // Load each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                await this.loadAssetFile(file);
            }

            // Refresh the panel to show new assets
            this.refresh();
        });

        input.click();
    }

    /**
     * Load a single asset file into the AssetManager.
     */
    private async loadAssetFile(file: File): Promise<void> {
        const fileName = file.name;
        const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

        console.log(`Loading: ${fileName}`);

        // Create object URL for the file
        const url = URL.createObjectURL(file);

        try {
            // Determine asset type and load accordingly
            if (['.gltf', '.glb'].includes(ext)) {
                // Load 3D model
                const model = await this.assetManager.loadModel(url, fileName);
                if (model) {
                    console.log(`✅ Loaded model: ${fileName}`);
                } else {
                    console.error(`❌ Failed to load model: ${fileName}`);
                }
            } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
                // Load texture
                const texture = await this.assetManager.loadTexture(url, fileName);
                if (texture) {
                    console.log(`✅ Loaded texture: ${fileName}`);
                } else {
                    console.error(`❌ Failed to load texture: ${fileName}`);
                }
            } else {
                console.warn(`Unsupported file type: ${ext}`);
            }
        } catch (error) {
            console.error(`Error loading ${fileName}:`, error);
        } finally {
            // Clean up object URL after a delay (to allow loading to complete)
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
    }

    /**
     * Get emoji icon for asset type.
     * Eventually will be replaced with actual thumbnails.
     */
    private getAssetIcon(type: string): string {
        const icons: Record<string, string> = {
            texture: '🖼️',
            model: '📦',
            audio: '🔊',
            scene: '🎬',
            script: '📝'
        };
        return icons[type] || '📄';
    }

    /**
     * Get the panel's DOM element for mounting in UI
     */
    public getElement(): HTMLElement {
        return this.contentElement;
    }

    /**
     * Get currently selected asset (for future features)
     */
    public getSelectedAsset(): Asset | null {
        return this.selectedAsset;
    }
}
