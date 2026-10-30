---
name: review
description: Reviewer for the relay workflow. In a fresh session it reads the repo's local status file (.relay/status.md by default), reviews the pull request of the chunk (or risky quick change) awaiting review against the design docs and the review checklist, verifies the gate and CI evidence, records the review in the chunk file and on the pull request, fixes docs, and either sends the chunk back for rework or squash-merges it, updates the project's chunk ledger, keeps any tool or checklist entry the review earned, and tells the user in plain language what the chunk made newly worth trying. Use in a repo whose AGENTS.md has a "Relay workflow" section, for "relay:review", "review the executor's work", "review the chunk", or "re-review the rework".
---

# Review the chunk in flight

You are the **reviewer**. You review what executors built, against the design
docs and the review checklist, and decide whether it merges. You own the
design docs, the decision log, the review and brief checklists, and the
projects' chunk ledgers. You do not write product code: a code fix goes back to
the executor as a rework finding, or into a later chunk as a follow-up, so it
gets the executor's test discipline and a CI run. Your commits touch the
tracked docs (the authority docs and the decision log), AGENTS.md, and
`tools/`: the review aids of §C, which sit outside the gate and outside the
build, so they cannot affect a run. The process files (the status file, chunk
briefs, projects, and both checklists) you edit in place and never commit.
Cutting the next chunk is `relay:plan`'s job, in its own session.

## Settings

This skill runs in a repo whose AGENTS.md has a **Relay workflow** section,
written by `relay:setup`. If there is none, stop and suggest running
`relay:setup` first. Read the section's settings before anything else. Below:

- `<integration>` is the **Integration branch**, where chunk and planning pull
  requests merge.
- `<gate>` is the **Gate** command, which must pass before every unit commit.
  **Gate budget** is the time it should stay under.
- **Authority** lists the docs that define the product's behavior, in order.
  You cite them by section.
- **Review extras** lists repo-specific checks every review runs, if any.
- **Releases** says whether the repo uses release-please, hand-cut releases,
  or neither; AGENTS.md's *Releases* section gives the details.
- **Issues** says whether the repo tracks ideas and follow-ups as GitHub
  issues. With it on, a follow-up becomes an issue, labelled as the *Roadmap*
  section describes, once the maintainer agrees to file it (see **Ending the
  session**); without it, a line in the status file.
- The status file, chunk briefs, decision log, checklists, projects, and tools
  are written at their default paths: `.relay/status.md`,
  `.relay/chunks/<ID>.md`, `docs/decisions.md` (entries cited as `DEC-n`),
  `.relay/review-checklist.md`, `.relay/brief-checklist.md`,
  `.relay/projects/`, and `tools/`. When the settings map any of them
  elsewhere, or give the decision log another ID prefix, use the mapped path
  and prefix.

The process files under `.relay/` are local and git-ignored. There is one copy
of each, in the main working tree (the first path `git worktree list` prints),
whatever branch is checked out. The decision log and `tools/` are tracked.
Tracked files (code, docs, the decision log, the changelog, and the pull
request title that reaches `<integration>`) never cite a chunk ID, a brief, a
review finding, or a checklist entry: they cite the authority section, the
decision ID, the issue, or the pull request. Citations from before the process
files left git are history; leave them.

Work integrates into `<integration>` only through pull requests. One chunk is
one branch `chunk/<lowercase-id>` and one pull request into `<integration>`,
which you review on its branch and, on acceptance, squash-merge and delete.
Nobody rewrites a chunk branch's history, so its `git log` is its complete
record, a red push included. If the repo keeps a separate **Release branch**,
never merge into it: only `relay:release` moves it.

The invocation may carry a chunk ID. With none, review the chunk the status
file names.

## 0. Orient

1. Read AGENTS.md (usually already loaded), the docs index if **Authority**
   names one, the status file, and the projects index. Skim the decision log
   so its citations mean something.
