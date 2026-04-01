---
docType: slice-design
slice: mcp-client
project: context-visualizer
parent: user/architecture/120-slices.project-management.md
dependencies: [120-project-management-api, 121-project-panel-ui, 122-local-project-discovery]
interfaces: []
status: complete
dateCreated: 20260301
dateUpdated: 20260301
---

# Slice Design: MCP Client

## Overview

Add an MCP client to context-visualizer so it can consume project structure data from context-forge's MCP server instead of (or in addition to) running `parse.py` locally. The system operates in two modes — **MCP mode** when connected to a context-forge server, and **local mode** using the existing `parse.py` pipeline — with automatic fallback from MCP to local when the server is unavailable.

## Value

Establishes context-visualizer as a true consumer of Context Forge's canonical project data. Users who run context-forge as an MCP server (typical for AI-assisted development workflows) get live project structure without maintaining a separate parser installation. Users without context-forge continue to use parse.py exactly as before. The dual-mode design means zero regression risk for existing users.

## Technical Scope

### Included

- Minimal MCP client module (`mcp_client.py`) — stdlib-only, JSON-RPC 2.0 over stdio
- MCP configuration via `mcp-config.json` (server command/args)
- New `GET /api/structures` endpoint — returns all project models in one response
- Modified `loadProjects()` in `index.html` — tries `/api/structures` first, falls back to manifest+JSON
- `GET /api/status` endpoint — reports current connection mode
- Mode indicator in UI (minimal — text label in panel header)
- Unit tests for MCP client, integration tests for new endpoints, E2E test for dual-mode behavior

### Excluded

