# DEVLOG — context-visualizer

## 20260331

###### Info Panels, Maintenance Initiatives, and Cache Fixes (v0.2.4–v0.2.7)

**Commits:**
- `6b40491` feat: render maintenanceInitiatives as full initiative cards
- `c8f76a7` chore: bump version to v0.2.4
- `e3ec74c` feat: add initiative index to future work group headers
- `1518644` feat: add slice info panel and cache-busting improvements
- `222a413` fix: auto-size info panel to content instead of fixed minHeight
- `48abb93` chore: bump version to v0.2.5
- `4afacd0` feat: add info panel to architecture docs and update CLAUDE.md

**Changes:**
- Added `ⓘ` info icon to slices, architecture docs, and future work items — toggles inline description panel independently from task expansion
- Cross-references `slicePlan.entries` descriptions to slice DocBlocks; scoped by initiative index to prevent cross-initiative collisions
- Renders `maintenanceInitiatives` (900+ band) as full `InitiativeCard` with olive-green color tint; falls back to flat `MaintenanceCollectorCard` when field absent
- Added `colorSet` and `accentColor` props to `InitiativeCard` for themed rendering
- Added initiative index numbers to future work group headers
- Stripped `**` markers from future work item display names
- Added `Cache-Control: no-store` header to all responses and `Date.now()` cache-bust param to JSX fetch
- Default project panel to expanded on first load
- Auto-sizes info panel to content instead of fixed minHeight

## 20260317

###### Worktree Strip Polish (v0.2.3)

**Commits:**
- `f888565` fix: derive initiative status dot from slice plan, not architecture doc
- `661b25f` fix: filter worktree bands by indexRange and widen strip
- Strip now stretches full column height, aligned with initiative cards
- Increased gap between strip and content column
- Reduced strip text size for tighter 40px fit

## 20260315

###### Slice 111: Worktree Column Layout — Implementation Complete (Phase 6)

**Commits:**
- `58f8818` feat: add WorktreeColumns pass-through component
- `67c2d5c` feat: add worktree column layout with strip toggle

**Changes:**
- Added `WorktreeStrip`, `WorktreeColumn`, `WorktreeColumns` components to `project-structure-viz.jsx` (after `FutureWorkCollectorCard`).
- `WorktreeColumns` self-fetches `/api/worktrees?project=...` on `projectKey` change; uses `AbortController` to cancel stale requests on project switch.
- Pass-through condition (`worktrees === null || worktrees.length <= 1`): zero DOM change vs. current layout.
- Column layout (2+ worktrees): flex container with collapsed 40px `WorktreeStrip` per inactive worktree and one expanded `WorktreeColumn`.
- `WorktreeStrip`: rotated worktree name (10-char truncated), progress fraction (`done/total`), initiative count; tooltip shows `"name  ·  path"`; hover highlight.
- `WorktreeColumn`: slim header (◈ icon, name, index range) above unchanged `InitiativeCard` rendering.
- Threaded `projectKey={active}` from `ProjectStructureVisualizer` root → `ProjectView` → `WorktreeColumns`.
- 3 new E2E tests (mocked `/api/worktrees` response via Playwright `page.route`): layout renders, strip toggle, no-regression single project.
- All 118 tests passing (106 unit + 12 E2E), 1 skipped.

**Notable:** E2E tests use Playwright route interception to simulate 2-worktree response without requiring live MCP — avoids test environment dependency while still exercising the full React component behavior.

###### Slice 111: Worktree Column Layout — Phases 4-5

**Commits:**
- `322c6c8` docs: add slice design for 111-slice.worktree-column-layout
- `65a4709` chore: ignore egg-info packaging artifacts
- `61e3bd5` docs: add task breakdown for 111-slice.worktree-column-layout

**Changes:**
- Created slice design for 111-slice.worktree-column-layout: horizontal column layout with `WorktreeColumns`, `WorktreeColumn`, and `WorktreeStrip` components.
- Key decisions: self-fetching component, pass-through for 0/1 worktrees, AbortController for stale fetch prevention, tooltip on strip hover (name + path).
- Clarified `projectKey` threading: one-line change at App root call site.
- Created task breakdown (8 tasks, 185 lines): threads key from App root → strips → column → E2E test.
- Cleaned up `context_visualizer.egg-info` artifact and added `*.egg-info/` to `.gitignore`.

## 20260313

###### Slice 110: Worktree API Proxy — Implementation Complete

