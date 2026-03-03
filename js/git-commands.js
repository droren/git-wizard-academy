// js/git-commands.js
/**
 * Git Commands for Git Wizard Academy
 * Implements basic Git functionality
 */

const gitCommands = {};

gitCommands.help = function(args) {
    const cmd = args[0];
    
    if (cmd) {
        const helpText = {
            init: `git-init(1)                        Git Manual                        git-init(1)

NAME
       git init - Create an empty Git repository

SYNOPSIS
       git init [-q | --quiet] [--bare]

DESCRIPTION
       This command creates an empty Git repository.`,
            
            add: `git-add(1)                      Git Manual                      git-add(1)

NAME
       git-add - Add file contents to the index

SYNOPSIS
       git add [-n] [-v] [--force | -u] [-A] [--] <pathspec>...

DESCRIPTION
       Updates the index using the current found in the working tree.`,
            
            commit: `git-commit(1)                    Git Manual                    git-commit(1)

NAME
       git-commit - Record changes to the repository

SYNOPSIS
       git commit [-a | --interactive | --patch] [-s] [-v] [-m <msg>]

DESCRIPTION
       Record changes to the repository.`,
            
            status: `git-status(1)                   Git Manual                   git-status(1)

NAME
       git-status - Show the working tree status

SYNOPSIS
       git status [<options>] [--] <pathspec>...

DESCRIPTION
       Displays paths that have differences between the index file and the
       current HEAD commit.`,
            
            log: `git-log(1)                       Git Manual                       git-log(1)

NAME
       git-log - Show commit logs

SYNOPSIS
       git log [<options>] [<revision range>]`,
            
            branch: `git-branch(1)                   Git Manual                   git-branch(1)

NAME
       git-branch - List, create, or delete branches

SYNOPSIS
       git branch [--color[=<when>] | --no-color] [-v]

DESCRIPTION
       List, create, or delete branches.`,
            
            checkout: `git-checkout(1)                Git Manual                git-checkout(1)

NAME
       git-checkout - Switch branches or restore working tree files

SYNOPSIS
       git checkout [<options>] <branch> [<commit>]`,
            
            merge: `git-merge(1)                    Git Manual                    git-merge(1)

NAME
       git-merge - Join two or more development histories

SYNOPSIS
       git merge [--edit | --no-edit] [-n] [--stat]`,
            
            stash: `git-stash(1)                    Git Manual                    git-stash(1)

NAME
       git-stash - Stash the changes in a dirty working directory

SYNOPSIS
       git stash [list [<options>]]
       git stash pop [<stash>]`,
            
            rebase: `git-rebase(1)                   Git Manual                   git-rebase(1)

NAME
       git-rebase - Forward-port local commits to the updated upstream head

SYNOPSIS
       git rebase [-i | --interactive] [<options>]`,
            
            cherrypick: `git-cherry-pick(1)             Git Manual             git-cherry-pick(1)

NAME
       git-cherry-pick - Apply the changes introduced by some existing commits

SYNOPSIS
       git cherry-pick [--edit] [-n] [-x] <commit>...`,
            
            bisect: `git-bisect(1)                   Git Manual                   git-bisect(1)

NAME
       git-bisect - Find by binary search the change that introduced a bug

SYNOPSIS
       git bisect start
       git bisect good <commit>
       git bisect bad <commit>`,
            
            reflog: `git-reflog(1)                   Git Manual                   git-reflog(1)

NAME
       git-reflog - Manage reflog information

SYNOPSIS
       git reflog [<options>] [<action>]`,
            
            reset: `git-reset(1)                    Git Manual                    git-reset(1)

NAME
       git-reset - Reset current HEAD to the specified state

SYNOPSIS
       git reset [--soft | --mixed | --hard] [<commit>]`,
            
            tag: `git-tag(1)                       Git Manual                       git-tag(1)

NAME
       git-tag - Create, list, delete or verify a tag object

SYNOPSIS
       git tag [-a] [-m] <tagname> [<commit>]`
        };
        
        if (helpText[cmd]) {
            return { success: true, message: helpText[cmd], xp: 5 };
        } else {
            return { success: false, message: `git: '${cmd}' is not a git command. See 'git help'.` };
        }
    }
    
    return {
        success: true,
        message: `Git - the stupid content tracker

usage: git [--version] [--help] [-C <path>] [-c <name>=<value>]
           <command> [<args>]

Common commands:
   clone     Clone a repository
   init      Create an empty Git repository
   add       Add file contents to the index
   mv        Move or rename a file
   rm        Remove files from the working tree
   commit    Record changes to the repository
   branch    List, create, or delete branches
   checkout  Switch branches or restore working tree files
   merge     Join two or more development histories
   log       Show commit logs
   status    Show the working tree status
   push      Update remote refs
   pull      Fetch from and integrate with another repository

See 'git help <command>' for more information.`,
        xp: 5
    };
};

