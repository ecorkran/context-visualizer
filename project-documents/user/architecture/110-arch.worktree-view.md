---
docType: architecture
layer: project
project: context-visualizer
archIndex: 110
component: worktree-view
dateCreated: 20260308
dateUpdated: 20260308
status: concept
relatedSlices: []
riskLevel: medium
---

## Overview

Extend the visualizer to represent projects that use git worktrees for parallel development. Context Forge is adding worktree support, enabling multiple agents to work on separate branches within the same repository simultaneously. The visualizer needs to surface this parallel activity without misrepresenting worktrees as separate projects.

**Scope:** Visualization and status display of worktree-based parallel development within a single project. This does not cover worktree lifecycle management (creation, cleanup) — that is Context Forge's responsibility.

**Motivation:** As AI-assisted development matures, the git worktree pattern is becoming standard for enabling parallel work streams. A project with three agents working three slices simultaneously looks very different from a project with one active slice. The visualizer currently has no way to represent this, making it blind to a significant aspect of project health and activity.

## Design Goals

- **Accurate project identity** — A project with multiple worktrees is still one project. The UI must not fragment it into separate entries or create ambiguity about project boundaries.
- **Parallel activity visibility** — Users should see at a glance which slices are being actively worked in parallel, and on which branches/worktrees.
- **Minimal cognitive load** — Worktree detail should be available on demand, not forced into the default view. The summary-level project card should remain clean.
- **Data-driven by Context Forge** — The visualizer consumes whatever worktree data Context Forge exposes via MCP. We do not inspect git state directly.

## Architectural Principles

- **Single source of truth** — Context Forge owns worktree state. The visualizer is a read-only consumer. No local git commands, no branch inspection, no filesystem scanning of worktree paths.
- **Progressive disclosure** — Default view shows aggregate activity (e.g. "3 active worktrees"). Expanding reveals per-worktree detail (branch, slice, agent, status).
- **Graceful absence** — Projects without worktrees look exactly as they do today. The worktree view is additive — no visual changes to projects that don't use the feature.
- **Consistent card pattern** — Any new UI for worktree info should follow the established collapsible card pattern used by InitiativeCard, FeaturesCard, MaintenanceCollectorCard, etc.

## Current State

The visualizer displays one "current slice" per project, derived from Context Forge's `fileSlice` field on the project record. There is no concept of multiple simultaneous work streams. The project card shows initiatives, documents, and progress — all assuming a single linear workflow.

Context Forge does not yet expose worktree data via MCP. The worktree feature is under active development in Context Forge.

## Envisioned State

When Context Forge exposes worktree data, the visualizer will show:

- **Project-level summary** — A compact indicator on the project card showing the number of active worktrees (e.g. "3 active branches"). This replaces or augments the current single "current slice" display.
- **Worktree detail view** — An expandable section within the project view listing each active worktree with its branch name, associated slice, and status. This fits naturally alongside the existing initiative cards.
- **Slice-level awareness** — Initiative cards and slice references could indicate which slices are currently being worked across worktrees, distinguishing "in progress (active worktree)" from "in progress (no active work)."

The architecture remains read-only and MCP-driven. The visualizer calls a Context Forge MCP tool (likely something like `project_worktrees` or an extension of `project_get`) and renders the result.

## Technical Considerations

- **MCP data contract dependency** — The entire feature depends on what Context Forge exposes. Slice planning should wait until the Context Forge worktree MCP interface is at least designed. Premature UI work risks building against an interface that doesn't exist.
- **Polling vs. push** — Worktree state changes as agents start and finish work. The current architecture polls on page load/refresh. Real-time updates would require a different transport (SSE, WebSocket) which is a significant architectural change. Initial implementation should use the existing poll-on-refresh model.
- **Identity resolution** — Worktrees operate on branches. Mapping a branch to a slice requires Context Forge to maintain that association. The visualizer should not attempt to infer slice from branch name.
- **Worktree lifecycle** — Worktrees are ephemeral. A worktree may be created, used, and cleaned up between refreshes. The visualizer should handle "worktree disappeared" gracefully — it simply stops showing it.

## Anticipated Slices

- **Worktree status display** — Add a summary indicator to the project card and an expandable worktree detail section. Depends on Context Forge MCP worktree endpoint being available.
- **Active slice highlighting** — Annotate initiative cards to show which slices have active worktrees. May be combined with the above or separated depending on data shape.

## Related Work

- Context Forge worktree support (in development — design not yet available)
- [105-arch.project-management.md](105-arch.project-management.md) — Project panel and MCP integration that this initiative builds upon
- Slice 108 (MCP client integration) — Provides the MCP client infrastructure this feature will consume
