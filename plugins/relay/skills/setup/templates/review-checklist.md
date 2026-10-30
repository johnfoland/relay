# The review checklist

Classes of bug that cost something real (a bug that reached users, a rework)
and that a passing test suite did not catch, kept so the next review looks for
them by default. Each entry is a *shape*, not a rule: the authority docs
remain the authority on what the code must do.

**How it is used.** `relay:review` takes the whole chunk diff through every
entry here. A finding that matches an entry cites it as `review-checklist §N`
in the review, never in code or a tracked doc: like every relay process file,
this one is local and git-ignored. The chunk brief's *Kickoff notes* name the
two or three entries a chunk is most likely to trip, and the executor reads
those before building.

**How it grows.** `relay:review` adds an entry when a finding is a class
rather than an instance, in two or three lines: the shape, and the finding
that revealed it. The file stays under twenty entries: when it is full, merge
similar entries or retire one the gate or a test now catches, leaving its
number unused.

---

## The catalogue

None yet.
