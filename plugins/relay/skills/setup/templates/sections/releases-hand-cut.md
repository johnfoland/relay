## Releases

Releases are cut by hand with `relay:release`, from the changelog.

- **Changelog:** `CHANGELOG.md` ([Keep a Changelog](https://keepachangelog.com/)).
  A commit touching any of these paths adds a `- …` line under
  `## [Unreleased]` in the same commit: <`src/`, `Makefile`, …>. Write it for
  readers: the observable result, not the commit or the process behind it.
  Commits that touch only other paths (docs, process files, tools) need none.
- **Tags:** annotated `vMAJOR.MINOR.PATCH`; the first release is `<v0.1.0>`.
- **Versioning:** <SemVer | `docs/versioning.md`>. The bump follows from what
  the unreleased entries describe, not from their subsection names.
- **Publication:** <the tag push runs `<.github/workflows/release.yml>`, which
  publishes the GitHub Release | `relay:release` creates the GitHub Release
  from the dated changelog section | the tag alone>.
- **Docs snapshot:** <none | these files, copied unedited into
  `docs/releases/<tag>/` at each release: …>.
- **Artifact checks:** <none | what to verify in the published assets>.
- Never move or delete a pushed release tag. A bad release is fixed forward.
