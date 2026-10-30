---
name: execute
description: Build the chunk in flight as the relay workflow's executor. With no argument it finds the chunk named in the repo's local status file (.relay/status.md by default); with an ID it runs that chunk's brief (.relay/chunks/<ID>.md). Opens the chunk branch and a draft pull request, reads the brief's kickoff notes and the review-checklist entries they name, builds each unit with tests at its boundaries, runs the repo's gate, adds changelog entries where the repo keeps them, commits and pushes per unit, asks the maintainer about any contract the docs leave open, writes the report into the chunk file and the pull request body, marks the pull request ready, and hands off to review. Use in a repo whose AGENTS.md has a "Relay workflow" section, for "relay:execute", "relay:execute P0002-C03", "execute the next chunk", "pick up the executor work", or "resume the chunk".
---

# Execute a chunk

You are the **executor**. The planner (`relay:plan`) has settled the
contracts the chunk touches and written down what to watch for. Your job is to
build what the brief says, decide the details it leaves open (wording, layout,
names, internal structure), prove the behavior with tests at its boundaries,
and report plainly.

## Settings

This skill runs in a repo whose AGENTS.md has a **Relay workflow** section,
written by `relay:setup`. If there is none, stop and suggest running
`relay:setup` first. Read the section's settings before anything else. Below:

- `<integration>` is the **Integration branch**, where chunk pull requests
  merge.
- `<gate>` is the **Gate** command (for example `make check`), which must pass
  before every unit commit. **Gate budget** is the time it should stay under.
- **Releases** says whether the repo uses release-please, hand-cut releases,
  or neither; AGENTS.md's *Releases* section gives the details.
- **Issues** says whether the repo tracks ideas and follow-ups as GitHub
  issues.
- The status file, chunk briefs, decision log, and review checklist are written
  at their default paths: `.relay/status.md`, `.relay/chunks/<ID>.md`,
  `docs/decisions.md` (entries cited as `DEC-n`), and
  `.relay/review-checklist.md`. When the settings map any of them elsewhere, or
  give the decision log another ID prefix, use the mapped path and prefix.

The process files under `.relay/` are local and git-ignored. There is one copy
of each, in the main working tree (the first path `git worktree list` prints),
whatever branch is checked out; edit them in place and never commit them. The
decision log is tracked. Tracked files (code, docs, the decision log, the
changelog, and the pull request title that reaches `<integration>`) never cite
a chunk ID, the brief, a review finding, or a checklist entry: cite the
authority section, the decision ID, the issue, or the pull request.

One chunk is one branch `chunk/<lowercase-id>` and one pull request into
`<integration>`. You never commit to `<integration>`, or to a separate release
branch, directly.

## 0. Find the chunk

The invocation may carry a chunk ID. First establish the state:

1. `git fetch origin`, then bring `<integration>` up to date
   (`git checkout <integration> && git pull --ff-only`). If that pull changed
   AGENTS.md, re-read it now: the copy loaded at the start of the session
   predates the pull, and a rule that just landed is the one most likely to be
   missed. Then look for an open pull request whose head is a `chunk/<id>`
   branch (`gh pr list --state open --base <integration>`). If one exists,
   check out that head branch. Read the **In flight** block of the status
   file; it is the same file on every branch. If it disagrees with what
   `gh pr list` and the branches show (a pull request it does not name, a
   branch that does not exist), say so and trust the remote for what exists.

The **In flight** block has exactly this shape:

```
## In flight

- **Chunk:** P0002-C03
- **State:** ready for an executor
- **Branch:** `chunk/p0002-c03`
- **Pull request:** `#42` (draft)
- **Units committed:** a, b
```

`State` is one of `ready for an executor`, `executing`, `awaiting review`,
`none`. `Branch`, `Pull request`, and `Units committed` are `—` until they have
a value; the pull request number carries `(draft)` or `(ready)`.

- **No argument:** the chunk is the one named there. Proceed if the state is
  `ready for an executor` or `executing`. If `awaiting review`, stop and say
  the chunk needs `relay:review` first (`relay:go` runs it). If `none`, stop: nothing is cut.
- **An argument:** use that ID. If it differs from the In-flight chunk, say
  so. Never run a chunk whose report already exists (`## Report` present in
  its file): that chunk is awaiting review. The exception is the rework case
  below, where the state is `executing` and a `## Review` below the report says
  **rework**. A `## Partial report` is not a `## Report`: it marks a chunk an
  earlier session stopped part-way, and means resume, not refuse.
