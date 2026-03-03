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
        const fs = window.fileSystemModule;
        
        // Determine path - . means current directory
        let path = '.';
        const lastArg = args[args.length - 1];
        if (lastArg && !lastArg.startsWith('-')) {
            path = lastArg;
        }
        
        const items = fs.listDirectory(path);
        
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
            const pathHistory = fs._pathHistory;
            if (pathHistory.length > 1) {
                pathHistory.pop();
                fs.setCurrentPath(pathHistory[pathHistory.length - 1]);
            }
            return { success: true, message: '' };
        }
        
        // Use resolvePath to handle . and .. properly
        const newPath = fs.resolvePath(path);
        
        // Check if path exists and is a directory
        if (!fs.exists(newPath)) {
            return { success: false, message: `cd: ${path}: No such file or directory` };
        }
        
        if (!fs.isDirectory(newPath)) {
            return { success: false, message: `cd: ${path}: Not a directory` };
        }
        
        fs.setCurrentPath(newPath);
        
        fs._pathHistory.push(fs.getCurrentPath());
        
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
            // Handle . as current directory - list files instead
            if (path === '.' || path === '*') {
                const files = fs.listFiles('.');
                files.forEach(f => {
                    const file = fs.readFile(f.name);
                    if (file) {
                        output += `==> ${f.name} <==\n${file.content}\n\n`;
                    }
                });
            } else {
                const file = fs.readFile(path);
                if (file) {
                    output += file.content + (args.length > 1 ? '\n\n' : '');
                    if (file.content.includes('<<<<<<<') || file.content.includes('=======') || file.content.includes('>>>>>>>')) {
                        window.gameState.flags = window.gameState.flags || {};
                        window.gameState.flags.conflictMarkersIdentified = true;
                    }
                } else {
                    output += `cat: ${path}: No such file or directory\n`;
                }
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
            window.gameState.flags = window.gameState.flags || {};
            if (filename.includes('.git/hooks')) {
                window.gameState.flags.createdHook = true;
            }
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
        args.forEach(path => {
            if (path !== '.' && path !== '..') {
                fs.createDirectory(path);
            }
        });
        
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
            // Handle . and .. specially
            if (path === '.' || path === '..') {
                if (!force) {
                    return { success: false, message: `rm: cannot remove '${path}': Operation not permitted` };
                }
                return;
            }
            
            // Handle * to mean all files
            if (path === '*') {
                const files = fs.listFiles('.');
                files.forEach(f => fs.deletePath(f.name));
                return;
            }
            
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
            // Don't allow removing . or ..
            if (path === '.' || path === '..') {
                return { success: false, message: `rmdir: '${path}': Operation not permitted` };
            }
            
            const dir = fs.getDir(path);
            if (dir) {
                if (Object.keys(dir.children).length === 0) {
                    fs.deletePath(path);
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
        
        // If no paths given, search all files
        if (paths.length === 0 || (paths.length === 1 && paths[0] === '*')) {
            const files = fs.listFiles('.');
            paths = files.map(f => f.name);
        }
        
        // Handle . as current directory
        paths = paths.map(p => p === '.' ? '*' : p);
        
        let output = '';
        paths.forEach(path => {
            const file = fs.readFile(path);
            if (file) {
                const lines = file.content.split('\n');
                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes(pattern.toLowerCase())) {
                        if (line.includes('<<<<<<<') || line.includes('=======') || line.includes('>>>>>>>') || pattern.includes('<<<') || pattern.includes('>>>') ) {
                            window.gameState.flags = window.gameState.flags || {};
                            window.gameState.flags.conflictMarkersIdentified = true;
                        }
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
        if (content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>')) {
            window.gameState.flags = window.gameState.flags || {};
            window.gameState.flags.conflictMarkersIdentified = true;
        }
        
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
        if (window.ui && window.ui.clearTerminal) {
            window.ui.clearTerminal();
            return { success: true, message: '', isSystem: true };
        }
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
        const fs = window.fileSystemModule;
        
        if (!fileArg) {
            return { success: false, message: 'head: missing file' };
        }
        
        // Handle . as current directory
        const actualFile = fileArg === '.' ? null : fileArg;
        const file = actualFile ? fs.readFile(actualFile) : null;
        
        if (file) {
            const content = file.content.split('\n').slice(0, lines).join('\n');
            return { success: true, message: content };
        } else {
            const files = fs.listFiles('.');
            if (files.length > 0) {
                const firstFile = fs.readFile(files[0].name);
                if (firstFile) {
                    const content = firstFile.content.split('\n').slice(0, lines).join('\n');
                    return { success: true, message: content };
                }
            }
        }
        return { success: false, message: 'head: missing file' };
    },
    
    tail: function(args) {
        const lines = parseInt(args.find(a => !a.startsWith('-')) || 10);
        const fileArg = args.find(a => !a.startsWith('-') && !a.startsWith('-n'));
        const fs = window.fileSystemModule;
        
        if (!fileArg) {
            return { success: false, message: 'tail: missing file' };
        }
        
        // Handle . as current directory
        const actualFile = fileArg === '.' ? null : fileArg;
        const file = actualFile ? fs.readFile(actualFile) : null;
        
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
        
        const fs = window.fileSystemModule;
        args.forEach(path => {
            // Don't create a file named . or ..
            if (path !== '.' && path !== '..') {
                if (!fs.exists(path)) {
                    fs.createFile(path, '');
                }
            }
        });
        
        return { success: true, message: '' };
    },
    
    wc: function(args) {
        const countLines = args.includes('-l');
        const countWords = args.includes('-w');
        const countChars = args.includes('-c');
        const fs = window.fileSystemModule;
        
        let fileArg = args.find(a => !a.startsWith('-'));
        
        // Handle special cases
        if (!fileArg) {
            // Show count for all files
            const files = fs.listFiles('.');
            if (files.length === 0) {
                return { success: true, message: '0 0 0' };
            }
            let totalLines = 0, totalWords = 0, totalChars = 0;
            files.forEach(f => {
                const file = fs.readFile(f.name);
                if (file) {
                    const content = file.content;
                    totalLines += content.split('\n').length;
                    totalWords += content.split(/\s+/).filter(w => w).length;
                    totalChars += content.length;
                }
            });
            if (countLines) return { success: true, message: totalLines.toString() };
            if (countWords) return { success: true, message: totalWords.toString() };
            if (countChars) return { success: true, message: totalChars.toString() };
            return { success: true, message: `${totalLines} ${totalWords} ${totalChars}` };
        }
        
        // Handle . as current directory
        const actualFile = fileArg === '.' ? null : fileArg;
        const file = actualFile ? fs.readFile(actualFile) : null;
        
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
    },
    
    cp: function(args) {
        // Simple copy: cp source dest
        if (args.length < 2) {
            return { success: false, message: 'cp: missing operand' };
        }
        
        const fs = window.fileSystemModule;
        const source = args[0];
        const dest = args[1];
        
        if (source === '.' || source === '..') {
            return { success: false, message: `cp: '${source}': Operation not permitted` };
        }
        
        const file = fs.readFile(source);
        if (file) {
            fs.createFile(dest, file.content);
            return { success: true, message: '' };
        }
        return { success: false, message: `cp: ${source}: No such file` };
    },
    
    mv: function(args) {
        // Simple move: mv source dest
        if (args.length < 2) {
            return { success: false, message: 'mv: missing operand' };
        }
        
        const fs = window.fileSystemModule;
        const source = args[0];
        const dest = args[1];
        
        if (source === '.' || source === '..') {
            return { success: false, message: `mv: '${source}': Operation not permitted` };
        }
        
        const file = fs.readFile(source);
        if (file) {
            fs.createFile(dest, file.content);
            fs.deletePath(source);
            return { success: true, message: '' };
        }
        return { success: false, message: `mv: ${source}: No such file` };
    }
};

// Export for use in other modules
window.shellCommands = shellCommands;
