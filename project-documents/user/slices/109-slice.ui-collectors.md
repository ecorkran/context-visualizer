---
docType: slice-design
slice: ui-collectors
project: context-visualizer
parent: user/architecture/105-slices.project-management.md
dependencies: [108-mcp-client]
interfaces: []
status: complete
dateCreated: 20260304
dateUpdated: 20260304
---

# Slice Design: Collectors — Maintenance and Future Work

## Overview

Add two synthetic "collector" initiatives to the visualizer that aggregate data which currently lacks a natural initiative-level home. A **maintenance collector** groups 9xx operational documents (maintenance tasks, reviews, investigations) into a collapsible initiative card. A **future work collector** aggregates future work items from all slice plans via the MCP `workflow_future` tool, displaying them as an initiative with items grouped by source slice plan. Both are additive — existing views remain unchanged.

## Value

The maintenance collector replaces the current flat "Operational" section with a proper initiative card, giving 9xx documents the same expandable, progress-tracked treatment that regular initiatives enjoy. The future work collector provides a consolidated view of outstanding future items across all slice plans without requiring users to expand each plan individually — useful for project planning and prioritization.

## Technical Scope

### Included

- **Maintenance collector:** synthetic initiative card replacing the "Operational" section, grouping `data.maintenance`, `data.quality`, and `data.investigation` into a single collapsible card
- **Future work collector:** synthetic initiative card displaying aggregated future work items from `workflow_future` MCP tool, grouped by source slice plan
- **Collector color set:** new `THEME.colors.collector` entry based on `#08A8F6`
- **Internal config flag:** `enableFutureWorkCollector` in `mcp-config.json` controlling whether the future work collector is displayed (default: `false`)
- **Server endpoint:** `GET /api/future-work` to proxy the `workflow_future` MCP tool call
- **Tests:** unit tests for new endpoint, E2E test for collector rendering

### Excluded

