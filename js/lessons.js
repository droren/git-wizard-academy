// js/lessons.js
/**
 * Lesson Content for Git Wizard Academy
 * All levels and objectives
 */

const lessons = [
    {
        id: 0,
        title: "Level 1: Novice Initiate",
        icon: "🌱",
        iconClass: "novice",
        xpReward: 100,
        titleName: "Novice Initiate",
        description: "Your journey begins here",
        objectives: [
            "Configure your git identity (name and email)",
            "Initialize a new repository",
            "Create your first file and stage it",
            "Make your first commit"
        ],
        content: `
            <h2>🌱 Welcome, Young Apprentice!</h2>
            <p>Git is a powerful <strong>Version Control System</strong> that tracks changes in your code. Think of it as a time machine for your files!</p>
            
            <h3>What You'll Learn</h3>
            <ul>
                <li><code>git config</code> - Set up your identity</li>
                <li><code>git init</code> - Start a new repository</li>
                <li><code>echo</code> - Create files with content</li>
                <li><code>ls</code> - List files in directory</li>
                <li><code>cat</code> - Display file contents</li>
                <li><code>git add</code> - Stage files for commit</li>
                <li><code>git commit</code> - Save your changes permanently</li>
            </ul>

            <div class="tip-box">
                💡 <strong>Pro Tip:</strong> Git takes "snapshots" of your project, not just differences!
            </div>

            <h3>Setting Up Your Identity</h3>
            <pre><code>git config --global user.name "Your Name"
git config --global user.email "your@email.com"</code></pre>

            <h3>Creating Your First Repo</h3>
            <pre><code>git init</code></pre>

            <h3>Creating Files</h3>
            <pre><code>echo "Hello World" > hello.txt
echo "My Project" > README.md
ls              # List files
cat hello.txt    # Show file content</code></pre>

            <div class="objective-box">
                <div class="objective-header">
                    <span class="objective-icon">🎯</span>
                    <span class="objective-title">Your Objectives</span>
                </div>
                <ul class="objective-list" id="objectiveList">
                </ul>
            </div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: []
        },
        initialWorkspaceFiles: {
            'README.md': '# Wizard Notes\n\nWelcome to Git Wizard Academy.\n',
            '.gitignore': 'node_modules/\n.DS_Store\n'
        },
        boss: null
    },
    {
        id: 1,
        title: "Level 2: Apprentice Scribe",
        icon: "📜",
        iconClass: "apprentice",
        xpReward: 150,
        titleName: "Apprentice Scribe",
        description: "Master the art of committing",
        objectives: [
            "View repository status",
            "Understand the staging area",
            "Create multiple commits",
            "View commit history"
        ],
        content: `
            <h2>📜 The Art of Committing</h2>
            <p>Congratulations, Initiate! You've made your first commit. Now let's deepen your understanding.</p>

            <h3>The Three States</h3>
            <ul>
                <li><strong>Modified</strong> - You've changed the file, but haven't staged it</li>
                <li><strong>Staged</strong> - You've marked the file for inclusion in your next commit</li>
                <li><strong>Committed</strong> - The file is safely stored in your repository</li>
            </ul>

            <h3>Checking Status</h3>
            <pre><code>git status</code></pre>
            <p>This shows you which files are modified, staged, or untracked.</p>

            <h3>Viewing History</h3>
            <pre><code>git log</code></pre>
            <p>See your commit history!</p>
            <pre><code>git log --oneline</code></pre>
            <p>A compact view of your history.</p>

            <div class="warning-box">
                ⚠️ <strong>Important:</strong> Write meaningful commit messages! Future you will thank present you.
            </div>

            <div class="objective-box">
                <div class="objective-header">
                    <span class="objective-icon">🎯</span>
                    <span class="objective-title">Your Objectives</span>
                </div>
                <ul class="objective-list" id="objectiveList">
                </ul>
            </div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: [{ message: "Initial commit", author: "You", files: ["README.md"] }]
        },
        initialWorkspaceFiles: {
            'README.md': '# Wizard Notes\n\nThis project tracks your spellbook.\n',
            'app.js': 'console.log(\"Wizard Academy app boot\");\n'
        },
        boss: null
    },
    {
        id: 2,
        title: "Level 3: Journeyfolk Mage",
        icon: "🔀",
        iconClass: "journeyfolk",
        xpReward: 200,
        titleName: "Journeyfolk Mage",
        description: "Branch out and explore",
        objectives: [
            "Create a new branch",
            "Switch between branches",
            "Make commits on different branches",
            "Merge branches together"
        ],
        content: `
            <h2>🔀 The Power of Branching</h2>
            <p>Branches are Git's killer feature. They let you work on different features independently!</p>

            <h3>Creating Branches</h3>
            <pre><code>git branch feature-login</code></pre>
            <p>Creates a new branch called "feature-login"</p>

            <pre><code>git checkout -b feature-login</code></pre>
            <p>Creates AND switches to the new branch in one command!</p>

            <h3>Switching Branches</h3>
            <pre><code>git checkout main
git switch main</code></pre>

            <h3>Merging Branches</h3>
            <pre><code>git merge feature-login</code></pre>
            <p>Combines the changes from feature-login into your current branch.</p>

            <div class="tip-box">
                💡 <strong>Visual Aid:</strong> Use <code>git log --graph --oneline --all</code> to see your branch structure!
            </div>

            <div class="objective-box">
                <div class="objective-header">
                    <span class="objective-icon">🎯</span>
                    <span class="objective-title">Your Objectives</span>
                </div>
                <ul class="objective-list" id="objectiveList">
                </ul>
            </div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: [
                { message: "Initial commit", author: "You", files: ["README.md"] },
                { message: "Add main feature", author: "You", files: ["app.js"] }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Wizard Notes\n\nBranching practice repository.\n',
            'app.js': 'console.log(\"main branch app\");\n',
            'feature.txt': 'feature backlog item\\n'
        },
        boss: null
    },
    {
        id: 3,
        title: "Level 4: Battlefield Captain",
        icon: "⚔️",
        iconClass: "battlefield",
        xpReward: 250,
        titleName: "Battlefield Captain",
        description: "Conquer merge conflicts",
        objectives: [
            "Create a merge conflict",
            "Identify conflict markers",
            "Resolve a merge conflict",
            "Complete a merge after resolution"
        ],
        content: `
            <h2>⚔️ Enter the Battlefield</h2>
            <p>Conflicts happen when two people edit the same part of a file. Don't panic - they're normal and fixable!</p>

            <h3>How Conflicts Arise</h3>
            <p>When the same file is edited on different branches and you try to merge them.</p>

            <h3>Conflict Markers Look Like This:</h3>
            <pre><code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD
Your changes here
=======
Their changes here
&gt;&gt;&gt;&gt;&gt;&gt;&gt; branch-name</code></pre>

            <h3>Resolving Conflicts</h3>
            <ol>
                <li>Open the file and decide which changes to keep</li>
                <li>Remove the conflict markers</li>
                <li>Stage the resolved file</li>
                <li>Commit the merge</li>
            </ol>

            <pre><code>git add filename.txt
git commit -m "Resolve merge conflict"</code></pre>

            <div class="objective-box">
                <div class="objective-header">
                    <span class="objective-icon">🎯</span>
                    <span class="objective-title">Your Objectives</span>
                </div>
                <ul class="objective-list" id="objectiveList">
                </ul>
            </div>
        `,
        initialGitState: {
            branches: ['main', 'feature'],
            currentBranch: 'main',
            commits: [
                { message: "Initial commit", author: "You", files: ["README.md"] },
                { message: "Add feature on main", author: "You", files: ["app.js"] }
            ],
            staged: []
        },
        initialWorkspaceFiles: {
            'README.md': '# Conflict Drill\n\nTwo branches are about to diverge.\n',
            'app.js': 'console.log(\"main timeline\");\n'
        },
        conflictScenario: true,
        boss: {
            name: "The Merge Monster",
            avatar: "👹",
            hp: 100,
            dialogue: "You cannot defeat me! My conflicts are endless!",
            hint: "Find the conflict markers, choose the right changes, then add and commit!"
        }
    },
    {
        id: 4,
        title: "Level 5: Enchanted Archivist",
        icon: "🏛️",
        iconClass: "enchanted",
        xpReward: 300,
        titleName: "Enchanted Archivist",
        description: "Master stashing and tagging",
        objectives: [
            "Save work with git stash",
            "List and apply stashed changes",
            "Create annotated tags",
            "Navigate git log with style"
        ],
        content: `
            <h2>🏛️ The Art of Stashing</h2>
            <p>Need to switch branches but don't want to commit unfinished work? Stash it!</p>

            <h3>Stashing Your Work</h3>
            <pre><code>git stash</code></pre>
            <p>Temporarily shelves your changes.</p>

            <pre><code>git stash save "WIP: login feature"</code></pre>
            <p>Stash with a descriptive message.</p>

            <h3>Managing Stashes</h3>
            <pre><code>git stash list</code></pre>
            <p>See all your stashed changes.</p>

            <pre><code>git stash pop</code></pre>
            <p>Apply the latest stash and remove it.</p>

            <h3>Tags - Mark Important Commits</h3>
            <pre><code>git tag v1.0.0</code></pre>
            <p>Create a lightweight tag.</p>

            <pre><code>git tag -a v1.0.0 -m "Version 1.0.0"</code></pre>
            <p>Create an annotated tag.</p>

            <div class="objective-box">
                <div class="objective-header">
                    <span class="objective-icon">🎯</span>
                    <span class="objective-title">Your Objectives</span>
                </div>
                <ul class="objective-list" id="objectiveList">
                </ul>
            </div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: [
                { message: "Initial commit", author: "You", files: ["README.md"] },
                { message: "Add core features", author: "You", files: ["app.js", "index.html"] }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Archive Vault\n\nPrepare a release and pause work safely.\n',
            'app.js': 'console.log(\"core feature\");\n',
            'release-notes.md': 'v0.9.0 draft\\n'
        },
        boss: null
    },
    {
        id: 5,
        title: "Level 6: Shadow Walker",
        icon: "🌑",
        iconClass: "shadow",
        xpReward: 350,
        titleName: "Shadow Walker",
        description: "Master the dark art of rebase",
        objectives: [
            "Understand rebase vs merge",
            "Perform a basic rebase",
            "Use interactive rebase",
            "Edit, reorder, and squash commits"
        ],
        content: `
            <h2>🌑 The Shadow Path: Rebase</h2>
            <p>Rebase moves your commits to a new base, creating a cleaner, linear history.</p>

            <h3>Rebase vs Merge</h3>
            <p><strong>Merge:</strong> Combines two histories, creates a merge commit</p>
            <p><strong>Rebase:</strong> Moves your commits to appear after the target branch</p>

            <div class="tip-box">
                💡 <strong>Golden Rule:</strong> Never rebase commits that have been pushed and shared!
            </div>

            <h3>Basic Rebase</h3>
            <pre><code>git checkout feature
git rebase main</code></pre>
            <p>Moves feature branch to start from main's latest commit.</p>

            <h3>Interactive Rebase</h3>
            <pre><code>git rebase -i HEAD~3</code></pre>
            <p>Edit the last 3 commits!</p>

            <h3>Interactive Commands</h3>
            <ul>
                <li><code>pick</code> - Keep the commit as-is</li>
                <li><code>squash</code> - Combine with previous commit</li>
                <li><code>drop</code> - Remove the commit</li>
            </ul>

            <div class="objective-box">
                <div class="objective-header">
                    <span class="objective-icon">🎯</span>
                    <span class="objective-title">Your Objectives</span>
                </div>
                <ul class="objective-list" id="objectiveList">
                </ul>
            </div>
        `,
        initialGitState: {
            branches: ['main', 'feature'],
            currentBranch: 'feature',
            commits: [
                { message: "Initial commit", author: "You", files: ["README.md"] },
                { message: "Add main feature", author: "You", files: ["app.js"] },
                { message: "WIP: feature", author: "You", files: ["feature.js"] },
                { message: "More WIP", author: "You", files: ["feature.js"] }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Shadow Walk\n\nHistory must be rewritten cleanly.\n',
            'app.js': 'console.log(\"main stable\");\n',
            'feature.js': 'console.log(\"feature wip 2\");\n'
        },
        boss: {
            name: "Lord Rebase",
            avatar: "🧙",
            hp: 100,
            dialogue: "Your commit history is messy! I'll rewrite it for you... OR ELSE!",
            hint: "Use interactive rebase to squash those 'WIP' commits!"
        }
    },
    {
        id: 6,
        title: "Level 7: Grand Arcanist",
        icon: "🔮",
        iconClass: "arcanist",
        xpReward: 400,
        titleName: "Grand Arcanist",
        description: "Master reflog and recovery",
        objectives: [
            "Understand git reflog",
            "Recover lost commits",
            "Use git reset safely"
        ],
        content: `
            <h2>🔮 The Reflog: Your Safety Net</h2>
            <p>Lost work is rarely truly lost in Git. The reflog is your time machine!</p>

            <h3>What is Reflog?</h3>
            <p>The reflog records when the tip of branches are updated. Even "lost" commits live here!</p>

            <pre><code>git reflog</code></pre>
            <p>See your entire history of HEAD movements.</p>

            <h3>Recovering Lost Commits</h3>
            <pre><code>git reflog
git checkout &lt;commit-hash&gt;
git branch recovered &lt;commit-hash&gt;</code></pre>

            <h3>Git Reset: Moving HEAD</h3>
            <pre><code>git reset --soft HEAD~1</code></pre>
            <p>Move HEAD back 1 commit, keep changes staged.</p>

            <pre><code>git reset --hard HEAD~1</code></pre>
            <p>Move HEAD back and DESTROY all changes (DANGEROUS!)</p>

            <div class="warning-box">
                ⚠️ <strong>NEVER use --hard on shared commits!</strong>
            </div>

            <div class="objective-box">
                <div class="objective-header">
                    <span class="objective-icon">🎯</span>
                    <span class="objective-title">Your Objectives</span>
                </div>
                <ul class="objective-list" id="objectiveList">
                </ul>
            </div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: [
                { message: "Initial commit", author: "You", files: ["README.md"] },
                { message: "Add feature", author: "You", files: ["app.js"] }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Recovery Chamber\n\nPractice safe rollback and recovery.\n',
            'app.js': 'console.log(\"feature stable\");\n'
        },
        boss: null
    },
    {
        id: 7,
        title: "Level 8: Branch Tamer",
        icon: "🌿",
        iconClass: "branch",
        xpReward: 450,
        titleName: "Branch Tamer",
        description: "Cherry-pick and bisect like a pro",
        objectives: [
            "Use git cherry-pick to apply specific commits",
            "Use git bisect to find bugs",
            "Combine cherry-pick with branches"
        ],
        content: `
            <h2>🌿 Precision Tools: Cherry-Pick & Bisect</h2>
            <p>Sometimes you need surgical precision!</p>

            <h3>Cherry-Pick: Copy Individual Commits</h3>
            <pre><code>git cherry-pick &lt;commit-hash&gt;</code></pre>
            <p>Copy a single commit to your current branch.</p>

            <h3>Git Bisect: Find the Bug</h3>
            <pre><code>git bisect start
git bisect good &lt;commit&gt;
git bisect bad &lt;commit&gt;
git bisect reset</code></pre>

            <div class="objective-box">
                <div class="objective-header">
                    <span class="objective-icon">🎯</span>
                    <span class="objective-title">Your Objectives</span>
                </div>
                <ul class="objective-list" id="objectiveList">
                </ul>
            </div>
        `,
        initialGitState: {
            branches: ['main', 'hotfix'],
            currentBranch: 'main',
            commits: [
                { message: "Initial commit", author: "You", files: ["README.md"] },
                { message: "Add feature A", author: "You", files: ["featureA.js"] },
                { message: "Fix critical bug", author: "You", files: ["bugfix.js"], branch: "hotfix" }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Precision Ops\n\nFind and transplant the right fix.\n',
            'featureA.js': 'console.log(\"feature A\");\n',
            'bugfix.js': 'console.log(\"critical fix\");\n'
        },
        boss: {
            name: "Cherry-Pick Master",
            avatar: "🎯",
            hp: 100,
            dialogue: "Pick my commits correctly, or your history will be a mess!",
            hint: "Find the bugfix commit on the hotfix branch and cherry-pick it to main!"
        }
    },
    {
        id: 8,
        title: "Level 9: Reality Shaper",
        icon: "🌀",
        iconClass: "reality",
        xpReward: 500,
        titleName: "Reality Shaper",
        description: "Submodules, hooks, and aliases",
        objectives: [
            "Add and manage git submodules",
            "Create custom git hooks",
            "Configure git aliases"
        ],
        content: `
            <h3>🌀 Submodules: Repositories Within Repositories</h3>
            <pre><code>git submodule add &lt;repo-url&gt; path/to/submodule</code></pre>
            <p>Add a submodule.</p>

            <h3>Git Hooks: Automate Your Workflow</h3>
            <pre><code>.git/hooks/pre-commit
.git/hooks/pre-push
.git/hooks/commit-msg</code></pre>

            <h3>Git Aliases: Speed Up Your Commands</h3>
            <pre><code>git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.st status</code></pre>

            <div class="objective-box">
                <div class="objective-header">
                    <span class="objective-icon">🎯</span>
                    <span class="objective-title">Your Objectives</span>
                </div>
                <ul class="objective-list" id="objectiveList">
                </ul>
            </div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: [
                { message: "Initial commit", author: "You", files: ["README.md", ".gitmodules"] },
                { message: "Add dependencies", author: "You", files: ["package.json"] }
            ]
        },
        initialWorkspaceFiles: {
            'README.md': '# Reality Shaping\n\nAutomate and modularize responsibly.\n',
            '.gitmodules': '[submodule \"libs/engine\"]\\n\\tpath = libs/engine\\n\\turl = https://example.com/engine.git\\n',
            'package.json': '{\"name\":\"wizard-academy\",\"version\":\"1.0.0\"}\\n'
        },
        boss: null
    },
    {
        id: 9,
        title: "Level 10: Grand Wizard",
        icon: "👑",
        iconClass: "grand",
        xpReward: 1000,
        titleName: "Grand Wizard",
        description: "The ultimate mastery test",
        objectives: [
            "Demonstrate all core Git skills",
            "Complete the Final Exam",
            "Claim the title of Grand Wizard"
        ],
        content: `
            <h2>👑 The Final Challenge</h2>
            <p>You've come far, young wizard. Now face the ultimate test of your Git mastery!</p>

            <h3>The Grand Finale Scenario</h3>
            <ol>
                <li>Create a feature branch and make commits</li>
                <li>Create another branch for a hotfix</li>
                <li>Rebase your feature branch to main</li>
                <li>Cherry-pick the hotfix to main</li>
                <li>Merge everything cleanly</li>
            </ol>

            <h3>What You've Learned</h3>
            <ul>
                <li>✅ Repository setup and configuration</li>
                <li>✅ Staging and committing</li>
                <li>✅ Branching and merging</li>
                <li>✅ Conflict resolution</li>
                <li>✅ Stashing and tagging</li>
                <li>✅ Rebasing and recovery</li>
                <li>✅ Cherry-picking and bisecting</li>
            </ul>

            <div class="objective-box">
                <div class="objective-header">
                    <span class="objective-icon">🎯</span>
                    <span class="objective-title">Your Final Objectives</span>
                </div>
                <ul class="objective-list" id="objectiveList">
                </ul>
            </div>
        `,
        initialGitState: {
            branches: ['main'],
            currentBranch: 'main',
            commits: [{ message: "Initial commit", author: "Team", files: ["README.md"] }]
        },
        initialWorkspaceFiles: {
            'README.md': '# Final Exam\\n\\nStabilize all timelines and defeat entropy.\\n',
            'app.js': 'console.log(\"final timeline\");\\n'
        },
        finalExam: true,
        boss: {
            name: "The Git Dragon",
            avatar: "🐲",
            hp: 200,
            dialogue: "Only true Git masters may pass through me! Show me your power!",
            hint: "Combine all your skills: branches, commits, rebase, and merge!"
        }
    }
];

// Export for use in other modules
window.lessons = lessons;
