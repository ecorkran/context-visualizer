---
docType: slice-plan
parent: user/architecture/105-arch.project-management.md
project: context-visualizer
dateCreated: 20260226
dateUpdated: 20260226
---

# Slice Plan: Project Management

## Parent Document
[105-arch.project-management.md](105-arch.project-management.md) — Architectural component introducing user-controlled project catalog management: a collapsible left panel that serves as both the project selector and the add/remove interface, backed by server-side catalog endpoints.

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

107. [x] **Local project discovery (scan)** — Endpoint that walks a root directory looking for `project-documents/user/` patterns and returns candidate project paths for the user to confirm-add. Depends on Project Management API. Additionally, for the existing Add button on project path (if it remains), allow the user to browse for the path.  Risk: Low. Effort: 2/5.


## Notes

- **No migration slices needed** — Both slices add new capabilities rather than restructuring existing behavior. The tab bar removal in Slice 106 is a direct replacement, not a migration.
- **displayName resolution** — `parse.py` already has access to `data["name"]` from parsed output. Writing it to the manifest is a one-line addition during the manifest upsert step.
- **Remove-and-delete trade-off** — Whether `DELETE /api/projects/{key}` also deletes the `{key}-structure.json` file is a slice-design decision. Both options leave the system in a working state; the difference is convenience vs. tidiness. Resolve during Slice 105 design.
- **Tab bar removal timing** — The tab bar is only removed in Slice 106, not Slice 105. During the interval between the two slices (when the API exists but the panel does not), the UI is unchanged and fully functional.
- **Refresh button relocation** — The global ↻ button currently sits in the header beside the tab bar. Slice 106 moves it to the panel header, which is the natural home for "refresh all projects." This is in scope for Slice 106 and should be called out explicitly in that slice design.
- **No dedicated integration slice** — Slice 106's end-to-end verification covers the cross-cutting concerns. The component count and surface area don't warrant a separate integration slice.

## Future Work

- [ ] **GitHub source support** — Extend manifest schema with `source`, `repoUrl`, `branch` fields; add `git clone`/`git pull` step to the add/refresh flow for GitHub-sourced projects; auth token handling. Depends on Project Management API. Risk: Medium. Effort: 3/5.
