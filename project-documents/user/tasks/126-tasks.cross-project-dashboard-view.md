---
docType: tasks
slice: cross-project-dashboard-view
project: context-visualizer
lld: user/slices/126-slice.cross-project-dashboard-view.md
dependencies:
  - 121-slice.project-panel-ui
  - 123-slice.mcp-client
projectState: >
  Initiative 120 complete through slice 125. Panel renders project list from
  manifest.json via GET /api/projects with starred/hidden state. serve.py has
  do_GET, do_POST, do_DELETE, do_PATCH handlers. MCP client integration (slice
  123) provides _mcp_client and _mcp_name_to_id helpers. /api/structures
  endpoint already fans out project_structure calls per project. project-structure-viz.jsx
  has ProjectPanel as the navigation surface; root component manages active
  project state and refreshState. All 134 tests passing.
dateCreated: 20260417
dateUpdated: 20260417
status: complete
---

## Context Summary

- Slice 126: Cross-Project Dashboard View
- New `GET /api/dashboard` endpoint in `serve.py` aggregating per-project MCP calls
- Three new JSX components: `ViewModeToggle`, `ProjectDashboard`, `ProjectTile`
- New `src/theme.js` module defining `--status-*` CSS custom property tokens
- Root component gains `viewMode` state and `refreshSignal` plumbing
- View toggle in panel header; tile click = activate project + switch to detail view
- MCP-only; 503 placeholder when disconnected
- Sequential MCP fan-out (lock-serialized client — no parallelism)

---

## Task 1: Theme token module

- [x] Create `src/theme.js` (if a `src/` directory does not exist, place alongside `project-structure-viz.jsx`)
  - [x] Define and export `STATUS_COLORS` object mapping token names to hex values:
    - `--status-ok`: seafoam green (~`#7FC9B8`)
    - `--status-info`: light blue/seafoam-blue (~`#5BB8D4`)
    - `--status-waiting`: light purple (~`#A78BCA`)
    - `--status-complete`: muted green (~`#6BAF8A`)
    - `--status-warning`: amber (~`#E8B84B`) — reserved, unused this slice
    - `--status-error`: red (~`#E85B5B`) — reserved for dashboard-side errors only
  - [x] Define and export `PHASE_ACCENT` lookup: maps phase number ranges to token names
    - phases 1–3 → `--status-waiting`
    - phases 4–6 → `--status-info`
    - phase 7+ → `--status-complete`
    - unknown/null → `--status-ok`
  - [x] Export a helper `injectStatusTokens()` that writes all `STATUS_COLORS` entries as CSS custom properties onto `document.documentElement` (`:root`)
  - [x] Export a helper `phaseAccentColor(phaseString)` that parses the phase number from a phase string (e.g. `"Phase 4: Slice Design"`) and returns the resolved hex value for the corresponding token
  - [x] No hex literals for `--status-*` values exist anywhere outside this file

## Task 2: Test theme module

- [x] Add unit tests for `src/theme.js` logic (use the existing test runner/framework pattern in `tests/`)
  - [x] `phaseAccentColor("Phase 2: ...")` returns the `--status-waiting` hex value
  - [x] `phaseAccentColor("Phase 5: ...")` returns the `--status-info` hex value
  - [x] `phaseAccentColor("Phase 7: ...")` returns the `--status-complete` hex value
  - [x] `phaseAccentColor(null)` returns the `--status-ok` hex value
  - [x] `phaseAccentColor("")` returns the `--status-ok` hex value
  - [x] All tests pass

---

## Task 3: `GET /api/dashboard` endpoint

- [x] Add `_handle_dashboard()` method to the Handler class in `serve.py`
  - [x] Return 503 `{"status": "error", "message": "MCP unavailable"}` if `_mcp_client` is None or not connected
  - [x] Call `_read_projects()` (or equivalent) to get the manifest project list
  - [x] Filter to non-hidden projects only; preserve existing starred-first order
  - [x] For each project, resolve MCP project ID via `_mcp_name_to_id` (populate via `project_list` if cache is empty)
  - [x] For each project, call sequentially: `workflow_status`, `workflow_next`, `workflow_check` (no args)
  - [x] On any per-project MCP failure: log warning, set `tileState: "error"`, null out unavailable fields — do not abort the full response
  - [x] Assemble per-project object matching the API spec in the slice design
  - [x] Return `{"status": "ok", "projects": [...]}` with HTTP 200
