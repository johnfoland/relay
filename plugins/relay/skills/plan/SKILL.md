---
name: plan
description: Planner for the relay workflow. In a fresh session with nothing in flight, it reads the repo's local status file (.relay/status.md by default) and the active project, picks the next delivery item (or an already-designed fix too big for relay:quick's one session), settles any contract or real choice the docs leave open, writes a short chunk brief with kickoff notes, takes it through the brief checklist, lands any tracked doc changes through a pull request, and sets the in-flight state so relay:execute picks the chunk up. Use in a repo whose AGENTS.md has a "Relay workflow" section, for "relay:plan", "plan the next chunk", "cut P0002-C04", "cut a chunk for this fix", or "re-cut the chunk".
---

# Cut the next chunk

You are the **planner**. You decide what executors build next and write down
what they must not get wrong: the contracts the chunk touches and the choices
already made. Details the docs leave open (wording, layout, names, internal
structure) are the executor's to decide and report. You own the design docs,
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
   delivery plan and chunk ledger. A self-contained, already-designed fix may
   instead come directly from an explicit request, a filed follow-up, or an
   open issue, as a standalone maintenance chunk, but only when one session
   cannot finish it: a change that fits one session is `relay:quick`'s, so set
   the **Next** block to `relay:quick`, its Why naming the change, and stop. If there is
   no active project and no such fix, set the **Next** block to
   `relay:project` and stop, telling the user to give it an idea or activate a
   ready project; never guess among ready projects. If every delivery item of
   the active project is already covered by an accepted chunk, set **Next** to
   `relay:project` so it can close the project, and stop. A chunk is what one
   executor session finishes comfortably with its tests: usually two to four
   units, each unit one commit. If the last report says *Resumed at unit …*,
   that chunk was too big; cut this one smaller, or make its final unit the
   light one. Split a project delivery item only where reviewability requires
   it. Follow-ups from a review are unit `a`.
2. **Settle contracts, not details.** Read the docs the chunk depends on and
   look for what two executors could build differently *and* someone would
   notice: an interface other code calls, a format stored or emitted, a CLI's
   output, compatibility with existing data or users, failure behavior a user
   sees. If one of those is open, it is a real choice: ask the maintainer, in
   terms of what they would see, and record the answer in the doc that owns
   it, with a decision-log entry when there were real alternatives. Record the
   sections you changed in the active project's *Authority changes* table.
   Leave everything else open: exact wording, layout, key bindings, internal
   structure, helper names. The executor decides those, reports them in the
   pull request, and the code and its tests are their record. Do not add a
   "clarified" paragraph to a decision entry to settle a detail. A choice that
   changes settled design rather than filling a gap is a design change: stop
   and hand it to `relay:project`. When a unit writes a second implementation
   of existing code, or calls a module written for another runtime, require a
   test that drives both against each other.
3. **Choose the ID, then write the brief** at `.relay/chunks/<ID>.md` from the
   template below. A project chunk takes the next unused `P####-C##` in its
   ledger (two digits, never reused once a brief has existed); add the chunk
   and the delivery items it covers to that ledger. A standalone maintenance
   chunk is `FYYYYMMDD-NN`: the date, and the next unused two-digit suffix for
   that date. Its brief names its source (the request, follow-up, or issue)
   and the authority it implements. Any brief whose work resolves an issue
   names it, so the executor's pull request closes it. If you discover an
   unresolved contract or a second chunk while cutting it, stop and set
   **Next** to `relay:project`, so the work becomes a project instead.
   **Keep the brief short: under 80 lines.** It cites doc sections rather than
   restating them, and it does not specify details the executor may choose. A
   brief running longer is restating the docs or writing the code in prose;
   cut it. **Kickoff notes** are mandatory and at most ten lines: the tricky
   part, the sections to read most carefully, and the two or three
   review-checklist entries the chunk is most likely to trip. Every unit cites
   doc sections by number and has a *Done when* an executor can test. A
   unit's *Tests* line names the boundaries to test (the operations, the
   output contract, an end-to-end flow), not a list of cases. If AGENTS.md
   says the gate matches CI and a unit adds a gate step, the brief asks for
   both halves: the gate step and its CI step.
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

**Goal:** one paragraph, in plain language. What someone using the product
can do when this chunk is done, and why it is the next thing.

## Kickoff notes

At most ten lines: the tricky unit, the thing most likely to go wrong, the
follow-ups baked into this chunk, and `review-checklist §N` for the two or
three entries it is most likely to trip.

**Read first:** the doc sections (by number) this chunk implements against.

## Units

### <ID>-a — <title>
**Build:** the behavior and the contracts it must meet, each with the doc
section it implements. Include chores (dependency bumps, build fixes).
**Tests:** the boundaries to test: the operations, the output contract, an
end-to-end flow.
**Done when:** observable, testable criteria.

### <ID>-b — …

## Out of scope
What the executor must not start, even if it looks adjacent.
```

The executor decides what the brief leaves open. Do not add sections for UI
text, layouts, or helper shapes.

## Ending the session

The status file must let a fresh session resume with nothing but
`relay:go`: the active project's chunk ledger, and the In-flight and Next
blocks in their exact shapes. Push and complete any pull-request merge before
you stop, so the remote matches what the status file says. The status file
holds the current state and the next step, not history: rewrite its *Now*
lines rather than appending to them.

### Hand-off

End with a few plain lines for the maintainer, before any IDs:

- **What changed:** what the next chunk will let someone using the product
  do, and any choice you asked them to make or made in the docs.
- **Worth trying:** nothing yet, since no code changed; say so in a few words.
- **Next:** what runs next, and anything waiting on the maintainer.

After those lines, when there is an active project, give the **project
map**: a table with one row per delivery item in its delivery plan, columns
`Item`, `What it is`, and `State`. *What it is* describes the item in plain
words, from the delivery plan; *State* is done, in progress (ready to build,
being built, or awaiting review), or not started, from the chunk ledger and
the In-flight block. Bold the row this session worked on. Skip the map when
there is no active project.

Then one line of references: the chunk ID, any planning pull request, any
decision IDs. Close with: *"In a fresh session at this repo, run `relay:go`
(next: `<the Next block's Run>`)."*
