// js/story-arc.js
/**
 * Narrative arc woven through lessons.
 */

(function () {
    const mentor = {
        name: 'Archivist Vega',
        avatar: '🧙‍♀️',
        role: 'Chronicle Keeper',
        voice: 'A warm but sharp guide who appears at the beginning of great journeys and at major turning points to connect practical Git habits to the larger campaign.'
    };

    const prologue = {
        title: 'Chronicle of Broken Time',
        body: 'Before versioning, engineers copied files as final_final_REAL_v7. Systems drifted, fixes vanished, and operators drowned in endless outages. Ancient systems rose: RCS kept local history, CVS enabled sharing but fractured atomicity, and Subversion improved central order while still making branching costly. Then came Git: distributed history, cheap branches, cryptographic snapshots, and recoverable timelines. You are the Arc-Engineer chosen to prevent the Fracture Future: a world of untraceable bugs, irreversible deploys, and failing systems.',
        crawlHeading: 'Episode 0: The Fracture Future',
        crawlLines: [
            'For ages, teams stored code in brittle folders, hand-written notes, and mysterious archives.',
            'Fixes vanished. Releases drifted. Operators inherited systems with no trustworthy history.',
            'Older revision systems brought order, but branching stayed expensive, collaboration stayed rigid, and recovery stayed painful.',
            'Then Git emerged with distributed history, cheap branches, cryptographic snapshots, and timelines that could be repaired.',
            'Now the Fracture Future stirs again. Manual storage cults, broken change logs, and unreviewed documentation threaten every environment.',
            'You are the Arc-Engineer. Learn Git. Restore order. Prepare for the frontier beyond local history.'
        ]
    };

    const lessonLore = {
        0: {
            title: 'Initiation at the Time Forge',
            mission: 'Bind your identity and create the first stable timeline.',
            stakes: 'Without identity and first commits, history has no witnesses.',
            guardian: {
                name: 'Luma of the Forge',
                avatar: '🧑‍🏫',
                title: 'Warden of First Commits'
            },
            briefing: 'Luma guards the forge where anonymous scraps of code become a true repository. Earn passage by naming yourself and preserving the first snapshot.',
            transition: 'Archivist Vega records your name in the Chronicle and points toward the chambers where raw edits begin to move.',
            teaser: 'Soon you will learn that not every change belongs in history immediately.',
            cadence: [
                { label: 'Once Per Environment', text: 'Set your global identity with `git config --global user.name` and `git config --global user.email`. This behaves like your personal `.gitconfig` and should stay with you across repositories in the course.' },
                { label: 'Once Per Repository', text: 'Run `git init` when starting a brand new project. That creates the repository itself.' },
                { label: 'For Each Snapshot', text: 'Create or edit files, inspect them with `ls` and `cat`, stage with `git add`, then preserve the state with `git commit`.' }
            ],
            bonus: 'Later, after the commands make sense in full, you can shorten them with aliases in your `.gitconfig`.'
        },
        1: {
            title: 'The Three States of Matter',
            mission: 'Master working tree, index, and commit history.',
            stakes: 'Unchecked changes become ghost defects in production.',
            guardian: {
                name: 'Halden the Scribe',
                avatar: '🧑‍💼',
                title: 'Custodian of the Index'
            },
            briefing: 'Halden teaches that work in progress, staged intent, and committed truth are different states of the same artifact. Confusing them invites phantom regressions.',
            transition: 'The archive brightens as you learn to separate rough edits from deliberate history.',
            teaser: 'The next gate opens into branching timelines where experiments no longer have to collide.',
            cadence: [
                { label: 'In Every Repository', text: 'Use `git status` often. It answers the important question: what is modified, staged, committed, or still untracked right now?' },
                { label: 'For Each Commit', text: 'Stage only the changes you want in the next snapshot, then commit with a message future-you can understand.' },
                { label: 'For Each Investigation', text: 'Use `git log` or `git log --oneline` whenever you need to understand how the repository got here.' }
            ],
            bonus: 'A short `git log --oneline` habit saves a surprising amount of confusion during later merge and rebase work.'
        },
        2: {
            title: 'Branching the Multiverse',
            mission: 'Split timelines safely and reunite them through merges.',
            stakes: 'No branching means one risky line for every experiment.',
            guardian: {
                name: 'Ilex the Pathfinder',
                avatar: '🧝‍♀️',
                title: 'Cartographer of Parallel Work'
            },
            briefing: 'Ilex maps alternate futures. Under their watch, features, fixes, and experiments gain their own paths instead of trampling the main road.',
            transition: 'Vega notes that separate timelines can serve the same mission when they are rejoined with care.',
            teaser: 'Not every reunion is peaceful. The battlefield ahead is littered with conflicting edits.',
            cadence: [
                { label: 'When Starting New Work', text: 'Create a branch for a new feature or risky idea so your main line stays stable.' },
                { label: 'On Each Branch', text: 'Switch to the branch you mean to edit, then make commits that belong to that stream of work.' },
                { label: 'When Work Is Ready', text: 'Merge the branch back into the target branch to reunite the timelines.' }
            ],
            bonus: 'Branch names that reflect purpose like `feature/login` or `hotfix/cache-bug` make future merges easier to understand.'
        },
        3: {
            title: 'War of Conflicting Realities',
            mission: 'Resolve divergent edits and restore continuity.',
            stakes: 'Unresolved conflicts cascade into total service collapse.',
            guardian: {
                name: 'Captain Mira Rift',
                avatar: '🧙‍♂️',
                title: 'Keeper of Difficult Merges'
            },
            briefing: 'Captain Mira Rift tests whether you can stay calm when two valid edits collide. Panic creates worse damage than the conflict itself.',
            transition: 'With each resolved marker, the battlefield calms and a cleaner release path becomes visible.',
            teaser: 'The next vault will test whether you can pause unfinished work without losing it.',
            cadence: [
                { label: 'Before Merging', text: 'Read the branch history so you understand what is about to collide.' },
                { label: 'When Conflict Happens', text: 'Inspect the markers with `cat` or `nano`, decide what should survive, remove the markers, then stage the resolution.' },
                { label: 'After Resolution', text: 'Commit the merge so the repository records how the realities were reconciled.' }
            ],
            bonus: 'Conflict markers are not errors to fear; they are Git clearly asking a human to choose the correct truth.'
        },
        4: {
            title: 'Vault of Frozen Work',
            mission: 'Stash interrupted work, tag stable milestones, and preserve release memory.',
            stakes: 'Without stashes and tags, context and releases are lost.',
            guardian: {
                name: 'Mirelle the Curator',
                avatar: '🧑‍🔬',
                title: 'Warden of Release Relics'
            },
            briefing: 'Mirelle protects unfinished work from vanishing during urgent pivots. She also marks the milestones that future rescuers must be able to trust.',
            transition: 'The vault opens, revealing that history is not only about writing commits, but also about preserving intent and naming safe return points.',
            teaser: 'Beyond the vault waits a shadow path where history can be rewritten into something sharper.',
            cadence: [
                { label: 'During Interruptions', text: 'Use `git stash` when work is not ready to commit but you need a clean tree for something urgent.' },
                { label: 'When Returning To Work', text: 'Use `git stash list` and `git stash pop` or `git stash apply` to bring the work back intentionally.' },
                { label: 'At Important Milestones', text: 'Create annotated tags for releases and meaningful checkpoints that should be easy to find later.' }
            ],
            bonus: 'Release tags are much more valuable when they are annotated with a message instead of just a bare name.'
        },
        5: {
            title: 'Shadow Rewrites',
            mission: 'Rebase timelines into clean, comprehensible history.',
            stakes: 'Chaotic history hides root causes and slows every rescue.',
            guardian: {
                name: 'Lord Rebase',
                avatar: '🧙',
                title: 'Editor of Crooked Timelines'
            },
            briefing: 'Lord Rebase does not destroy history for sport. He demands discipline: rewrite only when it clarifies the truth and harms no one downstream.',
            transition: 'Vega appears at the threshold, reminding you that clean history is power only when used responsibly.',
            teaser: 'Soon you will descend into the catacombs where lost work waits for those who know how to read the trail.',
            cadence: [
                { label: 'When Comparing Strategies', text: 'Use merge when you want to preserve the branching shape. Use rebase when you want a cleaner linear story of your own local work.' },
                { label: 'Before Rebasing', text: 'Make sure your working tree is clean. Commit or stash pending changes first.' },
                { label: 'For Polishing Local Work', text: 'Use interactive rebase to edit, reorder, or squash untidy local commits before sharing them.' }
            ],
            bonus: 'The golden rule still matters: avoid rebasing published shared history unless your whole team explicitly understands the consequences.'
        },
        6: {
            title: 'Reflog Catacombs',
            mission: 'Recover lost commits and reset safely.',
            stakes: 'When mistakes are irreversible, teams fear shipping.',
            guardian: {
                name: 'Oracle Nox',
                avatar: '🧙‍♀️',
                title: 'Seer of Lost HEADs'
            },
            briefing: 'Nox keeps a ledger of every movement through time. Even when a commit seems gone, the catacombs remember.',
            transition: 'Your confidence changes the tone of the campaign: fear gives way to recovery, and recovery gives way to precision.',
            teaser: 'The next trial is surgical. You will be asked to move only the exact fixes that matter.',
            cadence: [
                { label: 'When Things Feel Lost', text: 'Use `git reflog` to find where HEAD and branch tips used to point.' },
                { label: 'When Rewinding Carefully', text: 'Use safer reset modes such as `--soft` or mixed reset before resorting to anything destructive.' },
                { label: 'When Recovering', text: 'Branch or checkout the recovered commit so the work becomes visible and safe again.' }
            ],
            bonus: 'Understanding recovery tools makes teams bolder and calmer, because mistakes stop feeling permanent.'
        },
        7: {
            title: 'Precision Arsenal',
            mission: 'Cherry-pick exact fixes and bisect hidden regressions.',
            stakes: 'Without precision tools, incidents drag on for days.',
            guardian: {
                name: 'Marshal Quill',
                avatar: '🧑‍🚀',
                title: 'Sniper of Critical Fixes'
            },
            briefing: 'Quill fights incidents with precision, not panic. One fix, one branch, one regression isolated at a time.',
            transition: 'The campaign grows broader now. Precision at the commit level must evolve into sustainable systems and repeatable practices.',
            teaser: 'Ahead lies the engineering frontier: automation, modular dependencies, and the edge of collaborative platforms.',
            cadence: [
                { label: 'When A Specific Fix Is Needed', text: 'Use `git cherry-pick` to transplant only the commit that belongs elsewhere.' },
                { label: 'When A Bug Hides In History', text: 'Use `git bisect` to narrow down which change introduced the regression.' },
                { label: 'When Stabilising Branches', text: 'Combine cherry-pick with branch awareness so critical fixes land in the right places first.' }
            ],
            bonus: 'Cherry-picking is powerful, but it is strongest when commit messages and branch purpose are already clear.'
        },
        8: {
            title: 'Reality Engineering',
            mission: 'Control dependencies, automation hooks, and aliases while preparing for work beyond a single local machine.',
            stakes: 'Manual toil and drift create unscalable, brittle systems.',
            guardian: {
                name: 'Engineer Tessera',
                avatar: '🧑‍🔧',
                title: 'Architect of Repeatable Rituals'
            },
            briefing: 'Tessera shows that strong local craft is what makes larger collaboration possible. Hooks, aliases, and modular repos are scaffolding before the next frontier.',
            transition: 'Archivist Vega returns to warn that local mastery is only the first half of the journey.',
            teaser: 'Beyond this academy lies the Realm of Hosted Repositories: GitHub, GitLab, and Gitea, where review, change management, and team flow become their own discipline.',
            cadence: [
                { label: 'Per Environment', text: 'Aliases belong in your global `.gitconfig` once you already understand the full commands they shorten.' },
                { label: 'Per Repository', text: 'Hooks and submodules are repository-specific decisions and should be added with intention, not by habit.' },
                { label: 'As Work Scales', text: 'Use automation and modularity to reduce repetitive typing and drift, while keeping the underlying concepts visible.' }
            ],
            bonus: 'Common starter aliases include `alias.st=status`, `alias.co=checkout`, and `alias.br=branch`, but only after the long form feels natural.'
        },
        9: {
            title: 'The Dragon of Entropy',
            mission: 'Combine all Git disciplines to stabilize the world graph and stand ready for remote collaboration.',
            stakes: 'Failure means a future of permanent firefighting and outage chaos.',
            guardian: {
                name: 'Ser Rowan Entropy',
                avatar: '🧙‍♂️',
                title: 'Warden of the Final Gate'
            },
            briefing: 'Ser Rowan embodies the future you are trying to prevent: local chaos, unreviewed changes, missing approvals, and no reliable path from laptop to production.',
            transition: 'When the final gate opens, Vega reveals the next frontier: hosted platforms, pull requests, approvals, pipelines, and the stewardship of shared repositories.',
            teaser: 'Next Course Unlocked: GitHub, GitLab, and Gitea. There, the battle shifts from personal mastery to team-scale repository management.',
            cadence: [
                { label: 'During Final Integration', text: 'Use the full stack of skills: commit discipline, branching, rebasing, cherry-picking, and clean merging.' },
                { label: 'Before Team-Scale Work', text: 'Local Git fluency is the foundation for remotes, reviews, CI, and branch protection. Without the basics, platforms only amplify confusion.' },
                { label: 'For The Next Journey', text: 'GitHub, GitLab, and Gitea will build on what you know here rather than replace it.' }
            ],
            bonus: 'The sequel course will focus on remotes, review flows, repository hosting tools, and change management instead of repeating local Git fundamentals.'
        }
    };

    function getLessonLore(levelIndex) {
        return lessonLore[levelIndex] || null;
    }

    function getGuideBrief(levelIndex) {
        const lore = getLessonLore(levelIndex);
        if (!lore) return null;
        return {
            mentor: mentor,
            guardian: lore.guardian,
            briefing: lore.briefing,
            teaser: lore.teaser,
            cadence: lore.cadence && lore.cadence[0] ? lore.cadence[0].text : '',
            bonus: lore.bonus || ''
        };
    }

    function getTransitionText(levelIndex) {
        const lore = getLessonLore(levelIndex);
        return lore ? lore.transition : '';
    }

    function getCurrentConfigLines() {
        if (typeof window === 'undefined' || !window.configStore || !window.configStore.load) return [];
        const cfg = window.configStore.load() || {};
        return Object.keys(cfg).sort().map(function (key) {
            return key + '=' + cfg[key];
        });
    }

    function renderCadenceBlocks(cadence) {
        if (!Array.isArray(cadence) || !cadence.length) return '';
        return '<div class="story-cadence">' + cadence.map(function (item) {
            return '<div class="story-cadence-card">' +
                '<div class="story-cadence-label">' + item.label + '</div>' +
                '<p>' + item.text + '</p>' +
                '</div>';
        }).join('') + '</div>';
    }

    function renderConfigPanel() {
        const lines = getCurrentConfigLines();
        const content = lines.length
            ? lines.join('\n')
            : '# No global settings yet.\n# Use git config --global user.name "Your Name"\n# Use git config --global user.email "you@example.com"';

        return '<div class="story-config">' +
            '<div class="story-config-title">Course Environment: ~/.gitconfig</div>' +
            '<p>This is your course-wide Git environment. Your home directory holds the hidden config, and your repositories live in project folders under <code>~/projects/</code>. Global settings persist across levels and can be tuned any time with <code>git config --global ...</code>.</p>' +
            '<pre><code>' + content + '</code></pre>' +
            '</div>';
    }

    function renderStoryPanel(levelIndex) {
        const lore = lessonLore[levelIndex];
        if (!lore) return '';

        let html = '<section class="story-panel">';
        if (levelIndex === 0) {
            html += '<h2>' + mentor.avatar + ' ' + mentor.name + ', ' + mentor.role + '</h2>';
            html += '<p>' + mentor.voice + '</p>';
            html += '<h3>Chronicle: ' + prologue.title + '</h3>';
            html += '<p>' + prologue.body + '</p>';
        }
        html += '<div class="story-cast">';
        html += '<div class="story-guardian">';
        html += '<div class="story-guardian-avatar">' + lore.guardian.avatar + '</div>';
        html += '<div><strong>Chapter Guardian:</strong> ' + lore.guardian.name + '<br><span>' + lore.guardian.title + '</span></div>';
        html += '</div>';
        html += '<div class="story-mentor-note"><strong>' + mentor.avatar + ' ' + mentor.name + ':</strong> Appears in the big moments to connect this level to the wider campaign.</div>';
        html += '</div>';
        html += '<h3>Story Thread: ' + lore.title + '</h3>';
        html += '<p><strong>Mission:</strong> ' + lore.mission + '</p>';
        html += '<p><strong>Why it matters:</strong> ' + lore.stakes + '</p>';
        html += '<p><strong>Briefing:</strong> ' + lore.briefing + '</p>';
        html += '<h3>How Often You Do This</h3>';
        html += renderCadenceBlocks(lore.cadence);
        if (levelIndex === 0 || levelIndex === 8 || levelIndex === 9) {
            html += renderConfigPanel();
        }
        html += '<p class="story-teaser"><strong>Bonus Insight:</strong> ' + lore.bonus + '</p>';
        html += '<p class="story-teaser"><strong>Next Frontier:</strong> ' + lore.teaser + '</p>';
        html += '</section>';
        return html;
    }

    window.storyArc = {
        mentor,
        prologue,
        lessonLore,
        getLessonLore,
        getGuideBrief,
        getTransitionText,
        renderStoryPanel
    };
})();
