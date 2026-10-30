# The brief checklist

Ways a chunk *brief* has been wrong that cost something real, kept so the
next cut looks for them by default. Each entry is a *shape*, not a rule. The
division from the review checklist is by *when* the mistake is made: a defect
in the code belongs there, a defect in the brief the planner wrote belongs
here.

**How it is used.** `relay:plan` takes each draft brief through every entry
here before setting it ready for an executor. A fix that matches an entry
cites it as `brief-checklist §N` in the review or the chunk ledger, never in a
tracked file: like every relay process file, this one is local and
git-ignored. `relay:execute` does not read it.

**How it grows.** When a review finds that the *brief* was wrong rather than
the code (a decision that reached no unit, an instruction that contradicted
itself), `relay:review` adds it here in two or three lines: the shape, and
the finding that revealed it. The file stays under twenty entries: when it is
full, merge similar entries or retire one that no longer applies, leaving its
number unused.

---

## The catalogue

None yet.
