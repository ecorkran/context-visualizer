---
docType: tasks
slice: project-panel-ui
project: context-visualizer
lld: user/slices/106-slice.project-panel-ui.md
dependencies: [105-project-management-api]
projectState: Slice 105 complete — serve.py has GET/POST/DELETE /api/projects and POST /api/refresh; manifest.json has displayName; 52 tests passing. UI unchanged — still uses header tab bar for project switching.
dateCreated: 20260228
dateUpdated: 20260228
---

## Context Summary

- Working on slice 106: Project Panel UI
- Slice 105 (Project Management API) is complete — all catalog endpoints exist and are tested
- This slice replaces the header tab bar with a collapsible left-side panel for project navigation and management
- All changes are in `project-structure-viz.jsx` (and minor `index.html` if needed) — no new files
- No frontend test infrastructure exists; verification is manual (server endpoints already tested in `test_serve.py`)
- Key files: `project-structure-viz.jsx` (~735 lines currently), `index.html`, `serve.py`
- No subsequent slices currently planned in this initiative

---

## Tasks

### 1. Two-column layout and `ProjectPanel` skeleton

- [ ] Modify the root `ProjectStructureVisualizer` component to use a two-column flex layout:
  - Outer wrapper: `display: "flex"`, `minHeight: "100vh"`
  - Left: `ProjectPanel` placeholder div with fixed width (240 px initially — collapsed state comes later)
  - Right: `flex: 1`, `overflow: "auto"` — contains everything currently in the root (header, Legend, ProjectView)
  - Move existing page padding (`THEME.sp.xl`) to the right column only; panel has its own padding
- [ ] Create a `ProjectPanel` function component (empty body, just renders a styled div with panel background `#111128` and full height)
  - Props: `projects`, `active`, `onActivate`, `onRefreshAll`, `refreshState`
  - These props come from existing state/callbacks in the root component
- [ ] Verify: page renders correctly with the panel placeholder visible on the left and all existing content on the right
- [ ] Commit

**Success criteria:**
- [ ] Two-column layout visible: dark panel on left, existing content on right
- [ ] Content area fills remaining width and scrolls independently
- [ ] No console errors; Legend and ProjectView render as before

### 2. Expanded panel — project list with click-to-activate

- [ ] In `ProjectPanel`, fetch the project list for display. Use the `projects` prop (already loaded `PROJECTS` object) rather than a separate `GET /api/projects` call — avoids a redundant fetch since the root already has the data
  - Derive display list: `Object.keys(projects).map(k => ({ key: k, name: projects[k].name }))`
  - Fall back to `key` if `name` is absent
- [ ] Render panel header row: title "Projects" in `THEME.fonts.heading`
- [ ] Render project rows: each shows a color dot (from a small palette indexed by position), project name, and highlights the active row with a gold left border
- [ ] Wire click on a project row to call `onActivate(key)` → root's `setActive`
- [ ] Verify: clicking a project in the panel switches the main content view
- [ ] Commit

**Success criteria:**
- [ ] Panel shows project names with color dots
- [ ] Active project row is visually distinct (gold left border)
- [ ] Clicking a row switches the active project in the content area
- [ ] `displayName` (via `projects[k].name`) shown; falls back to `key` if name is absent

### 3. Remove tab bar and relocate refresh button