- [x] Wire `GET /api/dashboard` into `do_GET` dispatch in `serve.py`
- [x] Commit: `feat: add GET /api/dashboard endpoint`

## Task 4: Test `/api/dashboard` endpoint

- [x] Add tests in the existing test suite (new test class or file as appropriate)
  - [x] Test: returns 503 when MCP client is not connected
  - [x] Test: hidden projects are excluded from the payload
  - [x] Test: starred projects appear before unstarred in the payload
  - [x] Test: successful response matches documented JSON shape (status, projects array, all fields present)
  - [x] Test: per-project MCP failure sets `tileState: "error"` without aborting the full response
  - [x] Test: `workflow_status.phase` used for `phase` field (not `project_get.developmentPhase`)
  - [x] Test: `findings` object contains `errors`, `warnings`, `infos`, `total` keys
  - [x] All tests pass; commit: `test: add tests for GET /api/dashboard`

---

## Task 5: Root component — `viewMode` state and wiring

- [x] In `project-structure-viz.jsx`, add `viewMode` state to the root component
  - [x] Initialize from `localStorage.getItem('cv.viewMode')` — default to `"detail"` if not set
  - [x] Persist to `localStorage` whenever `viewMode` changes
  - [x] Pass `viewMode` and `setViewMode` down to `ProjectPanel` (for the toggle) and the content area (for view switching)
- [x] Add `refreshSignal` mechanism (e.g. an incrementing counter in state) passed to `ProjectDashboard`
  - [x] Increment `refreshSignal` whenever the panel's "refresh all" action completes
- [x] Update the content area render: when `viewMode === "dashboard"` render `ProjectDashboard`; when `"detail"` render the existing per-project detail view
- [x] Trigger dashboard refetch when star/hide PATCH completes and `viewMode === "dashboard"` (pass a callback or increment a signal)

## Task 6: Test root component view-mode wiring

- [x] Verify in browser (manual):
  - [x] Default view on fresh load is "detail"
  - [x] Switching to "dashboard" persists across page reload
  - [x] Switching back to "detail" persists across page reload
  - [x] No console errors during switching
- [x] Automated: add a test that the root component renders `ProjectDashboard` when `viewMode` prop is `"dashboard"` and the detail view when `"detail"` (mock child components as needed)
- [x] All tests pass

---

## Task 7: `ViewModeToggle` component

- [x] Add `ViewModeToggle` component in `project-structure-viz.jsx` (or separate file consistent with project conventions)
  - [x] Props: `viewMode` (`"detail" | "dashboard"`), `onToggle` (callback)
  - [x] Renders a two-state control near the existing refresh button in the panel header
  - [x] Active mode visually distinguished (e.g. highlighted/underlined label)
  - [x] Clicking "Detail" calls `onToggle("detail")`; clicking "Dashboard" calls `onToggle("dashboard")`
  - [x] No inline hex literals — use existing panel color variables or new token variables
- [x] Integrate into `ProjectPanel` header alongside the refresh button

## Task 8: Test `ViewModeToggle`

- [x] Verify in browser (manual):
  - [x] Toggle appears in panel header in both collapsed and expanded panel states
  - [x] Clicking each state switches the content area correctly
  - [x] Active state is visually clear
- [x] Automated: add unit test that `ViewModeToggle` calls `onToggle` with the correct value on click
- [x] All tests pass

---

## Task 9: `ProjectDashboard` component

- [x] Add `ProjectDashboard` component in `project-structure-viz.jsx` (or separate file)
  - [x] Props: `refreshSignal` (number), `onActivate` (callback with project key), `onSwitchToDetail` (callback)
  - [x] On mount and whenever `refreshSignal` changes: fetch `GET /api/dashboard`
  - [x] While fetching: show a loading state (spinner or "Loading…" text)
  - [x] On 503 or network error: show a single centered "MCP unavailable" placeholder, no tiles
  - [x] On success: render a CSS grid (`grid-template-columns: 1fr 1fr`, gap 16px) of `ProjectTile` components
  - [x] Pass tile click handler: calls `onActivate(key)` then `onSwitchToDetail()`
  - [x] Inject status CSS tokens on mount via `injectStatusTokens()` from `theme.js`

## Task 10: Test `ProjectDashboard`

