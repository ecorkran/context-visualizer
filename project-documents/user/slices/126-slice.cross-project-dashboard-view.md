---
docType: slice-design
project: context-visualizer
initiative: 120
sliceIndex: 126
sliceName: cross-project-dashboard-view
dateCreated: 20260417
dateUpdated: 20260417
status: complete
dependencies:
  - 121-slice.project-panel-ui
  - 123-slice.mcp-client
lld: 120-arch.project-management
interfaces:
  consumes:
    - MCP project_get
    - MCP workflow_status
    - MCP workflow_next
    - MCP workflow_check
    - GET /api/projects (for starred/hidden state)
  provides:
    - GET /api/dashboard
    - view-mode toggle in panel header
    - status-color CSS custom property tokens
---

# Slice Design: Cross-Project Dashboard View

## Overview

A new top-level view that answers "what's going on across every project I track" at a glance. The right-side content area swaps between the existing per-project detail view and a grid of status tiles, toggled from the panel header. Each tile summarizes one project: name, phase, active slice, and a one-line recommendation from MCP. Starred projects come first; hidden projects are excluded entirely. MCP-only — local mode is out of scope.

The goal is portfolio-level awareness without drilling into each project. The slice also introduces a single theme definition for status colors so later palette tweaks touch one file.

## Decisions

### View toggle lives in the panel header
A new toggle control in the panel header swaps the right-side content between `ProjectDetail` (current behavior) and `ProjectDashboard` (new). The panel's own collapsed/expanded state is independent of the view mode — the user can dashboard with the panel expanded or collapsed. Active mode persisted in `localStorage` under `cv.viewMode` with values `"detail" | "dashboard"`.

### Tile click activates project and switches to detail view
Clicking any tile sets the active project to that tile's key and switches the view mode back to `"detail"`. This is the primary "drill in" affordance. No in-tile expansion.

### "What's going on" line
Pulled from `workflow_next.recommendation`. If the response is missing, empty, or equivalent to "no action needed," the tile renders a muted em-dash (`—`) in that slot rather than a verbatim "nothing to do" string. Most projects have something outstanding; the muted fallback handles the rare idle case without visual noise.

### Phase comes from `workflow_status`
`workflow_status.phase` is the canonical source. `project_get.developmentPhase` is not used for the tile's phase display — it can drift from workflow state.

### Status color mapping — consistency findings do NOT drive tile color
`workflow_check` returns low-level recordkeeping mismatches (task-vs-plan checkbox drift, frontmatter vs. computed state, etc.). None of these represent a project-critical condition, so they never color a tile red or yellow.

- **Red (`--status-error`)** — reserved for dashboard-side errors: MCP unreachable for this project, a fan-out call threw, or the response was malformed.
- **Yellow (`--status-warning`)** — reserved for a future explicit "needs attention" signal. Not emitted by this slice.
- **Neutral palette** — applied per phase (see Theme Tokens). All healthy tiles fall here.

If `workflow_check.totalFindings > 0`, the tile shows a small info badge with the count and a tooltip summarizing severity breakdown. Purely informational; does not change the accent color.

### Theme tokens
Status colors defined once as CSS custom properties on `:root`. Components reference the variable name, never a hex literal. Phase-to-palette mapping is a single JS lookup object in a new `src/theme.js` module, exported and imported by the tile component.

```
--status-ok:       seafoam green (e.g. #7FC9B8)   // healthy, not currently used as an accent
--status-info:     light blue / seafoam-blue       // phase 4-6
--status-waiting:  light purple                    // phase 1-3 (design/planning)
--status-complete: muted green                     // phase 7+ or slice-plan complete
--status-warning:  amber (reserved, unused this slice)
--status-error:    red (reserved for dashboard-side errors only)
```

Exact hex values chosen during implementation; all live in `src/theme.js` (or equivalent single file). No hex literal for any `--status-*` value anywhere outside that file.

### `/api/dashboard` is a separate endpoint
Does not reuse `/api/structures`. Shape is flat, per-project status — different from the structure tree. Reuses `_mcp_client` and `_mcp_name_to_id` helpers in `serve.py`.

