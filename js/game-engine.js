// js/game-engine.js
/**
 * Game Engine for Git Wizard Academy
 * Handles XP, levels, achievements, and game state
 */

function createDefaultGameState() {
    return {
    // Lesson progression
currentLevel: 0,
    // Player rank (XP based)
    playerLevel: 1,
    lastPlayedDate: null,

    totalXP: 0,
    xpForCurrentLevel: 0,
    xpRequiredForLevel: 300,
    streak: 0,
    commandsUsed: 0,
    commits: 0,
    branches: 0,
    merges: 0,
    conflicts: 0,
    achievements: [],
    completedLevels: [],
    currentObjectives: [],
    gitState: {
        branches: ['main'],
        currentBranch: 'main',
        commits: [],
        staged: []
    },
    commandHistory: [],
    nanoFile: null
    };
}

window.gameState = createDefaultGameState();

const gameEngine = {
    // Initialize game
    init: function() {
        // Ensure FS is loaded (persisted separately)
        if (window.fileSystemModule && window.fileSystemModule.load) {
            window.fileSystemModule.load();
        }

        // Load saved lesson/player state
        const loadedState = window.lessonStore && window.lessonStore.load
            ? window.lessonStore.load()
            : (function() {
                const saved = localStorage.getItem('gwa_gameState');
                if (!saved) return null;
                try { return JSON.parse(saved); } catch (e) { return null; }
              })();
        if (loadedState) {
            Object.assign(window.gameState, loadedState);
        }

        // Load repository + fs snapshot if available
        const repoSnapshot = window.repoStore && window.repoStore.load ? window.repoStore.load() : null;
        if (repoSnapshot && repoSnapshot.gitState) {
            window.gameState.gitState = repoSnapshot.gitState;
        }
        if (repoSnapshot && repoSnapshot.fsSnapshot && window.fileSystemModule && window.fileSystemModule.import) {
            window.fileSystemModule.import(repoSnapshot.fsSnapshot);
        }

        // Back-compat defaults
        if (!Number.isFinite(window.gameState.playerLevel) || window.gameState.playerLevel < 1) window.gameState.playerLevel = 1;
        if (!Number.isFinite(window.gameState.totalXP)) window.gameState.totalXP = 0;
        if (!Number.isFinite(window.gameState.xpForCurrentLevel)) window.gameState.xpForCurrentLevel = 0;
        if (!Number.isFinite(window.gameState.xpRequiredForLevel) || window.gameState.xpRequiredForLevel < 50) window.gameState.xpRequiredForLevel = 300;
        if (!Array.isArray(window.gameState.completedLevels)) window.gameState.completedLevels = [];
        if (!Array.isArray(window.gameState.achievements)) window.gameState.achievements = [];
        if (!Array.isArray(window.gameState.commandHistory)) window.gameState.commandHistory = [];
        if (!window.gameState.flags) window.gameState.flags = {};

        // Daily streak (very simple: keep streak if played yesterday; reset if gap)
        const today = new Date();
        const todayKey = today.toISOString().slice(0,10);
        const last = window.gameState.lastPlayedDate;
        if (last) {
            const lastDate = new Date(last + "T00:00:00");
            const diffDays = Math.floor((today - lastDate) / (1000*60*60*24));
            if (diffDays === 1) window.gameState.streak = (window.gameState.streak || 0) + 1;
            else if (diffDays > 1) window.gameState.streak = 0;
        } else {
            window.gameState.streak = window.gameState.streak || 0;
        }
        window.gameState.lastPlayedDate = todayKey;

        // Render UI
        const levelIndex = Number.isFinite(window.gameState.currentLevel) ? window.gameState.currentLevel : 0;
        const lesson = (window.lessons && window.lessons[levelIndex]) ? window.lessons[levelIndex] : null;
        const hasRestorableObjectives =
            !!lesson &&
            Array.isArray(window.gameState.currentObjectives) &&
            window.gameState.currentObjectives.length === lesson.objectives.length;

        if (hasRestorableObjectives) {
            // Resume exactly where the learner left off (do not reset FS/git state).
            const lessonContent = document.getElementById('lessonContent');
            if (lessonContent) {
                let storyHtml = '';
                if (window.storyArc && window.storyArc.renderStoryPanel) {
                    storyHtml = window.storyArc.renderStoryPanel(levelIndex);
                }
                lessonContent.innerHTML = (storyHtml || '') + lesson.content;
            }
            this.renderObjectives();
            this.renderLevelNav();
            this.updateStats();
            this.renderAchievements();
            this.saveGame();
        } else {
            // Fresh load/new learner path.
            this.renderLevelNav();
            this.renderAchievements();
            this.loadLevel(levelIndex);
            this.updateStats();
            this.renderAchievements();
            this.saveGame();
        }
    },
    
    // Add XP and check for level up
    addXP: function(amount) {
        window.gameState.totalXP += amount;
        window.gameState.xpForCurrentLevel += amount;
        
        // Level up check
        while (window.gameState.xpForCurrentLevel >= window.gameState.xpRequiredForLevel) {
            window.gameState.xpForCurrentLevel -= window.gameState.xpRequiredForLevel;
            window.gameState.playerLevel += 1;
            // scale requirement gently
            window.gameState.xpRequiredForLevel = Math.round(window.gameState.xpRequiredForLevel * 1.12 + 25);
            this.levelUp();
        }
        
        this.updateStats();
        this.saveGame();
    },
    
    // Trigger level up
    levelUp: function() {
        const modal = document.getElementById('levelCompleteModal');
        document.getElementById('modalTitle').textContent = '🎉 Level Up!';
        document.getElementById('modalSubtitle').textContent = 'You reached Rank ' + window.gameState.playerLevel + '!';
        document.getElementById('modalXP').textContent = '+' + window.gameState.xpRequiredForLevel + ' XP';
        if (modal) modal.classList.add('show');
    },
    
    // Update all stats display
    updateStats: function() {
        const levelEl = document.getElementById('currentLevel');
        const titleEl = document.getElementById('currentTitle');
        const xpEl = document.getElementById('currentXP');
        const xpBar = document.getElementById('xpBar');
        const commitsEl = document.getElementById('commitsCount');
        const branchesEl = document.getElementById('branchesCount');
        const mergesEl = document.getElementById('mergesCount');
        const conflictsEl = document.getElementById('conflictsCount');
        const commandsEl = document.getElementById('commandsUsed');
        const streakEl = document.getElementById('streakCount');

        const rankTitles = [
            "Novice Initiate",
            "Beginner Apprentice",
            "Intermediate Adept",
            "Super Sorcerer",
            "Grand Wizard"
        ];
        const titleForLevel = (lvl) => {
            if (lvl <= 1) return rankTitles[0];
            if (lvl <= 5) return rankTitles[1];
            if (lvl <= 10) return rankTitles[2];
            if (lvl <= 20) return rankTitles[3];
            return rankTitles[4];
        };

        
        if (levelEl) levelEl.textContent = window.gameState.playerLevel;
        if (titleEl) titleEl.textContent = titleForLevel(window.gameState.playerLevel);
        if (xpEl) xpEl.textContent = window.gameState.totalXP;
        
        const xpPercent = (window.gameState.xpForCurrentLevel / window.gameState.xpRequiredForLevel) * 100;
        if (xpBar) xpBar.style.width = Math.min(xpPercent, 100) + '%';
        
        if (commitsEl) commitsEl.textContent = window.gameState.commits;
        if (branchesEl) branchesEl.textContent = window.gameState.branches;
        if (mergesEl) mergesEl.textContent = window.gameState.merges;
        if (conflictsEl) conflictsEl.textContent = window.gameState.conflicts;
        if (commandsEl) commandsEl.textContent = window.gameState.commandsUsed;
        if (streakEl) streakEl.textContent = window.gameState.streak || 0;
    },
    
// js/game-engine.js - Update the loadLevel function
// Find the loadLevel function and replace the git state reset with:

    loadLevel: function(levelIndex) {
        window.gameState.currentLevel = levelIndex;
        const lesson = (window.lessons && window.lessons[levelIndex]) ? window.lessons[levelIndex] : null;
        if (!lesson) return;

        if (this._bossIntroTimer) {
            clearTimeout(this._bossIntroTimer);
            this._bossIntroTimer = null;
        }
        const bossOverlay = document.getElementById('bossOverlay');
        if (bossOverlay) bossOverlay.classList.remove('show', 'minimized');

        // Level switches should not leak completion flags from previous levels/sessions.
        window.gameState.flags = {};
        
        // Reset git state for level
        window.gameState.gitState = {
            branches: lesson.initialGitState.branches ? [...lesson.initialGitState.branches] : ['main'],
            currentBranch: lesson.initialGitState.currentBranch || 'main',
            commits: lesson.initialGitState.commits ? [...lesson.initialGitState.commits] : [],
            staged: [],
            trackedFiles: {}  // Track committed files
        };


        // Seed file system for this level (so lessons with pre-made commits actually have files)
        if (window.fileSystemModule) {
            // New level = clean sandbox
            window.fileSystemModule.reset();

            const fs = window.fileSystemModule;
            const seedFiles = (lesson.initialWorkspaceFiles && typeof lesson.initialWorkspaceFiles === 'object')
                ? lesson.initialWorkspaceFiles
                : {};

            Object.keys(seedFiles).forEach(function(filename) {
                fs.createFile(filename, seedFiles[filename]);
            });

            // If lesson starts with a repo, create a minimal .git structure
            const hasRepo = (lesson.initialGitState && (lesson.initialGitState.commits && lesson.initialGitState.commits.length > 0)) ||
                           (lesson.initialGitState && lesson.initialGitState.branches && lesson.initialGitState.branches.length > 0 && levelIndex > 0);

            if (hasRepo) {
                fs.createDirectory('.git');
                fs.createFile('.git/config', '[core]\n\trepositoryformatversion = 0\n\tbare = false\n\tlogallrefupdates = true');
                fs.createFile('.git/HEAD', 'ref: refs/heads/' + (lesson.initialGitState.currentBranch || 'main'));
                fs.createDirectory('.git/refs');
                fs.createDirectory('.git/refs/heads');
                fs.createDirectory('.git/objects');

                // Create placeholder working files referenced by commits
                const files = new Set();
                (lesson.initialGitState.commits || []).forEach(c => (c.files || []).forEach(f => files.add(f)));
                files.forEach(f => {
                    if (!fs.exists(f)) {
                        const content = (f.toLowerCase().includes('readme') ? '# ' + (lesson.title || 'Project') + '\n\nWelcome to Git Wizard Academy.\n'
                                      : f.toLowerCase().endsWith('.js') ? '// ' + f + '\nconsole.log("Hello from ' + f + '");\n'
                                      : 'Sample content for ' + f + '\n');
                        fs.createFile(f, content);
                    }
                    // Track as committed
                    window.gameState.gitState.trackedFiles[f] = window.gitCommands && window.gitCommands._hash ? window.gitCommands._hash(fs.readFile(f)?.content || '') : true;
                });

                // Seed commits list (normalize dates)
                window.gameState.gitState.commits = (lesson.initialGitState.commits || []).map((c, idx) => ({
                    id: 'seed' + (idx+1),
                    message: c.message || 'Seed commit',
                    author: c.author || 'You',
                    files: c.files || [],
                    branch: lesson.initialGitState.currentBranch || 'main',
                    date: c.date ? new Date(c.date) : new Date()
                }));

                // Special prepared conflict scenario for Merge Monster:
                // pre-diverged main/feature branches that will conflict on merge.
                if (lesson.conflictScenario) {
                    const hash = (window.gitCommands && window.gitCommands._hash)
                        ? window.gitCommands._hash
                        : function (s) {
                            s = String(s || '');
                            let h = 5381;
                            for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
                            return h.toString(16);
                          };

                    const mkSha = function(seed) {
                        let hex = hash(seed);
                        while (hex.length < 40) hex += hash(hex + ':' + seed + ':' + hex.length);
                        return hex.slice(0, 40);
                    };

                    const treeOf = function(snapshot) {
                        const t = {};
                        Object.keys(snapshot).forEach(function (f) { t[f] = hash(snapshot[f]); });
                        return t;
                    };

                    const baseSnapshot = {
                        'README.md': '# Conflict Drill\n\nTwo branches are about to diverge.\n',
                        'app.js': 'const mode = \"shared\";\nconsole.log(mode);\n'
                    };
                    const mainSnapshot = {
                        'README.md': baseSnapshot['README.md'],
                        'app.js': 'const mode = \"main\";\nconsole.log(mode + \" timeline\");\n'
                    };
                    const featureSnapshot = {
                        'README.md': baseSnapshot['README.md'],
                        'app.js': 'const mode = \"feature\";\nconsole.log(mode + \" timeline\");\n'
                    };

                    const baseSha = mkSha('seed-conflict-base');
                    const mainSha = mkSha('seed-conflict-main');
                    const featureSha = mkSha('seed-conflict-feature');

                    const baseCommit = {
                        sha: baseSha,
                        shortSha: baseSha.slice(0, 7),
                        message: 'Base timeline',
                        author: 'You <you@example.com>',
                        authorName: 'You',
                        authorEmail: 'you@example.com',
                        branch: 'main',
                        date: new Date().toISOString(),
                        timestamp: new Date().toISOString(),
                        files: ['README.md', 'app.js'],
                        parent: null,
                        parents: [],
                        tree: treeOf(baseSnapshot),
                        snapshot: baseSnapshot,
                        parentSnapshot: {}
                    };
                    const mainCommit = {
                        sha: mainSha,
                        shortSha: mainSha.slice(0, 7),
                        message: 'Main branch edit',
                        author: 'You <you@example.com>',
                        authorName: 'You',
                        authorEmail: 'you@example.com',
                        branch: 'main',
                        date: new Date().toISOString(),
                        timestamp: new Date().toISOString(),
                        files: ['app.js'],
                        parent: baseSha,
                        parents: [baseSha],
                        tree: treeOf(mainSnapshot),
                        snapshot: mainSnapshot,
                        parentSnapshot: baseSnapshot
                    };
                    const featureCommit = {
                        sha: featureSha,
                        shortSha: featureSha.slice(0, 7),
                        message: 'Feature branch edit',
                        author: 'You <you@example.com>',
                        authorName: 'You',
                        authorEmail: 'you@example.com',
                        branch: 'feature',
                        date: new Date().toISOString(),
                        timestamp: new Date().toISOString(),
                        files: ['app.js'],
                        parent: baseSha,
                        parents: [baseSha],
                        tree: treeOf(featureSnapshot),
                        snapshot: featureSnapshot,
                        parentSnapshot: baseSnapshot
                    };

                    window.gameState.gitState.branches = ['main', 'feature'];
                    window.gameState.gitState.currentBranch = 'main';
                    window.gameState.gitState.refs = { main: mainSha, feature: featureSha };
                    window.gameState.gitState.headRef = 'refs/heads/main';
                    window.gameState.gitState.head = mainSha;
                    window.gameState.gitState.commitBySha = {};
                    [baseCommit, mainCommit, featureCommit].forEach(function(c) {
                        window.gameState.gitState.commitBySha[c.sha] = c;
                    });
                    window.gameState.gitState.commits = [baseCommit, mainCommit, featureCommit];
                    window.gameState.gitState.index = {};
                    window.gameState.gitState.staged = [];
                    window.gameState.gitState.mergeInProgress = false;
                    window.gameState.gitState.conflictFiles = [];
                    window.gameState.gitState.trackedFiles = treeOf(mainSnapshot);

                    fs.writeFile('README.md', mainSnapshot['README.md']);
                    fs.writeFile('app.js', mainSnapshot['app.js']);
                    fs.writeFile('.git/HEAD', 'ref: refs/heads/main');
                }
            }
        }
        
        window.gameState.currentObjectives = lesson.objectives ? [...lesson.objectives] : [];
        window.gameState.levelContext = {
            startCommitTotal: window.gameState.commits || 0,
            startMergeTotal: window.gameState.merges || 0,
            startBranchCount: (window.gameState.gitState && Array.isArray(window.gameState.gitState.branches))
                ? window.gameState.gitState.branches.length
                : 1,
            levelStartedAt: new Date().toISOString()
        };
        window.gameState.flags.visitedBranches = {};
        if (window.gameState.gitState && window.gameState.gitState.currentBranch) {
            window.gameState.flags.visitedBranches[window.gameState.gitState.currentBranch] = true;
        }
        
        // Update UI
        const lessonContent = document.getElementById('lessonContent');
        if (lessonContent) {
            let storyHtml = '';
            if (window.storyArc && window.storyArc.renderStoryPanel) {
                storyHtml = window.storyArc.renderStoryPanel(levelIndex);
            }
            lessonContent.innerHTML = (storyHtml || '') + lesson.content;
        }
        
        this.renderObjectives();
        this.renderLevelNav();
        this.updateStats();
        
        // Clear terminal
        if (window.ui && window.ui.clearTerminal) {
            window.ui.clearTerminal();
        } else {
            const terminalHistory = document.getElementById('terminalHistory');
            if (terminalHistory) terminalHistory.innerHTML = '';
        }
        
        // Boss fight?
        if (lesson.boss) {
            setTimeout(function() { gameEngine.startBossFight(lesson.boss); }, 1000);
        }

        if (window.ui && window.ui.showLevelGuide) {
            setTimeout(function() { window.ui.showLevelGuide(levelIndex); }, 220);
        }
        if (window.ui && window.ui.playLevelFlare) {
            setTimeout(function() { window.ui.playLevelFlare(levelIndex); }, 80);
        }
        
        this.saveGame();
    },    
    // Render objectives for current level
    renderObjectives: function() {
        const lesson = window.lessons[window.gameState.currentLevel];
        const objList = document.getElementById('objectiveList');
        if (!objList) return;
        
        objList.innerHTML = '';
        lesson.objectives.forEach(function(obj, index) {
            const li = document.createElement('li');
            li.innerHTML = '<div class="objective-checkbox ' + 
                           (window.gameState.currentObjectives[index] === 'complete' ? 'complete' : '') + '">' + 
                           (window.gameState.currentObjectives[index] === 'complete' ? '✓' : '') + 
                           '</div><span>' + obj + '</span>';
            objList.appendChild(li);
        });
    },
    
    // Check if objectives are complete based on game state
    checkObjectives: function() {
        const lesson = window.lessons[window.gameState.currentLevel];
        window.gameState.flags = window.gameState.flags || {};

        // Final-exam synthesis: track multi-skill completion in the final level.
        if (window.gameState.currentLevel === 9) {
            const f = window.gameState.flags;
            if (f.ranCommit && f.ranBranchFlow && f.ranMerge && f.ranRebaseBasic && f.ranCherryPick) {
                f.finalExamComplete = true;
            }
        }
        
        lesson.objectives.forEach(function(obj, index) {
            if (window.gameState.currentObjectives[index] === 'complete') return;
            
            var complete = false;
            var objLower = obj.toLowerCase();
            const flags = window.gameState.flags;
            let strictApplied = false;
            const currentLevel = Number(window.gameState.currentLevel);
            const campaignLevel = Number.isFinite(currentLevel) && currentLevel >= 0 && currentLevel <= 9;

            if (campaignLevel) {
                if (window.objectiveRules && window.objectiveRules.evaluateObjective) {
                    const strict = window.objectiveRules.evaluateObjective(currentLevel, index, window.gameState);
                    strictApplied = true;
                    complete = strict === true;
                }
            } else if (window.objectiveRules && window.objectiveRules.evaluateObjective) {
                const strict = window.objectiveRules.evaluateObjective(window.gameState.currentLevel, index, window.gameState);
                if (strict !== null) {
                    strictApplied = true;
                    complete = strict;
                }
            }
            
            if (!strictApplied && !complete && objLower.includes('config') && (flags.configuredIdentity || window.gameState.commandHistory.some(function(c) { return c.includes('config') && (c.includes('user.name') || c.includes('user.email')); }))) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('init') && (flags.repoInited || (window.fileSystemModule && window.fileSystemModule.exists('.git/config')))) {
                complete = true;
            } else if (!strictApplied && !complete && (objLower.includes('stage') || objLower.includes('staging area')) && window.gameState.gitState && window.gameState.gitState.index && Object.keys(window.gameState.gitState.index).length > 0) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('first commit') && window.gameState.commits >= 1) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('commit') && window.gameState.commits >= 1) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('branch') && window.gameState.gitState.branches.length > 1) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('switch') && window.gameState.commandHistory.some(function(c) { return c.includes('checkout') || c.includes('switch'); })) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('merge conflict') && flags.conflictResolved) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('create a merge conflict') && flags.conflictCreated) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('identify') && objLower.includes('conflict') && flags.conflictMarkersIdentified) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('complete a merge') && flags.mergeCompleted) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('merge') && window.gameState.merges >= 1) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('status') && window.gameState.commandHistory.some(function(c) { return c.includes('status'); })) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('log') && window.gameState.commandHistory.some(function(c) { return c.includes('log'); })) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('stash') && localStorage.getItem('gwa_stash') === 'true') {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('tag') && localStorage.getItem('gwa_tag') === 'true') {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('rebase') && localStorage.getItem('gwa_rebase') === 'true') {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('cherry') && localStorage.getItem('gwa_cherrypick') === 'true') {
                complete = true;
            }
            
            if (complete) {
                window.gameState.currentObjectives[index] = 'complete';
                gameEngine.renderObjectives();
                gameEngine.checkLevelComplete();
            }
        });
    },
    
    // Check if level is complete
    checkLevelComplete: function() {
        const allComplete = window.gameState.currentObjectives.every(function(o) { return o === 'complete'; });
        if (allComplete && window.gameState.completedLevels.indexOf(window.gameState.currentLevel) === -1) {
            window.gameState.completedLevels.push(window.gameState.currentLevel);
            
            setTimeout(function() {
                const lesson = window.lessons[window.gameState.currentLevel];
                document.getElementById('modalTitle').textContent = lesson.icon + ' ' + lesson.title;
                document.getElementById('modalSubtitle').textContent = lesson.description;
                document.getElementById('modalXP').textContent = '+' + lesson.xpReward + ' XP';
                document.getElementById('levelCompleteModal').classList.add('show');
            }, 500);
        }
    },
    
    // Render level navigation
    renderLevelNav: function() {
        const nav = document.getElementById('levelNav');
        if (!nav) return;
        
        nav.innerHTML = '';
        
        var maxCompleted = window.gameState.completedLevels.length > 0 ? Math.max.apply(null, window.gameState.completedLevels) : -1;
        
        window.lessons.forEach(function(lesson, index) {
            var btn = document.createElement('div');
            btn.className = 'level-btn ' + (index === window.gameState.currentLevel ? 'active' : '') + 
                           (window.gameState.completedLevels.indexOf(index) !== -1 ? ' completed' : '') +
                           (index > maxCompleted + 1 ? ' locked' : '');
            btn.innerHTML = '<div class="level-icon ' + lesson.iconClass + '">' + lesson.icon + '</div>' +
                           '<div class="level-info"><div class="level-name">' + lesson.title + '</div>' +
                           '<div class="level-desc">' + lesson.description + '</div></div>' +
                           '<div class="level-status">' + (window.gameState.completedLevels.indexOf(index) !== -1 ? '✓' : '') + '</div>';
            btn.onclick = (function(idx) {
                return function() {
                    if (idx <= maxCompleted + 1) {
                        gameEngine.loadLevel(idx);
                    }
                };
            })(index);
            nav.appendChild(btn);
        });
    },
    
    // Render achievements
    renderAchievements: function() {
        const grid = document.getElementById('achievementsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        window.achievements.forEach(function(ach) {
            var unlocked = ach.condition();
            var div = document.createElement('div');
            div.className = 'achievement ' + (unlocked ? 'unlocked' : 'locked');
            div.innerHTML = '<div class="achievement-icon">' + ach.icon + '</div>' +
                           '<div class="achievement-tooltip"><strong>' + ach.name + '</strong><br>' + ach.desc + '</div>';
            grid.appendChild(div);
            
            if (unlocked && window.gameState.achievements.indexOf(ach.id) === -1) {
                window.gameState.achievements.push(ach.id);
                gameEngine.showAchievementPopup(ach);
            }
        });
    },
    
    // Show achievement popup
    showAchievementPopup: function(achievement) {
        const popup = document.getElementById('achievementPopup');
        const icon = document.getElementById('achievementPopupIcon');
        const title = document.getElementById('achievementPopupTitle');
        const desc = document.getElementById('achievementPopupDesc');
        
        if (icon) icon.textContent = achievement.icon;
        if (title) title.textContent = achievement.name;
        if (desc) desc.textContent = achievement.desc;
        if (popup) popup.classList.add('show');
        
        setTimeout(function() { if (popup) popup.classList.remove('show'); }, 3000);
    },
    
    // Boss fight system
    startBossFight: function(boss) {
        const overlay = document.getElementById('bossOverlay');
        const avatar = document.getElementById('bossAvatar');
        const name = document.getElementById('bossName');
        const dialogue = document.getElementById('bossDialogue');
        const hint = document.getElementById('bossHint');
        
        if (avatar) avatar.textContent = boss.avatar;
        if (name) name.textContent = boss.name;
        if (dialogue) dialogue.innerHTML = '"' + boss.dialogue + '"';
        if (hint) hint.textContent = boss.hint;
        
        window.bossHP = boss.hp || 100;
        this.updateBossHealth();
        
        if (this._bossIntroTimer) {
            clearTimeout(this._bossIntroTimer);
            this._bossIntroTimer = null;
        }

        if (overlay) {
            overlay.classList.remove('minimized');
            overlay.classList.add('show');
        }
        const terminalInput = document.getElementById('terminalInput');
        if (terminalInput) {
            setTimeout(function() {
                terminalInput.focus();
            }, 20);
        }

        // Keep full-screen intro visible for 5-10s, then shrink to top-center status.
        const introMs = 5000 + Math.floor(Math.random() * 5001);
        this._bossIntroTimer = setTimeout(function() {
            if (!overlay || !overlay.classList.contains('show')) return;
            overlay.classList.add('minimized');
            const input = document.getElementById('terminalInput');
            if (input) input.focus();
        }, introMs);
    },
    
    updateBossHealth: function() {
        const healthBar = document.getElementById('bossHealthBar');
        const hpText = document.getElementById('bossHP');
        if (healthBar) healthBar.style.width = window.bossHP + '%';
        if (hpText) hpText.textContent = window.bossHP;
    },
    
    damageBoss: function(amount) {
        window.bossHP -= amount;
        if (window.bossHP < 0) window.bossHP = 0;
        this.updateBossHealth();
        
        if (window.bossHP <= 0) {
            const overlay = document.getElementById('bossOverlay');
            if (this._bossIntroTimer) {
                clearTimeout(this._bossIntroTimer);
                this._bossIntroTimer = null;
            }
            if (overlay) overlay.classList.remove('show', 'minimized');
            this.addXP(100);
            this.showAchievementPopup({ icon: '🏆', name: 'Boss Slayer', desc: 'Defeated a boss!' });
        }
    },
    
    // Save game state
    saveGame: function() {
        if (window.lessonStore && window.lessonStore.save) {
            window.lessonStore.save(window.gameState);
        } else {
            localStorage.setItem('gwa_gameState', JSON.stringify(window.gameState));
        }

        if (window.repoStore && window.repoStore.save && window.fileSystemModule && window.fileSystemModule.export) {
            window.repoStore.save({
                gitState: window.gameState.gitState,
                fsSnapshot: window.fileSystemModule.export()
            });
        }

        if (window.fileSystemModule && window.fileSystemModule.save) window.fileSystemModule.save();
    },
    
    // Next level
    nextLevel: function() {
        const modal = document.getElementById('levelCompleteModal');
        if (modal) modal.classList.remove('show');
        
        if (window.gameState.currentLevel < window.lessons.length - 1) {
            this.loadLevel(window.gameState.currentLevel + 1);
        } else {
            alert('🎉 CONGRATULATIONS! You are now a Git Grand Wizard! 🧙‍♂️');
        }
    },
    
    // Close modal
    closeModal: function() {
        const modal = document.getElementById('levelCompleteModal');
        if (modal) modal.classList.remove('show');
    },

    resetLevel: function(skipConfirm) {
        const okay = skipConfirm || window.confirm('Reset current level progress and workspace?');
        if (!okay) return false;

        this.loadLevel(window.gameState.currentLevel || 0);
        this.updateStats();
        this.renderObjectives();
        this.renderLevelNav();
        this.saveGame();
        return true;
    },

    resetGame: function(skipConfirm) {
        const okay = skipConfirm || window.confirm('Reset the entire game, all levels, and saved state?');
        if (!okay) return false;

        if (window.lessonStore && window.lessonStore.clear) window.lessonStore.clear();
        if (window.repoStore && window.repoStore.clear) window.repoStore.clear();
        if (window.configStore && window.configStore.save) window.configStore.save({});

        [
            'gwa_stash',
            'gwa_tag',
            'gwa_rebase',
            'gwa_interactive_rebase',
            'gwa_cherrypick',
            'gwa_recovery'
        ].forEach(function(key) { localStorage.removeItem(key); });

        if (window.fileSystemModule && window.fileSystemModule.reset) window.fileSystemModule.reset();

        window.gameState = createDefaultGameState();
        this.loadLevel(0);
        this.updateStats();
        this.renderAchievements();
        this.renderLevelNav();
        this.saveGame();
        return true;
    }
};

// Export
window.gameEngine = gameEngine;

// Auto-init
document.addEventListener('DOMContentLoaded', function(){
  if (window.gameEngine && window.lessons) {
    window.gameEngine.init();
  }
});
