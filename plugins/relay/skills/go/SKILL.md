---
name: go
description: Run the relay workflow's next step without having to remember which skill it is. Reads the Next block of the repo's local status file (.relay/status.md by default), checks it against the In-flight state and the remote, says what it is about to run and why, then runs that skill (relay:execute, relay:review, relay:plan, or relay:project) in this session. Asks the user when the recorded step and the repo disagree or nothing is queued, and only ever suggests relay:release. Use in a repo whose AGENTS.md has a "Relay workflow" section, for "relay:go", "go", "next step", "continue the relay", "what's next", or at the start of a fresh session in such a repo.
---

# Run the next step

The relay hands work between fresh sessions. Each relay skill ends by writing
the step that should follow into the status file's **Next** block; this skill
reads it and runs it, so a fresh session only ever needs `relay:go`.

You are a router. Decide which skill runs, then follow that skill; never carry
out a step from memory of what the skill says.

## Settings

This skill runs in a repo whose AGENTS.md has a **Relay workflow** section,
written by `relay:setup`. If there is none, stop and suggest running
`relay:setup` first. The status file is `.relay/status.md` and the projects
index `.relay/projects/index.md`, unless the settings map them elsewhere. Both
are local and git-ignored: one copy, in the main working tree (the first path
`git worktree list` prints).

## 1. Read the recorded step

Read the status file's **Next** block:

```
## Next

- **Run:** `relay:execute`
- **Why:** P0002-C03 is ready for an executor.
- **Set by:** `relay:plan`, 2026-10-10
```

`Run` is one skill, optionally followed by an argument (`relay:project P0003`),
or `—` when nothing is queued. A status file written before the Next block
existed has none: treat that as `—`, and the step below will infer it.

## 2. Check it against the repo

Read the **In flight** block and, when the step involves the projects, the
projects index. Then `git fetch origin` and, when the block names a pull
request, `gh pr view <NN> --json state,isDraft,headRefName`. The step the
state allows:

| In flight `State` | Allowed step |
|---|---|
| `ready for an executor`, `executing` | `relay:execute` |
| `awaiting review` | `relay:review` |
| `none`, with an active project that has delivery items not yet accepted | `relay:plan` |
| `none`, with an active project whose items are all accepted | `relay:project` (close it) |
| `none`, with no active project | `relay:project` or `relay:plan`, so ask |

The recorded step is **consistent** when it is the allowed step, or when
`State` is `none` and it names `relay:plan` or `relay:project` for a reason its
`Why` line gives. It is **stale** when the remote contradicts the In-flight
block: the named pull request is merged or closed while the block says
`executing` or `awaiting review`, or its branch does not exist.

- **Consistent:** run it.
- **`—`, and the table allows exactly one step:** run that step.
- **Inconsistent, stale, or `—` with more than one step allowed:** stop and
  ask the user with the harness's structured question tool, leading with the
  step the repo state supports, and showing what the Next block says and what
  the state says. With nothing queued, the options are `relay:project` with an
  idea, `relay:plan` with a small already-designed fix, and, when something is
  releasable (below), `relay:release`.

An argument given to this skill is passed on to the step it runs; when it
names a different skill (`relay:go review`), that is the user's choice: say
which step the status file recorded, then run the one they named.

## 3. Announce, then run

Say in one line what you are about to run and why, quoting the Why line, for
example: *Next: `relay:execute` (P0002-C03 is ready for an executor), from
the status file.* Then load that skill and follow it as if the user had
invoked it: through the harness's skill tool where it has one, otherwise by
reading `../<skill>/SKILL.md` beside this file. Pass on the argument from
`Run`, if any. That skill's own rules about fresh sessions, settings, and
handoffs apply in full, including the Next block it writes when it finishes.

## 4. Releases are suggested, never run

Never run `relay:release` from here: a release is the maintainer's decision.
When the step you ran (or the state you found) leaves nothing in flight, check
whether anything is releasable, and if so, say so in one line and suggest
`relay:release`:

- **Hand-cut releases:** the changelog's `[Unreleased]` section has entries.
- **release-please:** an open pull request carries the
  `autorelease: pending` label
  (`gh pr list --state open --label "autorelease: pending"`).