- Write operations via MCP (add/remove/refresh remain local in v1)
- Project catalog synchronization between MCP and local manifest
- MCP server hosting (context-visualizer does not become an MCP server)
- Async HTTP server conversion (serve.py stays synchronous stdlib)
- The context-forge `project_structure` MCP tool itself (that's context-forge slice 164)

## Dependencies

### Prerequisites

- **Context-forge slice 164** (MCP Introspection Tools) — provides the `project_structure` and `project_list` MCP tools
- **Slices 120-122** (complete) — existing catalog API and panel UI that this slice integrates with

### External

- Context-forge MCP server binary/script — must be installable and runnable via stdio
- No new Python package dependencies (see Technical Decisions below)

### Interfaces Required

From context-forge MCP server (slice 164):

- **`project_list`** — returns `{ projects: [{ id, name, projectPath, ... }] }` (already exists)
- **`project_structure`** — returns `ProjectModel` matching parse.py's `build_model()` output:
  ```
  { name, description, foundation[], projectArchitecture[],
    initiatives: Record<string, Initiative>, futureSlices[],
    quality[], investigation[], maintenance[], devlog: boolean }
  ```
  Input: `{ projectId?, name?, description? }`

Key difference from local mode: MCP returns the model directly (no key-envelope wrapping). Local mode produces `{ "project-key": { ...model... } }`. The adapter layer in serve.py handles this.

## Architecture

### Component Structure

```
index.html (loadProjects)
    │
    ├── GET /api/structures ──→ serve.py ──→ mcp_client.py ──→ context-forge MCP server
    │                              │
    │   (fallback on failure)      │
    │                              ▼
    └── manifest.json + JSON files (existing local path)
```

Three new/modified components:

1. **`mcp_client.py`** (new) — Minimal JSON-RPC 2.0 client over stdio subprocess
2. **`serve.py`** (modified) — New endpoints, MCP integration at startup, fallback logic
3. **`index.html`** (modified) — `loadProjects()` tries new endpoint first

### Data Flow

**MCP mode (happy path):**
1. `serve.py` starts, reads `mcp-config.json`, spawns context-forge server subprocess
2. MCP client sends `initialize` handshake, receives capabilities
3. Browser loads → `loadProjects()` calls `GET /api/structures`
4. `serve.py` calls `project_list` MCP tool → gets project list with IDs
5. For each project, calls `project_structure(projectId)` → gets `ProjectModel`
6. Wraps each model in key envelope: `{ projectName: model }`
7. Merges `sourcePath` from context-forge's `projectPath` into each model
8. Returns assembled dict to browser

**Local fallback (MCP unavailable):**
1. `serve.py` starts, MCP connection fails (no config, server not found, handshake fails)
2. `serve.py` logs warning, continues in local mode
3. Browser loads → `loadProjects()` calls `GET /api/structures` → returns 503 (MCP unavailable)
4. `loadProjects()` falls back to existing path: fetch `manifest.json` → fetch per-project JSON files
5. Existing behavior, zero changes

**Per-request fallback:**
If MCP is connected but a specific tool call fails (timeout, server crash), the endpoint returns an error. `loadProjects()` falls back to the local path automatically. The MCP client marks the connection as unhealthy and attempts reconnection on the next request.

## Technical Decisions

### Stdlib-Only MCP Client (no `mcp` SDK dependency)

**Decision:** Implement a minimal JSON-RPC 2.0 client using only stdlib (`subprocess`, `json`, `threading`).

**Rationale:** The `mcp` Python SDK pulls in `anyio`, `httpx`, `pydantic`, `sse-starlette`, and other transitive dependencies. This project has zero runtime dependencies by design. The MCP stdio protocol is straightforward JSON-RPC 2.0 — our client needs only three operations (`initialize`, `tools/list`, `tools/call`). A ~150-line stdlib implementation is simpler, faster to load, and preserves the project's zero-dep philosophy.

**What the minimal client implements:**
- Spawn subprocess with `subprocess.Popen(command, stdin=PIPE, stdout=PIPE, stderr=PIPE)`
- Send JSON-RPC requests: `{"jsonrpc": "2.0", "id": N, "method": "...", "params": {...}}`
- Read JSON-RPC responses line by line from stdout, correlate by `id`
- Handle `initialize` → `initialized` handshake
- Expose `call_tool(name, arguments) → dict` as the primary interface
- Connection health tracking and graceful shutdown

**Rejected alternative:** Full `mcp` SDK — too many dependencies for three RPC calls. If the protocol evolves substantially, we can reconsider.

### Configuration via `mcp-config.json`

**Decision:** Server connection parameters stored in `mcp-config.json` at project root.

```json
{
  "server": {
    "command": "node",
    "args": ["/path/to/context-forge/packages/mcp-server/dist/index.js"],
    "env": {}
  }
}
```

**Rationale:** Follows the `.mcp.json` convention used by Claude Code and other MCP hosts, but uses a distinct filename to avoid conflicts. Env vars (`MCP_SERVER_COMMAND`) considered but rejected — the server often needs multiple args and env vars, which maps poorly to a single env var. A config file is more expressive and version-controllable.

**Behavior when config is absent:** serve.py starts in local-only mode with no warnings (config is optional). When config is present but server fails to connect, log a warning.

### Read-Only MCP Integration (v1)

**Decision:** MCP is used only for reading project structure data. All write operations (add, remove, refresh, discover) remain local.

**Rationale:** Context-forge's `project_list` returns context-forge-managed projects, which may differ from the local manifest. Synchronizing two catalogs (context-forge's project store and our `manifest.json`) adds significant complexity with unclear UX benefit. In practice:
- Users who use context-forge manage projects there; the visualizer reads what's available
- Users who don't use context-forge manage projects via the panel's add/remove controls

A future slice could add write operations via MCP (e.g., `project_update` to register a new project in context-forge), but that requires careful UX design around catalog ownership.

**Implication for add/remove/refresh:**
- `POST /api/projects` (add) — always local, runs parse.py
- `DELETE /api/projects/{key}` (remove) — always local, updates manifest
- `POST /api/refresh` — in MCP mode, re-fetches from MCP instead of running parse.py; in local mode, runs parse.py as before
- `GET /api/discover` — always local (filesystem scan)

