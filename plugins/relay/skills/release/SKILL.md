---
name: release
description: Cut a release in a relay-workflow repo, under either release system the repo uses. For hand-cut releases it derives the SemVer version from the changelog's Unreleased section, dates it, optionally snapshots the shipped docs, lands the preparation through a pull request, merges into a separate release branch when there is one, creates and pushes the annotated tag, and verifies what it publishes. For release-please it reviews the open release pull request's version and changelog against the commits behind it, corrects commit types, merges it with the maintainer's go-ahead, and verifies the tag and publication. Use in a repo whose AGENTS.md has a "Relay workflow" section, for "relay:release", "cut a release", "release v1.2.3", or "publish the next version".
---

# Cut a release

You are the **release operator**. A release is a version decision, a reviewed
release boundary, an immutable tag, and a verified publication, plus a frozen
documentation set when the repo keeps one. Do not treat any one of those as
sufficient.

## Settings

This skill runs in a repo whose AGENTS.md has a **Relay workflow** section,
written by `relay:setup`. If there is none, stop and suggest running
`relay:setup` first. Read the section's settings, and AGENTS.md's *Releases*
section, before anything else. Below:

- **Releases** says which release system the repo uses: **hand-cut** (§A) or
  **release-please** (§B). With neither, stop and say so; `relay:setup` can
  add hand-cut releases.
- `<integration>` is the **Integration branch**.
- `<release>` is the **Release branch**. It may be the same branch as
  `<integration>`, and always is under release-please.
- `<gate>` is the **Gate** command; **CI** says which workflow runs it and
  when it does not run.
- The *Releases* section gives the changelog's path (`CHANGELOG.md` by
  default), the tag format (`vMAJOR.MINOR.PATCH`, written `<tag>` below), the
  versioning rules (a doc, or plain SemVer), what publishes a release, and,
  for hand-cut releases, the first version, any docs snapshot list, and any
  artifact checks.
- The status file is `.relay/status.md` unless the settings map it elsewhere.
  It is local and git-ignored: one copy, in the main working tree, edited in
  place and never committed.

The invocation may carry an expected version. It is an assertion to verify,
not the source of the version.

## Preflight (both systems)

Read the changelog, the versioning doc if there is one, and the status file in
full. Fetch `origin` and its tags. Stop before making changes unless all of
these are true:

- `git status --porcelain=v1` is empty and `gh auth status` succeeds;
- no chunk is `executing` or `awaiting review` in the status file;
- local `<integration>` exactly matches `origin/<integration>`;
- a CI run on the tip's exact commit is complete and green. If pushes to
  `<integration>` run no CI, start one by hand where the workflow allows it
  (`gh workflow run <workflow> --ref <integration>`), find it
  (`gh run list --workflow <workflow> --branch <integration> --limit 1`),
  confirm its `headSha` is the tip, and `gh run watch --exit-status` it. If it
  cannot be started by hand, the pull request whose squash-merge made the tip
  must have run green on that same tree; and
- the gate passes locally.

## A. Hand-cut releases

### A.1 Derive and announce the version

`[Unreleased]` must have at least one entry, not merely empty subsection
headings. For the first release (no existing release tag), the version is the
one the *Releases* section names, or the one the user gives; if neither does,
ask. For later releases, find the highest released SemVer tag reachable from
`origin/<release>`, inspect every `[Unreleased]` entry and the change it
describes, and apply the repo's versioning rules. With plain SemVer:

- an incompatible change to a published contract requires MAJOR (while the
  version is `0.y.z`, SemVer allows it in a MINOR);
- otherwise, new compatible capability requires MINOR;
- otherwise, behavior fixes require PATCH; and
- documentation or workflow-only work does not justify a release by itself.

Do not infer the bump from changelog subsection names: an entry under
`Changed` may be major, minor, or patch. Before editing, print the previous
version, the chosen version, and the entries that force that bump. If the
invocation named a version and it differs from the derived one, stop without
changing the tree.

Also prove that neither the local repository nor `origin` already has the
chosen tag, and, when the repo snapshots docs, that `docs/releases/<tag>/`
does not exist.

### A.2 Prepare the release commit

Create the short-lived branch `release-prep/<tag>` from the exact
`<integration>` tip the preflight verified. Use the current UTC calendar date
(`YYYY-MM-DD`). Preserve the accumulated `[Unreleased]` body byte for byte
while making the mechanical transformation:

