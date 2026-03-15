---
docType: slice-design
slice: worktree-column-layout
project: context-visualizer
parent: user/architecture/110-slices.worktree-view.md
dependencies: [110-slice.worktree-api-proxy]
interfaces: [112-slice.responsive-vertical-fallback, 113-slice.worktree-initiative-grouping]
dateCreated: 20260315
dateUpdated: 20260315
status: not_started
---

# Slice Design: Worktree Column Layout

## Overview

Introduce a `WorktreeColumns` component that fetches `/api/worktrees` for the active project and renders a horizontal multi-column layout when 2 or more worktrees are present. A single expanded column shows the full initiative/slice/task hierarchy (identical to the current layout). Each additional worktree is shown as a narrow collapsed strip (~40px) with branch name, initiative count, and progress fraction. Clicking a strip swaps which column is expanded.

When 0 or 1 worktrees are returned, the component is a pass-through: the existing initiative card layout renders with zero visual change.

## Value

This is the core UI deliverable of initiative 110. Users with multi-worktree projects can see at a glance that parallel work is happening and switch focus to any worktree column. Single-worktree and no-worktree projects are completely unaffected.

## Technical Scope

**Included:**
- New `WorktreeColumns` component in `project-structure-viz.jsx`
- New `WorktreeStrip` sub-component (collapsed 40px column)
- Fetch of `/api/worktrees?project={key}` inside `WorktreeColumns`
- Column expand/collapse toggle (React `useState` only)
- Graceful degradation: fetch error → pass-through layout
- E2E test verifying column toggle with live context-forge data

**Excluded:**
- Responsive vertical fallback (slice 112)
- Initiative filtering by `indexRange` (slice 113)
- Per-column header metadata (activeSlice, developmentPhase) — deferred to slice 113
- Any changes to `InitiativeCard`, `DocBlock`, or other existing components

## Dependencies

### Prerequisites
- Slice 110 complete: `/api/worktrees?project={name}` endpoint available

### Interfaces Required
- `GET /api/worktrees?project={key}` — returns `{ status, data: { worktrees, count, pathStatuses } }`
- Worktree fields used by this slice: `id`, `name`, `indexRange` (for count, pre-113), `worktreePath`
- All other worktree fields (`developmentPhase`, `activeSlice`, etc.) are ignored until slice 113

## Architecture

### Component Structure

```
ProjectView
  └─ WorktreeColumns                     ← new: wraps initiative rendering
       ├─ [0/1 worktrees] pass-through   ← bands.map(InitiativeCard), unchanged
       └─ [2+ worktrees] column layout
            ├─ WorktreeStrip × N-1       ← new: collapsed ~40px strips
            └─ WorktreeColumn × 1        ← new: expanded full-width column
                 └─ bands.map(InitiativeCard)  ← unchanged existing component
```

`WorktreeStrip` and `WorktreeColumn` are internal sub-components defined inside the same JSX file. No new files needed.

### Data Flow

```
ProjectView mounts / projectKey changes
  → WorktreeColumns useEffect fires
  → fetch /api/worktrees?project={key}
  → [loading] render pass-through (no flash/spinner)
  → [error] log warning, render pass-through
  → [0 or 1 worktrees] render pass-through
  → [2+ worktrees] render column layout
       → activeId = worktrees[0].id (Default/main first)
       → collapsed strips for worktrees where id !== activeId
       → expanded column for worktree where id === activeId
       → user clicks strip → setActiveId(strip.id)
```

### State Management

`WorktreeColumns` owns two pieces of state:
- `worktrees` — array from API response, `null` during load, `[]` on error/empty
- `activeId` — id of the currently expanded worktree; initialized to `worktrees[0].id`

State is entirely local to `WorktreeColumns`. On page refresh, defaults to first worktree. No persistence.

## Technical Decisions

### Fetch Strategy: Inside WorktreeColumns
The component self-fetches rather than receiving data via props. This keeps `ProjectView` clean and avoids threading worktree state through the app root. The fetch is a `useEffect` on `projectKey`.

```jsx
useEffect(() => {
  setWorktrees(null);   // reset on project switch
  fetch(`/api/worktrees?project=${encodeURIComponent(projectKey)}`)
    .then(r => r.json())
    .then(body => {
      if (body.status === 'ok') {
        setWorktrees(body.data.worktrees || []);
        setActiveId(body.data.worktrees?.[0]?.id ?? null);
      } else {
        setWorktrees([]);
      }
    })
    .catch(() => setWorktrees([]));
}, [projectKey]);
```

