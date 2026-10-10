# Status

Last updated <YYYY-MM-DD> by `relay:setup`.
Last review: none yet.

## Where this stands

- The relay workflow was set up on <YYYY-MM-DD>. No project is active and no
  chunk is in flight.

## Next

- **Run:** —
- **Why:** nothing is queued yet: `relay:project <idea>` shapes the first
  project, or `relay:plan` with a small, already-designed fix cuts one chunk.
- **Set by:** `relay:setup`, <YYYY-MM-DD>

(Fixed shape. `Run` is the one skill a fresh session's `relay:go` runs,
optionally with an argument, or `—` when nothing is queued; `Why` says why in
one line; `Set by` names the skill and date. Every relay skill rewrites this
block as it finishes.)

## In flight

- **Chunk:** —
- **State:** none
- **Branch:** —
- **Pull request:** —
- **Units committed:** —

(Fixed shape. `State` ∈ `ready for an executor` · `executing` ·
`awaiting review` · `none`; `Branch`, `Pull request`, and `Units committed` are
`—` until set; the pull request carries `(draft)` or `(ready)`.
`relay:execute` creates `chunk/<id>` from the integration branch, opens a
draft pull request, sets `executing`, updates `Units committed` per unit, and
sets `awaiting review` when its report lands; `relay:review` reviews that pull
request on its branch and squash-merges accepted work; `relay:plan` cuts the
next chunk. This file is local and git-ignored: there is one copy, whatever
branch is checked out, and every relay skill edits it in place without
committing it.)

## Follow-ups not yet scheduled

None.

## Decisions by chunk

None yet. One line per chunk: the decision-log IDs it added.
