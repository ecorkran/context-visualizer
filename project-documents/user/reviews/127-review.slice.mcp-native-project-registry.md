---
docType: review
layer: project
reviewType: slice
slice: mcp-native-project-registry
project: squadron
verdict: CONCERNS
sourceDocument: project-documents/user/slices/127-slice.mcp-native-project-registry.md
aiModel: minimax/minimax-m2.7
status: complete
dateCreated: 20260417
dateUpdated: 20260417
findings:
  - id: F001
    severity: concern
    category: architectural-boundaries
    summary: "Removes user-controlled catalog capabilities that are explicit architectural goals"
    location: Scope, "In scope" section; Technical Design table
  - id: F002
    severity: concern
    category: architectural-boundaries
    summary: "Violates \"Manifest as persistent catalog state\" architectural principle"
    location: Scope, "Files deleted" section
  - id: F003
    severity: concern
    category: scope-creep
    summary: "Replaces local fallback with MCP-only behavior, contrary to the architecture's graceful degradation model"
    location: Technical Design, POST /api/refresh section; Verification Walkthrough step 7
  - id: F004
    severity: concern
    category: error-handling
    summary: "Disconnect behavior inconsistent across endpoints"
    location: Verification Walkthrough, step 7
  - id: F005
    severity: note
    category: documentation
    summary: "Architecture's `relatedSlices` field is empty despite this slice being listed as anticipated work"
    location: 120-arch.project-management.md, "Anticipated Slices" section
  - id: F006
    severity: note
    category: design-consistency
    summary: "`GET /api/discover` uses `parse.py` while the slice eliminates all other `parse.py` invocations"
    location: Scope, "Out of scope" section
---

# Review: slice — slice 127

**Verdict:** CONCERNS
**Model:** minimax/minimax-m2.7

## Findings

### [CONCERN] Removes user-controlled catalog capabilities that are explicit architectural goals

The architecture document states as its first **Design Goal**:

> **User-controlled catalog** — Users can add a project by providing a local path and remove any tracked project, entirely from within the UI.

Slice 127 removes `POST /api/projects` (add) and `DELETE /api/projects/{key}` (remove), acknowledging in **UI considerations** that the panel's add/remove controls will break and receive `404`/`501`. It defers this to "a follow-up UI polish concern, not a blocker."

This is not a polish concern. The architecture explicitly defines user-controlled add/remove as a core capability. Removing the endpoints that power it, while calling the resulting broken UI a "deferred" concern, contradicts the architectural intent. The slice should either preserve these endpoints or the architecture must be updated to remove this goal.

---

### [CONCERN] Violates "Manifest as persistent catalog state" architectural principle

The architecture document states:

> **Manifest as persistent catalog state** — The manifest file remains the authoritative record of tracked projects. All catalog changes are reflected immediately in the manifest.

Slice 127 deletes `projects/manifest.json` entirely and replaces it with live MCP queries. The architecture's principle of a persistent, file-backed catalog that survives server restarts and MCP disconnections is abandoned. This is a fundamental architectural change, not a technical implementation detail within the existing design.

---

### [CONCERN] Replaces local fallback with MCP-only behavior, contrary to the architecture's graceful degradation model

The architecture states:

> Portfolio views are MCP-dependent — they rely on aggregate data the local-parse path does not produce — and **gracefully degrade** to a single "MCP unavailable" placeholder when the MCP client is disconnected.

Slice 127 removes the local fallback path entirely. When MCP is disconnected, `GET /api/projects` returns `503` (verification step 7 confirms this). The architecture envisions graceful degradation; this slice implements hard failure. The manifest was serving as that degraded state in the original design — now there is no fallback at all.

---

### [CONCERN] Disconnect behavior inconsistent across endpoints

The verification spec documents inconsistent MCP-disconnect behavior:

| Endpoint | Disconnected result |
|---|---|
| `GET /api/projects` | `503` |
| `POST /api/refresh` | `503` |
| `GET /api/dashboard` | `503` |
| `GET /api/info` | `200` with home-directory fallback |
| `GET /api/structures` | `503` (existing) |

`GET /api/info` gets special treatment (returns `200` with fallback) while other endpoints fail with `503`. This is not justified in the design — if the architecture expects MCP-dependent features to degrade gracefully, `GET /api/info` should be the model for others, not an outlier. The inconsistency creates an unclear contract for the frontend.

---

### [NOTE] Architecture's `relatedSlices` field is empty despite this slice being listed as anticipated work

The architecture anticipates four slices (Project Management API, Project Panel UI, Collectors, Cross-project dashboard). Slice 127 is not listed in those anticipated slices. The architecture's `relatedSlices` field in the frontmatter is `[]`, meaning no slices have been formally linked to this architecture yet.

This is likely a documentation synchronization issue rather than an architectural violation. The slice references `120` as its initiative, which correctly links it to this architecture. However, the architecture should be updated to reflect this slice as it progresses toward implementation.

---

### [NOTE] `GET /api/discover` uses `parse.py` while the slice eliminates all other `parse.py` invocations

The slice correctly keeps `GET /api/discover` unchanged (it finds projects not yet known to MCP). However, this creates a dual-mode inconsistency: the architecture envisions MCP as augmenting the local-parse path, but this slice turns MCP into the primary path while keeping one endpoint using the old subprocess approach. The data flow diagram shows MCP as the sole path for managed projects, but `parse.py` remains on disk and in use for discovery. This is defensible but worth noting as a potential future cleanup target.

---
