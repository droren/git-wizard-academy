// js/story-arc.js
/**
 * Narrative arc woven through lessons.
 */

(function () {
    const prologue = {
        title: 'Chronicle of Broken Time',
        body: 'Before versioning, engineers copied files as final_final_REAL_v7. Systems drifted, fixes vanished, and operators drowned in endless outages. Ancient systems rose: RCS kept local history, CVS enabled sharing but fractured atomicity, and Subversion improved central order while still making branching costly. Then came Git: distributed history, cheap branches, cryptographic snapshots, and recoverable timelines. You are the Arc-Engineer chosen to prevent the Fracture Future: a world of untraceable bugs, irreversible deploys, and failing worlds.'
    };

    const lessonLore = {
        0: {
            title: 'Initiation at the Time Forge',
            mission: 'Bind your identity and create the first stable timeline.',
            stakes: 'Without identity and first commits, history has no witnesses.'
        },
        1: {
            title: 'The Three States of Matter',
            mission: 'Master working tree, index, and commit history.',
            stakes: 'Unchecked changes become ghost defects in production.'
        },
        2: {
            title: 'Branching the Multiverse',
            mission: 'Split timelines safely and reunite them through merges.',
            stakes: 'No branching means one risky line for every experiment.'
        },
        3: {
            title: 'War of Conflicting Realities',
            mission: 'Resolve divergent edits and restore continuity.',
            stakes: 'Unresolved conflicts cascade into total service collapse.'
        },
        4: {
            title: 'Vault of Frozen Work',
            mission: 'Stash interrupted work, tag stable milestones.',
            stakes: 'Without stashes and tags, context and releases are lost.'
        },
        5: {
            title: 'Shadow Rewrites',
            mission: 'Rebase timelines into clean, comprehensible history.',
            stakes: 'Chaotic history hides root causes and slows every rescue.'
        },
        6: {
            title: 'Reflog Catacombs',
            mission: 'Recover lost commits and reset safely.',
            stakes: 'When mistakes are irreversible, teams fear shipping.'
        },
        7: {
            title: 'Precision Arsenal',
            mission: 'Cherry-pick exact fixes and bisect hidden regressions.',
            stakes: 'Without precision tools, incidents drag on for days.'
        },
        8: {
            title: 'Reality Engineering',
            mission: 'Control dependencies, automation hooks, and aliases.',
            stakes: 'Manual toil and drift create unscalable, brittle systems.'
        },
        9: {
            title: 'The Dragon of Entropy',
            mission: 'Combine all Git disciplines to stabilize the world graph.',
            stakes: 'Failure means a future of permanent firefighting and outage chaos.'
        }
    };

    function renderStoryPanel(levelIndex) {
        const lore = lessonLore[levelIndex];
        if (!lore) return '';

        let html = '<section class="story-panel">';
        if (levelIndex === 0) {
            html += '<h2>🛰️ ' + prologue.title + '</h2>';
            html += '<p>' + prologue.body + '</p>';
        }
        html += '<h3>📜 Story Thread: ' + lore.title + '</h3>';
        html += '<p><strong>Mission:</strong> ' + lore.mission + '</p>';
        html += '<p><strong>Why it matters:</strong> ' + lore.stakes + '</p>';
        html += '</section>';
        return html;
    }

    window.storyArc = {
        prologue,
        lessonLore,
        renderStoryPanel
    };
})();
