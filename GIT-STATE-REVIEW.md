# Git state review — 2026-07-27

Left here by the maintenance pass that ran after the OOM crash. **Nothing was
pushed and nothing was discarded.** Read this, then decide.

## 1. Uncommitted work in the tree (probably from the session that crashed)

```text
 M src/components/scene/acts/SolarAct.tsx
?? .automation-profile/
```

This is live work-in-progress on `feat/cosmic-r1-r2` (the cosmic WebGL build).
The VS Code window and the Claude Code process both died of out-of-memory at
~16:33 on 2026-07-27, so this may be a half-finished edit rather than a
deliberate stopping point.

**Do first:** `git diff src/components/scene/acts/SolarAct.tsx` and decide
whether it is a keeper. Then either commit it on the current branch or stash it.
`.automation-profile/` is untracked — check whether it belongs in `.gitignore`.

## 2. Stale local branches carrying commits that exist nowhere else

These are from April–May 2026, i.e. **not** from an active session. They will be
lost if this disk dies.

| Branch | State | Note |
|---|---|---|
| `master` | ahead of `origin/master` by 15 | biggest exposure |
| `pr-16` | no upstream, tip `2b05d07` | 6 commits unique to this machine |
| `refactor/service-pages-ux` | no upstream, tip `6ddc5a7` | never pushed |
| `fix/build-usePathname-import` | ahead 1 | |

The 6 unique commits are RTL/mobile fixes and a clickable project-preview
feature (2026-04-30 → 2026-05-17). Some of that work may already have been
redone on later branches — check before merging anything.

**Suggested order:**
1. `git push origin master` — if `origin/master` has not diverged, this alone
   removes most of the risk.
2. `git push origin pr-16 refactor/service-pages-ux` — cheap insurance, even if
   the branches are later deleted. A pushed branch costs nothing.
3. Only then decide what to merge or delete.

## 3. Also worth knowing

- `D:\Projects\ממצפן פוליטי` and `D:\Projects\political-compass-il` are two
  working copies of the **same** remote that have diverged badly:
  149 behind / 140 ahead. One of them is going to lose work when you finally
  reconcile them. Deal with that deliberately, not by accident.
- `D:\Projects\YAAR_HAD` has **no git remote**, but a `yaar-ad` repo exists on
  GitHub under Bobikobi. The local folder was modified 2026-07-26. Either it was
  never wired up, or the remote was removed. 151 MB of source with no backup.

## 4. Why this file exists instead of a push

You asked not to push anything that might belong to another live session. It
doesn't — but the dirty working tree does, so the whole thing was left alone.

Delete this file once you have acted on it.
