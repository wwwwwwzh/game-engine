import { Container, GridView, GridViewItem, Label } from '@playcanvas/pcui';
import type { AssetManager, Asset } from '../core/AssetManager';

/**
 * ProjectPanel - Asset browser using PCUI GridView.
 *
 * Before (7.1): ~150 lines of card-based grid layout
 * After (7.2): ~50 lines using GridView component
 *
 * Note: This panel doesn't use Events bus - it's just a view of AssetManager
 */
export class ProjectPanel {
    private container: Container;
    private header: Label;
    private gridView: GridView;
    private assetManager: AssetManager | null = null;

    constructor() {
        this.container = new Container({
            class: 'project-panel',
            collapsible: false,
            scrollable: true,
            headerText: 'Hierarchy',
            height: 200,
            width: '100%',
            resizable: 'top',
            resizeMin: 200,
            resizeMax: 500
        });

        // Project header
        this.header = new Label({
            text: 'Project Assets',
            class: 'panel-header'
        });

        // Grid view for assets
        this.gridView = new GridView();

        this.container.append(this.header);
        this.container.append(this.gridView);
    }

    /**
     * Set asset manager and refresh
     */
    setAssetManager(assetManager: AssetManager): void {
        this.assetManager = assetManager;
        this.refresh();
    }

    /**
     * Rebuild asset grid (called manually like 7.1)
     */
    refresh(): void {
        this.gridView.clear();

        if (!this.assetManager) return;

        const assets = this.assetManager.getAllAssets();

        for (const asset of assets) {
            const icon = this.getAssetIcon(asset.type);

            const item = new GridViewItem({
                text: `${icon} ${asset.name}`
            });

            // Store asset reference
            (item as any).asset = asset;

            this.gridView.append(item);
        }
    }

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

    getElement(): Container {
        return this.container;
    }
}
