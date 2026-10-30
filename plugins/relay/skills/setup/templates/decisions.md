# Decisions

Settled questions, so they aren't reopened by accident. Each entry says what
was decided and why, and is cited from the docs and the code as `(DEC-n)`.

- An entry is a choice that had real alternatives and that the maintainer
  ruled on. Implementation details (wording, layout, internal structure) are
  not entries: the code and its tests record them.
- Add new entries at the end, numbered one past the greatest existing ID,
  with the month they were settled.
- To change one, discuss it first, then edit the entry in place (don't delete
  it) and add one line: "Changed YYYY-MM: … because …". Update every doc and
  code site that cites it. Never give a changed decision a new ID, and never
  append "clarified" paragraphs: if the wording was unclear, fix the wording.

Each entry has this shape:

```markdown
## DEC-1: <short title> (YYYY-MM)

What was decided and why, in a paragraph or two: the alternatives it rules
out and the reason they lost.

*Where:* the docs that carry the rule, if any.
```

No entries yet.
