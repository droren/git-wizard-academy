// js/game-engine.js
/**
 * Game Engine for Git Wizard Academy
 * Handles XP, levels, achievements, and game state
 */

window.gameState = {
    currentLevel: 0,
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

const gameEngine = {
    // Initialize game
    init: function() {
        // Load saved state
        const saved = localStorage.getItem('gwa_gameState');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(window.gameState, parsed);
        }
        
        // Render UI
        this.renderLevelNav();
        this.renderAchievements();
        this.loadLevel(window.gameState.currentLevel);
        this.updateStats();
    },
    
    // Add XP and check for level up
    addXP: function(amount) {
        window.gameState.totalXP += amount;
        window.gameState.xpForCurrentLevel += amount;
        
        // Level up check
        while (window.gameState.xpForCurrentLevel >= window.gameState.xpRequiredForLevel) {
            window.gameState.xpForCurrentLevel -= window.gameState.xpRequiredForLevel;
            this.levelUp();
        }
        
        this.updateStats();
        this.saveGame();
    },
    
    // Trigger level up
    levelUp: function() {
        const modal = document.getElementById('levelCompleteModal');
        document.getElementById('modalTitle').textContent = '🎉 Level Up!';
        document.getElementById('modalSubtitle').textContent = 'You reached Level ' + (window.gameState.currentLevel + 1) + '!';
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
        
        if (levelEl) levelEl.textContent = window.gameState.currentLevel + 1;
        if (titleEl && window.lessons) titleEl.textContent = window.lessons[window.gameState.currentLevel].titleName;
        if (xpEl) xpEl.textContent = window.gameState.totalXP;
        
        const xpPercent = (window.gameState.xpForCurrentLevel / window.gameState.xpRequiredForLevel) * 100;
        if (xpBar) xpBar.style.width = Math.min(xpPercent, 100) + '%';
        
        if (commitsEl) commitsEl.textContent = window.gameState.commits;
        if (branchesEl) branchesEl.textContent = window.gameState.branches;
        if (mergesEl) mergesEl.textContent = window.gameState.merges;
        if (conflictsEl) conflictsEl.textContent = window.gameState.conflicts;
        if (commandsEl) commandsEl.textContent = window.gameState.commandsUsed;
    },
    
    // Load a specific level
    loadLevel: function(levelIndex) {
        window.gameState.currentLevel = levelIndex;
        const lesson = window.lessons[levelIndex];
        
        // Reset git state for level
        window.gameState.gitState = JSON.parse(JSON.stringify(lesson.initialGitState));
        window.gameState.currentObjectives = JSON.parse(JSON.stringify(lesson.objectives));
        
        // Update lesson content
        const lessonContent = document.getElementById('lessonContent');
        if (lessonContent) lessonContent.innerHTML = lesson.content;
        
        this.renderObjectives();
        this.renderLevelNav();
        this.updateStats();
        
        // Clear terminal
        const terminalHistory = document.getElementById('terminalHistory');
        if (terminalHistory) terminalHistory.innerHTML = '';
        
        // Boss fight?
        if (lesson.boss) {
            setTimeout(function() { gameEngine.startBossFight(lesson.boss); }, 1000);
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
        
        lesson.objectives.forEach(function(obj, index) {
            if (window.gameState.currentObjectives[index] === 'complete') return;
            
            var complete = false;
            var objLower = obj.toLowerCase();
            
            if (objLower.includes('config') && window.gameState.commandHistory.some(function(c) { return c.includes('config') && c.includes('user.name'); })) {
                complete = true;
            } else if (objLower.includes('init') && window.gameState.gitState.branches.length > 0) {
                complete = true;
            } else if (objLower.includes('first commit') && window.gameState.commits >= 1) {
                complete = true;
            } else if (objLower.includes('commit') && window.gameState.commits >= 1) {
                complete = true;
            } else if (objLower.includes('branch') && window.gameState.gitState.branches.length > 1) {
                complete = true;
            } else if (objLower.includes('switch') && window.gameState.commandHistory.some(function(c) { return c.includes('checkout') || c.includes('switch'); })) {
                complete = true;
            } else if (objLower.includes('merge') && window.gameState.merges >= 1) {
                complete = true;
            } else if (objLower.includes('status') && window.gameState.commandHistory.some(function(c) { return c.includes('status'); })) {
                complete = true;
            } else if (objLower.includes('log') && window.gameState.commandHistory.some(function(c) { return c.includes('log'); })) {
                complete = true;
            } else if (objLower.includes('stash') && localStorage.getItem('gwa_stash') === 'true') {
                complete = true;
            } else if (objLower.includes('tag') && localStorage.getItem('gwa_tag') === 'true') {
                complete = true;
            } else if (objLower.includes('rebase') && localStorage.getItem('gwa_rebase') === 'true') {
                complete = true;
            } else if (objLower.includes('cherry') && localStorage.getItem('gwa_cherrypick') === 'true') {
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
        
        if (overlay) overlay.classList.add('show');
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
            if (overlay) overlay.classList.remove('show');
            this.addXP(100);
            this.showAchievementPopup({ icon: '🏆', name: 'Boss Slayer', desc: 'Defeated a boss!' });
        }
    },
    
    // Save game state
    saveGame: function() {
        localStorage.setItem('gwa_gameState', JSON.stringify(window.gameState));
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
    }
};

// Export
window.gameEngine = gameEngine;