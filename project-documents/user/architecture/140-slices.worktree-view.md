---
docType: slice-plan
parent: user/architecture/140-arch.worktree-view.md
project: context-visualizer
dateCreated: 20260311
dateUpdated: 20260311
status: active
---

# Slice Plan: Worktree View

## Parent Document
[140-arch.worktree-view.md](140-arch.worktree-view.md) — Horizontal column layout for visualizing parallel worktree-based development within a single project. Each worktree column shows its own initiative/slice/task hierarchy; collapsed strips provide at-a-glance branch info.

## Foundation Work

1. [x] **(140) Worktree API proxy** — Add `/api/worktrees?project={name}` endpoint to `serve.py` that calls `worktree_list` via MCP, resolving project name → ID using the existing `_mcp_name_to_id` cache. Returns the worktree array and path statuses. Effort: 1/5
   - **Value:** Backend plumbing that all UI slices depend on. Testable via `curl` independently of any frontend work.
   - **Success Criteria:**
     - `GET /api/worktrees?project=context-forge` returns the worktree list with all fields (id, name, indexRange, worktreePath, developmentPhase, activeSlice, activeTaskFile, archDoc, slicePlan, pathStatuses)
     - Projects with no worktrees return `{"worktrees": [], "count": 0}`
     - Missing/invalid project name returns appropriate error
     - Unit tests cover success, empty, and error cases
   - **Interfaces:** Consumes `worktree_list` MCP tool. Provides REST endpoint for frontend.
   - **Risk Level:** Low
   - **Dependencies:** None (MCP client infrastructure from slice 123 already exists)

## Feature Slices (in implementation order)

2. [x] **(141) Worktree column layout** — New `WorktreeColumns` React component that renders the horizontal multi-column container. When a project has ≥2 worktrees: one expanded column (full initiative/slice/task cards as today) and N-1 collapsed strips (~36-48px wide) showing branch name (rotated), initiative count badge, and mini progress indicator. Clicking a strip expands that worktree and collapses the current. Single or zero worktrees: renders identically to current layout (no visual change). Effort: 3/5
   - **Value:** Core UI pattern for parallel work visualization. The main deliverable of initiative 140.
   - **Success Criteria:**
     - Projects with 0 or 1 worktrees render identically to today — no regressions
     - Projects with 2+ worktrees show horizontal columns with one expanded and others collapsed
     - Collapsed strip displays: worktree name, initiative count, compact progress
     - Clicking a collapsed strip expands it and collapses the previously active column
     - Main/Default worktree is listed first and expanded by default
     - Column state is React-only (`useState`), resets to default on refresh
     - E2E test with stub data verifies column toggle behavior
   - **Interfaces:** Consumes `/api/worktrees` endpoint from slice 140. Wraps existing `InitiativeCard` components.
   - **Dependencies:** [140: Worktree API proxy]
   - **Risk Level:** Medium

3. [ ] **(142) Responsive vertical fallback** — When viewport width makes the expanded column narrower than ~500px, switch from horizontal columns to vertical stacked sections. Each worktree becomes a collapsible section header with its initiatives nested below. Only the active worktree section is expanded by default. Effort: 2/5
   - **Value:** Ensures the worktree view is usable on narrow screens and doesn't break the existing single-column experience.
   - **Success Criteria:**
     - Below the breakpoint, worktrees stack vertically with collapsible headers
     - Only active worktree section is expanded by default
     - Clicking a collapsed section header expands it (accordion or independent toggle — decide during slice design)
     - Above the breakpoint, horizontal column layout is used
     - Breakpoint logic uses container width, not viewport width (container query or JS measurement)
     - E2E test at narrow viewport width verifies vertical fallback renders correctly
   - **Interfaces:** Extends `WorktreeColumns` component from slice 141.
   - **Dependencies:** [141: Worktree column layout]
   - **Risk Level:** Low

4. [ ] **(143) Worktree-aware initiative grouping** — Within each worktree column, filter and group initiatives by the worktree's `indexRange`. Each worktree shows only initiatives whose index falls within its range. The project-level summary header updates to show worktree count (e.g. "2 active branches") alongside existing initiative/slice/task counts. Effort: 2/5
   - **Value:** Turns the column layout from a visual container into a meaningful data grouping — each column shows the right initiatives for that worktree's scope.
   - **Success Criteria:**
     - Initiatives are filtered into the correct worktree column based on `indexRange`
     - Initiatives outside any worktree's range appear in the main/Default column
     - Project header shows worktree count when ≥2 worktrees exist
     - Per-column header shows worktree metadata: branch name, active slice, development phase
     - Works correctly with real Context Forge data (context-forge project has worktrees)
   - **Interfaces:** Consumes worktree `indexRange` field. Filters existing initiative data.
   - **Dependencies:** [141: Worktree column layout]
   - **Risk Level:** Medium

## Integration Work

5. [ ] **(144) E2E testing and polish** — Comprehensive E2E tests using Playwright against real MCP data (context-forge project). Visual polish: consistent card spacing within columns, strip hover states, smooth expand/collapse transitions. Effort: 2/5
   - **Value:** Confidence that the full worktree flow works end-to-end with real data, and visual consistency with the rest of the UI.
   - **Success Criteria:**
     - E2E test loads context-forge project and verifies 2 worktree columns render
     - E2E test toggles between worktree columns
     - E2E test resizes viewport and verifies responsive fallback
     - No visual regressions on projects without worktrees
     - Expand/collapse transitions are smooth (CSS transition, not jarring reflow)
   - **Dependencies:** [140-143]
   - **Risk Level:** Low

## Notes

- **Data contract is now known.** `worktree_list` returns: `id`, `name`, `indexRange` (number tuple), `worktreePath`, `developmentPhase`, `activeSlice`, `activeTaskFile`, `instruction`, `workType`, `archDoc`, `slicePlan`, plus `pathStatuses` array. This is sufficient for all planned slices.
- **Real test data exists.** The `context-forge` project has 2 worktrees (Default: 100-499, maintenance: 900-999). Use this for integration testing.
- **Active slice highlighting** (mentioned in architecture doc's anticipated slices) was evaluated and folded into slice 143 as part of per-column metadata display (showing `activeSlice` in the column header). A separate slice for richer highlighting (e.g. color-coding initiative cards by active/inactive status) is deferred to future work.
- **Slices 142 and 143 are independent** of each other and could be implemented in parallel after slice 141.

## Future Work

1. [ ] **Active slice card highlighting** — Color-code or badge initiative cards to distinguish "in progress (active worktree)" from "in progress (no active work)." Requires design decision on visual treatment. Dependencies: [143]. Effort: 2/5
2. [ ] **Worktree path status indicators** — Show worktree health using `pathStatuses` (valid/invalid/missing). Could display a warning badge on strips with invalid paths. Dependencies: [141]. Effort: 1/5
3. [ ] **Worktree detail panel** — Expandable detail view within a worktree column showing full metadata (worktreePath, workType, instruction). Dependencies: [141]. Effort: 2/5
