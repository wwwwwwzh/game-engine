/**
 * FileSystemManager - Wraps File System Access API for cross-browser compatibility.
 *
 * Responsibilities:
 * - Request directory access from user
 * - Read/write files in the project directory
 * - Create directories recursively
 * - List directory contents
 * - Handle errors gracefully
 *
 * Browser Support:
 * - Chrome/Edge 86+
 * - Opera 72+
 * - Safari: Not yet
 * - Firefox: Not yet
 *
 * Future: Add fallback to download/upload for unsupported browsers
 */
export class FileSystemManager {
    // Root directory handle - represents the project folder
    private rootHandle: FileSystemDirectoryHandle | null = null;

    // Check if browser supports File System Access API
    private supportsFileSystem: boolean;

    constructor() {
        // Feature detection
        this.supportsFileSystem = 'showDirectoryPicker' in window;

        if (!this.supportsFileSystem) {
            console.warn('⚠️ File System Access API not supported in this browser.');
            console.warn('   Please use Chrome, Edge, or Opera for full functionality.');
        } else {
            console.log('✅ File System Access API supported');
        }
    }

    /**
     * Request access to a directory from the user.
     * Shows the browser's native folder picker dialog.
     *
     * @returns true if access granted, false if cancelled/denied
     */
    public async openDirectory(): Promise<boolean> {
        if (!this.supportsFileSystem) {
            alert('File System Access API not supported in this browser.\nPlease use Chrome, Edge, or Opera.');
            return false;
        }

        try {
            // Show folder picker - this is the critical permission request
            this.rootHandle = await window.showDirectoryPicker({
                mode: 'readwrite'  // Request both read and write access
            });

            console.log(`📁 Opened directory: ${this.rootHandle.name}`);
            return true;

        } catch (error) {
            // User cancelled the picker (AbortError) - not really an error
            if ((error as any).name === 'AbortError') {
                console.log('Directory picker cancelled by user');
                return false;
            }

            // Some other error occurred
            console.error('Failed to open directory:', error);
            return false;
        }
    }

    /**
     * Check if we currently have access to a directory
     */
    public hasDirectory(): boolean {
        return this.rootHandle !== null;
    }

    /**
     * Get the root directory handle (for advanced use cases)
     */
    public getRootHandle(): FileSystemDirectoryHandle | null {
        return this.rootHandle;
    }

    /**
     * Get the project directory name
     */
    public getDirectoryName(): string {
        return this.rootHandle?.name || '';
    }

    /**
     * Read a file as text from the project directory.
     *
     * @param path Path relative to project root, e.g. "Assets/Scenes/Main.json"
     * @returns File contents as string, or null if file doesn't exist/error
     */
    public async readFile(path: string): Promise<string | null> {
        if (!this.rootHandle) {
            console.warn('No directory open. Call openDirectory() first.');
            return null;
        }

        try {
            // Navigate to the file
            const fileHandle = await this.getFileHandle(path, false);
            if (!fileHandle) {
                console.warn(`File not found: ${path}`);
                return null;
            }

            // Read the file
            const file = await fileHandle.getFile();
            const text = await file.text();

            console.log(`📖 Read file: ${path} (${text.length} chars)`);
            return text;

        } catch (error) {
            console.error(`Failed to read file ${path}:`, error);
            return null;
        }
    }

    /**
     * Write text to a file in the project directory.
     * Creates the file if it doesn't exist, overwrites if it does.
     *
     * @param path Path relative to project root
     * @param content String content to write
     * @returns true if successful, false if error
     */
    public async writeFile(path: string, content: string): Promise<boolean> {
        if (!this.rootHandle) {
            console.warn('No directory open. Call openDirectory() first.');
            return false;
        }

        try {
            // Navigate to the file (create if needed)
            const fileHandle = await this.getFileHandle(path, true);
            if (!fileHandle) {
                console.error(`Could not create file handle for: ${path}`);
                return false;
            }

            // Write the file
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();

            console.log(`💾 Wrote file: ${path} (${content.length} chars)`);
            return true;

        } catch (error) {
            console.error(`Failed to write file ${path}:`, error);
            return false;
        }
    }

