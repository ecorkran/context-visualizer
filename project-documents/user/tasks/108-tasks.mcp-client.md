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

- [ ] Create `mcp-config.example.json` at project root with the documented config shape:
  - `{ "server": { "command": "node", "args": ["/path/to/context-forge/packages/mcp-server/dist/index.js"], "env": {} } }`
  - Include a comment-style note in the file or adjacent README that this should be copied to `mcp-config.json` and customized
- [ ] Add `mcp-config.json` to `.gitignore` (the actual config is user-specific and should not be committed)
- [ ] Commit

**Success criteria:**
- [ ] `mcp-config.example.json` exists with valid JSON matching the schema from slice design
- [ ] `mcp-config.json` is in `.gitignore`
- [ ] No other files changed

### 2. Implement `McpClient` — subprocess spawn and JSON-RPC transport

- [ ] Create `mcp_client.py` at project root
- [ ] Implement `McpClient.__init__` accepting `command: str`, `args: list[str]`, `env: dict | None`
  - Store params; initialize `_process = None`, `_request_id = 0`, `_connected = False`
  - Add a `threading.Lock` for I/O operations
- [ ] Implement `_send_request(method, params)` — private method:
  - Increment `_request_id`
  - Build JSON-RPC 2.0 message: `{"jsonrpc": "2.0", "id": N, "method": "...", "params": {...}}`
  - Write `json.dumps(msg) + "\n"` to process stdin, flush
  - Return the request id
- [ ] Implement `_read_response(expected_id)` — private method:
  - Read lines from stdout until a valid JSON-RPC response with matching `id` is found
  - Skip notification messages (no `id` field) — log and continue
  - Timeout after configurable seconds (default 10); raise `TimeoutError`
  - Return parsed response dict
- [ ] Implement `connect()`:
  - Spawn subprocess with `Popen([command] + args, stdin=PIPE, stdout=PIPE, stderr=PIPE, env=merged_env)`
  - Send `initialize` request with `protocolVersion: "2024-11-05"`, `capabilities: {}`, `clientInfo: { name: "context-visualizer", version: "0.1.0" }`
  - Read response, store `serverInfo` from result
  - Send `notifications/initialized` notification (no response expected)
  - Set `_connected = True`; return `True`
  - On any error: kill process, set `_connected = False`, return `False`
- [ ] Implement `disconnect()`:
  - If process is running: terminate, wait with timeout, kill if still running
  - Set `_connected = False`, `_process = None`
- [ ] Implement `connected` property — returns `_connected`
- [ ] Implement `server_info` property — returns stored server info dict or `None`
- [ ] Only use stdlib imports: `subprocess`, `json`, `threading`, `os`, `logging`
- [ ] Commit

**Success criteria:**
- [ ] `mcp_client.py` exists at project root with `McpClient` class
- [ ] Only stdlib imports used
- [ ] `connect()` performs the MCP initialize → initialized handshake
- [ ] `disconnect()` cleans up subprocess
- [ ] Transport methods handle JSON-RPC message framing (newline-delimited JSON on stdio)

### 3. Unit tests for McpClient transport and connection

- [ ] Create `tests/test_mcp_client.py`
- [ ] Mock `subprocess.Popen` to simulate server responses (write to a pipe that the client reads)
- [ ] Test `connect()` — mock server responds to `initialize` with valid response; verify `connected` is `True` and `server_info` is populated
- [ ] Test `connect()` failure — mock server process exits immediately; verify `connected` is `False`
- [ ] Test `disconnect()` — verify process is terminated and `connected` is `False`
- [ ] Test `_read_response` timeout — mock server sends nothing; verify `TimeoutError` is raised
- [ ] Test notification skipping — mock server sends a notification (no `id`) before the real response; verify real response is returned
- [ ] All existing 67 tests still pass
- [ ] Commit

**Success criteria:**
- [ ] `tests/test_mcp_client.py` has at least 5 tests covering connect, disconnect, timeout, notification skip
- [ ] All tests pass including existing suite

### 4. Implement `McpClient.call_tool` and `list_tools`

- [ ] Implement `call_tool(name, arguments)`:
  - Send `tools/call` request with `params: { name, arguments }`
  - Read response; check for `error` field → raise `McpError(code, message)` (custom exception in same file)
  - Extract result content — MCP tools return `{ content: [{ type: "text", text: "..." }] }`; parse the text content as JSON if it's a single text block
  - Return parsed dict
- [ ] Implement `list_tools()`:
  - Send `tools/list` request
  - Return list of tool descriptors from response
- [ ] Add connection check — both methods raise `RuntimeError` if not connected
- [ ] Add reconnection attempt — if process has died (`poll() is not None`), try `connect()` once before failing
- [ ] Define `McpError` exception class with `code` and `message` attributes
- [ ] Commit

**Success criteria:**
- [ ] `call_tool` sends correct JSON-RPC, parses MCP tool result content
- [ ] `list_tools` returns tool descriptors
- [ ] Both raise `RuntimeError` when not connected
- [ ] `McpError` raised on tool error responses
- [ ] Auto-reconnect attempted when process has died

