---
docType: slice-plan
parent: user/architecture/100-arch.file-updates-and-organization.md
project: context-visualizer
dateCreated: 20260224
dateUpdated: 20260224
---

# Slice Plan: File Updates and Organization

## Parent Document
[100-arch.file-updates-and-organization.md](100-arch.file-updates-and-organization.md) — Architectural component addressing separation of project data from the visualization component, structured storage for parsed JSON, and user-triggered refresh.

## Migration / Refactoring Slices

1. [x] **Data Externalization**
   Migrate project data out of the JSX component and into external JSON files loaded at runtime.
   - Move existing JSON data (`context-forge-structure.json`, `orchestration-structure.json`) into a `projects/` subdirectory with consistent naming (`{projectname}-structure.json`)
   - Update `parse_project.py` to default output to `projects/` with the standardized filename pattern
   - Replace the inline `SAMPLE_PROJECTS` constant in `project-structure-viz.jsx` with a data-loading mechanism that fetches JSON from `projects/` at startup
   - Rename `// SAMPLE DATA` section header to `// DATA` and `SAMPLE_PROJECTS` to `PROJECTS` throughout the component
   - Introduce a project manifest or discovery mechanism so the visualizer knows which projects are available
   - **Value:** Reduces component file size significantly (~8,200 lines includes all inline data), decouples data from presentation, and establishes the file organization pattern that future capabilities (GitHub ingestion, multi-project management) will build on.
   - **Success Criteria:**
     - Project JSON files live in `projects/` directory, not the project root
     - `project-structure-viz.jsx` contains no inline project data
     - `SAMPLE_PROJECTS` / `SAMPLE DATA` naming is fully replaced with `PROJECTS` / `DATA`
     - Visualizer loads and displays project data identically to current behavior
     - Parser outputs to `projects/` by default
     - Re-parsing a project replaces the existing JSON file in `projects/`
   - **Dependencies:** None
   - **Interfaces:** The visualizer consumes JSON files from `projects/{projectname}-structure.json`. The parser produces files in that location. A project discovery mechanism (manifest or convention) bridges the two.
   - **Risk:** Low — straightforward file reorganization and data loading refactor. The JSON format and component rendering logic are unchanged.
   - **Effort:** 2/5

2. [ ] **Refresh Mechanism**
   Add a UI control that triggers re-parsing of loaded projects and updates the display.
   - Add a refresh button (circular arrow icon) positioned immediately to the right of the project tab selectors
   - Implement a lightweight local mechanism to invoke the Python parser from the browser context and reload the updated JSON
   - Display should update in place after re-parse completes without full page reload
   - **Value:** Eliminates the manual workflow of re-running the parser in terminal, then refreshing the browser. Users can iterate on project documents and see updates with a single click.
   - **Success Criteria:**
     - Refresh button is visible to the right of the project tabs, using the standard circular-arrow icon
     - Clicking refresh triggers a re-parse of loaded projects via the Python parser
     - Updated JSON is reloaded and the display reflects current project state
     - System remains in a working state if the re-parse fails (error feedback, no blank screen)
   - **Dependencies:** Data Externalization (the refresh mechanism reloads external JSON files; it cannot work while data is inline)
   - **Interfaces:** Requires a local bridge between the browser and the Python parser (e.g., a small local server, a script endpoint, or similar). Consumes the same `projects/{projectname}-structure.json` files produced by the parser.
   - **Risk:** Medium — the browser-to-Python bridge is the one area requiring a design decision. The current static-site setup has no server component, so this slice introduces one (even if minimal).
   - **Effort:** 3/5

## Notes
- **Implementation order** is sequential: Data Externalization first, then Refresh Mechanism. The refresh slice depends on external JSON files being in place.
- **No foundation work needed** — the project already has a working parser and visualizer. This is restructuring existing code.
- **No integration work anticipated** — the two slices are self-contained within this architectural component. Cross-cutting concerns (deployment, testing) are not in scope for this component.
- The local bridge mechanism for the refresh slice (small HTTP server, filesystem watcher, etc.) is a design decision to be resolved during slice design (Phase 4). The architecture document intentionally leaves this open.
- Parser consolidation is resolved: `parse_project.py` (older, superseded) has been removed. `parse.py` is the single parser.

## Future Work
None at this time. Parser consolidation (previously tracked here) was resolved — `parse_project.py` was the older version and has been removed. `parse.py` is the single parser.
