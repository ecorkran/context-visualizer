---
docType: changelog
scope: project-wide
---

# Changelog

All notable changes to context-visualizer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Cross-project dashboard view: 2-column tile grid toggled from panel header (DETAIL/DASH)
- `GET /api/dashboard` endpoint aggregating `workflow_status`, `workflow_next`, `workflow_check` per project
- `theme.js` status color token module (`--status-ok/info/waiting/complete/warning/error`)
- `ViewModeToggle`, `ProjectDashboard`, `ProjectTile` components
- View mode persisted in `localStorage` under `cv.viewMode`
- Per-project MCP failure sets `tileState: "error"` without aborting the full response
- Dashboard refetches on star/hide changes and panel refresh
- Star/pin projects to top of panel list via per-row toggle (★/☆)
- Hide/archive projects to dimmed section at bottom with restore control (↓/↑)
- `PATCH /api/projects/{key}` endpoint for updating starred/hidden fields
- Mutual exclusion: starring un-hides, hiding un-stars (server-enforced)
- Visual divider between normal and hidden project sections
- State persists in manifest.json across page reloads
