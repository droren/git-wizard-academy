// js/file-system.js
/**
 * Virtual File System for Git Wizard Academy
 * Simulates a basic Unix-like file system
 */

const fileSystem = {
    '/': {
        type: 'directory',
        children: {}
    }
};

let currentPath = '/';
const pathHistory = ['/'];

// Export for use in other modules
window.fileSystemModule = {
    getCurrentPath: function() { return currentPath; },
    setCurrentPath: function(path) { currentPath = path; },
    
    // Get the current directory object
    getCurrentDir: function() {
        let dir = fileSystem['/'];
        const parts = currentPath.split('/').filter(p => p);
        for (const part of parts) {
            if (dir.children[part]) {
                dir = dir.children[part];
            }
        }
        return dir;
    },
    
    // Resolve path (handle .., ., ~, /)
    resolvePath: function(path) {
        if (!path) return currentPath;
        
        if (path.startsWith('/')) {
            currentPath = '/';
            path = path.slice(1);
        }
        
        const parts = currentPath.split('/').filter(p => p);
        const newParts = path.split('/').filter(p => p);
        
        for (const part of newParts) {
            if (part === '..') {
                parts.pop();
            } else if (part === '.') {
                continue;
            } else {
                parts.push(part);
            }
        }
        
        return '/' + parts.join('/');
    },
    
    // Create a file with optional content
    createFile: function(path, content) {
        const fullPath = this.resolvePath(path);
        const parts = fullPath.split('/').filter(p => p);
        let current = fileSystem['/'];
        
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current.children[part]) {
                current.children[part] = { type: 'directory', children: {} };
            }
            current = current.children[part];
        }
        
        const filename = parts[parts.length - 1];
        current.children[filename] = {
            type: 'file',
            content: content || '',
            modified: new Date()
        };
        
        return true;
    },
    
    // Read a file, returns null if not found
    readFile: function(path) {
        const fullPath = this.resolvePath(path);
        const parts = fullPath.split('/').filter(p => p);
        let current = fileSystem['/'];
        
        for (const part of parts) {
            if (current.children[part]) {
                current = current.children[part];
            } else {
                return null;
            }
        }
        
        return current.type === 'file' ? current : null;
    },
    
    // List directory contents
    listDirectory: function(path) {
        const fullPath = this.resolvePath(path);
        const parts = fullPath.split('/').filter(p => p);
        let current = fileSystem['/'];
        
        for (const part of parts) {
            if (current.children[part]) {
                current = current.children[part];
            } else {
                return [];
            }
        }
        
        if (current.type !== 'directory') {
            return [];
        }
        
        return Object.keys(current.children).map(name => {
            const item = current.children[name];
            return {
                name: name,
                type: item.type,
                modified: item.modified
            };
        });
    },
    
    // Delete a file or directory
    deletePath: function(path) {
        const fullPath = this.resolvePath(path);
        const parts = fullPath.split('/').filter(p => p);
        
        if (parts.length === 0) return false;
        
        let current = fileSystem['/'];
        for (let i = 0; i < parts.length - 1; i++) {
            if (current.children[parts[i]]) {
                current = current.children[parts[i]];
            } else {
                return false;
            }
        }
        
        const last = parts[parts.length - 1];
        if (current.children[last]) {
            delete current.children[last];
            return true;
        }
        return false;
    },
    
    // Create a directory
    createDirectory: function(path) {
        const fullPath = this.resolvePath(path);
        const parts = fullPath.split('/').filter(p => p);
        
        if (parts.length === 0) return false;
        
        let current = fileSystem['/'];
        for (const part of parts) {
            if (!current.children[part]) {
                current.children[part] = { type: 'directory', children: {} };
            }
            current = current.children[part];
        }
        
        return true;
    },
    
    // Check if a path exists
    exists: function(path) {
        const fullPath = this.resolvePath(path);
        const parts = fullPath.split('/').filter(p => p);
        let current = fileSystem['/'];
        
        for (const part of parts) {
            if (current.children[part]) {
                current = current.children[part];
            } else {
                return false;
            }
        }
        return true;
    },
    
    // Reset file system
    reset: function() {
        fileSystem['/'] = { type: 'directory', children: {} };
        currentPath = '/';
        pathHistory.length = 0;
        pathHistory.push('/');
    },
    
    // Get directory structure (for debugging)
    getStructure: function() {
        return JSON.parse(JSON.stringify(fileSystem));
    }
};