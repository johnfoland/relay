---
name: update
description: Bring a repository set up by an earlier relay up to date, or change its relay settings. Reads the repo's .agents/relay.toml stamp, finds what changed in what relay puts in a repository since that level (this skill's MIGRATIONS.md), asks which changes to apply, and lands them in one pull request. Also applies one named migration, takes up something put off or declined earlier, changes a setting in AGENTS.md's Relay workflow section, moves committed process files out of git, and upgrades a repo still set up for the older skills. Use in a repo whose AGENTS.md has a "Relay workflow" section, for "relay:update", "update the relay setup", "bring this repo up to date with relay", "apply migration 5", change a relay setting, stop committing the process files, or when relay:go says the repo has relay changes it has not reviewed.
---

# Update a repository's relay setup

This skill brings a repository up to what the installed relay offers. It does
not update the plugin itself: update that first, or there is nothing new to
offer.

## Settings

This skill runs in a repo whose AGENTS.md has a **Relay workflow** section,
written by `relay:setup`. If there is none, stop and suggest running
`relay:setup` first. Read the section's settings before anything else. Below:

- `<integration>` is the **Integration branch**.
- The status file is `.relay/status.md`, unless the settings map it elsewhere.
  It is local and git-ignored: one copy, in the main working tree (the first
  path `git worktree list` prints).
- "Setup's §N" is a section of `../setup/SKILL.md`, relative to this file. Read
  only the sections named. `templates/` paths are in setup's folder too
  (`../setup/templates/`).

## 0. Orient

Work out what was asked: a general update (§2), one named entry (§3), or a
setting (§4). Run §2 or §3 when no chunk is `executing` or `awaiting review`.

Whatever was asked, check whether git tracks any process files
(`git ls-files`), and whether the section or the process files still name the
older skills setup's §3 lists. Either one means the repo needs that migration:
follow setup's §3 first, on this skill's branch (§5), since the entries expect
the shape it leaves.

## 1. The stamp

`MIGRATIONS.md` beside this file lists, newest first, each change to what
`relay:setup` puts in a repository that repositories set up earlier may want:
how to tell whether a repository has it (**Detect**) and how to apply it
(**Apply**). The repository's stamp, `.agents/relay.toml`, records the highest
entry it has been reviewed against (`level`), the entries the maintainer put
off (`deferred`), and those they turned down (`[declined]`, with the reason).
A repository with no stamp is at level `0`. If a stamp of that name has a
different `source`, it belongs to another system: stop and tell the
maintainer.

## 2. Update to the current relay

1. **Collect what to offer:** every entry above `level`, the `deferred`
   ones, and every entry whose **Scope** is `local` (the stamp cannot vouch
   for the git-ignored `.relay/` files, which live on one machine). Leave out
   the declined ones, those whose **Detect** says the repository already has
   them, and those a remaining entry **Supersedes**. List the declined ones
   in one line, so the maintainer can name one to take it after all.
2. **Ask** with the harness's structured question tool which to apply: a
   multi-select, nothing preselected, each entry described by what it changes
   for the maintainer, with its number after. Then ask whether each one left
   unpicked is put off (asked again next time) or declined (with a reason).
3. **Check requirements.** An entry's **Requires** is met when the
   repository has it, it was picked, or a picked or present entry supersedes
   it; otherwise name it and ask whether to add it or drop the entry that
   needs it.
4. **Apply** the picked entries oldest first, each by its **Apply** line.
   They change docs, settings, and process files, never code or tests.
5. **Write the stamp** from `templates/relay.toml` if there is none: `level`
   becomes the highest entry, whatever was picked, since every entry up to it
   has now been reviewed; `deferred` and `[declined]` take this run's
   answers, and an entry that was applied or found present leaves both.
6. **Land it** (§5), titled as the repo's convention requires
   (`chore: update the relay setup to level <N>`). The body says what changed
   for the maintainer and the level the repo moved from and to.

## 3. One named entry

When the maintainer names one entry ("apply migration 5"), apply just that
one, remove it from `deferred` and `[declined]`, and leave `level` where it
is: the entries between have not been reviewed. Land it (§5).

## 4. Change a setting

Show the current settings and ask what should change. Setup's §1 says what
each setting holds and how to choose it, its §2 what a change means for the
rest of AGENTS.md, and its §4 how to write it, including adding hand-cut
releases. Its §5 covers repository settings, when a branch changes. Edit the
setting's value and leave the section's prose alone. Land it (§5), and leave
the stamp where it is. If the stamp is behind, say so in one line instead of
running §2.

## 5. Land it

Show the maintainer a summary of the changes. Unless they say otherwise, land
the tracked ones like any planner change: a `plan/relay-update` branch from
`<integration>`, one commit, a pull request (titled as the repo's convention
requires), CI, and a squash-merge. Process files are edited in place and never
committed. If the repo has no remote, or the maintainer wants it committed
directly, commit on the current branch and say so. Before committing, check
`git status --ignored .relay` shows `.relay/` as ignored and nothing under it
staged. After the merge, pull `<integration>` and confirm `.relay/` is intact.

## 6. Hand off

End with a few plain lines for the maintainer, before any IDs:

- **What changed:** what the relay will now do in this repo, in their terms,
  such as how much shorter the docs are and what was kept.
- **Worth trying:** the first thing to run, or "nothing visible to try" when
  there is none.
- **Next:** anything waiting on the maintainer, such as a repository setting.

Then the references: the settings changed, the files changed, where a
migration's archive is, anything moved out of retired local skills and where
it went, the stamp's level (from and to), and the pull request. When the
**Next** block queues a step, close with: *"In a fresh session at this repo,
run `relay:go`."*
