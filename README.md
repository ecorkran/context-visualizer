# Context Visualizer

Interactive dashboard for [Context Forge](https://github.com/ecorkran/context-forge) projects. Visualize initiatives, slices, documents, and maintenance work across your project portfolio.

## Features

- **Project portfolio view** — See all tracked projects at a glance with initiative cards, progress bars, and document counts
- **MCP integration** — Live data from Context Forge's MCP server; falls back to local parsing when MCP is unavailable
- **Collector cards** — Aggregated views for maintenance/operations work and future work items across slice plans
- **Project management panel** — Add, remove, and refresh projects from the UI; auto-discover projects in a directory
- **Zero dependencies** — Pure Python server, vanilla JS frontend with in-browser JSX transform

## Quick Start

```bash
# Clone and enter the project
git clone https://github.com/ecorkran/context-visualizer.git
cd context-visualizer

# Start the server (no install required — zero runtime dependencies)
python3 serve.py

# Open http://localhost:5678
```

No virtual environment or `pip install` step is needed — the server has zero runtime dependencies (`uv` is only used for dev tooling like tests). This makes `python3 serve.py` a good default for AI coding agents to launch the dashboard directly, without provisioning a venv first.

Note: on some machines, first startup can take up to ~30s due to a slow reverse-DNS lookup (`socket.getfqdn()`) inside Python's stdlib `HTTPServer`. This is a local networking quirk, not a hang — subsequent requests are fast once it's listening.

### With MCP (recommended)

Create a `mcp-config.json` in the project root to connect to a Context Forge MCP server:

```json
{
  "prefer": "mcp",
  "enableFutureWorkCollector": true,
  "server": {
    "transport": "stdio",
    "command": "node",
    "args": ["path/to/context-forge/packages/mcp-server/dist/index.js"],
    "env": {}
  }
}
```

### Local mode

Without MCP, the visualizer uses `parse.py` to read project structure directly from the filesystem. Add projects via the UI panel or by placing structure JSON files in the `projects/` directory.

## Development

```bash
# Install dev dependencies
uv sync

# Run all tests (excluding E2E)
pytest -m "not e2e"

# Run E2E browser tests (requires playwright)
playwright install chromium
pytest tests/test_ui_smoke.py

# Run all tests
pytest tests/
```

## Architecture

| File | Purpose |
|------|---------|
| `serve.py` | HTTP server with API endpoints and MCP client management |
| `mcp_client.py` | Minimal stdlib-only MCP client (JSON-RPC over stdio) |
| `parse.py` | Local filesystem parser for project structure |
| `index.html` | Frontend entry point with data loading logic |
| `project-structure-viz.jsx` | React components (in-browser Babel transform) |

## License

MIT
