---
docType: architecture
layer: project
project: context-visualizer
archIndex: 100
component: file-updates-and-organization
dateCreated: 20260224
dateUpdated: 20260224
status: complete
relatedSlices: []
riskLevel: low
---

## Overview

The visualizer currently embeds parsed project JSON directly inside the visualization component (`project-structure-viz.jsx`), an approach that worked for proof of concept but does not scale. The ~8,200-line JSX file contains both application logic and all project data inline, making updates cumbersome and the file unnecessarily large. Re-parsing a project requires manually re-running the parser, copying JSON output, and pasting it into the component.

This architectural component addresses the separation of data from presentation — externalizing project data into standalone JSON files, introducing a structured storage location for them, and enabling the user to trigger re-parse and display refresh from within the UI.

**Scope:** Parser output organization, data loading indirection in the visualizer, and a UI-triggered refresh mechanism. Does not include backend services, authentication, or remote data sources.

**Motivation:** The current workflow of embedding parsed JSON directly in the JSX file creates friction for updates, bloats the component file, and prevents any form of dynamic data refresh. This restructuring is a prerequisite for future capabilities like GitHub ingestion and multi-project management.

## Design Goals

- **Data-Presentation Separation** — Project data must live outside the visualization component. The JSX file should reference external data, not contain it. Data may be loaded into memory at runtime, but the source of truth is the external JSON file.

- **Structured Data Storage** — Parsed project JSON files should be stored in a dedicated subdirectory rather than scattered in the project root. One file per project, deterministically named, replaced on re-parse (no versioning — git provides history).

- **User-Triggered Refresh** — Users should be able to re-parse and update the displayed project data without leaving the application. A refresh control positioned alongside the project selector tabs provides this capability.

- **Reduced Component Bloat** — Moving data out of the JSX component significantly reduces file size and makes the component focused on what it should be: rendering logic and UI behavior.

- **Naming Clarity** — Replace proof-of-concept naming artifacts (`SAMPLE DATA`, `SAMPLE_PROJECTS`) with production-appropriate names (`DATA`, `PROJECTS`) to reflect that the data is real, not sample.

## Architectural Principles

- **Indirection over Embedding** — The visualization component should load data by reference, not contain it. This enables the data source to change (from static file to API endpoint, for example) without modifying the component internals.

- **Convention-Based File Organization** — Parser output files follow a predictable naming pattern (`{projectname}-structure.json`) in a known location (`projects/` subdirectory), making them discoverable by both the visualizer and future tooling.

- **Replace, Don't Accumulate** — Re-parsing a project overwrites the existing JSON file. Version history is managed by git, not by the application.

- **Minimal UI Surface** — The refresh mechanism is a single icon button (circular arrow, the conventional refresh icon) positioned immediately to the right of the project tab selectors. No additional configuration UI is introduced.

## Current State

- `parse.py` parses project directories and outputs JSON to stdout or a specified file.
- Parsed JSON files (`context-forge-structure.json`, `orchestration-structure.json`) are stored at the project root alongside unrelated files.
- `project-structure-viz.jsx` (~8,200 lines) contains all project data as an inline `SAMPLE_PROJECTS` constant under a `// SAMPLE DATA` section header.
- `index.html` loads the JSX via CDN Babel transform, fetching and evaluating the single component file.
- There is no mechanism to refresh data without manually re-running the parser and editing the JSX file.
- The naming (`SAMPLE_PROJECTS`, `SAMPLE DATA`) reflects proof-of-concept origins and is misleading now that the data represents real projects.

## Envisioned State

- A `projects/` subdirectory contains one JSON file per parsed project, named `{projectname}-structure.json`.
- The visualization component loads project data from these external JSON files at startup rather than embedding it inline.
- The `SAMPLE DATA` / `SAMPLE_PROJECTS` naming is replaced with `DATA` / `PROJECTS` throughout the component.
- A refresh button (circular arrow icon) is positioned to the right of the project tab selectors in the UI header. Activating it triggers a re-parse of loaded projects and updates the display.
- The JSX component file is significantly smaller, containing only rendering logic and UI behavior.
- The parser's output destination defaults to or supports the `projects/` subdirectory with the standardized filename pattern.

## Technical Considerations

- **Data Loading Mechanism** — The current setup uses CDN Babel transform with no build step. External JSON loading must work within this constraint (e.g., `fetch()` at runtime). If/when a build toolchain (Vite) is introduced, the loading approach may evolve, but the external file convention remains.

- **Re-Parse Trigger from Browser** — The refresh button needs to invoke the Python parser from the browser context. In the current local-only, static-site setup, this likely requires a lightweight local process to handle the parse request (the browser cannot invoke Python directly). The mechanism for bridging this gap is a slice-level design decision.

- **Project Discovery** — The visualizer needs to know which projects are available in `projects/`. This could be a manifest file, directory listing, or convention-based enumeration. The approach should remain simple and static-compatible.

- **Transition Path** — Moving from embedded data to external files needs to be clean. During development, both approaches may coexist briefly, but the end state has no inline data in the JSX component.

## Anticipated Slices

- **Data Externalization** — Move project JSON out of the JSX component into `projects/` directory, update the component to load from external files, rename `SAMPLE_PROJECTS`/`SAMPLE DATA` to `PROJECTS`/`DATA`.

- **Refresh Mechanism** — Add the refresh button UI element and implement the re-parse trigger, including whatever local bridge is needed to invoke the parser from the browser context.

## Related Work

- [001-concept.context-visualizer.md](../project-guides/001-concept.context-visualizer.md) — Project concept document establishing the full vision and technical stack direction.
