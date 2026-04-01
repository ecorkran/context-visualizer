---
slice: ui-collectors
project: context-visualizer
lld: user/slices/109-slice.ui-collectors.md
dependencies: [108-mcp-client]
projectState: Slice 108 (MCP Client) complete. MCP client operational with select()-based I/O. Server runs in dual mode (MCP/local). 98 tests passing.
dateCreated: 20260304
dateUpdated: 20260304
status: complete
---

## Context Summary

- Working on slice 109: Collectors — Maintenance and Future Work
- Slice 108 (MCP Client) is complete — `McpClient`, `/api/structures`, dual-mode operation all working
- This slice adds two synthetic collector initiatives to the visualizer UI:
  1. **Maintenance collector** — reshapes existing `data.maintenance/quality/investigation` into a collapsible initiative card (replaces flat "Operational" section)
  2. **Future work collector** — fetches aggregated future work via MCP `workflow_future` tool, rendered as a second collector card (MCP-only, config-gated)
- No changes to `parse.py` or data model — collectors are presentation-layer only
- Color set: saturated blue `#08A8F6`
- Config flag: `enableFutureWorkCollector` in `mcp-config.json` (default `false`)

---

## Tasks

### 1. Add collector color set to THEME

- [x] Add `collector` color set to `THEME.colors` in `project-structure-viz.jsx`
  - [x] Color values: `{ bg: "#0A3A5A", text: "#E0F4FF", border: "#0870A8", accent: "#08A8F6" }`
  - [x] Placement: after the existing `projectLevel` entry
  - [x] Verify no syntax errors — app loads without console errors
  - [x] Commit

### 2. Implement MaintenanceCollectorCard component

- [x] Create `MaintenanceCollectorCard` component in `project-structure-viz.jsx`
  - [x] Props: `{ quality, investigation, maintenance }` (the three arrays from project data)
  - [x] Only render if at least one array is non-empty
  - [x] Follow `InitiativeCard` visual pattern:
    1. Collapsible header with chevron toggle
    2. Glyph `⚙` in place of band number (use `collector.accent` color, dimmed like band number)
    3. Title: "Maintenance & Operations"
    4. Item count summary in header (total across all three arrays)
    5. Collapsed by default
  - [x] Expanded body: three groups (only render each group if its array is non-empty):
    1. Reviews → `DocBlock` rows with `REVIEW` label, `THEME.colors.review` color set
    2. Analysis → `DocBlock` rows with `ANALYSIS` label, `THEME.colors.analysis` color set
    3. Maintenance → `DocBlock` rows with `MAINT` label, `THEME.colors.maintenance` color set
  - [x] Card background/border uses `collector` color set accents (border color from `collector.border`)
  - [x] Success: component renders correctly with sample data, matches initiative card styling

### 3. Wire MaintenanceCollectorCard into ProjectView

- [x] Replace the existing "Operational" section in `ProjectView` with `MaintenanceCollectorCard`
  - [x] Remove the current flat rendering block (lines ~577-586 in `ProjectView`)
  - [x] Insert `MaintenanceCollectorCard` in same position, passing `data.quality`, `data.investigation`, `data.maintenance` as props
  - [x] Verify the component only renders when at least one array has items (same condition as current block)
  - [x] Success: operational documents appear inside a collapsible card instead of flat rows; no duplication; app renders correctly in both MCP and local mode

### 4. Update Legend with collector entry

- [x] Add "Collector" entry to the `Legend` component
  - [x] Use `THEME.colors.collector` color set
  - [x] Place after existing entries (after "Maintenance" or at end)
  - [x] Success: legend shows the collector color swatch with label

### 5. Commit and verify maintenance collector

- [x] Commit tasks 1-4 as a coherent checkpoint
  - [x] Run existing tests: `pytest tests/ -x`
  - [x] All existing tests pass (no regressions)
  - [x] Manual verification: app loads, maintenance collector card renders, expands/collapses correctly
  - [x] Commit with semantic message

### 6. Add config flag support for future work collector

- [x] Read `enableFutureWorkCollector` from `mcp-config.json` in `serve.py`
  - [x] In `_load_mcp_config()` (or alongside it), extract `enableFutureWorkCollector` boolean (default `false`)
  - [x] Store in a module-level variable (e.g., `_enable_future_work_collector`)
  - [x] Update `mcp-config.example.json` to include `"enableFutureWorkCollector": false`
  - [x] Success: config flag is read on startup; default is `false` when key is absent

### 7. Add `GET /api/future-work` endpoint

- [x] Implement `GET /api/future-work` handler in `serve.py`
  - [x] Accept query parameter `project` (project ID from context-forge)
  - [x] Guard: return 503 if MCP client is not connected or `_enable_future_work_collector` is `false`
  - [x] Call `_mcp_client.call_tool("workflow_future", {"projectId": project_id, "status": "all"})`
  - [x] Return `{ "status": "ok", "data": <result> }` on success
  - [x] Return `{ "status": "error", "message": "..." }` with appropriate HTTP status on failure
  - [x] Success: endpoint returns future work data when MCP connected and flag enabled; returns 503 otherwise