**Commits:**
- `0876023` feat: add /api/worktrees endpoint proxying worktree_list MCP tool

**Changes:**
- Added `GET /api/worktrees?project={name}` endpoint to `serve.py`, proxying Context Forge `worktree_list` MCP tool.
- Follows established `_handle_future_work()` proxy pattern: name→ID resolution via `_mcp_name_to_id` cache with lazy fallback.
- Error responses: 400 (missing param), 404 (unknown project), 503 (MCP not connected), 500 (tool failure).
- Added `worktree_list` mock handler and 5 unit tests (`TestWorktreeEndpoint`).
- Verified against live MCP: context-forge returns 2 worktrees (default, maintenance); context-visualizer returns empty array.
- Also added initiative status dot feature to collapsed initiative cards (from prior session, commit `686aee1`).

## 20260311

###### Initiative 110: Worktree View — Phases 3-4

**Commits:**
- `4eb09e2` docs: add horizontal column layout design to worktree-view arch
- `e8eca4e` docs: add slice plan for worktree-view initiative (110)

**Changes:**
- Chose horizontal column layout for worktree visualization (Option B) with responsive vertical fallback.
- Updated architecture doc: MCP worktree API now available (Context Forge v0.4.2+), documented full data contract.
- Created slice plan with 5 slices: API proxy (110), column layout (111), responsive fallback (112), initiative grouping (113), E2E polish (114).
- Created slice design for 110-slice.worktree-api-proxy: `GET /api/worktrees?project={name}` endpoint proxying `worktree_list` MCP tool.

## 20260306

###### Post-slice polish and packaging

**Commits:**
- `94ef8be` fix: resolve MCP project name to ID for future-work endpoint
- `afcebef` package: bump version to 0.2.0
- `442f4d1` docs: add future work items to slice plan
- `1f80e9c` docs: add README, LICENSE, and update pyproject metadata
- `1d2db80` chore: rename repo to context-visualizer
- `23901bd` feat: make Project-Level Documents section collapsible

**Changes:**
- Fixed future-work endpoint: MCP `workflow_future` requires internal project IDs, not names. Added `_mcp_name_to_id` cache with lazy population from `project_list` calls.
- Normalized collector card borders to match standard card style (`#2A2A4E`).
- Bumped version to `0.2.0`, tagged `v0.2.0`.
- Added README, MIT LICENSE, and pyproject metadata (description, classifiers, URLs).
- Renamed GitHub repo from `context-visualization` to `context-visualizer`.
- Added 6 future work items to slice plan (drill-down, click-through, stale indicator, cross-project deps, search/filter).
- Extracted Project-Level Documents into collapsible `ProjectDocsCard` component (collapsed by default).

## 20260304

###### Slice 109: Collectors — Implementation Complete

**Commits:**
- `4f0b35a` feat: add collector color set to THEME
- `c21d0cf` feat: add MaintenanceCollectorCard component
- `3414f64` refactor: replace flat Operational section with MaintenanceCollectorCard
- `3e75202` feat: add Collector entry to Legend component
- `a86429c` fix: patch select.select in MCP client tests for BytesIO compat
- `5cd47fb` feat: add enableFutureWorkCollector config flag in serve.py
- `8b66e64` feat: add GET /api/future-work endpoint
- `000218c` test: add tests for future-work config flag and endpoint
- `4286638` feat: add futureWorkEnabled field to /api/status response
- `867e768` feat: conditionally fetch future work data in loadProjects
- `910ab2c` feat: add FutureWorkCollectorCard component
- `f448699` feat: wire FutureWorkCollectorCard into ProjectView
- `9a8d78c` test: add E2E tests for maintenance collector card

**Files changed:**
- `project-structure-viz.jsx` — MaintenanceCollectorCard, FutureWorkCollectorCard, collector color set, Legend entry
- `serve.py` — `_enable_future_work_collector` flag, `GET /api/future-work` endpoint, `futureWorkEnabled` in `/api/status`
- `index.html` — `_attachFutureWork()` helper, conditional fetch in `loadProjects()`
- `mcp-config.example.json` — documented `enableFutureWorkCollector` field
- `tests/test_mcp_client.py` — `_fake_select` shim for select() compat with BytesIO mocks
- `tests/test_serve.py` — 8 new tests (config flag, future-work endpoint)
- `tests/test_ui_smoke.py` — 3 new E2E tests (maintenance collector renders, expands, no flat Operational heading)