2. `git fetch origin`, and be on `<integration>`
   (`git checkout <integration> && git pull --ff-only`). If that pull changed
   AGENTS.md, re-read it: the copy loaded at the start of the session predates
   the pull. Set up anything the **Environment** setting asks for. Look for an
   open pull request whose head is a `chunk/<id>` branch
   (`gh pr list --state open --base <integration>`). If one exists, check out
   that head branch. The status file is the same on every branch. If its
   **In flight** block disagrees with what `gh pr list` and the branches show
   (a pull request it does not name, a branch that does not exist), say so and
   trust the remote for what exists.
3. Read the **In flight** block. Review only when `State` is
   `awaiting review`. Otherwise there is nothing to review: say what the state
   is, and that `relay:go` runs the step it calls for. An `executing` chunk
   with a `## Partial report` is an executor that stopped part-way, not work
   awaiting review.
4. Read in full the authority docs the chunk's units cite. You will cite
   sections by number.

## A. Review

Read the chunk file's brief and report. A risky change from `relay:quick` has no
brief, only a goal, a *Why risky* line, and its report: review it against
those and the docs, and look hardest at what made it risky. On a re-review
after a **rework** verdict, read its `### Rework` too: the steps below then
run over the rework diff (`git diff <last reviewed head>...<branch>`) against
the blocking findings, and over the rest of the chunk only where the rework
touched it.
Then:

1. **Verify the ground truth.** Check out the chunk's `chunk/<id>` branch.
   `git log` the reported SHAs; `git diff <integration>...<branch>` for the
   whole chunk diff; run the gate on the branch; `gh pr checks <NN>` shows the
   pull request's CI green on its head commit. When the last push and the
   ready event land together, `gh pr checks` can show only a draft event's
   skipped run on that head; find the ready run in
   `gh run list --branch <branch>` and confirm its `headSha` with
   `gh run view`. A unit's own evidence is the `<gate>: green` line in its
   commit message. Check that every unit and rework commit carries it
   (`git log --format='%h %s%n%b' <integration>..<branch>`); a commit without
   it is a finding. Note how long the gate took: over **Gate budget** is a
   finding.
2. **Read every non-test source file in the diff, in full.** Skim the tests
   for the report's claims and spot-check two or three by reading the test
   body. Run anything cheap that would falsify a claim (a single target, a
   one-off test run). Check `tools/` first: a previous review may have left
   something that answers the question already. Delete the scratch files you
   create, unless §C says to keep one.
3. **Per unit, check against the docs:** does the code do what the cited
   sections say (ordering, formulas, validation, error behavior, the
   contracts other code relies on)? Does a test pin each *Done when* item? Run
   every check **Review extras** lists. Check the tests sit at the
   boundaries (operations, output contracts, a few end-to-end flows) and
   that none sleeps for a fixed time; a batch of tests pinning wording,
   layout, or helper branches is a finding, since it slows the gate and
   breaks on harmless changes. Then take the whole chunk diff through
   **every entry in the review checklist**: the catalogue of bug shapes a past
   review missed at least once, each with the finding that put it there. A
   finding that matches an entry cites it as `review-checklist §N`. When this
   review turns up a new *class* of bug rather than an instance, §C.3 says to
   add it there.
4. **Decisions:** every new decision-log entry records a choice with real
   alternatives that the maintainer ruled on; an entry for a detail, or a
   "clarified" add-on to an old entry, is a finding (move the detail to the
   pull request body). Each entry is well formed, the citing docs were
   updated (executors often skip this, so fix it yourself), the code cites
   it, and nothing reopened a decided entry. In a table-format log, a new
   row goes *inside* the table: a blank line before it silently ends the table
   and orphans the row. The same applies to a **rule doc edited without a
   decision entry**. Grep for the claim that changed, not just for the doc's
   name: another doc may still promise the old rule.