### Refresh semantics
- Dashboard fetches on mount and whenever the user switches into dashboard mode.
- Dashboard re-fetches when star/hide state changes in the panel (dashboard depends on starred-order and hidden-exclusion).
- The existing panel "refresh all" button also triggers a dashboard refetch when dashboard mode is active.
- No separate refresh control inside the dashboard view.

### MCP disconnected
If `_mcp_client` is not connected, `/api/dashboard` returns `{ status: "error", message: "MCP unavailable" }` with HTTP 503. The dashboard renders a single centered "MCP unavailable" placeholder — no tiles, no skeletons.

## API Specification

### `GET /api/dashboard`

**Request:** no parameters.

**Response (200, MCP connected):**
```json
{
  "status": "ok",
  "projects": [
    {
      "key": "context-forge",
      "displayName": "Context Forge",
      "color": "#B87FE8",
      "phase": "Phase 6: Implementation",
      "activeSlice": {
        "name": "worktree-api-proxy",
        "index": 140,
        "status": "in-implementation"
      },
      "recommendation": "Complete task 3 of worktree-api-proxy before merging.",
      "findings": {
        "errors": 0,
        "warnings": 2,
        "infos": 1,
        "total": 3
      },
      "tileState": "ok"
    }
  ]
}
```

**Response (503, MCP disconnected):**
```json
{ "status": "error", "message": "MCP unavailable" }
```

**Per-project error handling within a 200 response:** if a project's MCP calls fail (but the client itself is connected), that project's entry is still returned with `tileState: "error"` and null fields where data was unavailable. Lets the dashboard render partial state without a full failure.

**Fields:**
- `key` — manifest key (matches `/api/projects` key)
- `displayName` — from `/api/projects`
- `color` — project color (existing derivation)
- `phase` — `workflow_status.phase` (string; may be null if unavailable)
- `activeSlice` — `workflow_status.activeSlice` (object with `name`, `index`, `status`; may be null)
- `recommendation` — `workflow_next.recommendation` (string; may be empty)
- `findings` — aggregated counts from `workflow_check` (default args)
- `tileState` — `"ok" | "error"` — controls accent color on the client side

**Ordering:** starred projects first (in the order returned by `/api/projects` which already sorts starred first), unstarred next. Hidden projects excluded entirely — not in the payload.

## Server-Side Data Flow

For each non-hidden project in `/api/projects`:
1. Resolve MCP project ID via `_mcp_name_to_id` (populate cache via `project_list` if needed).
2. Call `workflow_status`, `workflow_next`, `workflow_check` (default args — all-slices mode) concurrently.
3. Assemble the per-project object. On any call failure, set `tileState: "error"` and log.

**Fan-out is sequential.** `mcp_client.MCPClient.call_tool` is guarded by `threading.Lock` (single subprocess over stdin/stdout pipes), so thread pools and `asyncio.gather` would not actually parallelize — they'd serialize on the lock. `/api/dashboard` therefore issues its MCP calls sequentially in a simple `for` loop, matching the synchronous server pattern already established by `/api/structures`. If dashboard latency later becomes a problem, the right fix is at the MCP-client layer (request pipelining or a second subprocess), not at the endpoint layer — out of scope for this slice.

## Client-Side Components

### `ViewModeToggle` (new)
Small control rendered in the panel header, near the existing refresh button. Two-state toggle: "Detail" / "Dashboard." Writes to `localStorage.cv.viewMode` and lifts state up to the root component.

### `ProjectDashboard` (new)
Top-level view rendered in the right-side content area when `viewMode === "dashboard"`. Responsible for:
- Fetching `/api/dashboard` on mount and on refresh signals.
- Rendering the 2-column tile grid.
- Handling the MCP-unavailable placeholder.
- Handling per-tile click → activate + switch to detail view.

Grid layout: CSS grid, `grid-template-columns: 1fr 1fr`, gap ~16px, tile height fixed (e.g. 140px) so they tile cleanly.

### `ProjectTile` (new)
One tile. Renders:
- Project name (top-left, bold)
- Small color dot (project color)
- Phase line (muted, below name)
- Active slice name + status chip (middle)
- Recommendation line (bottom, 2-line clamp, em-dash if empty)
- Findings badge (top-right, if `findings.total > 0`)

