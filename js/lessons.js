// js/lessons.js
/**
 * Lesson Content for Git Wizard Academy
 * Tiered 10-level curriculum with explicit capstones
 */

const lessons = [
    {
        id: 0,
        title: "Level 1: Must-Know Foundations",
        icon: "🌱",
        iconClass: "must-know",
        xpReward: 100,
        titleName: "Must-Know Scout",
        description: "Identity, repository setup, and first snapshot",
        objectives: [
            "Configure git identity (user.name and user.email)",
            "Initialize a repository",
            "Stage tracked changes",
            "Create a commit"
        ],
        content: `
            <h2>🌱 Must-Know: Start Clean</h2>
            <p>Every Git journey starts with a trusted identity and a valid repository.</p>
            <pre><code>git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git init
echo "hello" > hello.txt
git add hello.txt
git commit -m "feat: first snapshot"</code></pre>
            <div class="objective-box"><div class="objective-header"><span class="objective-icon">🎯</span><span class="objective-title">Your Objectives</span></div><ul class="objective-list" id="objectiveList"></ul></div>
        `,
        initialGitState: { branches: ['main'], currentBranch: 'main', commits: [] },
        initialWorkspaceFiles: {
            'README.md': '# Must-Know Foundations\n\nInitialize and commit with confidence.\n',
            '.gitignore': 'node_modules/\n.DS_Store\n'
        },
        boss: null
    },
    {
        id: 1,
        title: "Level 2: Must-Know Capstone",
        icon: "🛡️",
        iconClass: "must-know",
        xpReward: 150,
        titleName: "Must-Know Defender",
        description: "Capstone: prove basic local workflow discipline",
        objectives: [
            "Inspect working state with git status",
            "Use the staging area deliberately",
            "Create at least two clear commits",
            "Validate history with git log --oneline"
        ],
        content: `
            <h2>🛡️ Must-Know Capstone</h2>
            <p>This capstone validates the full local loop: edit, stage, commit, and verify history.</p>
            <pre><code>git status
git add README.md
git commit -m "docs: update readme"
git add app.js
git commit -m "feat: add app entry"
git log --oneline</code></pre>
            <div class="objective-box"><div class="objective-header"><span class="objective-icon">🎯</span><span class="objective-title">Capstone Objectives</span></div><ul class="objective-list" id="objectiveList"></ul></div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: [{ message: 'Initial commit', author: 'You', files: ['README.md'] }]
        },
        initialWorkspaceFiles: {
            'README.md': '# Must-Know Capstone\n\nDemonstrate reliable snapshots.\n',
            'app.js': 'console.log("must-know capstone");\n'
        },
        boss: {
            name: 'Archivist Luma',
            avatar: '📚',
            hp: 100,
            dialogue: 'Prove you can preserve truth in history before touching advanced timelines.',
            hint: 'Run status, stage intentionally, commit twice, and confirm with git log --oneline.'
        }
    },
    {
        id: 2,
        title: "Level 3: Good-to-Know Branchcraft",
        icon: "🔀",
        iconClass: "good-to-know",
        xpReward: 200,
        titleName: "Good-to-Know Pathfinder",
        description: "Feature branches and branch switching",
        objectives: [
            "Create a feature branch",
            "Switch between main and feature branches",
            "Make commits on different branches",
            "Prepare a merge path"
        ],
        content: `
            <h2>🔀 Good-to-Know: Branchcraft</h2>
            <pre><code>git switch -c feature/ui
git commit -m "feat: ui draft"
git switch main
git commit -m "docs: update main notes"</code></pre>
            <p>Good-to-Know means you can isolate work safely before integration.</p>
            <div class="objective-box"><div class="objective-header"><span class="objective-icon">🎯</span><span class="objective-title">Your Objectives</span></div><ul class="objective-list" id="objectiveList"></ul></div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: [
                { message: 'Initial commit', author: 'You', files: ['README.md'] },
                { message: 'feat: base app', author: 'You', files: ['app.js'] }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Branchcraft\n\nSplit work into focused branches.\n',
            'app.js': 'console.log("branchcraft");\n'
        },
        boss: null
    },
    {
        id: 3,
        title: "Level 4: Good-to-Know Capstone",
        icon: "⚔️",
        iconClass: "good-to-know",
        xpReward: 250,
        titleName: "Good-to-Know Captain",
        description: "Capstone: merge and resolve conflicts safely",
        objectives: [
            "Trigger a merge conflict",
            "Identify conflict markers",
            "Resolve the conflict and stage resolution",
            "Complete the merge commit"
        ],
        content: `
            <h2>⚔️ Good-to-Know Capstone</h2>
            <p>Branching skill is incomplete until you can recover from conflicts.</p>
            <pre><code>git merge feature/conflict
cat app.js
nano app.js
git add app.js
git commit -m "merge: resolve feature conflict"</code></pre>
            <div class="objective-box"><div class="objective-header"><span class="objective-icon">🎯</span><span class="objective-title">Capstone Objectives</span></div><ul class="objective-list" id="objectiveList"></ul></div>
        `,
        initialGitState: {
            branches: ['main', 'feature'],
            currentBranch: 'main',
            commits: [
                { message: 'Initial commit', author: 'You', files: ['README.md'] },
                { message: 'feat: timeline A', author: 'You', files: ['app.js'] }
            ],
            staged: []
        },
        initialWorkspaceFiles: {
            'README.md': '# Conflict Arena\n\nResolve branch divergence.\n',
            'app.js': 'console.log("main timeline");\n'
        },
        conflictScenario: true,
        boss: {
            name: 'Captain Mira Rift',
            avatar: '🧙‍♂️',
            hp: 100,
            dialogue: 'A wizard who cannot resolve conflicts cannot lead a team timeline.',
            hint: 'Inspect markers, edit file, stage resolution, and commit merge.'
        }
    },
    {
        id: 4,
        title: "Level 5: Template Knight Toolkit",
        icon: "🏛️",
        iconClass: "template-knight",
        xpReward: 300,
        titleName: "Template Knight Artisan",
        description: "Stash, tags, and reusable command aliases",
        objectives: [
            "Save interrupted work with git stash",
            "Inspect and restore stashed work",
            "Create an annotated release tag",
            "Configure at least one useful git alias"
        ],
        content: `
            <h2>🏛️ Template Knight: Reusable Workflow Tools</h2>
            <pre><code>git stash
git stash list
git stash pop
git tag -a v1.0.0 -m "release"
git config --global alias.st status</code></pre>
            <p>Template Knights standardize repeatable workflow patterns.</p>
            <div class="objective-box"><div class="objective-header"><span class="objective-icon">🎯</span><span class="objective-title">Your Objectives</span></div><ul class="objective-list" id="objectiveList"></ul></div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: [
                { message: 'Initial commit', author: 'You', files: ['README.md'] },
                { message: 'feat: shipping prep', author: 'You', files: ['app.js', 'index.html'] }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Toolkit\n\nPrepare reusable release flow.\n',
            'app.js': 'console.log("toolkit");\n',
            'release-notes.md': 'v1 prep\n'
        },
        boss: null
    },
    {
        id: 5,
        title: "Level 6: Template Knight Capstone",
        icon: "🌑",
        iconClass: "template-knight",
        xpReward: 350,
        titleName: "Template Knight Commander",
        description: "Capstone: clean history with interactive rebase",
        objectives: [
            "Compare merge and rebase approaches",
            "Perform a branch rebase onto main",
            "Run interactive rebase",
            "Squash or reorder commits into clean history"
        ],
        content: `
            <h2>🌑 Template Knight Capstone</h2>
            <pre><code>git merge feature/alpha
git rebase main
git rebase -i HEAD~3</code></pre>
            <p>Capstone standard: produce a clean, understandable commit narrative.</p>
            <div class="objective-box"><div class="objective-header"><span class="objective-icon">🎯</span><span class="objective-title">Capstone Objectives</span></div><ul class="objective-list" id="objectiveList"></ul></div>
        `,
        initialGitState: {
            branches: ['main', 'feature'],
            currentBranch: 'feature',
            commits: [
                { message: 'Initial commit', author: 'You', files: ['README.md'] },
                { message: 'feat: base app', author: 'You', files: ['app.js'] },
                { message: 'WIP: feature', author: 'You', files: ['feature.js'] },
                { message: 'WIP: polish', author: 'You', files: ['feature.js'] }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Rebase Drill\n\nRewrite local history cleanly.\n',
            'app.js': 'console.log("stable main");\n',
            'feature.js': 'console.log("wip feature");\n'
        },
        boss: {
            name: 'Lord Rebase',
            avatar: '🧙',
            hp: 100,
            dialogue: 'Clean history communicates intent. Chaos hides defects.',
            hint: 'Use basic rebase, then interactive rebase to edit/squash commits.'
        }
    },
    {
        id: 6,
        title: "Level 7: Git Wizard Recovery",
        icon: "🔮",
        iconClass: "git-wizard",
        xpReward: 400,
        titleName: "Git Wizard Seer",
        description: "Reflog, reset strategy, and commit recovery",
        objectives: [
            "Inspect head movement with git reflog",
            "Recover a previously lost commit",
            "Use a safe reset mode"
        ],
        content: `
            <h2>🔮 Git Wizard: Recovery Discipline</h2>
            <pre><code>git reflog
git reset --soft HEAD~1
git branch recovered &lt;commit&gt;</code></pre>
            <p>Wizards recover timelines without panic.</p>
            <div class="objective-box"><div class="objective-header"><span class="objective-icon">🎯</span><span class="objective-title">Your Objectives</span></div><ul class="objective-list" id="objectiveList"></ul></div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: [
                { message: 'Initial commit', author: 'You', files: ['README.md'] },
                { message: 'feat: stable core', author: 'You', files: ['app.js'] }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Recovery Chamber\n\nRescue lost work.\n',
            'app.js': 'console.log("recoverable state");\n'
        },
        boss: null
    },
    {
        id: 7,
        title: "Level 8: Git Wizard Capstone",
        icon: "🎯",
        iconClass: "git-wizard",
        xpReward: 450,
        titleName: "Git Wizard Strategist",
        description: "Capstone: precision integration with cherry-pick and bisect",
        objectives: [
            "Cherry-pick a specific fix commit",
            "Run a full bisect cycle",
            "Work across multiple branches during incident response"
        ],
        content: `
            <h2>🎯 Git Wizard Capstone</h2>
            <pre><code>git cherry-pick &lt;sha&gt;
git bisect start
git bisect good &lt;sha&gt;
git bisect bad &lt;sha&gt;
git bisect reset</code></pre>
            <p>Capstone validates precision under pressure.</p>
            <div class="objective-box"><div class="objective-header"><span class="objective-icon">🎯</span><span class="objective-title">Capstone Objectives</span></div><ul class="objective-list" id="objectiveList"></ul></div>
        `,
        initialGitState: {
            branches: ['main', 'hotfix'],
            currentBranch: 'main',
            commits: [
                { message: 'Initial commit', author: 'You', files: ['README.md'] },
                { message: 'feat: module A', author: 'You', files: ['featureA.js'] },
                { message: 'fix: critical production bug', author: 'You', files: ['bugfix.js'], branch: 'hotfix' }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Precision Operations\n\nTransplant only the right fix.\n',
            'featureA.js': 'console.log("feature A");\n',
            'bugfix.js': 'console.log("critical fix");\n'
        },
        boss: {
            name: 'Marshal Quill',
            avatar: '🧭',
            hp: 100,
            dialogue: 'In incidents, precision beats speed without discipline.',
            hint: 'Cherry-pick the right commit and finish a bisect cycle.'
        }
    },
    {
        id: 8,
        title: "Level 9: Grand Git Wizard Collaboration",
        icon: "🛰️",
        iconClass: "grand-git-wizard",
        xpReward: 500,
        titleName: "Grand Git Wizard Envoy",
        description: "Remote collaboration foundations",
        objectives: [
            "Set both origin and upstream remotes",
            "Use push, fetch, and pull in collaboration flow",
            "Create a pull request and complete review",
            "Handle CI checks before merge readiness"
        ],
        content: `
            <h2>🛰️ Grand Git Wizard: Remote Collaboration</h2>
            <p>Remote work is mandatory in this tier.</p>
            <pre><code>git remote add origin https://example.com/you/repo.git
git remote add upstream https://example.com/org/repo.git
git push -u origin feature/collab
git fetch upstream
git pull --ff-only upstream main
# then create PR, review feedback, and verify CI checks</code></pre>
            <div class="objective-box"><div class="objective-header"><span class="objective-icon">🎯</span><span class="objective-title">Your Objectives</span></div><ul class="objective-list" id="objectiveList"></ul></div>
        `,
        initialGitState: {
            branches: ['main', 'feature/collab'],
            currentBranch: 'feature/collab',
            commits: [
                { message: 'Initial commit', author: 'Team', files: ['README.md'] },
                { message: 'feat: collaborative scaffold', author: 'You', files: ['app.js'] }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Remote Collaboration\n\nWork with origin and upstream remotes.\n',
            'app.js': 'console.log("collaboration flow");\n'
        },
        boss: null
    },
    {
        id: 9,
        title: "Level 10: Grand Git Wizard Capstone",
        icon: "👑",
        iconClass: "grand-git-wizard",
        xpReward: 1000,
        titleName: "Grand Git Wizard",
        description: "Capstone: full remote PR lifecycle with green-check merge gate",
        objectives: [
            "Demonstrate origin/upstream setup and synchronization",
            "Push branch updates and open a pull request",
            "Complete PR review and confirm CI checks pass",
            "Merge only after checks pass"
        ],
        content: `
            <h2>👑 Grand Git Wizard Capstone</h2>
            <p>This final exam is collaboration-first: no merge is valid unless checks are green.</p>
            <ol>
                <li>Configure origin and upstream remotes</li>
                <li>Push feature branch and fetch/pull updates</li>
                <li>Create PR and complete review loop</li>
                <li>Validate CI checks and merge only when checks pass</li>
            </ol>
            <div class="objective-box"><div class="objective-header"><span class="objective-icon">🎯</span><span class="objective-title">Final Capstone Objectives</span></div><ul class="objective-list" id="objectiveList"></ul></div>
        `,
        initialGitState: {
            branches: ['main', 'feature/final-capstone'],
            currentBranch: 'feature/final-capstone',
            commits: [{ message: 'Initial commit', author: 'Team', files: ['README.md'] }]
        },
        initialWorkspaceFiles: {
            'README.md': '# Grand Capstone\n\nRemote-first workflow, merge on green only.\n',
            'app.js': 'console.log("grand capstone");\n'
        },
        finalExam: true,
        boss: {
            name: 'The Merge Dragon',
            avatar: '🐲',
            hp: 200,
            dialogue: 'Show me disciplined collaboration: remotes, review, checks, then merge.',
            hint: 'Set origin/upstream, push/fetch/pull, open PR, run review, and merge only when checks pass.'
        }
    }
];

lessons.forEach(function(lesson, index) {
    if (lesson.repoSetup) return;
    lesson.repoSetup = index === 0
        ? {
            mode: 'init-required',
            summary: 'Repository Setup: this level begins without a Git repository. You are expected to run `git init` yourself.'
        }
        : {
            mode: 'prepared',
            summary: 'Repository Setup: this level already includes a prepared repository so you can focus on the lesson objective instead of reinitializing.'
        };
});

const tierCatalog = [
    { key: 'must-know', name: 'Must-Know', levels: [0, 1], badge: '🌱' },
    { key: 'good-to-know', name: 'Good-to-Know', levels: [2, 3], badge: '⚔️' },
    { key: 'template-knight', name: 'Template Knight', levels: [4, 5], badge: '🏛️' },
    { key: 'git-wizard', name: 'Git Wizard', levels: [6, 7], badge: '🔮' },
    { key: 'grand-git-wizard', name: 'Grand Git Wizard', levels: [8, 9], badge: '👑' }
];

lessons.forEach(function(lesson, index) {
    const tier = tierCatalog.find(function(entry) {
        return entry.levels.indexOf(index) !== -1;
    }) || tierCatalog[tierCatalog.length - 1];

    lesson.tier = tier.name;
    lesson.tierKey = tier.key;
    lesson.tierBadge = tier.badge;
    lesson.tierLevelIndex = tier.levels.indexOf(index);
    lesson.tierIsCapstone = index === tier.levels[tier.levels.length - 1];
});

if (typeof window !== 'undefined') {
    window.gwaTiers = tierCatalog;
}

// Export for use in other modules
window.lessons = lessons;
