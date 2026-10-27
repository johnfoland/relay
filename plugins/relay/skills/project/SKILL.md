---
name: project
description: Shape work in a relay-workflow repo from an idea into settled design and an active project that relay:plan can cut into chunks, change settled design when the user asks for a design change, and close or abandon projects when their work is done. Use in a repo whose AGENTS.md has a "Relay workflow" section, for "relay:project", "start a project", "design this feature", "design change: …", "resume the active project", "activate P0002", "close the project", or when an idea spans more than one already-decided chunk. Not for a self-contained fix whose design is already settled and which fits one chunk; relay:plan cuts that directly.
---

# Design and run a project

You are the **project designer**. A project closes the gap between an idea and
the source material `relay:plan` needs: it settles the design in the
authoritative docs, records decisions in the decision log, and leaves an
ordered delivery plan with testable completion criteria. You do not write
product code and you do not cut chunk briefs; `relay:plan` and
`relay:execute` keep those jobs.

## Settings

This skill runs in a repo whose AGENTS.md has a **Relay workflow** section,
written by `relay:setup`. If there is none, stop and suggest running
`relay:setup` first. Read the section's settings before anything else. Below:

- `<integration>` is the **Integration branch**; planning changes reach it
  through a `plan/<slug>` pull request.
- **Authority** lists the docs that define the product's behavior, in order.
- **Releases** says whether the repo uses release-please, hand-cut releases,
  or neither; AGENTS.md's *Releases* section gives the details.
- **Issues** says whether the repo tracks ideas and follow-ups as GitHub
  issues.
- The status file, decision log, and projects directory are written at their
  default paths: `.relay/status.md`, `docs/decisions.md` (entries cited as
  `DEC-n`), and `.relay/projects/` (holding `index.md`, `template.md`, and one
  `P####-slug.md` per project). When the settings map any of them elsewhere,
  or give the decision log another ID prefix, use the mapped path and prefix.

The status file and the projects directory are local and git-ignored: one
copy, in the main working tree (the first path `git worktree list` prints),
whatever branch is checked out, edited in place and never committed. What a
project settles reaches the repository only through the tracked authority
docs and decision log. Tracked files, issue comments, and pull request titles
never cite a project ID, a chunk ID, or the project file: someone with only
the remote cannot follow them.

The invocation may carry an idea, an issue (`#21`), a project ID, or an
instruction such as `activate P0002`, `close P0002`,
`abandon P0002 because …`, or `design change: …` (§F). With none, resume the active project; if none is
active, resume the only non-terminal project in `shaping` or `ready`, or
report that there is no unambiguous project to resume.

## 0. Orient

1. Read AGENTS.md (usually already loaded), the docs index if **Authority**
   names one, the status file, and the projects index. Skim the decision log
   so decided entries are not reopened.
2. Read the selected project file top to bottom, if one exists. If the work
   starts from an issue, read it and its comments (`gh issue view <N>
   --comments`), and look for related open issues the project should absorb or
   explicitly leave out. Then read in full every authority doc its problem
   touches. Inspect code only to learn
   present behavior or estimate boundaries; code does not settle a design
   dispute with the docs.
3. Follow the repository's current branch and integration rules as AGENTS.md
   states them, even where an older doc describes a different procedure.

## A. Decide whether this earns a project

Open a project when the work has at least one of these properties: it needs two
or more independently reviewable chunks; it has design questions whose answers
must land in more than one authority doc; or it changes a behavior, contract,
or subsystem boundary that must be settled before an executor can work safely.
The ceremony prevents three concrete failures: design being invented inside a
chunk, dependent chunks disagreeing about the same rule, and the intended
outcome disappearing behind a sequence of implementation tasks.

Do **not** open one for a docs-only correction or for a self-contained,
already-designed fix that fits one focused chunk. Hand the latter to
`relay:plan` as a standalone maintenance chunk: set the **Next** block to
`relay:plan`, its Why naming the fix. If scoping reveals a real
design choice or a second chunk, promote it to a project before code begins. Do
not create a placeholder project merely to reserve an ID.

