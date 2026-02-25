---
slice: data-externalization
project: context-visualizer
lld: user/slices/100-slice.data-externalization.md
dependencies: []
projectState: Working local visualizer with inline project data in JSX. Parser (parse.py) outputs JSON. Two JSON files at project root. No build toolchain — CDN React + Babel transform.
dateCreated: 20260224
dateUpdated: 20260225
---

## Context Summary
- Working on data-externalization slice (initiative 100: File Updates and Organization)
- Current state: `project-structure-viz.jsx` (~8,200 lines) contains all project data inline as `SAMPLE_PROJECTS`. Two JSON files (`context-forge-structure.json`, `orchestration-structure.json`) sit at the project root. Parser writes to stdout or explicit `-o` path.
- No dependencies — this is the first slice in the initiative
- This slice delivers: external JSON files in `projects/`, manifest-based discovery, runtime data loading, naming cleanup
- Next planned slice: 101-slice.refresh-mechanism (depends on this slice)

---

### Task 1: Create projects directory and move existing JSON files
**Owner**: Junior AI
**Dependencies**: None
**Effort**: 1/5
**Objective**: Create the `projects/` subdirectory and relocate existing parsed JSON files into it.

- [x] Create `projects/` directory at the project root
- [x] Move `context-forge-structure.json` → `projects/context-forge-structure.json`
- [x] Move `orchestration-structure.json` → `projects/orchestration-structure.json`
- [x] Delete the original JSON files from the project root
- [x] Verify both JSON files are valid after move (parse with `python -c "import json; json.load(open('projects/context-forge-structure.json'))"` for each)

**Success Criteria**:
- [x] `projects/` directory exists
- [x] Both JSON files are in `projects/` and valid
- [x] No JSON structure files remain at project root
- [x] Commit checkpoint

---

### Task 2: Create manifest.json
**Owner**: Junior AI
**Dependencies**: Task 1
**Effort**: 1/5
**Objective**: Create the project manifest file that the visualizer will use to discover available projects.

- [x] Create `projects/manifest.json` with the following structure:
```json
{
  "projects": [
    {
      "key": "context-forge",
      "file": "context-forge-structure.json",
      "sourcePath": ""
    },
    {
      "key": "orchestration",
      "file": "orchestration-structure.json",
      "sourcePath": ""
    }
  ]
}
```
- [x] `sourcePath` fields will be populated by the parser update (Task 3). Leave as empty strings for now.

**Success Criteria**:
- [x] `projects/manifest.json` exists and is valid JSON
- [x] Contains entries for both existing projects
- [x] Commit checkpoint

---

### Task 3: Update parse.py default output behavior
**Owner**: Junior AI
**Dependencies**: Task 2
**Effort**: 2/5
**Objective**: Update the parser to write JSON to `projects/` by default and update the manifest.

- [x] **Add `--projects-dir` flag** to argparse: optional path override, defaults to `projects/` relative to CWD
- [x] **Update default behavior (no `-o` flag)**: For each parsed project, write to `{projects-dir}/{key}-structure.json`
- [x] **Manifest update logic**: After writing project JSON, read existing `manifest.json` from `{projects-dir}/`, merge the new project entry (add if new, update if existing), write back. Include `sourcePath` set to the resolved project root path.
- [x] **Preserve `-o` behavior**: When `-o` is specified, write to that path as before — no manifest update, no `projects/` involvement
- [x] **Create `projects/` directory** if it doesn't exist when writing default output

