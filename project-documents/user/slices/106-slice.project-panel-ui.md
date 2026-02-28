---
docType: slice-design
slice: project-panel-ui
project: context-visualizer
parent: user/architecture/105-slices.project-management.md
dependencies: [105-project-management-api]
interfaces: []
status: complete
dateCreated: 20260228
dateUpdated: 20260228
---

# Slice Design: Project Panel UI

## Overview

Replace the header tab bar with a collapsible left-side panel that serves as both the project selector and the project management interface. The panel renders the project list from the catalog API (slice 105), wires add/remove controls to `POST /api/projects` and `DELETE /api/projects/{key}`, and persists its collapsed/expanded state in `localStorage`.

## Value

Users gain a unified control surface for project navigation and management — adding, removing, refreshing, and switching projects — entirely from the UI. The panel replaces the tab bar, eliminating horizontal overflow as the project count grows and surfacing catalog operations that previously required CLI or file editing.

## Technical Scope

**Included:**
- Two-column flex layout: collapsible panel (left), content area (right)
- Expanded panel (~240 px): project list with `displayName`, per-row refresh (↻) and remove (×) controls, add-project path input, global refresh in panel header
- Collapsed panel (~36 px): narrow strip with project color indicators; click to expand
- Clicking a project row activates it in the main content area
- `POST /api/projects` wired to add-project input
- `DELETE /api/projects/{key}` wired to per-row remove button
- Per-row refresh via `POST /api/refresh { "projects": [key] }`
- Panel expanded/collapsed state persisted via `localStorage`
- Header tab bar and adjacent refresh button removed
- Loading/error indicators for async operations (add, refresh)

**Excluded:**
- Backend API changes (delivered in slice 105)
- Remote/GitHub project sources
- Project discovery/scan
- Drag-to-reorder or manual ordering of projects
- Panel width resizing (fixed widths for collapsed/expanded)

## Dependencies

### Prerequisites
- Slice 105 (Project Management API) — complete. Provides `GET /api/projects`, `POST /api/projects`, `DELETE /api/projects/{key}`, `POST /api/refresh`, manifest `displayName` field.

### Interfaces Required
- `GET /api/projects` → `{ status, projects: [{ key, displayName, sourcePath, file }] }`
- `POST /api/projects` `{ path }` → `{ status, project: { key, displayName, ... } }`
- `DELETE /api/projects/{key}` → `{ status, removed }`
- `POST /api/refresh` `{ projects?: [key] }` → `{ status, projects, warnings? }`
- `window.__loadProjects()` → refreshes the `PROJECTS` in-memory object

## Architecture

### Component Structure

All changes are in `project-structure-viz.jsx`. No new files. The component tree gains one new component (`ProjectPanel`) and the root component changes its layout.

```
ProjectStructureVisualizer          ← root (modified layout)
  PatternDefs
  ProjectPanel                      ← NEW: collapsible left panel
    PanelHeader                     ← inline: title + global ↻ + collapse toggle
    ProjectRow[]                    ← inline: name, status dot, per-row ↻, ×
    AddProjectInput                 ← inline: text input + submit button
  <main content area>               ← right column
    Legend
    ProjectView
```

`ProjectPanel` is a new function component defined in the same JSX file. `PanelHeader`, `ProjectRow`, and `AddProjectInput` are inline JSX within `ProjectPanel` — not separate components — unless line count warrants extraction during implementation.

### Data Flow

```
                          GET /api/projects
                                │
                                ▼
                         ProjectPanel
                        (renders list)
                                │
        ┌───────────┬───────────┼───────────────┐
        ▼           ▼           ▼               ▼
   click row    click ×    click ↻ (row)    submit path
        │           │           │               │
  setActive(k)  DELETE /api/  POST /api/    POST /api/
                projects/{k}  refresh       projects
                    │        {projects:[k]}    │
                    ▼           │               ▼
              reload panel      │          reload panel
              (re-fetch)        ▼          (re-fetch)
                          reload single
                          project data
```

After any mutation (add, remove, per-row refresh), the panel re-fetches the project list from `GET /api/projects` and the content area re-loads project data via `window.__loadProjects()`.

### State Management

All state remains in React `useState` hooks — no context or external store needed.

| State | Location | Persistence |
|---|---|---|
| `projects` | `ProjectStructureVisualizer` | RAM (re-fetched on reload) |
| `active` | `ProjectStructureVisualizer` | RAM |
| `panelExpanded` | `ProjectStructureVisualizer` | `localStorage` key `"panel-expanded"` |
| `addPath` | `ProjectPanel` | RAM (local to input) |
| `addState` | `ProjectPanel` | RAM (`idle` / `adding` / `error`) |
| `rowRefreshState` | `ProjectPanel` | RAM (per-key map: `idle` / `refreshing`) |

**`panelExpanded` persistence:** On mount, read `localStorage.getItem("panel-expanded")`. Default to `false` (collapsed) if absent. On toggle, write `localStorage.setItem("panel-expanded", JSON.stringify(value))`.