## B. Start or resume

For a new project:

1. Take the exact `Next project ID` from the projects index, increment that
   counter immediately, and never reuse an ID. Choose a short lowercase
   hyphenated slug.
2. Copy the projects template to `P####-<slug>.md` beside it. Replace every
   placeholder; no scaffold instruction may remain. Set its state to
   `shaping`, add its row to the index, and leave `Active project` unchanged.
3. State the problem and the observable outcome before listing work. Record
   explicit non-goals so an adjacent idea cannot quietly expand the project.
   Link the issues the project comes from or absorbs in its problem section,
   and comment on each with a short summary of the planned outcome (the
   project file is not in the repository, so do not link it), so the issue
   shows where the work went.

Several projects may be `shaping` or `ready`; exactly one may be `active`.
Resume by the ID given, otherwise by the rule under **Settings**. Never infer
that the newest file is the intended one.

## C. Settle the design

1. Turn every point an executor could reasonably implement two ways into a row
   in the project's **Design questions** table. Include ordering, data shape,
   defaults and validation, error and failure behavior, compatibility with
   existing users, data, and interfaces, and migration of existing state.
2. Resolve each question against the existing authority. A project record may
   hold investigation, alternatives, evidence, and the delivery plan, but it
   is **not** an authority for product behavior. Put a durable rule in the
   existing authority doc that owns it. Add a new top-level doc only when the
   subject is cohesive, will outlive this project, and no existing doc has a
   natural section for it. Add a new doc to **Authority** in AGENTS.md and to
   the docs index; if the *Releases* section lists a docs snapshot, add it to
   that list too, or the next release archives the docs without it. Do
   not split local notes into an unindexed shadow design tree: the project
   file is the one record.
3. Add a decision-log entry whenever the current authority genuinely leaves a
   choice and the answer changes behavior, a public contract, validation,
   stored or emitted data, or an implementation boundary two callers must
   share. Use the next unused ID after the greatest existing one, not merely
   the one after the last entry in the file (in a table-format log, put the
   row inside the table). Say when it was added (`Added YYYY-MM-DD`), never
   the project ID: the log is tracked. Update every doc
   that should carry the rule, and cite the decision there. For an
   intentional change to a decided entry, follow the decision log's reopening
   procedure; never allocate a replacement ID to disguise it. Purely local
   organization with no durable rule stays in the project record and needs no
   entry.
4. Fill **Authority changes** with the exact sections that now contain the
   design and why each changed. A `ready` project has no implementation rule
   that exists only in its own file.
5. Write the **Delivery plan** as ordered items (`D1`, `D2`, …), each with a
   concrete build result, authority citations, dependencies, and testable
   `Done when` evidence. Items express dependency and outcome; `relay:plan`
   decides how many fit comfortably in one chunk. Name compatibility and
   migration work where it belongs rather than leaving it for a final cleanup
   item.
6. Change `shaping` to `ready` only when every design question is resolved,
   every answer has graduated to authority, the delivery plan covers the
   outcome and completion criteria, and an executor would need to invent no
   rule. Record the readiness date and the decision-log range added, or
   `none`.

## D. Activate and hand off

Activation is a routing change, not a version promise. It is allowed only when
the project is `ready` and no other project is active. Set the project state
and its index row to `active`, and set the `Active project` line in the
projects index to its ID. When a shaping session reaches `ready` and no other
project is active, activate it in the same session unless the user explicitly
asked only for a draft.

Do not add a project field to the status file. Preserve its fixed **In flight**
block: `relay:plan` resolves the source through the active ID and writes the
resulting `P####-C##` chunk ID into the existing `Chunk` line. Do not set that
line to a project ID, and do not set `ready for an executor` before
`relay:plan` has written the chunk brief.

The handoff is the active project file plus its graduated authority changes.
Set the **Next** block to `relay:plan`, its Why naming the project and its
first delivery item not yet covered. `relay:plan` and `relay:review` record
every cut and review in the project's chunk ledger; `relay:execute` reads only
the exact chunk the status file names. A project left in `shaping` or `ready`
sets **Next** to `relay:project <ID>` instead, its Why saying what remains to
settle or why it is not active.

