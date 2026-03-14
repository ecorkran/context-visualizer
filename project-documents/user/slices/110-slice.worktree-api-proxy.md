---
docType: slice-design
slice: worktree-api-proxy
project: context-visualizer
parent: user/architecture/110-slices.worktree-view.md
dependencies: []
interfaces: [111-slice.worktree-column-layout]
dateCreated: 20260311
dateUpdated: 20260313
status: complete
---

# Slice Design: Worktree API Proxy

## Overview
Add a `GET /api/worktrees?project={name}` endpoint to `serve.py` that proxies the Context Forge `worktree_list` MCP tool. This is the foundation slice for initiative 110 — all UI slices depend on this endpoint to get worktree data.

## Value
Backend plumbing that makes worktree data available to the frontend. Testable via `curl` independently of any UI work. Follows the exact same proxy pattern already established by `/api/future-work` and `/api/structures`.

## Technical Scope

**Included:**
- New `_handle_worktrees()` method on the `Handler` class
- Route registration in `do_GET()`
- Name → ID resolution using existing `_mcp_name_to_id` cache (with lazy population fallback)
- Unit tests in `tests/test_serve.py`

**Excluded:**
- Frontend consumption (slice 111)
- Any UI components
- Worktree write operations (init, update, rm) — read-only

## Dependencies

### Prerequisites
- MCP client infrastructure (slice 108) — already complete
- `_mcp_name_to_id` cache and `_refresh_name_to_id()` helper — already in `serve.py`

### Interfaces Required
- Context Forge `worktree_list` MCP tool accepting `projectId` parameter
- Context Forge `project_list` MCP tool for name → ID fallback (already used)

## Architecture

### Data Flow

```
Browser → GET /api/worktrees?project=context-forge
       → Handler._handle_worktrees()
       → resolve "context-forge" → project ID via _mcp_name_to_id cache
       → (cache miss? call project_list, refresh cache, retry)
       → client.call_tool("worktree_list", {"projectId": mcp_id})
       → return JSON response
```

### Component Structure

Single new method `_handle_worktrees()` on the existing `Handler` class. No new modules or files needed.

## Technical Decisions

### Pattern: Follow `_handle_future_work()`
The new handler mirrors the future-work endpoint exactly:
1. Guard: MCP client must be connected (503 if not)
2. Parse query string for `project` parameter
3. Resolve name → ID using `_mcp_name_to_id` with lazy fallback
4. Call the MCP tool
5. Return the result

This keeps the codebase consistent and avoids introducing new patterns.

### No feature flag
Unlike future work (which has `enableFutureWorkCollector`), worktree data is always available when MCP is connected. No config flag needed — the guard is simply "MCP connected."

### Response shape
Pass through the MCP response directly, wrapped in the standard envelope:
```json
{
  "status": "ok",
  "data": {
    "worktrees": [...],
    "count": 2,
    "pathStatuses": [...]
  }
}
```

Error responses follow existing patterns:
- 503: MCP not connected
- 400: Missing `project` parameter
- 404: Unknown project name
- 500: MCP tool call failed

## Implementation Details

### API Contract

**`GET /api/worktrees?project={name}`**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `project` | Yes | Project name (kebab-case, e.g. `context-forge`) |

**200 Response:**
```json
{
  "status": "ok",
  "data": {
    "worktrees": [
      {
        "id": "wt_...",
        "name": "Default",
        "indexRange": [100, 499],
        "worktreePath": "/path/to/repo",
        "developmentPhase": "Phase 6: Implementation",
        "activeSlice": "187-slice.validation-edge-cases-polish",
        "activeTaskFile": "187-tasks.validation-edge-cases-polish",
        "instruction": "Phase 6: Implementation",
        "workType": "continue",
        "archDoc": "180-arch.initiative-context-worktree",
        "slicePlan": "180-slices.initiative-context-worktree"
      }
    ],
    "count": 2,
    "pathStatuses": [
      {
        "worktreeId": "wt_...",
        "worktreeName": "Default",
        "worktreePath": "/path/to/repo",
        "status": "valid"
      }
    ]
  }
}
```

**Error Responses:**
- `503`: `{"status": "error", "message": "MCP not connected"}`
- `400`: `{"status": "error", "message": "Missing required parameter: project"}`
- `404`: `{"status": "error", "message": "Unknown project: {name}"}`
- `500`: `{"status": "error", "message": "{error details}"}`

### Handler Implementation Sketch

Location: `serve.py`, new method on `Handler` class.