**Success Criteria**:
- [x] `python parse.py /path/to/project` writes to `projects/{key}-structure.json` and updates `projects/manifest.json`
- [x] `python parse.py /path/to/project -o custom.json` writes to `custom.json` without touching manifest
- [x] `python parse.py proj1 proj2` writes both and manifest contains both entries with correct `sourcePath` values
- [x] `--projects-dir /tmp/test` writes to the specified directory instead of `projects/`
- [x] Manifest merges correctly (doesn't clobber entries for other projects)
- [x] Parser remains zero-dependency (stdlib only)
- [x] Commit checkpoint

---

### Task 4: Test parser output changes
**Owner**: Junior AI
**Dependencies**: Task 3
**Effort**: 1/5
**Objective**: Verify the updated parser produces correct output in all modes.

- [x] Run `python parse.py` against both known project paths with default output — verify JSON files appear in `projects/`
- [x] Verify `manifest.json` contains correct entries with `sourcePath` populated
- [x] Run with `-o` flag — verify file appears at specified path and manifest is not modified
- [x] Run with `--projects-dir` — verify output goes to specified directory
- [x] Compare JSON content of new output vs the previously moved files from Task 1 — should be identical (or differ only in expected ways if project documents have changed)
- [x] Verify parser still works with `--pretty` and `--name` flags

**Success Criteria**:
- [x] All output modes produce valid JSON
- [x] Manifest is correctly updated in default mode
- [x] Manifest is untouched in `-o` mode
- [x] JSON content matches expected parser output
- [x] Commit checkpoint

---

### Task 5: Update index.html boot sequence to load from manifest
**Owner**: Junior AI
**Dependencies**: Task 4
**Effort**: 2/5
**Objective**: Modify the `boot()` function in `index.html` to fetch project data from external files via the manifest instead of relying on inline data.

- [ ] **Add data loading before component mount**: In `boot()`, before fetching and transforming the JSX:
  1. Fetch `projects/manifest.json`
  2. For each project in manifest, fetch `projects/{file}`
  3. Assemble a `PROJECTS` object keyed by project key
- [ ] **Inject `PROJECTS` as a global**: Pass it into the component execution context alongside the React hooks (add to the `new Function()` call and `fn()` invocation)
- [ ] **Add error handling**: If manifest fetch fails, display an error message in `#root` (similar to existing error handling pattern). If an individual project file fails, log warning and continue with remaining projects.

**Success Criteria**:
- [ ] `boot()` fetches manifest and all project JSON files before mounting the component
- [ ] `PROJECTS` global is available to the component code
- [ ] Missing manifest shows a clear error message
- [ ] Missing individual project file logs a warning but doesn't crash
- [ ] Commit checkpoint

---

### Task 6: Remove inline data and rename SAMPLE_PROJECTS in JSX
**Owner**: Junior AI
**Dependencies**: Task 5
**Effort**: 2/5
**Objective**: Remove the inline project data from `project-structure-viz.jsx` and update all references from `SAMPLE_PROJECTS` to `PROJECTS`.

- [ ] **Replace section header**: Change `// SAMPLE DATA` to `// DATA`
- [ ] **Remove inline data**: Delete the entire `SAMPLE_PROJECTS` constant definition (from `const SAMPLE_PROJECTS = {` through the closing `};` — this is a large block starting around line 103)
- [ ] **Add external reference**: Replace the removed constant with a comment and declaration that references the global: `const PROJECTS = window.__PROJECTS;` (or whatever injection mechanism was used in Task 5)
- [ ] **Rename all references**: Replace all `SAMPLE_PROJECTS` usages with `PROJECTS` (approximately lines 8173, 8202, 8208 — verify actual locations as they will shift after data removal)
- [ ] **Verify no stale references**: Search the entire file for any remaining `SAMPLE` references

**Success Criteria**:
- [ ] No `SAMPLE_PROJECTS` or `SAMPLE DATA` text exists in the JSX file
- [ ] `PROJECTS` variable is properly declared and references external data
- [ ] File is significantly smaller (rendering logic only, no inline JSON)
- [ ] Commit checkpoint

---

### Task 7: End-to-end verification
**Owner**: Junior AI
**Dependencies**: Task 6
**Effort**: 1/5
**Objective**: Verify the complete pipeline works: parse → JSON in projects/ → visualizer loads and renders.

- [ ] Run the parser against both project paths with default output
- [ ] Open `index.html` via `python -m http.server` (or equivalent local server)
- [ ] Verify both projects appear in the project tab selector
- [ ] Verify project data renders correctly (initiatives, slices, tasks, status indicators, progress bars)
- [ ] Switch between projects and verify each renders correctly
- [ ] Verify no console errors related to data loading
- [ ] Compare visual output against current behavior — should be identical

**Success Criteria**:
- [ ] Both projects load and display correctly from external JSON
- [ ] Tab switching works
- [ ] No console errors
- [ ] Visual output matches pre-migration behavior
- [ ] Final commit for this slice
