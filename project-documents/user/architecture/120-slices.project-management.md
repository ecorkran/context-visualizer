---
docType: slice-plan
parent: user/architecture/120-arch.project-management.md
project: context-visualizer
dateCreated: 20260226
dateUpdated: 20260417
status: active
---

# Slice Plan: Project Management

## Parent Document
[120-arch.project-management.md](120-arch.project-management.md) — Architectural component introducing user-controlled project catalog management: a collapsible left panel that serves as both the project selector and the add/remove interface, backed by server-side catalog endpoints.

## Foundation Work

None. Initiative 100 (complete) provides all prerequisite infrastructure:
- `serve.py` — local server with `do_POST` dispatch pattern
- `projects/manifest.json` — canonical project catalog with `key`, `file`, `sourcePath`
- `parse.py` — parser invoked via `subprocess.run()`, writes to `projects/` by default
- `window.__loadProjects()` — client-side catalog reload function

## Feature Slices (in implementation order)

1. [x] **Project Management API** — Extend the manifest schema with a `displayName` field (written by `parse.py` at parse time); add `GET /api/projects`, `POST /api/projects`, and `DELETE /api/projects/{key}` endpoints to `serve.py`; update tests. No UI changes in this slice. Deliverable: fully functional catalog API testable via `curl`.
   - **Value:** Establishes the backend contract that the panel UI will consume. Existing manifest entries without `displayName` are handled gracefully. Adds/removes projects without touching the JSX component.
   - **Success Criteria:**
     - `parse.py` writes `displayName` to manifest entries when parsing; re-parsing an existing project updates it
     - `GET /api/projects` returns all manifest entries (key, displayName, sourcePath, file)
     - `POST /api/projects {"path": "..."}` invokes the parser, adds the project to the manifest, returns the new entry
     - `DELETE /api/projects/{key}` removes the entry from the manifest; behavior on the associated JSON file resolved during slice design
     - All endpoints return structured JSON; error cases return `{"status": "error", "message": "..."}`
     - Unit and integration tests cover all endpoints and error paths
   - **Dependencies:** Initiative 100 complete
   - **Interfaces:** Provides: `GET/POST/DELETE /api/projects`. Consumes: `parse.py`, `manifest.json`
   - **Risk:** Low
   - **Effort:** 2/5

2. [x] **Project Panel UI** — Two-column root layout; collapsible left panel rendering the project list from `GET /api/projects`; add-project path input wired to `POST /api/projects`; per-row remove control wired to `DELETE /api/projects/{key}`; clicking a row activates the project in the main view; panel expanded/collapsed state persisted via `localStorage`; header tab bar removed; global ↻ refresh button relocated to panel header.
   - **Value:** Users can add and remove tracked projects from the UI with no CLI commands required. The panel replaces the tab bar as the unified project selector, resolving the horizontal overflow problem as project count grows.
   - **Success Criteria:**
     - Two-column layout renders correctly: panel left, content right, content area fills remaining width
     - Collapsed panel: narrow strip (~36px) showing project color indicators; clickable to expand
     - Expanded panel (~240px): full project list with project name (from `displayName`), per-row ↻ and × controls, add-project input, global ↻ at panel header
     - Clicking a project row activates it in the main content area
     - Adding a project (local path → POST) parses, adds to manifest, and project appears in panel list without page reload
     - Removing a project (× → DELETE) removes it from panel; if it was the active project, view switches to first remaining project
     - Per-row ↻ re-parses that project only (POST /api/refresh with project key)
     - Panel collapsed/expanded state survives page reload (localStorage)
     - Header tab bar is removed; ↻ refresh button lives in panel header
     - No console errors in normal operation
   - **Dependencies:** Project Management API (slice above)
   - **Interfaces:** Consumes: `GET/POST/DELETE /api/projects`, `POST /api/refresh`, `window.__loadProjects()`
   - **Risk:** Low-Medium — layout change touches the root component; collapsed/expanded animation and responsive resizing need care
   - **Effort:** 3/5

122. [x] **Local project discovery (scan)** — Endpoint that walks a root directory looking for `project-documents/user/` patterns and returns candidate project paths for the user to confirm-add. Depends on Project Management API. Additionally, for the existing Add button on project path (if it remains), allow the user to browse for the path.  Risk: Low. Effort: 2/5.

123. [x] **MCP client integration** — Add a minimal stdlib-only MCP client so context-visualizer can consume project structure data from context-forge's MCP server. Dual-mode operation: MCP mode when connected, local mode (parse.py) as fallback. New `GET /api/structures` endpoint, updated `loadProjects()`, mode indicator in panel. Depends on context-forge slice 164 (MCP Introspection Tools). Risk: Medium. Effort: 3/5.

