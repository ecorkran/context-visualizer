---
docType: architecture
layer: project
project: context-visualizer
archIndex: 120
component: project-management
dateCreated: 20260226
dateUpdated: 20260417
note: Slice 127 supersedes manifest-based principles below; MCP is now the single source of truth for the project catalog.
status: complete
relatedSlices: []
riskLevel: low
---

## Overview

The visualizer currently has no UI for managing which projects are tracked. Projects are added exclusively by running `parse.py` from the command line, and there is no way to remove a project or discover available projects without direct file editing. The project list is controlled implicitly — users must know about and operate the CLI to change it.

This architectural component introduces user-controlled project catalog management: a persistent left panel that serves as both the project selector and the management interface for adding and removing tracked projects. It also replaces the current tab-bar-based project switching, consolidating project navigation into the panel.

**Scope:** Manifest schema extension, server-side catalog management endpoints, a collapsible left panel UI replacing the tab bar as the project selector, and portfolio-level views rendered in the same content area as per-project detail views. Local project sources only — remote sources (GitHub) are explicitly out of scope.

**Motivation:** As the number of tracked projects grows, the current tab-bar pattern doesn't scale — tabs overflow horizontally and there is no way to manage the list from the UI. The CLI-only add workflow creates friction for onboarding new projects. Centralizing project management in a visible, low-footprint panel resolves both problems while also making the manifest's role explicit to the user.

## Design Goals

- **User-controlled catalog** — The panel surfaces the project catalog; add/remove from the UI is a future capability dependent on MCP gaining `project_create`/`project_delete` tools. Projects are currently discovered via MCP `project_list`.

- **Always accessible, minimally intrusive** — The panel is visible at all times but defaults to a collapsed state that occupies minimal horizontal space (~36px). Project management is one click away without dominating the screen.

- **Panel as the unified project selector** — The panel replaces the existing tab bar as the mechanism for switching between projects. Project navigation and project management are co-located in one control surface.

- **MCP as the single source of truth** — As of Slice 127, `projects/manifest.json` is retired. The project catalog is owned by context-forge and accessed via MCP `project_list`. There is no local fallback; MCP-disconnected state returns a `503` on all catalog-dependent endpoints.

- **Consistent server pattern** — Catalog management endpoints follow the same design conventions established by `/api/refresh`: stdlib-only Python server, JSON request/response, structured error responses.

## Architectural Principles

- **MCP is the catalog** — `project_list` is the authoritative source. The panel renders from MCP data; it holds no authoritative state of its own. `projects/manifest.json` is retired (removed in Slice 127).

- **Panel replaces tabs** — When the panel ships, the header tab buttons are removed. The panel handles project selection (click a row to activate). Add/remove controls are deferred until MCP gains the relevant tools.

- **Collapsed by default** — The panel's default state is collapsed (icon strip). Users who want to see the full project list expand it explicitly.

- **MCP `project_list` carries display metadata** — `displayName` and `sourcePath` come from MCP. No local file carries this metadata.

- **Portfolio views share the content area** — Cross-project aggregate views (e.g. a status dashboard) render in the same right-side content area as per-project detail views. Users switch between detail and portfolio modes from a control in the panel header; active mode is persisted in `localStorage`. All portfolio views are MCP-only; MCP-disconnected state returns a `503` — there is no local fallback.

- **Consistent MCP-disconnect behavior** — All catalog-dependent endpoints (`/api/projects`, `/api/refresh`, `/api/dashboard`, `/api/info`, `/api/structures`) return `503` when MCP is disconnected. No endpoint silently falls back to stale local data.

- **Status color tokens are centralized** — Tile-style UI surfaces that signal project state (error/warning/ok/info) draw their colors from a single CSS custom property definition (e.g. `src/theme.js` exporting `--status-*` tokens). Components reference the token name, never a hex literal. This keeps the palette editable in one place. Governance is narrow: the token set covers status signaling only, not every visual color in the app. Existing colors (project colors, panel, detail-view palette) are unaffected.

## Current State

- Projects enter the manifest only via `python parse.py /path/to/project` — no UI path exists.
- There is no way to remove a project from the manifest via the UI; it requires manual file editing.
- The visualizer header renders project tabs dynamically from the loaded `PROJECTS` object. With many projects, tabs overflow horizontally.
- Manifest entries carry `key`, `file`, and `sourcePath` but no display name; the project's human-readable name is only available after the full project JSON is loaded.
- The tab bar and the project management problem are coupled: fixing the navigation scaling problem requires introducing a new navigation surface anyway.

## Envisioned State

- A collapsible panel occupies the left side of the layout. Collapsed, it shows a narrow strip of project color chips. Expanded (~240px), it shows a full project list with add and remove controls.
- Clicking any project row (in either collapsed or expanded state) activates that project in the main content area.
- The header tab bar is removed. All project selection flows through the panel.
- Project list is sourced from MCP `project_list`; `displayName` and `sourcePath` come from MCP. No manifest file.
- Add/remove controls are not present; catalog management is owned by context-forge.
- Panel expanded/collapsed state persists across page reloads.

## Technical Considerations

- **Two-column layout** — The current single-column layout must become a flex row with the panel on the left and the main content on the right. The content area must shrink responsively when the panel expands. This is a root-level layout change in the JSX component.

- **Active project state ownership** — `active` state lives in `ProjectStructureVisualizer`, passed into the panel as a prop with a callback. No state management library needed.

- **No add/remove in the panel** — Catalog management is context-forge's responsibility. The panel is read-only with respect to the catalog.

- **Panel state persistence** — Collapsed/expanded state is a candidate for `localStorage` so the panel remembers the user's preference across page reloads. This is a self-contained enhancement within the UI slice.

## Anticipated Slices

- **Project Management API** — Extend manifest schema with `displayName`; add `GET /api/projects`, `POST /api/projects` (add + parse), and `DELETE /api/projects/{key}` endpoints to `serve.py`; update `parse.py` to write `displayName` to manifest entries. No UI changes. Deliverable: fully functional API testable via `curl`.

- **Project Panel UI** — Two-column layout, collapsible panel component (expanded list / collapsed chip strip), project rows with activation and remove controls, add-project path input wired to the API, panel state persistence via `localStorage`, removal of header tab bar. Depends on the API slice.

- **Collectors: Maintenance and Future Work** — Add two synthetic initiatives to the visualizer. A **maintenance collector** groups 9xx maintenance slices into a dedicated initiative. A **future work collector** aggregates future work items across all slice plans (via MCP `workflow_future` tool), displayed as an initiative with items grouped by source slice plan. Both are additive — existing slice plan views remain unchanged. Future work collector is gated by an internal config setting (not exposed in UI). Base color: saturated blue (~#08A8F6).

- **Cross-project dashboard view** — Portfolio-level status grid rendered in the content area, toggled from the panel header. One tile per non-hidden project, starred first. Backed by a new `GET /api/dashboard` endpoint that aggregates MCP `workflow_status`, `workflow_next`, and `workflow_check` per project. Introduces the `src/theme.js` status token module described under Architectural Principles. MCP-only.

## Related Work

- [100-arch.file-updates-and-organization.md](100-arch.file-updates-and-organization.md) — Established the `projects/` directory, manifest format, and `serve.py` server patterns this component extends.
- [100-slices.file-updates-and-organization.md](100-slices.file-updates-and-organization.md) — Slice plan for initiative 100 (complete). Both slices (Data Externalization, Refresh Mechanism) are prerequisites.