**Scope:** Two synthetic collector initiatives added to the visualizer UI. MaintenanceCollectorCard replaces the flat "Operational" section with a collapsible card grouping quality/investigation/maintenance docs. FutureWorkCollectorCard shows aggregated future work from MCP `workflow_future` tool, grouped by source initiative (MCP-only, config-gated via `enableFutureWorkCollector`).

**Test count:** 111 (up from 98 baseline, +13 new tests)

###### Slice 109: Collectors — Design and Task Breakdown Complete

**Documents created:**
- `user/slices/109-slice.ui-collectors.md` — Slice design for maintenance and future work collectors
- `user/tasks/109-tasks.ui-collectors.md` — Task breakdown: 16 tasks

**Key decisions:**
- Collectors are presentation-layer only — no changes to `parse.py` or `build_model()` output
- Separate `GET /api/future-work` endpoint (not bundled into `/api/structures`) to avoid latency for users who don't want it
- `enableFutureWorkCollector` config flag in `mcp-config.json` (default `false`) — feature value uncertain, so gated
- Shared collector color set based on `#08A8F6` (saturated blue) for both cards

## 20260301

###### Slice 108: MCP Client Integration — Implementation Complete

**Commits:**
- `bceee01` chore: add mcp-config.json to gitignore, add transport field to example
- `d2f8bdf` feat: add McpClient — stdlib-only JSON-RPC 2.0 over stdio transport
- `a673725` test: add unit tests for McpClient; fix _readline_with_timeout for mock compat
- `c2fa447` feat: add MCP config loading and client startup to serve.py
- `540d1ab` test: add integration tests for MCP config loading in serve.py
- `fff6f0c` feat: add GET /api/structures and GET /api/status endpoints
- `eabefd7` test: add integration tests for /api/structures and /api/status endpoints
- `ea7f7d4` feat: update loadProjects() to try /api/structures first, fall back to manifest
- `f337206` feat: add MCP-mode refresh, update loadProjects fallback; add refresh tests
- `08e2043` feat: add MCP mode indicator badge in ProjectPanel header
- `6a38854` test: update E2E smoke test for local-mode 503 fallback; add MCP badge check

**New files:**
- `mcp_client.py` — stdlib-only JSON-RPC 2.0 MCP client (McpClient, McpError); stdio transport via subprocess.Popen; connect/disconnect, call_tool, list_tools, auto-reconnect
- `tests/test_mcp_client.py` — 15 unit tests for transport, handshake, tool calls, error handling, reconnect

**Modified files:**
- `serve.py` — MCP config loading (_load_mcp_config), startup connect, GET /api/structures, GET /api/status, MCP-mode POST /api/refresh, shutdown hook
- `index.html` — loadProjects() tries /api/structures first; falls back to manifest+JSON; sets window.__projectsMode
- `project-structure-viz.jsx` — MCP badge in ProjectPanel header (visible only in MCP mode)
- `tests/test_serve.py` — 20 new tests (config loading, /api/structures, /api/status, MCP refresh)
- `tests/test_ui_smoke.py` — updated for local-mode 503 fallback; added MCP badge absence test
- `.gitignore` — added mcp-config.json
- `mcp-config.example.json` — added transport: "stdio" field (future-proofing for HTTP transport)

**Key decisions:**
- stdlib-only MCP client (no `mcp` SDK) — preserves zero-dependency policy; only 3 RPC operations needed
- transport: "stdio" in example config shape — future-proof for slice 109 HTTP transport without breaking changes
- MCP is read-only in v1 — write operations (add/remove/discover) remain local
- 503 from /api/structures in local mode is expected fallback signal to frontend; E2E test updated accordingly

**Test count:** 98 (was 67 — added 31 new tests across unit, integration, and E2E)

###### Slice 108: Addendum — `prefer` config key

Post-completion addition: `"prefer": "mcp"|"local"` top-level key in `mcp-config.json`. When set to `"local"`, server starts in local mode even with a valid config file — useful when MCP server is unavailable or user wants to test local behavior without removing the config. Default is `"mcp"` (existing behavior unchanged). 2 new tests in `TestMcpClientStartup`; 96 non-E2E tests passing.

**Commit:** `feat: add prefer config key to skip MCP connect in local mode`

## 20260224

###### Initiative 100: File Updates and Organization — Design Complete

