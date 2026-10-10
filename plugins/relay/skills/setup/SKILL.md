---
name: setup
description: Set up, update, or adopt the relay workflow in a repository. Creates the baseline it needs when missing (AGENTS.md, a CLAUDE.md that imports it, a decision log), optionally adds hand-cut releases, writes the "Relay workflow" section of AGENTS.md (branches, gate, CI, releases, GitHub Issues, authority docs, file paths), git-ignores .relay/, and scaffolds the status file, chunk directory, checklists, and project registry in it. Also moves committed relay process files out of git, and upgrades repos set up for the older relay-* skills. Use when the user wants to work in chunks, "set up relay", adopt the relay in a repo, migrate a repo's own planner/executor skills onto it, upgrade from the relay-* skills, change a relay setting, or stop committing the process files; and whenever another relay skill stops because AGENTS.md has no relay section.
---

# Set up the relay workflow

The relay workflow builds a repository in **chunks**: small, fully specified
briefs that fresh agent sessions pick up, build, review, and merge, handing off
to one another only through local process files and the pull requests. The
relay plugin's skills run it:

- `relay:go` runs whichever step comes next, as the status file records it.
- `relay:project` shapes an idea into settled design and an ordered delivery
  plan, makes design changes, and closes projects.
- `relay:plan` (planner) cuts the next chunk brief.
- `relay:execute` (executor) builds a brief unit by unit on its own branch and
  draft pull request.
- `relay:review` (reviewer) reviews the chunk in flight and merges accepted
  work.
- `relay:release` cuts a version.

In Claude Code they are invoked as `/relay:<skill>`, and in Codex as
`$relay:<skill>`; this file and the others name them `relay:<skill>`.

The relay layer sits on an instruction baseline: AGENTS.md with its commands
and workflow, a decision log, and optionally a **Releases** section and a
GitHub Issues **Roadmap** section. This skill creates the parts of that
baseline the relay needs when they are missing, then adds a **Relay workflow**
section to AGENTS.md, holding the settings the relay skills read, and the
relay's own process files. The other relay skills refuse to run without the
section.

## Process files stay out of git

The relay's process files (the status file, chunk briefs, project records, and
the review and brief checklists) are working state, not part of the product.
They live in `.relay/` at the root of the repository's main working tree, which
`.gitignore` excludes (`/.relay/`), and they are never committed:

- There is one copy, whatever branch is checked out. A session in a linked
  worktree reads and writes the main working tree's `.relay/` (the first path
  `git worktree list` prints), not one of its own.
- The pull request is the remote record of a chunk: its body carries the
  executor's report, and the reviewer posts the review on it.
- Tracked files never cite process files: code, authority docs, the decision
  log, the changelog, and pull request titles cite authority sections,
  decision IDs, issues, and pull requests, never a chunk ID, a review finding,
  or a checklist entry. Someone with only the remote cannot follow those.
- Everything else the relay touches stays tracked: AGENTS.md, the authority
  docs, the decision log, the changelog, and `tools/`.
- `git clean -x` (or `-X`) deletes `.relay/`, and nothing else holds a copy.
  The files live on one machine, so a handoff between sessions needs the same
  checkout.

## 0. Orient

Read AGENTS.md, CLAUDE.md, the README, and any docs index.

- **No baseline** (no AGENTS.md, or one without a decision log): §4 creates
  what is missing. Keep whatever instructions already exist; never drop a rule
  silently.
- **A relay section already exists:** this is an update. Show the current
  settings, ask what should change, and go to §3. If git tracks any of its
  process files, or the section and process files still name the older
  `relay-*` skills (`/relay-next`, `/relay-execute`, …), the update includes
  that migration (§3), whether or not the user asked for anything else.

Then detect what you can instead of asking for it:

- **Branches.** The default branch, and any other long-lived branch such as
  `develop` (`git branch -r`). Branch protection, where visible:
  `gh api repos/{owner}/{repo}/branches/<branch>/protection` (a 404 means
  unprotected or no admin access).
- **Gate candidates.** A single command that runs every check. AGENTS.md's
  *Commands* section may already name it; otherwise look for a Makefile
  `check` or `test` target, `package.json` scripts, a `justfile`, `tox` or
  `nox`, `cargo`, `go test ./...`.
