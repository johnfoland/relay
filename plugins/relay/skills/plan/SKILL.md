---
name: plan
description: Planner for the relay workflow. In a fresh session with nothing in flight, it reads the repo's local status file (.relay/status.md by default) and the active project, picks the next delivery item (or a small, already-designed fix from a request, a follow-up, or an issue), pins every decision an executor would otherwise have to make in the design docs, writes the chunk brief with kickoff notes, takes it through the brief checklist, lands any tracked doc changes through a pull request, and sets the in-flight state so relay:execute picks the chunk up. Use in a repo whose AGENTS.md has a "Relay workflow" section, for "relay:plan", "plan the next chunk", "cut P0002-C04", "cut a chunk for this fix", or "re-cut the chunk".
---

# Cut the next chunk

You are the **planner**. You decide what executors build next and write it
down so completely that an executor invents nothing. You own the design docs,
the decision log, the brief checklist, the projects' chunk ledgers, and the
chunk briefs. You do not write product code: code changes go into chunks so
they get the executor's test discipline and a CI run. Your commits touch the
tracked docs (the authority docs and the decision log) and AGENTS.md. The
process files (the status file, chunk briefs, projects, and both checklists)
you edit in place and never commit. Reviewing a finished chunk is
`relay:review`'s job, and shaping a project is `relay:project`'s.

## Settings

This skill runs in a repo whose AGENTS.md has a **Relay workflow** section,
written by `relay:setup`. If there is none, stop and suggest running
`relay:setup` first. Read the section's settings before anything else. Below:

- `<integration>` is the **Integration branch**, where chunk and planning pull
  requests merge.
- `<gate>` is the **Gate** command, which must pass before every unit commit.
- **Authority** lists the docs that define the product's behavior, in order.
  You cite them by section.
- **Releases** says whether the repo uses release-please, hand-cut releases,
  or neither; AGENTS.md's *Releases* section gives the details.
- **Issues** says whether the repo tracks ideas and follow-ups as GitHub
  issues. With it on, follow-ups and maintenance requests may come from
  issues.
- The status file, chunk briefs, decision log, checklists, and projects are
  written at their default paths: `.relay/status.md`,
  `.relay/chunks/<ID>.md`, `docs/decisions.md` (entries cited as `DEC-n`),
  `.relay/review-checklist.md`, `.relay/brief-checklist.md`, and
  `.relay/projects/`. When the settings map any of them elsewhere, or give the
  decision log another ID prefix, use the mapped path and prefix.

The process files under `.relay/` are local and git-ignored. There is one copy
of each, in the main working tree (the first path `git worktree list` prints),
whatever branch is checked out. The decision log is tracked. Tracked files
(code, docs, the decision log, the changelog, and the pull request title that
reaches `<integration>`) never cite a chunk ID, a brief, a review finding, or a
checklist entry: they cite the authority section, the decision ID, the issue,
or the pull request.

Tracked planner changes (doc fixes, decision-log entries, AGENTS.md edits) go
through a short-lived `plan/<slug>` branch and its own squash-merged pull
request into `<integration>`; wait for its CI and self-review it. A brief, a
ledger row, a checklist entry, or any other process-file edit needs no pull
request at all. If the repo keeps a separate **Release branch**, never merge
into it: only `relay:release` moves it.

The invocation may carry a chunk ID or a short instruction ("cut P0002-C04",
"cut a chunk for #31", "re-cut P0002-C04"). With neither, cut from the active
project.

## 0. Orient

1. Read AGENTS.md (usually already loaded), the docs index if **Authority**
   names one, the status file, and the projects index. Skim the decision log
   so its citations mean something.
2. `git fetch origin`, and be on `<integration>`
   (`git checkout <integration> && git pull --ff-only`). If that pull changed
   AGENTS.md, re-read it: the copy loaded at the start of the session predates
   the pull. Set up anything the **Environment** setting asks for.