- **State `executing`** means one of two things, and the chunk file says
  which:
  - **A resume.** An earlier executor session opened the chunk and did not
    finish. A `## Partial report` says where it stopped, but a session that
    ended abruptly writes none, so trust `Units committed` and the
    `chunk/<id>` branch's `git log --oneline` titles starting `<ID>-<letter>:`
    for which units are done. Resume from the next unit on that branch and say
    so in the report. A dirty working tree on that branch is the earlier
    session's unfinished unit: read the diff, keep what the brief asks for,
    finish that unit, and say so.
  - **A rework.** The file has a `## Report` and, below it, a `## Review`
    whose verdict is **rework**. Every unit is committed; the review's
    findings marked **blocking** are your whole work list, each naming its
    fix. Fix them on the same branch as one commit `<ID>-rework: <what>` (one
    per finding if they are independent), with the gate, a test that pins each
    fix, the gate line, and the changelog rule as for any unit. Append
    `### Rework` to the `## Report` and to the pull request body (date, commit
    SHAs, one line per finding on what changed), set `State` to
    `awaiting review`, and hand off exactly as in §5. The review then repeats
    on the rework diff.

Treat the chunk ID as opaque. Project chunks (`P####-C##`), standalone
maintenance chunks (`FYYYYMMDD-NN`), and any older scheme the repo used all
resolve to the same `.relay/chunks/<ID>.md` path and use the same state machine.
Do not infer work from the prefix or add fields to the In-flight block.

### Open the branch and the draft pull request

When the state is `ready for an executor` and no `chunk/<id>` branch or open
pull request exists yet:

1. Set up anything the **Environment** setting asks for.
   `git checkout <integration> && git pull --ff-only`. The gate must pass
   here; if it does not, stop and report it: that is a finding for the
   planner, not your bug to fix. Also look at the most recent CI result for
   `<integration>` (its latest run, or the last merged pull request's checks
   if pushes there run no CI). A CI failure the gate does not reproduce
   locally, such as a race, is inherited by your branch: name it in the pull
   request before your first unit rather than discovering it on your own CI.
2. Create `chunk/<lowercase-id>` from `<integration>` (`P0002-C03` →
   `chunk/p0002-c03`). A pull request needs a commit to open, so make an empty
   one (`git commit --allow-empty -m "<ID>: open chunk"`) and push the branch.
   In the status file, set `State` to `executing` and fill `Branch`.
3. Open a **draft** pull request into `<integration>`
   (`gh pr create --draft --base <integration>`), titled for what the chunk
   delivers, its body saying in a few lines what the chunk builds and carrying
   no design decision that is not already in the repo docs. Do not link the
   chunk file: it is not in the repository. Set the status file's
   `Pull request` to `#NN (draft)`. Unit work may now begin. If the repo's CI
   skips drafts (the **CI** setting says), your local gate is the only check
   until you mark the pull request ready, so never skip it.

The pipeline state is now visible to anyone who looks. The `chunk/<id>` branch
carries `<integration>`'s tree until unit `a` changes something: do not re-run
the gate before then.

## 1. Orient (do not skip)

1. Read AGENTS.md if it is not already loaded, then the brief
   `.relay/chunks/<ID>.md` top to bottom. Its **Kickoff notes** are the
   planner's distillation of what is tricky, what to read most carefully, and
   what the reviewer will check. Read them first and keep them in mind
   throughout. They name the review-checklist entries this chunk is most
   likely to trip; read each named entry and build so it does not apply.
2. Read every doc section the brief's **Read first** list names, in full, not
   skimmed. The brief cites sections by number; the code you write cites them
   too.
3. Be on the `chunk/<id>` branch, with `git status` clean unless §0's resume
   rule says the dirt is an unfinished unit. A branch freshly cut from
   `<integration>` has a tree the gate already passed, so do not re-run it
   before your first change. If you are **resuming**, the branch may be behind
   `<integration>`. Merge `<integration>` into it only if the branch would not
   otherwise pass CI, and run the gate after that merge. Never rebase: a chunk
   branch's history is never rewritten, so its `git log` stays the complete
   record the reviewer reads.
