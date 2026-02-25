---
docType: slice-design
slice: data-externalization
project: context-visualizer
parent: user/architecture/100-slices.file-updates-and-organization.md
dependencies: []
interfaces: [101-slice.refresh-mechanism]
status: complete
dateCreated: 20260224
dateUpdated: 20260225
---

# Slice Design: Data Externalization

## Overview
Migrate project data out of the visualization component and into external JSON files loaded at runtime. This eliminates the current pattern of embedding thousands of lines of JSON directly in `project-structure-viz.jsx`, replacing it with a clean data-loading mechanism that fetches from a `projects/` directory.

## Value
- **Developer value:** Reduces `project-structure-viz.jsx` from ~8,200 lines to primarily rendering logic. Editing the component no longer requires scrolling past massive data blocks.
- **Architectural enablement:** Establishes the external data pattern that the Refresh Mechanism slice and future capabilities (GitHub ingestion, multi-project management) depend on. The visualizer becomes data-source agnostic — it loads JSON from a known location rather than containing it.

## Technical Scope

**Included:**
- Create `projects/` directory for parsed JSON output
- Move existing JSON files into `projects/` with standardized naming
- Update `parse.py` to default output to `projects/`
- Replace inline `SAMPLE_PROJECTS` in JSX with runtime `fetch()` from `projects/`
- Rename `SAMPLE DATA` / `SAMPLE_PROJECTS` to `DATA` / `PROJECTS`
- Create a project manifest mechanism for discovery
- Update `index.html` if needed to support the loading pattern

**Excluded:**
- Refresh/re-parse capability (that's the next slice)
- Build toolchain changes (staying with CDN Babel transform)
- Any backend or server component
- Changes to the JSON schema itself

## Dependencies

### Prerequisites
None. This is the first slice in the initiative.

### Interfaces Required
- The parser (`parse.py`) output format remains unchanged — this slice only changes *where* output goes, not *what* it contains.

## Architecture

### Component Structure

Three components are modified:

1. **`parse.py`** — Updated CLI to default output to `projects/{projectname}-structure.json`. The `-o` flag continues to work for explicit paths.

2. **`projects/` directory** — New directory containing:
   - `{projectname}-structure.json` files (one per parsed project)
   - `manifest.json` — lists available projects so the visualizer knows what to load

3. **`project-structure-viz.jsx`** — The inline `SAMPLE_PROJECTS` constant is replaced with a loading mechanism. The component receives project data via props or a top-level loader rather than embedding it.

### Data Flow

```
parse.py → projects/{name}-structure.json
                    ↓
            projects/manifest.json (lists available projects)
                    ↓
index.html (boot) → fetch manifest → fetch each project JSON → mount component with data
```

Current flow: `JSX file contains data → component reads its own constant`
New flow: `boot() fetches manifest → fetches project JSONs → passes data to component`

## Technical Decisions

### Project Discovery: Manifest File
The visualizer needs to know which projects exist in `projects/`. Options considered:

- **Directory listing** — Not reliably available from a static file server (`python -m http.server` doesn't serve directory listings as JSON).
- **Convention-based enumeration** — Would require hardcoding project names somewhere.
- **Manifest file** — A simple `projects/manifest.json` listing project keys and filenames.

**Decision: Manifest file.** It's simple, static-compatible, and the parser can update it automatically when it runs.

Manifest format:
```json
{
  "projects": [
    { "key": "context-forge", "file": "context-forge-structure.json" },
    { "key": "orchestration", "file": "orchestration-structure.json" }
  ]
}
```

### Parser Output Behavior
`parse.py` currently outputs to stdout or a file specified with `-o`. Updated behavior:

- **Default (no `-o`):** Write each project to `projects/{key}-structure.json` relative to the current working directory. Update `projects/manifest.json` to include the project entry (merge, don't replace — other projects may already be listed).
- **With `-o`:** Existing behavior preserved (write to specified path, no manifest update). This keeps the parser usable as a standalone CLI tool.
- **`--projects-dir`:** Optional flag to override the `projects/` path.

### Data Loading in the Visualizer
The current `boot()` function in `index.html` fetches and transforms the JSX. The data loading integrates into this existing flow:

1. `boot()` fetches `projects/manifest.json`
2. For each project in the manifest, fetches the corresponding JSON file
3. Assembles a `PROJECTS` object keyed by project key
4. Injects `PROJECTS` as a global (same pattern currently used for React hooks) before executing the transformed JSX
5. The component reads `PROJECTS` instead of a local `SAMPLE_PROJECTS` constant

This avoids changes to the Babel transform pipeline. The component still accesses a global constant — it's just populated from external files instead of being inline.

### Naming Changes
Simple find-and-replace within `project-structure-viz.jsx`:
- `// SAMPLE DATA` → `// DATA`
- `SAMPLE_PROJECTS` → `PROJECTS` (all references: declaration site at ~line 103, usage at ~lines 8173, 8202, 8208)

## Implementation Details

### Migration Plan

**Source → Destination:**
| Current | New |
|---------|-----|
| `context-forge-structure.json` (project root) | `projects/context-forge-structure.json` |
| `orchestration-structure.json` (project root) | `projects/orchestration-structure.json` |
| Inline `SAMPLE_PROJECTS` in JSX (~line 103 to ~line 8160) | Removed from JSX; data loaded via `fetch()` |

**Consumer updates:**
- `project-structure-viz.jsx` — `SAMPLE_PROJECTS` constant removed; component reads from `PROJECTS` global populated by `boot()`
- `index.html` — `boot()` function updated to fetch manifest and project data before mounting component
- `parse.py` — Default output path changes to `projects/`

**Behavior verification:**
- Visualizer displays identically after migration — same projects, same data, same rendering
- Parser produces identical JSON content (only output location changes)
- Existing `-o` flag behavior unchanged

**Sequence:**
1. Create `projects/` directory and `manifest.json`
2. Move existing JSON files into `projects/`
3. Update `parse.py` default output behavior
4. Update `index.html` boot sequence to load from manifest
5. Remove inline data from JSX and rename `SAMPLE_PROJECTS` → `PROJECTS`
6. Delete old JSON files from project root
7. Verify end-to-end: parse → JSON in `projects/` → visualizer loads and renders correctly

## Integration Points

### Provides to Other Slices
- **Refresh Mechanism slice** depends on this slice's data loading pattern. Specifically:
  - External JSON files in `projects/` that can be re-fetched
  - The manifest that lists available projects
  - The `boot()` data-loading logic that can be re-invoked or extracted into a reusable function

### Consumes from Other Slices
None.

## Success Criteria

### Functional Requirements
- `projects/` directory exists and contains one JSON file per parsed project
- `projects/manifest.json` lists all available projects
- `parse.py` writes to `projects/` by default (without `-o`)
- `parse.py` updates `manifest.json` when writing to `projects/`
- Visualizer loads and displays all project data identically to current behavior
- No inline project data remains in `project-structure-viz.jsx`
- All `SAMPLE_PROJECTS` / `SAMPLE DATA` references replaced with `PROJECTS` / `DATA`
- Old JSON files removed from project root

### Technical Requirements
- No new dependencies introduced (parser remains stdlib-only, visualizer remains CDN-loaded)
- `parse.py -o` flag continues to work for explicit output paths
- Loading errors (missing manifest, missing project file) display a clear error message rather than a blank screen
