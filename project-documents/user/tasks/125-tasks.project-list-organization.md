---
docType: tasks
slice: project-list-organization
project: context-visualizer
lld: user/slices/125-slice.project-list-organization.md
dependencies:
  - 120-slice.project-management-api
  - 121-slice.project-panel-ui
projectState: >
  Project panel (initiative 120) is complete. Panel renders project list from
  manifest.json via GET /api/projects. Projects can be added, removed, and
  refreshed. Manifest entries carry key, file, sourcePath, displayName.
  serve.py has do_GET, do_POST, do_DELETE handlers with _read_manifest()
  and _write_manifest() helpers. ProjectPanel component in
  project-structure-viz.jsx builds projectList from the projects prop.
dateCreated: 20260331
dateUpdated: 20260331
status: complete
---

## Context Summary

- Working on slice 125: Project List Organization
- Adds star/pin and hide/archive capabilities to the project panel
- Server: new `PATCH /api/projects/{key}` endpoint in `serve.py`
- UI: sorted project list (starred → normal → hidden), per-row controls
- Manifest schema gains optional `starred` and `hidden` boolean fields
- Mutual exclusion: starring un-hides, hiding un-stars
- Fully backward compatible — projects without new fields render normally
- Next planned work: TBD by Project Manager

---

## Task 1: PATCH endpoint in serve.py

- [x] Add `do_PATCH` method to the Handler class in `serve.py`
  - [x] Parse path to extract project key (same pattern as `do_DELETE`)
  - [x] Route `/api/projects/{key}` to the patch handler
  - [x] Read request body as JSON; return 400 on parse failure
  - [x] Read manifest via `_read_manifest()`; return error if manifest unreadable
  - [x] Find project entry by key; return 404 if not found
  - [x] Accept `starred` (boolean) and `hidden` (boolean) fields from request body; ignore other fields
  - [x] Enforce mutual exclusion: if `starred: true`, set `hidden: false`; if `hidden: true`, set `starred: false`
  - [x] Write updated manifest via `_write_manifest()`
  - [x] Return `{"status": "ok", "project": {updated entry}}` with 200
  - [x] Commit: `feat: add PATCH /api/projects/{key} endpoint for star/hide`

## Task 2: Test PATCH endpoint

- [x] Add tests for the PATCH endpoint in the existing test file (or new test file if needed)
  - [x] Test: PATCH with `{"starred": true}` sets starred on project entry, returns updated entry
  - [x] Test: PATCH with `{"hidden": true}` sets hidden on project entry
  - [x] Test: PATCH with `{"starred": true}` on a hidden project clears hidden
  - [x] Test: PATCH with `{"hidden": true}` on a starred project clears starred
  - [x] Test: PATCH with `{"starred": false}` clears starred
  - [x] Test: PATCH on nonexistent key returns 404
  - [x] Test: PATCH with invalid JSON returns 400
  - [x] Test: PATCH with no recognized fields leaves entry unchanged, returns 200
  - [x] Test: existing manifest entries without starred/hidden fields are handled gracefully (treated as false)
  - [x] All tests pass
  - [x] Commit: `test: add PATCH endpoint tests for star/hide`

## Task 3: Project list sorting in ProjectPanel

- [x] Modify `projectList` derivation in `ProjectPanel` to include `starred` and `hidden` from each project's manifest data
  - [x] The `projects` prop (from `window.__PROJECTS`) carries manifest fields. Confirm `starred`/`hidden` are available; if not, thread them through from the manifest data loaded by `loadProjects()`
  - [x] Sort `projectList` into three groups: starred first, then normal, then hidden. Preserve original manifest order within each group
  - [x] Absent `starred`/`hidden` fields default to `false` (no change for existing projects)
  - [x] Verify: panel renders in correct order — starred at top, hidden at bottom, normal in between
  - [x] Commit: `feat: sort project list by starred/normal/hidden groups`

## Task 4: Star toggle control

- [x] Add star toggle button to each project row in the expanded panel
  - [x] Display ☆ (outline) for unstarred projects, ★ (filled) for starred
  - [x] Unstarred color: `#555577` (matches existing control colors). Starred color: `#FFD700` (gold)
  - [x] Position: in the row control area, before the refresh button
  - [x] Add `handleToggleStar(key)` handler:
    1. Call `PATCH /api/projects/{key}` with `{ "starred": !current }`
    2. On success, call `onProjectsChanged()` to reload the list
  - [x] Starred project name text renders at full brightness (`#E8E8FF`)
  - [x] Verify: clicking star moves project to top; clicking again moves it back
  - [x] Commit: `feat: add star toggle to project panel rows`

## Task 5: Hide/unhide control

- [x] Add hide control to each project row for normal and starred projects
  - [x] Icon: downward arrow (↓) or similar de-emphasis indicator
  - [x] Color: `#555577`, hover: `#8888AA` (same pattern as existing controls)
  - [x] Add `handleToggleHidden(key)` handler:
    1. Call `PATCH /api/projects/{key}` with `{ "hidden": true }`
    2. On success, call `onProjectsChanged()` to reload the list
- [x] For hidden projects, replace the hide control with an unhide/restore control
  - [x] Icon: upward arrow (↑) or eye icon
  - [x] Clicking calls `PATCH /api/projects/{key}` with `{ "hidden": false }`
- [x] Add visual divider between normal and hidden sections
  - [x] Subtle line: `1px solid #1E1E3A` (matches existing panel divider style)
  - [x] Only render divider when hidden projects exist
- [x] Hidden project rows render at reduced opacity (0.4)
- [x] Hidden projects remain clickable — clicking activates them in the main view
- [x] Verify: hiding moves project to bottom dimmed section; unhiding restores it
- [x] Commit: `feat: add hide/unhide controls and dimmed section to project panel`

## Task 6: Test UI interactions with Playwright

- [x] E2E test: star a project and verify it moves to top of list
  - [x] Load visualizer, expand panel
  - [x] Click star on a non-first project
  - [x] Assert project is now first in the list
  - [x] Assert star icon shows filled (★)
- [x] E2E test: unstar a project and verify it returns to normal position
- [x] E2E test: hide a project and verify it appears in dimmed section at bottom
  - [x] Assert opacity is reduced
  - [x] Assert divider is present above hidden section
- [x] E2E test: unhide a project and verify it returns to normal section
- [x] E2E test: click a hidden project and verify it loads in main view
- [x] E2E test: reload page and verify star/hide state persists
- [x] All E2E tests pass
- [x] Commit: `test: add E2E tests for project list organization`

## Task 7: Verification and cleanup

- [x] Run full test suite (unit + E2E) — all pass
- [x] Manual verification walkthrough per slice design:
  - [x] Star → project moves to top, persists across reload
  - [x] Hide → project moves to bottom dimmed, persists across reload
  - [x] Mutual exclusion: star hidden project → un-hides; hide starred project → un-stars
  - [x] Backward compatible: projects without starred/hidden fields render normally
  - [x] Existing add/remove/refresh functionality unaffected
- [x] Update slice status to `complete` in `125-slice.project-list-organization.md`
- [x] Check off slice 125 in `120-slices.project-management.md`
- [x] Commit: `docs: mark slice 125 complete`