124. [x] **Collectors: Maintenance and Future Work** — Add two synthetic initiatives to the visualizer. A maintenance collector groups 9xx maintenance slices into a dedicated initiative. A future work collector aggregates future work items across all slice plans (via MCP `workflow_future` tool), displayed as an initiative with items grouped by source slice plan. Both are additive — existing slice plan views remain unchanged. Future work collector gated by internal config setting (not UI-exposed). Base color: saturated blue (~#08A8F6). Depends on MCP client integration.
   - **Value:** Gives users a consolidated view of maintenance work and outstanding future items without navigating individual slice plans. The maintenance initiative surfaces 9xx slices that otherwise lack a natural home in the initiative list.
   - **Success Criteria:**
     - 9xx maintenance slices render under a dedicated "Maintenance" initiative
     - Future work initiative aggregates items from all slice plans via `workflow_future` MCP tool
     - Future work items are grouped by source slice plan, expandable one level
     - Internal config setting controls whether future work initiative is displayed
     - Existing slice plan future work sections remain unchanged
     - Base color ~#08A8F6 applied to collector initiatives
   - **Dependencies:** MCP client integration (slice 123)
   - **Interfaces:** Consumes: MCP `workflow_future` tool, project structure data. Provides: synthetic initiative entries in the visualizer UI.
   - **Risk:** Low-Medium — future work collector depends on MCP mode; maintenance collector is local-only
   - **Effort:** 3/5

125. [x] **(125) Project list organization** — Star/pin projects to the top of the panel list, and hide/archive projects to a dimmed section at the bottom. Starred projects sort above unstarred; hidden projects render at reduced opacity with a restore control. State persisted in `manifest.json` via new `starred` and `hidden` boolean fields, updated through `PATCH /api/projects/{key}` endpoint. Panel list sorts: starred first, then normal, then hidden. Dependencies: [120, 121]. Risk: Low. Effort: 2/5.

126. [x] **(126) Cross-project dashboard view** — New top-level view showing a grid of per-project status tiles. Panel toggle swaps the right-side content between the existing project detail view and the dashboard. Tiles in two columns with consistent height, ordered by starred-first, hidden projects excluded. Each tile surfaces current phase, active slice and status, and a "what's going on" one-liner derived from MCP `workflow_next`. For projects in slice-work phases (4–6), tile accent color reflects `workflow_check` severity (error/warning/info); otherwise a neutral friendly color from the theme palette. Status color tokens (`--status-ok`, `--status-info`, `--status-waiting`, `--status-warning`, `--status-error`) defined once as CSS custom properties — red reserved for true errors, yellow for true warnings, everything else drawn from a seafoam/green/light-purple palette. Backed by a new `GET /api/dashboard` endpoint that fans out `project_get` + `workflow_next` + `workflow_check` MCP calls per project and returns a flat per-project payload (distinct from `/api/structures`, with shared MCP-client + project-ID-cache helpers at the Python layer). Dashboard live-updates when star/hide state changes in the panel. MCP mode only — local-mode fallback out of scope (local mode is deprecated in practice).
   - **Value:** Gives the user an at-a-glance view across all tracked projects answering "what's going on" without drilling into each one individually. Makes phase/slice drift and consistency issues visible at the portfolio level.
   - **Success Criteria:**
     - Panel header exposes a toggle between "project detail" and "dashboard" modes; active mode persisted in `localStorage`
     - Dashboard renders a 2-column grid of equal-height tiles; grid fills the content area width
     - Tile ordering: starred projects first (in panel star order), then unstarred; hidden projects omitted entirely
     - Each tile shows: project name, project color indicator, current phase, active slice name + status (needs-design / needs-tasks / in-implementation / complete), "what's going on" line from `workflow_next.recommendation`
     - Tiles for projects in phases 4–6 show an accent color derived from `workflow_check` severity: error findings → `--status-error`, warning findings → `--status-warning`, otherwise `--status-ok`
     - Tiles for projects outside phases 4–6 use a neutral palette color (never red or yellow) regardless of findings
     - Status color tokens defined in one place (CSS custom properties) and referenced symbolically throughout; no hard-coded hex values scattered across components
     - `GET /api/dashboard` returns `{ status: "ok", projects: [{ key, displayName, color, phase, activeSlice, recommendation, findings: { errors, warnings, infos } }, ...] }`
     - `/api/dashboard` reuses existing MCP client and project-ID cache; does not duplicate project enumeration logic
     - Star/hide changes in the panel cause the dashboard to re-sort/re-filter without a page reload
     - MCP-disconnected state returns a clear error envelope; dashboard surfaces a single "MCP unavailable" message rather than per-tile errors
     - No console errors in normal operation; existing project detail view and panel behavior unchanged when dashboard mode is inactive
   - **Dependencies:** [121, 123] — panel UI (for the toggle host) and MCP client integration (for the workflow_* tool calls)
   - **Interfaces:** Provides: `GET /api/dashboard`. Consumes: MCP `project_get`, `workflow_next`, `workflow_check`; existing `_mcp_client` and `_mcp_name_to_id` helpers in `serve.py`
   - **Risk:** Low-Medium — fan-out latency across many projects may need batching or parallel MCP calls; theme token extraction touches existing color usage across the viz
   - **Effort:** 3/5

127. [ ] **(127) MCP-native project registry** — Replace `projects/manifest.json` and `parse.py`-based project management with MCP-native project discovery and data retrieval. `GET /api/projects` reads project list from MCP `project_list`; `POST /api/refresh` fetches live structure data from MCP `project_structure` instead of invoking `parse.py`; add/remove endpoints updated or removed as MCP becomes the single source of truth. Static `projects/` JSON files and the manifest are retired. Dependencies: [123]. Risk: Medium. Effort: 3/5.
   - **Value:** Eliminates a redundant source of truth — the manifest and static JSON files become stale the moment a project is updated outside the visualizer. With MCP as the registry, all project data is always live and consistent with context-forge.
   - **Success Criteria:**
     - `GET /api/projects` returns projects sourced from MCP `project_list`, not `manifest.json`
     - `POST /api/refresh` fetches structure from MCP `project_structure` instead of invoking `parse.py`
     - `manifest.json`, static `projects/*.json` files, and `parse.py` subprocess calls are fully removed from the server code path
     - Existing panel UI (project list, add/remove, refresh) continues to work without changes
     - No regressions in `/api/structures`, `/api/dashboard`, or other endpoints
     - MCP-disconnected state returns a clear error envelope on all affected endpoints
   - **Dependencies:** [123]
   - **Interfaces:** Consumes: MCP `project_list`, `project_structure`. Removes: `manifest.json`, `parse.py` integration
   - **Risk:** Medium — touches multiple endpoints; local mode fallback effectively deprecated
   - **Effort:** 3/5

## Notes

- **No migration slices needed** — Both slices add new capabilities rather than restructuring existing behavior. The tab bar removal in Slice 121 is a direct replacement, not a migration.
- **displayName resolution** — `parse.py` already has access to `data["name"]` from parsed output. Writing it to the manifest is a one-line addition during the manifest upsert step.
- **Remove-and-delete trade-off** — Whether `DELETE /api/projects/{key}` also deletes the `{key}-structure.json` file is a slice-design decision. Both options leave the system in a working state; the difference is convenience vs. tidiness. Resolve during Slice 120 design.
- **Tab bar removal timing** — The tab bar is only removed in Slice 121, not Slice 120. During the interval between the two slices (when the API exists but the panel does not), the UI is unchanged and fully functional.
- **Refresh button relocation** — The global ↻ button currently sits in the header beside the tab bar. Slice 121 moves it to the panel header, which is the natural home for "refresh all projects." This is in scope for Slice 121 and should be called out explicitly in that slice design.
- **No dedicated integration slice** — Slice 121's end-to-end verification covers the cross-cutting concerns. The component count and surface area don't warrant a separate integration slice.

## Future Work

1. [ ] **GitHub source support** — Extend manifest schema with `source`, `repoUrl`, `branch` fields; add `git clone`/`git pull` step to the add/refresh flow for GitHub-sourced projects; auth token handling. Depends on Project Management API. Risk: Medium. Effort: 3/5.
2. [ ] **Initiative slice drill-down** — Toggle on each initiative card to lazy-load and display the full slice list (via MCP `introspection_slice_plan`). Collapsed by default to keep the overview clean. Risk: Low. Effort: 2/5.
3. [ ] **Click-through to source files** — Slice and document names link to the actual markdown file via `file://` or VS Code URI scheme. Risk: Low. Effort: 1/5.
4. [ ] **Stale work indicator** — Flag slices that have been in-progress for an extended period with no recent commits or file changes. Context-forge could derive staleness from git history or modification dates. Risk: Low. Effort: 2/5.
5. [ ] **Cross-project dependency view** — Visualize dependencies between slices across projects (e.g. context-visualizer slice depending on a context-forge MCP tool). Risk: Medium. Effort: 3/5.
6. [ ] **Search and filter** — Filter initiatives, slices, and documents by name or status as project size grows. Risk: Low. Effort: 2/5.
7. [ ] **Project grouping by workspace** — Group projects in the panel sidebar by organization/workspace, derived from the parent directory of `projectPath` (e.g. `repos/manta/*` → "manta", `repos/otix/*` → "otix"). Collapsible sections per group. No Context Forge schema changes needed. Risk: Low. Effort: 2/5.