### 8. Tests for config flag and future-work endpoint

- [x] Add unit tests in `tests/test_serve.py`
  - [x] Test: `enableFutureWorkCollector` read from config (true/false/absent)
  - [x] Test: `GET /api/future-work` returns 503 when MCP not connected
  - [x] Test: `GET /api/future-work` returns 503 when flag is `false`
  - [x] Test: `GET /api/future-work` returns data when MCP connected and flag `true`
    - [x] Extend existing `_make_mock_mcp_client` to handle `workflow_future` tool calls
    - [x] Provide canned response matching the `workflow_future` result shape
  - [x] Test: `GET /api/future-work` returns error when `workflow_future` call fails
  - [x] All tests pass: `pytest tests/test_serve.py -x`
  - [x] Commit

### 9. Add `GET /api/status` future-work flag to status response

- [x] Include `enableFutureWorkCollector` in the `/api/status` response
  - [x] Add `"futureWorkEnabled": bool` field to the status JSON
  - [x] Frontend will use this to know whether to fetch future work data
  - [x] Update existing `/api/status` tests if needed
  - [x] Commit

### 10. Frontend: fetch future work data conditionally

- [x] Update `loadProjects()` in `index.html` to conditionally fetch future work
  - [x] After loading project structures (MCP mode only), check `/api/status` for `futureWorkEnabled`
  - [x] If enabled, for each project call `GET /api/future-work?project={projectId}`
  - [x] Attach result to project data under a `futureWork` key (or `null` if unavailable)
  - [x] In local mode or when disabled, set `futureWork: null` on each project
  - [x] Success: project data includes `futureWork` field; no errors when feature is disabled or MCP unavailable

### 11. Implement FutureWorkCollectorCard component

- [x] Create `FutureWorkCollectorCard` component in `project-structure-viz.jsx`
  - [x] Props: `{ futureWork }` (the `futureWork` object from project data, or `null`)
  - [x] Only render if `futureWork` is non-null and has groups with items
  - [x] Follow collector card visual pattern:
    1. Collapsible header with chevron toggle
    2. Glyph `◈` in place of band number (use `collector.accent` color, dimmed)
    3. Title: "Future Work"
    4. Summary counts in header: `completedItems/totalItems` with progress-style display
    5. Collapsed by default
  - [x] Expanded body: one collapsible sub-group per source initiative
    1. Sub-group header: initiative name + group item counts (`completedItems/totalItems`)
    2. Items as lightweight rows (not full `DocBlock`): index, name, done/pending indicator
    3. Done items: dimmed text, checkmark or strikethrough styling
    4. Pending items: normal opacity, open-circle or dash indicator
  - [x] Uses `collector` color set for card chrome
  - [x] Success: component renders correctly with sample data; sub-groups expand/collapse independently

### 12. Wire FutureWorkCollectorCard into ProjectView

- [x] Add `FutureWorkCollectorCard` to `ProjectView`, after `MaintenanceCollectorCard`
  - [x] Pass `data.futureWork` as prop
  - [x] Component handles null/missing data gracefully (renders nothing)
  - [x] Success: future work card appears when data is available; absent when disabled or no data

### 13. Commit and verify future work collector

- [x] Commit tasks 6-12 as a coherent checkpoint
  - [x] Run all tests: `pytest tests/ -x`
  - [x] All tests pass
  - [x] Manual verification with MCP connected and `enableFutureWorkCollector: true`:
    - [x] Future work card renders with grouped items
    - [x] Items show done/pending state correctly
    - [x] Sub-groups expand/collapse
  - [x] Manual verification with flag `false` or MCP disconnected:
    - [x] Future work card does not appear
    - [x] No console errors
  - [x] Commit with semantic message

### 14. E2E test for maintenance collector

- [x] Add E2E test for the maintenance collector card
  - [x] Use existing `live_server` fixture and Playwright pattern from `tests/test_ui_smoke.py`
  - [x] Test: when project has operational documents, a "Maintenance & Operations" card appears
  - [x] Test: card is clickable and expands to show document rows
  - [x] Test: old flat "Operational" section heading is absent
  - [x] All tests pass: `pytest tests/ -x`
  - [x] Commit

### 15. Final verification and cleanup

- [x] Run full test suite: `pytest tests/ -x`
  - [x] All tests pass (no regressions from slice 108 baseline of 98 tests)
  - [x] App loads correctly in both MCP and local modes
  - [x] Maintenance collector renders in both modes
  - [x] Future work collector renders only in MCP mode with flag enabled
  - [x] No console errors in either mode
  - [x] Commit any final adjustments

### 16. Update slice and project documents

- [x] Mark slice 109 as complete in relevant documents
  - [x] Update `109-slice.ui-collectors.md` frontmatter: `status: complete` (or in_progress during work)
  - [x] Update this task file frontmatter: `status: complete`
  - [x] Write DEVLOG entry for slice 109 (matching existing format: commits, files, decisions, test count)
  - [x] Commit documentation updates
