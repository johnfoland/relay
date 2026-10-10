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

The skills are named `go`, `project`, `plan`, `execute`, `review`, `release`,
and `setup`. Both agents prefix a plugin's skills with the plugin name, so
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

*Where:* `skills/review/SKILL.md` §B, `skills/plan/SKILL.md`,
`skills/project/SKILL.md` §F.

## DEC-6: `relay:setup` stands alone (2026-10)

`relay:setup` creates the baseline the relay needs (AGENTS.md, a CLAUDE.md
that imports it, a decision log) and owns hand-cut releases, rather than
calling an instructions skill: users of a public plugin will not have one.
It detects release-please and a GitHub Issues roadmap but does not install
them; those are repository conventions outside the relay.

*Where:* `skills/setup/SKILL.md` §1 and §4.
