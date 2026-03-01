"""E2E tests for the 'Find projects' discover section in ProjectPanel."""

from __future__ import annotations

import pytest
from playwright.sync_api import Page, expect


pytestmark = pytest.mark.e2e


def _expand_panel(page: Page) -> None:
    """Ensure the ProjectPanel is expanded."""
    collapse_btn = page.get_by_title("Collapse panel")
    if not collapse_btn.is_visible():
        page.get_by_title("Expand panel").click()
        page.wait_for_timeout(300)


def test_discover_section_expands(live_server: str, page: Page) -> None:
    """Clicking 'Find projects' toggle opens the discover section with a root input."""
    page.goto(live_server)
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)

    _expand_panel(page)

    # Toggle should be visible and collapsed
    toggle = page.get_by_role("button", name="Find projects ›")
    expect(toggle).to_be_visible()

    # Root input should not be visible yet
    root_input = page.get_by_placeholder("Root directory...")
    expect(root_input).to_be_hidden()

    # Click toggle to expand
    toggle.click()
    page.wait_for_timeout(500)

    # Root input should now be visible and pre-populated from /api/info
    expect(root_input).to_be_visible()
    root_value = root_input.input_value()
    assert root_value != "", "Root input should be pre-populated from GET /api/info"


def test_discover_find_populates_results(live_server: str, page: Page) -> None:
    """Clicking Find with a valid root directory populates the results list."""
    page.goto(live_server)
    page.get_by_text("Project Structure").first.wait_for(timeout=10_000)

    _expand_panel(page)

    # Open the discover section
    page.get_by_role("button", name="Find projects ›").click()
    page.wait_for_timeout(500)

    # Root input should have a value from /api/info
    root_input = page.get_by_placeholder("Root directory...")
    root_value = root_input.input_value()
    assert root_value != "", "Root should be pre-populated"

    # Click Find
    find_btn = page.get_by_role("button", name="Find", exact=True)
    expect(find_btn).to_be_enabled()
    find_btn.click()

    # Wait for results — at least one candidate row (● or ○ indicator) should appear
    page.wait_for_timeout(3000)
    indicators = page.locator("text=●").or_(page.locator("text=○"))
    expect(indicators.first).to_be_visible(timeout=5_000)
