---
slice: worktree-column-layout
project: context-visualizer
lld: user/slices/111-slice.worktree-column-layout.md
dependencies: [110-slice.worktree-api-proxy]
projectState: Slice 110 complete. /api/worktrees endpoint live. project-structure-viz.jsx is a single-file React app. All components (InitiativeCard, DocBlock, Tooltip, etc.) are defined in that file. ProjectView renders initiative bands directly; no worktree awareness yet.
dateCreated: 20260315
dateUpdated: 20260315
status: not_started
---

## Context Summary
- Working on 111-slice.worktree-column-layout (core UI slice of initiative 110)
- Adding `WorktreeColumns`, `WorktreeColumn`, and `WorktreeStrip` components to `project-structure-viz.jsx`
- `WorktreeColumns` replaces the direct `bands.map(InitiativeCard)` call in `ProjectView`
- Pass-through behavior: 0 or 1 worktrees → zero visual change from today
- Column layout: 2+ worktrees → horizontal flex with one expanded column and N-1 collapsed 40px strips
- `ProjectView` call site needs `projectKey={active}` added (one-line change in App root)
- E2E test verifies toggle behavior against live context-forge project (2 worktrees)
- Next slice: 112 (responsive vertical fallback) extends `WorktreeColumns`

## Tasks

### 1. [ ] Thread `projectKey` prop through to `ProjectView`

The app root (`ProjectStructureVisualizer`) renders `<ProjectView data={projects[active]} />` but does not pass the project key. Add it so `WorktreeColumns` can build the API URL.

- [ ] In `project-structure-viz.jsx`, find the `<ProjectView data={projects[active]} />` call (near line 1410)
- [ ] Change it to `<ProjectView data={projects[active]} projectKey={active} />`
- [ ] Add `projectKey` to `ProjectView`'s destructured props signature
- [ ] Pass `projectKey` as a prop to the new `WorktreeColumns` component placeholder (will wire in task 4)
- [ ] Verify: no visual changes, no console errors — `pytest tests/ -m "not e2e" -v` passes

**Success criteria:**
- [ ] `projectKey` is available inside `ProjectView` as a string (e.g., `"context-forge"`)
- [ ] All existing non-E2E tests pass

---

### 2. [ ] Implement `WorktreeStrip` component (stub layout)

Add a minimal stub component that renders the correct 40px container with placeholder content. This confirms the flex layout works before adding visual details.

- [ ] Add `WorktreeStrip` component definition in `project-structure-viz.jsx`, placed after `FutureWorkCollectorCard` and before `ProjectView`
- [ ] Props: `{ worktree, bands, onClick }`
- [ ] Container styles: `width: 40, flexShrink: 0, cursor: "pointer"`, background `#12121F`, border `1px solid #1E1E3A`, borderRadius `THEME.radius + 4`, `minHeight: 80`
- [ ] Hover state: `onMouseEnter`/`onMouseLeave` toggling background between `#12121F` and `#ffffff06` (inline style, same pattern used elsewhere in the file)
- [ ] Placeholder content: a single centered `◈` character in muted color — just to confirm the strip renders
- [ ] `onClick` wired to the container's `onClick` prop

**Success criteria:**
- [ ] Component defined and syntactically valid (no parse errors)
- [ ] No tests broken: `pytest tests/ -m "not e2e" -v` passes

---

### 3. [ ] Implement `WorktreeColumn` component

Add the expanded column component that wraps the existing initiative card rendering with a slim worktree header.

- [ ] Add `WorktreeColumn` component definition immediately after `WorktreeStrip`
- [ ] Props: `{ worktree, bands, futureSlices }`
- [ ] Container: `flex: 1, minWidth: 0`
- [ ] Header (only rendered when this is used inside a multi-worktree layout — always render it; `WorktreeColumns` controls when this component is used):
  - `display: flex, alignItems: center, gap: THEME.sp.sm`
  - `padding: "${THEME.sp.sm}px ${THEME.sp.md}px"`, `marginBottom: THEME.sp.sm`
  - `borderBottom: "1px solid #1E1E3A"`
  - `◈` icon: `color: "#08A8F6", opacity: 0.6, fontSize: 14`
  - Worktree name: `fontFamily: THEME.fonts.heading, fontSize: 13, color: "#8888AA"`
  - Index range (if `worktree.indexRange` exists): format as `100–499`, `fontSize: 11, color: "#555577"`, separated by a space
- [ ] Body: render `bands.map(([band, init]) => <InitiativeCard key={band} band={band} initiative={init} futureSlices={futureSlices} />)` — identical to current `ProjectView` rendering

**Success criteria:**
- [ ] Component defined and syntactically valid
- [ ] No tests broken: `pytest tests/ -m "not e2e" -v` passes

---

### 4. [ ] Implement `WorktreeColumns` orchestrator component

Add the main orchestrator that fetches worktree data and conditionally renders pass-through or column layout.

- [ ] Add `WorktreeColumns` component definition immediately after `WorktreeColumn`
- [ ] Props: `{ projectKey, bands, futureSlices }`
- [ ] State: `const [worktrees, setWorktrees] = useState(null)` and `const [activeId, setActiveId] = useState(null)`
- [ ] `useEffect` on `projectKey`:
  - Create `AbortController`; store as `controller`
  - Set `setWorktrees(null)` to reset on project switch
  - Fetch `/api/worktrees?project=${encodeURIComponent(projectKey)}` with `signal: controller.signal`
  - On success with `body.status === 'ok'`: `setWorktrees(body.data.worktrees || [])` and `setActiveId(body.data.worktrees?.[0]?.id ?? null)`
  - On any error (including abort): `setWorktrees([])`
  - Return cleanup: `() => controller.abort()`
