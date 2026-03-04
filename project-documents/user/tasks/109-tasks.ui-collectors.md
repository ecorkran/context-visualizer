---
slice: ui-collectors
project: context-visualizer
lld: user/slices/109-slice.ui-collectors.md
dependencies: [108-mcp-client]
projectState: Slice 108 (MCP Client) complete. MCP client operational with select()-based I/O. Server runs in dual mode (MCP/local). 98 tests passing.
dateCreated: 20260304
dateUpdated: 20260304
status: in_progress
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

- [ ] Add `collector` color set to `THEME.colors` in `project-structure-viz.jsx`
  - [ ] Color values: `{ bg: "#0A3A5A", text: "#E0F4FF", border: "#0870A8", accent: "#08A8F6" }`
  - [ ] Placement: after the existing `projectLevel` entry
  - [ ] Verify no syntax errors — app loads without console errors
  - [ ] Commit

### 2. Implement MaintenanceCollectorCard component

- [ ] Create `MaintenanceCollectorCard` component in `project-structure-viz.jsx`
  - [ ] Props: `{ quality, investigation, maintenance }` (the three arrays from project data)
  - [ ] Only render if at least one array is non-empty
  - [ ] Follow `InitiativeCard` visual pattern:
    1. Collapsible header with chevron toggle
    2. Glyph `⚙` in place of band number (use `collector.accent` color, dimmed like band number)
    3. Title: "Maintenance & Operations"
    4. Item count summary in header (total across all three arrays)
    5. Collapsed by default
  - [ ] Expanded body: three groups (only render each group if its array is non-empty):
    1. Reviews → `DocBlock` rows with `REVIEW` label, `THEME.colors.review` color set
    2. Analysis → `DocBlock` rows with `ANALYSIS` label, `THEME.colors.analysis` color set
    3. Maintenance → `DocBlock` rows with `MAINT` label, `THEME.colors.maintenance` color set
  - [ ] Card background/border uses `collector` color set accents (border color from `collector.border`)
  - [ ] Success: component renders correctly with sample data, matches initiative card styling

### 3. Wire MaintenanceCollectorCard into ProjectView

- [ ] Replace the existing "Operational" section in `ProjectView` with `MaintenanceCollectorCard`
  - [ ] Remove the current flat rendering block (lines ~577-586 in `ProjectView`)
  - [ ] Insert `MaintenanceCollectorCard` in same position, passing `data.quality`, `data.investigation`, `data.maintenance` as props
  - [ ] Verify the component only renders when at least one array has items (same condition as current block)
  - [ ] Success: operational documents appear inside a collapsible card instead of flat rows; no duplication; app renders correctly in both MCP and local mode

### 4. Update Legend with collector entry

- [ ] Add "Collector" entry to the `Legend` component
  - [ ] Use `THEME.colors.collector` color set
  - [ ] Place after existing entries (after "Maintenance" or at end)
  - [ ] Success: legend shows the collector color swatch with label

### 5. Commit and verify maintenance collector

- [ ] Commit tasks 1-4 as a coherent checkpoint
  - [ ] Run existing tests: `pytest tests/ -x`
  - [ ] All existing tests pass (no regressions)
  - [ ] Manual verification: app loads, maintenance collector card renders, expands/collapses correctly
  - [ ] Commit with semantic message

### 6. Add config flag support for future work collector

- [ ] Read `enableFutureWorkCollector` from `mcp-config.json` in `serve.py`
  - [ ] In `_load_mcp_config()` (or alongside it), extract `enableFutureWorkCollector` boolean (default `false`)
  - [ ] Store in a module-level variable (e.g., `_enable_future_work_collector`)
  - [ ] Update `mcp-config.example.json` to include `"enableFutureWorkCollector": false`
  - [ ] Success: config flag is read on startup; default is `false` when key is absent

### 7. Add `GET /api/future-work` endpoint

- [ ] Implement `GET /api/future-work` handler in `serve.py`
  - [ ] Accept query parameter `project` (project ID from context-forge)
  - [ ] Guard: return 503 if MCP client is not connected or `_enable_future_work_collector` is `false`
  - [ ] Call `_mcp_client.call_tool("workflow_future", {"projectId": project_id, "status": "all"})`
  - [ ] Return `{ "status": "ok", "data": <result> }` on success
  - [ ] Return `{ "status": "error", "message": "..." }` with appropriate HTTP status on failure
  - [ ] Success: endpoint returns future work data when MCP connected and flag enabled; returns 503 otherwise

### 8. Tests for config flag and future-work endpoint