## Technical Decisions

### Layout Approach

Two-column flex row at root level. The panel is a `<div>` with fixed width (36 px collapsed, 240 px expanded) and `overflow: hidden`. The content area uses `flex: 1` to fill remaining width. Transition on panel width for smooth expand/collapse animation (`transition: width 0.2s ease`).

The root wrapper changes from single-column with padding to:
```
<div style={{ display: "flex", minHeight: "100vh" }}>
  <ProjectPanel ... />            /* fixed width */
  <div style={{ flex: 1, ... }}> /* scrollable content */
    <Legend />
    <ProjectView ... />
  </div>
</div>
```

### Collapsed Panel

The collapsed strip shows a vertical stack of small colored dots (one per project). Each dot is clickable and activates that project. Clicking anywhere else on the strip expands the panel. The active project's dot has a distinct highlight (gold border).

Color for each dot: derive from project index using a small palette array (consistent with existing `THEME.colors` pattern). This is a visual indicator only — no strict mapping to doc types.

### Expanded Panel

Layout (top to bottom):
1. **Header row:** Panel title ("Projects"), global ↻ button (refresh all), collapse chevron (‹)
2. **Project list:** Scrollable area. Each row shows:
   - Color dot (matching collapsed dot)
   - Project name (`displayName`, falling back to `key`)
   - Per-row ↻ button (refresh single project)
   - × button (remove project)
   - Active row highlighted with gold left border
3. **Add project input:** Fixed at bottom. Text input for local path + "Add" button. Shows spinner during `POST /api/projects`. Error message displayed inline on failure, auto-clears after 3 s.

### Tab Bar Removal

The `keys.map((k) => <button>...)` block (current lines 693–705) and the adjacent refresh button (lines 707–727) are removed entirely from the root component's JSX. The header row is simplified to just the title and subtitle.

### Refresh Button Relocation

The global ↻ button moves from the header to the panel header. Behavior is identical: `POST /api/refresh` → `window.__loadProjects()` → update `projects` state. The `refreshState` (`idle`/`refreshing`/`error`) state and `handleRefresh` callback remain in the root component and are passed to `ProjectPanel` as props.

### Per-Row Refresh

Each project row has its own ↻ button. On click:
1. `POST /api/refresh` with body `{ "projects": [key] }` — the existing endpoint already supports filtering by key
2. On success, call `window.__loadProjects()` to reload all project data (the simpler approach; targeted reload of a single project would require new infrastructure)
3. Row shows spinning state during the operation

### Remove Flow

On × click:
1. Confirm removal (no modal — immediate action, consistent with the lightweight UI)
2. `DELETE /api/projects/{key}`
3. On success: re-fetch project list, call `window.__loadProjects()` to refresh data
4. If the removed project was `active`, set `active` to the first remaining project key
5. If no projects remain after removal, show an empty-state message in the content area

### Active Project on Add

After a successful `POST /api/projects`, the newly added project should become the active project. The response includes the new project's `key`, which is used to set `active`.

### Error Handling

- Network errors and non-ok responses show an inline error message in the relevant UI region (panel for add/remove, row for per-row refresh)
- Error messages auto-clear after 3 seconds (consistent with existing refresh button error pattern)
- Console errors are logged for debugging

### Styling

All inline styles, consistent with the rest of the codebase. Panel background: slightly lighter than page (`#111128` or similar). Project rows have hover state. Scrollbar styled minimally (webkit pseudo-element for dark theme).

## UI Specification

### Layout Mockup — Expanded

```
┌──────────────────────────────────────────────────────────┐
│ ┌─────────────┐ ┌──────────────────────────────────────┐ │
│ │ Projects ↻ ‹│ │                                      │ │
│ ├─────────────┤ │  ⬡ Project Structure                 │ │
│ │● Context F ↻×│ │  ai-project-guide methodology viz   │ │
│ │○ Orchestr  ↻×│ │                                      │ │
│ │             │ │  ┌─ Legend ─────────────────────────┐ │ │
│ │             │ │  │ ...                              │ │ │
│ │             │ │  └──────────────────────────────────┘ │ │
│ │             │ │                                      │ │
│ │             │ │  ┌─ ProjectView ────────────────────┐ │ │
│ │             │ │  │ ...                              │ │ │
│ │             │ │  │                                  │ │ │
│ ├─────────────┤ │  └──────────────────────────────────┘ │ │
│ │[path...] Add│ │                                      │ │
│ └─────────────┘ └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

- `●` = active project dot (gold)
- `○` = inactive project dot
- `↻` in header = global refresh all
- `↻` per row = refresh single project
- `×` per row = remove project
- `‹` = collapse panel toggle
- Bottom input = add project by path

### Layout Mockup — Collapsed

```
┌──────────────────────────────────────────────────────────┐
│ ┌──┐ ┌────────────────────────────────────────────────┐  │
│ │› │ │                                                │  │
│ │● │ │  ⬡ Project Structure                           │  │
│ │○ │ │  ai-project-guide methodology viz              │  │
│ │  │ │                                                │  │
│ │  │ │  ┌─ Legend ─────────────────────────────────┐  │  │
│ │  │ │  │ ...                                      │  │  │
│ │  │ │  └──────────────────────────────────────────┘  │  │
│ │  │ │                                                │  │
│ │  │ │  ┌─ ProjectView ──────────────────────────────┐│  │
│ │  │ │  │ ...                                        ││  │
│ │  │ │  │                                            ││  │
│ │  │ │  └────────────────────────────────────────────┘│  │
│ └──┘ └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- `›` = expand panel toggle
- Dots are clickable to switch project
- Click anywhere else on strip to expand

