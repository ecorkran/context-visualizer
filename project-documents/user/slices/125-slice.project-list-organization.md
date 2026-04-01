---
docType: slice-design
project: context-visualizer
initiative: 120
sliceIndex: 125
sliceName: project-list-organization
dateCreated: 20260331
dateUpdated: 20260331
status: complete
dependencies:
  - 120-slice.project-management-api
  - 121-slice.project-panel-ui
lld: 120-arch.project-management
interfaces:
  consumes:
    - GET /api/projects
    - PATCH /api/projects/{key}
  provides:
    - PATCH /api/projects/{key} (new endpoint)
    - manifest.json starred/hidden fields
---

# Slice Design: Project List Organization

## Overview

As the project list grows, users need to prioritize frequently-used projects and de-emphasize rarely-used ones. This slice adds two capabilities to the project panel:

1. **Star/pin** — Toggle a star on any project to pin it to the top of the list.
2. **Hide/archive** — Send a project to a dimmed "archived" section at the bottom of the panel, keeping it accessible but out of the way.

Both states persist in `manifest.json` via a new `PATCH /api/projects/{key}` endpoint.

## Data Model

### Manifest Schema Extension

Each project entry in `manifest.json` gains two optional boolean fields:

```json
{
  "key": "context-forge",
  "file": "context-forge-structure.json",
  "sourcePath": "/path/to/project",
  "displayName": "Context Forge",
  "starred": true,
  "hidden": false
}
```

- `starred` — `true` pins the project to the top. Default: `false` (absent = false).
- `hidden` — `true` moves the project to the archived section. Default: `false` (absent = false).
- A project cannot be both `starred` and `hidden`. Starring a hidden project un-hides it; hiding a starred project un-stars it.

## Server: PATCH Endpoint

### `PATCH /api/projects/{key}`

New endpoint in `serve.py` to update project metadata fields.

**Request:**
```json
{ "starred": true }
```
or
```json
{ "hidden": true }
```

**Accepted fields:** `starred` (boolean), `hidden` (boolean). Other fields are ignored.

**Mutual exclusion logic** (server-side):
- If `starred: true` is set, `hidden` is forced to `false`.
- If `hidden: true` is set, `starred` is forced to `false`.
- Both `false` is fine (normal project).

**Response:**
```json
{ "status": "ok", "project": { "key": "...", "starred": true, "hidden": false, ... } }
```

**Error cases:**
- Unknown key → `404 {"status": "error", "message": "Project not found"}`
- Invalid JSON → `400 {"status": "error", "message": "..."}`

**Implementation:** Add `do_PATCH` method to the Handler class. Route parsing extracts `{key}` from the path (same pattern as `DELETE`). Read manifest, find entry by key, update fields, enforce mutual exclusion, write manifest, return updated entry.

## UI: Panel List Sorting and Sections

### Sort Order

The `projectList` array in `ProjectPanel` is sorted into three groups:

1. **Starred** — `starred: true`, sorted by original manifest order within the group.
2. **Normal** — neither starred nor hidden, original manifest order.
3. **Hidden** — `hidden: true`, original manifest order within the group.

### Visual Treatment

**Starred projects:**
- A filled star icon (★) replaces the color dot's left position, or appears adjacent to the name.
- Star color: `#FFD700` (gold), matching the active-project highlight.
- Name text uses full brightness (same as active project text color `#E8E8FF`).

**Normal projects:**
- No change from current rendering.

**Hidden projects:**
- Rendered at reduced opacity (0.4).
- Separated from normal projects by a subtle divider line (`1px solid #1E1E3A`).
- Name text and controls are dimmed but still interactive.
- An "unhide" control (eye icon or similar) replaces the × remove button.

### Controls

Each project row gains a star toggle in the row's control area:

- **Star toggle:** Click to toggle `starred`. Calls `PATCH /api/projects/{key}` with `{ "starred": !current }`. Visual: outline star (☆) when unstarred, filled star (★) when starred. Color: `#555577` unstarred, `#FFD700` starred.
- **Hide toggle:** Click × on a normal or starred project does what it does today (removes). A new "hide" action is needed — a small eye-slash icon (or downward arrow ↓) that calls `PATCH` with `{ "hidden": true }`. For hidden projects, the × becomes an "unhide" restore button.