    /**
     * Create a directory (and parent directories if needed).
     * Like `mkdir -p` in Unix.
     *
     * @param path Path relative to project root, e.g. "Assets/Scenes/Level1"
     * @returns true if successful, false if error
     */
    public async createDirectory(path: string): Promise<boolean> {
        if (!this.rootHandle) {
            console.warn('No directory open');
            return false;
        }

        try {
            // Split path into parts: "Assets/Scenes" -> ["Assets", "Scenes"]
            const parts = path.split('/').filter(p => p.length > 0);

            // Navigate through each part, creating as needed
            let currentHandle = this.rootHandle;
            for (const part of parts) {
                currentHandle = await currentHandle.getDirectoryHandle(part, {
                    create: true  // Create if doesn't exist
                });
            }

            console.log(`📁 Created directory: ${path}`);
            return true;

        } catch (error) {
            console.error(`Failed to create directory ${path}:`, error);
            return false;
        }
    }

    /**
     * Check if a file exists.
     *
     * @param path Path relative to project root
     * @returns true if file exists, false otherwise
     */
    public async fileExists(path: string): Promise<boolean> {
        if (!this.rootHandle) return false;

        try {
            const handle = await this.getFileHandle(path, false);
            return handle !== null;
        } catch {
            return false;
        }
    }

    /**
     * Check if a directory exists.
     *
     * @param path Path relative to project root
     * @returns true if directory exists, false otherwise
     */
    public async directoryExists(path: string): Promise<boolean> {
        if (!this.rootHandle) return false;

        try {
            await this.getDirectoryHandle(path, false);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * List all entries (files and directories) in a directory.
     * Non-recursive.
     *
     * @param path Directory path relative to project root (empty string = root)
     * @returns Array of entry names
     */
    public async listDirectory(path: string = ''): Promise<string[]> {
        if (!this.rootHandle) return [];

        try {
            // Get the directory handle
            const dirHandle = path
                ? await this.getDirectoryHandle(path, false)
                : this.rootHandle;

            if (!dirHandle) return [];

            // Iterate through entries
            const entries: string[] = [];
            for await (const entry of dirHandle.values()) {
                entries.push(entry.name);
            }

            return entries.sort();  // Alphabetical order

        } catch (error) {
            console.error(`Failed to list directory ${path}:`, error);
            return [];
        }
    }

    /**
     * Delete a file.
     *
     * @param path Path relative to project root
     * @returns true if successful, false if error
     */
    public async deleteFile(path: string): Promise<boolean> {
        if (!this.rootHandle) return false;

        try {
            const parts = path.split('/').filter(p => p);
            const fileName = parts.pop()!;

            // Navigate to parent directory
            let dirHandle = this.rootHandle;
            for (const part of parts) {
                dirHandle = await dirHandle.getDirectoryHandle(part);
            }

            // Remove the file
            await dirHandle.removeEntry(fileName);
            console.log(`🗑️ Deleted file: ${path}`);
            return true;

        } catch (error) {
            console.error(`Failed to delete file ${path}:`, error);
            return false;
        }
    }

    // ===== PRIVATE HELPER METHODS =====

    /**
     * Navigate to a file handle from a path.
     * Helper method used internally.
     *
     * @param path Path like "Assets/Scenes/Main.json"
     * @param create Whether to create the file if it doesn't exist
     * @returns FileSystemFileHandle or null
     */
    private async getFileHandle(
        path: string,
        create: boolean
    ): Promise<FileSystemFileHandle | null> {
        if (!this.rootHandle) return null;

        try {
            // Split path: "Assets/Scenes/Main.json" -> ["Assets", "Scenes"], "Main.json"
            const parts = path.split('/').filter(p => p.length > 0);
            const fileName = parts.pop()!;

            // Navigate to parent directory
            let dirHandle = this.rootHandle;
            for (const part of parts) {
                dirHandle = await dirHandle.getDirectoryHandle(part, {
                    create: create  // Create parent dirs if needed
                });
            }

            // Get file handle
            return await dirHandle.getFileHandle(fileName, { create });

        } catch (error) {
            if (create) {
                console.error(`Failed to get/create file handle for ${path}:`, error);
            }
            return null;
        }
    }

    /**
     * Navigate to a directory handle from a path.
     * Helper method used internally.
     *
     * @param path Path like "Assets/Scenes"
     * @param create Whether to create the directory if it doesn't exist
     * @returns FileSystemDirectoryHandle or null
     */
    private async getDirectoryHandle(
        path: string,
        create: boolean
    ): Promise<FileSystemDirectoryHandle | null> {
        if (!this.rootHandle) return null;

        try {
            const parts = path.split('/').filter(p => p.length > 0);
            let dirHandle = this.rootHandle;

            for (const part of parts) {
                dirHandle = await dirHandle.getDirectoryHandle(part, { create });
            }

            return dirHandle;

        } catch (error) {
            if (create) {
                console.error(`Failed to get/create directory handle for ${path}:`, error);
            }
            return null;
        }
    }
}