**Documents created:**
- `user/project-guides/001-concept.context-visualizer.md` — Refined concept document (full vision scope, static-first approach, no standalone spec — using architectural components instead)
- `user/architecture/100-arch.file-updates-and-organization.md` — Architecture component: data/presentation separation, structured storage, refresh mechanism
- `user/architecture/100-slices.file-updates-and-organization.md` — Slice plan: 2 slices (Data Externalization, Refresh Mechanism)
- `user/slices/100-slice.data-externalization.md` — Slice design: external JSON in `projects/`, manifest-based discovery, parser output updates, boot sequence changes
- `user/slices/101-slice.refresh-mechanism.md` — Slice design: `serve.py` stdlib server, `/api/refresh` endpoint, refresh button UI
- `user/tasks/100-tasks.data-externalization.md` — Task breakdown: 7 tasks
- `user/tasks/101-tasks.refresh-mechanism.md` — Task breakdown: 7 tasks

**Key design decisions:**
- Manifest file (`projects/manifest.json`) chosen over directory listing or convention-based enumeration for project discovery
- `serve.py` extends stdlib `http.server` (zero dependencies) rather than introducing Flask/FastAPI
- Manifest includes `sourcePath` per project so the refresh server knows where to re-parse from
- `parse_project.py` (older, superseded parser) was deleted — `parse.py` is the single parser going forward

**Scope summary:**
Initiative 100 covers migrating inline project data out of the JSX component into external JSON files, updating the parser to write to a `projects/` directory by default, and adding a refresh button that triggers re-parse from the browser. Two sequential slices: Data Externalization (no dependencies) then Refresh Mechanism (depends on first).

**Notable findings:**
- `parse.py` and `parse_project.py` had overlapping functionality. `parse.py` was newer and more complete (correct directory scanning, dual regex patterns, richer metadata). Resolved by deleting `parse_project.py`.
- Cross-slice refinement identified: Data Externalization manifest format needs `sourcePath` field for Refresh Mechanism. Documented in both slice designs.

**Next:** Implementation of slice 100 (Data Externalization), starting with Task 1: create `projects/` directory and move existing JSON files.

## 20260225

###### Slice 100: Data Externalization — Implementation Complete

**Commits:**
- `d907bee` feat: create projects/ directory and move JSON files
- `62c1bf9` feat: create projects/manifest.json for project discovery
- `5775702` feat: update parse.py to write per-project JSON to projects/ by default
- `2c97780` test: add unit and integration tests for parse.py output modes
- `19ea0a9` chore: add Python cache to .gitignore and remove tracked pycache
- `b6db457` docs: check off Task 4 in 100-tasks.data-externalization
- `68a16b0` feat: update index.html boot sequence to load projects from manifest
- `ca1bba7` feat: remove inline data from JSX and reference external PROJECTS global
- `59f00c2` fix: remove PROJECTS from new Function params to avoid redeclaration

**What was delivered:**
- `projects/` directory with per-project JSON files and `manifest.json` for discovery
- `parse.py` now writes to `projects/` by default, updates manifest with `sourcePath`; `-o` flag and `--projects-dir` flag preserved
- `index.html` `boot()` refactored: fetches manifest → fetches each project JSON → assembles `PROJECTS` global before mounting component
- `project-structure-viz.jsx` reduced from ~8,200 to 687 lines — all inline JSON removed, reads `window.__PROJECTS` instead
- 13 unit/integration tests added for parser output modes

**Notable issue:** `PROJECTS` was declared both as a `new Function` parameter and as `const PROJECTS = window.__PROJECTS` in the JSX — duplicate identifier error. Fixed by removing the parameter and letting the JSX read directly from `window.__PROJECTS`.

**Next:** Slice 101 — Refresh Mechanism (`serve.py` local server + refresh button UI).

###### Slice 101: Refresh Mechanism — Implementation Complete

**Commits:**
- `cc580b7` feat: add serve.py local server with static file serving
- `ea1505d` feat: add /api/refresh endpoint and GET 405 guard to serve.py
- `5d5cb21` test: add unit and integration tests for serve.py
- `481d6c2` feat: expose loadProjects as window.__loadProjects for component refresh
- `d79c1da` feat: add refresh button UI with idle/refreshing/error states
- `735f25e` feat: wire refresh button to /api/refresh and live data reload

