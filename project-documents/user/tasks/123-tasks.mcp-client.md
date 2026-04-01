---
docType: tasks
slice: mcp-client
project: context-visualizer
lld: user/slices/108-slice.mcp-client.md
dependencies: [105-project-management-api, 106-project-panel-ui, 107-local-project-discovery, context-forge-slice-164]
projectState: Slices 105-107 complete. serve.py has catalog API endpoints (GET/POST/DELETE /api/projects, POST /api/refresh, GET /api/info, GET /api/discover). ProjectPanel UI with add/remove/refresh controls. 67 tests passing (52 backend + 12 E2E + 3 smoke). Zero runtime dependencies.
dateCreated: 20260301
dateUpdated: 20260301
---

## Context Summary

- Working on slice 108: MCP Client
- Slices 105 (catalog API), 106 (panel UI), 107 (discovery) are complete
- This slice adds a minimal stdlib-only MCP client so context-visualizer can consume project data from context-forge's MCP server
- Dual-mode: MCP mode when connected to context-forge, local mode (parse.py) as automatic fallback
- New files: `mcp_client.py`, `mcp-config.example.json`, `tests/test_mcp_client.py`
- Modified files: `serve.py`, `index.html`, `project-structure-viz.jsx`, `.gitignore`, `tests/test_serve.py`, `tests/conftest.py`
- All write operations (add/remove/discover) remain local — MCP is read-only in v1
- Key external dependency: context-forge slice 164 (provides `project_list` and `project_structure` MCP tools)
- E2E browser tests available via pytest-playwright; `live_server` fixture in `tests/conftest.py`
- Next planned slice: none currently in initiative 105

---

## Tasks

### 1. Configuration and gitignore

- [x] Create `mcp-config.example.json` at project root with the documented config shape:
  - `{ "server": { "command": "node", "args": ["/path/to/context-forge/packages/mcp-server/dist/index.js"], "env": {} } }`
  - Include a comment-style note in the file or adjacent README that this should be copied to `mcp-config.json` and customized
- [x] Add `mcp-config.json` to `.gitignore` (the actual config is user-specific and should not be committed)
- [x] Commit

**Success criteria:**
- [x] `mcp-config.example.json` exists with valid JSON matching the schema from slice design
- [x] `mcp-config.json` is in `.gitignore`
- [x] No other files changed

### 2. Implement `McpClient` — subprocess spawn and JSON-RPC transport

- [x] Create `mcp_client.py` at project root
- [x] Implement `McpClient.__init__` accepting `command: str`, `args: list[str]`, `env: dict | None`
  - Store params; initialize `_process = None`, `_request_id = 0`, `_connected = False`
  - Add a `threading.Lock` for I/O operations
- [x] Implement `_send_request(method, params)` — private method:
  - Increment `_request_id`
  - Build JSON-RPC 2.0 message: `{"jsonrpc": "2.0", "id": N, "method": "...", "params": {...}}`
  - Write `json.dumps(msg) + "\n"` to process stdin, flush
  - Return the request id
- [x] Implement `_read_response(expected_id)` — private method:
  - Read lines from stdout until a valid JSON-RPC response with matching `id` is found
  - Skip notification messages (no `id` field) — log and continue
  - Timeout after configurable seconds (default 10); raise `TimeoutError`
  - Return parsed response dict
- [x] Implement `connect()`:
  - Spawn subprocess with `Popen([command] + args, stdin=PIPE, stdout=PIPE, stderr=PIPE, env=merged_env)`
  - Send `initialize` request with `protocolVersion: "2024-11-05"`, `capabilities: {}`, `clientInfo: { name: "context-visualizer", version: "0.1.0" }`
  - Read response, store `serverInfo` from result
  - Send `notifications/initialized` notification (no response expected)
  - Set `_connected = True`; return `True`
  - On any error: kill process, set `_connected = False`, return `False`
- [x] Implement `disconnect()`:
  - If process is running: terminate, wait with timeout, kill if still running
  - Set `_connected = False`, `_process = None`
- [x] Implement `connected` property — returns `_connected`
- [x] Implement `server_info` property — returns stored server info dict or `None`
- [x] Only use stdlib imports: `subprocess`, `json`, `threading`, `os`, `logging`
- [x] Commit