gitCommands.init = function(args) {
    const fs = window.fileSystemModule;
    const gitDir = fs.readFile('.git/config');
    
    // Check if already initialized
    if (gitDir && gitDir.content.includes('repositoryformatversion')) {
        return { success: false, message: 'fatal: reinitializing an existing Git repository', xp: 0 };
    }
    
    // Create .git structure
    fs.createFile('.git/config', '[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = false\n\tlogallrefupdates = true');
    fs.createFile('.git/HEAD', 'ref: refs/heads/main');
    fs.createDirectory('.git/refs');
    fs.createDirectory('.git/refs/heads');
    fs.createDirectory('.git/objects');
    fs.createDirectory('.git/objects/pack');
    fs.createDirectory('.git/objects/info');
    
    window.gameState.gitState.branches = ['main'];
    window.gameState.gitState.currentBranch = 'main';
    
    return { success: true, message: 'Initialized empty Git repository in .git/', xp: 25 };
};

gitCommands.config = function(args) {
    const nameArg = args.find(a => a.includes('user.name'));
    const emailArg = args.find(a => a.includes('user.email'));
    
    if (nameArg) {
        return { success: true, message: '', xp: 10 };
    }
    if (emailArg) {
        return { success: true, message: '', xp: 10 };
    }
    
    return { success: true, message: 'Configured user.name/user.email', xp: 5 };
};

gitCommands.status = function(args) {
    const fs = window.fileSystemModule;
    const files = fs.listDirectory('.').filter(f => f.name !== '.git');
    const staged = window.gameState.gitState.staged;
    
    let output = `On branch ${window.gameState.gitState.currentBranch}\n`;
    
    if (files.length === 0 && staged.length === 0) {
        output += '\nnothing to commit, working tree clean';
    } else {
        if (staged.length > 0) {
            output += '\nChanges to be committed:\n';
            staged.forEach(f => {
                output += `  \x1b[32mnew file:\x1b[0m   ${f}\n`;
            });
        }
        
        const untracked = files.filter(f => !staged.includes(f.name) && f.name !== '.git');
        if (untracked.length > 0) {
            output += '\nUntracked files:\n';
            untracked.forEach(f => {
                output += `  \x1b[31m??\x1b[0m ${f.name}\n`;
            });
        }
    }
    
    return { success: true, message: output.trim(), isRaw: true, xp: 5 };
};

