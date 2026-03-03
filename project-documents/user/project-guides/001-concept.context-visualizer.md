---
layer: project
phase: 1
phaseName: concept
type: concept
project: context-visualizer
status: draft
dateCreated: 20260224
dateUpdated: 20260303
---

## High-Level Project Concept

Context Visualizer is an interactive web-based tool that renders ai-project-guide project structure as a navigable, hierarchical visualization. It parses the standardized document naming conventions and frontmatter from project repositories and produces an explorable view of initiatives, slices, tasks, features, and operational documents — giving both humans and AI agents a quick visual understanding of project state, progress, and architecture.

The product has two core components:

- **Parser** — A dependency-free Python CLI tool that scans `project-documents/user/` directories, matches filenames against naming convention regex patterns, extracts frontmatter metadata and task checkbox state, and emits a self-contained JSON model. Designed to be usable as a CLI tool, an MCP tool response, or input to any frontend.
- **Visualizer** — A React-based interactive UI that consumes the parser's JSON output and renders the full project hierarchy with color-coded document types, status indicators, progress bars, expandable task lists, and collapsible groupings (e.g., future slices). The color system maps directly to document types from the ai-project-guide methodology.

Key characteristics:
* Interactive, web-based project structure visualization
* Parses and renders ai-project-guide compliant repositories
* Color-coded document types (architecture = blue, slice plan = purple, tasks = teal, features = gold, etc.)
* Status and progress indicators derived from frontmatter and task checkbox state
* Supports multiple projects via tab/project selector
* Parser produces a portable JSON model usable by any consumer

**Current state:** Runs as a local static site. The parser is zero-dependency Python 3.10+. The visualizer is a single React component loaded via CDN with no build step. All data is embedded or loaded from static JSON — no backend, no auth, no persistence.

**Full vision:** Evolve from a local development tool into a hosted, authenticated service where users can ingest projects from GitHub, browse interactive visualizations, view AI-generated document summaries, and eventually perform lightweight editing operations on project structure.

### Target Users

Primary users are developers and teams using the ai-project-guide methodology and/or Context Forge tooling to manage their projects. The visualization provides at-a-glance understanding of project state that is difficult to obtain from the raw file tree alone.

As the product matures:
- **Early stage**: Individual developers running the tool locally or on a hosted instance to visualize their own projects.
- **Growth stage**: Teams sharing project views via hosted URLs; AI agents consuming the parser output or visualization as context.
- **Service stage**: If demand warrants, a multi-tenant service offering with authentication, persistence, and collaborative features.

### Proposed Technical Stack

- **Parser**: Python 3.10+, zero external dependencies (intentional design constraint for portability)
- **Visualizer**: React (static SPA), Vite or similar lightweight build toolchain as complexity grows (no framework-locked solutions like Next.js — remain static as long as practical)
- **Hosting**: Cloud-hosted (provider TBD), targeting free/low-cost tier initially
- **Authentication**: Required for hosted version; provider TBD
- **Data Ingestion**: GitHub repository ingestion ("click to ingest" for ai-project-guide repos)
- **LLM Integration**: AI-generated expandable document summaries (model and runtime TBD)
- **Persistence**: Backend storage for ingested project data (approach TBD as architecture develops)

Parser technical notes: Handles split task files (merges -1.md, -2.md variants), infers status from checkbox state when frontmatter is ambiguous, detects initiative bands from architecture/slice docs, and distinguishes standalone features from future slices.

Visualizer technical notes: Supports viewport-aware tooltips, expandable task item lists with check/uncheck markers, and a consolidated future slices group with hash-pattern styling.

### Proposed Development Methodology

Development will follow the ai-project-guide slice-based methodology as defined in `guide.ai-project.000-process`. Work will be organized into vertical slices delivering end-to-end functionality, structured through architectural components: Concept -> Architectural Component -> Slice Plan -> Slices -> Tasks.

In general, favor simplicity and avoid over-engineering. Remember the cliche about premature optimization. Use industry standard solutions where practical and available. Avoid reinventing wheels.

The project will remain a static application as long as practical, adding backend components only when functionality demands it (e.g., auth, persistence, GitHub ingestion). The parser's zero-dependency constraint is intentional and should be preserved.

### Confirmed Future Capabilities

The following are confirmed directions with details to be determined during architectural and slice planning:

- **Hosted deployment** with authentication (cloud provider and auth provider TBD)
- **GitHub ingestion** — project picker with "click to ingest" for ai-project-guide compliant repos
- **AI-generated document summaries** — expandable summaries within the visualization (LLM choice and runtime TBD)
- **Editing operations** — moving future slices, collecting goals, adding new structural elements (scope and mechanism TBD)
- **Multi-tenant service potential** — if demand warrants, evolve into a service offering with proper auth and backend

### Summary

Context Visualizer turns the structured-but-opaque file trees of ai-project-guide projects into an interactive, visual, and eventually editable representation. It starts as a lightweight local tool with a portable parser and static React UI, and is intended to evolve into a hosted service with GitHub integration, AI-powered summaries, and editing capabilities. Architectural decisions around hosting, auth, LLM integration, and backend design will be made in subsequent phases as the project progresses through architectural components and slice planning.
