---
stamp: 1
system: relay
source: https://github.com/johnfoland/relay
---

# relay migrations

Each entry is a change to what `relay:setup` puts in a repository that
repositories set up earlier may want. A repository records the highest entry
it has been reviewed against in its stamp, `.agents/relay.toml`, and
`relay:setup`'s update (§7) offers the entries after it.

A change to the relay that existing repositories should pick up (a template,
a setting, the shape of a process file, what the docs should hold) adds an
entry here with the next number, newest first. A change only to how a skill
runs does not. Each entry has a **Detect** line (how to tell whether the
repository already has it) and an **Apply** line (how to bring it up to it),
and may name what it **Requires**, what it **Supersedes**, and its **Scope**:
`local` when it changes the git-ignored files under `.relay/`, which the
stamp cannot vouch for, so they are checked on every update.

## 6: Design docs hold contracts, not specs

- **Since:** relay 0.7.0
- **Detect:** no authority doc reads as a spec: no exact UI strings, screen
  layouts, key or cursor rules, or step-by-step UI behavior beyond the
  contract they serve, and no finished delivery-stage plan. A doc over about
  a thousand lines almost always fails this.
- **Apply:** one doc at a time, with the maintainer's go-ahead for each.
  First measure it and say in outcome terms what would go ("the design doc
  drops from about 4,700 lines to about 600: the contracts stay, screen
  layouts and exact wording go, since the code and tests record them"). Keep
  the contracts (interfaces between parts, stored and emitted formats, a
  CLI's output, compatibility and migration rules, failure behavior a user
  sees) and the reasoning behind real choices; remove what the code and its
  tests record. Fold a finished delivery-stage plan into the doc that
  describes current behavior, keeping its contracts only, and remove the
  plan; git history keeps the original. Keep section numbers that code or
  the decision log cites, or update those citations in the same change. Do
  not touch code or tests: if the gate is over its budget or timing tests
  are flaky, offer a project or a `relay:quick` for that instead.

## 5: Decision-log entries are choices the maintainer made

- **Since:** relay 0.7.0
- **Detect:** the decision log's header says an entry is a choice with real
  alternatives that the maintainer ruled on, and changes are recorded as one
  "Changed YYYY-MM: … because …" line; no entry carries "Clarified on" or
  "Amended on" add-ons.
- **Apply:** bring the header's rules in line with `templates/decisions.md`.
  Never delete an entry or reuse an ID: code cites them. Fold each entry's
  "Clarified on" and "Amended on" add-ons into its current wording, keeping
  one "Changed YYYY-MM: … because …" line where the decision really changed.
  Shrink an entry that records an implementation detail rather than a choice
  the maintainer made to one line: "Retired YYYY-MM: an implementation
  detail; the code and its tests record it." Show the maintainer the list of
  entries to retire before retiring them.

## 4: Short checklists and the current process-file text

- **Scope:** local
- **Since:** relay 0.7.0
- **Detect:** each checklist has at most twenty entries of two or three
  lines, and the checklists' and the projects index's explanatory text
  matches the templates (they mention twenty entries and `relay:quick`).
- **Apply:** cut each checklist to its twenty most useful entries, each the
  shape and its provenance in two or three lines; merge near-duplicates and
  retire entries the gate or a test now catches, leaving their numbers
  unused. Replace the explanatory text of both checklists and the projects
  index (§1, §4, §5) with the templates', and the project template's *Design
  questions* paragraph with the template's.

## 3: The status file holds the present

- **Scope:** local
- **Since:** relay 0.7.0
- **Detect:** the status file has a *Now* section and *Follow-ups*, and no
  *Where this stands*, *Last review*, or *Decisions by chunk*.
- **Apply:** rewrite it to `templates/status.md`'s shape: *Now* is the
  current state in at most three lines; the *Next* and *In flight* blocks
  keep their values; open follow-ups move to *Follow-ups*; the history goes,
  since git, the pull requests, and the project ledgers hold it.

## 2: The relay section names `relay:quick`, a gate budget, and risky changes

- **Since:** relay 0.7.0
- **Detect:** the `## Relay workflow` section lists `relay:quick` and has
  **Gate budget** and **Risky changes** settings.
- **Apply:** ask the maintainer for the gate budget (offer the gate's
  current time, rounded up) and for any risky areas beyond the defaults
  (stored data, job handling, work in progress, security, release
  machinery), then replace the section's prose from
  `templates/agents-section.md`, keeping every existing setting's value and
  adding the two new ones. If the gate is already over the budget the
  maintainer chose, say so and offer a project or a `relay:quick` to bring it
  down.

## 1: Baseline

Everything `relay:setup` put in a repository before migrations existed
(relay 0.6 and earlier). Nothing to apply: a repository with no stamp starts
its review at the entries that follow.
