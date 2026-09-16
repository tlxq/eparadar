---
name: eparadar-ship-branch
description: Branch-per-change and PR habit for eparadar. Use whenever starting a new unit of work (feature, fix, chore) in this repo, before making the first edit.
---

# eparadar-ship-branch

Every unit of work in eparadar gets its own branch and PR — this gives a real diff to review and
a rollback boundary, instead of every change landing straight on `master`. This does **not**
change who commits: the user makes every `git commit` themselves; never run `git commit` in this
repo unless explicitly asked in the moment.

## Steps

1. Before the first edit for a new unit of work, create a branch off `master`:
   `git checkout -b <type>/<short-description>` — prefix with `feat/`, `fix/`, or `chore/`
   depending on what the work actually is.
2. Make the edits.
3. Stop and describe the changes; let the user run `git commit` themselves.
4. Once committed, push and open a PR: `git push -u origin <branch>` then `gh pr create`.
5. Check CI on the PR (`gh pr checks`) before considering the unit of work done — an open PR
   with failing checks isn't finished.

## When not to branch

Trivial one-line fixes explicitly requested as a quick fix, or read-only investigation work, can
skip this — use judgment. When in doubt, branch; it costs almost nothing and keeps `master`
clean.
