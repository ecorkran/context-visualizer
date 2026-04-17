---
docType: review
layer: project
reviewType: slice
slice: cross-project-dashboard-view
project: squadron
verdict: CONCERNS
sourceDocument: project-documents/user/slices/126-slice.cross-project-dashboard-view.md
aiModel: z-ai/glm-5.1
status: complete
dateCreated: 20260417
dateUpdated: 20260417
findings:
  - id: F001
    severity: concern
    category: scope-creep
    summary: "Scope extends beyond architecture's stated boundaries"
  - id: F002
    severity: concern
    category: cross-cutting-concerns
    summary: "Theme token system introduced as cross-cutting concern without architectural guidance"
  - id: F003
    severity: note
    category: server-patterns
    summary: "Fan-out concurrency model deferred to implementation"
  - id: F004
    severity: note
    category: dependency-direction
    summary: "MCP-only dependency without local-mode fallback"
  - id: F005
    severity: pass
    category: architectural-alignment
    summary: "Core architectural principles are respected"
---

# Review: slice — slice 126

**Verdict:** CONCERNS
**Model:** z-ai/glm-5.1

## Findings

### [CONCERN] Scope extends beyond architecture's stated boundaries

The architecture document (120) defines its scope explicitly: "Manifest schema extension, server-side catalog management endpoints, and a collapsible left panel UI replacing the tab bar as the project selector." The anticipated slices section lists three specific deliverables: Project Management API, Project Panel UI, and Collectors. The cross-project dashboard view is a significant new capability — a portfolio-level awareness feature with its own API endpoint, three new UI components, a theme token system, and a concurrent MCP fan-out pattern — none of which are envisioned or discussed in the architecture. While the slice builds naturally on the panel and MCP infrastructure, a feature of this scope ideally warrants architectural consideration (e.g., how portfolio views fit into the overall component model, how MCP-dependent features degrade, how shared theme infrastructure is governed). This is not a violation of a stated principle, but it is an unarchitected expansion of the initiative's scope.

### [CONCERN] Theme token system introduced as cross-cutting concern without architectural guidance

The slice introduces `src/theme.js` as a "single-source color token module" and a set of `--status-*` CSS custom properties, explicitly offered as a cross-slice interface for future consumption. This is a shared infrastructure decision with implications for all future UI slices, yet the architecture document provides no guidance on theme management, CSS variable conventions, or where shared visual tokens should live. Introducing a theme layer as a side effect of a single feature slice risks inconsistent adoption (some slices use the tokens, others don't) and ownership ambiguity. The architecture should at least acknowledge this as a cross-cutting concern, even if the detailed design is deferred to the slice level.

### [NOTE] Fan-out concurrency model deferred to implementation

The slice states: "thread pool or `asyncio.gather` depending on the existing client's shape — inspect `_mcp_client` during implementation and match its existing style." The architecture emphasizes synchronous, predictable server patterns ("Synchronous parse on add — This keeps the server stateless and the flow predictable"). The dashboard's concurrent fan-out across multiple projects (bounded at 8) is a different operational profile than the architecture's synchronous-per-request model. Leaving the concurrency mechanism as an implementation-time inspection decision is reasonable pragmatically, but it represents a pattern the architecture did not anticipate. If fan-out becomes a recurring pattern (e.g., for other aggregate views), the architecture should address it explicitly.

### [NOTE] MCP-only dependency without local-mode fallback

The dashboard is entirely non-functional without MCP — no tiles, no data, just a 503 placeholder. The architecture's principle "Local project sources only" refers to project data provenance (filesystem vs. GitHub), not to MCP dependency. So this doesn't directly conflict with a stated principle. However, the architecture never discusses MCP dependency tiers or graceful degradation strategies, which means the MCP-only design is architecturally unconstrained. Future slices that also depend on MCP may need a consistent model for partial availability. This is informational for now.

### [PASS] Core architectural principles are respected

The slice correctly observes the architecture's key principles: it reads project list and ordering from `/api/projects` (manifest as single source of truth), it integrates with the panel as the navigation surface (panel as unified project selector), it follows the established server patterns (stdlib-only, JSON responses, structured errors), and it reuses existing server helpers (`_mcp_client`, `_mcp_name_to_id`). The `GET /api/dashboard` endpoint follows the same conventions as `/api/refresh` and the catalog endpoints. No architectural boundaries are violated, and no hidden dependencies are introduced — all MCP tool consumption and cross-slice interfaces are explicitly declared.
