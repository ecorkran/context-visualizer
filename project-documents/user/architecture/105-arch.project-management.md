---
docType: architecture
layer: project
project: context-visualizer
archIndex: 105
component: project-management
dateCreated: 20260226
dateUpdated: 20260226
status: complete
relatedSlices: []
riskLevel: low
---

## Overview

The visualizer currently has no UI for managing which projects are tracked. Projects are added exclusively by running `parse.py` from the command line, and there is no way to remove a project or discover available projects without direct file editing. The project list is controlled implicitly — users must know about and operate the CLI to change it.

This architectural component introduces user-controlled project catalog management: a persistent left panel that serves as both the project selector and the management interface for adding and removing tracked projects. It also replaces the current tab-bar-based project switching, consolidating project navigation into the panel.

**Scope:** Manifest schema extension, server-side catalog management endpoints, and a collapsible left panel UI replacing the tab bar as the project selector. Local project sources only — remote sources (GitHub) are explicitly out of scope.

**Motivation:** As the number of tracked projects grows, the current tab-bar pattern doesn't scale — tabs overflow horizontally and there is no way to manage the list from the UI. The CLI-only add workflow creates friction for onboarding new projects. Centralizing project management in a visible, low-footprint panel resolves both problems while also making the manifest's role explicit to the user.

## Design Goals

- **User-controlled catalog** — Users can add a project by providing a local path and remove any tracked project, entirely from within the UI. No CLI commands required for routine catalog management.

- **Always accessible, minimally intrusive** — The panel is visible at all times but defaults to a collapsed state that occupies minimal horizontal space (~36px). Project management is one click away without dominating the screen.

- **Panel as the unified project selector** — The panel replaces the existing tab bar as the mechanism for switching between projects. Project navigation and project management are co-located in one control surface.

- **Manifest as persistent catalog state** — The manifest file remains the authoritative record of tracked projects. All catalog changes are reflected immediately in the manifest. The panel reads from and writes to the manifest exclusively through server endpoints — no direct file manipulation from the client.

- **Consistent server pattern** — Catalog management endpoints follow the same design conventions established by `/api/refresh`: stdlib-only Python server, JSON request/response, structured error responses.

## Architectural Principles

- **Single source of truth** — `projects/manifest.json` is the definitive project catalog. The panel renders from manifest data; it holds no authoritative state of its own. Any operation that changes the catalog (add, remove) goes through a server endpoint that updates the manifest before the client reloads.

- **Panel replaces tabs** — When the panel ships, the header tab buttons are removed. The panel handles both project selection (click a row to activate) and project management (add/remove). Keeping both would duplicate navigation state.

- **Synchronous parse on add** — Adding a project triggers `parse.py` synchronously, the same pattern used by `/api/refresh`. This keeps the server stateless and the flow predictable. Async handling is not in scope for this initiative.

- **Collapsed by default** — The panel's default state is collapsed (icon strip). Users who want to manage projects expand it explicitly. This respects screen real estate when management actions are not needed.

- **Manifest carries display metadata** — The manifest entry must include a `displayName` field so the panel can render project names without depending on fully-loaded project JSON. This field is written by `parse.py` at parse time and requires no separate management step.

## Current State

- Projects enter the manifest only via `python parse.py /path/to/project` — no UI path exists.
- There is no way to remove a project from the manifest via the UI; it requires manual file editing.
- The visualizer header renders project tabs dynamically from the loaded `PROJECTS` object. With many projects, tabs overflow horizontally.
- Manifest entries carry `key`, `file`, and `sourcePath` but no display name; the project's human-readable name is only available after the full project JSON is loaded.
- The tab bar and the project management problem are coupled: fixing the navigation scaling problem requires introducing a new navigation surface anyway.

## Envisioned State

- A collapsible panel occupies the left side of the layout. Collapsed, it shows a narrow strip of project color chips. Expanded (~240px), it shows a full project list with add and remove controls.
- Clicking any project row (in either collapsed or expanded state) activates that project in the main content area.
- An "add project" control in the panel accepts a local filesystem path, triggers a parse via the server, and adds the project to the manifest. The panel list updates immediately.
- A remove control on each project row removes the entry from the manifest (and optionally the JSON file). The project disappears from the panel and the main view reverts to the first remaining project.
- The header tab bar is removed. All project selection and management flows through the panel.
- Manifest entries carry `displayName` so the panel renders correctly before (or without) loading full project JSON.
- Panel expanded/collapsed state persists across page reloads.

## Technical Considerations

- **Two-column layout** — The current single-column layout must become a flex row with the panel on the left and the main content on the right. The content area must shrink responsively when the panel expands. This is a root-level layout change in the JSX component.

- **Manifest `displayName` field** — `parse.py` already has access to the project's name from the parsed output. Adding `displayName` to the manifest entry at parse time is a minor change with no backward-incompatibility concern (existing entries without the field fall back gracefully).

- **Active project state ownership** — Currently, `active` state lives in `ProjectStructureVisualizer`. When the panel replaces the tab bar, the active project is still owned at the top level and passed into the panel as a prop (or managed via a callback). No state management library is needed — standard React prop/callback pattern applies.

- **Add-project latency** — Parsing a project can take several seconds for large repositories. The panel must communicate in-progress state during this operation. The server endpoint is synchronous; the panel shows a loading indicator while awaiting the response.

- **Remove with optional file deletion** — When a project is removed, the server removes the manifest entry. Whether to also delete the `{key}-structure.json` file is a UX decision: deleting is cleaner; preserving allows re-adding without a re-parse. This trade-off should be resolved during slice design.

- **Panel state persistence** — Collapsed/expanded state is a candidate for `localStorage` so the panel remembers the user's preference across page reloads. This is a self-contained enhancement within the UI slice.

## Anticipated Slices

- **Project Management API** — Extend manifest schema with `displayName`; add `GET /api/projects`, `POST /api/projects` (add + parse), and `DELETE /api/projects/{key}` endpoints to `serve.py`; update `parse.py` to write `displayName` to manifest entries. No UI changes. Deliverable: fully functional API testable via `curl`.

- **Project Panel UI** — Two-column layout, collapsible panel component (expanded list / collapsed chip strip), project rows with activation and remove controls, add-project path input wired to the API, panel state persistence via `localStorage`, removal of header tab bar. Depends on the API slice.

- **Collectors: Maintenance and Future Work** — Add two synthetic initiatives to the visualizer. A **maintenance collector** groups 9xx maintenance slices into a dedicated initiative. A **future work collector** aggregates future work items across all slice plans (via MCP `workflow_future` tool), displayed as an initiative with items grouped by source slice plan. Both are additive — existing slice plan views remain unchanged. Future work collector is gated by an internal config setting (not exposed in UI). Base color: saturated blue (~#08A8F6).

## Related Work

- [100-arch.file-updates-and-organization.md](100-arch.file-updates-and-organization.md) — Established the `projects/` directory, manifest format, and `serve.py` server patterns this component extends.
- [100-slices.file-updates-and-organization.md](100-slices.file-updates-and-organization.md) — Slice plan for initiative 100 (complete). Both slices (Data Externalization, Refresh Mechanism) are prerequisites.
