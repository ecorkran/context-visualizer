---
slice: worktree-column-layout
project: context-visualizer
lld: user/slices/141-slice.worktree-column-layout.md
dependencies: [140-slice.worktree-api-proxy]
projectState: Slice 140 complete. /api/worktrees endpoint live. project-structure-viz.jsx is a single-file React app. All components (InitiativeCard, DocBlock, Tooltip, etc.) are defined in that file. ProjectView renders initiative bands directly; no worktree awareness yet.
dateCreated: 20260315
dateUpdated: 20260315
status: complete
---

## Context Summary
- Working on 141-slice.worktree-column-layout (core UI slice of initiative 140)
- Adding `WorktreeColumns`, `WorktreeColumn`, and `WorktreeStrip` components to `project-structure-viz.jsx`
- `WorktreeColumns` replaces the direct `bands.map(InitiativeCard)` call in `ProjectView`
- Pass-through behavior: 0 or 1 worktrees → zero visual change from today
- Column layout: 2+ worktrees → horizontal flex with one expanded column and N-1 collapsed 40px strips
- `ProjectView` call site needs `projectKey={active}` added (one-line change in App root)
- E2E test verifies toggle behavior against live context-forge project (2 worktrees)
- Next slice: 142 (responsive vertical fallback) extends `WorktreeColumns`

## Tasks

### 1. [x] Thread `projectKey` prop through to `ProjectView`

The app root (`ProjectStructureVisualizer`) renders `<ProjectView data={projects[active]} />` but does not pass the project key. Add it so `WorktreeColumns` can build the API URL.

- [x] In `project-structure-viz.jsx`, find the `<ProjectView data={projects[active]} />` call (near line 1410)
- [x] Change it to `<ProjectView data={projects[active]} projectKey={active} />`
- [x] Add `projectKey` to `ProjectView`'s destructured props signature
- [x] Pass `projectKey` as a prop to the new `WorktreeColumns` component placeholder (will wire in task 4)
- [x] Verify: no visual changes, no console errors — `pytest tests/ -m "not e2e" -v` passes

**Success criteria:**
- [x] `projectKey` is available inside `ProjectView` as a string (e.g., `"context-forge"`)
- [x] All existing non-E2E tests pass

---

### 2. [x] Implement `WorktreeStrip` component (stub layout)

Add a minimal stub component that renders the correct 40px container with placeholder content. This confirms the flex layout works before adding visual details.

- [x] Add `WorktreeStrip` component definition in `project-structure-viz.jsx`, placed after `FutureWorkCollectorCard` and before `ProjectView`
- [x] Props: `{ worktree, bands, onClick }`
- [x] Container styles: `width: 40, flexShrink: 0, cursor: "pointer"`, background `#12121F`, border `1px solid #1E1E3A`, borderRadius `THEME.radius + 4`, `minHeight: 80`
- [x] Hover state: `onMouseEnter`/`onMouseLeave` toggling background between `#12121F` and `#ffffff06` (inline style, same pattern used elsewhere in the file)
- [x] Placeholder content: a single centered `◈` character in muted color — just to confirm the strip renders
- [x] `onClick` wired to the container's `onClick` prop

**Success criteria:**
- [x] Component defined and syntactically valid (no parse errors)
- [x] No tests broken: `pytest tests/ -m "not e2e" -v` passes

---

### 3. [x] Implement `WorktreeColumn` component

Add the expanded column component that wraps the existing initiative card rendering with a slim worktree header.

- [x] Add `WorktreeColumn` component definition immediately after `WorktreeStrip`
- [x] Props: `{ worktree, bands, futureSlices }`
- [x] Container: `flex: 1, minWidth: 0`
- [x] Header (only rendered when this is used inside a multi-worktree layout — always render it; `WorktreeColumns` controls when this component is used):
  - [x] `display: flex, alignItems: center, gap: THEME.sp.sm`
  - [x] `padding: "${THEME.sp.sm}px ${THEME.sp.md}px"`, `marginBottom: THEME.sp.sm`
  - [x] `borderBottom: "1px solid #1E1E3A"`
  - [x] `◈` icon: `color: "#08A8F6", opacity: 0.6, fontSize: 14`
  - [x] Worktree name: `fontFamily: THEME.fonts.heading, fontSize: 13, color: "#8888AA"`
  - [x] Index range (if `worktree.indexRange` exists): format as `100–499`, `fontSize: 11, color: "#555577"`, separated by a space
- [x] Body: render `bands.map(([band, init]) => <InitiativeCard key={band} band={band} initiative={init} futureSlices={futureSlices} />)` — identical to current `ProjectView` rendering

**Success criteria:**
- [x] Component defined and syntactically valid
- [x] No tests broken: `pytest tests/ -m "not e2e" -v` passes

---

### 4. [x] Implement `WorktreeColumns` orchestrator component

Add the main orchestrator that fetches worktree data and conditionally renders pass-through or column layout.

- [x] Add `WorktreeColumns` component definition immediately after `WorktreeColumn`
- [x] Props: `{ projectKey, bands, futureSlices }`
- [x] State: `const [worktrees, setWorktrees] = useState(null)` and `const [activeId, setActiveId] = useState(null)`
- [x] `useEffect` on `projectKey`:
  - [x] Create `AbortController`; store as `controller`
  - [x] Set `setWorktrees(null)` to reset on project switch
  - [x] Fetch `/api/worktrees?project=${encodeURIComponent(projectKey)}` with `signal: controller.signal`
  - [x] On success with `body.status === 'ok'`: `setWorktrees(body.data.worktrees || [])` and `setActiveId(body.data.worktrees?.[0]?.id ?? null)`
  - [x] On any error (including abort): `setWorktrees([])`
  - [x] Return cleanup: `() => controller.abort()`