### 5. Unit tests for `call_tool`, `list_tools`, and error handling

- [ ] Test `call_tool` happy path — mock server returns tool result with `content: [{ type: "text", text: '{"name": "Test"}' }]`; verify parsed dict returned
- [ ] Test `call_tool` with MCP error — mock server returns error response; verify `McpError` raised with correct code/message
- [ ] Test `call_tool` when disconnected — verify `RuntimeError`
- [ ] Test `call_tool` reconnection — mock process as dead (`poll() != None`), mock reconnect succeeding, verify call succeeds
- [ ] Test `list_tools` — mock server returns tools list; verify correct parsing
- [ ] All tests pass
- [ ] Commit

**Success criteria:**
- [ ] At least 5 additional tests in `test_mcp_client.py`
- [ ] Error paths covered: MCP error, disconnected, reconnect
- [ ] All tests pass

### 6. MCP config loading in `serve.py`

- [ ] Add config loading function in `serve.py`: read `mcp-config.json` from the server's working directory
  - If file absent → return `None` (local-only mode, no warning)
  - If file present but invalid JSON → log warning, return `None`
  - If valid → return parsed config dict
- [ ] At server startup (`main()`), attempt to load config and connect MCP client:
  - If config exists: instantiate `McpClient(command, args, env)`, call `connect()`
  - Store the client instance on the server object (or as a module-level variable accessible to `Handler`)
  - If `connect()` fails: log warning, continue in local mode (client set to `None`)
  - If no config: client stays `None`
- [ ] Add shutdown hook: on `KeyboardInterrupt`, call `mcp_client.disconnect()` if connected
- [ ] Commit

**Success criteria:**
- [ ] Missing config → server starts normally in local mode with no warnings
- [ ] Valid config → MCP client connection attempted at startup
- [ ] Failed connection → warning logged, server continues in local mode
- [ ] Client accessible to request handler

### 7. Integration tests for MCP config loading

- [ ] Add test fixture in `tests/conftest.py` or `test_serve.py`: mock MCP client that returns canned data
- [ ] Test: server starts with no `mcp-config.json` → local mode, no errors
- [ ] Test: server starts with valid config but connection fails → local mode, warning logged
- [ ] All tests pass
- [ ] Commit

**Success criteria:**
- [ ] Config loading tested in both present/absent scenarios
- [ ] All tests pass including existing suite

### 8. Implement `GET /api/structures` endpoint

- [ ] Add route in `do_GET`: `self.path == "/api/structures"` → `_handle_structures()`
- [ ] Implement `_handle_structures()`:
  - **MCP path** (client connected):
    1. Call `project_list` tool → get projects array
    2. For each project, call `project_structure(projectId=project.id)` → get model
    3. Wrap in key envelope: `key = project["name"].lower().replace(" ", "-")`
    4. Add `sourcePath` from project's `projectPath`
    5. Return `{ "status": "ok", "mode": "mcp", "projects": { key: model, ... } }`
    6. On any MCP error: return `503` with error details
  - **Local path** (client not connected):
    1. Return `503` with `{ "status": "error", "mode": "local", "message": "MCP not connected" }`
    2. Note: per slice design, the 503 tells the frontend to use the existing manifest+JSON fallback
- [ ] Commit

**Success criteria:**
- [ ] `GET /api/structures` returns 200 with project data when MCP is connected
- [ ] Response shape matches `{ status, mode, projects: { key: { name, description, ... } } }`
- [ ] Returns 503 when MCP is not connected
- [ ] Key-envelope wrapping produces correct keys (lowercase, hyphenated)
- [ ] `sourcePath` populated from context-forge's `projectPath`

### 9. Implement `GET /api/status` endpoint

- [ ] Add route in `do_GET`: `self.path == "/api/status"` → `_handle_status()`
- [ ] Implement `_handle_status()`:
  - Return `{ "status": "ok", "mode": "mcp"|"local", "mcpConnected": bool, "serverInfo": {...}|null }`
  - `mode` is `"mcp"` if client is connected, `"local"` otherwise
  - `serverInfo` from `McpClient.server_info` when connected
- [ ] Commit

**Success criteria:**
- [ ] `GET /api/status` returns 200 with correct mode and connection state
- [ ] `serverInfo` populated when MCP is connected, `null` when not

### 10. Integration tests for `/api/structures` and `/api/status`

- [ ] Test `GET /api/structures` with mock MCP client — returns 200 with correct project data
  - Verify key-envelope wrapping and `sourcePath` mapping
- [ ] Test `GET /api/structures` without MCP client — returns 503
- [ ] Test `GET /api/structures` when MCP call fails mid-request — returns 503 with error message
- [ ] Test `GET /api/status` with MCP connected — returns `mode: "mcp"`, `mcpConnected: true`, `serverInfo` populated
- [ ] Test `GET /api/status` without MCP — returns `mode: "local"`, `mcpConnected: false`, `serverInfo: null`
- [ ] All tests pass
- [ ] Commit

