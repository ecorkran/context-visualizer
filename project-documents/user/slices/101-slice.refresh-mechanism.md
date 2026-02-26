---
docType: slice-design
slice: refresh-mechanism
project: context-visualizer
parent: user/architecture/100-slices.file-updates-and-organization.md
dependencies: [100-slice.data-externalization]
interfaces: []
status: complete
dateCreated: 20260224
dateUpdated: 20260225
---

# Slice Design: Refresh Mechanism

## Overview
Add a refresh button to the visualizer UI that triggers a re-parse of loaded projects and updates the display. This requires a lightweight local server to bridge the browser (which cannot invoke Python directly) and the parser.

## Value
- **User value:** Eliminates the manual workflow of switching to a terminal, re-running the parser, and refreshing the browser. Users editing project documents can see updated visualizations with a single click.
- **Architectural enablement:** Introduces the first server-side component, establishing patterns for future capabilities that need a backend (GitHub ingestion, LLM summaries).

## Technical Scope

**Included:**
- Refresh button UI element (circular arrow icon, positioned right of project tabs)
- Lightweight local Python HTTP server that serves static files and handles parse requests
- Parse endpoint that invokes the parser and returns updated data
- Client-side logic to re-fetch project data and update the display without full page reload

**Excluded:**
- Remote hosting or deployment concerns
- Authentication
- Persistent backend or database
- Changes to the parser's core logic or JSON schema
- Build toolchain changes

## Dependencies

### Prerequisites
- **Data Externalization slice** must be complete. The refresh mechanism re-fetches external JSON files from `projects/` — this pattern must be in place.

### Interfaces Required
- `projects/manifest.json` — to know which projects to re-parse
- `projects/{name}-structure.json` — files that get overwritten on re-parse
- Data loading logic from the boot sequence (to re-invoke after parse completes)

## Architecture

### Component Structure

1. **`serve.py`** — New file. A minimal Python HTTP server (stdlib only — `http.server`) that:
   - Serves the static site (HTML, JSX, JSON) — replaces `python -m http.server`
   - Exposes a `/api/refresh` endpoint that triggers the parser
   - Remains zero-dependency (stdlib `http.server` + `subprocess`)

2. **Refresh button** — New UI element in `project-structure-viz.jsx`, positioned immediately to the right of the project tab selectors.

3. **Client-side refresh logic** — JavaScript in the component or boot sequence that calls `/api/refresh`, waits for completion, re-fetches project data, and updates the React state.

### Data Flow

```
User clicks refresh
       ↓
Browser POST /api/refresh
       ↓
serve.py invokes: python parse.py <project-paths>
       ↓
parse.py writes updated JSON to projects/
       ↓
serve.py returns success/failure response
       ↓
Browser re-fetches manifest + project JSONs
       ↓
React state updated → display re-renders
```

### State Management
- The visualizer currently derives its state from the `PROJECTS` object loaded at boot. Refresh replaces this object with freshly-fetched data and triggers a React re-render.
- A loading/refreshing state is needed to provide user feedback during the parse operation (parsing can take a few seconds for large projects).

## Technical Decisions

### Local Server: stdlib `http.server` Extension
Options considered:

- **Flask/FastAPI** — Adds a dependency. Overkill for one endpoint.
- **Node.js server** — Adds a runtime requirement. The project is Python-oriented.
- **Extending `http.server`** — Zero dependencies, consistent with the parser's stdlib-only constraint, replaces the existing `python -m http.server` workflow with a single command.

**Decision: Extend `http.server`.** A single `serve.py` that subclasses `SimpleHTTPRequestHandler` to add the refresh endpoint. Users run `python serve.py` instead of `python -m http.server`.

### Refresh Endpoint Design

```
POST /api/refresh
Content-Type: application/json (optional body)

Request body (optional):
{ "projects": ["context-forge", "orchestration"] }
If omitted, re-parses all projects listed in manifest.json.

Response (success):
{ "status": "ok", "projects": ["context-forge", "orchestration"] }

Response (failure):
{ "status": "error", "message": "parse.py failed: ..." }
```

The server reads `manifest.json` to determine project paths, or accepts an explicit list. It invokes `parse.py` via `subprocess.run()` and returns the result.