- [ ] Add unit tests in `tests/test_serve.py`
  - [ ] Test: `enableFutureWorkCollector` read from config (true/false/absent)
  - [ ] Test: `GET /api/future-work` returns 503 when MCP not connected
  - [ ] Test: `GET /api/future-work` returns 503 when flag is `false`
  - [ ] Test: `GET /api/future-work` returns data when MCP connected and flag `true`
    - Extend existing `_make_mock_mcp_client` to handle `workflow_future` tool calls
    - Provide canned response matching the `workflow_future` result shape
  - [ ] Test: `GET /api/future-work` returns error when `workflow_future` call fails
  - [ ] All tests pass: `pytest tests/test_serve.py -x`
  - [ ] Commit

### 9. Add `GET /api/status` future-work flag to status response

- [ ] Include `enableFutureWorkCollector` in the `/api/status` response
  - [ ] Add `"futureWorkEnabled": bool` field to the status JSON
  - [ ] Frontend will use this to know whether to fetch future work data
  - [ ] Update existing `/api/status` tests if needed
  - [ ] Commit

### 10. Frontend: fetch future work data conditionally

- [ ] Update `loadProjects()` in `index.html` to conditionally fetch future work
  - [ ] After loading project structures (MCP mode only), check `/api/status` for `futureWorkEnabled`
  - [ ] If enabled, for each project call `GET /api/future-work?project={projectId}`
  - [ ] Attach result to project data under a `futureWork` key (or `null` if unavailable)
  - [ ] In local mode or when disabled, set `futureWork: null` on each project
  - [ ] Success: project data includes `futureWork` field; no errors when feature is disabled or MCP unavailable

### 11. Implement FutureWorkCollectorCard component

- [ ] Create `FutureWorkCollectorCard` component in `project-structure-viz.jsx`
  - [ ] Props: `{ futureWork }` (the `futureWork` object from project data, or `null`)
  - [ ] Only render if `futureWork` is non-null and has groups with items
  - [ ] Follow collector card visual pattern:
    1. Collapsible header with chevron toggle
    2. Glyph `◈` in place of band number (use `collector.accent` color, dimmed)
    3. Title: "Future Work"
    4. Summary counts in header: `completedItems/totalItems` with progress-style display
    5. Collapsed by default
  - [ ] Expanded body: one collapsible sub-group per source initiative
    1. Sub-group header: initiative name + group item counts (`completedItems/totalItems`)
    2. Items as lightweight rows (not full `DocBlock`): index, name, done/pending indicator
    3. Done items: dimmed text, checkmark or strikethrough styling
    4. Pending items: normal opacity, open-circle or dash indicator
  - [ ] Uses `collector` color set for card chrome
  - [ ] Success: component renders correctly with sample data; sub-groups expand/collapse independently

### 12. Wire FutureWorkCollectorCard into ProjectView

- [ ] Add `FutureWorkCollectorCard` to `ProjectView`, after `MaintenanceCollectorCard`
  - [ ] Pass `data.futureWork` as prop
  - [ ] Component handles null/missing data gracefully (renders nothing)
  - [ ] Success: future work card appears when data is available; absent when disabled or no data

### 13. Commit and verify future work collector

- [ ] Commit tasks 6-12 as a coherent checkpoint
  - [ ] Run all tests: `pytest tests/ -x`
  - [ ] All tests pass
  - [ ] Manual verification with MCP connected and `enableFutureWorkCollector: true`:
    - Future work card renders with grouped items
    - Items show done/pending state correctly
    - Sub-groups expand/collapse
  - [ ] Manual verification with flag `false` or MCP disconnected:
    - Future work card does not appear
    - No console errors
  - [ ] Commit with semantic message

### 14. E2E test for maintenance collector

- [ ] Add E2E test for the maintenance collector card
  - [ ] Use existing `live_server` fixture and Playwright pattern from `tests/test_ui_smoke.py`
  - [ ] Test: when project has operational documents, a "Maintenance & Operations" card appears
  - [ ] Test: card is clickable and expands to show document rows
  - [ ] Test: old flat "Operational" section heading is absent
  - [ ] All tests pass: `pytest tests/ -x`
  - [ ] Commit

### 15. Final verification and cleanup

- [ ] Run full test suite: `pytest tests/ -x`
  - [ ] All tests pass (no regressions from slice 108 baseline of 98 tests)
  - [ ] App loads correctly in both MCP and local modes
  - [ ] Maintenance collector renders in both modes
  - [ ] Future work collector renders only in MCP mode with flag enabled
  - [ ] No console errors in either mode
  - [ ] Commit any final adjustments

### 16. Update slice and project documents

- [ ] Mark slice 109 as complete in relevant documents
  - [ ] Update `109-slice.ui-collectors.md` frontmatter: `status: complete` (or in_progress during work)
  - [ ] Update this task file frontmatter: `status: complete`
  - [ ] Write DEVLOG entry for slice 109 (matching existing format: commits, files, decisions, test count)
  - [ ] Commit documentation updates