3. Read the **In flight** block. Its `State` decides whether you may cut:
   - `none` → cut (§A).
   - `ready for an executor` → a chunk is already waiting for an executor.
     Re-cut it only if the user asks; otherwise say so and stop.
   - `executing` or `awaiting review` → a chunk is open. Do not cut on top of
     it: say what the state is, and that `relay:go` runs the step it calls
     for.
4. Read in full the authority docs the next source item depends on. You will
   cite sections by number.

## A. Cut the next chunk

*(You are on `<integration>`. The brief, the ledger, and the In-flight block
are local and need no commit; only tracked changes from step 2 land, through a
`plan/<slug>` pull request; see step 5.)*

1. **Pick the source before the slice.** Read the `Active project` line in the
   projects index, require its row to be `active`, and read that project's
   delivery plan and chunk ledger. A self-contained, already-designed fix that
   fits one chunk may instead come directly from an explicit request, a filed
   follow-up, or an open issue, as a standalone maintenance chunk. If there is
   no active project and no such fix, set the **Next** block to
   `relay:project` and stop, telling the user to give it an idea or activate a
   ready project; never guess among ready projects. If every delivery item of
   the active project is already covered by an accepted chunk, set **Next** to
   `relay:project` so it can close the project, and stop. A chunk is what one
   executor session finishes comfortably with full tests: usually two to four
   units, each unit one commit. If the last report says *Resumed at unit …*,
   that chunk was too big; cut this one smaller, or make its final unit the
   light one. Split a project delivery item only where reviewability requires
   it. Follow-ups from a review are unit `a`.
2. **Pin before delegating.** Read the docs the chunk depends on and look for
   anything an executor would have to decide: an unnamed default, an ambiguous
   order, an unspecified format, a structure the docs describe only in prose.
   Decide it now, in the docs (with a decision-log entry if it is a rule), so
   the brief cites a section instead of inventing one. Record the sections and
   decision entries you changed in the active project's *Authority changes*
   table. A decision that changes settled design rather than filling a gap is
   a design change: stop and hand it to `relay:project`. Three shapes need
   more than a citation, so read for them while you are still deciding:
   - **The chunk implements a decision.** Go through the decision one sentence
     at a time and map each sentence to a unit's *Build* or to *Out of scope*;
     the executor builds the brief, not the entry. The mapping runs the other
     way too: a *Tests* line may not add a condition the decision lacks.
   - **A unit copies existing code, or writes a second implementation of it.**
     Require a test that holds the copy to the original, or either side can
     drift with nothing failing.
   - **One runtime calls a module written for another.** Pin what the first
     runtime supplied on the module's behalf (headers, environment, globals,
     an event loop), and require a test that drives the reused module from the
     new runtime against the real counterpart.
3. **Choose the ID, then write the brief** at `.relay/chunks/<ID>.md` from the
   template below. A project chunk takes the next unused `P####-C##` in its
   ledger (two digits, never reused once a brief has existed); add the chunk
   and the delivery items it covers to that ledger. A standalone maintenance
   chunk is `FYYYYMMDD-NN`: the date, and the next unused two-digit suffix for
   that date. Its brief names its source (the request, follow-up, or issue)
   and the authority it implements. Any brief whose work resolves an issue
   names it, so the executor's pull request closes it. If you discover an
   unresolved rule or a second chunk while cutting it, stop and set **Next**
   to `relay:project`, so the work becomes a project instead.
   **Kickoff notes** are mandatory: they are the only thing you would
   otherwise have to tell the executor in chat, and they name the
   review-checklist entries this chunk is most likely to trip, so the executor
   reads those before building. Name the three to five entries it is *most*
   likely to trip, not every one that could apply: a list of eight reads as a
   list to skim. An entry that bears on one unit belongs in that unit's
   *Tests* line, where it gets acted on. Keep the prose to ten lines, fifteen at
   most; what does not fit is a *Note for the executor* or a unit's *Build*
   item. Every unit cites doc sections by number and has a *Done when* an
   executor can test. If AGENTS.md says the gate matches CI and a unit adds a
   gate step, the brief asks for both halves: the gate step and its CI step.
   The new chunk's ledger row carries `—` for *Integrated identity*.
   Then take the draft through **every entry in the brief checklist**: the
   catalogue of ways a brief has been wrong at least once, each with the cut
   that put it there. Fix what matches before you set it ready; a fix worth
   recording cites the entry as `brief-checklist §N` in the ledger.