4. Note the brief's **Out of scope** list. You will not touch those.

## 2. Build, one unit at a time

For each remaining unit in the brief, in order:

1. Implement it against the cited doc sections. Prefer the shape the brief
   suggests; deviate only where the brief leaves it open, and say so in the
   report.
2. Test at the boundaries: the operations the unit adds or changes, the
   output contract a CLI or API promises, and a few end-to-end flows for
   user-facing work, enough to cover the unit's **Done when**. Do not pin
   every string, layout, or branch of a helper: a test that breaks when
   wording changes guards nothing anyone relies on. Never sleep for a fixed
   time in a test: wait for the condition or event, or drive a fake clock.
   Fixed sleeps are how timing tests turn flaky.
3. While the unit is coming together, check it with the narrowest thing that
   answers the question in front of you: a single test, one package's tests,
   one linter, one build. The gate is the gate, not the probe; a half-built
   unit cannot inform most of what it runs. Run it once the unit is built, and
   it must pass before you commit. Never narrow the gate itself: when CI does
   not run on drafts, this run is the only thing standing behind the commit's
   gate line. If the unit pushes the gate past **Gate budget**, make the new
   tests cheaper (fewer cases, no real waits) before you commit; if you
   cannot, say so in the report.
4. **Hand-cut releases:** if the unit touched a behavior-bearing path the
   *Releases* section lists, add a `- …` line under `## [Unreleased]` in the
   changelog describing the behavior change for its readers, not the chunk
   machinery. A hook may enforce this in some harnesses; apply the rule
   yourself either way. **release-please:** never edit the changelog or a
   version; the pull request title carries the change (§5).
5. Commit. The title comes from the unit
   (`P0002-C03-a: config loader — schema, defaults, validation`); the body says
   what and why and cites docs, and ends with the line `<gate>: green` (for
   example `make check: green`), stating that step 3 passed on this commit's
   tree. Otherwise follow the repo's commit-message rules; unit titles keep
   this form even under release-please, which reads only the squash commit.
   The changelog line rides in the same commit; the status file never does.
   The body cites doc sections and decision IDs, not the brief or a checklist
   entry. The reviewer checks for the gate line on every unit commit, so write
   it only when it is true.
6. Push the branch, record the SHA for the report, and update
   `Units committed` in the status file (e.g. `a, b`). A unit landed on top of
   a red predecessor is a violation even once the branch is green again, and
   because the branch's history is never rewritten it cannot be tidied away
   afterwards. If the gate or CI goes red after a push (a flake that passed
   once), the fix is the next commit, on its own, before any further unit
   work.

## 3. When the docs do not cover something

- **A detail** (wording, layout, a default nobody else relies on, internal
  structure): decide it, and list it under *Details decided* in the report.
  It needs no decision-log entry and no doc change: the code and its tests are
  its record.
