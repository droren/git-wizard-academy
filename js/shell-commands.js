// js/shell-commands.js
/**
 * Shell Commands for Git Wizard Academy
 * Basic Unix-like shell commands
 */

const shellCommands = {
    help: function(args) {
        return {
            success: true,
            message: `Available Commands:

╔═══════════════════════════════════════════════════════╗
║  GIT COMMANDS                                         ║
╠═══════════════════════════════════════════════════════╣
║  git init           - Initialize repository           ║
║  git config         - Configure Git settings          ║
║  git status         - Show working tree status        ║
║  git add            - Stage file contents             ║
║  git commit         - Record changes                  ║
║  git log            - Show commit logs                ║
║  git branch         - List/create/delete branches     ║
║  git checkout       - Switch branches                 ║
║  git switch         - Switch branches                 ║
║  git merge          - Join development histories      ║
║  git stash          - Stash changes                   ║
║  git tag            - Create/list/delete tags         ║
║  git rebase         - Forward-port commits            ║
║  git cherry-pick    - Apply commits                   ║
║  git bisect         - Binary search for bugs          ║
║  git reflog         - Manage reflog                   ║
║  git reset          - Reset current HEAD              ║
║  git help           - Show git help                   ║
╠═══════════════════════════════════════════════════════╣
║  SHELL COMMANDS                                       ║
╠═══════════════════════════════════════════════════════╣
║  ls              - List directory contents            ║
║  cd              - Change directory                   ║
║  pwd             - Print working directory            ║
║  cat             - Concatenate and display files      ║
║  echo            - Display a line of text             ║
║  mkdir           - Create directories                 ║
║  rm              - Remove files                       ║
║  grep            - Search text patterns               ║
║  nano            - Simple file editor                 ║
║  clear           - Clear the terminal                 ║
║  whoami          - Print current user                 ║
║  date            - Print date and time                ║
║  history         - Show command history               ║
║  help, ?         - Show this help                     ║
╚═══════════════════════════════════════════════════════╝`
        };
    },
    
    ls: function(args) {
        const long = args.includes('-l');
        const all = args.includes('-a') || args.includes('--all');
        const items = window.fileSystemModule.listDirectory(args[args.length - 1] || '.');
        
        if (items.length === 0) {
            return { success: true, message: '(empty directory)' };
        }
        
        let filteredItems = items;
        if (!all) {
            filteredItems = items.filter(item => !item.name.startsWith('.'));
        }
        
        if (long) {
            let output = '';
            filteredItems.forEach(item => {
                const perms = item.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--';
                const date = item.modified ? new Date(item.modified).toLocaleDateString() : 'today';
                output += `${perms}  1  user  group  128  ${date}  ${item.name}${item.type === 'directory' ? '/' : ''}\n`;
            });
            return { success: true, message: output };
        }
        
        const output = filteredItems.map(item => {
            const name = item.name;
            return item.type === 'directory' ? '\x1b[34m' + name + '/\x1b[0m' : name;
        }).join('  ');
        
        return { success: true, message: output, isRaw: true };
    },
    
    cd: function(args) {
        const path = args[0] || '/';
        const fs = window.fileSystemModule;
        
        if (path === '~' || path === '$HOME') {
            fs.setCurrentPath('/');
            return { success: true, message: '' };
        }
        
        if (path === '-') {
            if (window.pathHistory && window.pathHistory.length > 1) {
                window.pathHistory.pop();
                fs.setCurrentPath(window.pathHistory[window.pathHistory.length - 1]);
            }
            return { success: true, message: '' };
        }
        
        const newPath = fs.resolvePath(path);
        const parts = newPath.split('/').filter(p => p);
        let current = fileSystem['/'];
        
        for (const part of parts) {
            if (current.children[part] && current.children[part].type === 'directory') {
                current = current.children[part];
            } else if (current.children[part]) {
                return { success: false, message: `cd: ${path}: Not a directory` };
            } else {
                return { success: false, message: `cd: ${path}: No such file or directory` };
            }
        }
        
        fs.setCurrentPath(newPath || '/');
        
        if (!window.pathHistory) window.pathHistory = [];
        window.pathHistory.push(fs.getCurrentPath());
        
        return { success: true, message: '' };
    },
    
    pwd: function(args) {
        return { success: true, message: window.fileSystemModule.getCurrentPath() };
    },
    
    cat: function(args) {
        if (args.length === 0) {
            return { success: false, message: 'cat: missing operand' };
        }
        
        let output = '';
        const fs = window.fileSystemModule;
        
        args.forEach(path => {
            const file = fs.readFile(path);
            if (file) {
                output += file.content + (args.length > 1 ? '\n\n' : '');
            } else {
                output += `cat: ${path}: No such file or directory\n`;
            }
        });
        
        return { success: true, message: output.trim() };
    },
    
    echo: function(args) {
        let output = args.join(' ');
        const fs = window.fileSystemModule;
        
        // Check for redirection
        const redirectIndex = args.findIndex(a => a === '>' || a === '>>');
        if (redirectIndex !== -1 && args[redirectIndex + 1]) {
            const text = args.slice(0, redirectIndex).join(' ').replace(/^["']|["']$/g, '');
            const filename = args[redirectIndex + 1];
            const append = args[redirectIndex] === '>>';
            
            const existing = fs.readFile(filename);
            const newContent = append && existing ? existing.content + '\n' + text : text;
            
            fs.createFile(filename, newContent);
            return { success: true, message: '' };
        }
        
        output = output.replace(/^["']|["']$/g, '');
        return { success: true, message: output };
    },
    
    mkdir: function(args) {
        if (args.length === 0) {
            return { success: false, message: 'mkdir: missing operand' };
        }
        
        const fs = window.fileSystemModule;
        args.forEach(path => fs.createDirectory(path));
        
        return { success: true, message: '' };
    },
    
    rm: function(args) {
        const recursive = args.includes('-r') || args.includes('-R');
        const force = args.includes('-f');
        const fs = window.fileSystemModule;
        
        const paths = args.filter(a => !a.startsWith('-'));
        
        if (paths.length === 0) {
            return { success: false, message: 'rm: missing operand' };
        }
        
        paths.forEach(path => {
            if (!fs.deletePath(path) && !force) {
                return { success: false, message: `rm: cannot remove '${path}': No such file or directory` };
            }
        });
        
        return { success: true, message: '' };
    },
    
    rmdir: function(args) {
        if (args.length === 0) {
            return { success: false, message: 'rmdir: missing operand' };
        }
        
        const fs = window.fileSystemModule;
        
        args.forEach(path => {
            const fullPath = fs.resolvePath(path);
            const parts = fullPath.split('/').filter(p => p);
            let current = fileSystem['/'];
            
            for (let i = 0; i < parts.length - 1; i++) {
                if (current.children[parts[i]]) {
                    current = current.children[parts[i]];
                }
            }
            
            const last = parts[parts.length - 1];
            if (current.children[last] && current.children[last].type === 'directory') {
                if (Object.keys(current.children[last].children).length === 0) {
                    delete current.children[last];
                } else {
                    return { success: false, message: `rmdir: ${path}: Directory not empty` };
                }
            } else {
                return { success: false, message: `rmdir: ${path}: No such directory` };
            }
        });
        
        return { success: true, message: '' };
    },
    
    grep: function(args) {
        let pattern = args[0];
        let paths = args.slice(1);
        const fs = window.fileSystemModule;
        
        if (!pattern) {
            return { success: false, message: 'grep: missing pattern' };
        }
        
        pattern = pattern.replace(/^["']|["']$/g, '');
        if (paths.length === 0) paths = ['.'];
        
        let output = '';
        paths.forEach(path => {
            const file = fs.readFile(path);
            if (file) {
                const lines = file.content.split('\n');
                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes(pattern.toLowerCase())) {
                        output += `${path}:${index + 1}:${line}\n`;
                    }
                });
            }
        });
        
        return output ? { success: true, message: output.trim() } : { success: false, message: '' };
    },
    
    nano: function(args) {
        const filename = args[0] || 'untitled';
        const fs = window.fileSystemModule;
        
        window.gameState.nanoFile = filename;
        const existing = fs.readFile(filename);
        const content = existing ? existing.content : '';
        
        const overlay = document.getElementById('nanoOverlay');
        if (overlay) {
            document.getElementById('nanoFilename').textContent = filename;
            document.getElementById('nanoTextarea').value = content;
            overlay.classList.add('show');
            document.getElementById('nanoTextarea').focus();
        }
        
        return { success: true, message: `Opening ${filename} in nano editor...`, isSystem: true };
    },
    
    clear: function(args) {
        const history = document.getElementById('terminalHistory');
        if (history) history.innerHTML = '';
        return { success: true, message: '', isSystem: true };
    },
    
    whoami: function(args) {
        return { success: true, message: 'git-wizard-user' };
    },
    
    date: function(args) {
        return { success: true, message: new Date().toString() };
    },
    
    history: function(args) {
        let output = '';
        if (window.gameState && window.gameState.commandHistory) {
            window.gameState.commandHistory.forEach((cmd, index) => {
                output += `${index + 1}  ${cmd}\n`;
            });
        }
        return { success: true, message: output.trim() };
    },
    
    head: function(args) {
        const lines = parseInt(args.find(a => !a.startsWith('-')) || 10);
        const fileArg = args.find(a => !a.startsWith('-') && !a.startsWith('-n'));
        const file = fileArg ? window.fileSystemModule.readFile(fileArg) : null;
        
        if (file) {
            const content = file.content.split('\n').slice(0, lines).join('\n');
            return { success: true, message: content };
        }
        return { success: false, message: 'head: missing file' };
    },
    
    tail: function(args) {
        const lines = parseInt(args.find(a => !a.startsWith('-')) || 10);
        const fileArg = args.find(a => !a.startsWith('-') && !a.startsWith('-n'));
        const file = fileArg ? window.fileSystemModule.readFile(fileArg) : null;
        
        if (file) {
            const content = file.content.split('\n').slice(-lines).join('\n');
            return { success: true, message: content };
        }
        return { success: false, message: 'tail: missing file' };
    },
    
    touch: function(args) {
        if (args.length === 0) {
            return { success: false, message: 'touch: missing file operand' };
        }
        
        args.forEach(path => {
            if (!window.fileSystemModule.exists(path)) {
                window.fileSystemModule.createFile(path, '');
            }
        });
        
        return { success: true, message: '' };
    },
    
    wc: function(args) {
        const countLines = args.includes('-l');
        const countWords = args.includes('-w');
        const countChars = args.includes('-c');
        const fileArg = args.find(a => !a.startsWith('-'));
        const file = fileArg ? window.fileSystemModule.readFile(fileArg) : null;
        
        if (file) {
            const content = file.content;
            const lines = content.split('\n').length;
            const words = content.split(/\s+/).filter(w => w).length;
            const chars = content.length;
            
            if (countLines) return { success: true, message: lines.toString() };
            if (countWords) return { success: true, message: words.toString() };
            if (countChars) return { success: true, message: chars.toString() };
            
            return { success: true, message: `${lines} ${words} ${chars}` };
        }
        return { success: false, message: 'wc: missing file' };
    }
};

// Export for use in other modules
window.shellCommands = shellCommands;