**What was delivered:**
- `serve.py` — stdlib-only HTTP server replacing `python -m http.server`; serves static files and exposes `POST /api/refresh`
- `/api/refresh` reads `projects/manifest.json`, invokes `parse.py` via `subprocess.run()` for each project, returns `{"status": "ok", "projects": [...]}` or `{"status": "error", "message": "..."}`; GET returns 405
- `index.html` `loadProjects()` extracted as reusable function and exposed as `window.__loadProjects`; `cache: 'no-store'` added to all project JSON fetches to bypass browser cache after refresh
- Refresh button (↻) added to JSX tab bar: three states (idle / spinning / red error flash), wired to `POST /api/refresh` → re-fetch via `window.__loadProjects()` → React state update; active tab preserved
- 10 unit/integration tests added for serve.py (static serving, refresh endpoint, error cases)

**Notable issue:** Browser cache caused re-fetched JSON to return stale data after a successful parse. Fixed by adding `{ cache: 'no-store' }` to all `fetch()` calls in `loadProjects()`.

**Initiative 100 complete.** Both slices delivered. `python serve.py` is now the local development command.

## 20260226

###### Bug Fixes — parse.py and JSX visualizer

**Commits:**
- `b809b2f` fix: futureWork parsing, plan slice extraction, feature parent attribution
- `48ca388` fix: move DocBlock click handler to header row only

**What was fixed:**
- `parse.py`: futureWork items now extract title-only names (before em-dash separator), plan slices distinguished from future work by bold `**(NNN)**` pattern, feature parent attribution respects explicit `parent` frontmatter
- `project-structure-viz.jsx`: clicking a non-expandable item (e.g., future work entry inside an expanded PLAN block) no longer collapses the parent — onClick moved from outer wrapper div to header row div

###### Initiative 105: Project Management — Slice 105 Design Complete

**Document created:**
- `user/slices/105-slice.project-management-api.md` — Slice design for the catalog management API

**Scope:** Extend manifest with `displayName`, add `GET /api/projects`, `POST /api/projects`, `DELETE /api/projects/{key}` to `serve.py`. No UI changes — backend only. Panel UI deferred to slice 106.

**Key decisions:**
- `displayName` sourced from `model["name"]` in `build_model()`, written by `update_manifest()`
- DELETE removes both manifest entry and JSON file (JSON is a derived artifact, regenerable by re-adding)
- POST is idempotent — re-adding an existing project re-parses and updates
- Path validation reuses `find_user_dir()` from `parse.py`

**Next:** Task breakdown for slice 105 (Phase 5), then implementation.

###### Slice 105: Project Management API — Implementation Complete

**Commits:**
- `85869aa` feat: add displayName to update_manifest() and main() call site
- `389b06c` test: add displayName manifest tests to test_parse.py
- `6a478b5` feat: add GET /api/projects, POST /api/projects, DELETE /api/projects/{key}
- `3d48eab` test: add project management endpoint tests; fix POST --projects-dir arg
- `b686795` chore: backfill displayName into manifest entries
- `783a137` docs: mark slice 105 complete in slice design, slice plan, and task file

**What was delivered:**
- `parse.py` — `update_manifest()` accepts optional `display_name` parameter; `main()` passes `model["name"]`; all existing callers backward compatible
- `serve.py` — `GET /api/projects` reads and returns manifest entries; `POST /api/projects` validates path, invokes parser via subprocess with `--projects-dir`, returns new entry; `DELETE /api/projects/{key}` removes manifest entry and deletes derived JSON file; `do_DELETE` added; `_manifest_path()` and `_parse_py()` helpers enable test isolation
- `projects/manifest.json` — backfilled `displayName` for `context-forge` and `orchestration`
- 5 new tests in `test_parse.py` (unit-level `displayName` assertions); 15 new tests in `test_serve.py` (GET, POST, DELETE — happy paths, error cases, idempotent re-add, missing-file graceful handling); 52 total tests passing

**Notable fix:** `POST /api/projects` subprocess call originally omitted `--projects-dir`, causing JSON and manifest writes to land in the repo's `projects/` rather than the test's temp dir. Fixed by passing `--projects-dir` derived from `_manifest_path().parent`.

###### Slice 106: Project Panel UI — Design Complete

**Document created:**
- `user/slices/106-slice.project-panel-ui.md` — Slice design for collapsible project panel replacing the tab bar

**Scope:** Two-column flex layout with collapsible left panel (~36 px collapsed, ~240 px expanded). Panel renders project list from `GET /api/projects`, wires add/remove/refresh controls to catalog API endpoints. Tab bar removed. Panel state persisted via `localStorage`. All changes in `project-structure-viz.jsx` — no new files.