```python
def _handle_worktrees(self) -> None:
    """GET /api/worktrees?project=<name> — proxy worktree_list MCP tool."""
    client = _mcp_client
    if client is None or not client.connected:
        self._json_response(503, {"status": "error", "message": "MCP not connected"})
        return

    from urllib.parse import parse_qs, urlparse
    qs = parse_qs(urlparse(self.path).query)
    project_name = qs.get("project", [None])[0]

    if not project_name:
        self._json_response(400, {"status": "error", "message": "Missing required parameter: project"})
        return

    # Resolve name → ID (same pattern as _handle_future_work)
    mcp_id = _mcp_name_to_id.get(project_name)
    if not mcp_id:
        try:
            result = client.call_tool("project_list", {})
            _refresh_name_to_id(result.get("projects", []))
            mcp_id = _mcp_name_to_id.get(project_name)
        except Exception as exc:
            logger.warning("project_list failed during name→ID lookup: %s", exc)
    if not mcp_id:
        self._json_response(404, {"status": "error", "message": f"Unknown project: {project_name}"})
        return

    try:
        result = client.call_tool("worktree_list", {"projectId": mcp_id})
        self._json_response(200, {"status": "ok", "data": result})
    except Exception as exc:
        logger.warning("worktree_list failed: %s", exc)
        self._json_response(500, {"status": "error", "message": str(exc)})
```

Route registration in `do_GET()`:
```python
elif self.path.startswith("/api/worktrees"):
    self._handle_worktrees()
```

### Test Plan

Add `TestWorktreeEndpoint` class to `tests/test_serve.py`, following the `TestFutureWorkEndpoint` pattern:

1. **`test_returns_503_when_mcp_not_connected`** — `_mcp_client = None` → 503
2. **`test_returns_400_when_project_missing`** — `/api/worktrees` with no `?project=` → 400
3. **`test_returns_404_when_project_unknown`** — `?project=nonexistent` → 404
4. **`test_returns_data_when_mcp_connected`** — Happy path → 200 with worktree data
5. **`test_returns_500_when_tool_fails`** — `fail_tool="worktree_list"` → 500

Mock client needs a `worktree_list` handler added to `_make_mock_mcp_client()`:
```python
if name == "worktree_list":
    return {
        "worktrees": [
            {
                "id": "wt_1",
                "name": "Default",
                "indexRange": [100, 499],
                "worktreePath": "/test/repo",
                "developmentPhase": "Phase 6: Implementation",
                "activeSlice": "187-slice.test",
            },
            {
                "id": "wt_2",
                "name": "maintenance",
                "indexRange": [900, 999],
                "worktreePath": "/test/repo-maintenance",
            },
        ],
        "count": 2,
        "pathStatuses": [
            {"worktreeId": "wt_1", "worktreeName": "Default", "status": "valid"},
            {"worktreeId": "wt_2", "worktreeName": "maintenance", "status": "valid"},
        ],
    }
```

## Integration Points

### Provides to Other Slices
- `GET /api/worktrees?project={name}` — consumed by slice 111 (WorktreeColumns component) to fetch worktree data per project

### Consumes from Other Slices
- None (foundation slice)

## Success Criteria

### Functional Requirements
- `GET /api/worktrees?project=context-forge` returns worktree list with all fields
- Projects with no worktrees return `{"worktrees": [], "count": 0}`
- Missing project parameter returns 400
- Unknown project name returns 404
- MCP disconnected returns 503
- MCP tool failure returns 500

### Technical Requirements
- All 5 unit tests pass
- Existing tests remain green (no regressions)
- Handler follows the established proxy pattern (consistent with `_handle_future_work`)

### Verification Walkthrough

**Prerequisites:** Server running in MCP mode (`python serve.py`), Context Forge MCP connected.

**Note:** In zsh, quote URLs containing `?` to avoid glob expansion.

1. **Verify endpoint exists:**
   ```bash
   curl -s "http://localhost:5678/api/worktrees?project=context-forge" | python -m json.tool
   ```
   Expected: 200 response with `worktrees` array containing "default" and "maintenance" entries.
   Verified: Returns 2 worktrees with all fields (id, name, indexRange, worktreePath, developmentPhase, activeSlice, activeTaskFile, instruction, workType, archDoc, slicePlan) plus pathStatuses.

2. **Verify empty worktree project:**
   ```bash
   curl -s "http://localhost:5678/api/worktrees?project=context-visualizer" | python -m json.tool
   ```
   Expected: 200 response with `{"status": "ok", "data": {"worktrees": [], "count": 0}}`.
   Verified: Returns exactly as expected.

3. **Verify error cases:**
   ```bash
   # Missing parameter → 400
   curl -s "http://localhost:5678/api/worktrees" | python -m json.tool

   # Unknown project → 404
   curl -s "http://localhost:5678/api/worktrees?project=nonexistent" | python -m json.tool
   ```
   Verified: 400 and 404 respectively.

4. **Run unit tests:**
   ```bash
   pytest tests/test_serve.py -k "TestWorktreeEndpoint" -v
   ```
   Expected: All 5 tests pass.
   Verified: 5 passed.

5. **Run full test suite:**
   ```bash
   pytest tests/test_serve.py -v
   ```
   Expected: No regressions.
   Verified: 65 passed (60 existing + 5 new).

## Implementation Notes

### Development Approach
1. Add `worktree_list` handler to `_make_mock_mcp_client()` in tests
2. Write the 5 test cases (test-first)
3. Add `_handle_worktrees()` to `serve.py`
4. Add route in `do_GET()`
5. Run tests, verify with curl against live server
