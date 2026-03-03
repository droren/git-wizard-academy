// js/achievements.js
/**
 * Achievement Definitions for Git Wizard Academy
 */

const achievements = [
    { id: 'first_commit', icon: '🎯', name: 'First Blood', desc: 'Make your first commit', condition: function() { return window.gameState.commits >= 1; }},
    { id: 'five_commits', icon: '📝', name: "Writer's Block", desc: 'Make 5 commits', condition: function() { return window.gameState.commits >= 5; }},
    { id: 'ten_commits', icon: '✍️', name: 'Prolific Author', desc: 'Make 10 commits', condition: function() { return window.gameState.commits >= 10; }},
    { id: 'first_branch', icon: '🔀', name: 'Branch Out', desc: 'Create your first branch', condition: function() { return window.gameState.branches >= 2; }},
    { id: 'five_branches', icon: '🌳', name: 'Tree Hugger', desc: 'Create 5 branches', condition: function() { return window.gameState.branches >= 5; }},
    { id: 'first_merge', icon: '🤝', name: 'First Merge', desc: 'Complete your first merge', condition: function() { return window.gameState.merges >= 1; }},
    { id: 'five_merges', icon: '🔗', name: 'Merger Master', desc: 'Complete 5 merges', condition: function() { return window.gameState.merges >= 5; }},
    { id: 'first_conflict', icon: '⚔️', name: 'Battlefield Ready', desc: 'Face your first conflict', condition: function() { return window.gameState.conflicts >= 1; }},
    { id: 'conflict_crusher', icon: '💪', name: 'Conflict Crusher', desc: 'Resolve 5 conflicts', condition: function() { return window.gameState.conflicts >= 5; }},
    { id: 'first_stash', icon: '📦', name: 'Hoarder', desc: 'Stash your first changes', condition: function() { return localStorage.getItem('gwa_stash') === 'true'; }},
    { id: 'first_rebase', icon: '🔄', name: 'Time Traveler', desc: 'Perform your first rebase', condition: function() { return localStorage.getItem('gwa_rebase') === 'true'; }},
    { id: 'interactive_rebase', icon: '🎛️', name: 'Precision Artist', desc: 'Complete an interactive rebase', condition: function() { return localStorage.getItem('gwa_interactive_rebase') === 'true'; }},
    { id: 'first_cherrypick', icon: '🍒', name: 'Cherry Picker', desc: 'Cherry-pick your first commit', condition: function() { return localStorage.getItem('gwa_cherrypick') === 'true'; }},
    { id: 'first_tag', icon: '🏷️', name: 'Tag Team', desc: 'Create your first tag', condition: function() { return localStorage.getItem('gwa_tag') === 'true'; }},
    { id: 'first_recovery', icon: '🔧', name: 'Doctor Git', desc: 'Recover lost work with reflog', condition: function() { return localStorage.getItem('gwa_recovery') === 'true'; }},
    { id: 'all_levels', icon: '👑', name: 'Grand Wizard', desc: 'Complete all levels', condition: function() { return window.gameState.completedLevels.length >= 10; }},
    { id: 'streak_7', icon: '🔥', name: 'On Fire', desc: '7-day streak', condition: function() { return window.gameState.streak >= 7; }},
    { id: 'commands_100', icon: '⌨️', name: 'Keyboard Warrior', desc: 'Run 100 commands', condition: function() { return window.gameState.commandsUsed >= 100; }},
    { id: 'hint_free', icon: '💡', name: 'Independent', desc: 'Complete a level without hints', condition: function() { return localStorage.getItem('gwa_nohint') === 'true'; }},
    { id: 'speed_demon', icon: '⚡', name: 'Speed Demon', desc: 'Complete a level in under 2 minutes', condition: function() { return localStorage.getItem('gwa_speedrun') === 'true'; }},
    { id: 'perfect_level', icon: '💯', name: 'Perfectionist', desc: 'Complete a level with perfect execution', condition: function() { return localStorage.getItem('gwa_perfect') === 'true'; }}
];

// Export
window.achievements = achievements;