**Success criteria:**
- [x] `mcp_client.py` exists at project root with `McpClient` class
- [x] Only stdlib imports used
- [x] `connect()` performs the MCP initialize → initialized handshake
- [x] `disconnect()` cleans up subprocess
- [x] Transport methods handle JSON-RPC message framing (newline-delimited JSON on stdio)

### 3. Unit tests for McpClient transport and connection

- [x] Create `tests/test_mcp_client.py`
- [x] Mock `subprocess.Popen` to simulate server responses (write to a pipe that the client reads)
- [x] Test `connect()` — mock server responds to `initialize` with valid response; verify `connected` is `True` and `server_info` is populated
- [x] Test `connect()` failure — mock server process exits immediately; verify `connected` is `False`
- [x] Test `disconnect()` — verify process is terminated and `connected` is `False`
- [x] Test `_read_response` timeout — mock server sends nothing; verify `TimeoutError` is raised
- [x] Test notification skipping — mock server sends a notification (no `id`) before the real response; verify real response is returned
- [x] All existing 67 tests still pass
- [x] Commit

**Success criteria:**
- [x] `tests/test_mcp_client.py` has at least 5 tests covering connect, disconnect, timeout, notification skip
- [x] All tests pass including existing suite

### 4. Implement `McpClient.call_tool` and `list_tools`

- [x] Implement `call_tool(name, arguments)`:
  - Send `tools/call` request with `params: { name, arguments }`
  - Read response; check for `error` field → raise `McpError(code, message)` (custom exception in same file)
  - Extract result content — MCP tools return `{ content: [{ type: "text", text: "..." }] }`; parse the text content as JSON if it's a single text block
  - Return parsed dict
- [x] Implement `list_tools()`:
  - Send `tools/list` request
  - Return list of tool descriptors from response
- [x] Add connection check — both methods raise `RuntimeError` if not connected
- [x] Add reconnection attempt — if process has died (`poll() is not None`), try `connect()` once before failing
- [x] Define `McpError` exception class with `code` and `message` attributes
- [x] Commit

**Success criteria:**
- [x] `call_tool` sends correct JSON-RPC, parses MCP tool result content
- [x] `list_tools` returns tool descriptors
- [x] Both raise `RuntimeError` when not connected
- [x] `McpError` raised on tool error responses
- [x] Auto-reconnect attempted when process has died

### 5. Unit tests for `call_tool`, `list_tools`, and error handling

- [x] Test `call_tool` happy path — mock server returns tool result with `content: [{ type: "text", text: '{"name": "Test"}' }]`; verify parsed dict returned
- [x] Test `call_tool` with MCP error — mock server returns error response; verify `McpError` raised with correct code/message
- [x] Test `call_tool` when disconnected — verify `RuntimeError`
- [x] Test `call_tool` reconnection — mock process as dead (`poll() != None`), mock reconnect succeeding, verify call succeeds
- [x] Test `list_tools` — mock server returns tools list; verify correct parsing
- [x] All tests pass
- [x] Commit

**Success criteria:**
- [x] At least 5 additional tests in `test_mcp_client.py`
- [x] Error paths covered: MCP error, disconnected, reconnect
- [x] All tests pass

### 6. MCP config loading in `serve.py`

- [x] Add config loading function in `serve.py`: read `mcp-config.json` from the server's working directory
  - [x] If file absent → return `None` (local-only mode, no warning)
  - [x] If file present but invalid JSON → log warning, return `None`
  - [x] If valid → return parsed config dict
- [x] At server startup (`main()`), attempt to load config and connect MCP client:
  - [x] If config exists: instantiate `McpClient(command, args, env)`, call `connect()`
  - [x] Store the client instance on the server object (or as a module-level variable accessible to `Handler`)
  - [x] If `connect()` fails: log warning, continue in local mode (client set to `None`)
  - [x] If no config: client stays `None`
- [x] Add shutdown hook: on `KeyboardInterrupt`, call `mcp_client.disconnect()` if connected
- [x] Commit

**Success criteria:**
- [x] Missing config → server starts normally in local mode with no warnings
- [x] Valid config → MCP client connection attempted at startup
- [x] Failed connection → warning logged, server continues in local mode
- [x] Client accessible to request handler

### 7. Integration tests for MCP config loading

