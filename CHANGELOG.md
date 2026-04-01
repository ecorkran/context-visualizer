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
- Star/pin projects to top of panel list via per-row toggle (★/☆)
- Hide/archive projects to dimmed section at bottom with restore control (↓/↑)
- `PATCH /api/projects/{key}` endpoint for updating starred/hidden fields
- Mutual exclusion: starring un-hides, hiding un-stars (server-enforced)
- Visual divider between normal and hidden project sections
- State persists in manifest.json across page reloads
