# relay

Instructions for coding agents. Codex reads this file; Claude Code reads it
through `CLAUDE.md`'s `@AGENTS.md` import.

relay is a plugin for Claude Code and Codex that runs a planner/executor
workflow: the skills in `plugins/relay/skills/` (`go`, `project`, `plan`,
`execute`, `review`, `release`, `setup`) hand work between fresh agent sessions
through local process files and pull requests. The product is the skills'
text and the templates `setup` copies into other repositories. README.md
covers installing and using it; `docs/decisions.md` records why it is shaped
the way it is.

## Before you start

- Read `docs/decisions.md`. Those questions are settled: don't reopen one
  unless the user asks. When the user settles a new one, add an entry.
- Check the roadmap: `gh issue list`.

## Layout

- `.claude-plugin/marketplace.json`: the catalog both agents install from.
- `plugins/relay/.claude-plugin/plugin.json`: the plugin manifest. Its
  version is release-please's; never edit it by hand.
- `plugins/relay/skills/<skill>/SKILL.md`: one skill per directory, the
  directory name equal to the frontmatter `name`. `setup/templates/` holds
  what `relay:setup` writes into a repository.
- `tools/check.py`: the structural check `make check` runs; `tests/` tests it.

## Commands

- `make check`: everything CI checks (`tools/check.py`, its tests, and
  `claude plugin validate` when `claude` is on PATH). Run it before every
  push.
- `claude --plugin-dir plugins/relay`: a Claude Code session with your working
  copy of the plugin loaded instead of the installed one.

## Workflow

- One branch and pull request per change. Don't commit to `master` directly;
  release-please is the only thing that does.
- Conventional Commits for commit messages and pull request titles, as
  *Releases* describes.
- CI must pass before a merge; don't bypass a failing required check (no
  `gh pr merge --admin`).
- Keep README.md's skill table and install steps in step with any change to
  the skills' names or what they do, in the same pull request.

## Releases

Releases are automated with release-please, from Conventional Commits.

- **Conventional Commits** for commit messages and pull request titles (CI
  checks titles): `feat:`, `fix:`, `perf:`, `docs:`, `refactor:`, `test:`,
  `ci:`, `build:`, `chore:`, with a scope where useful (`fix(review): …`). The
  type decides the version bump and the changelog entry, so choose it for the
  user-visible effect: a change to what a skill does is `feat` or `fix`, even
  though it only edits Markdown. `feat` → minor, `fix` and `perf` → patch,
  `feat!` or a `BREAKING CHANGE:` footer → major (minor while below 1.0). The
  other types release nothing on their own. Pull requests are squash-merged,
  so the title is the commit release-please reads.
- Don't edit versions or `CHANGELOG.md`; release-please owns them. It keeps a
  release pull request open, and merging it tags `vX.Y.Z`, creates the GitHub
  release, and bumps `plugins/relay/.claude-plugin/plugin.json`, which is how
  installed copies learn there is an update. That merge is the maintainer's
  call.
- To force a version, add a `Release-As: X.Y.Z` footer to a commit. To fix the
  type or wording of an already-merged pull request, add a
  `BEGIN_COMMIT_OVERRIDE` … `END_COMMIT_OVERRIDE` block with the corrected
  message to its body before the release pull request merges.
- Never move or delete a pushed release tag. A bad release is fixed forward.

## Roadmap: GitHub Issues

The roadmap is the issue list on `johnfoland/relay`. Keep it current:

- **File ideas as issues, don't just mention them.** When you or the user
  come up with a feature, a follow-up, a bug, or a loose end you won't handle
  now, create an issue without asking first. Unplanned thoughts get the
  `idea` label; add an area label (`skills`, `templates`, `tooling`) and a
  type label (`bug`, `enhancement`, `question`) where one fits.
- **The repo is public, and so are its issues.** Write them for any reader:
  no private paths, hostnames, or personal details.
- Before starting work, look for an existing issue and reference it. Close
  issues from the pull request that resolves them (`Fixes #12` in its body).
- Comment on an issue when you learn something that matters to whoever picks
  it up next.

## Conventions

- **Skills are agent-neutral.** Name another skill as `relay:<skill>` in prose;
  only README.md and the *Relay workflow* section template show the typed
  forms (`/relay:<skill>` in Claude Code, `$relay:<skill>` in Codex). Say "the
  harness's structured question tool" or "skill tool", never one agent's tool
  name, so the same text works in both (DEC-2).
- **Skills are generic.** No personal names, accounts, paths, or one
  repository's conventions in a skill or template: a repository's specifics
  belong in its own AGENTS.md, which the skills read (DEC-6).
- **Every handoff writes the Next block.** A skill that changes what should
  run next sets the status file's *Next* block and closes by telling the user
  to run `relay:go`. `relay:go`'s §2 table and the skills that write the block
  must agree (DEC-3).
- **Old names live only in `setup`.** `setup`'s migration text is the one place
  that names the pre-plugin `relay-*` skills; `tools/check.py` fails on them
  anywhere else.
