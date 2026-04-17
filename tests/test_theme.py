"""Unit tests for theme.js — phaseAccentColor and STATUS_COLORS logic.

Runs via Node.js since theme.js is an ES module with no browser dependencies
(injectStatusTokens is excluded as it requires a DOM).
"""

from __future__ import annotations

import json
import subprocess
import textwrap
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
THEME_PATH = PROJECT_ROOT / "theme.js"

# Inline the logic under test as a Node script so we don't need a bundler.
# This mirrors the JS exactly so any divergence will be caught.
_NODE_SCRIPT = textwrap.dedent(
    r"""
    import { phaseAccentColor, STATUS_COLORS } from '{theme_path}';

    const results = {
        phase2: phaseAccentColor("Phase 2: Requirements"),
        phase5: phaseAccentColor("Phase 5: Implementation"),
        phase7: phaseAccentColor("Phase 7: Complete"),
        phaseNull: phaseAccentColor(null),
        phaseEmpty: phaseAccentColor(""),
        statusColors: STATUS_COLORS,
    };
    console.log(JSON.stringify(results));
    """
)


def _run_theme_tests() -> dict:
    script = _NODE_SCRIPT.replace("{theme_path}", str(THEME_PATH))
    result = subprocess.run(
        ["node", "--input-type=module"],
        input=script,
        capture_output=True,
        text=True,
        timeout=10,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Node script failed:\n{result.stderr}")
    return json.loads(result.stdout.strip())


@pytest.fixture(scope="module")
def theme_results():
    return _run_theme_tests()


def test_phase2_returns_waiting(theme_results):
    expected = theme_results["statusColors"]["--status-waiting"]
    assert theme_results["phase2"] == expected


def test_phase5_returns_info(theme_results):
    expected = theme_results["statusColors"]["--status-info"]
    assert theme_results["phase5"] == expected


def test_phase7_returns_complete(theme_results):
    expected = theme_results["statusColors"]["--status-complete"]
    assert theme_results["phase7"] == expected


def test_null_returns_ok(theme_results):
    expected = theme_results["statusColors"]["--status-ok"]
    assert theme_results["phaseNull"] == expected


def test_empty_returns_ok(theme_results):
    expected = theme_results["statusColors"]["--status-ok"]
    assert theme_results["phaseEmpty"] == expected