**Interaction flow:**
- Star a project: `PATCH { "starred": true }` → project moves to top of list.
- Unstar: `PATCH { "starred": false }` → project moves back to normal section.
- Hide: `PATCH { "hidden": true }` → project moves to bottom dimmed section.
- Unhide: `PATCH { "hidden": false }` → project moves back to normal section.

After each PATCH, the client reloads the project list (`onProjectsChanged()`) so the sort order updates.

### MCP Mode Considerations

In MCP mode, the project list is managed by context-forge. The star/hide state is local to the visualizer's manifest. Since MCP mode still reads from the local manifest for the project list, the `starred` and `hidden` fields work the same way — they're visualizer-only metadata that doesn't affect context-forge.

## Component Changes

### `ProjectPanel`

1. **`projectList` derivation** — After building the list from `projects`, read `starred`/`hidden` from each project's manifest entry. Sort into three groups.
2. **Star toggle** — New inline button per row. Calls `handleToggleStar(key)`.
3. **Hide/unhide toggle** — New inline button per row. Calls `handleToggleHidden(key)`.
4. **Hidden section** — Conditional divider + dimmed rendering for hidden projects.
5. **New handlers:**
   - `handleToggleStar(key)` — PATCH starred, reload list.
   - `handleToggleHidden(key)` — PATCH hidden, reload list.

### `serve.py`

1. **`do_PATCH` method** — New method on Handler. Routes `/api/projects/{key}` to a handler that reads manifest, updates fields, writes manifest.
2. **Manifest I/O** — Reuses existing `_read_manifest()` / `_write_manifest()` helpers.

### Data Flow

```
User clicks ★ on "Context Forge"
  → handleToggleStar("context-forge")
  → PATCH /api/projects/context-forge { "starred": true }
  → serve.py reads manifest, sets starred=true on entry, writes manifest
  → 200 { "status": "ok", "project": {...} }
  → onProjectsChanged() reloads project list
  → projectList re-sorts: Context Forge now in starred group at top
  → React re-renders panel
```

## Success Criteria

- [ ] Starring a project pins it to the top of the panel list; unstarring moves it back.
- [ ] Hiding a project moves it to a dimmed section at the bottom; unhiding restores it.
- [ ] Star and hidden states persist across page reloads (stored in manifest.json).
- [ ] Starring a hidden project un-hides it; hiding a starred project un-stars it.
- [ ] `PATCH /api/projects/{key}` returns correct responses for success, not-found, and invalid input.
- [ ] The active project indicator (gold left border) works correctly regardless of starred/hidden state.
- [ ] Hidden projects remain selectable — clicking one still loads it in the main view.
- [ ] Panel behavior is unchanged for projects with no starred/hidden fields (backward compatible).

## Verification Walkthrough

1. **Star a project:**
   - Open visualizer, expand project panel.
   - Click the star icon on any project (e.g., "Test1").
   - Verify the project moves to the top of the list with a gold star.
   - Reload page — verify it's still starred and at the top.

2. **Hide a project:**
   - Click the hide control on a project (e.g., "Cf Test 21").
   - Verify it moves to the bottom of the list, dimmed.
   - Verify it's separated by a divider from normal projects.
   - Click it — verify it still loads in the main content area.

3. **Unhide:**
   - Click restore on the hidden project.
   - Verify it returns to the normal section at full opacity.

4. **Mutual exclusion:**
   - Star a project, then hide it — verify it un-stars and moves to hidden.
   - Hide a project, then star it — verify it un-hides and moves to top.

5. **API verification:**
   ```bash
   curl -X PATCH http://localhost:5678/api/projects/context-forge \
     -H 'Content-Type: application/json' \
     -d '{"starred": true}'
   # Expect: {"status": "ok", "project": {..., "starred": true, "hidden": false}}

   curl -X PATCH http://localhost:5678/api/projects/nonexistent \
     -H 'Content-Type: application/json' \
     -d '{"starred": true}'
   # Expect: 404 {"status": "error", "message": "Project not found"}
   ```

6. **Backward compatibility:**
   - Verify projects without starred/hidden fields render normally.
   - Verify existing add/remove/refresh functionality is unaffected.

## Risks

- **Low:** Manifest schema extension is additive — existing entries without the new fields work unchanged.