1. Rename its heading to `## [MAJOR.MINOR.PATCH] - YYYY-MM-DD`.
2. Insert a fresh `[Unreleased]` section above it. If the repo keeps empty
   subsection headings there (for Keep a Changelog: `Added`, `Changed`,
   `Deprecated`, `Removed`, `Fixed`, `Security`, in that order), recreate
   exactly the ones the old section had.
3. If the file ends in link definitions, point `[Unreleased]` at
   `compare/<tag>...HEAD` and add the new version's link: a compare from the
   preceding tag to the new one, or `releases/tag/<tag>` for the first
   release. Keep every older definition.

Before and after the edit, extract the old unreleased body and the new dated
body to temporary files and compare them. Any difference other than the
heading is a release-note edit and must be corrected before continuing.

If the *Releases* section lists a docs snapshot, create `docs/releases/<tag>/`
and copy exactly the listed files into it, without editing the copies. The list
is deliberate: never replace it with a recursive copy of the docs directory.
The relay's process files are not in the repository, and earlier snapshots are
never part of it. Compare each copy with its source,
inspect `du -sh` and `git diff --stat`, and stop if the snapshot contains
anything outside the list. Compare its size with the preceding snapshot when
one exists; stop on unexplained growth, and always stop past 10 MiB.

Run the gate again. If a release workflow extracts notes from the changelog,
run or read that extraction and confirm it yields the unchanged dated body
with at least one entry.

Commit on the preparation branch, push it, open a pull request into
`<integration>`, wait for all required checks, review the exact diff, and
squash-merge it. Update local `<integration>` by fast-forward and verify the
merged tree contains precisely the prepared changelog (and snapshot). The
preparation branch is now finished.

### A.3 Establish the release commit

- **One branch** (`<release>` is `<integration>`): the release commit is the
  preparation pull request's squash commit, now the tip of `<integration>`.
  Confirm a green CI run on that exact commit, as in the preflight.
- **Separate release branch:** confirm a green CI run on the prepared
  `<integration>` tip's exact commit, as in the preflight. Open one pull
  request from `<integration>` into `<release>`, titled for the exact version.
  Review the complete diff from the preceding release tag through
  `<integration>`, confirm nothing else can merge to `<release>` while it is
  open, and wait for every required check. Merge with a merge commit
  (`gh pr merge <NN> --merge`), never squash or rebase: the merge commit is the
  release boundary in `<release>`'s history, and it keeps `<integration>` an
  ancestor. Update local `<release>` by fast-forward and prove that the new
  commit has exactly two parents: the former `<release>` tip first and the
  reviewed `<integration>` tip second. Do not merge `<release>` back into
  `<integration>`.

Immediately before tagging, require that `HEAD`, `origin/<release>`, and the
verified release commit are identical; the changelog has the dated version;
the snapshot, if any, exists and matches its sources; the gate is green; and no
tag or GitHub Release already exists for the version.

### A.4 Tag, publish, and verify

Create an annotated `<tag>` on the verified release commit with the message
`Release <tag>` (`git tag -a <tag> -m "Release <tag>" <sha>`). Inspect the tag
object and its target (`git cat-file -p <tag>`), then push that tag and only
that tag (`git push origin refs/tags/<tag>`).

Then verify according to what publishes the release:

- **A workflow the tag runs:** find the run this push triggered and watch it
  to completion (`gh run watch --exit-status`). After it is green, verify the
  GitHub Release's title, tag target, and notes against the dated changelog
  section.
- **This skill publishes:** write the dated changelog body to a file and
  `gh release create <tag> --verify-tag --title <tag> --notes-file <file>`.
  Verify the result the same way.
- **The tag alone:** confirm `origin` has the tag at the verified commit
  (`git ls-remote --tags origin <tag>`).

Then run §C's publication checks.

## B. release-please

release-please keeps a release pull request open on `<integration>`, bumping
the version and writing the changelog from the Conventional Commits merged
since the last release. Your job is to make sure it says the right thing,
merge it when the maintainer says so, and verify what that publishes. Never
edit the version or the changelog by hand.

### B.1 Find and review the release pull request

