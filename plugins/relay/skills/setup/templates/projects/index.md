# Projects

The registry for work larger than one already-designed chunk. A project turns
an idea into settled authority and an ordered delivery plan; `relay:plan`
turns that plan into chunk briefs, and `relay:execute` builds them. Like every
relay process file, this directory is local and git-ignored; what a project
settles reaches the repository through the authority docs and the decision
log.

The routing header has a fixed shape. `relay:project` owns both lines, and
`relay:plan` reads `Active project`.

- **Active project:** —
- **Next project ID:** P0001

| Project | State | File | Started | Finished | Outcome |
|---|---|---|---|---|---|

## 1. What a project is

A project is the durable record for one coherent outcome whose design or
delivery spans more than one chunk. It carries the problem, boundaries, design
questions, links to the authoritative rules those questions produced, an
ordered delivery plan, project-level completion evidence, and a ledger of the
chunks cut from it. It does not target a release version, and it is not itself
an authority for the product's behavior.

Projects prevent three failures: an executor inventing a contract inside a
chunk, adjacent chunks choosing different answers, and a list of
implementation tasks losing the outcome it was meant to produce. They do not
specify details: wording, layout, and internal structure are the executor's.

## 2. Files and identifiers

This directory has exactly three kinds of entry:

```text
index.md                  # this registry and the active-project pointer
template.md               # copied when a project starts
P####-short-slug.md       # one complete record per project
```

Evidence and alternatives stay in the project record. Do not create a project
subdirectory or a second local design note: that makes `relay:plan` guess
which file is current.

Project IDs are `P` plus a four-digit, monotonically increasing number,
starting at `P0001`, never reused, even for an abandoned project. The slug
makes filenames readable; the ID stays stable if the title changes. A chunk cut
from project `P0001` is `P0001-C01`, then `P0001-C02`, and so on, never reused
once a brief has existed; its units are `P0001-C01-a`, `P0001-C01-b`, ….

## 3. Lifecycle

| State | Meaning | May `relay:plan` cut from it? |
|---|---|---|
| `shaping` | The problem is accepted but design or delivery questions remain. | No. |
| `ready` | Design has graduated into authority and the ordered delivery plan is complete. | No; it must first be activated. |
| `active` | The sole source for new project chunks. | Yes. |
| `complete` | Every delivery item and completion criterion is evidenced by accepted chunks; changelog coverage was audited. | No; terminal. |
| `abandoned` | Work stopped deliberately, with the reason and surviving authority recorded. | No; terminal. |

Several projects may be shaping or ready; exactly one may be active.

## 4. How design becomes authority

The project file is a workbench, not an authority. Before a project becomes
ready, every contract an executor relies on must be in the authority doc that
owns the subject, with a decision-log entry where the maintainer ruled on a
choice that had real alternatives. The project's **Authority changes** table is an index of where
the answers landed, not the only place they are stated.

## 5. Quick changes and standalone maintenance chunks

A self-contained change whose design is already authoritative (a bug fix, a
tweak, a small feature) does not earn a project. One that one session can
finish is `relay:quick`'s: no brief, no ledger row. One that needs a fuller chunk, `relay:plan` cuts directly from an
explicit request, a recorded follow-up, or an open issue, as `FYYYYMMDD-NN`
with the next unused two-digit suffix for that date (a risky quick change that
goes to review takes an ID from the same sequence). Either stops and opens a project
when it finds an unresolved contract or a second chunk.
