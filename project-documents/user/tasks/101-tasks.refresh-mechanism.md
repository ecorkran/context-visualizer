---
slice: refresh-mechanism
project: context-visualizer
lld: user/slices/101-slice.refresh-mechanism.md
dependencies: [100-slice.data-externalization]
projectState: Data Externalization slice complete. Project data loads from external JSON in projects/ via manifest. parse.py writes to projects/ by default. Visualizer fetches and renders from external files.
dateCreated: 20260224
dateUpdated: 20260224
---

## Context Summary
- Working on refresh-mechanism slice (initiative 100: File Updates and Organization)
- Current state (post Data Externalization): Visualizer loads project data from `projects/` via manifest. Parser writes to `projects/` by default with manifest updates. No server component exists — site served via `python -m http.server`.
- Dependency: Data Externalization slice must be complete
- This slice delivers: `serve.py` local server with refresh endpoint, refresh button in UI, client-side reload without page refresh
- This is the final slice in initiative 100

---

### Task 1: Create serve.py with static file serving
**Owner**: Junior AI
**Dependencies**: Data Externalization slice complete
**Effort**: 1/5
**Objective**: Create a minimal Python HTTP server that serves the static site, replacing `python -m http.server`.

- [ ] Create `serve.py` at project root
- [ ] Subclass `http.server.SimpleHTTPRequestHandler` for static file serving
- [ ] Add `--port` CLI argument (default: 8000)
- [ ] Entry point: `python serve.py` starts the server and prints the URL
- [ ] Ensure it serves `index.html`, `project-structure-viz.jsx`, and files in `projects/`
- [ ] Zero dependencies — stdlib only (`http.server`, `argparse`)

**Success Criteria**:
- [ ] `python serve.py` starts a server on port 8000
- [ ] `python serve.py --port 3000` starts on port 3000
- [ ] Navigating to `http://localhost:8000` loads the visualizer identically to `python -m http.server`
- [ ] All project data loads correctly from `projects/`
- [ ] Commit checkpoint

---

### Task 2: Add /api/refresh endpoint
**Owner**: Junior AI
**Dependencies**: Task 1
**Effort**: 2/5
**Objective**: Add a POST endpoint to `serve.py` that invokes the parser and returns a JSON response.

- [ ] **Override `do_POST`** in the handler to route `/api/refresh`
- [ ] **Read manifest**: Load `projects/manifest.json` to get project entries and their `sourcePath` values
- [ ] **Invoke parser**: For each project in the manifest (or those specified in the request body), run `parse.py` via `subprocess.run()` using `sys.executable` as the Python interpreter
- [ ] **Return JSON response**:
  - Success: `{"status": "ok", "projects": ["context-forge", "orchestration"]}`
  - Failure: `{"status": "error", "message": "..."}`
- [ ] **Set response headers**: `Content-Type: application/json`, status 200 (success) or 500 (failure)
- [ ] **Handle optional request body**: If POST body contains `{"projects": ["context-forge"]}`, only re-parse those. If no body or empty, re-parse all.
- [ ] **Handle edge cases**: Missing manifest file, missing `sourcePath`, parser not found, parser returns non-zero exit code

**Success Criteria**:
- [ ] `curl -X POST http://localhost:8000/api/refresh` triggers a re-parse of all projects
- [ ] Response is valid JSON with `status` field
- [ ] Project JSON files in `projects/` are updated after successful refresh
- [ ] Error response returned if parser fails (not a server crash)
- [ ] Non-POST requests to `/api/refresh` are rejected (405 or fall through to static)
- [ ] Commit checkpoint

---

### Task 3: Test serve.py and refresh endpoint
**Owner**: Junior AI
**Dependencies**: Task 2
**Effort**: 1/5
**Objective**: Verify the server and refresh endpoint work correctly.

- [ ] Start `serve.py`, verify static serving works
- [ ] Test refresh with `curl -X POST http://localhost:8000/api/refresh` — verify success response and updated JSON files
- [ ] Test refresh with specific project: `curl -X POST -d '{"projects":["context-forge"]}' http://localhost:8000/api/refresh`
- [ ] Test error case: temporarily rename `parse.py`, attempt refresh, verify error response (not crash)
- [ ] Test error case: remove a `sourcePath` from manifest, attempt refresh for that project, verify error response
- [ ] Verify GET requests to `/api/refresh` don't trigger a parse

