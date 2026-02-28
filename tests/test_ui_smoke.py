"""Smoke tests — verify the app loads and renders in a real browser."""

from __future__ import annotations

import pytest
from playwright.sync_api import Page, expect


pytestmark = pytest.mark.e2e


def test_app_loads_and_shows_title(live_server: str, page: Page) -> None:
    """App should render the main heading after loading project data."""
    page.goto(live_server)
    heading = page.get_by_text("Project Structure")
    expect(heading.first).to_be_visible(timeout=10_000)


def test_at_least_one_project_visible(live_server: str, page: Page) -> None:
    """At least one project tab or name should be visible after load."""
    page.goto(live_server)
    # Wait for the app to finish loading and render project content
    page.wait_for_selector("[data-testid='project-tab'], button", timeout=10_000)
    # The tab bar shows project names as buttons — at least one should exist
    buttons = page.locator("button")
    expect(buttons.first).to_be_visible()


def test_no_console_errors(live_server: str, page: Page) -> None:
    """No console errors should occur during initial page load."""
    errors: list[str] = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

    page.goto(live_server)
    # Wait for app to fully render
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)
    # Brief pause for any deferred errors
    page.wait_for_timeout(500)

    assert errors == [], f"Console errors during load: {errors}"