Find it: `gh pr list --state open --label "autorelease: pending"`. With none,
nothing releasable has merged since the last release (only commit types that
release nothing on their own); stop and say so.

Review it against the commits behind it:

- `git log <last tag>..origin/<integration> --oneline` lists the squash
  commits it covers. Each type should fit its change's user-visible effect: a
  new capability hidden under `chore:` or `refactor:` is missing from the
  release, and a breaking change without `!` or a `BREAKING CHANGE:` footer
  gets too small a bump. Read the diff behind any commit whose type you doubt.
- The version bump follows from the types under the repo's rules
  (`bump-minor-pre-major` makes a breaking change a MINOR while below 1.0).
  If the invocation named a version and it differs, stop and report why.
- The changelog section reads well for users, since its lines are the commit
  subjects.

Fix what is wrong at its source, not in the release pull request. Correct a
merged pull request's type or wording by adding a `BEGIN_COMMIT_OVERRIDE` …
`END_COMMIT_OVERRIDE` block with the corrected message to its body; force a
specific version with a `Release-As: X.Y.Z` footer on a commit that lands
through a normal pull request. release-please rewrites the release pull
request on its next run; re-read it afterwards.

The release pull request's CI must be green. If its checks never started,
it was opened with the built-in token: approve the waiting run
(`gh api -X POST repos/{owner}/{repo}/actions/runs/<id>/approve`) or tell the
maintainer the repo needs its release-please token (see *Releases*).

### B.2 Merge it

Merging the release pull request tags the release and publishes it, so it is
the maintainer's call. Show them the version, the bump's reason, and the
changelog section, and merge only on their go-ahead, unless they already gave
it for this release. Merge with the method release-please expects (normally
squash): `gh pr merge <NN> --squash`.

### B.3 Verify

Find the release workflow run on the merge commit and watch it to completion
(`gh run watch --exit-status`). Then confirm the tag `<tag>` exists on
`origin` at the merge commit, the GitHub Release exists with notes matching
the new changelog section, the pull request's label changed to
`autorelease: tagged`, and every publish job succeeded. Then run §C's
publication checks.

## C. Publication checks (both systems)

If the release carries assets, download all of them and their checksum files
into a fresh temporary directory and verify every checksum. If it publishes to
a registry, confirm the registry serves the new version (`pip index versions`,
`npm view <pkg> version`, `cargo search`, …). Run the artifact checks the
*Releases* section lists: inspect each archive's contents, and run the native
build's executables with a harmless help or version flag when they provide
one. Never execute a binary built for another architecture.

## D. Recovery after a tag exists

A pushed release tag never moves and is never deleted. Diagnose the failed job
before acting.

- If a job failed before anything was published, a transient runner, network,
  or service failure may be rerun at the same tag.
- If the publishing step failed, inspect `gh release view <tag>` and the
  registry. Nothing published means rerun after a transient failure. A draft
  release may be deleted **without its tag** after its assets and logs are
  inspected, then the failed job may be rerun. Never publish an incomplete
  draft by hand.
- If a published release exists, treat it and its assets as immutable. Verify
  it before deciding the run needs recovery; do not clobber assets or recreate
  the release. A registry version, once published, cannot be replaced either.
- A source defect, bad notes, or a packaging or workflow defect is not an
  infrastructure retry. Fix it through `<integration>` like any other change
  and release the next PATCH. Record in the status file that the failed tag
  has no published release, and say so in the next release's notes (a
  changelog entry, or the release pull request's body under release-please),
  so nobody later mistakes it for one.

Stop and report the tag, commit, failing job, whether a draft or published
release exists, and the exact recovery chosen. Never rerun blindly, and never
change a branch in the hope that a workflow tied to the old tag will see it.

## E. Report

Update the status file with the release if the repo records releases there;
it is local, so this needs no pull request. Leave its **Next** block as it
is: a release does not change what the relay builds next.

End with a few plain lines for the maintainer, before any IDs: what users of
this version get that the last one lacked, in their terms; how to get it (the
install or upgrade command); and anything waiting on the maintainer. Then the
references: the version and why, the pull
requests involved (preparation and release for hand-cut, the release pull
request and any commit overrides for release-please), the release commit and
tag, the workflow run URL if any, published assets or registry versions and the
check results, the documentation snapshot's size if any, and any recovery
action.