**Key decisions:**
- `ProjectPanel` component added to existing JSX file (no new files, no build tooling changes)
- Collapsed panel shows color dots per project (clickable to switch); expanded shows full list with `displayName` (fallback to `key`)
- Per-row ↻ uses existing `POST /api/refresh { "projects": [key] }` filtering — no new endpoint needed
- Remove is immediate (no confirmation modal) — consistent with lightweight UI pattern
- After add, newly added project becomes active automatically
- No frontend test infrastructure — manual verification only; server endpoints already tested

**Next:** Task breakdown for slice 106 (Phase 5), then implementation.

###### Slice 106: Project Panel UI — Task Breakdown Complete

**Document created:**
- `user/tasks/106-tasks.project-panel-ui.md` — 9 tasks, 196 lines

###### Playwright E2E Test Infrastructure

**What was set up:**
- `pytest-playwright` added to dev dependencies; Chromium browser binary installed
- `tests/conftest.py` — session-scoped `live_server` fixture (starts `serve.py` on free port)
- `tests/test_ui_smoke.py` — 3 smoke tests (title renders, project visible, no console errors)
- Playwright MCP server configured in `.claude/settings.local.json` for interactive browser verification
- `CLAUDE.md` updated with testing conventions; `e2e` pytest marker added
- 55 tests passing (52 backend + 3 E2E)

**Why:** The project had no frontend test infrastructure. Since the app uses CDN-loaded React with Babel Standalone (no build step), unit-level tools like Vitest don't apply. Playwright tests the running app in a real browser, matching the actual runtime.

###### Slice 106: Project Panel UI — Implementation Complete

**Commits:**
- `e444e61` feat: add two-column layout and ProjectPanel skeleton
- `b17867f` feat: restructure to full-width header with two-column body below
- `52cb5ed` feat: add project list with click-to-activate to panel
- `3434147` feat: remove tab bar, relocate refresh button to panel header
- `88a1e75` feat: add add/remove/per-row-refresh controls to project panel
- `011cae0` feat: add collapsible panel with localStorage persistence
- `441f2a8` feat: add hover effects and dark scrollbar styling to panel

**What was delivered:**
- Full-width header (title + subtitle) with two-column body below: collapsible panel left, scrollable content right
- `ProjectPanel` component: expanded (240 px) shows project list with color dots, active gold border, per-row ↻ and × controls, global ↻ in panel header, add-project path input at bottom; collapsed (36 px) shows › chevron and color dots (clickable to switch project)
- Panel expanded/collapsed state persisted via `localStorage` (`panel-expanded` key); defaults to collapsed on first visit
- `POST /api/projects`, `DELETE /api/projects/{key}`, `POST /api/refresh` all wired end-to-end; root data reloads via `window.__loadProjects()` after mutations
- Empty state ("No projects. Add one using the panel.") when all projects removed
- Tab bar and header-area refresh button removed; header simplified to title only
- Hover effects and dark webkit scrollbar styling on panel list
- 55 tests passing (no regressions)

**Next:** Implementation of slice 106 tasks.

###### Slice 107: Local Project Discovery — Design Complete

**Document created:**
- `user/slices/107-slice.local-project-discovery.md`

**Scope:** Two new server endpoints (`GET /api/discover`, `GET /api/validate`) plus companion UI in `ProjectPanel`: inline path validation feedback on the Add input (debounced, non-blocking) and a Scan flow that lets users discover valid project paths under a root directory they specify.

**Key decisions:**
- Scan depth limited to 3 levels; results capped at 50 to bound filesystem traversal cost
- `GET /api/validate` always returns HTTP 200 — validity is in the body (`valid: true/false`), not the status code
- `build_model()` used for `displayName` extraction in discover; fall back to frontmatter-only scan if performance is a concern during implementation
- Inline validation is advisory only — Add button remains enabled; server returns an error on submit if invalid
- All state local to `ProjectPanel`; no new props on root component
- All changes in `serve.py` and `project-structure-viz.jsx` — no new files

**Next:** Task breakdown for slice 107, then implementation.

## 20260228

###### Slice 107: Local Project Discovery — Implementation Complete