- **CI.** `.github/workflows/*.yml`: which workflow runs the checks, on which
  events (`pull_request` types, whether drafts are skipped, pushes to which
  branches), and whether it accepts `workflow_dispatch`.
- **Releases and Issues.** What AGENTS.md's *Releases* and *Roadmap* sections
  say, if they exist; a `CHANGELOG.md` and its format; release-please files
  (`release-please-config.json`, a workflow using
  `googleapis/release-please-action`).
- **Authority docs.** A spec, design docs, architecture notes, ADRs.
- **Existing machinery.** A planner/executor process of the repo's own: local
  skills in `.agents/skills/` or `.claude/skills/`, a status file with an
  In-flight block, chunk briefs, review checklists. Note which of them git
  tracks (`git ls-files`): committed process files are a migration (§3).

## 1. Choose the settings

Every relay skill reads these from the section. Infer what you can, then
interview the user for the rest with the harness's structured question tool
(the `interview` skill, if available, says how), leading each question with the
detected value as the recommended answer. Always confirm the branch model, the
gate, and the authority docs, even when detection looks certain: a wrong guess
here misdirects every later session.

| Setting | What it holds | Default |
|---|---|---|
| Integration branch | Where chunk and planning pull requests squash-merge. | The default branch. |
| Release branch | The same branch, or a separate one the integration branch reaches through a merge-commit release pull request (hand-cut releases only). | Same as integration. |
| Gate | One command that runs every check the repo has, and must pass before every unit commit. Whether CI runs the same targets. | The repo's check command. |
| CI | The workflow that runs the gate, and when it does not run (drafts, pushes to the integration branch). | Detected, or `none`. |
| Releases | release-please, hand-cut, or none. | What the repo already uses. |
| Issues | Whether relay files follow-ups and ideas as GitHub issues and starts work from them. | On when AGENTS.md has a Roadmap section. |
| Authority | The docs that define behavior, in order. | `README.md` and the code's own documentation. |
| Status, Chunks, Review checklist, Brief checklist, Projects | Where each local process file lives. Always under `.relay/`. | `.relay/status.md`, `.relay/chunks/`, `.relay/review-checklist.md`, `.relay/brief-checklist.md`, `.relay/projects/`. |
| Decision log, Tools | Where the tracked decision log and review tools live, and the decision log's ID prefix. | An existing decision log as it is, else `docs/decisions.md` (`DEC-n`); `tools/`. |
| Review extras | Repo-specific checks every review runs. | none |
| Environment | What a session must set up first (a `PATH` entry, a toolchain). | none |

Do not invent a gate. If the repo has no single command that runs its checks,
record the closest existing command, and offer to make "add a gate command
that runs every check, and wire it into CI" the first maintenance chunk.

**Releases.** Three choices:

- **release-please**, when the repo already has it: the relay adapts to it
  (§2), and `relay:release` reviews and merges its release pull requests.
  This skill does not install release-please; if the user wants it and the
  repo lacks it, set it up separately first, or choose one of the others.
- **Hand-cut:** agents keep a Keep a Changelog `[Unreleased]` section as they
  commit, and `relay:release` derives the version and cuts the release. §4
  adds it. A separate release branch goes only with hand-cut releases:
  release-please manages a single branch.
- **None yet.**

## 2. Reconcile with the baseline

The relay changes a few things an existing baseline may say. Edit those
sections so AGENTS.md never states two rules for the same thing:

- **Workflow.** "One branch and pull request per change" becomes one chunk
  branch and pull request per chunk, plus `plan/<slug>` branches for planning
  changes. Code changes arrive through chunks.
- **release-please.** If AGENTS.md requires Conventional Commits for every
  commit message, narrow it to pull request titles: those become the squash
  commits release-please reads, while unit commits on a chunk branch keep their
  relay titles (`P0002-C03-a: …`) and never reach the integration branch on
  their own.
- **Issues.** If the Roadmap section says work is tracked only in issues,
  refine it: ideas, bugs, and follow-ups are issues; the design and delivery
  plan for anything bigger than one chunk live in a project file, and each
  chunk in its brief, both linking the issues they come from. Change the status
  template's *Follow-ups not yet scheduled* text to say follow-ups are filed as
  issues.