- [ ] Pass-through condition: if `worktrees === null || worktrees.length <= 1`, render `<>{bands.map(...)}</>` (no wrapper element)
- [ ] Column layout (2+ worktrees): render flex container with `WorktreeStrip` for each inactive worktree and `WorktreeColumn` for the active one (see slice design Layout Structure section)

**Success criteria:**
- [ ] Component defined and syntactically valid
- [ ] No tests broken: `pytest tests/ -m "not e2e" -v` passes

---

### 5. [ ] Wire `WorktreeColumns` into `ProjectView`

Replace the direct initiative band rendering in `ProjectView` with the new `WorktreeColumns` component.

- [ ] In `ProjectView`, find the `bands.map(([band, init]) => <InitiativeCard ... />)` block
- [ ] Replace it with `<WorktreeColumns projectKey={projectKey} bands={bands} futureSlices={data.futureSlices} />`
- [ ] Confirm `projectKey` is available (wired in task 1)
- [ ] Verify the `FeaturesCard`, `MaintenanceCollectorCard`, `FutureWorkCollectorCard`, and devlog renders remain outside `WorktreeColumns` (unchanged)

**Success criteria:**
- [ ] `context-visualizer` project (0 worktrees) renders identically to before — no column container, no header, just initiative cards as today
- [ ] Browser console shows no errors
- [ ] `pytest tests/ -m "not e2e" -v` passes

**Commit:** `feat: add WorktreeColumns pass-through component`

---

### 6. [ ] Complete `WorktreeStrip` visual design

Replace the placeholder content in `WorktreeStrip` with the full visual spec from the slice design.

- [ ] Tooltip: wrap the entire strip in the existing `Tooltip` component with `content` set to `"${worktree.name}  ·  ${worktree.worktreePath}"` (use `·` separator, matching existing tooltip style)
- [ ] Compute progress values from `bands`:
  - `done` = count of slices with `status === "complete"` across all initiatives
  - `total` = total slice count across all initiatives
- [ ] Compute `initCount` = `bands.length`
- [ ] Strip content (flex column, centered, `gap: THEME.sp.xs`, `padding: THEME.sp.sm 0`):
  - Progress fraction: `"${done}/${total}"` — `fontFamily: THEME.fonts.heading, fontSize: 10, color: "#555577"`, `writingMode: "vertical-rl", transform: "rotate(180deg)"`
  - Worktree name: truncate to 10 chars with `slice(0,10)` — same font/writing-mode/transform as progress
  - Initiative count: small badge — `fontFamily: THEME.fonts.heading, fontSize: 10, color: "#444466"`, `writingMode: "vertical-rl", transform: "rotate(180deg)"`
- [ ] Verify strip renders correctly when viewed in browser with context-forge project

**Success criteria:**
- [ ] Strip shows worktree name (rotated), progress fraction, initiative count
- [ ] Hovering the strip shows tooltip with name and path
- [ ] `pytest tests/ -m "not e2e" -v` passes

---

### 7. [ ] Write E2E test for column toggle behavior

Add Playwright E2E tests to `tests/test_ui_smoke.py` verifying the column layout with the live context-forge project.

- [ ] Add test class or test functions marked with `pytestmark = pytest.mark.e2e`
- [ ] Test: `test_worktree_column_layout_renders` — load the visualizer, select context-forge project, verify:
  - A collapsed strip element is visible (look for element with `width: 40px` or a known class/data attribute)
  - An expanded column header containing `◈` and `Default` is visible
- [ ] Test: `test_worktree_strip_toggle` — click the collapsed strip, verify:
  - The `maintenance` column becomes the expanded column (header shows "maintenance")
  - The `Default` strip appears as collapsed
- [ ] Test: `test_worktree_no_regression_single_project` — select context-visualizer project, verify:
  - No column container is rendered (the flex layout div with strip/column structure is absent)
  - Initiative cards render as normal
- [ ] Use the existing `live_server` fixture and Playwright page fixture patterns from `tests/test_ui_smoke.py`

**Success criteria:**
- [ ] All 3 E2E tests pass: `pytest tests/test_ui_smoke.py -k "worktree" -v`
- [ ] No regressions in existing E2E tests: `pytest tests/test_ui_smoke.py -v`

**Commit:** `feat: add worktree column layout with strip toggle`

---

### 8. [ ] Final verification and slice completion

Run full verification walkthrough from the slice design and mark slice complete.

- [ ] Start server: confirm running on port 5678 (`python serve.py` or confirm already running)
- [ ] Manual walkthrough per slice design Verification Walkthrough section:
  - [ ] context-visualizer: no column layout, no regression
  - [ ] context-forge: two regions visible (strip + expanded column)
  - [ ] Column toggle: click strip, verify swap
  - [ ] Refresh: default worktree expanded on reload
- [ ] Run full test suite: `pytest tests/ -v`
- [ ] Update `111-slice.worktree-column-layout.md` frontmatter `status` to `complete` and `dateUpdated`
- [ ] Check off slice 111 in `110-slices.worktree-view.md`
- [ ] Write DEVLOG entry (matching existing format, include commit hashes)
- [ ] Commit: `docs: mark 111-slice complete, update DEVLOG`

**Success criteria:**
- [ ] All tests pass (unit + E2E)
- [ ] Slice design and slice plan marked complete
- [ ] DEVLOG updated