- [ ] Delete the tab buttons block (`keys.map((k) => <button>...)`) from the root component's header area
- [ ] Delete the refresh button (`<button onClick={handleRefresh}...`) from the root component's header area
- [ ] Simplify the header row: keep only the title (`⬡ Project Structure`) and subtitle
- [ ] Add global refresh (↻) button to the panel header row, to the right of "Projects" title
  - Pass `onRefreshAll` and `refreshState` props to `ProjectPanel`
  - Reuse existing refresh button styling and spin animation
  - Keep `@keyframes spin` style block in the root component (it's global)
- [ ] Verify: tab bar is gone, refresh button appears in panel header, refresh still works (POST /api/refresh → reload data)
- [ ] Commit

**Success criteria:**
- [ ] No tab buttons visible in the header area
- [ ] Refresh button visible in panel header with correct spin/error states
- [ ] Clicking panel refresh triggers full data reload (same behavior as old header refresh)
- [ ] Header shows only title and subtitle

### 4. Add-project input

- [ ] Add local state to `ProjectPanel`: `addPath` (string), `addState` (`idle` / `adding` / `error`), `addError` (string)
- [ ] Render an input area at the bottom of the panel (fixed position within panel, below project list):
  - Text input for local filesystem path, placeholder "Project path..."
  - "Add" button (or "+" icon button) beside the input
  - Submit on button click or Enter keypress
- [ ] On submit:
  - Set `addState` to `adding`
  - `POST /api/projects` with `{ "path": addPath }`
  - On success: call `window.__loadProjects()` to reload data, call a new `onProjectsChanged` callback prop to update root state, set new project as active via `onActivate(response.project.key)`, clear input, set `addState` to `idle`
  - On error: set `addError` to the error message, set `addState` to `error`, auto-clear after 3 s
- [ ] Add `onProjectsChanged` callback prop — root component implements this as: `const fresh = await window.__loadProjects(); setProjects(fresh);`
  - This callback is shared by add, remove, and per-row refresh operations
- [ ] Verify: type a valid project path, click Add → project appears in panel and becomes active
- [ ] Commit

**Success criteria:**
- [ ] Input and Add button render at panel bottom
- [ ] Submitting a valid path adds the project and it appears in the list
- [ ] Newly added project becomes the active project
- [ ] Invalid/missing path shows error message inline, auto-clears after 3 s
- [ ] Input is cleared on success
- [ ] Loading state visible during POST

### 5. Remove-project control

- [ ] Add a × button to each project row in the expanded panel
  - Small, subtle button on the right side of the row
  - On click: `DELETE /api/projects/{key}`
- [ ] On success:
  - Call `onProjectsChanged` to reload data
  - If the removed project was `active`, call `onActivate` with the first remaining project key (or `null` if none remain)
- [ ] On error: log to console (inline row error is optional; keep it simple)
- [ ] Handle empty state: if no projects remain after removal, the content area should show a placeholder message ("No projects. Add one using the panel.")
  - This is in the root component: if `Object.keys(projects).length === 0`, render the placeholder instead of `Legend` + `ProjectView`
- [ ] Verify: click × on a project → it disappears from the panel; if it was active, view switches
- [ ] Commit

**Success criteria:**
- [ ] × button visible on each project row
- [ ] Clicking × removes the project from the panel list
- [ ] If the removed project was active, a different project becomes active
- [ ] Empty state renders correctly when all projects are removed
- [ ] Manifest is updated (entry removed, JSON file deleted)

### 6. Per-row refresh

- [ ] Add a ↻ button to each project row in the expanded panel (between the name and the × button)
- [ ] Add per-row refresh state tracking in `ProjectPanel`: a map (object) of `{ [key]: 'idle' | 'refreshing' }` — use `useState({})` and update per-key
- [ ] On click:
  - Set that key's state to `refreshing` (shows spin animation on the row button)
  - `POST /api/refresh` with body `{ "projects": [key] }`
  - On success: call `onProjectsChanged` to reload data, set key state back to `idle`
  - On error: log to console, set key state back to `idle`
- [ ] Verify: click ↻ on a row → button spins → data reloads for that project
- [ ] Commit

**Success criteria:**
- [ ] Per-row ↻ button visible on each project row
- [ ] Clicking it triggers a refresh for that project only
- [ ] Button shows spinning animation during the operation
- [ ] Data is reloaded after successful refresh

### 7. Collapsed panel and localStorage persistence

- [ ] Add `panelExpanded` state to root component, initialized from `localStorage`:
  - `const [panelExpanded, setPanelExpanded] = useState(() => { try { return JSON.parse(localStorage.getItem("panel-expanded")); } catch { return false; } })`
  - On toggle: `setPanelExpanded(v => { const next = !v; localStorage.setItem("panel-expanded", JSON.stringify(next)); return next; })`
- [ ] Pass `expanded` and `onToggle` props to `ProjectPanel`
- [ ] Panel width: 240 px when expanded, 36 px when collapsed. Apply `transition: "width 0.2s ease"` for smooth animation. Use `overflow: "hidden"` to clip content during transition.
- [ ] Collapsed panel rendering:
  - Show expand toggle (› chevron) at the top
  - Show a vertical stack of color dots (one per project), each clickable to activate that project
  - Active dot has gold border; inactive dots are plain
  - Clicking the chevron or the strip background (not a dot) expands the panel
- [ ] Expanded panel rendering (already built in tasks 2–6):
  - Add collapse toggle (‹ chevron) to the panel header row
  - Clicking it collapses the panel
- [ ] Verify: toggle works, state persists across page reload, dots switch projects in collapsed mode
- [ ] Commit

**Success criteria:**
- [ ] Panel defaults to collapsed on first visit
- [ ] Clicking ›/‹ toggles between collapsed and expanded
- [ ] Collapsed strip shows color dots; clicking a dot activates that project
- [ ] Panel state persists across page reload (localStorage)
- [ ] Width transition animates smoothly
- [ ] Add-project input and per-row controls are hidden when collapsed

### 8. Polish and manual verification

- [ ] Add hover effects to project rows (subtle background change on hover)
- [ ] Style the panel scrollbar for dark theme (webkit pseudo-element: thin, dark track, lighter thumb)
- [ ] Verify the following interaction flows manually by running `python serve.py` and opening the browser:
  - [ ] Expanded panel renders project list with correct names
  - [ ] Collapsed panel shows dots; clicking dot switches project
  - [ ] Toggle panel expanded/collapsed; reload page and confirm state persists
  - [ ] Add a project via the input (use a real project path) — it appears in the list and becomes active
  - [ ] Remove a project — it disappears; if active, another project becomes active
  - [ ] Per-row refresh — button spins, data reloads
  - [ ] Global refresh — button spins, all data reloads
  - [ ] No console errors during any of the above operations
  - [ ] Content area fills remaining width correctly in both panel states
- [ ] Fix any issues found during manual verification
- [ ] Commit

**Success criteria:**
- [ ] All interaction flows work end-to-end without errors
- [ ] Hover effects and scrollbar styling applied
- [ ] No console errors in normal operation

### 9. Final — mark slice complete

- [ ] Run `pytest tests/` to confirm no regressions in existing backend tests
- [ ] Update slice status to `complete` in `106-slice.project-panel-ui.md`
- [ ] Check off slice 106 in `105-slices.project-management.md` (slice plan)
- [ ] Commit