gitCommands.add = function(args) {
    const fs = window.fileSystemModule;
    
    // No arguments = error
    if (args.length === 0) {
        return { success: false, message: 'Nothing specified, nothing added.', xp: 0 };
    }
    
    // Check if git repo exists
    const gitDir = fs.readFile('.git/config');
    if (!gitDir) {
        return { success: false, message: 'fatal: not a git repository (or any of the parent directories): .git', xp: 0 };
    }
    
    // Handle special cases: . (current directory), * (all files), -A, --all
    const addAll = args.includes('--all') || args.includes('-A') || args.includes('.') || args.includes('*');
    
    if (addAll) {
        // Add all files in current directory (but not .git)
        const allFiles = fs.listFiles('.').filter(f => f.name !== '.git');
        let added = 0;
        allFiles.forEach(f => {
            if (!window.gameState.gitState.staged.includes(f.name)) {
                window.gameState.gitState.staged.push(f.name);
                added++;
            }
        });
        return { success: true, message: `Added ${added} file(s)`, xp: 15 };
    }
    
    // Add specific files
    const files = args.filter(a => !a.startsWith('-'));
    let added = 0;
    
    files.forEach(f => {
        // Skip . and .. as they are directories, not files to add
        if (f === '.' || f === '..') {
            // Add all files instead
            const allFiles = fs.listFiles('.').filter(f => f.name !== '.git');
            allFiles.forEach(file => {
                if (!window.gameState.gitState.staged.includes(file.name)) {
                    window.gameState.gitState.staged.push(file.name);
                    added++;
                }
            });
            return;
        }
        
        if (fs.exists(f) && !window.gameState.gitState.staged.includes(f)) {
            window.gameState.gitState.staged.push(f);
            added++;
        }
    });
    
    if (added === 0 && files.length > 0) {
        return { success: false, message: 'Nothing to add, all files already staged or do not exist', xp: 0 };
    }
    
    return { success: true, message: `Added ${added} file(s)`, xp: 10 };
};

