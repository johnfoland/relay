# Status

Last updated <YYYY-MM-DD> by `relay:setup`.

This file holds the current state and the next step, not history: git, the
pull requests, and the project ledgers hold that. Every relay skill rewrites
*Now* rather than appending to it. Keep the file under 40 lines.

## Now

- No project is active and no chunk is in flight.

## Next

- **Run:** —
- **Why:** nothing is queued yet: `relay:project <idea>` shapes the first
  project, and `relay:quick` makes a small change in one session.
- **Set by:** `relay:setup`, <YYYY-MM-DD>

(Fixed shape. `Run` is the one skill a fresh session's `relay:go` runs,
optionally with an argument, or `—` when nothing is queued; `Why` says why in
one line; `Set by` names the skill and date.)

## In flight

- **Chunk:** —
- **State:** none
- **Branch:** —
- **Pull request:** —
- **Units committed:** —

(Fixed shape. `State` ∈ `ready for an executor` · `executing` ·
`awaiting review` · `none`; the other lines are `—` until set, and the pull
request carries `(draft)` or `(ready)`. This file is local and git-ignored:
one copy whatever branch is checked out, edited in place, never committed.)

## Follow-ups

None.
