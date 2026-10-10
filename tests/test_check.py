"""Tests for tools/check.py: one good tree, then one breakage per rule."""

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

import check  # noqa: E402


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def skill(name, body="", description="Does a thing."):
    return f"---\nname: {name}\ndescription: {description}\n---\n\n{body}\n"


class CheckTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root)
        write(self.root / ".claude-plugin/marketplace.json", json.dumps(
            {"name": "relay", "plugins": [{"name": "relay", "source": "./plugins/relay"}]}))
        write(self.root / ".release-please-manifest.json", json.dumps({".": "0.1.0"}))
        self.plugin = self.root / "plugins/relay"
        write(self.plugin / ".claude-plugin/plugin.json", json.dumps({"name": "relay", "version": "0.1.0"}))
        write(self.plugin / "skills/go/SKILL.md", skill("go", "Then run `relay:plan`."))
        write(self.plugin / "skills/plan/SKILL.md", skill("plan", "Copy `templates/brief.md`."))
        write(self.plugin / "skills/plan/templates/brief.md", "# Brief\n")

    def assertProblem(self, fragment):
        errors = check.check(self.root)
        self.assertTrue(any(fragment in e for e in errors), f"{fragment!r} not in {errors}")

    def test_good_tree_passes(self):
        self.assertEqual(check.check(self.root), [])

    def test_this_repository_passes(self):
        self.assertEqual(check.check(ROOT), [])

    def test_plugin_name_mismatch(self):
        write(self.plugin / ".claude-plugin/plugin.json", json.dumps({"name": "other", "version": "0.1.0"}))
        self.assertProblem("isn't the catalog's")

    def test_version_not_semver(self):
        write(self.plugin / ".claude-plugin/plugin.json", json.dumps({"name": "relay", "version": "1.0"}))
        self.assertProblem("isn't SemVer")

    def test_version_differs_from_release_please(self):
        write(self.root / ".release-please-manifest.json", json.dumps({".": "0.2.0"}))
        self.assertProblem(".release-please-manifest.json has '0.2.0'")

    def test_skill_name_mismatch(self):
        write(self.plugin / "skills/go/SKILL.md", skill("relay-go"))
        self.assertProblem("doesn't match its directory")

    def test_missing_skill_md(self):
        (self.plugin / "skills/empty").mkdir()
        self.assertProblem("no SKILL.md")

    def test_description_too_long(self):
        write(self.plugin / "skills/go/SKILL.md", skill("go", description="x" * 1025))
        self.assertProblem("over 1024")

    def test_unknown_skill_reference(self):
        write(self.plugin / "skills/go/SKILL.md", skill("go", "Run `relay:next`."))
        self.assertProblem("relay:next names no skill")

    def test_missing_template(self):
        write(self.plugin / "skills/plan/SKILL.md", skill("plan", "Copy `templates/gone.md`."))
        self.assertProblem("templates/gone.md, which doesn't exist")

    def test_old_skill_name(self):
        write(self.plugin / "skills/go/SKILL.md", skill("go", "Then run `/relay-next`."))
        self.assertProblem("names a pre-plugin skill")

    def test_old_names_allowed_in_setup(self):
        write(self.plugin / "skills/setup/SKILL.md", skill("setup", "Upgrade from `relay-next`."))
        self.assertEqual(check.check(self.root), [])

    def test_planning_branch_is_not_an_old_name(self):
        write(self.plugin / "skills/go/SKILL.md", skill("go", "Branch `plan/relay-setup`."))
        self.assertEqual(check.check(self.root), [])


if __name__ == "__main__":
    unittest.main()
