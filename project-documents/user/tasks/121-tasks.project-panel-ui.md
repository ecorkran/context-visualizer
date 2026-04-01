---
docType: tasks
slice: project-panel-ui
project: context-visualizer
lld: user/slices/121-slice.project-panel-ui.md
dependencies: [120-project-management-api]
projectState: Slice 120 complete — serve.py has GET/POST/DELETE /api/projects and POST /api/refresh; manifest.json has displayName; 52 tests passing. UI unchanged — still uses header tab bar for project switching.
dateCreated: 20260228
dateUpdated: 20260228
---

## Context Summary

- Working on slice 121: Project Panel UI
- Slice 120 (Project Management API) is complete — all catalog endpoints exist and are tested
- This slice replaces the header tab bar with a collapsible left-side panel for project navigation and management
- All changes are in `project-structure-viz.jsx` (and minor `index.html` if needed) — no new files
- E2E browser tests available via pytest-playwright (`pytest tests/test_ui_smoke.py`); `live_server` fixture in `tests/conftest.py`
- Key files: `project-structure-viz.jsx` (~735 lines currently), `index.html`, `serve.py`
- No subsequent slices currently planned in this initiative

---

## Tasks

### 1. Two-column layout and `ProjectPanel` skeleton

- [x] Modify the root `ProjectStructureVisualizer` component to use a two-column flex layout:
  - Outer wrapper: `display: "flex"`, `minHeight: "100vh"`
  - Left: `ProjectPanel` placeholder div with fixed width (240 px initially — collapsed state comes later)
  - Right: `flex: 1`, `overflow: "auto"` — contains everything currently in the root (header, Legend, ProjectView)
  - Move existing page padding (`THEME.sp.xl`) to the right column only; panel has its own padding
- [x] Create a `ProjectPanel` function component (empty body, just renders a styled div with panel background `#111128` and full height)
  - Props: `projects`, `active`, `onActivate`, `onRefreshAll`, `refreshState`
  - These props come from existing state/callbacks in the root component
- [x] Verify: page renders correctly with the panel placeholder visible on the left and all existing content on the right
- [x] Commit

**Success criteria:**
- [x] Two-column layout visible: dark panel on left, existing content on right
- [x] Content area fills remaining width and scrolls independently
- [x] No console errors; Legend and ProjectView render as before

### 2. Expanded panel — project list with click-to-activate

- [x] In `ProjectPanel`, fetch the project list for display. Use the `projects` prop (already loaded `PROJECTS` object) rather than a separate `GET /api/projects` call — avoids a redundant fetch since the root already has the data
  - Derive display list: `Object.keys(projects).map(k => ({ key: k, name: projects[k].name }))`
  - Fall back to `key` if `name` is absent
- [x] Render panel header row: title "Projects" in `THEME.fonts.heading`
- [x] Render project rows: each shows a color dot (from a small palette indexed by position), project name, and highlights the active row with a gold left border
- [x] Wire click on a project row to call `onActivate(key)` → root's `setActive`
- [x] Verify: clicking a project in the panel switches the main content view
- [x] Commit

**Success criteria:**
- [x] Panel shows project names with color dots
- [x] Active project row is visually distinct (gold left border)
- [x] Clicking a row switches the active project in the content area
- [x] `displayName` (via `projects[k].name`) shown; falls back to `key` if name is absent

### 3. Remove tab bar and relocate refresh button

