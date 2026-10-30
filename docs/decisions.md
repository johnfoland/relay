# Decisions

Settled questions, so they aren't reopened by accident. Each entry says what
was decided and why, and is cited from the docs and the code as `(DEC-n)`.

- Add new entries at the end, numbered one past the greatest existing ID,
  with the month they were settled.
- To change one, discuss it first, then edit the entry in place (don't delete
  it): say what replaced it, when, and why, and update every doc and code site
  that cites it. Never give a changed decision a new ID.

## DEC-1: One plugin for both agents, from one Claude-format manifest (2026-10)

relay ships as a single plugin, `relay`, listed in
`.claude-plugin/marketplace.json` with its manifest at
`plugins/relay/.claude-plugin/plugin.json`. Claude Code reads that format
natively, and the Codex CLI installs it unchanged (tested with 0.162.1). A
second, Codex-native manifest was ruled out: it would be one more version
number for release-please to keep in step, with nothing Codex needs that the
Claude format lacks.

*Where:* README.md (Install), AGENTS.md (Layout).

## DEC-2: Bare skill names under the plugin's namespace (2026-10)

The skills are named `go`, `project`, `quick`, `plan`, `execute`, `review`,
`release`, and `setup`. Both agents prefix a plugin's skills with the plugin name, so
users type `/relay:go` in Claude Code and `$relay:go` in Codex, and a bare
`go` cannot collide with another plugin's or a standalone skill of the same
name (tested in both). Prefixed names (`relay-go`) were ruled out: inside the
plugin they read `relay:relay-go`, and they only help someone who copies the
skills out of the plugin, which is not a supported install. The skills refer to
one another as `relay:<skill>`, which reads correctly in both agents.

*Where:* README.md, AGENTS.md (Conventions).

## DEC-3: `relay:go` runs the step the status file records (2026-10)

Each skill ends by writing the step that should follow into the status file's
*Next* block (`Run`, `Why`, `Set by`). `relay:go` reads it, checks it against
the In-flight `State` and the chunk's pull request, says what it will run and
why, and runs it in the same session; it asks the user when the two disagree
or nothing is queued. Inferring the step from repository state alone was ruled
out as the primary source: the state cannot say why, and a recorded step can
carry an argument. Inference remains the check and the fallback for status
files written before the block existed.

*Where:* `skills/go/SKILL.md`, `skills/setup/templates/status.md`.

## DEC-4: `relay:go` never runs a release (2026-10)

A release is the maintainer's decision, so `relay:go` only says when something
is releasable and suggests `relay:release`. No skill writes `relay:release`
into the *Next* block.

*Where:* `skills/go/SKILL.md` §4.

## DEC-5: The planner/reviewer is two skills, one job per session (2026-10)

The former `relay-next` is split into `relay:review`, which reviews and merges
or sends back the chunk in flight, and `relay:plan`, which cuts the next
chunk. After an accepted review, `review` writes `Next: relay:plan` and
stops; it does not continue into planning in the same session. Each session
does one job and starts fresh, at the cost of `plan` re-reading the docs.
Design changes moved to `relay:project`, which already owns settled design.
Changed 2026-10: a small change now takes one `relay:quick` session that plans,
builds, and lands it, because three sessions for a one-function fix cost more
than they caught (DEC-9). Chunks keep one job per session.

*Where:* `skills/review/SKILL.md` §B, `skills/plan/SKILL.md`,
`skills/project/SKILL.md` §F.

## DEC-6: `relay:setup` stands alone (2026-10)

`relay:setup` creates the baseline the relay needs (AGENTS.md, a CLAUDE.md
that imports it, a decision log) and owns hand-cut releases, rather than
calling an instructions skill: users of a public plugin will not have one.
It detects release-please and a GitHub Issues roadmap but does not install
them; those are repository conventions outside the relay.

*Where:* `skills/setup/SKILL.md` §1 and §4.

## DEC-7: The prompt band is a separate, Claude Code-only plugin (2026-10)

The `[ /relay:go ]` button above the prompt is a Claude Code mod, shipped as
its own plugin, `relay-band`, in the same marketplace and at the same version
as `relay`. A mod is declared by a hooks config holding `modules`, and Codex
reads a plugin's hooks config too (at `hooks/hooks.json` or wherever
`plugin.json`'s `hooks` points) and warns `unknown field 'modules'` on every
session start (tested with 0.162.1); an inline `hooks` object in `plugin.json`
is not loaded by Claude Code. Putting the mod inside `relay` would therefore
cost every Codex user a warning, and a Codex-native manifest to hide it would
reverse DEC-1. The band shows only where `AGENTS.md` has a
`## Relay workflow` heading, the section every relay skill requires. It
offers `relay:go` before a conversation's first turn (a `/clear` starts a new
one). Since 2026-10 it also offers `/clear` once a turn has ended with an
answer (not interrupted, refused, or failed) and left a queued step in a
*Next* block that differs from the one the conversation started with: the
handoff is complete, and each relay step runs in a fresh session. A changed
block, rather than a write to the status file, is the signal because skills
also update the file mid-step. The band cannot see a turn's background work,
so the skills keep the signal honest instead: each writes the *Next* block
only once its step is done, after any CI it waits on is green.

