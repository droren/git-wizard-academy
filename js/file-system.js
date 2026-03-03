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
    
    // Resolve path (handle . (current), .. (parent), ~ (home), / (root))
    resolvePath: function(path) {
        if (!path || path === '.') {
            return currentPath;
        }
        
        // Handle home directory
        if (path === '~' || path === '$HOME') {
            return '/';
        }
        
        // Handle absolute path
        if (path.startsWith('/')) {
            currentPath = '/';
            path = path.slice(1);
        }
        
        const parts = currentPath.split('/').filter(p => p);
        const newParts = path.split('/').filter(p => p);
        
        for (const part of newParts) {
            if (part === '..') {
                // Go up one directory
                if (parts.length > 0) {
                    parts.pop();
                }
            } else if (part === '.' || part === '') {
                // Current directory, skip
                continue;
            } else {
                parts.push(part);
            }
        }
        
        return '/' + parts.join('/');
    },
    
    // Get the directory object for a path (handles . as current dir)
    getDir: function(path) {
        const resolvedPath = this.resolvePath(path || '.');
        const parts = resolvedPath.split('/').filter(p => p);
        let current = fileSystem['/'];
        
        for (const part of parts) {
            if (current.children[part]) {
                current = current.children[part];
            } else {
                return null;
            }
        }
        
        return current;
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
    
    // List directory contents (handles . as current directory)
    listDirectory: function(path) {
        const dir = this.getDir(path || '.');
        
        if (!dir || dir.type !== 'directory') {
            return [];
        }
        
        return Object.keys(dir.children).map(name => {
            const item = dir.children[name];
            return {
                name: name,
                type: item.type,
                modified: item.modified
            };
        });
    },
    
    // Get all files (not directories) in a path
    listFiles: function(path) {
        return this.listDirectory(path).filter(item => item.type === 'file');
    },
    
    // Get all subdirectories in a path
    listSubdirs: function(path) {
        return this.listDirectory(path).filter(item => item.type === 'directory');
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
        if (!path || path === '.') return true; // Current dir always exists
        
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
    
    // Check if path is a directory
    isDirectory: function(path) {
        if (!path || path === '.') return true;
        const dir = this.getDir(path);
        return dir && dir.type === 'directory';
    },
    
    // Check if path is a file
    isFile: function(path) {
        const file = this.readFile(path);
        return file !== null;
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