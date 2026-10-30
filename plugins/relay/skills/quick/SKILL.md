---
name: quick
description: The relay workflow's light path for a small change, whether a bug fix, a tweak, or a small feature whose design is settled. In one session it checks the change is small and needs no open design choice, builds it with tests on its own branch, runs the repo's gate, opens the pull request, and, once CI is green, merges it, unless the change is risky (stored data, job handling, anything that could interrupt work in progress, or what the repo's settings list), in which case it hands the pull request to relay:review. No brief, no chunk ledger. Use in a repo whose AGENTS.md has a "Relay workflow" section, for "relay:quick", "fix this", "quick fix", "small change", "tweak", a bug report, a follow-up, or an issue that one session can finish.
---

# Make a small change in one session

You are planner and executor at once, for a change small enough that a brief,
a fresh executor session, and a formal review would cost more than the change
itself: a bug fix, a tweak, or a small feature whose design is already
settled. "Quick" is about the size of the change, not its urgency: an urgent
change that is large, risky, or needs design still takes the full path. You
decide the details, build it, test it at its boundaries, and land it.

## Settings

This skill runs in a repo whose AGENTS.md has a **Relay workflow** section,
written by `relay:setup`. If there is none, stop and suggest running
`relay:setup` first. Read the section's settings before anything else. Below:

- `<integration>` is the **Integration branch**, where the pull request merges.
- `<gate>` is the **Gate** command, which must pass before every commit;
  **Gate budget** is the time it should stay under.
- **Risky changes** lists what this repo counts as risky, on top of the
  defaults in §1.
- **Releases** says whether the repo uses release-please, hand-cut releases,
  or neither; AGENTS.md's *Releases* section gives the details.
- **Issues** says whether the repo tracks ideas and follow-ups as GitHub
  issues.
- The status file, chunk files, and decision log are at their default paths
  (`.relay/status.md`, `.relay/chunks/<ID>.md`, `docs/decisions.md` cited as
  `DEC-n`) unless the settings map them elsewhere.

The process files under `.relay/` are local and git-ignored: one copy, in the
main working tree (the first path `git worktree list` prints). Tracked files
and pull request titles never cite a chunk ID or a process file.

## 0. Orient

1. Read AGENTS.md (usually already loaded) and the status file. `git fetch
   origin`, then `git checkout <integration> && git pull --ff-only`; if that
   changed AGENTS.md, re-read it. Set up anything **Environment** asks for.
2. The **In flight** block must be `State: none`. If a chunk is in flight, say
   so: the change waits until that chunk is reviewed, unless the user says to
   go ahead, in which case leave the In-flight and Next blocks untouched and
   work on a branch that touches none of the chunk's files.
3. Read the request, follow-up, or issue (`gh issue view <N> --comments`), the
   code it touches, and the authority sections that govern it.

## 1. Check it fits

The light path is for a change that:

- fits one pull request and one session, and
- leaves no contract open (an interface other code relies on, a stored or
  emitted format, a CLI's output, compatibility) and no real choice with
  trade-offs the maintainer has not made.

Details the docs leave open (wording, layout, names, internal structure) are
yours to decide; say what you chose in the pull request. A contract or a real
choice is the maintainer's: ask, with the harness's structured question tool,
in terms of what they would see (what the product does, what it costs them),
not internals. Record the answer as §4 describes. If the change turns out to
need several pull requests or more than one real choice, stop: set the **Next**
block to `relay:project`, its Why naming the change, and say why it outgrew
the light path.

Then decide whether it is **risky**. It is when it changes:

- stored data, its format, or a migration of it;
- how jobs, queues, or background work start, stop, retry, or resume;
- anything that could interrupt, lose, or corrupt work in progress;
- security, credentials, or permissions;
- release or publishing machinery;
- anything **Risky changes** lists.

When in doubt, it is risky. Say which, and why, before you build.

## 2. Build

1. Branch from `<integration>`: `quick/<slug>` for an ordinary change. A risky
   change takes a chunk ID, `FYYYYMMDD-NN` (today, and the next suffix unused
   in the chunks directory), and the branch `chunk/<lowercase-id>`, so
   `relay:review` and a rework through `relay:execute` find it.
2. Build the change. Test it at its boundaries: the operation or command the
   change touches, its output contract, one end-to-end flow if the change is
   user-facing. For a bug fix, one test that fails without the fix is usually
   enough. Do not pin wording, layout, or each branch of a helper. No fixed
   sleeps: wait on the condition, or drive a fake clock.
3. Run the gate; it must pass before you commit. If it now runs over **Gate
   budget**, find out why before you push.
4. Commit with the repo's commit-message rules and a body ending
   `<gate>: green`. **Hand-cut releases:** a behavior-bearing change adds its
   `[Unreleased]` line in the same commit. **release-please:** never edit the
   changelog or a version.

## 3. Open the pull request and land it

1. Push and open the pull request into `<integration>`
   (`gh pr create --base <integration>`), ready, not draft. Under
   release-please its title is a Conventional Commit for the user-visible
   effect (`fix:` for a bug fix, `feat:` for a small feature). The body says
   in plain language what changed for someone using the product, what you
   decided that the docs left open, what the tests cover, and `Fixes #N`
   where it resolves an issue.
2. Wait for CI (`gh pr checks <NN> --watch`), in this turn. A red run is fixed
   as a new commit and waited on again. A failure that passes on a re-run is a
   flaky test: name it in the body and in the hand-off.
3. **Not risky:** read the whole diff once against the request, then
   squash-merge (`gh pr merge <NN> --squash --delete-branch`) and pull
   `<integration>`. Leave the status file's **Next** block as it was: a small
   change does not change what the relay builds next.
4. **Risky:** do not merge. Write `.relay/chunks/<ID>.md` with a title, a
   **Goal** paragraph, a **Why risky** line, and the pull request body as its
   `## Report`. Set the **In flight** block to the chunk, `State: awaiting
   review`, its branch, and `#NN (ready)`, with `Units committed: a`. Then,
   with CI green, set the **Next** block to `relay:review`, its Why naming the
   change and what makes it risky.

## 4. Decisions

A decision-log entry records a choice that had real alternatives and that the
maintainer ruled on, nothing else. When §1's question produced one, add it (the
next unused ID; what was decided, the alternatives, and why), cite it at the
code site, and update the doc that should say it, in the same pull request.
Details you decided go in the pull request body, not the log.

## Hand-off

End with a few plain lines for the maintainer, before any IDs:

- **What changed:** what the product does differently now, in a user's terms.
- **Worth trying:** the command or action that shows it, or "nothing visible
  to try" when there is none.
- **Next:** what happens next and anything waiting on the maintainer.

Follow-ups you noticed and did not do go in one short list. With **Issues** on,
ask the maintainer once which to file (a multi-select question), file those,
grouping related ones into one issue; otherwise add them to the status file's
*Follow-ups*. Then one line of references: the pull request, the merge commit,
any decision ID, any issue. When the **Next** block queues a step, close with
*"In a fresh session at this repo, run `relay:go` (next: `<the Next block's
Run>`)."*
