#!/usr/bin/env python3
"""Check the relay plugin's structure: manifests, skills, and cross-references.

Run it from the repository root (`python3 tools/check.py`), or let `make check`
run it. It needs only the standard library. It checks:

- the marketplace catalog parses, and each plugin it lists exists at its
  source with a plugin.json whose name matches the catalog entry;
- plugin.json's version is SemVer and equals .release-please-manifest.json's;
- each plugin has skills, hooks (a Claude Code mod), or both;
- every skill directory has a SKILL.md whose frontmatter `name` matches the
  directory (lowercase, digits and hyphens, at most 64 characters) and whose
  `description` is non-empty and at most 1024 characters;
- every `relay:<skill>` a plugin file mentions names a skill that exists in
  one of the catalog's plugins;
- every `templates/...` path a SKILL.md mentions exists in that skill;
- no plugin file names a pre-plugin skill (`relay-next`, `/relay-execute`, ...),
  except where the setup skill describes the upgrade from them.

It does not check the skills' prose, nor how either agent loads the plugin:
`claude plugin validate` covers Claude Code's view of the manifests.
"""

import json
import re
import sys
from pathlib import Path

SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
SKILL_NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SKILL_REF = re.compile(r"\brelay:([a-z0-9-]+)")
TEMPLATE_REF = re.compile(r"`(templates/[^`\s]+)`")
OLD_NAME = re.compile(r"/relay-[a-z]|\brelay-(?:next|execute|project|release|setup|go|plan|review)\b")
# The setup skill names the old skills on purpose, to migrate repos off them.
OLD_NAMES_ALLOWED = {Path("skills/setup/SKILL.md")}
# Text that only looks like an old name: the setup skill's planning branch.
OLD_NAME_EXCEPTIONS = ("plan/relay-setup",)


def frontmatter(text):
    """Return the SKILL.md frontmatter as a dict of top-level keys, or None."""
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---", 4)
    if end < 0:
        return None
    fields = {}
    for line in text[4:end].splitlines():
        if line and not line[0].isspace() and ":" in line:
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()
    return fields


def load_json(path, errors):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError) as e:
        errors.append(f"{path}: can't read JSON: {e}")
        return None


def check_skills(plugin_dir, errors):
    skills_dir = plugin_dir / "skills"
    if not skills_dir.is_dir():
        if not (plugin_dir / "hooks" / "hooks.json").is_file():
            errors.append(f"{plugin_dir}: neither a skills/ directory nor hooks/hooks.json")
        return set()
    names = set()
    for skill in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
        skill_md = skill / "SKILL.md"
        if not skill_md.is_file():
            errors.append(f"{skill}: no SKILL.md")
            continue
        text = skill_md.read_text()
        fields = frontmatter(text)
        if fields is None:
            errors.append(f"{skill_md}: no frontmatter")
            continue
        name = fields.get("name", "")
        if name != skill.name:
            errors.append(f"{skill_md}: name {name!r} doesn't match its directory {skill.name!r}")
        if not SKILL_NAME.match(skill.name) or len(skill.name) > 64:
            errors.append(f"{skill}: directory name isn't a valid skill name")
        description = fields.get("description", "")
        if not description:
            errors.append(f"{skill_md}: empty description")
        elif len(description) > 1024:
            errors.append(f"{skill_md}: description is {len(description)} characters, over 1024")
        for ref in TEMPLATE_REF.findall(text):
            if not (skill / ref).exists():
                errors.append(f"{skill_md}: mentions {ref}, which doesn't exist")
        names.add(skill.name)
    return names


def check_references(plugin_dir, skills, errors):
    for path in sorted(plugin_dir.rglob("*")):
        if not path.is_file() or path.suffix not in {".md", ".json"}:
            continue
        rel = path.relative_to(plugin_dir)
        for lineno, line in enumerate(path.read_text().splitlines(), 1):
            for ref in SKILL_REF.findall(line):
                if ref not in skills:
                    errors.append(f"{path}:{lineno}: relay:{ref} names no skill")
            if rel in OLD_NAMES_ALLOWED:
                continue
            scrubbed = line
            for exception in OLD_NAME_EXCEPTIONS:
                scrubbed = scrubbed.replace(exception, "")
            if OLD_NAME.search(scrubbed):
                errors.append(f"{path}:{lineno}: names a pre-plugin skill: {line.strip()}")


def check(root):
    """Return the list of problems found in the repository at root."""
    errors = []
    catalog = load_json(root / ".claude-plugin" / "marketplace.json", errors)
    manifest = load_json(root / ".release-please-manifest.json", errors)
    if catalog is None:
        return errors
    plugins = catalog.get("plugins") or []
    if not plugins:
        errors.append("marketplace.json lists no plugins")
    checked, skills = [], set()
    for entry in plugins:
        name, source = entry.get("name"), entry.get("source")
        if not isinstance(source, str):
            errors.append(f"marketplace.json: plugin {name!r} has no local source")
            continue
        plugin_dir = (root / source).resolve()
        plugin_json = load_json(plugin_dir / ".claude-plugin" / "plugin.json", errors)
        if plugin_json is None:
            continue
        if plugin_json.get("name") != name:
            errors.append(f"{plugin_dir}: plugin.json name {plugin_json.get('name')!r} isn't the catalog's {name!r}")
        version = plugin_json.get("version", "")
        if not SEMVER.match(str(version)):
            errors.append(f"{plugin_dir}: plugin.json version {version!r} isn't SemVer")
        if manifest is not None and manifest.get(".") != version:
            errors.append(f".release-please-manifest.json has {manifest.get('.')!r}, plugin.json has {version!r}")
        skills |= check_skills(plugin_dir, errors)
        checked.append(plugin_dir)
    # A plugin may name another's skills: relay-band runs relay:go.
    for plugin_dir in checked:
        check_references(plugin_dir, skills, errors)
    return errors


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    errors = check(root)
    for error in errors:
        print(error, file=sys.stderr)
    if errors:
        print(f"check.py: {len(errors)} problem(s)", file=sys.stderr)
        return 1
    print("check.py: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
