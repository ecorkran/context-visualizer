---
docType: slice-design
slice: local-project-discovery
project: context-visualizer
parent: user/architecture/105-slices.project-management.md
dependencies: [105-project-management-api]
interfaces: []
status: complete
dateCreated: 20260228
dateUpdated: 20260228
---

# Slice Design: Local Project Discovery

## Overview

Add a "Find projects" flow to the Project Panel that scans a user-specified root directory for valid project paths and lets the user add any discovered candidate with a single click. The user edits a pre-populated root path (derived from the manifest) and clicks "Find"; the server scans one level deep and returns candidates; each result row has an inline Add button.

The existing Add input from slice 106 (type a path → Enter/Add) is unchanged. This slice adds discovery on top of it, making the panel self-sufficient for users who want to browse rather than type.

## Value

Eliminates the "what is the exact path?" friction when onboarding new projects. A user who has `~/source/repos/manta/context-visualizer` tracked can point the scanner at `~/source/repos/manta` and immediately see all sibling projects to add. The smart default removes most typing for the common case.

## Technical Scope

**Included:**
- `GET /api/discover?root=<path>` — scans immediate children (depth 1) of `root` for directories containing the `project-documents/user/` pattern; returns candidates with display names
- `GET /api/info` — returns server-side context useful to the UI: `{ "scanRoot": "<suggested default>" }`. The suggested default is derived from the common ancestor of manifest `sourcePath` values; falls back to the user's home directory
- Discovery UI in the Project Panel: a collapsible "Find projects" section below the Add input — root path input pre-populated from `GET /api/info`, "Find" button, inline results list with per-row Add buttons
- Already-tracked projects shown as disabled (grayed out, no Add button) in results

**Excluded:**
- Depth > 1 scanning — user provides a meaningful parent directory
- Inline path validation on the Add input — the POST already returns an error on invalid paths; advisory validation adds complexity without much benefit given the Add input already has error feedback
- Native OS file picker — browser sandbox prevents getting a real filesystem path from `showDirectoryPicker()`
- Auto-add without confirmation
- Background filesystem watching

## Dependencies

### Prerequisites
- Slice 105 — provides `find_user_dir()` in `parse.py` (reused for validation) and `POST /api/projects`
- Slice 106 — provides `ProjectPanel` where the discovery UI lives

### Interfaces Consumed
- `parse.find_user_dir(path)` — already imported in `serve.py`; reused to check each candidate
- `POST /api/projects { path }` — existing endpoint, unchanged; used for per-row Add
- `GET /api/projects` response — `sourcePath` fields used server-side to compute suggested scan root

## Architecture

### Server Changes (`serve.py`)

Two new GET endpoints added to `do_GET`:

```
GET /api/info
→ { "status": "ok", "scanRoot": "/Users/manta/source/repos/manta" }

GET /api/discover?root=/some/path
→ { "status": "ok", "candidates": [{ "path": "...", "displayName": "..." }] }
→ { "status": "error", "message": "..." }
```

**`_handle_info` implementation:**
1. Read manifest via `_read_manifest()`
2. Collect all `sourcePath` values from manifest entries
3. Find the longest common path prefix across all source paths using `os.path.commonpath()`. If only one project, use its parent directory. If no projects, fall back to `Path.home()`
4. Return `{ "status": "ok", "scanRoot": str(common_parent) }`