### Interaction Flows

**Switch project (expanded):** Click project row → `setActive(key)` → content area re-renders with that project's data.

**Switch project (collapsed):** Click project dot → `setActive(key)` → content area re-renders.

**Add project:** Type local path into input → click "Add" or press Enter → `POST /api/projects {"path": "..."}` → on success: re-fetch project list and data, set new project as active → on error: show error message inline below input, auto-clear 3 s.

**Remove project:** Click × on row → `DELETE /api/projects/{key}` → on success: re-fetch list and data, adjust active if needed → on error: show error inline on row, auto-clear 3 s.

**Refresh single project:** Click ↻ on row → `POST /api/refresh {"projects": [key]}` → on success: re-load project data → show spin during operation.

**Refresh all:** Click ↻ in panel header → `POST /api/refresh` (no body = all) → re-load all data → spin during operation.

**Toggle panel:** Click ‹/› → toggle `panelExpanded` → write to `localStorage` → panel animates to new width.

## Success Criteria

### Functional Requirements
- Two-column layout renders correctly: panel left, content right, content fills remaining width
- Collapsed panel (~36 px) shows project color dots; clickable to activate project; click strip to expand
- Expanded panel (~240 px): project list with `displayName` (falling back to `key`), per-row ↻ and × controls, add-project input, global ↻ in header
- Clicking a project row activates it in the main content area
- Adding a project via path input parses, adds to manifest, and project appears in panel without page reload
- Removing a project removes it from panel; if active, view switches to first remaining project
- Per-row ↻ re-parses that project only
- Panel collapsed/expanded state survives page reload (localStorage)
- Header tab bar is removed; refresh button lives in panel header
- No console errors in normal operation

### Technical Requirements
- No new files — all changes in `project-structure-viz.jsx` and `index.html`
- Inline styles only, consistent with existing codebase
- `ProjectPanel` component stays under ~150 lines; root component stays under ~300 lines; total file stays under ~900 lines
- Loading and error states for async operations are visible to the user
- `window.__loadProjects()` is the single mechanism for reloading project data after mutations

## Risk Assessment

### Technical Risks
- **Root layout change:** Switching from single-column to two-column flex layout touches the outermost JSX structure. If the content area's width calculations break (e.g., SVG or fixed-width elements inside `ProjectView`), visual regressions may appear.

### Mitigation
- Test with 0, 1, and 3+ projects to verify layout at different panel states.
- The content area uses `flex: 1` with `overflow: auto`, which should handle width changes gracefully. Existing inline styles use percentages and `auto` margins, not fixed pixel widths.

## Implementation Notes

### Development Approach

Suggested order:
1. **Layout restructure** — Convert root component to two-column flex. Create `ProjectPanel` skeleton (empty panel, correct widths). Verify content area still renders correctly.
2. **Expanded panel** — Render project list from `GET /api/projects` (or from existing `projects` state). Wire click-to-activate. Show `displayName` with `key` fallback.
3. **Remove tab bar** — Delete tab buttons and header-area refresh button.
4. **Global refresh in panel** — Move refresh button to panel header, wire to existing `handleRefresh`.
5. **Add project** — Input + submit wired to `POST /api/projects`. Reload panel and data on success.
6. **Remove project** — × button wired to `DELETE /api/projects/{key}`. Handle active-project fallback.
7. **Per-row refresh** — ↻ per row wired to `POST /api/refresh { "projects": [key] }`.
8. **Collapsed panel** — Implement collapsed strip with project dots, expand/collapse toggle, `localStorage` persistence.
9. **Polish** — Loading/error states, hover effects, transition animations, empty-state handling.

### Testing Strategy

This slice is primarily UI work in a no-build-step, browser-rendered JSX environment. There are no unit-testable server changes.

**Manual verification:**
- Expanded panel renders project list correctly
- Collapsed panel shows dots, clicking dot switches project
- Add/remove/refresh operations work end-to-end
- Panel state persists across page reload
- Tab bar is fully removed
- No console errors

**Automated testing is out of scope** for this slice — the project has no frontend test infrastructure (no Jest, no Testing Library, no Playwright). Server endpoints are already tested in `test_serve.py`.