- [x] Add test fixture in `tests/conftest.py` or `test_serve.py`: mock MCP client that returns canned data
- [x] Test: server starts with no `mcp-config.json` → local mode, no errors
- [x] Test: server starts with valid config but connection fails → local mode, warning logged
- [x] All tests pass
- [x] Commit

**Success criteria:**
- [x] Config loading tested in both present/absent scenarios
- [x] All tests pass including existing suite

### 8. Implement `GET /api/structures` endpoint

- [x] Add route in `do_GET`: `self.path == "/api/structures"` → `_handle_structures()`
- [x] Implement `_handle_structures()`:
  - [x] **MCP path** (client connected):
    1. [x] Call `project_list` tool → get projects array
    2. [x] For each project, call `project_structure(projectId=project.id)` → get model
    3. [x] Wrap in key envelope: `key = project["name"].lower().replace(" ", "-")`
    4. [x] Add `sourcePath` from project's `projectPath`
    5. [x] Return `{ "status": "ok", "mode": "mcp", "projects": { key: model, ... } }`
    6. [x] On any MCP error: return `503` with error details
  - [x] **Local path** (client not connected):
    1. [x] Return `503` with `{ "status": "error", "mode": "local", "message": "MCP not connected" }`
    2. [x] Note: per slice design, the 503 tells the frontend to use the existing manifest+JSON fallback
- [x] Commit

**Success criteria:**
- [x] `GET /api/structures` returns 200 with project data when MCP is connected
- [x] Response shape matches `{ status, mode, projects: { key: { name, description, ... } } }`
- [x] Returns 503 when MCP is not connected
- [x] Key-envelope wrapping produces correct keys (lowercase, hyphenated)
- [x] `sourcePath` populated from context-forge's `projectPath`

### 9. Implement `GET /api/status` endpoint

- [x] Add route in `do_GET`: `self.path == "/api/status"` → `_handle_status()`
- [x] Implement `_handle_status()`:
  - [x] Return `{ "status": "ok", "mode": "mcp"|"local", "mcpConnected": bool, "serverInfo": {...}|null }`
  - [x] `mode` is `"mcp"` if client is connected, `"local"` otherwise
  - [x] `serverInfo` from `McpClient.server_info` when connected
- [x] Commit

**Success criteria:**
- [x] `GET /api/status` returns 200 with correct mode and connection state
- [x] `serverInfo` populated when MCP is connected, `null` when not

### 10. Integration tests for `/api/structures` and `/api/status`

- [x] Test `GET /api/structures` with mock MCP client — returns 200 with correct project data
  - [x] Verify key-envelope wrapping and `sourcePath` mapping
- [x] Test `GET /api/structures` without MCP client — returns 503
- [x] Test `GET /api/structures` when MCP call fails mid-request — returns 503 with error message
- [x] Test `GET /api/status` with MCP connected — returns `mode: "mcp"`, `mcpConnected: true`, `serverInfo` populated
- [x] Test `GET /api/status` without MCP — returns `mode: "local"`, `mcpConnected: false`, `serverInfo: null`
- [x] All tests pass
- [x] Commit

**Success criteria:**
- [x] At least 5 integration tests for the two new endpoints
- [x] Both MCP-connected and local-mode scenarios tested
- [x] Error/fallback path tested
- [x] All tests pass

### 11. Update `loadProjects()` in `index.html`

- [x] Modify `loadProjects()` to try `GET /api/structures` first:
  1. [x] Fetch `/api/structures`
  2. [x] If 200 response: use `response.projects` directly as the `PROJECTS` dict
  3. [x] If non-200 or fetch error: fall back to existing manifest+JSON path (current code)
- [x] Store the current mode (`response.mode`) on `window.__projectsMode` for the UI to read
- [x] Ensure `sourcePath` is present on each project entry (MCP path provides it via the adapter; local path already merges it from manifest)
- [x] Verify: when MCP is not available, app loads exactly as before via fallback
- [x] Commit

**Success criteria:**
- [x] `loadProjects()` tries `/api/structures` first
- [x] On success: uses response data directly, sets `window.__projectsMode`
- [x] On failure: falls back to manifest+JSON — zero behavior change from current code
- [x] No console errors in either path

### 12. Modify `POST /api/refresh` for MCP mode

- [x] In `_handle_refresh()`, check if MCP client is connected:
  - [x] **MCP mode:** Instead of running parse.py subprocesses, call `project_structure` for each project to re-fetch fresh data. Return the same response shape.
  - [x] **Local mode:** Behavior unchanged (runs parse.py as before)
