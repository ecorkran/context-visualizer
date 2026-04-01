---
slice: worktree-api-proxy
project: context-visualizer
lld: user/slices/140-slice.worktree-api-proxy.md
dependencies: []
projectState: MCP client infrastructure complete (slice 123). serve.py has established proxy patterns (_handle_future_work, _handle_structures). _mcp_name_to_id cache exists. Server runs on port 5678.
dateCreated: 20260312
dateUpdated: 20260313
status: complete
---

## Context Summary
- Working on 140-slice.worktree-api-proxy (foundation slice for initiative 140: Worktree View)
- Adding `GET /api/worktrees?project={name}` endpoint to `serve.py`
- Proxies Context Forge `worktree_list` MCP tool using existing name→ID resolution pattern
- No frontend changes — backend only
- Next slice: 141 (Worktree column layout) consumes this endpoint

## Tasks

### 1. [x] Add `worktree_list` handler to mock MCP client

Update `_make_mock_mcp_client()` in `tests/test_serve.py` to handle `worktree_list` tool calls. This enables test-first development for the endpoint.

- [x] Add `worktree_list` branch to the `_call_tool()` function inside `_make_mock_mcp_client()`
- [x] Return mock data with 2 worktrees (Default: indexRange [100, 499], maintenance: indexRange [900, 999]) plus `pathStatuses` array
- [x] Match the real Context Forge response shape documented in the slice design (id, name, indexRange, worktreePath, developmentPhase, activeSlice, etc.)
- [x] Verify existing tests still pass: `pytest tests/test_serve.py -v`

**Success criteria:**
- [x] `_make_mock_mcp_client()` returns valid worktree data when `call_tool("worktree_list", ...)` is invoked
- [x] All existing tests pass (no regressions)

---

### 2. [x] Write unit tests for worktree endpoint

Add `TestWorktreeEndpoint` class to `tests/test_serve.py`, following the `TestFutureWorkEndpoint` pattern (setup/teardown saving and restoring `_mcp_client` and `_mcp_name_to_id`).

- [x] Add `TestWorktreeEndpoint` class with `setup_method` and `teardown_method` that save/restore `serve._mcp_client` and `serve._mcp_name_to_id`
- [x] `test_returns_503_when_mcp_not_connected` — set `_mcp_client = None`, GET `/api/worktrees?project=my-project` → 503 with error message
- [x] `test_returns_400_when_project_missing` — GET `/api/worktrees` (no query param) → 400
- [x] `test_returns_404_when_project_unknown` — GET `/api/worktrees?project=nonexistent` → 404
- [x] `test_returns_data_when_mcp_connected` — happy path with mock client → 200, verify `data.worktrees` has 2 entries, verify `data.count` is 2
- [x] `test_returns_500_when_tool_fails` — use `fail_tool="worktree_list"` → 500

**Success criteria:**
- [x] All 5 tests exist and currently fail (endpoint not yet implemented)
- [x] Test structure matches `TestFutureWorkEndpoint` pattern

---

### 3. [x] Implement `_handle_worktrees()` handler in `serve.py`

Add the endpoint handler method and route registration, following the `_handle_future_work()` pattern.

- [x] Add `_handle_worktrees()` method to `Handler` class in `serve.py`, placed after `_handle_future_work()` for readability
  - Guard: return 503 if `_mcp_client` is None or not connected
  - Parse `project` query parameter; return 400 if missing
  - Resolve name → ID via `_mcp_name_to_id` with lazy fallback (call `project_list` on cache miss)
  - Return 404 if name cannot be resolved
  - Call `client.call_tool("worktree_list", {"projectId": mcp_id})`
  - Return 200 with `{"status": "ok", "data": result}`
  - Catch exceptions from tool call → return 500
- [x] Add route in `do_GET()`: `elif self.path.startswith("/api/worktrees"):` → `self._handle_worktrees()`
  - Place before the `/api/future-work` check to avoid prefix collision (both start with different prefixes so order doesn't matter, but keep alphabetical for readability)

**Success criteria:**
- [x] All 5 unit tests from task 2 now pass: `pytest tests/test_serve.py -k "TestWorktreeEndpoint" -v`
- [x] Full test suite passes: `pytest tests/test_serve.py -v`
- [x] Handler follows the same pattern as `_handle_future_work()` (no new patterns introduced)

---

### 4. [x] Verify with live server and commit

Restart the dev server and test the endpoint against real MCP data.

- [x] Restart server: kill existing process on port 5678, run `python serve.py`
- [x] Test happy path: `curl -s http://localhost:5678/api/worktrees?project=context-forge | python -m json.tool`
  - Verify response contains `worktrees` array with "Default" and "maintenance" entries
  - Verify `count` is 2
  - Verify `pathStatuses` array is present
- [x] Test project with no worktrees: `curl -s http://localhost:5678/api/worktrees?project=context-visualizer | python -m json.tool`
  - Verify `worktrees` is empty array and `count` is 0
- [x] Test error cases:
  - `curl -s http://localhost:5678/api/worktrees` → 400
  - `curl -s http://localhost:5678/api/worktrees?project=nonexistent` → 404
- [x] Git add and commit from project root: `serve.py` and `tests/test_serve.py`
- [x] Update slice design status to `complete`
- [x] Mark slice as complete in slice plan (`140-slices.worktree-view.md`)

**Success criteria:**
- [x] All curl verification commands return expected responses
- [x] Clean commit on main branch
- [x] Slice design and slice plan updated to reflect completion
