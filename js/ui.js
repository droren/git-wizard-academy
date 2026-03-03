// js/ui.js
/**
 * UI Event Handlers for Git Wizard Academy
 * Handles user input, modals, and rendering
 */

const ui = {
    // Initialize UI event handlers
    init: function() {
        // Terminal input handler
        const terminalInput = document.getElementById('terminalInput');
        if (terminalInput) {
            terminalInput.addEventListener('keydown', this.handleTerminalInput.bind(this));
        }
        
        // Nano editor handlers
        const nanoTextarea = document.getElementById('nanoTextarea');
        if (nanoTextarea) {
            nanoTextarea.addEventListener('keydown', this.handleNanoInput.bind(this));
        }
        
        // Sound toggle
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', this.toggleSound.bind(this));
        }
        
        // Show entrance animation then hide it
        setTimeout(function() {
            const overlay = document.getElementById('entranceOverlay');
            if (overlay) {
                overlay.classList.add('hidden');
            }
        }, 2000);
    },
    
    // Handle terminal input
    handleTerminalInput: function(e) {
        if (e.key === 'Enter') {
            const input = e.target.value.trim();
            if (!input) return;
            
            this.processCommand(input);
            e.target.value = '';
        }
    },
    
    // Handle nano editor input
    handleNanoInput: function(e) {
        if (e.ctrlKey) {
            if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();
                this.saveNano();
            } else if (e.key === 'x' || e.key === 'X') {
                e.preventDefault();
                this.closeNano();
            }
        }
    },
    
    // Save nano file
    saveNano: function() {
        const textarea = document.getElementById('nanoTextarea');
        const filename = document.getElementById('nanoFilename').textContent;
        
        if (textarea && window.gameState.nanoFile) {
            const fs = window.fileSystemModule;
            fs.createFile(filename, textarea.value);
            window.gameEngine.addXP(10);
            
            // Show save confirmation
            this.printOutput('File saved: ' + filename);
        }
        
        this.closeNano();
    },
    
    // Close nano editor
    closeNano: function() {
        const overlay = document.getElementById('nanoOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
        window.gameState.nanoFile = null;
    },
    
    // Toggle sound
    toggleSound: function(e) {
        e.target.textContent = e.target.textContent === '🔊' ? '🔇' : '🔊';
    },
    
    // Process any command (shell or git)
    processCommand: function(input) {
        const terminalHistory = document.getElementById('terminalHistory');
        
        // Print the command
        const cmdLine = document.createElement('div');
        cmdLine.className = 'terminal-output command';
        cmdLine.textContent = '$ ' + input;
        terminalHistory.appendChild(cmdLine);
        
        const parts = input.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        // Update command history and stats
        window.gameState.commandHistory.push(input);
        window.gameState.commandsUsed++;
        
        const commandsUsedEl = document.getElementById('commandsUsed');
        if (commandsUsedEl) {
            commandsUsedEl.textContent = window.gameState.commandsUsed;
        }
        
        let result = null;
        
        // Handle git commands
        if (cmd === 'git') {
            const gitCmd = args[0];
            
            // Special handling for git help
            if (gitCmd === 'help' || gitCmd === '?' || gitCmd === '--help' || gitCmd === '-h') {
                result = window.gitCommands.help(args.slice(1));
            }
            // Handle specific git subcommands
            else if (window.gitCommands[gitCmd]) {
                result = window.gitCommands[gitCmd](args.slice(1));
            }
            // Handle git with no subcommand
            else if (gitCmd === undefined) {
                result = { success: true, message: 'usage: git <command> [<args>]', xp: 0 };
            }
            // Unknown git command
            else {
                result = { success: false, message: "git: '" + gitCmd + "' is not a git command. See 'git help'.", xp: 0 };
            }
        }
        // Handle shell help/?
        else if (cmd === 'help' || cmd === '?') {
            result = window.shellCommands.help();
            window.gameEngine.addXP(2);
        }
        // Handle shell commands
        else if (window.shellCommands[cmd]) {
            result = window.shellCommands[cmd](args);
            
            if (result.success && result.xp) {
                window.gameEngine.addXP(result.xp);
            }
        }
        // Unknown command
        else {
            result = { success: false, message: cmd + ': command not found', xp: 0 };
        }
        
        // Display result
        if (result && !result.isSystem) {
            const outputDiv = document.createElement('div');
            outputDiv.className = 'terminal-output ' + (result.success ? '' : 'error');
            outputDiv.innerHTML = result.message || '';
            terminalHistory.appendChild(outputDiv);
            
            if (result.success && result.xp) {
                window.gameEngine.addXP(result.xp);
            }
        }
        
        // Check objectives after git commands
        if (cmd === 'git') {
            window.gameEngine.checkObjectives();
        }
        
        // Scroll to bottom
        const terminalBody = document.getElementById('terminalOutput');
        if (terminalBody) {
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }
        
        // Save game
        window.gameEngine.saveGame();
    },
    
    // Print output to terminal
    printOutput: function(message, isError) {
        const terminalHistory = document.getElementById('terminalHistory');
        if (!terminalHistory) return;
        
        const outputDiv = document.createElement('div');
        outputDiv.className = 'terminal-output ' + (isError ? 'error' : '');
        outputDiv.innerHTML = message;
        terminalHistory.appendChild(outputDiv);
        
        // Scroll to bottom
        const terminalBody = document.getElementById('terminalOutput');
        if (terminalBody) {
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }
    },
    
    // Show XP popup
    showXPPop: function(amount, x, y) {
        const pop = document.createElement('div');
        pop.className = 'xp-pop';
        pop.textContent = '+' + amount + ' XP';
        pop.style.left = x + 'px';
        pop.style.top = y + 'px';
        document.body.appendChild(pop);
        
        setTimeout(function() {
            pop.remove();
        }, 1000);
    },
    
    // Clear terminal
    clearTerminal: function() {
        const terminalHistory = document.getElementById('terminalHistory');
        if (terminalHistory) {
            terminalHistory.innerHTML = '';
        }
    },
    
    // Show hint
    showHint: function() {
        const hints = {
            0: [
                "Try: git config --global user.name \"Your Name\"",
                "Then: git init to start",
                "After that: echo \"Hello\" > hello.txt then git add and commit"
            ],
            1: [
                "Use: git status to see your repo",
                "Use: git log to see history",
                "Try creating and committing files"
            ],
            2: [
                "git checkout -b feature-name creates a branch",
                "Switch with: git checkout feature-name",
                "Merge with: git merge feature-name"
            ],
            3: [
                "Find the conflict markers <<< >>>",
                "Edit the file to fix the conflict",
                "Then: git add <file> and git commit"
            ],
            4: [
                "git stash saves your work temporarily",
                "git stash list shows stashes",
                "git stash pop restores your work"
            ],
            5: [
                "git rebase main moves your branch",
                "Use -i flag for interactive mode",
                "squash combines commits together"
            ],
            6: [
                "git reflog shows all your movements",
                "Find the lost commit hash",
                "git branch recovered <hash>"
            ],
            7: [
                "git cherry-pick <commit> copies it",
                "git bisect finds bugs automatically",
                "Start with: git bisect start"
            ],
            8: [
                "git submodule add <repo> adds dependencies",
                "Create hooks in .git/hooks/",
                "Use aliases: git config --global alias.st status"
            ],
            9: [
                "Combine all your skills!",
                "Branches + commits + rebase + merge",
                "You're the Grand Wizard now!"
            ]
        };
        
        const currentLevel = window.gameState.currentLevel;
        const levelHints = hints[currentLevel] || hints[0];
        const randomHint = levelHints[Math.floor(Math.random() * levelHints.length)];
        
        this.printOutput('💡 Hint: ' + randomHint, false);
    },
    
    // Update terminal prompt
    updatePrompt: function() {
        // Could be extended to show current branch in prompt
    }
};

// Export
window.ui = ui;

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    ui.init();
});