5. **Hygiene:** one commit per unit, the repo's commit-message rules, the
   chunk branch green, nothing out of scope, no unrelated refactors. Under
   hand-cut releases, every unit commit that touched a behavior-bearing path
   carries its changelog entry. Under release-please, nothing edited the
   changelog or a version, and the pull request title is a Conventional
   Commit whose type fits the whole chunk's user-visible effect, with a
   breaking change marked `!`: the title decides the next release. If
   AGENTS.md says the gate matches CI, check the equality in both directions:
   a new gate step needs its own CI step, and a new CI step must be reachable
   from the gate. Any prose that lists the gate's steps (AGENTS.md, the status
   file's environment notes) is maintained by hand too; update it in the
   review that accepts the new step. No new line in a tracked file cites a
   chunk ID, the brief, a review finding, or a checklist entry; the decision
   log names an entry's origin by date and pull request.
6. **Report accuracy:** are the claims true? Note any that are not. A test
   the report calls flaky is a finding, not noise: if it waits on time
   rather than on a condition, the fix is to make it wait on the condition.
7. **Read the report's *Doc inconsistencies found* as a finding source, not as
   noise.** An executor that implemented the doc rather than the brief, and
   said so, is usually right, and what it found is the planner's error, made
   when the chunk was cut. Check the claim against the code before accepting
   or rejecting it, then fix whichever side is actually wrong and say in the
   review which one it was. When the thing that was wrong is the brief, §C.3
   routes the class to the brief checklist.

Do not add extras by default: no mutation runs, no re-running the suite many
times or under load, no proving that the old code fails the new tests. Reach
for one only when a specific finding needs it to be settled, and say which.

Settle the follow-ups, the review's and any the report left unfiled. With
**Issues** on, ask the maintainer once which to file (a multi-select
question, each option a plain sentence), and file those, grouping related
ones into one issue; the rest are dropped unless the maintainer wants them on
the status file's list. Without it, they go on that list.

Write `## Review` into the chunk file. Then post it on the pull request
(`gh pr comment <NN> --body-file …`): that copy is the review's only remote
record, so it opens with a plain sentence or two on what the chunk does for
someone using the product, describes each finding in full, and drops the
chunk-file references and checklist entry numbers. With **Issues** on, both
copies give the numbers of the follow-ups filed.

```markdown
## Review

**Reviewed:** <date>. Verdict: **accept** | **accept with follow-ups** | **rework**.
Verified: <what you ran and read>.

### Findings
Numbered. Each: what, where (file:line or section, and the
`review-checklist §N` entry if it matches one), severity (blocking /
follow-up / note), and what happens to it (fixed in this review /
scheduled as <chunk>-<unit> / a follow-up: a status-file line, or issue #N
once filed).

### Doc fixes made in this review
Bullets, or "none".
```

## B. Act on the verdict

Tracked fixes (authority docs, the decision log, AGENTS.md, `tools/`) are
committed **on the chunk branch**, so they reach `<integration>` through the
one squash-merge. Process-file edits are made in place and never committed.

**Rework.** Fix any doc inconsistency directly; if that changed a tracked
file, commit it as `Review <ID>` and push. Set `State` back to `executing`. Do
not merge. The findings marked **blocking** are the executor's whole work list
(nothing else tells it what to do), so each names its fix and the test that
will pin it. `relay:execute` commits them as `<ID>-rework`, appends
`### Rework` to the report, and sets `awaiting review` again; the review then
repeats on the rework diff. Set the **Next** block to `relay:execute`, its Why
naming the chunk and the number of blocking findings.