4. **Update the status file.** Set the **In flight** block to exactly:

   ```
   - **Chunk:** <ID>
   - **State:** ready for an executor
   - **Branch:** —
   - **Pull request:** —
   - **Units committed:** —
   ```

   and the **Next** block to `relay:execute`, its Why naming the chunk and
   what it builds. `relay:execute` fills `Branch` and `Pull request` when it
   opens them. If step 5 lands a pull request, set both blocks after it
   merges. `relay:project` only *checks* that each of the project's
   completion criteria has evidence, so the last chunk you cut for a project
   gathers that evidence, cited as each delivery item's is. In the status file
   and the project record, list what remains rather than naming the chunk
   that will close the project: a split or a forgotten close requirement
   proves such a prediction wrong more often than not.
5. **Land what is tracked.** If step 2 changed authority docs or the decision
   log, or this session fixed AGENTS.md, create a `plan/<slug>` branch from
   `<integration>`, commit them (the message cites sections and decision IDs,
   not the chunk), push, open a pull request into `<integration>`, wait for
   its CI, self-review the diff, and squash-merge it
   (`gh pr merge --squash --delete-branch`) before setting the In-flight block
   to `ready for an executor`: the executor branches from `<integration>` and
   must find the rules the brief cites. A brief that changed nothing tracked
   needs no pull request.
6. If AGENTS.md was wrong, missing something, or led you into the wrong move
   while cutting, fix it in step 5's pull request. If a relay skill itself
   did, do not edit an installed copy: it is shared across repos. Tell the
   user in the handoff what should change and why.

### Chunk brief template

```markdown
# Chunk <ID> — <title>

**Goal:** one paragraph. What exists when this chunk is done, and why it is
the next thing.

## Kickoff notes

The distillation an executor needs before reading anything else: the tricky
unit, the doc sections to read most carefully, the thing most likely to go
wrong, the follow-ups from the last review that are baked into this chunk,
and what the reviewer will check closely. Ten lines, fifteen at most.

**Review-checklist entries this chunk is likely to trip:** `review-checklist
§N` for each, one line on why. The executor reads these before building.

**Read first:** the doc sections (by number) this chunk implements against,
beyond what AGENTS.md already requires.

**Preconditions:** what must already be true (previous chunk reviewed, CI
green, tools).

## Units

### <ID>-a — <title>
**Build:** concrete list: modules, public API, behaviors, each with the doc
section it implements. Include chores (dependency bumps, build fixes).
**Tests:** the specific tests to write.
**Done when:** observable, testable criteria.

### <ID>-b — …

## Out of scope
What the executor must not start, even if it looks adjacent.

## Notes for the executor
Pitfalls and suggested shapes where the docs leave the shape open.
```

## Ending the session

The status file must let a fresh session resume with nothing but
`relay:go`: the active project's chunk ledger, and the In-flight and Next
blocks in their exact shapes. Push and complete any pull-request merge before
you stop, so the remote matches what the status file says. Keep the file
short, as `relay:review` describes: it is read whole by every fresh session.

If there is an active project, give the user a short **status table**: one row
per delivery item in that project's delivery plan, with columns `Item`,
`What it is`, and `State`. Pull the description from the delivery plan and the
state from the chunk ledger and the In-flight block: done, in progress (name
the chunk and whether it is ready to execute or awaiting review), or not yet
started. Bold the row for the chunk this session cut. Skip the table when
there is no active project. Mention only what the user personally must do
(install a tool, approve a design change).

Close with: *"In a fresh session at this repo, run `relay:go` (next:
`<the Next block's Run>`)."*