**Commits:**
- `f98314d` feat: add GET /api/info endpoint for smart scan root
- `5e03b92` test: add tests for GET /api/info
- `01cfb26` feat: add GET /api/discover endpoint for depth-1 project scan
- `7a8cafc` test: add tests for GET /api/discover
- `104879e` feat: add Find projects toggle to ProjectPanel
- `67acd7d` fix: merge sourcePath from manifest into project data for tracked detection
- `88ddaea` test: add E2E tests for discover section

**What was delivered:**
- `GET /api/info` — returns suggested `scanRoot` derived from `os.path.commonpath` of tracked project paths; falls back to `Path.home()` when manifest is empty or missing; always 200
- `GET /api/discover?root=<path>` — scans immediate children (depth 1) of `root`, validates each via `find_user_dir()`, extracts display name via `build_model()`, returns sorted cap-30 candidate list; 400 errors for missing/invalid root
- "Find projects" collapsible section in `ProjectPanel`: toggle button, editable root input pre-populated from `GET /api/info` on first open, Find button with scanning state, results list with `●`/`○` indicators, per-row Add buttons, empty state, auto-clearing error display
- Already-tracked detection: client-side comparison of candidate paths to `sourcePath` values in `projects` prop; required merging `sourcePath` from manifest into project data in `index.html` `__loadProjects()`
- 10 new unit tests in `tests/test_serve.py` (4 for `/api/info`, 6 for `/api/discover`)
- 2 new E2E tests in `tests/test_ui_discover.py` (section expands, Find populates results)
- Total: 67 tests passing

**Notable finding:** `sourcePath` was present in `manifest.json` but not merged into the per-project JSON data loaded by `__loadProjects()`. The tracked-detection check in `ProjectPanel` (comparing candidate paths to `projects[k].sourcePath`) silently failed because the field was undefined. Fixed in `index.html` by copying `entry.sourcePath` into each loaded project entry.

**Next:** No further slices currently planned in initiative 105.

## 20260301

###### Slice 108: MCP Client — Design Complete

**Document created:**
- `user/slices/108-slice.mcp-client.md` — Slice design for MCP client integration

**Scope:** Add a minimal stdlib-only MCP client (`mcp_client.py`) so context-visualizer can consume project structure data from context-forge's MCP server. Dual-mode operation: MCP mode when connected to context-forge, local mode (parse.py) as automatic fallback. New `GET /api/structures` endpoint returns all project models in one response; `loadProjects()` updated to try it first. `GET /api/status` reports connection mode. Mode indicator in panel header. All write operations (add/remove/discover) remain local in v1.

**Key decisions:**
- **Stdlib-only MCP client** — implements JSON-RPC 2.0 over stdio using only `subprocess`, `json`, `threading`. Avoids pulling in the `mcp` SDK (which brings `anyio`, `httpx`, `pydantic`, etc.), preserving the project's zero runtime dependency philosophy.
- **Read-only MCP integration** — MCP used only for reading project structure via `project_list` and `project_structure` tools. Catalog management (add/remove) stays local to avoid complex catalog synchronization between context-forge and local manifest.
- **`mcp-config.json` configuration** — server command/args stored in a gitignored config file at project root. Absent config → local-only mode with no warnings.
- **Key-envelope wrapping in adapter** — context-forge returns models directly; serve.py wraps them in `{ key: model }` to match frontend expectations.
- **New `GET /api/structures` endpoint** — single HTTP call returns all project data (vs current N+1 fetches). Serves MCP data when connected, can also serve local data.
- **Per-request fallback** — if MCP call fails, `loadProjects()` falls back to manifest+JSON path automatically.

**Dependencies:** Context-forge slice 164 (MCP Introspection Tools) — provides `project_structure` and `project_list` MCP tools.

**Next:** Task breakdown for slice 108 (Phase 5), then implementation after context-forge slice 164 is complete.

###### Slice 108: MCP Client — Task Breakdown Complete

**Document created:**
- `user/tasks/108-tasks.mcp-client.md` — 17 tasks, 316 lines

**Task structure:** Config/gitignore → MCP client transport (spawn, JSON-RPC) → unit tests → call_tool/list_tools → unit tests → config loading in serve.py → integration tests → GET /api/structures → GET /api/status → integration tests → loadProjects() update → refresh MCP mode → integration tests → UI mode indicator → E2E verification → end-to-end polish → mark complete. Test-with pattern followed: each implementation task paired with its test task.

**Next:** Implementation (Phase 7) after context-forge slice 164 is complete.