- **Decision log.** The relay cites decisions by ID. If the existing log has
  no IDs, give its entries IDs once (`DEC-1`, `DEC-2`, … in file order, the
  format `templates/decisions.md` shows), unless it is a table with its own
  IDs, which the relay skills read as is. The log stays tracked; its entries
  name their origin by date and pull request, not by chunk.

## 3. Adopting existing machinery

When the repo already runs its own planner/executor variant, an earlier relay
setup that committed its process files, or the older `relay-*` skills, this is
a migration, and these rules keep it safe:

- **Map the tracked files, don't move them.** Point the decision-log and tools
  settings at the existing files and keep their ID prefixes: a decision log at
  `docs/open-questions.md` cited as `(OQ-n)` stays exactly that. Renaming
  breaks every citation in the docs and the code. Compare the existing
  In-flight block and its state names with the relay shape (in
  `templates/status.md`); if they differ, convert the block once, in this
  change. Existing release and versioning docs become the *Releases* section
  in its hand-cut form, pointing at them.
- **Sort every repo-specific rule into a home.** Read the repo's own skills
  line by line. Each rule that is not generic procedure the relay skills
  already carry goes to one of: a setting; **Review extras**; **Environment**;
  the *Releases* section (a docs snapshot list, artifact checks); a rule
  elsewhere in AGENTS.md; an entry in one of the checklists, keeping its
  provenance; or the design doc that owns it. Worked examples and incident
  history that only justified a generic rule can go. List anything that fits
  nowhere and ask the user about it before deleting anything.