**`_handle_discover` implementation:**
1. Parse `root` query parameter (`urllib.parse.urlparse` + `parse_qs` — stdlib, no new imports)
2. Validate: `root` param present, path exists, path is a directory → 400 errors if not
3. Iterate `Path(root).iterdir()` — only immediate children, no recursion
4. For each child that is a directory: call `find_user_dir(child)` — if non-None, it's a valid candidate
5. For each valid candidate, extract `displayName`: call `build_model(user_dir).get("name", child.name)`
6. Return candidates sorted by `displayName`, capped at 30
7. Exclude the `root` directory itself (don't include the scan root as a result)

**Performance note:** `build_model()` does full file I/O per candidate. At depth 1 with a typical source directory, this is 5–20 directories — fast in practice (< 1 s). The cap-30 bound prevents pathological cases. If this proves slow during implementation, fall back to frontmatter-only extraction: scan `project-documents/user/` for the first `.md` with a `project:` key.

### UI Changes (`project-structure-viz.jsx`)

One new section added to the expanded `ProjectPanel`, below the existing Add input area.

**Layout (panel bottom, expanded state only):**

```
┌─────────────────────────────────────┐
│ [Project path...        ] [Add]     │  ← existing (slice 106, unchanged)
│ ─────────────────────────────────── │
│ Find projects                    ▼  │  ← toggle button (collapsed by default)
│ [/Users/manta/source    ] [Find]    │  ← root input + Find button
│                                     │
│ ● Context Forge            [Add]    │  ← candidate rows
│   /Users/manta/source/context-forge │
│ ● Already Tracked                   │  ← grayed, no Add button
│                                     │
│ No projects found in this directory │  ← empty state
└─────────────────────────────────────┘
```

**Behavior:**
- "Find projects" toggle is collapsed by default; clicking it expands the section
- On expand: fire `GET /api/info` to fetch the suggested `scanRoot` and populate the root input (only if input is currently empty)
- Root input is editable — user can change it before scanning
- "Find" button: fires `GET /api/discover?root=<value>`. Disabled while scanning or if input is empty
- Results: each row shows display name (full) and path (small, gray, truncated). Already-tracked projects (matched by comparing candidate path to manifest `sourcePath` values available in the `projects` prop) show with a muted style and no Add button
- Per-row Add button: calls `POST /api/projects { path }` → on success: `onProjectsChanged()` + `onActivate(key)`. Row Add button shows spinner during add; after success the row transitions to "Already Tracked" state
- Scan error: shown inline below the Find button, auto-cleared after 3 s (consistent with existing error pattern)
- "Find projects" section stays visible after adding — user can continue adding more from the same scan

**State (all local to `ProjectPanel`):**

| State | Type | Purpose |
|---|---|---|
| `showDiscover` | boolean | Toggle discover section open/closed |
| `scanRoot` | string | Editable root path input |
| `scanState` | `idle\|scanning\|done\|error` | Find button state |
| `scanResults` | array | `[{ path, displayName }]` from server |
| `scanError` | string | Error message, auto-clears 3 s |
| `rowAddState` | object | `{ [path]: 'idle'\|'adding' }` per result row |

No new props on the root component.

**Already-tracked detection:** compare each candidate `path` to the `sourcePath` values in the `projects` prop (which is the loaded PROJECTS object containing `sourcePath` per entry). This is a client-side check — no extra server call needed.

## API Contracts

### `GET /api/info`

```json
{ "status": "ok", "scanRoot": "/Users/manta/source/repos/manta" }
```

Falls back gracefully: if manifest is missing or empty, `scanRoot` is the server process's home directory (`str(Path.home())`). No error responses — always returns 200 with a usable default.

### `GET /api/discover?root=<encoded-path>`

**Response 200:**
```json
{
  "status": "ok",
  "candidates": [
    { "path": "/Users/manta/source/repos/context-forge", "displayName": "Context Forge" },
    { "path": "/Users/manta/source/repos/orchestration", "displayName": "Orchestration" }
  ]
}
```

Empty candidates list is valid (no projects found):
```json
{ "status": "ok", "candidates": [] }
```

**Response 400:**
```json
{ "status": "error", "message": "Missing required parameter: root" }
{ "status": "error", "message": "Path does not exist: /bad/path" }
{ "status": "error", "message": "Not a directory: /some/file.txt" }
```

## Technical Decisions

### Depth 1 only

Depth 1 (immediate children of the root) is the right default. Users who organize projects under `~/source/repos/manta/` scan that directory and see all sibling projects. Going deeper risks scanning irrelevant directories (vendored deps, nested repos) and slows the response. The smart default means users rarely need to adjust the path, so depth 1 is not a hardship.

### Smart default via `GET /api/info`

Deriving the default scan root from `os.path.commonpath(source_paths)` is the most useful heuristic: if a user has `~/source/repos/manta/context-forge` and `~/source/repos/manta/orchestration` tracked, the common parent is `~/source/repos/manta` — exactly where their other projects likely live. This is a best-effort hint; the user can always edit it.

### No inline path validation on Add input

The existing Add input already shows an error message on failed submission (slice 106). Adding debounced validation would duplicate the feedback and add state complexity for a case (typing a wrong path) that the existing error handling already covers adequately.

### `GET /api/info` is always 200

`/api/info` returns metadata, not a command result. If the manifest is absent or unreadable, the home directory is still a useful default. Returning an error would require the UI to handle a failure case for something that should silently degrade.

### Already-tracked detection on client

The `projects` prop already contains `sourcePath` per entry (loaded from manifest). Checking candidate paths against these values is O(n×m) where n = candidates (≤ 30) and m = tracked projects (typically < 20) — negligible. No extra server round-trip needed.

## UI Specification

### Collapsed state (default)

```
┌─────────────────────────────────────┐
│ [Project path...        ] [Add]     │
│ Find projects                    ›  │
└─────────────────────────────────────┘
```

"Find projects" is a full-width secondary button/label with a › chevron. Click expands.

### Expanded — idle (just opened)

```
┌─────────────────────────────────────┐
│ [Project path...        ] [Add]     │
│ Find projects                    ‹  │
│ [/Users/manta/source    ] [Find]    │
└─────────────────────────────────────┘
```

Root input pre-populated from `GET /api/info`. Find button enabled.

### Expanded — results

```
┌─────────────────────────────────────┐
│ [Project path...        ] [Add]     │
│ Find projects                    ‹  │
│ [/Users/manta/source    ] [Find]    │
│                                     │
│ ● Context Forge            [Add]    │
│   /Users/manta/.../context-forge    │
│ ● My Other Project         [Add]    │
│   /Users/manta/.../my-other         │
│ ○ Orchestration  already added      │
└─────────────────────────────────────┘
```

- `●` = valid untracked project (add button active)
- `○` = already tracked (grayed, no button, "already added" label)
- Path shown in small gray text below the display name
- Per-row Add shows spinner while adding, then transitions to "already added"

### Expanded — empty results

```
┌─────────────────────────────────────┐
│ [Project path...        ] [Add]     │
│ Find projects                    ‹  │
│ [/Users/manta/desktop   ] [Find]    │
│ No projects found here              │
└─────────────────────────────────────┘
```

### Expanded — error

```
┌─────────────────────────────────────┐
│ [Project path...        ] [Add]     │
│ Find projects                    ‹  │
│ [/bad/path              ] [Find]    │
│ Path does not exist                 │
└─────────────────────────────────────┘
```

Error in small red text below input row; auto-clears after 3 s (consistent with existing pattern).

## Success Criteria

### Functional
- `GET /api/info` returns a `scanRoot` derived from tracked project paths (or home directory fallback)
- `GET /api/discover?root=<path>` returns valid candidates found among immediate children of `root`
- "Find projects" section is collapsed by default; clicking it expands and fetches the suggested root
- Editing the root input and clicking "Find" shows new results
- Each candidate row shows `displayName` and truncated path
- Already-tracked projects appear grayed with "already added", no Add button
- Clicking a row's Add button adds the project and the row transitions to "already added" state
- Empty results show a "No projects found here" message
- Errors show inline, auto-clear after 3 s
- No regressions to the existing Add input or any other panel behavior

### Technical
- All changes in `serve.py` and `project-structure-viz.jsx` — no new files
- New endpoints follow existing `_json_response` / `_read_manifest` patterns
- No new Python dependencies (`urllib.parse` and `os.path` are stdlib)
- All new UI state local to `ProjectPanel`; no new props on root
- No console errors in normal operation
- `pytest tests/` continues to pass

## Implementation Notes

### Suggested Order
1. Add `_handle_info` to `serve.py`; wire into `do_GET`; write tests
2. Add `_handle_discover` to `serve.py`; wire into `do_GET`; write tests
3. Add "Find projects" toggle + root input + Find button to `ProjectPanel` (collapsed by default; fetch `/api/info` on expand)
4. Render candidate rows with already-tracked detection and per-row Add
5. Manual E2E verification via Playwright MCP

### Testing
- `test_serve.py`: `GET /api/info` with 0, 1, 2+ projects; `GET /api/discover` with valid root (no matches, some matches), missing `root`, non-existent path, non-directory path
- E2E (Playwright): expand "Find projects", verify root pre-populated; click Find, verify results appear; click Add on a row, verify it appears in panel list and transitions to "already added"