- UI-exposed toggle for collectors (internal config only)
- Modification of `parse.py` or the project data model — collectors are a pure presentation concern
- Changes to how future work sections render inside individual slice plans
- Write operations against future work data
- 9xx slice design documents in the data model (these don't exist in the current project)

## Dependencies

### Prerequisites

- **Slice 108** (MCP Client) — complete. Provides `McpClient` and the `call_tool` interface used by the future work collector.
- MCP `workflow_future` tool — available in context-forge MCP server.

### Interfaces Required

From context-forge MCP server:
- **`workflow_future`** tool — input: `{ projectId?, status?, includeMarkdown? }`, returns:
  ```
  {
    projectPath: string,
    groups: [{
      initiativeIndex: string,
      initiativeName: string,
      sourceFile: string,
      items: [{ index, name, done, sourceFile, sourceInitiativeIndex, sourceInitiativeName }],
      totalItems, pendingItems, completedItems
    }],
    totalItems, pendingItems, completedItems
  }
  ```

## Architecture

### Component Structure

```
ProjectView
  ├── InitiativeCard × N          (existing — unchanged)
  ├── FeaturesCard                 (existing — unchanged)
  ├── MaintenanceCollectorCard     (new — replaces Operational section)
  └── FutureWorkCollectorCard      (new — MCP-only, config-gated)
```

Both collector cards follow the same visual pattern as `InitiativeCard` (collapsible header with chevron, progress summary, nested content) but use the collector color set and distinct iconography (no band number — use a glyph or label instead).

### Data Flow

**Maintenance collector — pure frontend reshaping:**
1. `ProjectView` receives `data.maintenance`, `data.quality`, `data.investigation` (already present in model)
2. `MaintenanceCollectorCard` receives these arrays as props
3. Renders them as categorized `DocBlock` rows inside a collapsible card
4. No new data fetching required

**Future work collector — MCP fetch + frontend rendering:**
1. On project load (MCP mode only), `loadProjects()` also fetches `GET /api/future-work?project={projectId}`
2. `serve.py` calls `client.call_tool("workflow_future", { projectId, status: "all" })`
3. Response is returned to the frontend as-is (the `groups` structure maps directly to the UI)
4. `FutureWorkCollectorCard` receives the groups array
5. Each group renders as a collapsible sub-section (source slice plan name as header, items as rows)
6. If MCP is unavailable or config flag is off, the card is simply not rendered

### Data Shape for Frontend

The future work data attaches to the project data under a new `futureWork` key:

```js
// Added to the project data object alongside existing fields
{
  ...existingProjectData,
  futureWork: {                   // null when unavailable
    groups: [
      {
        initiativeIndex: "100",
        initiativeName: "File Updates",
        items: [
          { index: "110", name: "Add export support", done: false },
          ...
        ],
        totalItems: 3,
        pendingItems: 2,
        completedItems: 1
      },
      ...
    ],
    totalItems: 12,
    pendingItems: 8,
    completedItems: 4
  }
}
```

## Technical Decisions

### Collectors as Frontend Components (Not Data Model Changes)

**Decision:** Collectors are implemented as JSX components that reshape existing data. No changes to `parse.py` or the `build_model()` output.

**Rationale:** The maintenance data (`maintenance`, `quality`, `investigation`) is already in the model. The future work data comes from a separate MCP call. Adding synthetic initiatives to the data model would conflate presentation concerns with data structure and complicate the parser. Keeping collectors as a rendering concern means the data model remains a clean representation of what's on disk.

### Separate Endpoint for Future Work

**Decision:** New `GET /api/future-work?project={projectId}` endpoint rather than bundling into `/api/structures`.

**Rationale:** The `workflow_future` call is MCP-only and config-gated. Bundling it into `/api/structures` would add latency for all users (including those who don't want this feature) and complicate the fallback logic. A separate endpoint lets the frontend fetch it conditionally and independently.

### Config Flag in `mcp-config.json`

**Decision:** Add `enableFutureWorkCollector: boolean` (default `false`) to `mcp-config.json`.

**Rationale:** The future work collector's value is uncertain. Gating it behind a config flag allows experimentation without cluttering the UI for users who don't want it. The flag lives alongside MCP server config since the feature requires MCP mode anyway. No UI toggle is needed — the target audience (the developer) edits config files directly.

```json
{
  "prefer": "mcp",
  "enableFutureWorkCollector": true,
  "server": { ... }
}
```

### Collector Color Set

**Decision:** A single shared color set for both collector cards, based on `#08A8F6` (saturated blue).

```js
collector: { bg: "#0A3A5A", text: "#E0F4FF", border: "#0870A8", accent: "#08A8F6" }
```

**Rationale:** Both collectors are conceptually "aggregation views" distinct from regular initiatives. A shared color differentiates them visually. The saturated blue stands out from the existing palette (greens, purples, golds) without clashing.

## UI Specifications

### MaintenanceCollectorCard

Replaces the current "Operational" section (flat `DocBlock` rows under a plain heading). The new card follows `InitiativeCard` layout:

- **Header:** Glyph `⚙` (instead of band number) + title "Maintenance & Operations" + item count + chevron
- **Expanded body:** Three categorized groups (only shown if non-empty):
  - Reviews → `DocBlock` rows with `REVIEW` label, `review` color set
  - Analysis → `DocBlock` rows with `ANALYSIS` label, `analysis` color set
  - Tasks → `DocBlock` rows with `MAINT` label, `maintenance` color set
- **Collapsed by default** (consistent with initiative cards)
- Uses `collector` color set for the card border/background accents

### FutureWorkCollectorCard

New card rendered after `MaintenanceCollectorCard` (only in MCP mode when config flag is enabled and data is available):

- **Header:** Glyph `◈` + title "Future Work" + summary counts (e.g., "4/12 complete") + chevron
- **Expanded body:** One collapsible sub-group per source initiative:
  - Sub-group header: initiative name (e.g., "File Updates And Organization") + group counts
  - Items rendered as lightweight rows: index, name, done/pending indicator
  - Done items shown dimmed; pending items at normal opacity
- **Collapsed by default**
- Uses `collector` color set
- Items use a simplified layout (not full `DocBlock` — they're lightweight references, not documents)

### Legend Update

Add a "Collector" entry to the `Legend` component using the collector color set.

## API Contracts

### `GET /api/future-work`

Returns aggregated future work data for a project from the MCP `workflow_future` tool.

| Param | Type | Description |
|-------|------|-------------|
| `project` | query string | Project ID (from context-forge) |

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ status: "ok", data: FutureWorkCollectorResult }` | Future work data |
| 503 | `{ status: "error", message: "..." }` | MCP unavailable or feature disabled |

The response `data` field contains the raw `workflow_future` result (groups, counts).

## Integration Points

### Consumes

- **Existing project model:** `data.maintenance`, `data.quality`, `data.investigation` arrays (for maintenance collector)
- **MCP `workflow_future` tool** via `McpClient.call_tool()` (for future work collector)
- **`mcp-config.json`** `enableFutureWorkCollector` flag

### Provides

- Two new JSX components consumed by `ProjectView`
- `GET /api/future-work` endpoint consumed by frontend
- Collector color set in `THEME.colors`

## Success Criteria

### Functional Requirements

- 9xx operational documents render inside a collapsible "Maintenance & Operations" card instead of a flat "Operational" section
- Maintenance card groups items by type (reviews, analysis, maintenance tasks)
- With `enableFutureWorkCollector: true` and MCP connected, a "Future Work" card appears showing items grouped by source initiative
- Future work items show done/pending state
- With `enableFutureWorkCollector: false` (default) or MCP unavailable, no future work card appears
- Existing initiative cards, slice plan future work sections, and all other views are unchanged
- Collector cards use the blue `#08A8F6`-based color set
- Legend includes collector entry

### Technical Requirements

- No changes to `parse.py` or `build_model()` output
- Unit tests for `GET /api/future-work` endpoint (mock MCP client)
- E2E test: maintenance collector card renders with operational documents
- All existing tests pass unchanged

## Implementation Notes

### Development Approach

Suggested order:

1. **Collector color set** — add `THEME.colors.collector` entry
2. **MaintenanceCollectorCard** — new component, wire into `ProjectView` replacing the Operational section
3. **Config flag** — read `enableFutureWorkCollector` from `mcp-config.json` in serve.py
4. **`GET /api/future-work` endpoint** — proxy to `workflow_future` MCP tool
5. **Frontend fetch** — conditionally fetch future work data alongside project structures
6. **FutureWorkCollectorCard** — new component, wire into `ProjectView`
7. **Legend update** — add collector entry
8. **Tests** — unit and E2E
9. **Verification** — both collectors render correctly, toggling config flag works

### Testing Strategy

- **Unit tests (`test_serve.py`):** Extend the existing MCP mock pattern to handle `workflow_future` calls. Test the new endpoint in both MCP-connected and unavailable states. Test config flag behavior.
- **E2E test (`test_ui_smoke.py` or new file):** Verify the maintenance collector card appears when operational documents exist. Verify it replaces (not duplicates) the old Operational section.
- Future work collector E2E testing is deferred to manual verification (requires live MCP server with real project data).