### Loading Behavior: Pass-Through During Fetch
While `worktrees === null` (loading), render the pass-through layout. This avoids layout shift and the existing data is already visible while the worktree fetch resolves. No loading spinner needed.

### Pass-Through Condition
Render pass-through when `worktrees === null || worktrees.length <= 1`. This covers: loading, MCP not connected (503), error, no worktrees, single worktree.

### Collapsed Strip Width: 40px
Enough for rotated text (up to ~10 chars visible), progress fraction, and touch target. Strip height matches the height of the expanded column (via `alignItems: stretch`).

### Column Flex Layout
```
[strip 40px] [strip 40px] ... [column flex:1]
```
Container: `display: flex, gap: THEME.sp.sm`. Strips shrink to fixed width; expanded column takes remaining space. Minimum expanded column width: the same width as today's single-column layout (no minimum enforced — that is slice 112's concern).

### Strip Contents (bottom-to-top, text rotated 90deg CW)
```
┌──────┐
│ 3/8  │  ← progress fraction (slices done/total)
│      │
│ main │  ← worktree name (truncated to ~10 chars)
│      │
│  ⋮   │  ← indicator if more initiatives than visible
└──────┘
```

- Background: `#12121F` (darker than cards, same as panel sidebar)
- Border: `1px solid #1E1E3A`
- Border-radius: `THEME.radius + 4` (matches InitiativeCard)
- Hover: subtle highlight `#ffffff06`
- Cursor: pointer
- Active strip (would be expanded): not shown as strip (it's the expanded column)

The worktree `name` field (e.g., "Default", "maintenance") is used as the label, not the branch name or path. This is stable and human-readable.

### Expanded Column Header
A slim header above the initiative cards showing which worktree is active:
```
◈ Default  [100–499]
```
- Small `◈` icon (same color as collector accent `#08A8F6`)
- Worktree name
- Index range in muted text: derived from `worktree.indexRange` if present
- No interactive elements — purely informational

This header is only shown when 2+ worktrees exist (pass-through has no header).

## UI Specifications

### WorktreeColumns Props
```jsx
WorktreeColumns({
  projectKey,      // string — used to build /api/worktrees?project= URL
  bands,           // [[band, initiative], ...] — sorted initiative entries
  futureSlices,    // array — passed through to InitiativeCard
})
```

### Layout Structure

**Pass-through (0/1 worktrees or loading):**
```jsx
<>
  {bands.map(([band, init]) => (
    <InitiativeCard key={band} band={band} initiative={init} futureSlices={futureSlices} />
  ))}
</>
```
No wrapper div added. Zero visual change.

**Column layout (2+ worktrees):**
```jsx
<div style={{ display: "flex", gap: THEME.sp.sm, alignItems: "stretch", marginBottom: THEME.sp.lg }}>
  {worktrees.map(wt =>
    wt.id === activeId
      ? <WorktreeColumn key={wt.id} worktree={wt} bands={bands} futureSlices={futureSlices} />
      : <WorktreeStrip key={wt.id} worktree={wt} bands={bands} onClick={() => setActiveId(wt.id)} />
  )}
</div>
```

### WorktreeStrip Spec
```jsx
WorktreeStrip({ worktree, bands, onClick })
```
- Container: `width: 40, flexShrink: 0, cursor: pointer`
- Background: `#12121F`, border: `1px solid #1E1E3A`, borderRadius: `THEME.radius + 4`
- Content stacked vertically (column direction), centered
- Worktree name: rotated `writingMode: "vertical-rl", transform: "rotate(180deg)"`, font: `THEME.fonts.heading`, size: 11, color: `#6666AA`
- Progress fraction: `done/total` slices across all bands (small, muted)
- Initiative count badge: number of bands (small dot or number)
- Hover: background shifts to `#ffffff06`

### WorktreeColumn Spec
```jsx
WorktreeColumn({ worktree, bands, futureSlices })
```
- Container: `flex: 1, minWidth: 0` (allows shrinking)
- Slim header: `display: flex, alignItems: center, gap: THEME.sp.sm`, `padding: THEME.sp.sm THEME.sp.md`, `marginBottom: THEME.sp.sm`, `borderBottom: 1px solid #1E1E3A`
  - `◈` icon: `color: #08A8F6, opacity: 0.6`
  - Name: `fontFamily: THEME.fonts.heading, fontSize: 13, color: #8888AA`
  - Range: `fontSize: 11, color: #555577` (shows `100–499` from `indexRange` array)
- Body: `bands.map(([ band, init]) => <InitiativeCard ... />)` — unchanged

## Integration Points

### Provides to Other Slices
- `WorktreeColumns` component accepts worktree data and bands — slices 112 and 113 extend this component
- Column layout container — slice 112 (responsive) adds container-width detection to switch to vertical
- Expanded column — slice 113 filters `bands` per-column by `indexRange`

### Consumes from Other Slices
- `/api/worktrees` endpoint from slice 110
- `InitiativeCard` from existing codebase (unchanged)

## Success Criteria

### Functional Requirements
- `context-forge` project (2 worktrees) shows horizontal column layout with one expanded and one collapsed strip
- `context-visualizer` project (0 worktrees) renders identically to today — no regressions
- Clicking a collapsed strip expands it and collapses the previously active column
- Default/first worktree is expanded on initial render and after page refresh
- Column state resets to default on project switch

### Technical Requirements
- No changes to `InitiativeCard`, `DocBlock`, or any existing component props
- Pass-through renders zero additional DOM nodes compared to today
- Fetch errors produce no visible change (graceful degradation to pass-through)
- Column state is `useState` only — no localStorage, no URL param

### Integration Requirements
- Slices 112 and 113 can extend `WorktreeColumns` without modifying `ProjectView`

### Verification Walkthrough

**Prerequisites:** Server running (`python serve.py`), Context Forge MCP connected.

1. **No-regression check — single worktree project:**
   - Open `http://localhost:5678`
   - Select `context-visualizer` project (0 worktrees)
   - Verify: layout is identical to before this slice — no column container, no header, just initiative cards
   - Open browser DevTools → Network tab, confirm `GET /api/worktrees?project=context-visualizer` returns `{"worktrees": [], "count": 0}`

2. **Column layout — multi-worktree project:**
   - Select `context-forge` project
   - Verify: two regions appear side by side — one narrow strip (~40px) and one wide column
   - Wide column header shows `◈ Default  100–499` (or similar)
   - Narrow strip shows `maintenance` name (rotated), progress fraction, initiative count

3. **Column toggle:**
   - Click the collapsed strip for `maintenance`
   - Verify: `maintenance` column expands (takes the wide region), `Default` collapses to strip
   - Verify: narrow strip now shows `Default` rotated label

4. **Page refresh resets column:**
   - Reload the page while `context-forge` is active
   - Verify: `Default` worktree is expanded (first/default)

5. **Run E2E test:**
   ```bash
   pytest tests/test_ui_smoke.py -k "worktree" -v
   ```
   Expected: all worktree E2E tests pass.

6. **Run full test suite (no regressions):**
   ```bash
   pytest tests/ -m "not e2e" -v
   ```

## Risk Assessment

### Technical Risks
- **Fetch timing and project switches**: If the user switches projects rapidly, a stale fetch for the previous project might resolve after the new project's fetch. Mitigation: cancel stale fetch with an abort signal or ignore results if `projectKey` has changed.
- **Worktree strip height**: If initiative list is very short, the strip may be taller than the content. Likely fine visually but needs a minimum height guard.

### Mitigation Strategies
- Use `AbortController` in the `useEffect` to cancel in-flight fetches on cleanup (clean React pattern, prevents stale data).
- Set `minHeight: 80` on strips to avoid degenerate layout with very few initiatives.

## Implementation Notes

### Development Approach
1. Add `WorktreeStrip` component (stub with just a colored placeholder) to verify layout mechanics
2. Add `WorktreeColumn` component wrapping existing `InitiativeCard` render
3. Add `WorktreeColumns` orchestrator with fetch, state, and conditional render
4. Replace `bands.map(InitiativeCard)` in `ProjectView` with `<WorktreeColumns ...>`
5. Flesh out `WorktreeStrip` visual design
6. Write E2E test

Test-first is less natural for pure UI components; write the E2E test after the component is visually working.

### Special Considerations
- The single JSX file pattern means all new components are added in the same file. Place them immediately before `ProjectView` in the component order (after `FutureWorkCollectorCard`).
- The `projectKey` passed to `WorktreeColumns` must match the key used in the `/api/worktrees` URL. In `ProjectView`, the project key comes from the outer `App` state — it needs to be threaded through. Check how `ProjectView` receives `data` and confirm the project key is accessible (it may be `data.key` or need to be passed separately as a prop).
- `window.__projectsMode` check: the endpoint returns 503 when MCP is not connected. The component already handles this via error → pass-through. No explicit mode check needed.