- [x] Pass-through condition: if `worktrees === null || worktrees.length <= 1`, render `<>{bands.map(...)}</>` (no wrapper element)
- [x] Column layout (2+ worktrees): render flex container with `WorktreeStrip` for each inactive worktree and `WorktreeColumn` for the active one (see slice design Layout Structure section)

**Success criteria:**
- [x] Component defined and syntactically valid
- [x] No tests broken: `pytest tests/ -m "not e2e" -v` passes

---

### 5. [x] Wire `WorktreeColumns` into `ProjectView`

Replace the direct initiative band rendering in `ProjectView` with the new `WorktreeColumns` component.

- [x] In `ProjectView`, find the `bands.map(([band, init]) => <InitiativeCard ... />)` block
- [x] Replace it with `<WorktreeColumns projectKey={projectKey} bands={bands} futureSlices={data.futureSlices} />`
- [x] Confirm `projectKey` is available (wired in task 1)
- [x] Verify the `FeaturesCard`, `MaintenanceCollectorCard`, `FutureWorkCollectorCard`, and devlog renders remain outside `WorktreeColumns` (unchanged)

**Success criteria:**
- [x] `context-visualizer` project (0 worktrees) renders identically to before — no column container, no header, just initiative cards as today
- [x] Browser console shows no errors
- [x] `pytest tests/ -m "not e2e" -v` passes

**Commit:** `feat: add WorktreeColumns pass-through component`

---

### 6. [x] Complete `WorktreeStrip` visual design

Replace the placeholder content in `WorktreeStrip` with the full visual spec from the slice design.

- [x] Tooltip: wrap the entire strip in the existing `Tooltip` component with `content` set to `"${worktree.name}  ·  ${worktree.worktreePath}"` (use `·` separator, matching existing tooltip style)
- [x] Compute progress values from `bands`:
  - [x] `done` = count of slices with `status === "complete"` across all initiatives
  - [x] `total` = total slice count across all initiatives
- [x] Compute `initCount` = `bands.length`
- [x] Strip content (flex column, centered, `gap: THEME.sp.xs`, `padding: THEME.sp.sm 0`):
  - [x] Progress fraction: `"${done}/${total}"` — `fontFamily: THEME.fonts.heading, fontSize: 10, color: "#555577"`, `writingMode: "vertical-rl", transform: "rotate(180deg)"`
  - [x] Worktree name: truncate to 10 chars with `slice(0,10)` — same font/writing-mode/transform as progress
  - [x] Initiative count: small badge — `fontFamily: THEME.fonts.heading, fontSize: 10, color: "#444466"`, `writingMode: "vertical-rl", transform: "rotate(180deg)"`
- [x] Verify strip renders correctly when viewed in browser with context-forge project

**Success criteria:**
- [x] Strip shows worktree name (rotated), progress fraction, initiative count
- [x] Hovering the strip shows tooltip with name and path
- [x] `pytest tests/ -m "not e2e" -v` passes

---

### 7. [x] Write E2E test for column toggle behavior

Add Playwright E2E tests to `tests/test_ui_smoke.py` verifying the column layout with the live context-forge project.

- [x] Add test class or test functions marked with `pytestmark = pytest.mark.e2e`
- [x] Test: `test_worktree_column_layout_renders` — load the visualizer, select context-forge project, verify:
  - [x] A collapsed strip element is visible (look for element with `width: 40px` or a known class/data attribute)
  - [x] An expanded column header containing `◈` and `Default` is visible
- [x] Test: `test_worktree_strip_toggle` — click the collapsed strip, verify:
  - [x] The `maintenance` column becomes the expanded column (header shows "maintenance")
  - [x] The `Default` strip appears as collapsed
- [x] Test: `test_worktree_no_regression_single_project` — select context-visualizer project, verify:
  - [x] No column container is rendered (the flex layout div with strip/column structure is absent)
  - [x] Initiative cards render as normal
- [x] Use the existing `live_server` fixture and Playwright page fixture patterns from `tests/test_ui_smoke.py`

**Success criteria:**
- [x] All 3 E2E tests pass: `pytest tests/test_ui_smoke.py -k "worktree" -v`
- [x] No regressions in existing E2E tests: `pytest tests/test_ui_smoke.py -v`

**Commit:** `feat: add worktree column layout with strip toggle`

---

### 8. [x] Final verification and slice completion

Run full verification walkthrough from the slice design and mark slice complete.

- [x] Start server: confirm running on port 5678 (`python serve.py` or confirm already running)
- [x] Manual walkthrough per slice design Verification Walkthrough section:
  - [x] context-visualizer: no column layout, no regression
  - [x] context-forge: two regions visible (strip + expanded column)
  - [x] Column toggle: click strip, verify swap
  - [x] Refresh: default worktree expanded on reload
- [x] Run full test suite: `pytest tests/ -v`
- [x] Update `141-slice.worktree-column-layout.md` frontmatter `status` to `complete` and `dateUpdated`
- [x] Check off slice 141 in `140-slices.worktree-view.md`
- [x] Write DEVLOG entry (matching existing format, include commit hashes)
- [x] Commit: `docs: mark 141-slice complete, update DEVLOG`

**Success criteria:**
- [x] All tests pass (unit + E2E)
- [x] Slice design and slice plan marked complete
- [x] DEVLOG updated
