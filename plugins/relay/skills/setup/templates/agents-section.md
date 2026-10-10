## Relay workflow

Work in this repository is built by fresh agent sessions that hand it to one
another through local process files and pull requests, using the relay
plugin's skills (`/relay:<skill>` in Claude Code, `$relay:<skill>` in Codex):

- `relay:go` runs whichever step comes next, as the status file's *Next*
  block records it. Start every fresh session with it.
- `relay:project` shapes an idea into settled design and an ordered delivery
  plan, makes design changes, and closes the project when its work is
  accepted.
- `relay:plan` cuts the next chunk brief from the active project, or from a
  small, already-designed fix.
- `relay:execute` builds the chunk in flight unit by unit on its own branch
  and draft pull request, then hands it back for review.
- `relay:review` reviews the chunk in flight, records the review, and either
  sends it back for rework or merges it.
- `relay:release` cuts a version: by hand from the changelog, or by
  reviewing and merging release-please's release pull request. It is only
  ever run on purpose, never by `relay:go`.

Code reaches the integration branch only through a chunk pull request, so every
change gets the executor's test discipline and a CI run. The status file is the
handoff between sessions: run each step in a fresh session.

The process files (status, chunk briefs, projects, and the two checklists)
live in `.relay/`, which git ignores: they are never committed, and there is
one copy whatever branch is checked out. A session in a linked worktree uses
the main working tree's `.relay/`. Never run `git clean -x` or `-X`: it
deletes them, and nothing else holds a copy. A chunk's remote record is its
pull request, whose body carries the executor's report and whose comments
carry the review. Tracked files (code, docs, the decision log, the changelog,
pull request titles) cite authority sections, decision IDs, issues, and pull
requests, never a chunk ID, a review finding, or a checklist entry.

When code and an authority doc disagree, one of them is wrong: fix it and say
which. A decided entry in the decision log is not re-litigated; where the docs
genuinely do not cover something, add an entry, update the doc that should have
said it, and cite the entry at the code site.

### Settings

- **Integration branch:** `<integration>`. Chunk and planning pull requests
  squash-merge here.
- **Release branch:** <"same as the integration branch" | `<release>`, reached
  from `<integration>` by a merge-commit release pull request>.
- **Gate:** `<gate>`, which runs <what it runs>. It passes before every unit
  commit and push. <"CI runs these same targets." | omit>
- **CI:** <`<workflow file>` runs the gate on pull requests <once ready for
  review | including drafts>; pushes to `<integration>` <run it | run none> |
  none>.
- **Releases:** <release-please, as *Releases* describes: a chunk pull
  request's title is a Conventional Commit for the chunk's user-visible
  effect, and nobody edits the changelog by hand. Unit commits on a chunk
  branch keep their relay titles; only the squash commit reaches
  `<integration>`, titled without the chunk ID. | hand-cut, as *Releases*
  describes: behavior-bearing unit commits carry their changelog entries, and
  `relay:release` cuts versions. | none>.
- **Issues:** <GitHub Issues, as *Roadmap* describes: review follow-ups and
  ideas are filed as issues, a project or maintenance chunk may start from
  one, and the pull request that finishes it closes it. | none: follow-ups
  live in the status file>.
- **Authority:** <the docs that define behavior, in order, e.g.
  `docs/spec.md`, then `docs/design.md`; `docs/README.md` gives the reading
  order. | `README.md` and the code's own documentation>.
- **Status:** `.relay/status.md` (local)
- **Chunks:** `.relay/chunks/<ID>.md` (local)
- **Decision log:** `docs/decisions.md`, entries cited as `(DEC-n)`
- **Review checklist:** `.relay/review-checklist.md` (local)
- **Brief checklist:** `.relay/brief-checklist.md` (local)
- **Projects:** `.relay/projects/` (local; `index.md`, `template.md`, one
  `P####-slug.md` per project)
- **Tools:** `tools/`, review aids run by hand, outside the gate and the build
- **Review extras:** <none | repo-specific checks every review runs>.
- **Environment:** <none | what a session must set up first>.
