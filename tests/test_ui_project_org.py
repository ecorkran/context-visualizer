"""E2E tests for project list organization — star/hide functionality."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from playwright.sync_api import Page, expect


pytestmark = pytest.mark.e2e

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PREFS_PATH = PROJECT_ROOT / "projects" / "project-prefs.json"


@pytest.fixture(autouse=True)
def clean_prefs():
    """Remove project-prefs.json after each test to reset star/hide state."""
    yield
    if PREFS_PATH.exists():
        PREFS_PATH.unlink()


def _wait_for_panel(page: Page) -> None:
    """Navigate and wait for the project panel to render."""
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)
    page.wait_for_timeout(300)


def _get_project_names(page: Page) -> list[str]:
    """Return visible project names in panel order."""
    rows = page.locator(".panel-row")
    count = rows.count()
    names = []
    for i in range(count):
        text_el = rows.nth(i).locator("span").nth(1)
        names.append(text_el.text_content().strip())
    return names


def test_star_moves_project_to_top(live_server: str, page: Page) -> None:
    """Starring a non-first project moves it to the top of the list."""
    page.goto(live_server)
    _wait_for_panel(page)

    # Get initial order
    initial_names = _get_project_names(page)
    assert len(initial_names) >= 2, "Need at least 2 projects for this test"

    # Star the second project (star is the 2nd button: refresh, star, hide)
    rows = page.locator(".panel-row")
    star_btn = rows.nth(1).locator("button").nth(1)
    star_btn.click()
    page.wait_for_timeout(500)

    # The starred project should now be first
    new_names = _get_project_names(page)
    assert new_names[0] == initial_names[1], (
        f"Expected '{initial_names[1]}' at top, got '{new_names[0]}'"
    )


def test_unstar_returns_to_normal(live_server: str, page: Page) -> None:
    """Unstarring a project returns it to its normal position."""
    page.goto(live_server)
    _wait_for_panel(page)

    initial_names = _get_project_names(page)

    # Star the second project (star is 2nd button: refresh, star, hide)
    rows = page.locator(".panel-row")
    rows.nth(1).locator("button").nth(1).click()
    page.wait_for_timeout(500)

    # Now unstar it (it's now the first row)
    rows = page.locator(".panel-row")
    rows.nth(0).locator("button").nth(1).click()
    page.wait_for_timeout(500)

    # Order should be restored
    restored_names = _get_project_names(page)
    assert restored_names == initial_names


def test_hide_moves_project_to_bottom_dimmed(live_server: str, page: Page) -> None:
    """Hiding a project moves it to the bottom with reduced opacity."""
    page.goto(live_server)
    _wait_for_panel(page)

    initial_names = _get_project_names(page)

    # Click the hide button (×) on the first project — 3rd button: refresh, star, hide
    rows = page.locator(".panel-row")
    hide_btn = rows.nth(0).locator("button", has_text="×")
    hide_btn.click()
    page.wait_for_timeout(500)

    # The hidden project should now be last
    new_names = _get_project_names(page)
    assert new_names[-1] == initial_names[0]

    # Verify reduced opacity on the last row
    last_row = page.locator(".panel-row").last
    opacity = last_row.evaluate("el => getComputedStyle(el).opacity")
    assert float(opacity) < 0.5, f"Expected opacity < 0.5, got {opacity}"


def test_unhide_restores_project(live_server: str, page: Page) -> None:
    """Unhiding a project restores it to the normal section."""
    page.goto(live_server)
    _wait_for_panel(page)

    initial_names = _get_project_names(page)

    # Hide first project (× is the hide button)
    rows = page.locator(".panel-row")
    rows.nth(0).locator("button", has_text="×").click()
    page.wait_for_timeout(500)

    # Unhide it (now the last row, button shows ↑)
    rows = page.locator(".panel-row")
    rows.last.locator("button", has_text="↑").click()
    page.wait_for_timeout(500)

    # Order should be restored
    restored_names = _get_project_names(page)
    assert restored_names == initial_names


def test_hidden_project_still_activates(live_server: str, page: Page) -> None:
    """Clicking a hidden project still loads it in the main view."""
    page.goto(live_server)
    _wait_for_panel(page)

    # Get the first project's name
    initial_names = _get_project_names(page)
    target_name = initial_names[0]

    # Hide first project (× is the hide button)
    rows = page.locator(".panel-row")
    rows.nth(0).locator("button", has_text="×").click()
    page.wait_for_timeout(500)

    # Click the hidden project row (now last)
    page.locator(".panel-row").last.click()
    page.wait_for_timeout(500)

    # Verify the project is now active (gold border on left)
    last_row = page.locator(".panel-row").last
    border = last_row.evaluate("el => getComputedStyle(el).borderLeftColor")
    # FFD700 in rgb is rgb(255, 215, 0)
    assert "255" in border and "215" in border, f"Expected gold border, got {border}"


def test_state_persists_across_reload(live_server: str, page: Page) -> None:
    """Star/hide state persists after page reload."""
    page.goto(live_server)
    _wait_for_panel(page)

    initial_names = _get_project_names(page)

    # Star the second project (star is 2nd button: refresh, star, hide)
    rows = page.locator(".panel-row")
    rows.nth(1).locator("button").nth(1).click()
    page.wait_for_timeout(500)

    starred_name = initial_names[1]

    # Reload
    page.reload()
    _wait_for_panel(page)

    # Starred project should still be first
    names_after_reload = _get_project_names(page)
    assert names_after_reload[0] == starred_name, (
        f"Expected '{starred_name}' at top after reload, got '{names_after_reload[0]}'"
    )