## E. Complete or abandon

A project completes only after every delivery item is covered by an accepted
chunk, every project-level completion criterion has evidence, and the status
file's In-flight block is `none` for that project. Then audit what the next
release will say about it:

- **Hand-cut releases:** every behavior-bearing commit should already have
  contributed an `[Unreleased]` entry. Add, consolidate, or correct entries so
  they describe the project's observable result without mentioning its
  machinery.
- **release-please:** read the squash commits of the project's accepted chunks
  on `<integration>`. Each type should fit its chunk's user-visible effect,
  with breaking changes marked. Correct a wrong one before the release pull
  request merges, by adding a `BEGIN_COMMIT_OVERRIDE` … `END_COMMIT_OVERRIDE`
  block to the merged pull request's body.
- **Neither:** skip the audit.

Record the entries or commits in **Closeout**, then derive the largest release
effect (`none`, `patch`, `minor`, or `major`) under the repo's versioning rules
(the *Releases* section names them; plain SemVer when it names none). This is
evidence for a future release decision, never a target version and never
permission to cut a release.

Set the project and its index row to `complete`, record the completion date and
accepted chunk IDs, and clear `Active project` to `—`. Close the issues the
project came from, each with a comment summarizing the outcome and naming the
pull requests that delivered it. The file and chunk ledger remain, locally, as
history.

`abandoned` is the other terminal state. Record why, which design changes (if
any) remain authoritative, and where unfinished work went (with **Issues** on,
into issues); clear the active pointer if this was the active project. Do not
abandon a chunk in `executing` or `awaiting review` to make the state look
tidy: finish or explicitly rework that chunk first.

After either, set the **Next** block to `—`, its Why saying the project
closed and nothing is queued. When the project leaves releasable changes
(entries under `[Unreleased]`, or an open release-please pull request), say so
and suggest `relay:release`; never cut the release yourself.

## F. Design change (when the user asks for one)

A design change alters something already settled: an authority section, a
decided decision-log entry, or a contract other code relies on. It is never
made inside a chunk.

1. Decide the scope. A change whose code migration fits one focused chunk is
   handled here directly; one that needs several chunks, or opens design
   questions of its own, becomes a project (§B) whose problem is the change.
2. Edit the authority docs first. Add or amend decision-log entries, following
   the log's reopening procedure for a decided entry: keep IDs stable, mark
   the change, and never allocate a replacement ID to disguise it. Update every
   doc that cites the changed rule; grep for the claim, not just the doc's
   name.
3. Schedule the code migration. With an active project the change belongs to,
   add it to that project's delivery plan, and record the changed sections in
   its *Authority changes* table. Otherwise it is a standalone maintenance
   chunk for `relay:plan`, whose brief cites the changed sections. If the
   change alters recorded outputs (golden files, snapshots, fixtures), the
   migration unit regenerates them and its commit explains the diff.
4. Land the doc changes as **Ending the session** describes, and set the
   **Next** block to `relay:plan`, its Why naming the change to migrate,
   unless a chunk is in flight: then leave **Next** as it is and add the
   migration to the status file's follow-ups, so it is cut after the open
   chunk is reviewed.

## Ending the session

Before finishing, re-read the index row, the project metadata, every changed
authority section, and any decision-log entry as one chain. Run the repository's
docs or link checks if it has them; this role does not run the gate for
docs-only work. Commit only the tracked design files in scope (authority docs,
the decision log, AGENTS.md, a docs index), and land them through a
`plan/<slug>` pull request into `<integration>`: wait for its CI, self-review
the diff, and squash-merge it. A session that changed only the project file
and the index has nothing to commit. Write the **Next** block last, once that
pull request has merged: a queued step says this session is done.

Report the project ID and state, the design decisions and decision-log entries
that landed, the authority sections changed, the next delivery item, and any
deliberate exclusion. Close with: *"In a fresh session at this repo, run
`relay:go` (next: `<the Next block's Run>`)."*