- **A contract or a real choice** (an interface other code relies on, a
  stored or emitted format, a CLI's output, behavior a user would notice and
  might want otherwise): ask the maintainer with the harness's structured
  question tool, in terms of what they would see, leading with the option you
  recommend. Record the answer as a decision-log entry (the next unused ID;
  what was decided, the alternatives, and why; its origin as "Added
  YYYY-MM-DD in #NN", never the chunk ID), update the doc that should have
  said it, and cite the entry at the code site.
- **Never reopen a decided entry.** If a decision looks wrong, implement it as
  written and flag it under *Doc inconsistencies* in the report. The one
  exception is a decision that cannot be implemented as written: ask the
  maintainer, and flag it prominently.

## 4. Boundaries

- Only the units in the brief. Nothing from *Out of scope*, nothing from the
  next chunk, no "while I'm here" refactors outside the unit's files.
- A unit is the resume granularity. A session can end without warning, and
  everything after the last pushed unit commit then reaches the next session
  only as a dirty working tree. Keep a unit's work in its one commit and push
  as soon as it is green; never commit a half-built unit to save it.
- If blocked (a failing precondition, an unimplementable rule, a tool you
  cannot install), stop, commit and push what is green, make `Units committed`
  accurate, leave `State` as `executing`, and append a
  **`## Partial report`** to the chunk file. Not `## Report`: that means the
  chunk is done and makes a fresh `relay:execute` refuse the ID. Say exactly
  which unit you stopped at and why. A resumed session continues from
  `Units committed`. Set the **Next** block to `relay:execute`, its Why
  naming the unit you stopped at and what has to change first, so the next
  session's `relay:go` shows the blocker before resuming.

## 5. Report and hand off

Run the full verification the brief requires. Append the report below to the
chunk file (if an earlier session left a `## Partial report`, replace it).
Neither the report nor the status file is committed. Then, in order:

1. Settle the follow-ups you noticed and did not do. With **Issues** on, ask
   the maintainer once which to file (a multi-select question, each option a
   plain sentence), file those, grouping related ones into one issue, and put
   their numbers in the report's *Notes*. Without it, list them there;
   `relay:review` carries them to the status file.
2. Write the pull request body from the report
   (`gh pr edit <NN> --body-file …`). It is the chunk's only remote record, so
   it must stand alone. It opens with what changed for someone using the
   product, in plain language; then what the tests cover, details decided,
   decisions made (by decision ID), and doc inconsistencies found, with no
   link to or citation of the chunk file, the brief, or a checklist entry.
   If the brief names issues the chunk resolves, the body closes them
   (`Fixes #N`). Make sure the title names what the chunk delivered, without
   the chunk ID: it becomes the squash commit's subject on `<integration>`.
   Under
   release-please it is also a Conventional Commit whose type fits the whole
   chunk's user-visible effect: `feat(config): layered config loading`,
   `fix!: …` for a breaking change. A chunk with no
   user-visible effect is `refactor:`, `test:`, `docs:`, or `chore:`, and
   releases nothing on its own.
3. `gh pr ready <NN>`. In the status file, set `State` to `awaiting review`
   and the pull request's `(draft)` to `(ready)`, leaving `Branch` and
   `Pull request` in place.
4. If the repo has CI, wait for the pull request's run
   (`gh pr checks <NN> --watch`), in this turn rather than in the background:
   the handoff is not complete until the head commit is green, and a race the
   unit runs passed by luck can still fail here.
   If it is red, re-run it once (`gh run rerun <id> --failed`); a pass names a
   flake, with the failing test and the run id, under the report's *Notes*. A
   flake in a test this chunk wrote is fixed now, by removing its dependence
   on timing, not by loosening a timeout. A second red is fixed as its own
   commit, said so under *Notes* (in the chunk file and the pull request
   body), and waited on again.
5. Only now, with the head green, set the **Next** block to `relay:review`,
   its Why naming the chunk and its pull request. A queued step says this
   session is done, so it must not be written while CI can still send the
   chunk back.
6. End with the hand-off below.

```markdown
## Report

**Executed:** <date>. Branch `chunk/<id>`, pull request #NN. Commits: <sha>
<unit>, <sha> <unit>, …
<If resumed: "Resumed at unit <x>; units <…> were committed by an earlier session.">

### What changed
A few plain sentences: what someone using the product can now do, or what
works differently. Then one short paragraph per unit on what exists now, and
any deviation from the brief and why.

### Tested
Which boundaries the tests cover (operations, output contracts, end-to-end
flows), and how long the gate now takes.

### Details decided
What the brief left open and you chose: wording, layout, defaults, structure.
"None" if none.

### Decisions made
One line per decision-log entry added: ID — the decision — why. "None" if none.

### Doc inconsistencies found
Each with: what disagrees with what, what you did, and what the reviewer
should look at. "None" if none.

### Notes
Environment changes, flakes, anything unfinished, and follow-ups you noticed
and did not do.
```

A rework (§0) appends `### Rework` below *Notes* rather than rewriting any of
the above.

Be exact where it is checkable (SHAs, file paths, section numbers) and brief
everywhere else. The reviewer (`relay:review`) spot-checks claims against the
code, reviews the pull request on its branch, and performs the squash-merge
into `<integration>`.

### Hand-off

End with a few plain lines for the maintainer, before any IDs:

- **What changed:** the report's first sentences, in a user's terms.
- **Worth trying:** if the branch is worth trying before review, the command
  or action that shows it; otherwise "after it merges".
- **Next:** that the chunk waits for review, and anything waiting on the
  maintainer.

Then one line of references: the chunk ID, the pull request, any decision
IDs and issues filed. Close with: *"In a fresh
session at this repo, run `relay:go` (next: `relay:review`)."*
