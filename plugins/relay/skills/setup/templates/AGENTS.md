# <Project name>

Instructions for coding agents. Codex reads this file; Claude Code reads it
through `CLAUDE.md`'s `@AGENTS.md` import.

<One paragraph: what the project is, what it does, and for whom. Then where to
look: README.md for usage, docs/ for design.>

## Before you start

- Read `docs/decisions.md`. Those questions are settled: don't reopen one
  unless the user asks. When the user settles a new one, add an entry.

## Commands

- `<setup command>`: set up a fresh checkout.
- `<gate>`: everything CI checks. Run it before every push.

## Workflow

- Changes arrive through pull requests into `<integration branch>`; nothing is
  committed to it directly. The *Relay workflow* section below says which
  branches and pull requests the relay opens.
- CI must pass before a merge; don't bypass a failing required check (no
  `gh pr merge --admin`).
- Keep <README.md, the help text, …> in step with any behavior change, in the
  same pull request.