gitCommands.commit = function(args) {
    if (window.gameState.gitState.staged.length === 0 && !args.includes('--amend') && !args.includes('--allow-empty')) {
        return { success: false, message: 'nothing to commit (use "git add")', xp: 0 };
    }
    
    let message = 'Update';
    const msgIndex = args.findIndex(a => a === '-m');
    if (msgIndex !== -1 && args[msgIndex + 1]) {
        message = args[msgIndex + 1].replace(/^["']|["']$/g, '');
    }
    
    const newCommit = {
        message: message,
        author: 'You',
        files: [...window.gameState.gitState.staged],
        branch: window.gameState.gitState.currentBranch,
        date: new Date()
    };
    
    window.gameState.gitState.commits.push(newCommit);
    window.gameState.gitState.staged = [];
    window.gameState.commits++;
    
    // Notify game engine to check objectives
    if (window.gameEngine) {
        window.gameEngine.checkObjectives();
    }
    
    return { success: true, message: `[${window.gameState.gitState.currentBranch} ${window.gameState.gitState.commits.length}] ${message}`, xp: 35 };
};

gitCommands.log = function(args) {
    if (window.gameState.gitState.commits.length === 0) {
        return { success: true, message: 'fatal: your current branch does not have any commits yet', xp: 0 };
    }
    
    const oneline = args.includes('--oneline');
    const all = args.includes('--all');
    const graph = args.includes('--graph');
    
    let output = '';
    const commits = window.gameState.gitState.commits.slice().reverse();
    
    commits.forEach((commit, index) => {
        const shortHash = (index + 1).toString(16).padStart(7, '0');
        const branchTag = commit.branch !== 'main' ? ` (${commit.branch})` : '';
        
        if (oneline) {
            output += `${shortHash} ${commit.message}${branchTag}\n`;
        } else {
            output += `commit ${shortHash}${branchTag}\n`;
            output += `Author: ${commit.author}\n`;
            output += `Date:   ${commit.date ? commit.date.toLocaleString() : 'now'}\n\n`;
            output += `    ${commit.message}\n\n`;
        }
    });
    
    return { success: true, message: output, xp: 8 };
};

gitCommands.branch = function(args) {
    const createIndex = args.findIndex(a => a === '-c' || a === '--create');
    const deleteIndex = args.findIndex(a => a === '-d' || a === '--delete');
    const listOnly = args.length === 0 || args.includes('-a') || args.includes('-l');
    
    if (listOnly) {
        let output = '';
        window.gameState.gitState.branches.forEach(branch => {
            const prefix = branch === window.gameState.gitState.currentBranch ? '* ' : '  ';
            output += `${prefix}${branch}\n`;
        });
        return { success: true, message: output, xp: 5 };
    }
    
    if (createIndex !== -1 && args[createIndex + 1]) {
        const newBranch = args[createIndex + 1];
        if (window.gameState.gitState.branches.includes(newBranch)) {
            return { success: false, message: `fatal: A branch named '${newBranch}' already exists.`, xp: 0 };
        }
        window.gameState.gitState.branches.push(newBranch);
        window.gameState.branches++;
        return { success: true, message: `Branch '${newBranch}' created`, xp: 25 };
    }
    
    if (deleteIndex !== -1 && args[deleteIndex + 1]) {
        const toDelete = args[deleteIndex + 1];
        if (toDelete === 'main' || toDelete === window.gameState.gitState.currentBranch) {
            return { success: false, message: `error: Cannot delete branch '${toDelete}' checked out`, xp: 0 };
        }
        window.gameState.gitState.branches = window.gameState.gitState.branches.filter(b => b !== toDelete);
        return { success: true, message: `Deleted branch ${toDelete}`, xp: 20 };
    }
    
    return { success: true, message: 'usage: git branch [-c|--create] <branch> | [-d|--delete] <branch>', xp: 0 };
};

gitCommands.checkout = function(args) {
    const branchIndex = args.findIndex(a => !a.startsWith('-'));
    
    if (branchIndex !== -1) {
        const branch = args[branchIndex];
        const doubleDash = args.indexOf('--');
        
        if (doubleDash !== -1) {
            return { success: true, message: `Restored ${args.slice(doubleDash + 1).join(' ')}`, xp: 10 };
        }
        
        if (!window.gameState.gitState.branches.includes(branch)) {
            return { success: false, message: `error: pathspec '${branch}' did not match any file(s) known to git`, xp: 0 };
        }
        
        window.gameState.gitState.currentBranch = branch;
        return { success: true, message: `Switched to branch '${branch}'`, xp: 20 };
    }
    
    return { success: true, message: 'usage: git checkout <branch-name>', xp: 0 };
};

gitCommands.switch = function(args) {
    const createIndex = args.findIndex(a => a === '-c' || a === '--create');
    const branchIndex = args.findIndex(a => !a.startsWith('-'));
    
    if (createIndex !== -1 && args[createIndex + 1]) {
        const newBranch = args[createIndex + 1];
        if (window.gameState.gitState.branches.includes(newBranch)) {
            return { success: false, message: `fatal: A branch named '${newBranch}' already exists.`, xp: 0 };
        }
        window.gameState.gitState.branches.push(newBranch);
        window.gameState.gitState.currentBranch = newBranch;
        window.gameState.branches++;
        return { success: true, message: `Switched to a new branch '${newBranch}'`, xp: 25 };
    }
    
    if (branchIndex !== -1) {
        const branch = args[branchIndex];
        if (!window.gameState.gitState.branches.includes(branch)) {
            return { success: false, message: `error: branch '${branch}' not found`, xp: 0 };
        }
        window.gameState.gitState.currentBranch = branch;
        return { success: true, message: `Switched to branch '${branch}'`, xp: 20 };
    }
    
    return { success: true, message: 'usage: git switch [-c|--create] <branch>', xp: 0 };
};

gitCommands.merge = function(args) {
    if (args.length === 0) {
        return { success: false, message: 'Nothing to merge', xp: 0 };
    }
    
    const sourceBranch = args[0];
    if (sourceBranch === window.gameState.gitState.currentBranch) {
        return { success: false, message: 'Already up to date.', xp: 0 };
    }
    
    window.gameState.merges++;
    
    if (window.gameEngine) {
        window.gameEngine.checkObjectives();
    }
    
    return { success: true, message: `Merge made by the 'recursive' strategy.`, xp: 45 };
};

gitCommands.stash = function(args) {
    localStorage.setItem('gwa_stash', 'true');
    
    if (args.includes('save') || args.length === 0 || !args.some(a => a.startsWith('-'))) {
        return { success: true, message: 'Saved working directory changes', xp: 20 };
    }
    if (args.includes('list')) {
        return { success: true, message: 'stash@{0}: WIP on ...', xp: 5 };
    }
    if (args.includes('pop')) {
        return { success: true, message: 'Dropped refs/stash@{0} (restored files)', xp: 15 };
    }
    if (args.includes('drop')) {
        return { success: true, message: 'Dropped stash@{0}', xp: 10 };
    }
    
    return { success: true, message: '', xp: 0 };
};

gitCommands.tag = function(args) {
    if (args.length === 0) {
        return { success: true, message: 'No tags yet', xp: 0 };
    }
    
    const tagName = args[0];
    localStorage.setItem('gwa_tag', 'true');
    
    const annotateIndex = args.findIndex(a => a === '-a');
    const messageIndex = args.findIndex(a => a === '-m');
    
    if (annotateIndex !== -1 && messageIndex !== -1 && args[messageIndex + 1]) {
        return { success: true, message: `[ tagged ${tagName} ]`, xp: 30 };
    }
    
    return { success: true, message: `Tagged ${tagName}`, xp: 25 };
};

gitCommands.rebase = function(args) {
    localStorage.setItem('gwa_rebase', 'true');
    
    if (args.includes('-i') || args.includes('--interactive')) {
        localStorage.setItem('gwa_interactive_rebase', 'true');
        return { success: true, message: 'Successfully rebased and edited 3 commits\nDetached HEAD at', xp: 55 };
    }
    
    return { success: true, message: 'Successfully rebased', xp: 40 };
};

gitCommands.cherrypick = function(args) {
    localStorage.setItem('gwa_cherrypick', 'true');
    
    if (window.gameEngine) {
        window.gameEngine.checkObjectives();
    }
    
    return { success: true, message: '[cherry-pick] Applied commit', xp: 50 };
};

gitCommands.bisect = function(args) {
    if (args.includes('start')) {
        return { success: true, message: 'Bisect started. Good and bad commits needed.', xp: 10 };
    }
    if (args.includes('good') || args.includes('bad')) {
        return { success: true, message: 'Bisect: checking commits...', xp: 15 };
    }
    if (args.includes('run')) {
        return { success: true, message: 'Bisect complete! Found the culprit.', xp: 35 };
    }
    if (args.includes('reset')) {
        return { success: true, message: 'Bisect reset done', xp: 5 };
    }
    
    return { success: true, message: 'git bisect start | good <commit> | bad <commit> | run <script>', xp: 0 };
};

gitCommands.reflog = function(args) {
    localStorage.setItem('gwa_recovery', 'true');
    
    let output = '';
    window.gameState.gitState.commits.forEach((c, i) => {
        output += `${i+1} ${c.branch}: commit ${c.message}\n`;
    });
    
    return { success: true, message: output || 'No reflog entries', xp: 15 };
};

gitCommands.reset = function(args) {
    if (args.includes('--soft')) {
        return { success: true, message: 'HEAD is now at commit', xp: 15 };
    }
    if (args.includes('--hard')) {
        return { success: true, message: 'HEAD is now at commit', xp: 20 };
    }
    
    return { success: true, message: 'Unstaged changes', xp: 10 };
};

gitCommands.diff = function(args) {
    return { success: true, message: 'No differences to show', xp: 5 };
};

gitCommands.show = function(args) {
    if (window.gameState.gitState.commits.length === 0) {
        return { success: false, message: 'No commits to show', xp: 0 };
    }
    
    const commit = window.gameState.gitState.commits[window.gameState.gitState.commits.length - 1];
    return { success: true, message: `commit ${commit.branch}\n\n    ${commit.message}\n\n    Files: ${commit.files.join(', ')}`, xp: 10 };
};

gitCommands.remote = function(args) {
    if (args.length === 0 || args.includes('-v')) {
        return { success: true, message: 'origin  (fetch)\norigin  (push)', xp: 5 };
    }
    
    if (args.includes('add')) {
        return { success: true, message: '', xp: 10 };
    }
    
    return { success: true, message: '', xp: 0 };
};

gitCommands.fetch = function(args) {
    return { success: true, message: 'From /\n   a8949f9..3b2a0c5  main     -> origin/main', xp: 15 };
};

gitCommands.pull = function(args) {
    return { success: true, message: 'Updating a8949f9..3b2a0c5\nFast-forward\n file.txt | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)', xp: 25 };
};

gitCommands.push = function(args) {
    return { success: true, message: 'To /repo.git\n   a8949f9..3b2a0c5  main -> main', xp: 25 };
};

// Export for use in other modules
window.gitCommands = gitCommands;