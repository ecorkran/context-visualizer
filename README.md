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
git clone https://github.com/ecorkran/context-visualization.git
cd context-visualization

# Start the server
python serve.py

# Open http://localhost:8000
```

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
