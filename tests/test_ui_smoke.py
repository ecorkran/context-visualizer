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
    """No unexpected console errors during initial page load.

    In local mode, /api/structures returns 503 (expected — triggers fallback).
    The browser logs this as a resource error, which we explicitly allow.
    All other console errors are unexpected and fail the test.
    """
    errors: list[str] = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

    page.goto(live_server)
    # Wait for app to fully render
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)
    # Brief pause for any deferred errors
    page.wait_for_timeout(500)

    # Filter out the expected 503 from /api/structures in local mode
    unexpected = [
        e for e in errors
        if "503" not in e and "Service Unavailable" not in e
    ]
    assert unexpected == [], f"Unexpected console errors during load: {unexpected}"


def test_local_mode_no_mcp_label(live_server: str, page: Page) -> None:
    """In local mode (no MCP config), the 'MCP' badge should not be visible."""
    page.goto(live_server)
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)
    page.wait_for_timeout(300)

    # The MCP badge should not be present in local mode
    mcp_badge = page.locator("span", has_text="MCP").filter(has_text="MCP")
    # Use count to check absence without raising
    count = mcp_badge.count()
    assert count == 0, f"MCP badge unexpectedly visible in local mode (count={count})"