- [x] Handle partial MCP failures gracefully — if some projects succeed and some fail, return partial success with warnings (matching existing pattern)
- [x] Commit

**Success criteria:**
- [x] Refresh in MCP mode re-fetches from MCP without running parse.py
- [x] Refresh in local mode runs parse.py as before
- [x] Partial failures reported in `warnings` array
- [x] Response shape unchanged

### 13. Integration tests for MCP-mode refresh

- [x] Test `POST /api/refresh` with mock MCP client — returns success with re-fetched project keys
- [x] Test `POST /api/refresh` without MCP — runs parse.py as before (existing tests cover this; verify no regression)
- [x] Test `POST /api/refresh` with MCP client where one tool call fails — returns partial success with warnings
- [x] All tests pass
- [x] Commit

**Success criteria:**
- [x] MCP-mode refresh tested with mock
- [x] Local-mode refresh not broken
- [x] All tests pass

### 14. UI mode indicator in panel header

- [x] In `project-structure-viz.jsx`, read `window.__projectsMode` (set by `loadProjects()`)
- [x] Display a small text label in the `ProjectPanel` header area showing the current mode:
  - [x] `"MCP"` (with a subtle accent color) when mode is `"mcp"`
  - [x] `"Local"` or no label when mode is `"local"` (default — don't call attention to the normal case)
- [x] Label should be unobtrusive — small font, muted color, positioned near the "Projects" title
- [x] Commit

**Success criteria:**
- [x] "MCP" label visible in panel header when connected to MCP server
- [x] No label (or subtle "Local") in local mode
- [x] Label styling is minimal and doesn't disrupt panel layout

### 15. E2E smoke test — local mode still works

- [x] Run existing E2E smoke tests (`tests/test_ui_smoke.py`) to verify app loads correctly in local mode after all changes
- [x] Optionally: add an assertion in smoke test that checks the mode indicator is not showing "MCP" (confirming local mode)
- [x] All 67+ existing tests pass
- [x] Commit

**Success criteria:**
- [x] All existing E2E and backend tests pass
- [x] No regressions in local-mode behavior

### 16. End-to-end verification and polish

- [x] Run full test suite: `pytest tests/`
- [x] Manual verification with MCP (if context-forge server is available):
  - [x] Create `mcp-config.json` pointing to context-forge MCP server
  - [x] Start `python serve.py` — verify MCP connection in server logs
  - [x] Open browser — verify projects load from MCP
  - [x] Verify "MCP" indicator in panel header
  - [x] Verify per-project refresh re-fetches from MCP
  - [x] Stop context-forge server — verify app falls back to local mode on next load
- [x] Manual verification without MCP:
  - [x] Remove/rename `mcp-config.json`
  - [x] Start `python serve.py` — verify no errors or warnings
  - [x] Open browser — verify app loads exactly as before
- [x] Fix any issues found
- [x] Commit

**Success criteria:**
- [x] All tests pass
- [x] Both MCP and local modes work end-to-end
- [x] Graceful fallback when MCP server is unavailable
- [x] No console errors in either mode

### 18. Add `prefer` config key for mode override

- [x] Add `"prefer": "mcp"` field to `mcp-config.example.json` with explanation comment
- [x] In `serve.py` `main()`, after loading config, check `config.get("prefer", "mcp")`:
  - If `"local"` → log info, skip MCP connect entirely, server starts in local mode
  - Otherwise → proceed with normal MCP connect attempt (existing behavior)
- [x] Add tests in `TestMcpClientStartup`:
  - `test_prefer_local_skips_connect` — verifies connect() not called when prefer=local
  - `test_prefer_mcp_default_attempts_connect` — verifies connect() called when prefer absent
- [x] All tests pass
- [x] Commit

**Success criteria:**
- [x] `prefer=local` in config prevents MCP connect without removing the config file
- [x] `prefer=mcp` (or absent) behaves identically to previous behavior
- [x] 2 new tests covering both cases

### 17. Final — mark slice complete

- [x] Run full test suite one final time: `pytest tests/`
- [x] Update slice status to `complete` in `108-slice.mcp-client.md`
- [x] Check off slice 108 in `105-slices.project-management.md` (slice plan)
- [x] Write DEVLOG entry for slice 108 completion
- [x] Commit