### Key-Envelope Wrapping in Adapter

Context-forge's `project_structure` returns the model directly. Our frontend expects `{ "project-key": { ...model... } }`. The adapter in serve.py wraps each model:

```python
key = project_name.lower().replace(" ", "-")
structures[key] = model
structures[key]["sourcePath"] = project_path
```

This mapping uses context-forge's `project.name` (lowercased, hyphenated) as the key, matching the convention in `_handle_add_project`. The `sourcePath` is sourced from context-forge's `project.projectPath`.

### New Endpoint: `GET /api/structures`

**Why a new endpoint instead of modifying `loadProjects()`'s file-fetch approach:**
- Fetching all project data in one HTTP request is more efficient than N+1 fetches (manifest + N JSON files)
- The MCP integration is server-side (subprocess management); the browser can't talk MCP directly
- The existing manifest+JSON path is preserved as the fallback — no disruption

**Response shape:**
```json
{
  "status": "ok",
  "mode": "mcp",
  "projects": {
    "context-forge": { "name": "Context Forge", "description": "...", ... },
    "orchestration": { "name": "Orchestration", "description": "...", ... }
  }
}
```

The `projects` field is the same shape as `window.__PROJECTS` — the frontend can use it directly.

**Error/unavailable response:** `{ "status": "error", "mode": "local", "message": "MCP not connected" }` with HTTP 503. Frontend catches and falls back.

## API Contracts

### `GET /api/structures`

Returns all project structure data, sourced from MCP when available.

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ status: "ok", mode: "mcp"\|"local", projects: {...} }` | All project models |
| 503 | `{ status: "error", mode: "local", message: "..." }` | MCP unavailable |

When MCP is connected: calls `project_list` + `project_structure` for each project.
When MCP is not connected: reads manifest + JSON files (same as current `loadProjects()` but server-side).

Note: The 200 response with `mode: "local"` is also valid — this endpoint can serve local data too, providing a single endpoint for all project data regardless of mode.

### `GET /api/status`

Returns server mode and connection health.

| Status | Body |
|--------|------|
| 200 | `{ status: "ok", mode: "mcp"\|"local", mcpConnected: bool, serverInfo: {...}\|null }` |

### Modified: `POST /api/refresh`

In MCP mode, refresh re-fetches from MCP (no subprocess, no parse.py). In local mode, behavior is unchanged (runs parse.py).

## Integration Points

### Consumes from Context-Forge (via MCP)

- `project_list` tool — enumerate available projects
- `project_structure` tool — get full ProjectModel for a project

### Provides to Frontend

- `GET /api/structures` — unified project data endpoint
- `GET /api/status` — mode/health information
- Fallback-transparent `loadProjects()` — works regardless of MCP availability

### Local Operations (Unchanged)

All existing endpoints continue to work in both modes:
- `GET /api/projects` — reads local manifest
- `POST /api/projects` — adds project locally (parse.py)
- `DELETE /api/projects/{key}` — removes from local manifest
- `GET /api/discover` — local filesystem scan
- `GET /api/info` — local scan root

## Success Criteria

### Functional Requirements

- With valid `mcp-config.json` pointing to context-forge: `GET /api/structures` returns project data sourced from MCP, matching the shape expected by the frontend
- Without config (or with server unavailable): app starts and runs exactly as before — zero behavioral change
- Frontend renders identically regardless of data source (MCP vs local)
- `GET /api/status` correctly reports mode and connection state
- `POST /api/refresh` re-fetches from MCP when connected; runs parse.py when not
- Switching from local to MCP mode (adding config file, restarting server) works seamlessly
- No console errors during normal operation in either mode

### Technical Requirements

- `mcp_client.py` has no imports outside stdlib
- Unit tests for MCP client (mock subprocess) cover: connect, call_tool, reconnect, error handling
- Integration tests for new endpoints in both MCP and local modes
- E2E test: app loads and displays project data (existing smoke tests cover this; add mode-specific assertions if feasible)
- All existing 67 tests continue to pass
- Graceful degradation: MCP server crash mid-session doesn't crash serve.py

## Implementation Notes

### Development Approach

Suggested implementation order:

1. **`mcp_client.py`** — the standalone client module, testable in isolation
2. **Configuration** — `mcp-config.json` loading in serve.py
3. **`GET /api/structures`** endpoint — MCP path + local fallback
4. **`GET /api/status`** endpoint
5. **`loadProjects()` update** in `index.html` — use `/api/structures` with fallback
6. **Refresh integration** — modify `POST /api/refresh` for MCP mode
7. **UI mode indicator** — minimal label in panel header
8. **Tests** — unit, integration, E2E
9. **Verification** — both modes work end-to-end

### MCP Client Module Structure

```python
# mcp_client.py — minimal MCP client over stdio