Accent color (left border or subtle background tint): `--status-error` if `tileState === "error"`, else the phase-based neutral color from the theme palette lookup.

### Root component changes
- Accept `viewMode` and switch between `ProjectDetail` and `ProjectDashboard` for the right-side content.
- Pass a `refreshSignal` down so panel "refresh all" triggers dashboard refetch.
- Subscribe to star/hide changes to trigger refetch when in dashboard mode.

## Cross-Slice Interfaces

**Consumes:**
- `GET /api/projects` — for starred/hidden state (already provides ordering)
- MCP `project_get`, `workflow_status`, `workflow_next`, `workflow_check` — via `_mcp_client`

**Provides:**
- `GET /api/dashboard` — new endpoint
- `src/theme.js` — single-source color token module (consumable by other components in future slices)
- `ViewModeToggle`, `ProjectDashboard`, `ProjectTile` — new components

## Success Criteria

- Panel header shows a view-mode toggle; clicking switches the right-side content between detail and dashboard views
- Active view mode persists across page reloads via `localStorage`
- Dashboard renders a 2-column grid of equal-height tiles filling the content area width
- Tile order: starred projects first (panel order), then unstarred; hidden projects omitted entirely
- Each tile shows: project name, color dot, phase (from `workflow_status.phase`), active slice name + status, and a recommendation line (from `workflow_next.recommendation`)
- Missing/empty recommendation renders as muted `—`, not verbatim "no action needed"
- `workflow_check` findings appear as an info badge with count; never change the tile's accent color
- Tile accent color driven by phase-based neutral palette for healthy tiles; red only when `tileState === "error"` for that project
- All status colors defined as CSS custom properties in `src/theme.js` (or equivalent); no `--status-*` hex literals outside that file
- Clicking a tile activates that project and switches to detail view
- `GET /api/dashboard` returns the documented payload when MCP connected
- `/api/dashboard` returns 503 with `"MCP unavailable"` message when MCP disconnected; dashboard shows a single placeholder
- Per-project MCP failures yield `tileState: "error"` without failing the whole response
- Panel "refresh all" button triggers dashboard refetch when dashboard mode is active
- Star/hide changes in the panel trigger dashboard refetch and re-sort
- No console errors in normal operation; existing detail view and panel behavior unchanged when dashboard mode is inactive

## Verification Walkthrough

1. Start the server with MCP connected: `python serve.py` (MCP env vars set per slice 123).
2. Open the app in a browser. Panel shows project list as before.
3. In the panel header, click the new view-mode toggle, select "Dashboard."
   - Right-side content area switches to a 2-column grid of tiles.
   - Tile count matches the number of non-hidden projects in the panel.
   - Starred projects (from slice 125) appear first.
4. Verify tile contents:
   - Project name and color dot match the panel row.
   - Phase line matches `cf status` output for that project.
   - Recommendation line is populated for projects with outstanding work; muted `—` for any idle project.
5. Star an unstarred project in the panel → dashboard re-sorts, starred project moves to the top.
6. Hide a project in the panel → its tile disappears from the dashboard.
7. Click any tile → view mode switches to "detail," active project becomes that tile's project.
8. Reload the page → view mode persists (still in detail if that's where you left it; dashboard if you left it there).
9. Click the panel's "refresh all" button while in dashboard mode → tiles update (phase / recommendation / findings refresh).
10. Inspect tile with known recordkeeping drift (e.g. a slice with task-vs-plan mismatch):
    - Info badge shows finding count.
    - Tile accent color is the phase-neutral color, NOT red or yellow.
11. Stop the MCP server, refresh the dashboard:
    - Dashboard shows a single "MCP unavailable" centered placeholder, no tiles.
12. `curl http://localhost:PORT/api/dashboard | jq .` — payload matches the documented shape.
13. Playwright E2E: script steps 3, 5, 6, 7, 11 as automated tests.

## Risk

Low-Medium. Sequential fan-out means dashboard load time scales linearly with project count × 3 MCP calls. For the current project count this is acceptable; if it becomes a problem, address at the MCP-client layer in a future slice rather than re-architecting the endpoint. Theme-token extraction is bounded to new `--status-*` tokens only — existing colors (project colors, panel, detail view) are untouched.

## Effort

3/5
