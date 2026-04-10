// js/ui.js
/**
 * UI Event Handlers for Git Wizard Academy
 * Handles user input, modals, terminal, command history, and tab completion
 */

const ui = {
    // Command history
    commandHistory: [],
    historyIndex: -1,
    
    // Tab completion
    lastTabComplete: '',
    tabTimeout: null,
    terminalMode: 'dom',
    xterm: null,
    guideTimer: null,
    flareTimer: null,
    introVisible: false,
    introCloseTimer: null,
    pendingGuideLevel: null,
    guidePlayState: { playing: false, step: 0, line: 0, steps: [] },
    resolverState: { file: '', ours: '', theirs: '', both: '', choice: 'both' },
    hintTimer: null,

    tokenizeInput: function(input) {
        const tokens = [];
        let current = '';
        let quote = null;
        let escape = false;

        for (let i = 0; i < input.length; i++) {
            const ch = input[i];

            if (escape) {
                current += ch;
                escape = false;
                continue;
            }

            if (ch === '\\') {
                escape = true;
                continue;
            }

            if (quote) {
                current += ch;
                if (ch === quote) {
                    quote = null;
                }
                continue;
            }

            if (ch === '"' || ch === "'") {
                quote = ch;
                current += ch;
                continue;
            }

            if (/\s/.test(ch)) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                continue;
            }

            current += ch;
        }

        if (current) tokens.push(current);
        return tokens;
    },

    splitChainedCommands: function(input) {
        const commands = [];
        let current = '';
        let quote = null;
        let escape = false;

        for (let i = 0; i < input.length; i++) {
            const ch = input[i];

            if (escape) {
                current += ch;
                escape = false;
                continue;
            }

            if (ch === '\\') {
                escape = true;
                current += ch;
                continue;
            }

            if (quote) {
                if (ch === quote) {
                    quote = null;
                } else {
                    current += ch;
                }
                continue;
            }

            if (ch === '"' || ch === "'") {
                quote = ch;
                continue;
            }

            if (ch === '&' && input[i + 1] === '&') {
                const trimmed = current.trim();
                if (trimmed) commands.push(trimmed);
                current = '';
                i += 1;
                continue;
            }

            current += ch;
        }

        const trimmed = current.trim();
        if (trimmed) commands.push(trimmed);
        return commands.length ? commands : [input];
    },

    escapeHtml: function(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    renderAnsi: function(text) {
        const chunks = String(text || '').split(/(\x1b\[[0-9;]*m)/g);
        let state = { bold: false, fg: '' };
        let out = '';

        const classesForState = function(s) {
            const classes = [];
            if (s.bold) classes.push('ansi-bold');
            if (s.fg) classes.push('ansi-fg-' + s.fg);
            return classes.join(' ');
        };

        const applyCode = function(code) {
            if (code === 0) {
                state = { bold: false, fg: '' };
                return;
            }
            if (code === 1) state.bold = true;
            if (code === 22) state.bold = false;

            const fgMap = {
                30: 'black',
                31: 'red',
                32: 'green',
                33: 'yellow',
                34: 'blue',
                35: 'magenta',
                36: 'cyan',
                37: 'white',
                39: '',
                90: 'gray',
                91: 'bright-red',
                92: 'bright-green',
                93: 'bright-yellow',
                94: 'bright-blue',
                95: 'bright-magenta',
                96: 'bright-cyan',
                97: 'bright-white'
            };
            if (code in fgMap) state.fg = fgMap[code];
        };

        chunks.forEach((chunk) => {
            const match = chunk.match(/^\x1b\[([0-9;]*)m$/);
            if (match) {
                const codes = (match[1] || '0').split(';').map((n) => Number(n || 0));
                codes.forEach(applyCode);
                return;
            }

            if (!chunk) return;
            const escaped = this.escapeHtml(chunk);
            const classes = classesForState(state);
            out += classes ? '<span class=\"' + classes + '\">' + escaped + '</span>' : escaped;
        });

        return out;
    },
    
    // Initialize UI
    init: function() {
        const terminalInput = document.getElementById('terminalInput');
        const terminalBody = document.getElementById('terminalOutput');
        const nanoTextarea = document.getElementById('nanoTextarea');
        const soundToggle = document.getElementById('soundToggle');
        const replayIntroBtn = document.getElementById('replayIntroBtn');
        const proceedLevelBtn = document.getElementById('proceedLevelBtn');
        const toggleButtons = document.querySelectorAll('.icon-toggle[data-target]');
        const guidePlayPauseBtn = document.getElementById('guidePlayPauseBtn');
        const guideReplayBtn = document.getElementById('guideReplayBtn');
        const guideCloseBtn = document.getElementById('guideCloseBtn');
        const openResolverBtn = document.getElementById('openResolverBtn');
        const resolverCloseBtn = document.getElementById('resolverCloseBtn');
        const resolverStageBtn = document.getElementById('resolverStageBtn');
        const introStartBtn = document.getElementById('introStartBtn');
        const introSkipBtn = document.getElementById('introSkipBtn');
        const introSkipLink = document.getElementById('introSkipLink');
        const downloadCertificateBtn = document.getElementById('downloadCertificateBtn');
        const exportRepoBtn = document.getElementById('exportRepoBtn');
        const exportRepoCloseBtn = document.getElementById('exportRepoCloseBtn');

        this.initTerminalAdapter();
        
        // Terminal input with history and tab completion
        if (terminalInput) {
            terminalInput.addEventListener('keydown', this.handleTerminalInput.bind(this));
            // Auto-focus on click anywhere in terminal body
            if (terminalBody) {
                terminalBody.addEventListener('click', function() {
                    terminalInput.focus();
                });
            }
        }
        
        // Nano editor handlers
        if (nanoTextarea) {
            nanoTextarea.addEventListener('keydown', this.handleNanoInput.bind(this));
        }
        
        // Sound toggle
        if (soundToggle) {
            soundToggle.addEventListener('click', this.toggleSound.bind(this));
        }
        if (replayIntroBtn) replayIntroBtn.addEventListener('click', this.replayIntro.bind(this));
        if (proceedLevelBtn) proceedLevelBtn.addEventListener('click', function() {
            if (window.gameEngine) window.gameEngine.nextLevel();
        });
        toggleButtons.forEach((btn) => {
            btn.addEventListener('click', this.togglePanelContent.bind(this));
        });
        if (guidePlayPauseBtn) guidePlayPauseBtn.addEventListener('click', this.toggleGuidePlayback.bind(this));
        if (guideReplayBtn) guideReplayBtn.addEventListener('click', this.replayGuide.bind(this));
        if (guideCloseBtn) guideCloseBtn.addEventListener('click', this.closeGuide.bind(this));
        if (openResolverBtn) openResolverBtn.addEventListener('click', this.openConflictResolver.bind(this));
        if (resolverCloseBtn) resolverCloseBtn.addEventListener('click', this.closeConflictResolver.bind(this));
        if (resolverStageBtn) resolverStageBtn.addEventListener('click', this.saveAndStageResolver.bind(this));
        if (introStartBtn) introStartBtn.addEventListener('click', this.closeIntro.bind(this));
        if (introSkipBtn) introSkipBtn.addEventListener('click', this.skipIntro.bind(this));
        if (introSkipLink) introSkipLink.addEventListener('click', this.skipIntro.bind(this));
        if (downloadCertificateBtn) {
            downloadCertificateBtn.addEventListener('click', function() {
                if (window.gameEngine && window.gameEngine.issueCertificate) {
                    window.gameEngine.issueCertificate(window.gameState.currentLevel);
                }
            });
        }
        if (exportRepoBtn) exportRepoBtn.addEventListener('click', function() {
            if (window.gameEngine && window.gameEngine.openExportModal) {
                window.gameEngine.openExportModal();
            }
        });
        if (exportRepoCloseBtn) exportRepoCloseBtn.addEventListener('click', function() {
            if (window.gameEngine && window.gameEngine.closeExportModal) {
                window.gameEngine.closeExportModal();
            }
        });
        document.querySelectorAll('.export-mode-btn').forEach((btn) => {
            btn.addEventListener('click', async function() {
                if (!window.gameEngine || !window.gameEngine.exportRepo) return;
                const mode = btn.getAttribute('data-mode') || 'clean';
                await window.gameEngine.exportRepo(mode);
            });
        });
        document.querySelectorAll('.resolver-pick').forEach((btn) => {
            btn.addEventListener('click', this.pickResolverChoice.bind(this));
        });
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        
        // Auto-scroll to bottom on new output
        this.observeTerminal();
        
        if (window.gameState && !window.gameState.introSeen) {
            setTimeout(this.showIntro.bind(this), 120);
        } else if (terminalInput) {
            terminalInput.focus();
        }

        this.updateConflictUI();
    },

    togglePanelContent: function(e) {
        const btn = e.currentTarget;
        const targetId = btn.getAttribute('data-target');
        const content = targetId ? document.getElementById(targetId) : null;
        if (!content || !btn) return;
        const collapsed = content.classList.toggle('collapsed');
        btn.textContent = collapsed ? '▸' : '▾';
    },

    celebrateObjectivesPanel: function() {
        const panel = document.getElementById('objectivesPanelContent');
        const fireworks = document.getElementById('objectivesFireworks');
        if (!panel || !fireworks) return;

        panel.classList.remove('ready');
        fireworks.innerHTML = '';
        panel.offsetHeight;
        panel.classList.add('ready');

        for (let i = 0; i < 14; i++) {
            const spark = document.createElement('span');
            spark.className = 'objective-spark';
            spark.style.left = (8 + Math.random() * 84) + '%';
            spark.style.top = (10 + Math.random() * 70) + '%';
            spark.style.animationDelay = (Math.random() * 0.45) + 's';
            spark.style.background = ['#7dff99', '#72b7ff', '#ffe066', '#f3b9ff'][i % 4];
            fireworks.appendChild(spark);
        }

        setTimeout(function() {
            fireworks.innerHTML = '';
        }, 1800);
    },

    handleGlobalKeydown: function(e) {
        if (e.key === 'Escape' && this.introVisible) {
            e.preventDefault();
            this.skipIntro();
        }
    },

    populateIntro: function() {
        const heading = document.getElementById('introCrawlHeading');
        const title = document.getElementById('introCrawlTitle');
        const body = document.getElementById('introCrawlBody');
        const prologue = window.storyArc && window.storyArc.prologue ? window.storyArc.prologue : null;
        if (!prologue) return;

        if (heading) heading.textContent = prologue.crawlHeading || 'Episode 0';
        if (title) title.textContent = prologue.title || 'Chronicle';
        if (body) {
            body.innerHTML = (prologue.crawlLines || []).map(function(line) {
                return '<p>' + ui.escapeHtml(line) + '</p>';
            }).join('');
        }
    },

    showIntro: function() {
        const overlay = document.getElementById('introOverlay');
        const crawl = document.getElementById('introCrawl');
        const guideOverlay = document.getElementById('levelGuideOverlay');
        if (!overlay || !crawl) return;

        if (guideOverlay) guideOverlay.classList.remove('show');
        if (this.guideTimer) clearTimeout(this.guideTimer);
        this.populateIntro();
        this.introVisible = true;
        overlay.classList.remove('hidden');
        overlay.classList.add('show');
        crawl.classList.remove('animating');
        // Force reflow so replay restarts animation.
        overlay.offsetHeight;
        crawl.classList.add('animating');

        if (this.introCloseTimer) clearTimeout(this.introCloseTimer);
        this.introCloseTimer = setTimeout(this.closeIntro.bind(this), 37000);
    },

    replayIntro: function() {
        this.showIntro();
    },

    skipIntro: function() {
        this.closeIntro();
    },

    closeIntro: function() {
        const overlay = document.getElementById('introOverlay');
        const crawl = document.getElementById('introCrawl');
        const terminalInput = document.getElementById('terminalInput');
        if (this.introCloseTimer) {
            clearTimeout(this.introCloseTimer);
            this.introCloseTimer = null;
        }

        if (crawl) crawl.classList.remove('animating');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.classList.add('hidden');
        }

        this.introVisible = false;
        if (window.gameState) {
            window.gameState.introSeen = true;
            if (window.gameEngine && window.gameEngine.saveGame) window.gameEngine.saveGame();
        }

        if (this.pendingGuideLevel !== null) {
            const nextLevel = this.pendingGuideLevel;
            this.pendingGuideLevel = null;
            setTimeout(this.showLevelGuide.bind(this, nextLevel), 120);
            return;
        }

        if (terminalInput) terminalInput.focus();
    },

    shouldDelayLevelGuide: function() {
        return this.introVisible;
    },

    requestLevelGuide: function(levelIndex) {
        if (this.shouldDelayLevelGuide()) {
            this.pendingGuideLevel = levelIndex;
            return;
        }
        this.showLevelGuide(levelIndex);
    },

    showLevelGuide: function(levelIndex) {
        if (!window.lessonGuides || !window.lessonGuides.getDemo) return;
        const overlay = document.getElementById('levelGuideOverlay');
        const title = document.getElementById('guideTitle');
        const subtitle = document.getElementById('guideSubtitle');
        const storyBeat = document.getElementById('guideStoryBeat');
        const terminal = document.getElementById('guideTerminal');
        const playPause = document.getElementById('guidePlayPauseBtn');
        if (!overlay || !terminal) return;

        const demo = window.lessonGuides.getDemo(levelIndex);
        const brief = window.storyArc && window.storyArc.getGuideBrief ? window.storyArc.getGuideBrief(levelIndex) : null;
        title.textContent = demo.title || 'Mission Briefing';
        subtitle.textContent = demo.subtitle || '';
        if (storyBeat) {
            if (brief) {
                storyBeat.innerHTML = '<strong>' + this.escapeHtml(brief.guardian.avatar + ' ' + brief.guardian.name) + '</strong>: ' +
                    this.escapeHtml(brief.briefing) +
                    '<br><br><strong>' + this.escapeHtml(brief.mentor.avatar + ' ' + brief.mentor.name) + '</strong>: ' +
                    this.escapeHtml(brief.teaser) +
                    (brief.cadence ? '<br><br><strong>Cadence:</strong> ' + this.escapeHtml(brief.cadence) : '') +
                    (brief.bonus ? '<br><br><strong>Bonus:</strong> ' + this.escapeHtml(brief.bonus) : '');
            } else {
                storyBeat.textContent = '';
            }
        }
        terminal.innerHTML = '';
        this.guidePlayState = { playing: true, step: 0, line: 0, steps: demo.steps || [] };
        if (playPause) playPause.textContent = 'Pause';
        overlay.classList.add('show');
        this.playGuideTick();
    },

    playGuideTick: function() {
        if (!this.guidePlayState.playing) return;
        const terminal = document.getElementById('guideTerminal');
        if (!terminal) return;
        const steps = this.guidePlayState.steps;

        if (this.guidePlayState.step >= steps.length) return;
        const step = steps[this.guidePlayState.step];
        const lines = [];
        if (this.guidePlayState.line === 0) lines.push('$ ' + step.cmd);
        if (step.out) {
            const split = String(step.out).split('\n');
            if (this.guidePlayState.line > 0 && this.guidePlayState.line <= split.length) {
                lines.push(split[this.guidePlayState.line - 1]);
            }
        }

        lines.forEach((line) => {
            const div = document.createElement('div');
            div.className = 'guide-line';
            div.textContent = line;
            terminal.appendChild(div);
        });
        terminal.scrollTop = terminal.scrollHeight;

        const outLines = step.out ? String(step.out).split('\n').length : 0;
        this.guidePlayState.line++;
        if (this.guidePlayState.line > outLines) {
            this.guidePlayState.step++;
            this.guidePlayState.line = 0;
        }

        this.guideTimer = setTimeout(this.playGuideTick.bind(this), 500);
    },

    toggleGuidePlayback: function() {
        const btn = document.getElementById('guidePlayPauseBtn');
        this.guidePlayState.playing = !this.guidePlayState.playing;
        if (btn) btn.textContent = this.guidePlayState.playing ? 'Pause' : 'Play';
        if (this.guidePlayState.playing) this.playGuideTick();
        else if (this.guideTimer) clearTimeout(this.guideTimer);
    },

    replayGuide: function() {
        if (this.guideTimer) clearTimeout(this.guideTimer);
        const terminal = document.getElementById('guideTerminal');
        if (terminal) terminal.innerHTML = '';
        this.guidePlayState.step = 0;
        this.guidePlayState.line = 0;
        this.guidePlayState.playing = true;
        const btn = document.getElementById('guidePlayPauseBtn');
        if (btn) btn.textContent = 'Pause';
        this.playGuideTick();
    },

    closeGuide: function() {
        const overlay = document.getElementById('levelGuideOverlay');
        if (overlay) overlay.classList.remove('show');
        if (this.guideTimer) clearTimeout(this.guideTimer);
        const terminalInput = document.getElementById('terminalInput');
        if (terminalInput) terminalInput.focus();
    },

    playLevelFlare: function(levelIndex) {
        const flare = document.getElementById('levelFlare');
        const title = document.getElementById('flareTitle');
        if (!flare || !title) return;

        const lesson = (window.lessons && window.lessons[levelIndex]) ? window.lessons[levelIndex] : null;
        title.textContent = lesson ? (lesson.icon + ' ' + lesson.title) : 'Level Loaded';

        flare.classList.remove('show');
        // Force reflow to restart animation on repeated level loads.
        // eslint-disable-next-line no-unused-expressions
        flare.offsetHeight;
        flare.classList.add('show');

        if (this.flareTimer) clearTimeout(this.flareTimer);
        this.flareTimer = setTimeout(function() {
            flare.classList.remove('show');
        }, 2300);
    },

    showHintToast: function(text) {
        if (!text) return;
        const toast = document.getElementById('hintToast');
        if (!toast) return;
        toast.textContent = text;
        toast.classList.add('show');
        if (this.hintTimer) clearTimeout(this.hintTimer);
        this.hintTimer = setTimeout(function() {
            toast.classList.remove('show');
        }, 2600);
    },

    updateConflictUI: function() {
        const btn = document.getElementById('openResolverBtn');
        const inProgress = !!(window.gameState && window.gameState.gitState && window.gameState.gitState.mergeInProgress);
        const lesson = (window.lessons && window.lessons[window.gameState.currentLevel]) ? window.lessons[window.gameState.currentLevel] : null;
        const resolverEnabled = !!(lesson && lesson.useConflictResolver);
        if (btn) btn.style.display = (inProgress && resolverEnabled) ? 'inline-block' : 'none';
    },

    parseFirstConflictFile: function() {
        const fs = window.fileSystemModule;
        const files = (window.gameState && window.gameState.gitState && window.gameState.gitState.conflictFiles) || [];
        const file = files[0];
        if (!file) return null;
        const content = fs.readFile(file)?.content || '';
        const m = content.match(/<<<<<<<[^\n]*\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>[^\n]*/);
        if (!m) return null;
        return {
            file,
            ours: m[1],
            theirs: m[2],
            both: (m[1].trimEnd() + '\n' + m[2].trimStart()).trim()
        };
    },

    openConflictResolver: function() {
        const parsed = this.parseFirstConflictFile();
        if (!parsed) {
            this.showHintToast('No parseable conflict markers found.');
            return;
        }
        this.resolverState = {
            file: parsed.file,
            ours: parsed.ours,
            theirs: parsed.theirs,
            both: parsed.both,
            choice: 'both'
        };
        const overlay = document.getElementById('conflictResolverOverlay');
        const fileEl = document.getElementById('resolverFile');
        const ours = document.getElementById('resolverOurs');
        const theirs = document.getElementById('resolverTheirs');
        const both = document.getElementById('resolverCombined');
        if (fileEl) fileEl.textContent = 'File: ' + parsed.file;
        if (ours) ours.textContent = parsed.ours;
        if (theirs) theirs.textContent = parsed.theirs;
        if (both) both.textContent = parsed.both;
        if (overlay) overlay.classList.add('show');
    },

    closeConflictResolver: function() {
        const overlay = document.getElementById('conflictResolverOverlay');
        if (overlay) overlay.classList.remove('show');
        const terminalInput = document.getElementById('terminalInput');
        if (terminalInput) terminalInput.focus();
    },

    pickResolverChoice: function(e) {
        const choice = e.target.getAttribute('data-choice');
        if (!choice) return;
        this.resolverState.choice = choice;
        document.querySelectorAll('.resolver-pick').forEach((btn) => btn.classList.remove('btn-primary'));
        e.target.classList.add('btn-primary');
    },

    saveAndStageResolver: function() {
        const fs = window.fileSystemModule;
        const s = this.resolverState;
        if (!s.file) return;
        const next = s.choice === 'ours' ? s.ours : (s.choice === 'theirs' ? s.theirs : s.both);
        fs.writeFile(s.file, next + '\n');
        window.gitCommands.add([s.file]);
        this.showHintToast('Conflict resolution saved and staged. Now run `git commit`.');
        this.closeConflictResolver();
    },

    initTerminalAdapter: function() {
        const terminalBody = document.getElementById('terminalOutput');
        if (!terminalBody || !window.Terminal) return;

        const inputLine = terminalBody.querySelector('.terminal-input-line');
        if (!inputLine) return;

        const viewport = document.createElement('div');
        viewport.id = 'terminalViewport';
        viewport.className = 'terminal-viewport';

        terminalBody.innerHTML = '';
        terminalBody.appendChild(viewport);
        terminalBody.appendChild(inputLine);

        const term = new window.Terminal({
            convertEol: true,
            disableStdin: true,
            cursorBlink: false,
            theme: {
                background: '#0c0c0c',
                foreground: '#c9d1d9'
            },
            fontFamily: 'Fira Code, Consolas, monospace',
            fontSize: 14
        });

        term.open(viewport);
        term.writeln('Welcome to Git Wizard Academy!');
        term.writeln('Type help to see available commands.');
        term.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        this.terminalMode = 'xterm';
        this.xterm = term;
    },
    
    // Observe terminal for new content and auto-scroll
    observeTerminal: function() {
        if (this.terminalMode === 'xterm') return;
        const terminalBody = document.getElementById('terminalOutput');
        if (!terminalBody) return;
        
        const observer = new MutationObserver(function(mutations) {
            // Auto-scroll to bottom when new content added
            ui.scrollToInput();
        });
        
        observer.observe(terminalBody, { childList: true, subtree: true });
    },
    
    // Scroll to show input line
    scrollToInput: function() {
        const terminalBody = document.getElementById('terminalOutput');
        const terminalInput = document.getElementById('terminalInput');
        
        if (terminalInput) {
            terminalInput.focus();
        }
        if (this.terminalMode === 'xterm' && this.xterm) {
            this.xterm.scrollToBottom();
            return;
        }
        if (terminalBody && terminalInput) {
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }
    },

    writeToTerminal: function(message, isError) {
        if (this.terminalMode === 'xterm' && this.xterm) {
            const text = isError ? '\x1b[31m' + String(message || '') + '\x1b[0m' : String(message || '');
            const lines = text.split('\n');
            lines.forEach((line) => {
                this.xterm.writeln(line);
            });
            return;
        }

        const terminalHistory = document.getElementById('terminalHistory');
        if (!terminalHistory) return;
        const outputDiv = document.createElement('div');
        outputDiv.className = 'terminal-output ' + (isError ? 'error' : '');
        outputDiv.innerHTML = this.renderAnsi(message);
        terminalHistory.appendChild(outputDiv);
    },

    clearTerminal: function() {
        if (this.terminalMode === 'xterm' && this.xterm) {
            this.xterm.clear();
            this.xterm.writeln('Welcome to Git Wizard Academy!');
            this.xterm.writeln('Type help to see available commands.');
            this.xterm.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return;
        }
        const terminalHistory = document.getElementById('terminalHistory');
        if (terminalHistory) terminalHistory.innerHTML = '';
    },
    
    // Handle terminal input
    handleTerminalInput: function(e) {
        const terminalInput = e.target;
        const input = terminalInput.value;
        const cursorPos = terminalInput.selectionStart;
        
        // Handle command history with Up/Down arrows
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                terminalInput.value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
            }
            return;
        }
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                terminalInput.value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
            } else {
                this.historyIndex = -1;
                terminalInput.value = '';
            }
            return;
        }
        
        // Handle Tab for completion
        if (e.key === 'Tab') {
            e.preventDefault();
            this.handleTabCompletion(input, cursorPos, terminalInput);
            return;
        }
        
        // Handle Enter (execute command)
        if (e.key === 'Enter') {
            const cmd = input.trim();
            
            if (cmd) {
                // Add to command history
                this.commandHistory.push(cmd);
                this.historyIndex = -1;
                
                // Process the command
                this.processCommand(cmd);
            } else {
                // Empty command - just print prompt
                this.printOutput('$ ', false);
            }
            
            // Clear input
            terminalInput.value = '';
            e.preventDefault();
            return;
        }
        
        // Reset tab completion state on other keys
        this.lastTabComplete = '';
    },
    
    // Handle tab completion
    handleTabCompletion: function(input, cursorPos, terminalInput) {
        const fs = window.fileSystemModule;
        
        // Get word being completed (handle git commands and file names)
        const beforeCursor = input.substring(0, cursorPos);
        const afterCursor = input.substring(cursorPos);
        const words = beforeCursor.split(' ');
        const lastWord = words[words.length - 1];
        
        // Check if we're completing after a command
        let completionList = [];
        let prefix = lastWord;
        let showList = false;
        
        // First word - complete git/shell commands
        if (words.length === 1 || (words.length === 2 && input.endsWith(' '))) {
            const isGit = input.startsWith('git ') || beforeCursor === 'git';
            
            if (isGit && words.length >= 2) {
                // Completing git subcommand
                const gitSubs = ['add', 'init', 'status', 'commit', 'log', 'branch', 'checkout', 'switch', 
                                'merge', 'submodule', 'stash', 'tag', 'rebase', 'cherry-pick', 'bisect', 'reflog', 
                                'reset', 'diff', 'show', 'remote', 'fetch', 'pull', 'push', 'help', 'config'];
                completionList = gitSubs.filter(sub => sub.startsWith(lastWord));
                if (completionList.length === 1) {
                    terminalInput.value = 'git ' + completionList[0] + (afterCursor ? ' ' + afterCursor : ' ');
                    this.scrollToInput();
                    return;
                }
            } else if (!input.trim()) {
                // First word - complete both shell and git commands
                const shellCmds = ['ls', 'cd', 'pwd', 'cat', 'echo', 'mkdir', 'rm', 'grep', 'nano', 
                                  'clear', 'whoami', 'date', 'history', 'help', 'touch', 'cp', 'mv', 'wc'];
                const gitCmds = ['git', 'git add', 'git init', 'git status', 'git commit', 'git log',
                                'git branch', 'git checkout', 'git switch', 'git merge', 'git stash',
                                'git submodule', 'git tag', 'git rebase', 'git help'];
                completionList = [...shellCmds.filter(c => c.startsWith(lastWord)), 
                                 ...gitCmds.filter(c => c.startsWith(lastWord))];
            } else if (beforeCursor.endsWith(' ')) {
                // Just pressed space, get next word
                completionList = [];
            } else if (input.includes(' ')) {
                // Completing arguments - try to complete file names
                const gitSubs = ['add', 'init', 'status', 'commit', 'log', 'branch', 'checkout', 'switch', 
                                'merge', 'submodule', 'stash', 'tag', 'rebase', 'cherry-pick', 'help', 'config', 'reset'];
                const isGitCmd = gitSubs.some(sub => beforeCursor.endsWith(' ' + sub) || beforeCursor === sub);
                
                if (isGitCmd) {
                    // Completing file arguments for git
                    const files = fs.listFiles('.');
                    completionList = files.map(f => f.name).filter(name => name.startsWith(lastWord));
                } else {
                    // Completing for shell commands
                    const files = fs.listFiles('.');
                    completionList = files.map(f => f.name).filter(name => name.startsWith(lastWord));
                    completionList.push('.');  // Add current directory
                    completionList.push('..'); // Add parent directory
                }
            }
        } else if (words.length > 1) {
            // Completing after a command
            const cmd = words[0];
            
            if (cmd === 'git') {
                const gitSubs = ['add', 'init', 'status', 'commit', 'log', 'branch', 'checkout', 'switch',
                                'merge', 'submodule', 'stash', 'tag', 'rebase', 'cherry-pick', 'help', 'config'];
                if (words.length === 2) {
                    completionList = gitSubs.filter(sub => sub.startsWith(lastWord));
                } else if (words[1] === 'add') {
                    const files = fs.listFiles('.');
                    completionList = files.map(f => f.name).filter(name => name.startsWith(lastWord));
                    completionList.push('.');
                    completionList.push('*');
                }
            } else {
                // Shell command - complete file names
                const files = fs.listFiles('.');
                completionList = files.map(f => f.name).filter(name => name.startsWith(lastWord));
                completionList.push('.');
                completionList.push('..');
            }
        }
        
        // Remove duplicates
        completionList = [...new Set(completionList)];
        
        // Show completion options
        if (completionList.length === 1) {
            // Single match - complete it
            const newWord = completionList[0];
            const newWords = words.slice(0, -1);
            newWords.push(newWord);
            terminalInput.value = newWords.join(' ') + (afterCursor ? ' ' + afterCursor : '');
            this.scrollToInput();
        } else if (completionList.length > 1) {
            // Multiple matches - show them
            if (this.lastTabComplete === lastWord) {
                // Double tab - show all options
                this.printOutput(completionList.join('  '), false);
                this.lastTabComplete = '';
            } else {
                this.printOutput('Possible completions:', false);
                this.printOutput(completionList.join('  '), false);
                this.lastTabComplete = lastWord;
            }
            this.scrollToInput();
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
            window.gameState.flags = window.gameState.flags || {};
            if (filename.includes('.git/hooks')) {
                window.gameState.flags.createdHook = true;
            }
            window.gameEngine.addXP(10);
            
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
        
        // Refocus terminal
        const terminalInput = document.getElementById('terminalInput');
        if (terminalInput) {
            setTimeout(function() {
                terminalInput.focus();
            }, 100);
        }
    },
    
    // Toggle sound
    toggleSound: function(e) {
        e.target.textContent = e.target.textContent === '🔊' ? '🔇' : '🔊';
    },
    
    // Process any command
    processCommand: function(input) {
        const chain = this.splitChainedCommands(input);
        if (chain.length > 1) {
            let lastResult = null;
            for (let i = 0; i < chain.length; i++) {
                const cmdInput = chain[i];
                if (!cmdInput) continue;
                lastResult = this.processSingleCommand(cmdInput);
                if (!lastResult || lastResult.success === false) break;
            }
            return;
        }
        this.processSingleCommand(input);
    },

    processSingleCommand: function(input) {
        const terminalHistory = document.getElementById('terminalHistory');
        
        if (this.terminalMode === 'xterm' && this.xterm) {
            this.xterm.writeln('$ ' + input);
        } else {
            // Print the command
            const cmdLine = document.createElement('div');
            cmdLine.className = 'terminal-output command';
            cmdLine.textContent = '$ ' + input;
            terminalHistory.appendChild(cmdLine);
        }
        
        const parts = this.tokenizeInput(input);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        // Update command history
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
            
            if (gitCmd === 'help' || gitCmd === '?' || gitCmd === '--help' || gitCmd === '-h') {
                result = window.gitCommands.help(args.slice(1));
            } else if (window.gitCommands[gitCmd]) {
                result = window.gitCommands[gitCmd](args.slice(1));
            } else if (gitCmd === undefined) {
                result = { success: true, message: 'usage: git <command> [<args>]', xp: 0 };
            } else {
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
            this.writeToTerminal(result.message || '', result.isRaw ? false : !result.success);
            
            if (result.success && result.xp) {
                window.gameEngine.addXP(result.xp);
            }
        }
        
        // Check objectives after git commands
        if (cmd === 'git') {
            window.gameEngine.checkObjectives();
        }

        this.updateConflictUI();
        const hint = (window.lessonGuides && window.lessonGuides.getHint)
            ? window.lessonGuides.getHint(window.gameState.currentLevel, input, result, window.gameState)
            : '';
        if (hint) this.showHintToast(hint);
        // Conflict resolver is opt-in by lesson (future PR-style scenarios).
        
        // Scroll to show input
        this.scrollToInput();
        
        // Save game
        window.gameEngine.saveGame();
        return result;
    },
    
    // Print output to terminal
    printOutput: function(message, isError) {
        this.writeToTerminal(message, isError);
        this.scrollToInput();
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
    }
};

// Export
window.ui = ui;

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    ui.init();
});
