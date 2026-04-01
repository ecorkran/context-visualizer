---
docType: review
layer: project
reviewType: tasks
slice: project-list-organization
project: squadron
verdict: CONCERNS
sourceDocument: project-documents/user/tasks/125-tasks.project-list-organization.md
aiModel: minimax/minimax-m2.7
status: complete
dateCreated: 20260331
dateUpdated: 20260331
---

# Review: tasks — slice 125

**Verdict:** CONCERNS
**Model:** minimax/minimax-m2.7

## Findings

### [CONCERN] Success criterion 6 not explicitly verified

**Description:** Success criterion 6 states "The active project indicator (gold left border) works correctly regardless of starred/hidden state." Neither Task 6 (E2E tests) nor Task 7 (verification walkthrough) explicitly verifies this behavior. While the implementation should naturally preserve this (starring/hiding only modifies metadata, not active project), the lack of explicit verification is a gap. Add a verification item to Task 7: "Verify active project gold border persists when starring/hiding other projects."

### [CONCERN] Success criterion 7 not explicitly tested in E2E

**Description:** Success criterion 7 states "Hidden projects remain selectable — clicking one still loads it in the main view." Task 5 includes this in its description but Task 6 (Playwright tests) only includes: "E2E test: click a hidden project and verify it loads in main view" - this is present. However, the verification in Task 7 does not mention this criterion. Should add explicit verification step to Task 7.

### [CONCERN] Backward compatibility for existing add/remove/refresh functionality not explicitly tested

**Description:** Success criterion 8 states "Panel behavior is unchanged for projects with no starred/hidden fields (backward compatible)." Task 2 includes a unit test for "existing manifest entries without starred/hidden fields are handled gracefully." However, there's no explicit test for add/remove/refresh functionality remaining unaffected. Task 7 mentions "Existing add/remove/refresh functionality unaffected" but doesn't link it to an explicit test. Consider adding an E2E test in Task 6 for add/remove operations on projects without starred/hidden fields.

### [PASS] Task decomposition is appropriately sized

**Description:** Tasks 1-7 are each completable by a junior AI with clear success criteria. No task is too large or too granular. Implementation (Tasks 1, 3, 4, 5) is separate from testing (Tasks 2, 6) as expected.

### [PASS] Test-with pattern properly follows implementation tasks

**Description:** Task 2 (PATCH tests) immediately follows Task 1 (PATCH implementation). Task 6 (E2E tests) follows all implementation tasks (1, 3, 4, 5). Task 7 is the final verification. Sequencing is correct.

### [PASS] Commit checkpoints are distributed throughout

**Description:** Seven commits are distributed across the seven tasks:
- `feat: add PATCH /api/projects/{key} endpoint for star/hide`
- `test: add PATCH endpoint tests for star/hide`
- `feat: sort project list by starred/normal/hidden groups`
- `feat: add star toggle to project panel rows`
- `feat: add hide/unhide controls and dimmed section to project panel`
- `test: add E2E tests for project list organization`
- `docs: mark slice 125 complete`

No commits are batched at the end.

### [PASS] All success criteria have corresponding tasks

**Description:** Cross-referencing the 8 success criteria against tasks shows complete coverage:
- Criteria 1, 2, 3, 4, 5: Fully covered by Tasks 1-6
- Criteria 6, 7, 8: Partially covered (see CONCERNs above for gaps)

### [PASS] No scope creep detected

**Description:** All tasks trace directly to requirements in the slice design. No task introduces functionality not specified in the parent slice design.

### [PASS] No circular dependencies

**Description:** Task dependencies flow correctly: Task 1 (server) → Task 2 (server tests) → Task 3 (sorting) → Task 4 (star UI) → Task 5 (hide UI) → Task 6 (E2E tests) → Task 7 (verification).