class McpClient:
    """JSON-RPC 2.0 client for MCP servers over stdio transport."""

    def __init__(self, command: str, args: list[str], env: dict | None = None):
        self._command = command
        self._args = args
        self._env = env
        self._process: subprocess.Popen | None = None
        self._request_id = 0
        self._connected = False

    def connect(self) -> bool:
        """Spawn server subprocess and perform initialize handshake."""
        ...

    def call_tool(self, name: str, arguments: dict) -> dict:
        """Call an MCP tool and return the result content."""
        ...

    def list_tools(self) -> list[dict]:
        """Return available tools from the server."""
        ...

    def disconnect(self) -> None:
        """Terminate the server subprocess."""
        ...

    @property
    def connected(self) -> bool: ...
```

Key implementation details:
- `Popen` with `stdin=PIPE, stdout=PIPE, stderr=PIPE`
- Requests written as `json.dumps(msg) + "\n"` to stdin
- Responses read line-by-line from stdout, parsed as JSON, correlated by `id`
- `stderr` captured to a buffer for diagnostics (not the JSON-RPC channel)
- Thread lock around I/O operations (serve.py is single-threaded, but defensive)
- 10-second timeout on tool calls; configurable

### Testing Strategy

- **mcp_client.py unit tests:** Mock `subprocess.Popen` to simulate server responses. Test connect/disconnect, tool calls, error handling, timeout, reconnect.
- **serve.py integration tests:** Two fixtures — one with a mock MCP client (returns canned data), one without (local mode). Test `/api/structures`, `/api/status`, refresh in both modes.
- **E2E tests:** Existing smoke tests (`test_ui_smoke.py`) already validate the app loads with project data. These pass in local mode. A dedicated MCP E2E test would require a running context-forge server — defer to manual verification or a dedicated integration slice.

### File Summary

| File | Action | Description |
|------|--------|-------------|
| `mcp_client.py` | Create | Minimal stdlib-only MCP client |
| `mcp-config.json` | Create | Example/template config (gitignored) |
| `mcp-config.example.json` | Create | Checked-in example config |
| `serve.py` | Modify | Add MCP integration, new endpoints, fallback logic |
| `index.html` | Modify | `loadProjects()` tries `/api/structures` first |
| `project-structure-viz.jsx` | Modify | Mode indicator in panel header (minor) |
| `.gitignore` | Modify | Add `mcp-config.json` |
| `tests/test_mcp_client.py` | Create | Unit tests for MCP client |
| `tests/test_serve.py` | Modify | Integration tests for new endpoints |
| `tests/conftest.py` | Modify | Add MCP mock fixtures |

### Risk Assessment

**Medium risk: MCP protocol compatibility.** Our minimal client implements a subset of JSON-RPC 2.0 / MCP. If context-forge's server sends unexpected message formats (notifications, multi-part responses), our client could fail. Mitigation: test against the real context-forge server during development; implement robust message parsing with graceful handling of unknown message types.

**Low risk: Subprocess management.** The MCP server subprocess could hang, crash, or produce unexpected output. Mitigation: timeouts on all I/O, health checks, automatic reconnection attempts.
