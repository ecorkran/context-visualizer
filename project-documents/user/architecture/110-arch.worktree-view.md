---
docType: architecture
layer: project
project: context-visualizer
archIndex: 110
component: worktree-view
dateCreated: 20260308
dateUpdated: 20260310
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

## Chosen Layout: Horizontal Worktree Columns

After evaluating three approaches — vertical nesting (worktree-as-section), horizontal columns, and flat merge with badges — the horizontal column layout was selected. It best matches the existing progressive-disclosure patterns and visually communicates parallel work streams.

### Core Behavior

- **No worktrees / single worktree** — Layout is identical to the current single-column view. Zero visual overhead. The worktree feature is completely invisible when not in use.
- **Multiple worktrees** — Each worktree gets a column within the project content area. The "active" (selected) worktree column is wide and renders its initiatives, slices, and tasks using the exact same card layout as today. Other worktree columns collapse to a narrow strip (~36–48px) showing branch name, initiative count, and a compact progress indicator.
- **Clicking a collapsed strip** expands that worktree and collapses the previously active one. Only one worktree is fully expanded at a time.
- **Main worktree** — The primary/default worktree (typically `main` branch) is always listed first. It represents the project's baseline state independent of any parallel work.

### Visual Design

- Collapsed worktree strips use the same narrow-strip pattern as the project panel sidebar (already established in initiative 105).
- The strip shows: branch name (rotated or truncated), initiative count badge, and a mini progress bar or completion fraction.
- Active worktree column header shows branch name and worktree metadata (associated slice, agent if available).
- Initiative indices across worktrees do not collide (Context Forge enforces this), so the ordering within each column is natural.

### Responsive Fallback

On narrow viewports where horizontal columns become impractical:
- Layout switches to vertical stacking with worktree headers.
- Each worktree becomes a collapsible section (similar to the vertical nesting option).
- Only the active worktree section is expanded by default; others are collapsed showing just the header summary.
- Breakpoint: when the expanded column would be narrower than ~500px, switch to vertical mode.

### Why Not the Alternatives

- **Vertical nesting (Option A)** — Adds a nesting level (Project → Worktree → Initiative → Slice → Tasks). Too deep. The current initiative card depth already pushes visual limits.
- **Flat merge with badges (Option C)** — Simplest change but loses the "parallel streams" visual story. Mixing initiatives from different worktrees in one list obscures which work is happening where. Also creates a very long initiative list for active projects.

## Envisioned State

When Context Forge exposes worktree data, the visualizer will show:

- **Project-level summary** — A compact indicator in the project header showing the number of active worktrees (e.g. "3 active branches"). This replaces or augments the current single "current slice" display.
- **Worktree columns** — Horizontal column layout as described above. Each worktree column contains the full initiative/slice/task hierarchy for that worktree's branch.
- **Slice-level awareness** — Initiative cards within each worktree column show slice status in context. A slice "in progress" in a worktree is visually distinct from a slice that is merely planned.

The architecture remains read-only and MCP-driven. The visualizer calls a Context Forge MCP tool (likely `project_worktrees` or an extension of `project_get`) and renders the result.

## Technical Considerations

- **MCP data contract dependency** — The entire feature depends on what Context Forge exposes. Slice planning should wait until the Context Forge worktree MCP interface is at least designed. Premature UI work risks building against an interface that doesn't exist.
- **Polling vs. push** — Worktree state changes as agents start and finish work. The current architecture polls on page load/refresh. Real-time updates would require a different transport (SSE, WebSocket) which is a significant architectural change. Initial implementation should use the existing poll-on-refresh model.
- **Identity resolution** — Worktrees operate on branches. Mapping a branch to a slice requires Context Forge to maintain that association. The visualizer should not attempt to infer slice from branch name.
- **Worktree lifecycle** — Worktrees are ephemeral. A worktree may be created, used, and cleaned up between refreshes. The visualizer should handle "worktree disappeared" gracefully — it simply stops showing it.
- **Column state management** — Which worktree column is expanded is UI-only state (React `useState`). No persistence needed — on refresh, default to the main worktree expanded.
- **Responsive breakpoint** — CSS media query or container query triggers the vertical fallback. The breakpoint calculation: `(project content width) / (number of worktrees) < 500px` → switch to vertical.

## Anticipated Slices

- **Worktree column layout** — Implement the horizontal multi-column container with collapsed strip / expanded column toggle. Stub data initially if MCP endpoint is not yet available. Includes responsive vertical fallback.
- **Worktree data integration** — Wire the column layout to live MCP worktree data. Populate branch name, initiative list, slice associations per worktree. Depends on Context Forge MCP worktree endpoint being available.
- **Active slice highlighting** — Annotate initiative cards to show which slices have active worktrees. May be combined with data integration or separated depending on data shape.

## Related Work

- Context Forge worktree support (in development — design not yet available)
- [105-arch.project-management.md](105-arch.project-management.md) — Project panel and MCP integration that this initiative builds upon
- Slice 108 (MCP client integration) — Provides the MCP client infrastructure this feature will consume