- **Move the process files out of git.** Status file, chunk briefs, project
  records, and checklists go to `.relay/` (their old names map onto the
  defaults; keep their contents and ID schemes), and git stops tracking the
  old paths. At a different path, a checkout of an older commit cannot
  overwrite the local copies, and switching back cannot delete them. Before
  touching anything, archive the old files outside the repo (a dated tarball)
  and say where it is. Do the migration when no chunk is `executing` or
  `awaiting review`: an open chunk branch that edits the old status file would
  conflict with its removal. Then, in the setup branch (§6):
  1. Copy the files into `.relay/` and add `/.relay/` to `.gitignore`.
  2. `git rm -r --cached` the old paths, then delete them from the working
     tree, and confirm `git ls-files .relay` prints nothing.
  3. Fix every tracked file that links to or describes the old paths (a docs
     index, a branching or release doc, AGENTS.md): a link becomes plain text
     or goes, and a description of committed handoffs is rewritten for local
     files. Leave existing *citations* of chunks and checklist entries in code
     and docs alone: they are history, and the rule against new ones is
     enough. Grep with
     `git grep -n -E 'status\.md|chunks/|projects/|review-checklist|brief-checklist'`.
  4. In the moved files, bring the explanatory text that describes committing
     them or branch copies (the status file's In-flight note, the checklists'
     "How it is used" paragraphs, the projects index's introduction) in line
     with the templates. Links between them keep working: their layout under
     `.relay/` is the old one.
- **Upgrade from the `relay-*` skills.** The plugin renamed them and split
  one: `relay-next` became `relay:review` (review and merge) and
  `relay:plan` (cut the next chunk), and `relay-execute`, `relay-project`,
  `relay-release`, and `relay-setup` became `relay:execute`,
  `relay:project`, `relay:release`, and `relay:setup`; `relay:go` is new.
  1. Replace the `## Relay workflow` section's prose from
     `templates/agents-section.md`, keeping every setting's current value.
  2. Add the **Next** block to the status file, in the shape and position
     `templates/status.md` gives, with the step its In-flight `State` calls
     for (the table in `relay:go`'s §2); with `State: none` and no active
     project, `—`. Set `Set by` to `relay:setup` and today's date.
  3. Bring the explanatory text of the status file, both checklists, and the
     projects index in line with the templates, so they name the new skills.
  4. Rewrite any other mention of the old names in tracked files
     (`git grep -n -E 'relay-(next|execute|project|release|setup)'`) and in
     `.relay/`. Chunk briefs and reviews already written are history; leave
     them.
- **Remove the local skills last.** Delete them in the same change only if the
  relay plugin is installed where this repo's agents will find it
  (`claude plugin list`, `codex plugin list`, or ask). Otherwise the repo loses
  its workflow until it is. Also remove or rename any local skill whose name
  collides with a relay skill.

Update every doc that names a repo's own old skills (`/next` → `relay:review`
and `relay:plan`, `/execute` → `relay:execute`, and so on), including the
status file's explanatory text and the checklists' "How it is used"
paragraphs.

## 4. Write the files

1. **Baseline.** Only what is missing:
   - **AGENTS.md** from `templates/AGENTS.md`: the project in one paragraph,
     the gate under *Commands*, and the branch and pull request rules under
     *Workflow*, dropping every alternative that does not apply. Keep it
     short; the relay section carries the rest.
   - **CLAUDE.md** containing `@AGENTS.md`, so Claude Code reads the same
     instructions. If a CLAUDE.md exists with shared guidance in it, move that
     guidance into AGENTS.md and leave the import plus any Claude-only lines.
   - **Decision log** at the chosen path from `templates/decisions.md`. Move
     settled questions found in other instruction files into it.
2. **Hand-cut releases**, if chosen. Add a `## Releases` section to AGENTS.md
   from `templates/sections/releases-hand-cut.md`, with the behavior-bearing
   paths (the directories and files whose changes users can observe: source,
   build files, CI workflows, recorded fixtures), the tag format, the first
   version, and what publishes a release, asking for what detection cannot
   settle. Create `CHANGELOG.md` from `templates/CHANGELOG.md` if the repo
   has none; an existing changelog in another format stays, with a fresh
   `## [Unreleased]` section added above its entries.
3. **AGENTS.md's relay section.** Fill `templates/agents-section.md` with the
   chosen settings, dropping the angle-bracket alternatives that do not apply,
   and insert it as the `## Relay workflow` section after the baseline
   sections, or replace the existing one. Make the §2 edits to the baseline
   sections.
4. **.gitignore.** Add `/.relay/` with a comment saying it holds the relay's
   local process files. Confirm with `git check-ignore .relay/status.md`.
5. **Process files.** For each path setting whose file does not exist yet,
   copy the matching template into `.relay/`: `templates/status.md`,
   `templates/review-checklist.md`, `templates/brief-checklist.md`,
   `templates/projects/index.md`, and `templates/projects/template.md`. Create
   the empty chunks directory. Fill in the dates, and replace `DEC-n` in the
   templates with the decision log's prefix if it differs.
6. **Never overwrite an existing file.** When a file already exists at a
   mapped path in a different format, ask whether to adopt it as it is,
   convert it, or map the setting to a new path.
7. **Docs index.** If the authority docs have an index (a `docs/README.md`),
   do not list the process files there: they are not in the repository, and
   AGENTS.md already says where they are.

## 5. Repository settings

The workflow assumes the repository enforces a few things. Compare them with
what §0 found and recommend changes, but ask before applying any: they are
outward-facing and affect everyone who uses the repo.

- Squash merges enabled (and merge commits, with a separate release branch);
  rebase merges off; head branches deleted automatically after merge.
- The integration branch (and a separate release branch) protected: changes
  through pull requests only, CI required on the latest commit, no
  force-push.
- Force-push blocked on `chunk/**`, so a chunk branch's history is the
  complete record its reviewer reads.

If the settings name a separate release branch or an integration branch that
does not exist yet, create it from the current release-branch tip and push it
before anything else, after confirming with the user.

## 6. Land it

Show the user a summary of the changes. Unless they say otherwise, land the
tracked ones (AGENTS.md, CLAUDE.md, the decision log, the changelog,
`.gitignore`, any docs edits, and a migration's removals) like any planner
change: a `plan/relay-setup` branch from the integration branch, one commit, a
pull request (titled as the repo's convention requires), CI, and a
squash-merge. If the repo has no remote, or the user wants it committed
directly, commit on the current branch and say so. Before committing, check
`git status --ignored .relay` shows `.relay/` as ignored and nothing under it
staged. After the merge, pull the integration branch and confirm `.relay/` is
intact.

## 7. Hand off

Report the settings chosen, the files created or adopted, where a migration's
archive is, the baseline sections created or changed, anything moved out of
retired local skills and where it went, and any repository setting left for
the user. A fresh setup leaves the **Next** block at `—`. Close with: *"In a
fresh session at this repo, run `relay:project <idea>` to shape the first
project, or `relay:plan` with a small, already-designed fix. After that,
`relay:go` runs each next step."* An update that left a step queued closes
with: *"In a fresh session at this repo, run `relay:go`."*