**Success criteria:**
- [ ] At least 5 integration tests for the two new endpoints
- [ ] Both MCP-connected and local-mode scenarios tested
- [ ] Error/fallback path tested
- [ ] All tests pass

### 11. Update `loadProjects()` in `index.html`

- [ ] Modify `loadProjects()` to try `GET /api/structures` first:
  1. Fetch `/api/structures`
  2. If 200 response: use `response.projects` directly as the `PROJECTS` dict
  3. If non-200 or fetch error: fall back to existing manifest+JSON path (current code)
- [ ] Store the current mode (`response.mode`) on `window.__projectsMode` for the UI to read
- [ ] Ensure `sourcePath` is present on each project entry (MCP path provides it via the adapter; local path already merges it from manifest)
- [ ] Verify: when MCP is not available, app loads exactly as before via fallback
- [ ] Commit

**Success criteria:**
- [ ] `loadProjects()` tries `/api/structures` first
- [ ] On success: uses response data directly, sets `window.__projectsMode`
- [ ] On failure: falls back to manifest+JSON — zero behavior change from current code
- [ ] No console errors in either path

### 12. Modify `POST /api/refresh` for MCP mode

- [ ] In `_handle_refresh()`, check if MCP client is connected:
  - **MCP mode:** Instead of running parse.py subprocesses, call `project_structure` for each project to re-fetch fresh data. Return the same response shape.
  - **Local mode:** Behavior unchanged (runs parse.py as before)
- [ ] Handle partial MCP failures gracefully — if some projects succeed and some fail, return partial success with warnings (matching existing pattern)
- [ ] Commit

**Success criteria:**
- [ ] Refresh in MCP mode re-fetches from MCP without running parse.py
- [ ] Refresh in local mode runs parse.py as before
- [ ] Partial failures reported in `warnings` array
- [ ] Response shape unchanged

### 13. Integration tests for MCP-mode refresh

- [ ] Test `POST /api/refresh` with mock MCP client — returns success with re-fetched project keys
- [ ] Test `POST /api/refresh` without MCP — runs parse.py as before (existing tests cover this; verify no regression)
- [ ] Test `POST /api/refresh` with MCP client where one tool call fails — returns partial success with warnings
- [ ] All tests pass
- [ ] Commit

**Success criteria:**
- [ ] MCP-mode refresh tested with mock
- [ ] Local-mode refresh not broken
- [ ] All tests pass

### 14. UI mode indicator in panel header

- [ ] In `project-structure-viz.jsx`, read `window.__projectsMode` (set by `loadProjects()`)
- [ ] Display a small text label in the `ProjectPanel` header area showing the current mode:
  - `"MCP"` (with a subtle accent color) when mode is `"mcp"`
  - `"Local"` or no label when mode is `"local"` (default — don't call attention to the normal case)
- [ ] Label should be unobtrusive — small font, muted color, positioned near the "Projects" title
- [ ] Commit

**Success criteria:**
- [ ] "MCP" label visible in panel header when connected to MCP server
- [ ] No label (or subtle "Local") in local mode
- [ ] Label styling is minimal and doesn't disrupt panel layout

### 15. E2E smoke test — local mode still works

- [ ] Run existing E2E smoke tests (`tests/test_ui_smoke.py`) to verify app loads correctly in local mode after all changes
- [ ] Optionally: add an assertion in smoke test that checks the mode indicator is not showing "MCP" (confirming local mode)
- [ ] All 67+ existing tests pass
- [ ] Commit

**Success criteria:**
- [ ] All existing E2E and backend tests pass
- [ ] No regressions in local-mode behavior

### 16. End-to-end verification and polish

- [ ] Run full test suite: `pytest tests/`
- [ ] Manual verification with MCP (if context-forge server is available):
  - [ ] Create `mcp-config.json` pointing to context-forge MCP server
  - [ ] Start `python serve.py` — verify MCP connection in server logs
  - [ ] Open browser — verify projects load from MCP
  - [ ] Verify "MCP" indicator in panel header
  - [ ] Verify per-project refresh re-fetches from MCP
  - [ ] Stop context-forge server — verify app falls back to local mode on next load
- [ ] Manual verification without MCP:
  - [ ] Remove/rename `mcp-config.json`
  - [ ] Start `python serve.py` — verify no errors or warnings
  - [ ] Open browser — verify app loads exactly as before
- [ ] Fix any issues found
- [ ] Commit

**Success criteria:**
- [ ] All tests pass
- [ ] Both MCP and local modes work end-to-end
- [ ] Graceful fallback when MCP server is unavailable
- [ ] No console errors in either mode

### 17. Final — mark slice complete

- [ ] Run full test suite one final time: `pytest tests/`
- [ ] Update slice status to `complete` in `108-slice.mcp-client.md`
- [ ] Check off slice 108 in `105-slices.project-management.md` (slice plan)
- [ ] Write DEVLOG entry for slice 108 completion
- [ ] Commit