- [x] Delete the tab buttons block (`keys.map((k) => <button>...)`) from the root component's header area
- [x] Delete the refresh button (`<button onClick={handleRefresh}...`) from the root component's header area
- [x] Simplify the header row: keep only the title (`⬡ Project Structure`) and subtitle
- [x] Add global refresh (↻) button to the panel header row, to the right of "Projects" title
  - Pass `onRefreshAll` and `refreshState` props to `ProjectPanel`
  - Reuse existing refresh button styling and spin animation
  - Keep `@keyframes spin` style block in the root component (it's global)
- [x] Verify: tab bar is gone, refresh button appears in panel header, refresh still works (POST /api/refresh → reload data)
- [x] Commit

**Success criteria:**
- [x] No tab buttons visible in the header area
- [x] Refresh button visible in panel header with correct spin/error states
- [x] Clicking panel refresh triggers full data reload (same behavior as old header refresh)
- [x] Header shows only title and subtitle

### 4. Add-project input

- [x] Add local state to `ProjectPanel`: `addPath` (string), `addState` (`idle` / `adding` / `error`), `addError` (string)
- [x] Render an input area at the bottom of the panel (fixed position within panel, below project list):
  - Text input for local filesystem path, placeholder "Project path..."
  - "Add" button (or "+" icon button) beside the input
  - Submit on button click or Enter keypress
- [x] On submit:
  - Set `addState` to `adding`
  - `POST /api/projects` with `{ "path": addPath }`
  - On success: call `window.__loadProjects()` to reload data, call a new `onProjectsChanged` callback prop to update root state, set new project as active via `onActivate(response.project.key)`, clear input, set `addState` to `idle`
  - On error: set `addError` to the error message, set `addState` to `error`, auto-clear after 3 s
- [x] Add `onProjectsChanged` callback prop — root component implements this as: `const fresh = await window.__loadProjects(); setProjects(fresh);`
  - This callback is shared by add, remove, and per-row refresh operations
- [x] Verify: type a valid project path, click Add → project appears in panel and becomes active
- [x] Commit

**Success criteria:**
- [x] Input and Add button render at panel bottom
- [x] Submitting a valid path adds the project and it appears in the list
- [x] Newly added project becomes the active project
- [x] Invalid/missing path shows error message inline, auto-clears after 3 s
- [x] Input is cleared on success
- [x] Loading state visible during POST

### 5. Remove-project control

- [x] Add a × button to each project row in the expanded panel
  - Small, subtle button on the right side of the row
  - On click: `DELETE /api/projects/{key}`
- [x] On success:
  - Call `onProjectsChanged` to reload data
  - If the removed project was `active`, call `onActivate` with the first remaining project key (or `null` if none remain)
- [x] On error: log to console (inline row error is optional; keep it simple)
- [x] Handle empty state: if no projects remain after removal, the content area should show a placeholder message ("No projects. Add one using the panel.")
  - This is in the root component: if `Object.keys(projects).length === 0`, render the placeholder instead of `Legend` + `ProjectView`
- [x] Verify: click × on a project → it disappears from the panel; if it was active, view switches
- [x] Commit

**Success criteria:**
- [x] × button visible on each project row
- [x] Clicking × removes the project from the panel list
- [x] If the removed project was active, a different project becomes active
- [x] Empty state renders correctly when all projects are removed
- [x] Manifest is updated (entry removed, JSON file deleted)

### 6. Per-row refresh

- [x] Add a ↻ button to each project row in the expanded panel (between the name and the × button)
- [x] Add per-row refresh state tracking in `ProjectPanel`: a map (object) of `{ [key]: 'idle' | 'refreshing' }` — use `useState({})` and update per-key
- [x] On click:
  - Set that key's state to `refreshing` (shows spin animation on the row button)
  - `POST /api/refresh` with body `{ "projects": [key] }`
  - On success: call `onProjectsChanged` to reload data, set key state back to `idle`
  - On error: log to console, set key state back to `idle`
- [x] Verify: click ↻ on a row → button spins → data reloads for that project
- [x] Commit

**Success criteria:**
- [x] Per-row ↻ button visible on each project row
- [x] Clicking it triggers a refresh for that project only
- [x] Button shows spinning animation during the operation
- [x] Data is reloaded after successful refresh

### 7. Collapsed panel and localStorage persistence

- [x] Add `panelExpanded` state to root component, initialized from `localStorage`:
  - `const [panelExpanded, setPanelExpanded] = useState(() => { try { return JSON.parse(localStorage.getItem("panel-expanded")); } catch { return false; } })`
  - On toggle: `setPanelExpanded(v => { const next = !v; localStorage.setItem("panel-expanded", JSON.stringify(next)); return next; })`
- [x] Pass `expanded` and `onToggle` props to `ProjectPanel`
- [x] Panel width: 240 px when expanded, 36 px when collapsed. Apply `transition: "width 0.2s ease"` for smooth animation. Use `overflow: "hidden"` to clip content during transition.
- [x] Collapsed panel rendering:
  - Show expand toggle (› chevron) at the top
  - Show a vertical stack of color dots (one per project), each clickable to activate that project
  - Active dot has gold border; inactive dots are plain
  - Clicking the chevron or the strip background (not a dot) expands the panel
- [x] Expanded panel rendering (already built in tasks 2–6):
  - Add collapse toggle (‹ chevron) to the panel header row
  - Clicking it collapses the panel
- [x] Verify: toggle works, state persists across page reload, dots switch projects in collapsed mode
- [x] Commit

**Success criteria:**
- [x] Panel defaults to collapsed on first visit
- [x] Clicking ›/‹ toggles between collapsed and expanded
- [x] Collapsed strip shows color dots; clicking a dot activates that project
- [x] Panel state persists across page reload (localStorage)
- [x] Width transition animates smoothly
- [x] Add-project input and per-row controls are hidden when collapsed

### 8. Polish and manual verification

- [x] Add hover effects to project rows (subtle background change on hover)
- [x] Style the panel scrollbar for dark theme (webkit pseudo-element: thin, dark track, lighter thumb)
- [x] Verify the following interaction flows manually by running `python serve.py` and opening the browser:
  - [x] Expanded panel renders project list with correct names
  - [x] Collapsed panel shows dots; clicking dot switches project
  - [x] Toggle panel expanded/collapsed; reload page and confirm state persists
  - [x] Add a project via the input (use a real project path) — it appears in the list and becomes active
  - [x] Remove a project — it disappears; if active, another project becomes active
  - [x] Per-row refresh — button spins, data reloads
  - [x] Global refresh — button spins, all data reloads
  - [x] No console errors during any of the above operations
  - [x] Content area fills remaining width correctly in both panel states
- [x] Fix any issues found during manual verification
- [x] Commit

**Success criteria:**
- [x] All interaction flows work end-to-end without errors
- [x] Hover effects and scrollbar styling applied
- [x] No console errors in normal operation

### 9. Final — mark slice complete

- [x] Run `pytest tests/` to confirm no regressions in existing backend tests
- [x] Update slice status to `complete` in `106-slice.project-panel-ui.md`
- [x] Check off slice 121 in `120-slices.project-management.md` (slice plan)
- [x] Commit
