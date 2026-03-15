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


def test_maintenance_collector_card_renders(live_server: str, page: Page) -> None:
    """When a project has operational documents, the Maintenance & Operations card appears."""
    page.goto(live_server)
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)
    page.wait_for_timeout(500)

    # The default project (orchestration) has maintenance docs —
    # the MaintenanceCollectorCard should be visible
    card_header = page.get_by_text("Maintenance & Operations")
    expect(card_header.first).to_be_visible(timeout=5_000)


def test_maintenance_collector_card_expands(live_server: str, page: Page) -> None:
    """Clicking the maintenance collector card expands it to show document rows."""
    page.goto(live_server)
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)
    page.wait_for_timeout(500)

    # Click the card header to expand
    card_header = page.get_by_text("Maintenance & Operations").first
    expect(card_header).to_be_visible(timeout=5_000)
    card_header.click()
    page.wait_for_timeout(300)

    # After expanding, we should see document labels (REVIEW, ANALYSIS, or MAINT)
    maint_labels = page.locator("span", has_text="MAINT")
    review_labels = page.locator("span", has_text="REVIEW")
    # At least one type of operational doc label should appear
    total = maint_labels.count() + review_labels.count()
    assert total > 0, "Expected MAINT or REVIEW labels after expanding maintenance collector"


def test_no_flat_operational_heading(live_server: str, page: Page) -> None:
    """The old flat 'Operational' heading should not appear anywhere."""
    page.goto(live_server)
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)
    page.wait_for_timeout(500)

    # The old "Operational" h3 heading should be absent
    operational_heading = page.locator("h3", has_text="Operational")
    assert operational_heading.count() == 0, "Old flat 'Operational' heading still present"


def test_worktree_column_layout_renders(live_server: str, page: Page) -> None:
    """Two worktrees → horizontal layout: one strip and one expanded column."""
    # Intercept /api/worktrees to simulate two worktrees (no live MCP needed)
    page.route(
        "**/api/worktrees**",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"status":"ok","data":{"worktrees":['
                 '{"id":"wt-1","name":"Default","worktreePath":"/repo","indexRange":[100,499]},'
                 '{"id":"wt-2","name":"maintenance","worktreePath":"/repo-maintenance","indexRange":[500,699]}'
                 '],"count":2,"pathStatuses":{}}}',
        ),
    )
    page.goto(live_server)
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)
    page.wait_for_timeout(800)

    # Expanded column header should show Default worktree name
    expect(page.get_by_text("Default").first).to_be_visible(timeout=5_000)
    # The ◈ icon in the column header should appear
    diamond = page.locator("span", has_text="◈").first
    expect(diamond).to_be_visible(timeout=5_000)
    # The collapsed strip (40px div) should be present with maintenance name
    # (rotated text — check the text content exists in DOM)
    strip_text = page.locator("text=maintenanc")  # truncated to 10 chars
    expect(strip_text.first).to_be_visible(timeout=5_000)


def test_worktree_strip_toggle(live_server: str, page: Page) -> None:
    """Clicking the collapsed strip swaps which column is expanded."""
    page.route(
        "**/api/worktrees**",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"status":"ok","data":{"worktrees":['
                 '{"id":"wt-1","name":"Default","worktreePath":"/repo","indexRange":[100,499]},'
                 '{"id":"wt-2","name":"maintenance","worktreePath":"/repo-maintenance","indexRange":[500,699]}'
                 '],"count":2,"pathStatuses":{}}}',
        ),
    )
    page.goto(live_server)
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)
    page.wait_for_timeout(800)

    # Initially Default is expanded — click the maintenance strip to swap
    strip_text = page.locator("text=maintenanc").first
    expect(strip_text).to_be_visible(timeout=5_000)
    strip_text.click()
    page.wait_for_timeout(400)

    # Now maintenance should be the expanded column header
    maint_header = page.get_by_text("maintenance").first
    expect(maint_header).to_be_visible(timeout=5_000)
    # Default should now appear as the collapsed strip text
    default_strip = page.locator("text=Default").first
    expect(default_strip).to_be_visible(timeout=5_000)


def test_worktree_no_regression_single_project(live_server: str, page: Page) -> None:
    """Zero worktrees → pass-through layout, no column container."""
    # Intercept to return empty worktrees (simulates context-visualizer project)
    page.route(
        "**/api/worktrees**",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"status":"ok","data":{"worktrees":[],"count":0,"pathStatuses":{}}}',
        ),
    )
    page.goto(live_server)
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)
    page.wait_for_timeout(800)

    # No column header with ◈ icon at worktree-column level should exist
    # (The ◈ icon IS used in FutureWorkCollectorCard, but not the worktree column header)
    # Verify: no element with the specific worktree column header structure
    # The column layout div uses alignItems:stretch — check strip (40px div) is absent
    # by confirming the rotated-text worktree name pattern is not present
    strips = page.locator("[style*='writingMode']")
    assert strips.count() == 0, "Rotated strip text found unexpectedly in single-worktree mode"


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