*Where:* `plugins/relay-band/`, README.md (Install), AGENTS.md (Layout),
`release-please-config.json`, `tools/check.py`.

## DEC-8: Design docs hold contracts and the maintainer's choices, not specs (2026-10)

`relay:project` and `relay:plan` settle contracts (interfaces other code
calls, stored and emitted formats, a CLI's output, compatibility, failure
behavior a user sees) and choices with real trade-offs, which the maintainer
rules on. Wording, layout, key bindings, and internal structure are the
executor's to decide and report in the pull request; the code and its tests
are their record. A decision-log entry is only a choice with real
alternatives that the maintainer ruled on; a changed entry gets one "Changed
… because …" line, never accumulating "clarified" paragraphs. The earlier
rule, that a project is ready only when "an executor would need to invent no
rule", turned design docs into full specs: one repository's grew to about
4,700 lines and its decision log to 1,700, each chunk adding clarifications
to old entries. Briefs are capped at about 80 lines for the same reason.

*Where:* `skills/project/SKILL.md` §C, `skills/plan/SKILL.md` §A,
`skills/execute/SKILL.md` §3, `skills/setup/templates/decisions.md`.

## DEC-9: Small changes take one session; risky ones still get a review (2026-10)

`relay:quick` checks a change is small and its design settled, builds it with
tests, opens the pull request, and squash-merges it once CI is green, leaving
the *Next* block as it was. A risky change (stored data, job handling,
anything that could interrupt work in progress, security, release machinery,
and whatever the repo's **Risky changes** setting adds) is not merged: it
takes a chunk ID and `chunk/<id>` branch so `relay:review` and a rework
through `relay:execute` work unchanged. Routing small changes through
`relay:plan`, `relay:execute`, and `relay:review` was ruled out: a 290-line
brief and three sessions for a one-function fix. A mode of `relay:plan` was
ruled out because the planner writes no product code; a separate skill keeps
each skill's job plain. It is named `quick` rather than `fix` because it
serves tweaks and small features as well as bug fixes; what qualifies a change
is its size and settled design, not its urgency.

*Where:* `skills/quick/SKILL.md`, `skills/go/SKILL.md` §2,
`skills/setup/templates/agents-section.md`.

## DEC-10: Tests at boundaries, within a gate budget (2026-10)

Executors test operations, output contracts, and a few end-to-end flows, not
every string and branch; tests never sleep for a fixed time; and the gate has
a **Gate budget** a change must stay within. Review no longer re-runs a
flaky test forty times, runs mutation checks, or proves the old code fails
the new tests by default: a flaky test is a finding to fix by waiting on a
condition. The earlier "plus what a careful engineer adds" rule produced one
repository's 6,000 tests, an eight-minute gate, and a run of flaky timing
tests.

*Where:* `skills/execute/SKILL.md` §2, `skills/review/SKILL.md` §A,
`skills/quick/SKILL.md` §2.

## DEC-11: The status file is the present; follow-ups are filed on request (2026-10)

The status file holds the current state, the next step, and open follow-ups,
under 40 lines; git, the pull requests, and project ledgers hold the history.
Follow-ups are collected at each hand-off and filed as issues only once the
maintainer picks which, related ones grouped, instead of each loose end
becoming an issue unasked. Checklists stay under twenty short entries and may
retire one the gate now catches. `relay:setup` prunes repositories set up
before this (§7), as a mode rather than its own skill, since it is a one-off
upgrade like the migrations setup already owns.

*Where:* `skills/setup/templates/status.md`, `skills/review/SKILL.md`,
`skills/execute/SKILL.md` §5, `skills/setup/SKILL.md` §7.

## DEC-12: Every hand-off ends in plain language (2026-10)

Each skill ends with a few plain lines for the maintainer (what changed for
someone using the product, what is worth trying, what is next), then, while a
project is active, a map of its delivery items and their state, with chunk,
pull request, and decision IDs after both as references. Questions to the
maintainer are about outcomes they would see, not the code's internals. The
earlier reports, written for the next session, left the maintainer unable to
follow what the sessions did or answer their questions.

*Where:* the *Hand-off* section of each skill.