### Project Path Resolution
The server needs to know the filesystem paths to project roots (not just the JSON output names) in order to re-parse. Two approaches:

- **Store paths in manifest** — The manifest already lists projects. Adding a `path` field per project lets the server find the source.
- **Configuration file** — A separate config mapping project keys to filesystem paths.

**Decision: Extend the manifest.** When `parse.py` writes to `projects/`, it records the source path in the manifest entry:
```json
{
  "projects": [
    {
      "key": "context-forge",
      "file": "context-forge-structure.json",
      "sourcePath": "/Users/manta/source/repos/manta/context-forge"
    }
  ]
}
```

The `sourcePath` field is used only by the server for re-parsing. The visualizer ignores it. This keeps everything in one file and avoids a separate config.

**Note:** This means the Data Externalization slice's manifest format should include `sourcePath`. This will be communicated as a refinement to that slice's manifest design.

### Refresh Button UI

- **Icon:** Circular arrow (&#x21bb; or SVG). Consistent with universal refresh iconography.
- **Position:** Immediately to the right of the project tab selectors, vertically centered with the tabs.
- **States:**
  - Default: Static icon, clickable
  - Refreshing: Spinning animation on the icon, click disabled
  - Error: Brief error indicator (red flash or tooltip), reverts to default after a few seconds
- **Behavior:** Clicking triggers refresh of all loaded projects. No per-project refresh at this stage.

## Implementation Details

### `serve.py` Structure

The server is a single file with minimal logic:

- Subclass `SimpleHTTPRequestHandler`
- Override `do_POST` to handle `/api/refresh`
- In the refresh handler: read manifest, invoke `parse.py` via `subprocess.run()`, return JSON response
- All other requests fall through to default static file serving
- Entry point: `python serve.py` (optional `--port` flag, default 8000)

### Client-Side Refresh Flow

1. Refresh button click handler calls `POST /api/refresh`
2. While waiting: button enters spinning state, optionally dim the project display
3. On success: re-run the data loading logic (fetch manifest → fetch project JSONs → update `PROJECTS` → trigger React re-render)
4. On failure: display error briefly, restore button to default state
5. The data-loading logic from the Data Externalization slice should be extracted into a reusable function (e.g., `loadProjects()`) that both `boot()` and the refresh handler can call

### Refinement to Data Externalization Slice
This slice requires one addition to the Data Externalization design:
- The manifest must include `sourcePath` per project entry
- The data-loading logic should be a callable function, not just inline in `boot()`

These are minor refinements that should be incorporated during Data Externalization implementation.

## Integration Points

### Provides to Other Slices
- The local server pattern (`serve.py`) establishes a foundation for future server-side features. While not designed as a general-purpose backend, the pattern of "static serving + API endpoints" can be extended.

### Consumes from Other Slices
- **Data Externalization:** External JSON files in `projects/`, the manifest, and the data-loading logic.

## Success Criteria

### Functional Requirements
- Refresh button is visible to the right of the project tabs, using a circular-arrow icon
- Clicking refresh invokes the parser for all loaded projects
- Display updates to reflect current project state after refresh completes
- Spinning/loading feedback during refresh operation
- Error feedback if parse fails (parser not found, project path invalid, etc.)
- System remains functional if refresh fails — current data stays displayed

### Technical Requirements
- `serve.py` is zero-dependency (Python stdlib only)
- `serve.py` replaces `python -m http.server` as the local development server
- Refresh endpoint returns structured JSON responses (success and error cases)
- No full page reload on refresh — React state update only

## Implementation Notes

### Development Approach
Suggested order within this slice:
1. Create `serve.py` with static file serving (verify it replaces `python -m http.server`)
2. Add `/api/refresh` endpoint with subprocess invocation of parser
3. Add refresh button to JSX component (visual only, no wiring)
4. Wire button to endpoint and implement client-side reload logic
5. Add loading/error states
6. End-to-end test: edit a project document → click refresh → verify display updates

### Special Considerations
- The `subprocess.run()` call should use the same Python interpreter that's running the server (`sys.executable`) to avoid path issues.
- The server should handle CORS headers if needed (likely not, since everything is same-origin on localhost).
- Parse operations are synchronous from the server's perspective. For the current local use case this is fine. If parse takes too long for large projects, async handling could be added later — but don't over-engineer this now.