- [x] Automated tests (mock `fetch`):
  - [x] Renders loading state while fetch is in-flight
  - [x] Renders "MCP unavailable" placeholder on 503
  - [x] Renders correct number of `ProjectTile` instances on success
  - [x] Re-fetches when `refreshSignal` increments
  - [x] Tile click calls `onActivate` and `onSwitchToDetail`
- [x] Manual browser: dashboard grid fills the content area width; equal-height tiles visible
- [x] All tests pass

---

## Task 11: `ProjectTile` component

- [x] Add `ProjectTile` component in `project-structure-viz.jsx` (or separate file)
  - [x] Props: project object (`key`, `displayName`, `color`, `phase`, `activeSlice`, `recommendation`, `findings`, `tileState`)
  - [x] Fixed height (e.g. 140px); fills grid column width
  - [x] Left border or subtle background tint as accent: `--status-error` hex if `tileState === "error"`, else `phaseAccentColor(phase)` from `theme.js`
  - [x] Layout (top to bottom):
    - Top row: color dot + project name (bold, left) + findings badge (right, only if `findings.total > 0`)
    - Phase line: muted text below name
    - Active slice row: slice name + status chip (e.g. pill label with status string)
    - Recommendation line: 2-line clamp; muted `—` if `recommendation` is empty/null
  - [x] Findings badge: shows `findings.total`; tooltip shows breakdown (`errors / warnings / infos`)
  - [x] Entire tile is clickable (cursor pointer); click propagates to `ProjectDashboard` handler
  - [x] No hex literals for `--status-*` values — all resolved via `theme.js`

## Task 12: Test `ProjectTile`

- [x] Automated unit tests:
  - [x] Renders project name, phase, active slice name, recommendation
  - [x] Renders muted `—` when `recommendation` is empty string
  - [x] Renders muted `—` when `recommendation` is null
  - [x] Renders findings badge when `findings.total > 0`; badge absent when `findings.total === 0`
  - [x] Applies `--status-error` accent when `tileState === "error"`
  - [x] Applies phase-based neutral accent when `tileState === "ok"`
  - [x] Click triggers the tile click handler
- [x] Manual browser: tile layout matches spec; badge tooltip shows breakdown on hover
- [x] All tests pass; commit: `feat: add ProjectTile, ProjectDashboard, ViewModeToggle components`

---

## Task 13: Integration — end-to-end wiring verification

- [x] Start server with MCP connected; open app in browser
  - [x] Toggle to Dashboard — tiles appear for all non-hidden projects, starred first
  - [x] Tile contents match `cf status` output for each project
  - [x] Recommendation line populated or shows `—`
  - [x] Click a tile — activates project, switches to detail view
  - [x] Star a project in panel — dashboard re-sorts on next fetch/refresh
  - [x] Hide a project in panel — tile disappears from dashboard
  - [x] Panel "refresh all" while in dashboard — tiles update
  - [x] Reload page — view mode persists
- [x] Stop MCP server, reload — "MCP unavailable" placeholder shown
- [x] `curl localhost:PORT/api/dashboard | jq .` — payload matches documented shape
- [x] No console errors in normal operation

## Task 14: Playwright E2E tests

- [x] Add E2E test file `tests/test_e2e_dashboard.py` (or equivalent)
  - [x] Test: toggle to Dashboard — tile grid visible, at least one tile rendered
  - [x] Test: star a project → dashboard re-sorts (starred tile is first)
  - [x] Test: hide a project → tile count decreases by one
  - [x] Test: click a tile → switches to detail view, correct project active
  - [x] Test: MCP unavailable (mock or stop server) → placeholder visible, no tiles
- [x] All E2E tests pass; commit: `test: add Playwright E2E tests for dashboard view`

---

## Task 15: Final cleanup and commit

- [x] Confirm no `--status-*` hex literals exist outside `src/theme.js` (`grep --status- *.jsx *.js`)
- [x] Confirm no console errors in any tested scenario
- [x] Run full test suite — all tests pass
- [x] Update slice file `126-slice.cross-project-dashboard-view.md` frontmatter: `status: complete`
- [x] Check off slice 126 in `120-slices.project-management.md`
- [x] Write DEVLOG entry for slice 126 (commits, summary)
- [x] Commit: `docs: mark slice 126 complete, update DEVLOG`
