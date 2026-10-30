<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg">
  <img alt="relay" src="docs/logo-light.svg" height="64">
</picture>

Plan, build, review and release work in chunks with Claude Code and Codex.
relay is a planner/executor workflow, packaged as a plugin for both agents:
each step runs in a fresh session, and the sessions hand work to one another
through local process files and pull requests, so no step depends on a
conversation's memory.

## How it works

Larger work is cut into **chunks**: short briefs that one session builds and
another reviews. A small change takes one session instead. Design docs hold
the contracts and the choices the maintainer made, not specs: wording,
layout, and internal structure are left to the session that builds them, and
the code and its tests are their record. Every step ends with a few plain
lines for the maintainer (what changed, what is worth trying, what is next)
and, during a project, a map of its steps and where each stands.
Seven skills run the work, and an eighth runs whichever comes next:

| Skill | What it does |
|---|---|
| `relay:go` | Reads the status file and runs the next step. Start every fresh session with it. |
| `relay:project` | Shapes an idea into settled design and an ordered delivery plan; makes design changes; closes projects. |
| `relay:quick` | Makes a small change in one session: builds it, opens the pull request, and merges it once CI is green. A risky change (stored data, job handling, work in progress) goes to `relay:review` instead. |
| `relay:plan` | Cuts the next chunk brief: the contracts the chunk must meet, not the details. |
| `relay:execute` | Builds the brief unit by unit, with tests at its boundaries, on its own branch and draft pull request. |
| `relay:review` | Reviews the chunk against the design docs and a short checklist, then sends it back or merges it. |
| `relay:release` | Cuts a version, by hand from the changelog or through release-please. `relay:go` only ever suggests it. |
| `relay:setup` | Adds the workflow to a repository, updates it, or prunes docs that have grown into specs. |

In Claude Code a skill runs as `/relay:<skill>`; in Codex, as
`$relay:<skill>`.

The design docs and a decision log in the repository are the authority; the
process files (status, briefs, projects, checklists) stay local in a
git-ignored `.relay/` directory, and each chunk's remote record is its pull
request.

## Install

**Claude Code:**

```sh
claude plugin marketplace add johnfoland/relay
claude plugin install relay@relay
```

**Codex:**

```sh
codex plugin marketplace add johnfoland/relay
codex plugin add relay@relay
```

**The band (Claude Code only, optional):** a second plugin, `relay-band`,
puts a `▶ relay:go` button above the prompt in a fresh session of a
repository whose `AGENTS.md` has a *Relay workflow* section, followed by the
step the status file's *Next* block has queued, when there is one. It hides
once the conversation's first turn starts and comes back after `/clear`.
Click it, or press ctrl+x tab to focus the band and then Enter (or `g` on the
desktop app). When a turn ends with an answer and has queued a step the
conversation did not start with, the band offers `▶ /clear` instead (`c` on
the desktop app), so the next step starts in a fresh conversation.

```sh
claude plugin install relay-band@relay
```

Both need git and an authenticated [GitHub CLI](https://cli.github.com/)
(`gh`) in the repositories where you use the workflow.

## Usage

In a repository, start a session and run `relay:setup`. It writes the
*Relay workflow* section of `AGENTS.md` (creating `AGENTS.md`, a `CLAUDE.md`
that imports it, and a decision log if the repository has none) and the local
`.relay/` files. Then shape the first piece of work:

```text
/relay:project add an export command that writes CSV
/relay:quick the export drops the header row when the table is empty
```

From then on, open a fresh session for each step and run `/relay:go` (or
`$relay:go` in Codex). It tells you which step it is running and why, and asks
when the next step is not clear.

## Development

`make check` runs everything CI runs: `tools/check.py` (manifests, skill
frontmatter, cross-references between skills), its tests, and
`claude plugin validate` when Claude Code is installed. To try a change
without installing it, start Claude Code with `claude --plugin-dir plugins/relay`
(add `--plugin-dir plugins/relay-band` for the band). `make check` also runs the
band's tests with `claude plugin test`.

## License

MIT; see [LICENSE](LICENSE).