**Accept, or accept with follow-ups.** Fix doc inconsistencies directly;
required **code** fixes are follow-ups. Run **C**, and commit what it and the
doc fixes changed in tracked files as `Review <ID>`, and push; with nothing
tracked changed there is no commit. Wait for the branch's CI on its head
(`gh pr checks <NN> --watch`), check that the pull request's title names what
the chunk delivered, without the chunk ID (it becomes the squash commit's
subject on `<integration>`), and squash-merge the pull request
(`gh pr merge <NN> --squash --delete-branch --body-file …`) with a commit body
of a few lines on what the chunk delivered, plus any `Fixes #N` or
`BREAKING CHANGE:` footer the pull request carries: GitHub's default body
lists the unit commits, whose titles carry the chunk ID. The run must be green
on the exact head you merge, not merely once: a race can pass one run and
fail the next. A red run you re-ran to green is a flake; make it a
follow-up so the next chunk can fix it. Then
`git checkout <integration> && git pull --ff-only`, and update the active
project's chunk ledger with the reviewed state, the pull-request number, and
the squash SHA on `<integration>` (`git log <integration> --oneline`). A change
from `relay:quick` has no ledger row.

Set the **In flight** block to `State: none`, with `Chunk`, `Branch`,
`Pull request`, and `Units committed` all `—`. Then set the **Next** block:

- `relay:plan` when the active project has delivery items no accepted chunk
  covers yet, or a follow-up from this review is due as the next chunk;
- `relay:quick <the follow-up>` when there is no active project and a
  follow-up one session can finish should come next;
- `relay:project` when the active project's last delivery item has just been
  accepted, so it can audit and close the project instead of anyone cutting
  an empty chunk;
- `—` when there is no active project (this was a standalone maintenance
  chunk), with a Why that says nothing is queued.

Do not cut the next chunk yourself.

## C. Keep what outlives the session

Ask what this session learned that the next one would otherwise rediscover.
Usually the answer is nothing; say so in the review either way.

1. **A verification tool.** A script you wrote to check a claim that would
   answer the same question next chunk goes to `tools/`, one file per tool.
   Its docstring says what it checks, what it does not, and how to run it. It
   fails loudly on anything it does not model, rather than skipping it.
2. **AGENTS.md and the relay skills.** If AGENTS.md was wrong or missing
   something, fix it now. If a relay skill was, do not edit an installed copy:
   tell the user in the hand-off what should change and why.
3. **The two checklists.** When a finding is a *class* rather than an
   instance, and it cost something real (a bug that reached users, a rework),
   add it in two or three lines: the shape to look for, and the finding that
   revealed it. A *code* mistake goes in the review checklist; a mistake in
   the *brief* (a decision that reached no unit, an instruction that
   contradicted itself) goes in the brief checklist. Keep each file under
   twenty entries: when one is full, merge similar entries or retire one the
   gate or a test now catches, leaving its number unused.

## Ending the session

The status file must let a fresh session resume with nothing but
`relay:go`: the In-flight and Next blocks in their exact shapes, the active
project's chunk ledger, and open follow-ups (or, with **Issues** on, a pointer
to them). It holds the current state and the next step, not history: git, the
pull requests, and the project ledger hold that. Rewrite its *Now* lines
rather than appending; keep it under 40 lines. Push and complete any
pull-request merge before you stop, so the remote matches what the status file
says.

### Hand-off

End with a few plain lines for the maintainer, before any IDs:

- **What changed:** after an accept, what someone using the product can now
  do, not which symbol landed or which section it implements. After a
  rework, what is wrong, in a user's terms, and what the executor will fix.
- **Worth trying:** after an accept, the exact command, config, or file that
  shows the new behavior, and what to watch for. Do not manufacture a demo:
  when the chunk exposed nothing a user can see, say so in one line.
- **Next:** what runs next, and anything waiting on the maintainer.

After those lines, when there is an active project, give the **project
map**: a table with one row per delivery item in its delivery plan, columns
`Item`, `What it is`, and `State`. *What it is* describes the item in plain
words, from the delivery plan; *State* is done, in progress (ready to build,
being built, or awaiting review), or not started, from the chunk ledger and
the In-flight block. Bold the row this session worked on. Skip the map when
there is no active project.

This note and the map are terminal output only. Then one line of references: the chunk ID,
the pull request and squash commit, any decision IDs and issues. Close with:
*"In a fresh session at this repo, run `relay:go` (next: `<the Next block's
Run>`)."*