**Success Criteria**:
- [ ] All success and error cases return appropriate JSON responses
- [ ] Server does not crash on any error case
- [ ] Static file serving continues to work alongside the API
- [ ] Commit checkpoint

---

### Task 4: Extract reusable loadProjects function in index.html
**Owner**: Junior AI
**Dependencies**: Task 3
**Effort**: 1/5
**Objective**: Refactor the data-loading logic in `boot()` into a reusable function that both boot and the refresh handler can call.

- [ ] Extract the manifest-fetch and project-data-fetch logic from `boot()` into a standalone `async function loadProjects()` that returns the assembled `PROJECTS` object
- [ ] Update `boot()` to call `loadProjects()` instead of inline fetch logic
- [ ] Expose `loadProjects` so the component can call it (e.g., as `window.__loadProjects`)
- [ ] Verify the visualizer still loads correctly after this refactor

**Success Criteria**:
- [ ] `loadProjects()` is a standalone async function
- [ ] `boot()` uses `loadProjects()` and behavior is identical to before
- [ ] `loadProjects` is accessible from within the component context
- [ ] Commit checkpoint

---

### Task 5: Add refresh button to the visualizer UI
**Owner**: Junior AI
**Dependencies**: Task 4
**Effort**: 2/5
**Objective**: Add a refresh button with circular-arrow icon positioned to the right of the project tab selectors.

- [ ] **Add refresh button element** in the component's tab bar area, positioned immediately to the right of the last project tab
- [ ] **Circular arrow icon**: Use an SVG or unicode character (&#x21bb;) styled consistently with the existing UI theme
- [ ] **Button styling**: Match the visual weight and height of the project tabs. Background transparent or subtle, with hover state.
- [ ] **Three visual states**:
  - Default: Static icon, cursor pointer
  - Refreshing: CSS spin animation on the icon, pointer-events disabled
  - Error: Brief red tint or flash, reverts to default after ~3 seconds
- [ ] **Add component state**: `refreshState` — one of `'idle'`, `'refreshing'`, `'error'`

**Success Criteria**:
- [ ] Refresh button is visible to the right of the project tabs
- [ ] Icon is a recognizable circular arrow
- [ ] Button visually matches the existing UI style
- [ ] All three states (idle, refreshing, error) are visually distinct
- [ ] Commit checkpoint

---

### Task 6: Wire refresh button to endpoint and reload data
**Owner**: Junior AI
**Dependencies**: Task 5
**Effort**: 2/5
**Objective**: Connect the refresh button click to the parse endpoint and update the display with fresh data.

- [ ] **Click handler**: On click, set state to `'refreshing'`, then `POST /api/refresh`
- [ ] **On success**: Call `loadProjects()` (from Task 4) to re-fetch all project JSON, update the component's project data state, set refresh state to `'idle'`
- [ ] **On failure**: Set refresh state to `'error'`, log the error message to console, set a timeout to revert to `'idle'` after 3 seconds
- [ ] **Preserve active tab**: After data reload, keep the same project tab selected (don't reset to the first project)
- [ ] **No full page reload**: React state update only — the component re-renders with new data

**Success Criteria**:
- [ ] Clicking refresh triggers a parse and data reload
- [ ] Display updates to reflect any changes in project documents
- [ ] Active project tab is preserved after refresh
- [ ] Refresh errors show error state and don't break the display
- [ ] Current data remains visible if refresh fails
- [ ] Commit checkpoint

---

### Task 7: End-to-end verification
**Owner**: Junior AI
**Dependencies**: Task 6
**Effort**: 1/5
**Objective**: Verify the complete refresh workflow end-to-end.

- [ ] Start the visualizer with `python serve.py`
- [ ] Verify both projects load and display correctly
- [ ] Make a visible change to a project document (e.g., change a status in frontmatter)
- [ ] Click the refresh button
- [ ] Verify the spinner appears during refresh
- [ ] Verify the display updates to reflect the document change
- [ ] Verify the active project tab is preserved
- [ ] Test error case: stop any one project's source from being parseable, click refresh, verify error state appears but existing data remains
- [ ] Verify no console errors during normal operation

**Success Criteria**:
- [ ] Full round-trip works: edit document → click refresh → see updated visualization
- [ ] Error handling works gracefully
- [ ] No console errors in normal flow
- [ ] Final commit for this slice
