import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ============================================================================
// THEME — edit to customize
// ============================================================================
const THEME = {
  colors: {
    foundation: { bg: "#2D5A4B", text: "#E8F5F0", border: "#3D7A65", accent: "#5BBFA0" },
    architecture: { bg: "#1B4965", text: "#E0F0FF", border: "#2B6990", accent: "#5BA4D9" },
    slicePlan: { bg: "#6B4C8A", text: "#F0E6FF", border: "#8B6CAA", accent: "#B794D6" },
    slice: { bg: "#7C5C9C", text: "#F0E6FF", border: "#9B7CBC", accent: "#C9A8E8" },
    tasks: { bg: "#2A7B6F", text: "#E0FFF8", border: "#3A9B8F", accent: "#5CCFB9" },
    feature: { bg: "#8B6914", text: "#FFF8E0", border: "#AB8934", accent: "#D4B45A" },
    review: { bg: "#8B3A3A", text: "#FFE8E8", border: "#AB5A5A", accent: "#D48A8A" },
    analysis: { bg: "#5A5A8B", text: "#E8E8FF", border: "#7A7AAB", accent: "#A0A0D4" },
    maintenance: { bg: "#5A7040", text: "#F0FFE8", border: "#7A9060", accent: "#A0C880" },
    devlog: { bg: "#CC7A00", text: "#FFF5E0", border: "#E69A20", accent: "#FFB84D" },
    projectLevel: { bg: "#1E3A5F", text: "#D0E8FF", border: "#2E5A8F", accent: "#6BAADF" },
  },
  fonts: {
    heading: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
    body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  radius: 12,
  sp: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  status: {
    complete: "#4CAF50",
    "in-progress": "#FF9800",
    "not-started": "#78909C",
    deprecated: "#9E9E9E",
  },
};

// ============================================================================
// SVG PATTERN DEFS
// ============================================================================
const PatternDefs = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      <pattern id="fh" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      </pattern>
      <pattern id="fhd" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      </pattern>
    </defs>
  </svg>
);

// ============================================================================
// TOOLTIP — viewport-aware positioning, won't clip edges
// ============================================================================
const Tooltip = ({ children, content }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, flipped: false });

  const onEnter = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const ty = r.top - 10;
    // Flip below if too close to top
    const flipped = ty < 50;
    setPos({ x: Math.max(120, Math.min(cx, window.innerWidth - 120)), y: flipped ? r.bottom + 10 : ty, flipped });
    setShow(true);
  }, []);

  if (!content) return children;
  return (
    <span onMouseEnter={onEnter} onMouseLeave={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      {children}
      {show && (
        <div style={{
          position: "fixed", left: pos.x, top: pos.y,
          transform: pos.flipped ? "translate(-50%, 0)" : "translate(-50%, -100%)",
          backgroundColor: "#1A1A2E", border: "1px solid #3A3A5E", borderRadius: 8,
          padding: "6px 12px", zIndex: 1000, pointerEvents: "none", whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#CCCCDD" }}>{content}</div>
          {/* Arrow - top or bottom depending on flip */}
          <div style={{
            position: "absolute",
            [pos.flipped ? "top" : "bottom"]: -4,
            left: "50%",
            transform: `translateX(-50%) rotate(${pos.flipped ? "225" : "45"}deg)`,
            width: 8, height: 8, backgroundColor: "#1A1A2E",
            border: "1px solid #3A3A5E",
            borderTop: pos.flipped ? "1px solid #3A3A5E" : "none",
            borderLeft: pos.flipped ? "1px solid #3A3A5E" : "none",
            borderBottom: pos.flipped ? "none" : "1px solid #3A3A5E",
            borderRight: pos.flipped ? "none" : "1px solid #3A3A5E",
          }} />
        </div>
      )}
    </span>
  );
};

// ============================================================================
// SAMPLE DATA
// ============================================================================
const SAMPLE_PROJECTS = {
  "context-forge": {
    "name": "Context Forge",
    "description": "",
    "foundation": [
      {
        "index": "000",
        "name": "context-builder",
        "status": "not-started",
        "dateCreated": "20250910",
        "dateUpdated": "20250910",
        "type": "concept"
      },
      {
        "index": "001",
        "name": "context-builder",
        "status": "not-started",
        "dateCreated": "20250910",
        "dateUpdated": "20250910",
        "type": "concept"
      },
      {
        "index": "002",
        "name": "context-builder",
        "status": "not-started",
        "dateCreated": "20250910",
        "dateUpdated": "20250910",
        "type": "spec"
      },
      {
        "index": "003",
        "name": "context-builder",
        "status": "not-started",
        "dateCreated": "20250910",
        "dateUpdated": "20250910",
        "type": "hld"
      },
      {
        "index": "003",
        "name": "context-builder",
        "status": "not-started",
        "dateCreated": "20250910",
        "dateUpdated": "20250910",
        "type": "slices"
      }
    ],
    "projectArchitecture": [
      {
        "index": "050",
        "name": "prompt-system-decoupling",
        "status": "not-started",
        "dateCreated": "20260207",
        "dateUpdated": "20260214",
        "type": "arch"
      }
    ],
    "initiatives": {
      "140": {
        "name": "Context Forge Restructure",
        "slices": [
          {
            "index": "140",
            "name": "monorepo-scaffolding",
            "status": "complete",
            "dateCreated": "20260215",
            "dateUpdated": "20260217",
            "tasks": {
              "index": "140",
              "name": "tasks.monorepo-scaffolding",
              "status": "in-progress",
              "taskCount": 175,
              "completedTasks": 174,
              "dateCreated": "20260215",
              "dateUpdated": "20260217",
              "items": [
                {
                  "name": "Create directory `packages/core/src/`",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/index.ts` with an empty barrel export:",
                  "done": true
                },
                {
                  "name": "Create `packages/core/package.json` per the slice design (name: `@context-forge/core`, type: module, private: true, v...",
                  "done": true
                },
                {
                  "name": "Include scripts: `build`, `dev`, `test`, `typecheck`",
                  "done": true
                },
                {
                  "name": "Include devDependencies: `typescript ~5.8.3`, `vitest ^3.2.1`",
                  "done": true
                },
                {
                  "name": "Create `packages/core/tsconfig.json` per the slice design (target: ES2023, module: nodenext, moduleResolution: nodenext)",
                  "done": true
                },
                {
                  "name": "Include: declaration, declarationMap, sourceMap, strict, outDir: ./dist, rootDir: ./src",
                  "done": true
                },
                {
                  "name": "`packages/core/` directory exists with package.json, tsconfig.json, and src/index.ts",
                  "done": true
                },
                {
                  "name": "Configuration matches the slice design specifications exactly",
                  "done": true
                },
                {
                  "name": "Create directory `packages/mcp-server/src/`",
                  "done": true
                },
                {
                  "name": "Create `packages/mcp-server/src/index.ts` with an empty barrel export:",
                  "done": true
                },
                {
                  "name": "Create `packages/mcp-server/package.json` per the slice design (name: `context-forge-mcp`, type: module, private: tru...",
                  "done": true
                },
                {
                  "name": "Include `bin` entry: `\"context-forge-mcp\": \"./dist/index.js\"`",
                  "done": true
                },
                {
                  "name": "Include `start` script: `node dist/index.js`",
                  "done": true
                },
                {
                  "name": "Include dependency: `\"@context-forge/core\": \"workspace:*\"`",
                  "done": true
                },
                {
                  "name": "Include devDependencies: `typescript ~5.8.3`, `vitest ^3.2.1`",
                  "done": true
                },
                {
                  "name": "Do NOT include MCP SDK dependencies yet (added in a later slice)",
                  "done": true
                },
                {
                  "name": "Create `packages/mcp-server/tsconfig.json` per the slice design (same as core: ES2023, nodenext)",
                  "done": true
                },
                {
                  "name": "`packages/mcp-server/` directory exists with package.json, tsconfig.json, and src/index.ts",
                  "done": true
                },
                {
                  "name": "`@context-forge/core` listed as workspace dependency",
                  "done": true
                },
                {
                  "name": "Configuration matches the slice design specifications exactly",
                  "done": true
                },
                {
                  "name": "Create `packages/electron/` directory",
                  "done": true
                },
                {
                  "name": "Move source code: `git mv src/ packages/electron/src/`",
                  "done": true
                },
                {
                  "name": "Move build config: `git mv electron.vite.config.ts packages/electron/`",
                  "done": true
                },
                {
                  "name": "Move HTML entry: `git mv index.html packages/electron/`",
                  "done": true
                },
                {
                  "name": "Move test config: `git mv vitest.config.ts packages/electron/`",
                  "done": true
                },
                {
                  "name": "Evaluate and move `public/`:",
                  "done": true
                },
                {
                  "name": "Check if `public/` is referenced by electron-vite renderer build",
                  "done": true
                },
                {
                  "name": "If yes, `git mv public/ packages/electron/public/`",
                  "done": true
                },
                {
                  "name": "If no, leave at root",
                  "done": true
                },
                {
                  "name": "Evaluate and move `tests/`:",
                  "done": true
                },
                {
                  "name": "Check what tests exist in root `tests/` directory",
                  "done": true
                },
                {
                  "name": "Move them with the Electron app: `git mv tests/ packages/electron/tests/`",
                  "done": true
                },
                {
                  "name": "Evaluate `default-statements.md`:",
                  "done": true
                },
                {
                  "name": "Check if referenced from `src/` code",
                  "done": true
                },
                {
                  "name": "If yes, `git mv default-statements.md packages/electron/`",
                  "done": true
                },
                {
                  "name": "Verify no stale source files remain at root that should have moved",
                  "done": true
                },
                {
                  "name": "`packages/electron/src/` contains all previous `src/` contents",
                  "done": true
                },
                {
                  "name": "`electron.vite.config.ts`, `index.html`, `vitest.config.ts` are in `packages/electron/`",
                  "done": true
                },
                {
                  "name": "All moved files show as renames in `git status` (not delete + add)",
                  "done": true
                },
                {
                  "name": "No orphaned source or config files remain at root",
                  "done": true
                },
                {
                  "name": "Read the current root `package.json` to capture all fields",
                  "done": true
                },
                {
                  "name": "Create `packages/electron/package.json` with:",
                  "done": true
                },
                {
                  "name": "`\"name\": \"@context-forge/electron\"`",
                  "done": true
                },
                {
                  "name": "All existing `dependencies` moved from root",
                  "done": true
                },
                {
                  "name": "All existing `devDependencies` moved from root",
                  "done": true
                },
                {
                  "name": "Add `\"@context-forge/core\": \"workspace:*\"` to dependencies",
                  "done": true
                },
                {
                  "name": "All existing build/dev/test scripts preserved",
                  "done": true
                },
                {
                  "name": "`main` entry updated for the package-relative path (`./out/main/main.js`)",
                  "done": true
                },
                {
                  "name": "Any electron-builder or packaging config preserved",
                  "done": true
                },
                {
                  "name": "Retain `packageManager` field if appropriate, or let root handle it",
                  "done": true
                },
                {
                  "name": "Include the ai-support scripts from `snippets/npm-scripts.ai-support.json.md` (setup-guides, update-guides, etc.) in ...",
                  "done": true
                },
                {
                  "name": "Verify the scripts reference correct relative paths from `packages/electron/`",
                  "done": true
                },
                {
                  "name": "`packages/electron/package.json` contains all dependencies from the original root",
                  "done": true
                },
                {
                  "name": "`@context-forge/core` is declared as a workspace dependency",
                  "done": true
                },
                {
                  "name": "Build scripts (`dev`, `build`, `test`, `lint`) are present and point to correct locations",
                  "done": true
                },
                {
                  "name": "Read the current root `tsconfig.json` to capture all compiler options",
                  "done": true
                },
                {
                  "name": "Create `packages/electron/tsconfig.json` preserving existing settings",
                  "done": true
                },
                {
                  "name": "Update path aliases to be package-relative:",
                  "done": true
                },
                {
                  "name": "`\"@/*\"` → `[\"./src/*\"]`",
                  "done": true
                },
                {
                  "name": "`\"@main/*\"` → `[\"./src/main/*\"]`",
                  "done": true
                },
                {
                  "name": "`\"@renderer/*\"` → `[\"./src/renderer/*\"]`",
                  "done": true
                },
                {
                  "name": "`\"@preload/*\"` → `[\"./src/preload/*\"]`",
                  "done": true
                },
                {
                  "name": "Do NOT change target/module/lib settings — keep existing values (electron-vite manages these)",
                  "done": true
                },
                {
                  "name": "`packages/electron/tsconfig.json` exists with correct path aliases",
                  "done": true
                },
                {
                  "name": "Compiler options match the original root tsconfig (except paths)",
                  "done": true
                },
                {
                  "name": "No references to monorepo root paths remain",
                  "done": true
                },
                {
                  "name": "Update `pnpm-workspace.yaml`:",
                  "done": true
                },
                {
                  "name": "Add `packages: ['packages/*']`",
                  "done": true
                },
                {
                  "name": "Preserve existing `onlyBuiltDependencies` list",
                  "done": true
                },
                {
                  "name": "Update root `package.json`:",
                  "done": true
                },
                {
                  "name": "Set `\"private\": true`",
                  "done": true
                },
                {
                  "name": "Retain `\"packageManager\": \"pnpm@10.14.0\"`",
                  "done": true
                },
                {
                  "name": "Remove all `dependencies` and `devDependencies` (moved to electron)",
                  "done": true
                },
                {
                  "name": "Replace scripts with workspace delegation:",
                  "done": true
                },
                {
                  "name": "`\"dev\": \"pnpm --filter @context-forge/electron dev\"`",
                  "done": true
                },
                {
                  "name": "`\"build\": \"pnpm --filter @context-forge/electron build\"`",
                  "done": true
                },
                {
                  "name": "`\"test\": \"pnpm -r test\"`",
                  "done": true
                },
                {
                  "name": "`\"lint\": \"pnpm -r lint\"`",
                  "done": true
                },
                {
                  "name": "`\"typecheck\": \"pnpm -r typecheck\"`",
                  "done": true
                },
                {
                  "name": "Preserve ai-support scripts (`setup-guides`, `update-guides`, etc.) in root",
                  "done": true
                },
                {
                  "name": "Remove `main` entry (no longer applicable to root)",
                  "done": true
                },
                {
                  "name": "Remove or repurpose root `tsconfig.json`:",
                  "done": true
                },
                {
                  "name": "If electron-vite or other tools reference it, convert to a project-references config pointing to `packages/*/tsconfig...",
                  "done": true
                },
                {
                  "name": "If nothing references it, remove it",
                  "done": true
                },
                {
                  "name": "Update `.gitignore`:",
                  "done": true
                },
                {
                  "name": "Add `packages/*/dist/` for core and mcp-server build output",
                  "done": true
                },
                {
                  "name": "Verify `packages/electron/out/` is covered (was previously `out/`)",
                  "done": true
                },
                {
                  "name": "Root package.json has no direct dependencies",
                  "done": true
                },
                {
                  "name": "Root package.json scripts delegate to workspace packages",
                  "done": true
                },
                {
                  "name": "`pnpm-workspace.yaml` declares `packages/*`",
                  "done": true
                },
                {
                  "name": "`.gitignore` covers all package build output directories",
                  "done": true
                },
                {
                  "name": "Review `packages/electron/electron.vite.config.ts`:",
                  "done": true
                },
                {
                  "name": "Verify entry points resolve correctly (main, preload, renderer)",
                  "done": true
                },
                {
                  "name": "Verify output directories resolve correctly (`out/` relative to package)",
                  "done": true
                },
                {
                  "name": "Verify alias resolution (e.g., `@/` prefix) points to `packages/electron/src/`",
                  "done": true
                },
                {
                  "name": "Verify `externalizeDepsPlugin()` and any custom plugins still work",
                  "done": true
                },
                {
                  "name": "Fix any broken path references",
                  "done": true
                },
                {
                  "name": "Review `packages/electron/vitest.config.ts`:",
                  "done": true
                },
                {
                  "name": "Verify test glob patterns resolve correctly from new location",
                  "done": true
                },
                {
                  "name": "Verify setup file path (`src/test/setup.ts`) resolves correctly",
                  "done": true
                },
                {
                  "name": "Fix any broken path references",
                  "done": true
                },
                {
                  "name": "Check `scripts/` directory at root:",
                  "done": true
                },
                {
                  "name": "Identify any scripts that reference `src/` directly",
                  "done": true
                },
                {
                  "name": "Update paths or document needed changes",
                  "done": true
                },
                {
                  "name": "`electron.vite.config.ts` has no broken path references",
                  "done": true
                },
                {
                  "name": "`vitest.config.ts` has no broken path references",
                  "done": true
                },
                {
                  "name": "All paths resolve relative to `packages/electron/`",
                  "done": true
                },
                {
                  "name": "Run `pnpm install` from repo root",
                  "done": true
                },
                {
                  "name": "Verify workspace packages are linked (check `node_modules/@context-forge/`)",
                  "done": true
                },
                {
                  "name": "Resolve any dependency resolution errors",
                  "done": true
                },
                {
                  "name": "Build `@context-forge/core`:",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/core build`",
                  "done": true
                },
                {
                  "name": "Verify `packages/core/dist/index.js` and `packages/core/dist/index.d.ts` are produced",
                  "done": true
                },
                {
                  "name": "Build `context-forge-mcp`:",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp build`",
                  "done": true
                },
                {
                  "name": "Verify `packages/mcp-server/dist/index.js` is produced",
                  "done": true
                },
                {
                  "name": "Build `@context-forge/electron`:",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/electron build`",
                  "done": true
                },
                {
                  "name": "Verify `packages/electron/out/` contains main, preload, and renderer output",
                  "done": true
                },
                {
                  "name": "Fix any build errors (most likely path resolution issues)",
                  "done": true
                },
                {
                  "name": "Run full workspace build:",
                  "done": true
                },
                {
                  "name": "Run `pnpm -r build`",
                  "done": true
                },
                {
                  "name": "Verify topological build order: core → mcp-server → electron",
                  "done": true
                },
                {
                  "name": "All three packages build without errors",
                  "done": true
                },
                {
                  "name": "`pnpm -r build` completes successfully with correct ordering",
                  "done": true
                },
                {
                  "name": "Workspace symlinks are correctly established",
                  "done": true
                },
                {
                  "name": "Run tests:",
                  "done": true
                },
                {
                  "name": "Execute `pnpm --filter @context-forge/electron test`",
                  "done": true
                },
                {
                  "name": "All existing tests must pass — 157 of 163 tests pass. 6 failures are pre-existing (not caused by restructure). Docume...",
                  "done": true
                },
                {
                  "name": "Fix any test failures caused by path changes",
                  "done": true
                },
                {
                  "name": "Run typecheck:",
                  "done": true
                },
                {
                  "name": "Execute `pnpm -r typecheck`",
                  "done": true
                },
                {
                  "name": "No type errors in any package — Core and mcp-server pass. Electron typecheck failures are pre-existing (Issue #27 com...",
                  "done": true
                },
                {
                  "name": "Verify Electron app launches:",
                  "done": true
                },
                {
                  "name": "Run `pnpm dev` (or `pnpm --filter @context-forge/electron dev`)",
                  "done": true
                },
                {
                  "name": "App window opens without errors",
                  "done": true
                },
                {
                  "name": "Dev console shows no new errors or warnings",
                  "done": true
                },
                {
                  "name": "Verify core app functionality:",
                  "done": false
                },
                {
                  "name": "Can load existing projects",
                  "done": true
                },
                {
                  "name": "Can edit project configuration",
                  "done": true
                },
                {
                  "name": "Can generate context output",
                  "done": true
                },
                {
                  "name": "Can copy generated context to clipboard",
                  "done": true
                },
                {
                  "name": "IPC communication between main and renderer works",
                  "done": true
                },
                {
                  "name": "All existing tests pass — 157 of 163 pass; 6 pre-existing failures are unrelated to restructure",
                  "done": true
                },
                {
                  "name": "Typecheck passes across all packages — Core and mcp-server pass; electron typecheck has pre-existing errors (Issue #27)",
                  "done": true
                },
                {
                  "name": "Electron app launches and all core features work",
                  "done": true
                },
                {
                  "name": "No new warnings or errors in dev console",
                  "done": true
                },
                {
                  "name": "Verify `@context-forge/core` is resolvable from `packages/electron/`:",
                  "done": true
                },
                {
                  "name": "Add a temporary test import in a test file or scratch file",
                  "done": true
                },
                {
                  "name": "Confirm TypeScript resolves the import without errors",
                  "done": true
                },
                {
                  "name": "Remove the temporary import",
                  "done": true
                },
                {
                  "name": "Verify `@context-forge/core` is resolvable from `packages/mcp-server/`:",
                  "done": true
                },
                {
                  "name": "Add a temporary test import in `packages/mcp-server/src/index.ts`",
                  "done": true
                },
                {
                  "name": "Confirm TypeScript resolves the import without errors",
                  "done": true
                },
                {
                  "name": "Remove the temporary import (restore empty export)",
                  "done": true
                },
                {
                  "name": "Verify `pnpm -r build` still succeeds after resolution check",
                  "done": true
                },
                {
                  "name": "Both `electron` and `mcp-server` can resolve `@context-forge/core` imports",
                  "done": true
                },
                {
                  "name": "TypeScript path aliases in `packages/electron/` work correctly (`@/`, `@main/`, etc.)",
                  "done": true
                },
                {
                  "name": "Clean build after verification",
                  "done": true
                },
                {
                  "name": "Run final checks:",
                  "done": true
                },
                {
                  "name": "`pnpm -r build` — passes",
                  "done": true
                },
                {
                  "name": "`pnpm -r typecheck` — passes",
                  "done": true
                },
                {
                  "name": "`pnpm --filter @context-forge/electron test` — passes",
                  "done": true
                },
                {
                  "name": "`git status` — no untracked files that should be tracked",
                  "done": true
                },
                {
                  "name": "Verify no stale configuration remains:",
                  "done": true
                },
                {
                  "name": "Root has no `dependencies` or `devDependencies` in package.json",
                  "done": true
                },
                {
                  "name": "No orphaned `src/` directory at root",
                  "done": true
                },
                {
                  "name": "No orphaned `tsconfig.json` at root (unless repurposed as project-references)",
                  "done": true
                },
                {
                  "name": "`.gitignore` covers `packages/*/dist/` and `packages/electron/out/`",
                  "done": true
                },
                {
                  "name": "Commit all changes with a descriptive message",
                  "done": true
                },
                {
                  "name": "Log any discovered issues to `project-documents/user/maintenance/maintenance-tasks.md`",
                  "done": true
                },
                {
                  "name": "All builds, tests, and typechecks pass (with noted pre-existing exceptions)",
                  "done": true
                },
                {
                  "name": "Working tree is clean after commit",
                  "done": true
                },
                {
                  "name": "Monorepo structure matches the slice design's target repository layout",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "141",
            "name": "core-types-extraction",
            "status": "complete",
            "dateCreated": "20260217",
            "dateUpdated": "20260217",
            "tasks": {
              "index": "141",
              "name": "tasks.core-types-extraction",
              "status": "complete",
              "taskCount": 45,
              "completedTasks": 45,
              "dateCreated": "20260217",
              "dateUpdated": "20260217",
              "items": [
                {
                  "name": "**1.1: Create `packages/core/src/types/context.ts`**",
                  "done": true
                },
                {
                  "name": "**1.2: Create `packages/core/src/types/sections.ts`**",
                  "done": true
                },
                {
                  "name": "**1.3: Create `packages/core/src/types/statements.ts`**",
                  "done": true
                },
                {
                  "name": "**1.4: Create `packages/core/src/types/prompts.ts`**",
                  "done": true
                },
                {
                  "name": "**1.5: Create `packages/core/src/types/project.ts`**",
                  "done": true
                },
                {
                  "name": "**1.6: Create `packages/core/src/types/paths.ts`**",
                  "done": true
                },
                {
                  "name": "**2.1: Create `packages/core/src/types/index.ts`**",
                  "done": true
                },
                {
                  "name": "**2.2: Update `packages/core/src/index.ts`**",
                  "done": true
                },
                {
                  "name": "**3.1: Run `pnpm --filter @context-forge/core build`**",
                  "done": true
                },
                {
                  "name": "**3.2: Spot-check the generated `.d.ts` files**",
                  "done": true
                },
                {
                  "name": "**4.1**: `src/services/project/ProjectValidator.ts` — `ProjectData`, `CreateProjectData`",
                  "done": true
                },
                {
                  "name": "**4.2**: `src/services/project/ProjectManager.ts` — `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.3**: `src/services/project/__tests__/ProjectManager.test.ts` — `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.4**: `src/services/context/ContextIntegrator.ts` — `ProjectData` (also imports context types — handle in Task 5)",
                  "done": true
                },
                {
                  "name": "**4.5**: `src/services/context/ContextGenerator.ts` — `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.6**: `src/services/context/__tests__/ContextIntegrator.test.ts` — `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.7**: `src/services/context/__tests__/ContextGenerator.test.ts` — `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.8**: `src/hooks/useContextGeneration.ts` — `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.9**: `src/components/settings/SettingsButton.tsx` — `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.10**: `src/components/settings/SettingsDialog.tsx` — `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.11**: `src/components/project/ProjectSelector.tsx` — `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.12**: `src/components/ContextBuilderApp.tsx` — `CreateProjectData`, `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.13**: `src/components/forms/ProjectConfigForm.tsx` — `CreateProjectData`, `ProjectData`",
                  "done": true
                },
                {
                  "name": "**4.14**: `src/components/forms/__tests__/ProjectConfigForm.integration.test.ts` — `ProjectData`, `CreateProjectData`...",
                  "done": true
                },
                {
                  "name": "**5.1**: `src/services/context/ContextIntegrator.ts` — `ContextData`, `EnhancedContextData` (merge with ProjectData i...",
                  "done": true
                },
                {
                  "name": "**5.2**: `src/services/context/ContextTemplateEngine.ts` — `EnhancedContextData`, `ContextSection`, `ContextTemplate`",
                  "done": true
                },
                {
                  "name": "**5.3**: `src/services/context/TemplateProcessor.ts` — `ContextData`",
                  "done": true
                },
                {
                  "name": "**5.4**: `src/services/context/SectionBuilder.ts` — `ContextSection`, `EnhancedContextData`, `SectionBuilderConfig`",
                  "done": true
                },
                {
                  "name": "**5.5**: `src/services/context/StatementManagerIPC.ts` — `TemplateStatement`",
                  "done": true
                },
                {
                  "name": "**5.6**: `src/services/context/__tests__/TemplateProcessor.test.ts` — `ContextData`",
                  "done": true
                },
                {
                  "name": "**6.1**: `src/main/services/context/SystemPromptParser.ts` — `SystemPrompt`, `ParsedPromptFile`, `PromptCacheEntry`, ...",
                  "done": true
                },
                {
                  "name": "**6.2**: `src/main/services/context/StatementManager.ts` — `TemplateStatement`, `ParsedStatement`",
                  "done": true
                },
                {
                  "name": "**6.3**: `src/main/ipc/contextServices.ts` — `TemplateStatement`",
                  "done": true
                },
                {
                  "name": "**6.4**: `src/components/settings/ProjectPathSection.tsx` — `PathValidationResult`",
                  "done": true
                },
                {
                  "name": "**7.1: Update `src/services/context/index.ts`**",
                  "done": true
                },
                {
                  "name": "**7.2: Update `src/main/services/context/index.ts`**",
                  "done": true
                },
                {
                  "name": "**8.1: Delete renderer context type files**",
                  "done": true
                },
                {
                  "name": "**8.2: Delete main-process context type files**",
                  "done": true
                },
                {
                  "name": "**8.3: Delete project/storage type files**",
                  "done": true
                },
                {
                  "name": "**9.1: Run `pnpm --filter @context-forge/core build`**",
                  "done": true
                },
                {
                  "name": "**9.2: Run `pnpm --filter @context-forge/electron build`**",
                  "done": true
                },
                {
                  "name": "**9.3: Run `pnpm --filter @context-forge/electron test:run`**",
                  "done": true
                },
                {
                  "name": "**9.4: Run `pnpm -r build`**",
                  "done": true
                },
                {
                  "name": "**9.5: Verify no stale imports remain**",
                  "done": true
                },
                {
                  "name": "**10.1: Stage and commit all changes**",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "142",
            "name": "core-services-extraction",
            "status": "complete",
            "dateCreated": "20260218",
            "dateUpdated": "20260218",
            "tasks": {
              "index": "142",
              "name": "tasks.core-services-extraction",
              "status": "complete",
              "taskCount": 34,
              "completedTasks": 34,
              "dateCreated": "20260218",
              "dateUpdated": "20260218",
              "items": [
                {
                  "name": "**1.1: Create `packages/core/src/services/constants.ts`**",
                  "done": true
                },
                {
                  "name": "**1.2: Create `packages/core/src/services/interfaces.ts`**",
                  "done": true
                },
                {
                  "name": "**1.3: Commit — supporting files**",
                  "done": true
                },
                {
                  "name": "**2.1: Copy and update `TemplateProcessor.ts`**",
                  "done": true
                },
                {
                  "name": "**3.1: Copy and update `SystemPromptParser.ts`**",
                  "done": true
                },
                {
                  "name": "**4.1: Copy and update `StatementManager.ts`**",
                  "done": true
                },
                {
                  "name": "**5.1: Copy and update `ProjectPathService.ts`**",
                  "done": true
                },
                {
                  "name": "**6.1: Copy and update `SectionBuilder.ts`**",
                  "done": true
                },
                {
                  "name": "**7.1: Create `packages/core/src/services/index.ts`**",
                  "done": true
                },
                {
                  "name": "**7.2: Update `packages/core/src/index.ts`**",
                  "done": true
                },
                {
                  "name": "**7.3: Commit — services extracted, core self-contained**",
                  "done": true
                },
                {
                  "name": "**8.1: Run `pnpm --filter @context-forge/core build`**",
                  "done": true
                },
                {
                  "name": "**8.2: Spot-check dist output**",
                  "done": true
                },
                {
                  "name": "**8.3: Commit — core build verified**",
                  "done": true
                },
                {
                  "name": "**9.1: Update `src/services/context/ContextIntegrator.ts`**",
                  "done": true
                },
                {
                  "name": "**9.2: Update `src/services/context/ContextTemplateEngine.ts`**",
                  "done": true
                },
                {
                  "name": "**9.3: Update `src/services/context/__tests__/TemplateProcessor.test.ts`**",
                  "done": true
                },
                {
                  "name": "**9.4: Update `src/main/ipc/contextServices.ts`**",
                  "done": true
                },
                {
                  "name": "**9.5: Update `src/main/ipc/projectPathHandlers.ts`**",
                  "done": true
                },
                {
                  "name": "**9.6: Update `src/main/services/project/__tests__/ProjectPathService.test.ts`**",
                  "done": true
                },
                {
                  "name": "**9.7: Update `src/services/context/index.ts`**",
                  "done": true
                },
                {
                  "name": "**9.8: Update `src/main/services/context/index.ts`**",
                  "done": true
                },
                {
                  "name": "**9.9: Commit — consumers updated**",
                  "done": true
                },
                {
                  "name": "**10.1: Run `pnpm -r build`**",
                  "done": true
                },
                {
                  "name": "**10.2: Verify no stale imports remain**",
                  "done": true
                },
                {
                  "name": "**11.1: Delete renderer service files**",
                  "done": true
                },
                {
                  "name": "**11.2: Delete main-process service files**",
                  "done": true
                },
                {
                  "name": "**11.3: Check for empty directories**",
                  "done": true
                },
                {
                  "name": "**12.1: Run `pnpm --filter @context-forge/core build`**",
                  "done": true
                },
                {
                  "name": "**12.2: Run `pnpm --filter @context-forge/electron build`**",
                  "done": true
                },
                {
                  "name": "**12.3: Run `pnpm --filter @context-forge/electron test:run`**",
                  "done": true
                },
                {
                  "name": "**12.4: Run `pnpm -r build`**",
                  "done": true
                },
                {
                  "name": "**12.5: Commit — deletion and verification complete**",
                  "done": true
                },
                {
                  "name": "**13.1: Interactive rebase to squash slice 142 commits**",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "143",
            "name": "core-orchestration-extraction",
            "status": "complete",
            "dateCreated": "20260218",
            "dateUpdated": "20260218",
            "tasks": {
              "index": "143",
              "name": "tasks.core-orchestration-extraction",
              "status": "complete",
              "taskCount": 68,
              "completedTasks": 68,
              "dateCreated": "20260218",
              "dateUpdated": "20260218",
              "items": [
                {
                  "name": "Add `getContextInitializationPrompt(isMonorepo?: boolean): Promise<SystemPrompt | null>` to `IPromptReader`",
                  "done": true
                },
                {
                  "name": "Create `IStatementService extends IStatementReader` with `loadStatements(): Promise<void>` and `setFilePath(path: str...",
                  "done": true
                },
                {
                  "name": "Create `IPromptService extends IPromptReader` with `setFilePath(path: string): void`",
                  "done": true
                },
                {
                  "name": "**Success**: `pnpm --filter @context-forge/core build` succeeds; `IStatementReader` unchanged; new interfaces exporte...",
                  "done": true
                },
                {
                  "name": "Add `setFilePath(path: string): void` method to `packages/core/src/services/SystemPromptParser.ts`",
                  "done": true
                },
                {
                  "name": "**Success**: Method exists; `SystemPromptParser` structurally satisfies `IPromptService`; core builds clean",
                  "done": true
                },
                {
                  "name": "Add `setFilePath(path: string): void` method to `packages/core/src/services/StatementManager.ts`",
                  "done": true
                },
                {
                  "name": "**Success**: Method exists; `StatementManager` structurally satisfies `IStatementService`; core builds clean",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/core build` — verify success",
                  "done": true
                },
                {
                  "name": "Verify `dist/` contains updated `.d.ts` for interfaces, SystemPromptParser, StatementManager",
                  "done": true
                },
                {
                  "name": "Git commit: interfaces + setFilePath changes",
                  "done": true
                },
                {
                  "name": "**Success**: Core builds clean; commit created",
                  "done": true
                },
                {
                  "name": "Copy `packages/electron/src/services/context/ContextGenerator.ts` to `packages/core/src/services/ContextGenerator.ts`",
                  "done": true
                },
                {
                  "name": "Update `ProjectData` import to relative path `../types/project.js`",
                  "done": true
                },
                {
                  "name": "No other changes needed — this file has zero Electron dependencies",
                  "done": true
                },
                {
                  "name": "**Success**: File exists in core with correct import; no `@context-forge/core` self-import; no Electron imports",
                  "done": true
                },
                {
                  "name": "Copy `packages/electron/src/services/context/ContextTemplateEngine.ts` to `packages/core/src/services/ContextTemplate...",
                  "done": true
                },
                {
                  "name": "Replace imports:",
                  "done": true
                },
                {
                  "name": "Update constructor: require `promptParser: IPromptService` and `statementManager: IStatementService` (no optional/def...",
                  "done": true
                },
                {
                  "name": "Update private field types: `promptParser: IPromptService`, `statementManager: IStatementService`",
                  "done": true
                },
                {
                  "name": "Verify `updateServicePaths()` calls `this.promptParser.setFilePath()` and `this.statementManager.setFilePath()` — wor...",
                  "done": true
                },
                {
                  "name": "Ensure all relative imports use `.js` extensions",
                  "done": true
                },
                {
                  "name": "**Success**: File compiles with no Electron imports; constructor requires explicit deps; `updateServicePaths()` prese...",
                  "done": true
                },
                {
                  "name": "Copy `packages/electron/src/services/context/ContextIntegrator.ts` to `packages/core/src/services/ContextIntegrator.ts`",
                  "done": true
                },
                {
                  "name": "Replace imports:",
                  "done": true
                },
                {
                  "name": "Change constructor to: `constructor(engine: ContextTemplateEngine, enableNewEngine: boolean = true)`",
                  "done": true
                },
                {
                  "name": "Verify `generateWithTemplateEngine()` uses `this.templateEngine.updateServicePaths()` as before",
                  "done": true
                },
                {
                  "name": "Retain: `DEFAULT_TEMPLATE`, legacy path, `mapProjectToContext`, `mapProjectToEnhancedContext`, `validateProject`, err...",
                  "done": true
                },
                {
                  "name": "Ensure all relative imports use `.js` extensions",
                  "done": true
                },
                {
                  "name": "**Success**: File compiles with no Electron imports; constructor requires `ContextTemplateEngine`; path resolution un...",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/services/CoreServiceFactory.ts`",
                  "done": true
                },
                {
                  "name": "Implement `createContextPipeline(projectPath: string)` as specified in slice design",
                  "done": true
                },
                {
                  "name": "Ensure all relative imports use `.js` extensions",
                  "done": true
                },
                {
                  "name": "**Success**: Function exported; builds clean; returns typed `{ engine: ContextTemplateEngine; integrator: ContextInte...",
                  "done": true
                },
                {
                  "name": "Update `packages/core/src/services/index.ts`:",
                  "done": true
                },
                {
                  "name": "`packages/core/src/index.ts` needs no change (already re-exports `services/index.js`)",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/core build`",
                  "done": true
                },
                {
                  "name": "Verify `dist/` contains `.js` and `.d.ts` for all 4 new files",
                  "done": true
                },
                {
                  "name": "Git commit: orchestration extraction to core",
                  "done": true
                },
                {
                  "name": "**Success**: Core builds; all new files in `dist/`; commit created",
                  "done": true
                },
                {
                  "name": "In `packages/electron/src/hooks/useContextGeneration.ts`:",
                  "done": true
                },
                {
                  "name": "**Success**: Hook constructs orchestrators explicitly with IPC services; no direct local orchestrator imports",
                  "done": true
                },
                {
                  "name": "In `packages/electron/src/services/context/index.ts`:",
                  "done": true
                },
                {
                  "name": "**Success**: Barrel re-exports orchestrators from core; IPC wrappers remain local",
                  "done": true
                },
                {
                  "name": "Update `packages/electron/src/services/context/__tests__/ContextGenerator.test.ts`:",
                  "done": true
                },
                {
                  "name": "Update `packages/electron/src/services/context/__tests__/ContextIntegrator.test.ts`:",
                  "done": true
                },
                {
                  "name": "**Success**: Both test files compile; import paths point to `@context-forge/core`; structural interface compatibility...",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/electron build` — verify success",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/electron test` — verify same pass/fail as pre-extraction (155/163)",
                  "done": true
                },
                {
                  "name": "Git commit: Electron consumer updates for orchestration extraction",
                  "done": true
                },
                {
                  "name": "**Success**: Electron builds clean; test results unchanged; commit created",
                  "done": true
                },
                {
                  "name": "Delete `packages/electron/src/services/context/ContextGenerator.ts`",
                  "done": true
                },
                {
                  "name": "Delete `packages/electron/src/services/context/ContextTemplateEngine.ts`",
                  "done": true
                },
                {
                  "name": "Delete `packages/electron/src/services/context/ContextIntegrator.ts`",
                  "done": true
                },
                {
                  "name": "Verify `ServiceFactory.ts` remains in Electron (still needed for IPC wrapper creation)",
                  "done": true
                },
                {
                  "name": "Verify IPC wrappers (`SystemPromptParserIPC.ts`, `StatementManagerIPC.ts`) are unmodified (`git diff` shows no changes)",
                  "done": true
                },
                {
                  "name": "**Success**: 3 files deleted; `ServiceFactory.ts` and IPC wrappers still present and unchanged; no dangling imports",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/core build` — verify success",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/electron build` — verify success",
                  "done": true
                },
                {
                  "name": "Run `pnpm -r build` — full workspace builds in correct order",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/electron test` — verify same pass/fail (155/163)",
                  "done": true
                },
                {
                  "name": "Grep `packages/core/src/` for any Electron-specific imports (`window.electronAPI`, `SystemPromptParserIPC`, `Statemen...",
                  "done": true
                },
                {
                  "name": "Verify `createContextPipeline` is importable from `packages/mcp-server/` (workspace link resolution)",
                  "done": true
                },
                {
                  "name": "Git commit: delete old orchestrator files, final verification",
                  "done": true
                },
                {
                  "name": "Update slice design success criteria checkboxes",
                  "done": true
                },
                {
                  "name": "Update DEVLOG with implementation summary and commit hashes",
                  "done": true
                },
                {
                  "name": "**Note**: Manual verification recommended — launch Electron app, generate context for a test project, verify output m...",
                  "done": true
                },
                {
                  "name": "**Success**: Full workspace builds; tests unchanged; no Electron imports in core; DEVLOG updated",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "144",
            "name": "storage-migration",
            "status": "not-started",
            "dateCreated": "20260218",
            "dateUpdated": "20260218",
            "tasks": {
              "index": "144",
              "name": "tasks.storage-migration",
              "status": "complete",
              "taskCount": 110,
              "completedTasks": 110,
              "dateCreated": "20260219",
              "dateUpdated": "20260219",
              "items": [
                {
                  "name": "Run `pnpm --filter @context-forge/core add env-paths` (v3.x, ESM)",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/storage/storagePaths.ts`",
                  "done": true
                },
                {
                  "name": "All relative imports use `.js` extensions",
                  "done": true
                },
                {
                  "name": "**Success**: File compiles; `getStoragePath()` returns a string; `CONTEXT_FORGE_DATA_DIR` override works when set",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/storage/interfaces.ts`",
                  "done": true
                },
                {
                  "name": "Types only — no runtime dependencies",
                  "done": true
                },
                {
                  "name": "**Success**: File compiles; all interfaces importable; no `any` types",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/core build` — verify success",
                  "done": true
                },
                {
                  "name": "Git commit: storage interfaces and storage path module",
                  "done": true
                },
                {
                  "name": "**Success**: Core builds clean; commit created",
                  "done": true
                },
                {
                  "name": "Copy `packages/electron/src/main/services/storage/backupService.ts` to `packages/core/src/storage/backupService.ts`",
                  "done": true
                },
                {
                  "name": "Update imports to core-relative paths (only `fs/promises`, `fs`, `path` — no Electron deps)",
                  "done": true
                },
                {
                  "name": "Preserve all exports unchanged: `BackupFsDeps`, `MAX_VERSIONED_BACKUPS`, `createVersionedBackup`, `pruneOldBackups`, ...",
                  "done": true
                },
                {
                  "name": "Ensure `.js` extensions on any relative imports",
                  "done": true
                },
                {
                  "name": "**Success**: File compiles in core; no Electron imports; function signatures identical to source",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/storage/__tests__/backupService.test.ts`",
                  "done": true
                },
                {
                  "name": "Port tests from `packages/electron/tests/unit/services/storage/backupService.test.ts`, updating import paths to `../b...",
                  "done": true
                },
                {
                  "name": "Tests cover: `createVersionedBackup` (skip if missing, timestamped filename, unique timestamps, filename pattern), `p...",
                  "done": true
                },
                {
                  "name": "All tests use injectable `BackupFsDeps` mocks (same pattern as Electron tests)",
                  "done": true
                },
                {
                  "name": "**Success**: All backup service tests pass via `pnpm --filter @context-forge/core test`",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/core build` — verify success",
                  "done": true
                },
                {
                  "name": "Git commit: backup service extraction with tests",
                  "done": true
                },
                {
                  "name": "**Success**: Core builds clean; backup tests pass; commit created",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/storage/FileStorageService.ts`",
                  "done": true
                },
                {
                  "name": "Implement `IStorageService` with constructor taking `storagePath: string`",
                  "done": true
                },
                {
                  "name": "`read(filename)`: validate filename (reject `..`, `/`, `\\`); try main file + JSON parse; on failure try `{filename}.b...",
                  "done": true
                },
                {
                  "name": "`write(filename, data)`: validate filename; ensure directory exists; backup existing to `{filename}.backup`; call `ch...",
                  "done": true
                },
                {
                  "name": "`createBackup(filename)`: validate; copy main file to `{filename}.backup` if it exists",
                  "done": true
                },
                {
                  "name": "`exists(filename)`: validate; check file existence",
                  "done": true
                },
                {
                  "name": "Reference: Electron's `main.ts` IPC handlers (lines 63-228) contain the logic being extracted",
                  "done": true
                },
                {
                  "name": "All relative imports use `.js` extensions",
                  "done": true
                },
                {
                  "name": "**Success**: File compiles; implements `IStorageService`; no `any` types; no Electron imports",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/storage/__tests__/FileStorageService.test.ts`",
                  "done": true
                },
                {
                  "name": "Test write + read round-trip: write JSON data, read it back, verify content match",
                  "done": true
                },
                {
                  "name": "Test atomic write: verify no `.tmp` file remains after successful write",
                  "done": true
                },
                {
                  "name": "Test backup on write: verify `{filename}.backup` exists after write",
                  "done": true
                },
                {
                  "name": "Test recovery from corrupted main file: write valid data, corrupt main file, read again, verify backup recovery and `...",
                  "done": true
                },
                {
                  "name": "Test filename validation: reject `..`, `/`, `\\` in filenames for read, write, createBackup, exists",
                  "done": true
                },
                {
                  "name": "Test read non-existent file: verify appropriate error thrown",
                  "done": true
                },
                {
                  "name": "Test write creates storage directory if missing",
                  "done": true
                },
                {
                  "name": "All tests use temp directories (`mkdtemp` + cleanup in `afterEach`)",
                  "done": true
                },
                {
                  "name": "**Success**: All FileStorageService tests pass",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/core build` — verify success",
                  "done": true
                },
                {
                  "name": "Git commit: FileStorageService implementation and tests",
                  "done": true
                },
                {
                  "name": "**Success**: Core builds; all storage tests pass; commit created",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/storage/FileProjectStore.ts`",
                  "done": true
                },
                {
                  "name": "Implement `IProjectStore`, composing `FileStorageService` internally",
                  "done": true
                },
                {
                  "name": "Constructor: create `FileStorageService` using `getStoragePath()`",
                  "done": true
                },
                {
                  "name": "Lazy initialization (`ensureInitialized()`): on first access, check if `projects.json` exists; if not, call `migrateF...",
                  "done": true
                },
                {
                  "name": "`getAll()`: call `ensureInitialized()`; read + parse `projects.json`; apply field migration (defaults: `taskFile: ''`...",
                  "done": true
                },
                {
                  "name": "`getById(id)`: call `getAll()`, find by id, return match or `undefined`",
                  "done": true
                },
                {
                  "name": "`create(data)`: generate ID (`project_{timestamp}_{random}`), construct full `ProjectData` with timestamps, append to...",
                  "done": true
                },
                {
                  "name": "`update(id, updates)`: load all, find by id (throw if not found), merge updates, set `updatedAt`, write",
                  "done": true
                },
                {
                  "name": "`delete(id)`: load all, verify exists (throw if not found), filter out, write",
                  "done": true
                },
                {
                  "name": "Implement `migrateFromLegacyLocation()` — see slice design §Data Migration Strategy: copy `projects.json` and `projec...",
                  "done": true
                },
                {
                  "name": "All relative imports use `.js` extensions",
                  "done": true
                },
                {
                  "name": "**Success**: File compiles; implements `IProjectStore`; no `any` types; no Electron imports",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/storage/__tests__/FileProjectStore.test.ts`",
                  "done": true
                },
                {
                  "name": "Test CRUD round-trip: create → getAll (length 1) → getById → update → verify changes → delete → getAll (length 0)",
                  "done": true
                },
                {
                  "name": "Test ID generation: verify `project_` prefix format via regex match",
                  "done": true
                },
                {
                  "name": "Test field migration on read: manually write projects.json missing `taskFile`/`instruction`/`isMonorepo`/`customData`...",
                  "done": true
                },
                {
                  "name": "Test create sets `createdAt` and `updatedAt` as ISO timestamps",
                  "done": true
                },
                {
                  "name": "Test update modifies `updatedAt` but not `createdAt`",
                  "done": true
                },
                {
                  "name": "Test update non-existent ID throws",
                  "done": true
                },
                {
                  "name": "Test delete non-existent ID throws",
                  "done": true
                },
                {
                  "name": "Test getAll on empty store returns `[]`",
                  "done": true
                },
                {
                  "name": "Test migration from legacy location: seed projects.json in mock legacy path, verify first `getAll()` copies to new lo...",
                  "done": true
                },
                {
                  "name": "Test migration skipped when new location already has data",
                  "done": true
                },
                {
                  "name": "All tests use temp directories via `CONTEXT_FORGE_DATA_DIR` env var override + cleanup",
                  "done": true
                },
                {
                  "name": "**Success**: All FileProjectStore tests pass",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/storage/index.ts` barrel:",
                  "done": true
                },
                {
                  "name": "Update `packages/core/src/node.ts`: add `export * from './storage/index.js'`",
                  "done": true
                },
                {
                  "name": "Update `packages/core/src/index.ts`: add type-only re-exports for `IProjectStore`, `IStorageService`, `StorageReadRes...",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/core build` — verify success",
                  "done": true
                },
                {
                  "name": "Verify `dist/` contains storage `.js` and `.d.ts` files",
                  "done": true
                },
                {
                  "name": "Git commit: FileProjectStore, barrel exports, core integration",
                  "done": true
                },
                {
                  "name": "**Success**: Core builds; `IProjectStore` importable from `@context-forge/core`; `FileProjectStore` importable from `...",
                  "done": true
                },
                {
                  "name": "In `packages/electron/src/main/main.ts`:",
                  "done": true
                },
                {
                  "name": "Preserve IPC return contract: `{ success: boolean, data?: string, error?: string, recovered?: boolean, message?: stri...",
                  "done": true
                },
                {
                  "name": "Remove now-unused `fs/promises` imports (`readFile`, `writeFile`, `copyFile`, `rename`, `unlink` — keep `readdir`, `s...",
                  "done": true
                },
                {
                  "name": "**Success**: IPC handlers delegate to core; ~100+ lines of inline fs logic eliminated; storage behavior unchanged",
                  "done": true
                },
                {
                  "name": "In `packages/electron/src/main/main.ts`:",
                  "done": true
                },
                {
                  "name": "**Success**: Exit backup uses core's `createVersionedBackup`; local backup import removed",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/electron build` — verify success",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/electron test` — verify same pass/fail as pre-slice",
                  "done": true
                },
                {
                  "name": "Git commit: Electron main.ts delegates to core storage",
                  "done": true
                },
                {
                  "name": "**Success**: Electron builds clean; test results unchanged; commit created",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/__tests__/__fixtures__/test-project/project-documents/ai-project-guide/`",
                  "done": true
                },
                {
                  "name": "Create minimal `prompt.ai-project.system.md` containing a simple template with at least one variable placeholder (e.g...",
                  "done": true
                },
                {
                  "name": "Create minimal `statements.ai-project.default.md` with at least one statement section",
                  "done": true
                },
                {
                  "name": "Verify fixture structure matches what `createContextPipeline()` expects (`PROMPT_FILE_RELATIVE_PATH` and `STATEMENTS_...",
                  "done": true
                },
                {
                  "name": "**Success**: Fixture directory exists with valid prompt and statement files",
                  "done": true
                },
                {
                  "name": "Create `packages/core/src/__tests__/pipeline-integration.test.ts`",
                  "done": true
                },
                {
                  "name": "Test: create project via `FileProjectStore`, wire `createContextPipeline()` with fixture path, call `integrator.gener...",
                  "done": true
                },
                {
                  "name": "Test: CRUD round-trip on `FileProjectStore` (create, read, update, delete)",
                  "done": true
                },
                {
                  "name": "Test: recovery from corrupted `projects.json` via backup",
                  "done": true
                },
                {
                  "name": "All tests use `CONTEXT_FORGE_DATA_DIR` env var with temp directories; clean up in `afterEach`",
                  "done": true
                },
                {
                  "name": "**Success**: All pipeline integration tests pass; validates full context generation chain without Electron",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/core build` — verify success",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/electron build` — verify success",
                  "done": true
                },
                {
                  "name": "Run `pnpm -r build` — full workspace builds in correct order",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/core test` — all storage and integration tests pass",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/electron test` — same pass/fail as pre-slice",
                  "done": true
                },
                {
                  "name": "Grep `packages/core/src/` for Electron imports (`electron`, `app.getPath`, `BrowserWindow`) — must find zero",
                  "done": true
                },
                {
                  "name": "Verify `FileProjectStore` importable from `@context-forge/core/node` (workspace link)",
                  "done": true
                },
                {
                  "name": "Verify `IProjectStore` type importable from `@context-forge/core` (browser-safe barrel)",
                  "done": true
                },
                {
                  "name": "Git commit: pipeline integration test and final verification",
                  "done": true
                },
                {
                  "name": "Update DEVLOG with slice 144 implementation summary",
                  "done": true
                },
                {
                  "name": "**Note**: After successful build, PM should manually copy versioned backups:",
                  "done": true
                },
                {
                  "name": "**Success**: Full workspace builds; all tests pass; no Electron imports in core; storage accessible from MCP server p...",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "145",
            "name": "mcp-server-project-tools",
            "status": "not-started",
            "dateCreated": "20260219",
            "dateUpdated": "20260219",
            "tasks": {
              "index": "145",
              "name": "tasks.mcp-server-project-tools",
              "status": "complete",
              "taskCount": 53,
              "completedTasks": 53,
              "dateCreated": "20260219",
              "dateUpdated": "20260219",
              "items": [
                {
                  "name": "Run `pnpm --filter context-forge-mcp add @modelcontextprotocol/server zod`",
                  "done": true
                },
                {
                  "name": "Verify import resolution: create a minimal test import in `src/index.ts` to confirm `McpServer` and `StdioServerTrans...",
                  "done": true
                },
                {
                  "name": "Verify zod import: `import * as z from 'zod/v4'` (v2) or `import { z } from 'zod'` (v1)",
                  "done": true
                },
                {
                  "name": "Record which SDK version was installed in a brief comment at top of `src/index.ts`",
                  "done": true
                },
                {
                  "name": "Add `#!/usr/bin/env node` shebang as first line",
                  "done": true
                },
                {
                  "name": "Import `McpServer`, `StdioServerTransport` (path depends on v1/v2 per Task 1)",
                  "done": true
                },
                {
                  "name": "Create `McpServer` instance with:",
                  "done": true
                },
                {
                  "name": "Create `StdioServerTransport` and call `server.connect(transport)`",
                  "done": true
                },
                {
                  "name": "Add stderr startup log: `console.error('[context-forge-mcp] Server started')`",
                  "done": true
                },
                {
                  "name": "Wrap in async main function with top-level error handling that logs to stderr and exits with code 1",
                  "done": true
                },
                {
                  "name": "Do NOT write anything to stdout — only stderr",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp build`",
                  "done": true
                },
                {
                  "name": "Verify `dist/index.js` exists and contains the shebang line",
                  "done": true
                },
                {
                  "name": "Commit: \"feat(mcp-server): scaffold MCP server with SDK and stdio transport (slice 145)\"",
                  "done": true
                },
                {
                  "name": "Create `packages/mcp-server/src/tools/projectTools.ts`",
                  "done": true
                },
                {
                  "name": "Export a `registerProjectTools(server: McpServer)` function (type `McpServer` from SDK)",
                  "done": true
                },
                {
                  "name": "Register `project_list` tool using `server.registerTool()`:",
                  "done": true
                },
                {
                  "name": "`project_list` handler logic:",
                  "done": true
                },
                {
                  "name": "Register `project_get` tool:",
                  "done": true
                },
                {
                  "name": "`project_get` handler logic:",
                  "done": true
                },
                {
                  "name": "Wrap both handlers in try/catch — errors return `{ content: [...], isError: true }`",
                  "done": true
                },
                {
                  "name": "Wire in `index.ts`: import `registerProjectTools`, call before `server.connect(transport)`",
                  "done": true
                },
                {
                  "name": "Create `packages/mcp-server/src/__tests__/projectTools.test.ts`",
                  "done": true
                },
                {
                  "name": "Mock `FileProjectStore` from `@context-forge/core/node` using `vi.mock()`",
                  "done": true
                },
                {
                  "name": "Create mock project data fixture matching `ProjectData` shape",
                  "done": true
                },
                {
                  "name": "`project_list` tests:",
                  "done": true
                },
                {
                  "name": "`project_get` tests:",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp test` — all tests pass",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp build`",
                  "done": true
                },
                {
                  "name": "Commit: \"feat(mcp-server): implement project_list and project_get tools with tests (slice 145)\"",
                  "done": true
                },
                {
                  "name": "Register `project_update` tool in `registerProjectTools()`:",
                  "done": true
                },
                {
                  "name": "Handler logic:",
                  "done": true
                },
                {
                  "name": "Wrap in try/catch per error handling pattern",
                  "done": true
                },
                {
                  "name": "Add `project_update` tests to existing `projectTools.test.ts`:",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp test` — all tests pass (read-only + update)",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp build`",
                  "done": true
                },
                {
                  "name": "Commit: \"feat(mcp-server): implement project_update tool with tests (slice 145)\"",
                  "done": true
                },
                {
                  "name": "Create `packages/mcp-server/src/__tests__/serverLifecycle.test.ts`",
                  "done": true
                },
                {
                  "name": "Spawn server as child process: `node` with `dist/index.js` (requires build first)",
                  "done": true
                },
                {
                  "name": "Send MCP `initialize` request as JSON-RPC over stdin:",
                  "done": true
                },
                {
                  "name": "Parse JSON-RPC response from stdout",
                  "done": true
                },
                {
                  "name": "Assert response contains `serverInfo.name === \"context-forge-mcp\"`",
                  "done": true
                },
                {
                  "name": "Send `notifications/initialized`: `{ \"jsonrpc\": \"2.0\", \"method\": \"notifications/initialized\" }`",
                  "done": true
                },
                {
                  "name": "Optionally: send `tools/list` request and assert all 3 tools are present",
                  "done": true
                },
                {
                  "name": "Close stdin and verify process exits with code 0 (or use a timeout)",
                  "done": true
                },
                {
                  "name": "Clean up temp directory in afterEach",
                  "done": true
                },
                {
                  "name": "Run `pnpm -r build` — full workspace builds cleanly",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp test` — all MCP server tests pass",
                  "done": true
                },
                {
                  "name": "Run `pnpm -r test` — no regressions in core or Electron tests",
                  "done": true
                },
                {
                  "name": "Verify `dist/index.js` contains shebang and is executable",
                  "done": true
                },
                {
                  "name": "Commit: \"test(mcp-server): server lifecycle test, verify full build (slice 145)\"",
                  "done": true
                },
                {
                  "name": "Update DEVLOG.md with implementation summary and commit hashes",
                  "done": true
                },
                {
                  "name": "Mark slice 145 as `[x]` in `140-slices.context-forge-restructure.md`",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "146",
            "name": "mcp-context-tools",
            "status": "not-started",
            "dateCreated": "20260220",
            "dateUpdated": "20260220",
            "tasks": {
              "index": "146",
              "name": "tasks.mcp-server-context-tools",
              "status": "complete",
              "taskCount": 70,
              "completedTasks": 70,
              "dateCreated": "20260220",
              "dateUpdated": "20260220",
              "items": [
                {
                  "name": "Read `packages/core/src/services/CoreServiceFactory.ts` to confirm `createContextPipeline` signature and behavior",
                  "done": true
                },
                {
                  "name": "Read `packages/core/src/services/ContextIntegrator.ts` to confirm `generateContextFromProject` accepts `ProjectData` ...",
                  "done": true
                },
                {
                  "name": "Read `packages/core/src/services/SystemPromptParser.ts` to confirm `getAllPrompts()` returns `SystemPrompt[]` and und...",
                  "done": true
                },
                {
                  "name": "Read `packages/core/src/services/constants.ts` to confirm `PROMPT_FILE_RELATIVE_PATH` value",
                  "done": true
                },
                {
                  "name": "Verify that `ContextIntegrator` handles the `projectPath` → service path update internally (via `updateServicePaths`)",
                  "done": true
                },
                {
                  "name": "Verify that `createContextPipeline` and `SystemPromptParser` are exported from `@context-forge/core/node`",
                  "done": true
                },
                {
                  "name": "Verify that `PROMPT_FILE_RELATIVE_PATH` and `ProjectData` type are exported from `@context-forge/core`",
                  "done": true
                },
                {
                  "name": "Create `packages/mcp-server/src/tools/contextTools.ts`",
                  "done": true
                },
                {
                  "name": "Export a `registerContextTools(server: McpServer)` function (same pattern as `registerProjectTools`)",
                  "done": true
                },
                {
                  "name": "Import `FileProjectStore`, `createContextPipeline`, `SystemPromptParser` from `@context-forge/core/node`",
                  "done": true
                },
                {
                  "name": "Import `PROMPT_FILE_RELATIVE_PATH` and `ProjectData` type from `@context-forge/core`",
                  "done": true
                },
                {
                  "name": "Import `path` from `node:path`",
                  "done": true
                },
                {
                  "name": "Implement shared `errorResult(message)` and `jsonResult(data)` helpers (same pattern as `projectTools.ts`, or factor ...",
                  "done": true
                },
                {
                  "name": "Implement shared `generateContext` internal function:",
                  "done": true
                },
                {
                  "name": "File compiles (`pnpm --filter context-forge-mcp build`)",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp build` — clean build",
                  "done": true
                },
                {
                  "name": "Commit: \"feat(mcp-server): scaffold contextTools with shared generateContext helper (slice 146)\"",
                  "done": true
                },
                {
                  "name": "Register `context_build` tool in `registerContextTools()`:",
                  "done": true
                },
                {
                  "name": "Handler logic:",
                  "done": true
                },
                {
                  "name": "Handle specific error cases:",
                  "done": true
                },
                {
                  "name": "Register `template_preview` tool in `registerContextTools()`:",
                  "done": true
                },
                {
                  "name": "Handler logic: delegates to the same `generateContext` helper as `context_build`",
                  "done": true
                },
                {
                  "name": "Create `packages/mcp-server/src/__tests__/contextTools.test.ts`",
                  "done": true
                },
                {
                  "name": "Mock `@context-forge/core/node` to stub `FileProjectStore`, `createContextPipeline`, and `SystemPromptParser`",
                  "done": true
                },
                {
                  "name": "Mock `createContextPipeline` to return a mock `integrator` with `generateContextFromProject` that returns a known con...",
                  "done": true
                },
                {
                  "name": "Create mock `ProjectData` fixture (must include `projectPath`)",
                  "done": true
                },
                {
                  "name": "Set up test client using `InMemoryTransport` (same pattern as `projectTools.test.ts`)",
                  "done": true
                },
                {
                  "name": "`context_build` tests:",
                  "done": true
                },
                {
                  "name": "Returns assembled context string for valid project (plain text, not JSON)",
                  "done": true
                },
                {
                  "name": "Applies override parameters (verify the working copy passed to `generateContextFromProject` has overrides applied)",
                  "done": true
                },
                {
                  "name": "Appends `additionalInstructions` when provided",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` for non-existent project ID",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` when project has no `projectPath`",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` on core generation failure (mock throws)",
                  "done": true
                },
                {
                  "name": "`template_preview` tests:",
                  "done": true
                },
                {
                  "name": "Returns same output as `context_build` for identical parameters",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` for non-existent project",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp test` — all tests pass (both new and existing)",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp build` — clean build",
                  "done": true
                },
                {
                  "name": "Commit: \"feat(mcp-server): implement context_build and template_preview tools with tests (slice 146)\"",
                  "done": true
                },
                {
                  "name": "Register `prompt_list` tool in `registerContextTools()`:",
                  "done": true
                },
                {
                  "name": "Handler logic:",
                  "done": true
                },
                {
                  "name": "Error cases:",
                  "done": true
                },
                {
                  "name": "Register `prompt_get` tool in `registerContextTools()`:",
                  "done": true
                },
                {
                  "name": "Handler logic:",
                  "done": true
                },
                {
                  "name": "Add tests to `contextTools.test.ts` (or create a separate `promptTools.test.ts` if the file is getting long)",
                  "done": true
                },
                {
                  "name": "Mock `SystemPromptParser` to return known `SystemPrompt[]` fixture data",
                  "done": true
                },
                {
                  "name": "`prompt_list` tests:",
                  "done": true
                },
                {
                  "name": "Returns template listing with names, keys, and count",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` for non-existent project",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` when project has no `projectPath`",
                  "done": true
                },
                {
                  "name": "Handles parse errors gracefully (mock throws)",
                  "done": true
                },
                {
                  "name": "`prompt_get` tests:",
                  "done": true
                },
                {
                  "name": "Returns template content for valid name match",
                  "done": true
                },
                {
                  "name": "Returns template content for valid key match",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` for non-existent template name (with prompt_list reference)",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` for non-existent project",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp test` — all tests pass",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp build` — clean build",
                  "done": true
                },
                {
                  "name": "Commit: \"feat(mcp-server): implement prompt_list and prompt_get tools with tests (slice 146)\"",
                  "done": true
                },
                {
                  "name": "Edit `packages/mcp-server/src/index.ts`:",
                  "done": true
                },
                {
                  "name": "No other changes to `index.ts`",
                  "done": true
                },
                {
                  "name": "Edit `packages/mcp-server/src/__tests__/serverLifecycle.test.ts`:",
                  "done": true
                },
                {
                  "name": "Run `pnpm -r build` — full workspace builds cleanly",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp test` — all MCP server tests pass (project tools, context tools, lifecycle)",
                  "done": true
                },
                {
                  "name": "Verify no regressions: existing project tools tests pass unchanged",
                  "done": true
                },
                {
                  "name": "Verify `dist/index.js` exists and contains all tool registrations",
                  "done": true
                },
                {
                  "name": "Commit: \"test(mcp-server): update lifecycle test for 7 tools, verify full build (slice 146)\"",
                  "done": true
                },
                {
                  "name": "Update DEVLOG.md with implementation summary and commit hashes",
                  "done": true
                },
                {
                  "name": "Mark slice 146 (item 7) as `[x]` in `140-slices.context-forge-restructure.md`",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "147",
            "name": "mcp-server-state-tools",
            "status": "complete",
            "dateCreated": "20260220",
            "dateUpdated": "20260220",
            "tasks": {
              "index": "147",
              "name": "tasks.mcp-server-state-tools",
              "status": "complete",
              "taskCount": 33,
              "completedTasks": 33,
              "dateCreated": "20260220",
              "dateUpdated": "20260220",
              "items": [
                {
                  "name": "Create `packages/mcp-server/src/tools/stateTools.ts`",
                  "done": true
                },
                {
                  "name": "Export a `registerStateTools(server: McpServer)` function (same pattern as `registerProjectTools` and `registerContex...",
                  "done": true
                },
                {
                  "name": "Add imports:",
                  "done": true
                },
                {
                  "name": "File compiles (`pnpm --filter context-forge-mcp build`)",
                  "done": true
                },
                {
                  "name": "Register `context_summarize` tool in `registerStateTools()`:",
                  "done": true
                },
                {
                  "name": "Handler logic:",
                  "done": true
                },
                {
                  "name": "Wrap handler in try/catch — surface store failures via `errorResult`",
                  "done": true
                },
                {
                  "name": "File compiles (`pnpm --filter context-forge-mcp build`)",
                  "done": true
                },
                {
                  "name": "Create `packages/mcp-server/src/__tests__/stateTools.test.ts`",
                  "done": true
                },
                {
                  "name": "Mock `@context-forge/core/node` to stub `FileProjectStore` (same pattern as `projectTools.test.ts`)",
                  "done": true
                },
                {
                  "name": "Mock `getById` and `update` methods on the store",
                  "done": true
                },
                {
                  "name": "Create mock `ProjectData` fixture with existing `customData` fields (`recentEvents`, `additionalNotes`, `monorepoNote...",
                  "done": true
                },
                {
                  "name": "Set up test client using `InMemoryTransport` + `Client` pattern (import from `@modelcontextprotocol/sdk`)",
                  "done": true
                },
                {
                  "name": "Test cases:",
                  "done": true
                },
                {
                  "name": "Returns updated project as JSON after updating `recentEvents`",
                  "done": true
                },
                {
                  "name": "Preserves other `customData` fields (`monorepoNote`, `availableTools`) during update",
                  "done": true
                },
                {
                  "name": "Updates `additionalNotes` when provided",
                  "done": true
                },
                {
                  "name": "Does not modify `additionalNotes` when not provided in the call",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` for non-existent project ID (message references `project_list`)",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` for empty/whitespace-only summary",
                  "done": true
                },
                {
                  "name": "Returns `isError: true` on store update failure (mock `update` throws)",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp test` — all tests pass (new + existing)",
                  "done": true
                },
                {
                  "name": "Edit `packages/mcp-server/src/index.ts`:",
                  "done": true
                },
                {
                  "name": "No other changes to `index.ts`",
                  "done": true
                },
                {
                  "name": "Edit `packages/mcp-server/src/__tests__/serverLifecycle.test.ts`:",
                  "done": true
                },
                {
                  "name": "Run `pnpm -r build` — full workspace builds cleanly",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter context-forge-mcp test` — all MCP server tests pass (project tools, context tools, state tools, li...",
                  "done": true
                },
                {
                  "name": "Verify no regressions: existing tests pass unchanged",
                  "done": true
                },
                {
                  "name": "Verify `dist/index.js` exists and contains all tool registrations",
                  "done": true
                },
                {
                  "name": "Commit all changes: \"feat(mcp-server): implement context_summarize tool with tests (slice 147)\"",
                  "done": true
                },
                {
                  "name": "Update DEVLOG.md with implementation summary and commit hashes",
                  "done": true
                },
                {
                  "name": "Mark slice 147 (item 8) as `[x]` in `140-slices.context-forge-restructure.md`",
                  "done": true
                },
                {
                  "name": "Update slice design status from `not started` to `complete`",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "148",
            "name": "electron-client-conversion",
            "status": "not-started",
            "dateCreated": "20260221",
            "dateUpdated": "20260221",
            "tasks": {
              "index": "148",
              "name": "tasks.electron-client-conversion",
              "status": "complete",
              "taskCount": 141,
              "completedTasks": 141,
              "dateCreated": "20260221",
              "dateUpdated": "20260221",
              "items": [
                {
                  "name": "Create `packages/electron/src/main/ipc/projectHandlers.ts`",
                  "done": true
                },
                {
                  "name": "Export `registerProjectHandlers(store: FileProjectStore)` function",
                  "done": true
                },
                {
                  "name": "Register IPC handlers for: `project:list`, `project:get`, `project:create`, `project:update`, `project:delete`",
                  "done": true
                },
                {
                  "name": "`project:list` calls `store.getAll()`, sorts by `updatedAt` descending",
                  "done": true
                },
                {
                  "name": "`project:get` calls `store.getById(id)`, returns `ProjectData | null`",
                  "done": true
                },
                {
                  "name": "`project:create` calls `store.create(data)`, returns created `ProjectData`",
                  "done": true
                },
                {
                  "name": "`project:update` calls `store.update(id, updates)` then `store.getById(id)` to return updated data",
                  "done": true
                },
                {
                  "name": "`project:delete` calls `store.delete(id)`",
                  "done": true
                },
                {
                  "name": "All handlers wrap calls in try/catch — rethrow errors with descriptive messages for IPC error propagation",
                  "done": true
                },
                {
                  "name": "**Success:** File compiles, exports the registration function, all 5 handlers use `ipcMain.handle()`",
                  "done": true
                },
                {
                  "name": "Create `packages/electron/tests/unit/main/ipc/projectHandlers.test.ts`",
                  "done": true
                },
                {
                  "name": "Mock `FileProjectStore` with vi.fn() for each method",
                  "done": true
                },
                {
                  "name": "Test `project:list` calls `getAll()` and returns sorted array",
                  "done": true
                },
                {
                  "name": "Test `project:get` returns project when found, null when not",
                  "done": true
                },
                {
                  "name": "Test `project:create` passes `CreateProjectData` to `create()` and returns result",
                  "done": true
                },
                {
                  "name": "Test `project:update` calls `update()` then `getById()` for read-back",
                  "done": true
                },
                {
                  "name": "Test `project:delete` calls `delete()` with correct id",
                  "done": true
                },
                {
                  "name": "Test error propagation: handler rethrows when store method throws",
                  "done": true
                },
                {
                  "name": "**Success:** All tests pass via `pnpm --filter @context-forge/electron test:run`",
                  "done": true
                },
                {
                  "name": "Create `packages/electron/src/main/ipc/contextHandlers.ts`",
                  "done": true
                },
                {
                  "name": "Define `ContextOverrides` interface (or import from a shared types location — see slice design for shape)",
                  "done": true
                },
                {
                  "name": "Export `registerContextHandlers(store: FileProjectStore)` function",
                  "done": true
                },
                {
                  "name": "Register `context:generate` handler: takes `(projectId: string, overrides?: ContextOverrides)`",
                  "done": true
                },
                {
                  "name": "Handler flow: `store.getById(projectId)` → validate project exists → apply overrides to project copy → `createContext...",
                  "done": true
                },
                {
                  "name": "Override application: merge override fields into a shallow copy of ProjectData before passing to pipeline (same patte...",
                  "done": true
                },
                {
                  "name": "Error case: project not found → throw descriptive error",
                  "done": true
                },
                {
                  "name": "Error case: project has no `projectPath` → throw descriptive error",
                  "done": true
                },
                {
                  "name": "**Success:** File compiles, exports registration function, handler delegates to `createContextPipeline`",
                  "done": true
                },
                {
                  "name": "Create `packages/electron/tests/unit/main/ipc/contextHandlers.test.ts`",
                  "done": true
                },
                {
                  "name": "Mock `FileProjectStore` and `createContextPipeline` (from `@context-forge/core/node`)",
                  "done": true
                },
                {
                  "name": "Test successful generation: returns context string from integrator",
                  "done": true
                },
                {
                  "name": "Test with overrides: verify override fields are applied to project before passing to pipeline",
                  "done": true
                },
                {
                  "name": "Test project not found: throws error with descriptive message",
                  "done": true
                },
                {
                  "name": "Test project missing projectPath: throws error",
                  "done": true
                },
                {
                  "name": "**Success:** All tests pass",
                  "done": true
                },
                {
                  "name": "Create `packages/electron/src/main/ipc/appStateHandlers.ts`",
                  "done": true
                },
                {
                  "name": "Export `registerAppStateHandlers(storageService: FileStorageService)` function",
                  "done": true
                },
                {
                  "name": "Register `app-state:get` handler: reads `app-state.json` via `storageService.read()`, parses JSON, returns `AppState`...",
                  "done": true
                },
                {
                  "name": "Register `app-state:update` handler: reads current state, merges `Partial<AppState>` updates, writes back via `storag...",
                  "done": true
                },
                {
                  "name": "Define `AppState` interface (reuse from existing `src/services/storage/types/AppState.ts` — move type to a shared loc...",
                  "done": true
                },
                {
                  "name": "**Success:** File compiles, both handlers registered",
                  "done": true
                },
                {
                  "name": "Create `packages/electron/tests/unit/main/ipc/appStateHandlers.test.ts`",
                  "done": true
                },
                {
                  "name": "Mock `FileStorageService` read/write methods",
                  "done": true
                },
                {
                  "name": "Test `app-state:get` returns parsed state from file",
                  "done": true
                },
                {
                  "name": "Test `app-state:get` returns default state when file doesn't exist",
                  "done": true
                },
                {
                  "name": "Test `app-state:update` merges partial updates with existing state",
                  "done": true
                },
                {
                  "name": "**Success:** All tests pass",
                  "done": true
                },
                {
                  "name": "Modify `packages/electron/src/main/main.ts`",
                  "done": true
                },
                {
                  "name": "Import `FileProjectStore`, `FileStorageService`, `getStoragePath` from `@context-forge/core/node`",
                  "done": true
                },
                {
                  "name": "Initialize `FileProjectStore` instance at app startup (using `getStoragePath()`)",
                  "done": true
                },
                {
                  "name": "Initialize `FileStorageService` instance for app state",
                  "done": true
                },
                {
                  "name": "Import and call `registerProjectHandlers(store)`, `registerContextHandlers(store)`, `registerAppStateHandlers(storage...",
                  "done": true
                },
                {
                  "name": "Keep existing old handlers registered (coexistence — both old and new channels work)",
                  "done": true
                },
                {
                  "name": "**Success:** `pnpm build` succeeds across workspace. App launches and old functionality still works. New handlers are...",
                  "done": true
                },
                {
                  "name": "Git add and commit all Phase 1 files (new handlers, tests, main.ts changes)",
                  "done": true
                },
                {
                  "name": "**Success:** Clean commit with all Phase 1 work, build passes",
                  "done": true
                },
                {
                  "name": "Modify `packages/electron/src/preload/preload.ts`",
                  "done": true
                },
                {
                  "name": "Add new channel bindings via `contextBridge.exposeInMainWorld`:",
                  "done": true
                },
                {
                  "name": "`project: { list, get, create, update, delete }` — each calls `ipcRenderer.invoke('project:...')`",
                  "done": true
                },
                {
                  "name": "`context: { generate }` — calls `ipcRenderer.invoke('context:generate', ...)`",
                  "done": true
                },
                {
                  "name": "`appState: { get, update }` — calls `ipcRenderer.invoke('app-state:...')`",
                  "done": true
                },
                {
                  "name": "Keep existing bindings intact for now (old and new coexist)",
                  "done": true
                },
                {
                  "name": "**Success:** Preload exposes both old and new API surfaces. Build passes.",
                  "done": true
                },
                {
                  "name": "Create `packages/electron/src/services/api.ts`",
                  "done": true
                },
                {
                  "name": "Define typed API objects: `projectApi`, `contextApi`, `appStateApi`",
                  "done": true
                },
                {
                  "name": "Each method calls through `window.electronAPI.project.*`, `window.electronAPI.context.*`, `window.electronAPI.appStat...",
                  "done": true
                },
                {
                  "name": "Import types from `@context-forge/core` (`ProjectData`, `CreateProjectData`, `UpdateProjectData`)",
                  "done": true
                },
                {
                  "name": "Define `ContextOverrides` type (import or re-export from contextHandlers if shared, or define locally)",
                  "done": true
                },
                {
                  "name": "Update global type declarations for `window.electronAPI` to include new API surface (likely in `StorageClient.ts` or ...",
                  "done": true
                },
                {
                  "name": "**Success:** `api.ts` compiles with full type safety. No runtime usage yet.",
                  "done": true
                },
                {
                  "name": "Git add and commit Phase 2 files (preload changes, api.ts)",
                  "done": true
                },
                {
                  "name": "**Success:** Clean commit, build passes",
                  "done": true
                },
                {
                  "name": "Modify `packages/electron/src/hooks/useContextGeneration.ts`",
                  "done": true
                },
                {
                  "name": "Replace import of `createSystemPromptParser`, `createStatementManager` from `ServiceFactory` with import of `contextA...",
                  "done": true
                },
                {
                  "name": "Remove imports of `ContextTemplateEngine`, `ContextIntegrator`, `SectionBuilder` from core (no longer used in renderer)",
                  "done": true
                },
                {
                  "name": "Simplify hook: single `contextApi.generate(projectId, overrides)` call replaces local pipeline orchestration",
                  "done": true
                },
                {
                  "name": "Maintain same return interface: `{ contextString, isLoading, error, regenerate }`",
                  "done": true
                },
                {
                  "name": "Hook signature changes from accepting project data to accepting `projectId: string | null`",
                  "done": true
                },
                {
                  "name": "**Success:** Hook compiles, same return type, uses IPC instead of local orchestration",
                  "done": true
                },
                {
                  "name": "Create or update test at `packages/electron/tests/unit/hooks/useContextGeneration.test.ts`",
                  "done": true
                },
                {
                  "name": "Mock `window.electronAPI.context.generate` via vi.fn()",
                  "done": true
                },
                {
                  "name": "Test loading state transitions: idle → loading → success",
                  "done": true
                },
                {
                  "name": "Test error state: mock rejects → error string populated",
                  "done": true
                },
                {
                  "name": "Test regenerate with overrides: verify overrides passed through",
                  "done": true
                },
                {
                  "name": "Test null projectId: regenerate is no-op",
                  "done": true
                },
                {
                  "name": "**Success:** All tests pass",
                  "done": true
                },
                {
                  "name": "Modify `packages/electron/src/components/ContextBuilderApp.tsx`",
                  "done": true
                },
                {
                  "name": "Replace `PersistentProjectStore` import with `projectApi` and `appStateApi` from `services/api`",
                  "done": true
                },
                {
                  "name": "Replace `ProjectManager` import with direct `projectApi` calls",
                  "done": true
                },
                {
                  "name": "Update project loading: `projectApi.list()` instead of `projectManager.loadAllProjects()`",
                  "done": true
                },
                {
                  "name": "Update project creation: `projectApi.create(data)` instead of `projectManager.createNewProject(data)`",
                  "done": true
                },
                {
                  "name": "Update project switching: `projectApi.get(id)` + `appStateApi.update({ lastActiveProjectId: id })` instead of `projec...",
                  "done": true
                },
                {
                  "name": "Update project deletion: `projectApi.delete(id)` instead of `projectManager.deleteProject(id)`",
                  "done": true
                },
                {
                  "name": "Update project updates/auto-save: `projectApi.update(id, changes)` instead of `persistentStore.saveProject(project)`",
                  "done": true
                },
                {
                  "name": "Update app state: `appStateApi.get()` / `appStateApi.update()` instead of `persistentStore.getAppState()` / `persiste...",
                  "done": true
                },
                {
                  "name": "Update `useContextGeneration` call to pass `projectId` instead of full project data",
                  "done": true
                },
                {
                  "name": "Evaluate `app:flush-save` handler: if all writes are `await`ed IPC calls, flush may be unnecessary. Remove or simplify.",
                  "done": true
                },
                {
                  "name": "**Success:** Component compiles, all project workflows function via new API",
                  "done": true
                },
                {
                  "name": "Run `pnpm build` — must succeed",
                  "done": true
                },
                {
                  "name": "Run all existing tests — note any failures from updated interfaces",
                  "done": true
                },
                {
                  "name": "Fix test failures caused by interface changes in ContextBuilderApp or useContextGeneration",
                  "done": true
                },
                {
                  "name": "**Success:** Build succeeds, all non-deleted-module tests pass",
                  "done": true
                },
                {
                  "name": "Git add and commit Phase 3 files",
                  "done": true
                },
                {
                  "name": "**Success:** Clean commit, build passes",
                  "done": true
                },
                {
                  "name": "Delete the following files from `packages/electron/src/`:",
                  "done": true
                },
                {
                  "name": "`services/storage/StorageClient.ts`",
                  "done": true
                },
                {
                  "name": "`services/storage/ElectronStorageService.ts`",
                  "done": true
                },
                {
                  "name": "`services/storage/PersistentProjectStore.ts`",
                  "done": true
                },
                {
                  "name": "`services/storage/StorageService.ts`",
                  "done": true
                },
                {
                  "name": "`services/project/ProjectManager.ts`",
                  "done": true
                },
                {
                  "name": "`services/context/StatementManagerIPC.ts`",
                  "done": true
                },
                {
                  "name": "`services/context/SystemPromptParserIPC.ts`",
                  "done": true
                },
                {
                  "name": "`services/context/ServiceFactory.ts`",
                  "done": true
                },
                {
                  "name": "Update or replace `services/context/index.ts` — if any re-exports from core are still needed by other renderer files,...",
                  "done": true
                },
                {
                  "name": "Verify no remaining imports reference deleted files (TypeScript build will catch this)",
                  "done": true
                },
                {
                  "name": "**Success:** Files deleted, `pnpm build` succeeds",
                  "done": true
                },
                {
                  "name": "Delete test files for removed modules from `packages/electron/tests/`:",
                  "done": true
                },
                {
                  "name": "`unit/services/storage/StorageClient.test.ts`",
                  "done": true
                },
                {
                  "name": "`unit/services/storage/ElectronStorageService.test.ts`",
                  "done": true
                },
                {
                  "name": "`unit/services/storage/integration.test.ts` (if it tests old storage stack)",
                  "done": true
                },
                {
                  "name": "`unit/services/project/ProjectManager.test.ts`",
                  "done": true
                },
                {
                  "name": "`unit/services/context/IPCIntegration.test.ts` (if it tests old IPC wrappers)",
                  "done": true
                },
                {
                  "name": "Review remaining test files: `ContextGenerator.test.ts`, `ContextIntegrator.test.ts`, `TemplateProcessor.test.ts` — t...",
                  "done": true
                },
                {
                  "name": "**Success:** No test references to deleted modules, `pnpm test:run` passes for remaining tests",
                  "done": true
                },
                {
                  "name": "Remove old IPC handlers from `main.ts` or `contextServices.ts`:",
                  "done": true
                },
                {
                  "name": "`storage:read`, `storage:write`, `storage:backup`, `storage:list-backups` handlers",
                  "done": true
                },
                {
                  "name": "`statements:load`, `statements:save`, `statements:get`, `statements:update` handlers",
                  "done": true
                },
                {
                  "name": "`systemPrompts:parse`, `systemPrompts:getContextInit`, `systemPrompts:getToolUse`, `systemPrompts:getForInstruction` ...",
                  "done": true
                },
                {
                  "name": "Delete `src/main/ipc/contextServices.ts` if all its handlers are removed",
                  "done": true
                },
                {
                  "name": "Remove old channel bindings from `preload.ts` (the `storage`, `statements`, `systemPrompts` sections)",
                  "done": true
                },
                {
                  "name": "Clean up global type declarations: remove old `window.electronAPI` shape for deleted channels",
                  "done": true
                },
                {
                  "name": "**Success:** Only new domain-level IPC channels remain. Build passes.",
                  "done": true
                },
                {
                  "name": "Run `pnpm build` across full workspace",
                  "done": true
                },
                {
                  "name": "Run `pnpm --filter @context-forge/electron test:run` — all remaining tests pass",
                  "done": true
                },
                {
                  "name": "Verify success criteria from slice design:",
                  "done": true
                },
                {
                  "name": "No renderer code imports from `@context-forge/core/node`",
                  "done": true
                },
                {
                  "name": "All IPC channels are domain-level operations",
                  "done": true
                },
                {
                  "name": "`StatementManagerIPC`, `SystemPromptParserIPC`, `ServiceFactory`, `ElectronStorageService`, `PersistentProjectStore`,...",
                  "done": true
                },
                {
                  "name": "Unit tests exist for all new IPC handler modules",
                  "done": true
                },
                {
                  "name": "Git add and commit cleanup",
                  "done": true
                },
                {
                  "name": "**Success:** Clean commit, build passes, all tests pass, slice complete",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "149",
            "name": "integration-core-test",
            "status": "complete",
            "dateCreated": "20260222",
            "dateUpdated": "20260222",
            "tasks": {
              "index": "149",
              "name": "tasks.integration-core-test",
              "status": "complete",
              "taskCount": 62,
              "completedTasks": 52,
              "dateCreated": "20260222",
              "dateUpdated": "20260222",
              "items": [
                {
                  "name": "**Task 1: Create shared test helper module** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "No `any` types",
                  "done": false
                },
                {
                  "name": "Each factory returns a fully valid object (no missing required fields)",
                  "done": false
                },
                {
                  "name": "File compiles with `pnpm build` in `packages/core`",
                  "done": false
                },
                {
                  "name": "**Task 2: Expand test fixture for StatementManager format** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Fixture parses correctly when loaded by `StatementManager`",
                  "done": false
                },
                {
                  "name": "Existing pipeline-integration tests still pass (`pnpm test` in `packages/core`)",
                  "done": false
                },
                {
                  "name": "**Task 3: Expand prompt fixture for instruction-matching tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "File retains valid YAML frontmatter",
                  "done": false
                },
                {
                  "name": "At least 6 `#####` sections present for comprehensive instruction-matching tests",
                  "done": false
                },
                {
                  "name": "Existing pipeline-integration tests still pass",
                  "done": false
                },
                {
                  "name": "**Task 4: Commit — test infrastructure** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit with descriptive message",
                  "done": false
                },
                {
                  "name": "All existing tests pass",
                  "done": false
                },
                {
                  "name": "**Task 5: TemplateProcessor tests** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All public methods of `TemplateProcessor` have at least one test",
                  "done": true
                },
                {
                  "name": "Tests pass with `pnpm test` in `packages/core`",
                  "done": true
                },
                {
                  "name": "No `any` types in test code",
                  "done": true
                },
                {
                  "name": "**Task 6: Commit — TemplateProcessor tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit, all tests pass",
                  "done": true
                },
                {
                  "name": "**Task 7: SystemPromptParser tests** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All public methods have at least one test",
                  "done": true
                },
                {
                  "name": "Caching behavior verified (second call cached, file change invalidates)",
                  "done": true
                },
                {
                  "name": "Tests pass, no `any` types",
                  "done": true
                },
                {
                  "name": "**Task 8: StatementManager tests** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All public methods have at least one test",
                  "done": true
                },
                {
                  "name": "Default fallback behavior verified (missing file → `DEFAULT_STATEMENTS`)",
                  "done": true
                },
                {
                  "name": "Tests pass, no `any` types",
                  "done": true
                },
                {
                  "name": "**Task 9: ProjectPathService tests** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All public methods have at least one test",
                  "done": true
                },
                {
                  "name": "Security checks verified (null chars, `..` traversal rejected)",
                  "done": true
                },
                {
                  "name": "Tests pass, no `any` types",
                  "done": true
                },
                {
                  "name": "**Task 10: Commit — filesystem service tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit, all tests pass",
                  "done": true
                },
                {
                  "name": "**Task 11: SectionBuilder tests** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All public methods have at least one test",
                  "done": true
                },
                {
                  "name": "Mock injection pattern works cleanly (no module-level `vi.mock()`)",
                  "done": true
                },
                {
                  "name": "Tests pass, no `any` types",
                  "done": true
                },
                {
                  "name": "**Task 12: Commit — SectionBuilder tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit, all tests pass",
                  "done": true
                },
                {
                  "name": "**Task 13: ContextTemplateEngine tests** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All public methods have at least one test",
                  "done": true
                },
                {
                  "name": "Conditional section inclusion verified",
                  "done": true
                },
                {
                  "name": "Tests pass, no `any` types",
                  "done": true
                },
                {
                  "name": "**Task 14: ContextIntegrator tests** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All public methods have at least one test",
                  "done": true
                },
                {
                  "name": "Legacy fallback behavior verified",
                  "done": true
                },
                {
                  "name": "Tests pass, no `any` types",
                  "done": true
                },
                {
                  "name": "**Task 15: CoreServiceFactory tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Pipeline creation succeeds with fixture project path",
                  "done": true
                },
                {
                  "name": "Generated context contains expected project name and structure",
                  "done": true
                },
                {
                  "name": "Tests pass, no `any` types",
                  "done": true
                },
                {
                  "name": "**Task 16: Commit — integration service tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit, all tests pass",
                  "done": true
                },
                {
                  "name": "**Task 17: Full test suite verification** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "All tests pass",
                  "done": true
                },
                {
                  "name": "No Electron dependencies in test imports",
                  "done": true
                },
                {
                  "name": "No `any` types in test code",
                  "done": true
                },
                {
                  "name": "Workspace builds clean",
                  "done": true
                },
                {
                  "name": "**Task 18: Final commit and DEVLOG update** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "DEVLOG updated with implementation summary",
                  "done": true
                },
                {
                  "name": "All work committed",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "150",
            "name": "mcp-integration-test",
            "status": "not-started",
            "dateCreated": "20260222",
            "dateUpdated": "20260222",
            "tasks": {
              "index": "150",
              "name": "tasks.mcp-integration-test",
              "status": "complete",
              "taskCount": 61,
              "completedTasks": 61,
              "dateCreated": "20260223",
              "dateUpdated": "20260223",
              "items": [
                {
                  "name": "**Task 1: Create fixture project directory and files** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "Directory structure matches slice design diagram",
                  "done": true
                },
                {
                  "name": "`projects.json` is valid JSON with all required `ProjectData` fields",
                  "done": true
                },
                {
                  "name": "Statement and prompt files parse correctly (verified in Task 3)",
                  "done": true
                },
                {
                  "name": "**Task 2: Create integration test helper module** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "No `any` types",
                  "done": true
                },
                {
                  "name": "`createIntegrationClient` registers all 3 tool groups",
                  "done": true
                },
                {
                  "name": "`setupFixtureEnv` produces a temp dir with patched absolute path",
                  "done": true
                },
                {
                  "name": "File compiles with `pnpm build` in `packages/mcp-server`",
                  "done": true
                },
                {
                  "name": "**Task 3: Smoke test — verify fixture + helper wiring** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Smoke test passes with `pnpm test` in `packages/mcp-server`",
                  "done": true
                },
                {
                  "name": "Existing 31 unit tests still pass",
                  "done": true
                },
                {
                  "name": "No `vi.mock()` on `@context-forge/core` in the integration test file",
                  "done": true
                },
                {
                  "name": "**Task 4: Commit — test infrastructure and smoke test** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit with descriptive message",
                  "done": true
                },
                {
                  "name": "All tests pass (unit + integration)",
                  "done": true
                },
                {
                  "name": "**Task 5: `project_list` integration tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "All `project_list` tests pass",
                  "done": true
                },
                {
                  "name": "Assertions verify actual field values against fixture data",
                  "done": true
                },
                {
                  "name": "**Task 6: `project_get` integration tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "All `project_get` tests pass",
                  "done": true
                },
                {
                  "name": "Error case verifies `isError: true` in response",
                  "done": true
                },
                {
                  "name": "**Task 7: `project_update` integration tests** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All `project_update` tests pass",
                  "done": true
                },
                {
                  "name": "Mutation tests clean up after themselves",
                  "done": true
                },
                {
                  "name": "Read-back verification confirms persistence",
                  "done": true
                },
                {
                  "name": "**Task 8: Commit — project tool integration tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit with descriptive message",
                  "done": true
                },
                {
                  "name": "All tests pass",
                  "done": true
                },
                {
                  "name": "**Task 9: `context_build` integration tests** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All `context_build` tests pass",
                  "done": true
                },
                {
                  "name": "Output verified to contain fixture project markers",
                  "done": true
                },
                {
                  "name": "Override parameters produce observable changes in output",
                  "done": true
                },
                {
                  "name": "**Task 10: `template_preview` integration tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "All `template_preview` tests pass",
                  "done": true
                },
                {
                  "name": "Output structure matches `context_build` expectations",
                  "done": true
                },
                {
                  "name": "**Task 11: `prompt_list` integration tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "All `prompt_list` tests pass",
                  "done": true
                },
                {
                  "name": "Template count matches fixture file sections",
                  "done": true
                },
                {
                  "name": "**Task 12: `prompt_get` integration tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "All `prompt_get` tests pass",
                  "done": true
                },
                {
                  "name": "Error case returns `isError: true`",
                  "done": true
                },
                {
                  "name": "**Task 13: Commit — context tool integration tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit with descriptive message",
                  "done": true
                },
                {
                  "name": "All tests pass",
                  "done": true
                },
                {
                  "name": "**Task 14: `context_summarize` integration tests** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All `context_summarize` tests pass",
                  "done": true
                },
                {
                  "name": "Mutation tests clean up after themselves",
                  "done": true
                },
                {
                  "name": "Read-back verification confirms persistence",
                  "done": true
                },
                {
                  "name": "**Task 15: Commit — state tool integration tests** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit with descriptive message",
                  "done": true
                },
                {
                  "name": "All tests pass",
                  "done": true
                },
                {
                  "name": "**Task 16: Full test suite verification** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "All MCP server tests pass (unit + integration)",
                  "done": true
                },
                {
                  "name": "Workspace builds clean",
                  "done": true
                },
                {
                  "name": "No `vi.mock()` on core in integration tests",
                  "done": true
                },
                {
                  "name": "Fixture is self-contained",
                  "done": true
                },
                {
                  "name": "**Task 17: Final commit and DEVLOG update** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "DEVLOG updated with Phase 7 completion",
                  "done": true
                },
                {
                  "name": "Clean commit",
                  "done": true
                },
                {
                  "name": "All tests pass",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "151",
            "name": "documentation-and-packaging",
            "status": "not-started",
            "dateCreated": "20260223",
            "dateUpdated": "20260223",
            "tasks": {
              "index": "151",
              "name": "tasks.documentation-and-packaging",
              "status": "complete",
              "taskCount": 50,
              "completedTasks": 50,
              "dateCreated": "20260223",
              "dateUpdated": "20260223",
              "items": [
                {
                  "name": "**Task 1: Create `docs/TOOLS.md` — full tool reference** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "All 8 tools documented with complete parameter tables",
                  "done": true
                },
                {
                  "name": "Descriptions match the actual tool registration descriptions in source",
                  "done": true
                },
                {
                  "name": "File is valid markdown with consistent formatting",
                  "done": true
                },
                {
                  "name": "**Task 2: Commit — tool reference** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit with descriptive message",
                  "done": true
                },
                {
                  "name": "**Task 3: Create `packages/mcp-server/README.md`** (Effort: 3/5)",
                  "done": true
                },
                {
                  "name": "README exists at `packages/mcp-server/README.md`",
                  "done": true
                },
                {
                  "name": "Contains all 10 sections listed above",
                  "done": true
                },
                {
                  "name": "Claude Code and Cursor config examples are valid JSON",
                  "done": true
                },
                {
                  "name": "Tool overview table lists all 8 tools",
                  "done": true
                },
                {
                  "name": "Links to `docs/TOOLS.md` for detailed reference",
                  "done": true
                },
                {
                  "name": "Mentions ai-project-guide dependency with link and bootstrap command",
                  "done": true
                },
                {
                  "name": "**Task 4: Commit — MCP server README** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit with descriptive message",
                  "done": true
                },
                {
                  "name": "**Task 5: Create `packages/core/README.md`** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "README exists at `packages/core/README.md`",
                  "done": true
                },
                {
                  "name": "Documents both export paths with examples",
                  "done": true
                },
                {
                  "name": "Lists key services with brief descriptions",
                  "done": true
                },
                {
                  "name": "Explains monorepo role",
                  "done": true
                },
                {
                  "name": "**Task 6: Commit — core README** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit with descriptive message",
                  "done": true
                },
                {
                  "name": "**Task 7: Update root `README.md`** (Effort: 2/5)",
                  "done": true
                },
                {
                  "name": "No references to MCP server being \"scaffolded\" or \"not yet functional\"",
                  "done": true
                },
                {
                  "name": "\"What works\" includes MCP server",
                  "done": true
                },
                {
                  "name": "\"In progress\" and \"Planned\" reflect actual current state",
                  "done": true
                },
                {
                  "name": "MCP callout with link to mcp-server README is present",
                  "done": true
                },
                {
                  "name": "Quick Start includes MCP alternative",
                  "done": true
                },
                {
                  "name": "**Task 8: Commit — root README update** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit with descriptive message",
                  "done": true
                },
                {
                  "name": "**Task 9: Update `packages/mcp-server/package.json` — publishing metadata** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "`\"private\"` field removed or set to `false`",
                  "done": true
                },
                {
                  "name": "All metadata fields present and correct",
                  "done": true
                },
                {
                  "name": "`pnpm build` passes",
                  "done": true
                },
                {
                  "name": "`pnpm test` passes in `packages/mcp-server`",
                  "done": true
                },
                {
                  "name": "**Task 10: Update `packages/core/package.json` — publishing metadata** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "`\"private\"` field removed or set to `false`",
                  "done": true
                },
                {
                  "name": "All metadata fields present and correct",
                  "done": true
                },
                {
                  "name": "`pnpm build` passes",
                  "done": true
                },
                {
                  "name": "`pnpm test` passes in `packages/core`",
                  "done": true
                },
                {
                  "name": "**Task 11: Commit — package.json publishing metadata** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Clean commit with descriptive message",
                  "done": true
                },
                {
                  "name": "**Task 12: Full verification** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "Workspace builds clean",
                  "done": true
                },
                {
                  "name": "All tests pass",
                  "done": true
                },
                {
                  "name": "All document links are correct",
                  "done": true
                },
                {
                  "name": "**Task 13: DEVLOG update and final commit** (Effort: 1/5)",
                  "done": true
                },
                {
                  "name": "DEVLOG updated with slice 151 entry",
                  "done": true
                },
                {
                  "name": "Clean final commit",
                  "done": true
                },
                {
                  "name": "All tests pass",
                  "done": true
                }
              ]
            }
          }
        ],
        "features": [],
        "arch": {
          "index": "140",
          "name": "context-forge-restructure",
          "status": "in-progress",
          "dateCreated": "20260214",
          "dateUpdated": "20260215"
        },
        "slicePlan": {
          "index": "140",
          "name": "context-forge-restructure",
          "status": "not-started",
          "dateCreated": "20260214",
          "dateUpdated": "20260217",
          "futureWork": []
        }
      },
      "780": {
        "name": "Future Guide Management",
        "slices": [],
        "features": [],
        "slicePlan": {
          "index": "780",
          "name": "future.guide-management",
          "status": "not-started",
          "futureWork": []
        }
      }
    },
    "futureSlices": [
      {
        "index": "750",
        "name": "auto-index-resolution",
        "status": "not-started",
        "dateCreated": "20260212",
        "dateUpdated": "20260213",
        "parent": "140"
      },
      {
        "index": "751",
        "name": "project-monorepo",
        "status": "not-started",
        "dateCreated": "20250925",
        "dateUpdated": "20250925",
        "parent": "140"
      },
      {
        "index": "754",
        "name": "add-date",
        "status": "not-started",
        "dateCreated": "20251005",
        "dateUpdated": "20251004",
        "parent": "140"
      },
      {
        "index": "755",
        "name": "naming-schema-controls",
        "status": "in-progress",
        "dateCreated": "20251006",
        "dateUpdated": "20251007",
        "parent": "140"
      },
      {
        "index": "756",
        "name": "projects-versioned-backup",
        "status": "not-started",
        "dateCreated": "20260214",
        "dateUpdated": "20260214",
        "parent": "140"
      },
      {
        "index": "752",
        "name": "dynamic-phase-options",
        "status": "not-started",
        "dateCreated": "20260207",
        "dateUpdated": "20260207",
        "parent": "140"
      },
      {
        "index": "753",
        "name": "undo",
        "status": "not-started",
        "dateCreated": "20251022",
        "dateUpdated": "20251022",
        "parent": "140"
      }
    ],
    "quality": [],
    "investigation": [],
    "maintenance": [
      {
        "index": "900",
        "name": "add-date",
        "status": "in-progress",
        "dateCreated": "20251004",
        "dateUpdated": "20251004",
        "taskCount": 42,
        "completedTasks": 13
      },
      {
        "index": "900",
        "name": "maintenance",
        "status": "complete",
        "dateCreated": "20250916",
        "dateUpdated": "20250918",
        "taskCount": 60,
        "completedTasks": 57
      },
      {
        "index": "900",
        "name": "naming-schema-controls",
        "status": "in-progress",
        "dateCreated": "20251008",
        "dateUpdated": "20251008",
        "taskCount": 226,
        "completedTasks": 118
      },
      {
        "index": "900",
        "name": "test-infrastructure-deferred",
        "status": "not-started",
        "dateCreated": "20260207",
        "dateUpdated": "20260207",
        "taskCount": 6,
        "completedTasks": 0
      },
      {
        "index": "999",
        "name": "maintenance-ongoing",
        "status": "not-started",
        "dateCreated": "20260213",
        "dateUpdated": "20260218",
        "taskCount": 10,
        "completedTasks": 2
      }
    ],
    "devlog": true
  },
  "orchestration": {
    "name": "Orchestration",
    "description": "",
    "foundation": [],
    "projectArchitecture": [
      {
        "index": "050",
        "name": "hld-orchestration",
        "status": "in-progress",
        "dateCreated": "20260218",
        "dateUpdated": "20260219",
        "type": "hld"
      }
    ],
    "initiatives": {
      "100": {
        "name": "Orchestration V2",
        "slices": [
          {
            "index": "100",
            "name": "foundation",
            "status": "complete",
            "dateCreated": "20260218",
            "dateUpdated": "20260219",
            "tasks": {
              "index": "100",
              "name": "tasks.foundation-migration",
              "status": "complete",
              "taskCount": 265,
              "completedTasks": 265,
              "dateCreated": "20260219",
              "dateUpdated": "20260219",
              "items": [
                {
                  "name": "Run `uv add claude-agent-sdk`",
                  "done": true
                },
                {
                  "name": "Verify `uv sync` completes without errors",
                  "done": true
                },
                {
                  "name": "Verify the package is importable: `python -c \"import claude_agent_sdk\"` (or check the actual import name — the packag...",
                  "done": true
                },
                {
                  "name": "`claude-agent-sdk` appears in `pyproject.toml` dependencies",
                  "done": true
                },
                {
                  "name": "`uv sync` succeeds",
                  "done": true
                },
                {
                  "name": "The package is importable from the virtual environment",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/providers/sdk/__init__.py` — stub with docstring: \"SDK Agent Provider using claude-agent-sd...",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/providers/sdk/provider.py` — stub with docstring: \"SDKAgentProvider implementation. Creates...",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/providers/sdk/agent.py` — stub with docstring: \"SDKAgent implementation. Wraps claude-agent...",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/providers/anthropic/__init__.py` — stub with docstring: \"Anthropic API Provider using anthr...",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/providers/anthropic/provider.py` — stub with docstring: \"AnthropicAPIProvider implementatio...",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/providers/anthropic/agent.py` — stub with docstring: \"AnthropicAPIAgent implementation. Wra...",
                  "done": true
                },
                {
                  "name": "Verify all new stubs are importable:",
                  "done": true
                },
                {
                  "name": "Both subdirectories exist with `__init__.py`, `provider.py`, and `agent.py`",
                  "done": true
                },
                {
                  "name": "All stub modules contain descriptive docstrings",
                  "done": true
                },
                {
                  "name": "All stubs are importable",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/providers/errors.py`",
                  "done": true
                },
                {
                  "name": "Define exception classes:",
                  "done": true
                },
                {
                  "name": "Export all error classes from `src/orchestration/providers/__init__.py`",
                  "done": true
                },
                {
                  "name": "`from orchestration.providers.errors import ProviderError, ProviderAuthError, ProviderAPIError, ProviderTimeoutError`...",
                  "done": true
                },
                {
                  "name": "`ProviderAuthError` and `ProviderAPIError` are subclasses of `ProviderError`",
                  "done": true
                },
                {
                  "name": "`ProviderAPIError` accepts optional `status_code`",
                  "done": true
                },
                {
                  "name": "Rename the `Agent` class to `AgentConfig`",
                  "done": true
                },
                {
                  "name": "Update `AgentConfig` fields to:",
                  "done": true
                },
                {
                  "name": "Remove the `ProviderConfig` class entirely",
                  "done": true
                },
                {
                  "name": "Remove `id`, `state`, and `created_at` from the config model — these are runtime state, now tracked by the Agent Prot...",
                  "done": true
                },
                {
                  "name": "Update `__init__.py` exports in `orchestration/core/models.py` if there are any `__all__` definitions",
                  "done": true
                },
                {
                  "name": "Update any imports in other files that reference `Agent` or `ProviderConfig` from models (check `providers/registry.p...",
                  "done": true
                },
                {
                  "name": "`from orchestration.core.models import AgentConfig` works",
                  "done": true
                },
                {
                  "name": "`from orchestration.core.models import Agent` raises ImportError (name is freed for Protocol)",
                  "done": true
                },
                {
                  "name": "`from orchestration.core.models import ProviderConfig` raises ImportError (removed)",
                  "done": true
                },
                {
                  "name": "`AgentConfig(name=\"test\", agent_type=\"sdk\", provider=\"sdk\")` validates successfully",
                  "done": true
                },
                {
                  "name": "`AgentConfig(name=\"test\", agent_type=\"api\", provider=\"anthropic\", model=\"claude-sonnet-4-20250514\")` validates succes...",
                  "done": true
                },
                {
                  "name": "`AgentState`, `MessageType`, `TopologyType` enums are unchanged",
                  "done": true
                },
                {
                  "name": "`Message` and `TopologyConfig` models are unchanged",
                  "done": true
                },
                {
                  "name": "Remove all tests for the old `Agent` Pydantic model (creation, defaults, validation)",
                  "done": true
                },
                {
                  "name": "Remove all tests for `ProviderConfig`",
                  "done": true
                },
                {
                  "name": "Add tests for `AgentConfig`:",
                  "done": true
                },
                {
                  "name": "Verify existing enum tests (`AgentState`, `MessageType`, `TopologyType`) still pass unchanged",
                  "done": true
                },
                {
                  "name": "Verify existing `Message` and `TopologyConfig` tests still pass unchanged",
                  "done": true
                },
                {
                  "name": "All model tests pass via `uv run pytest tests/test_models.py`",
                  "done": true
                },
                {
                  "name": "No references to old `Agent` model or `ProviderConfig` in test file",
                  "done": true
                },
                {
                  "name": "`AgentConfig` has full test coverage for required fields, optional fields, and serialization",
                  "done": true
                },
                {
                  "name": "Remove the `LLMProvider` Protocol class",
                  "done": true
                },
                {
                  "name": "Define the `Agent` Protocol:",
                  "done": true
                },
                {
                  "name": "Define the `AgentProvider` Protocol:",
                  "done": true
                },
                {
                  "name": "Ensure imports are correct: `AgentState` and `Message` from `orchestration.core.models`, `AgentConfig` from `orchestr...",
                  "done": true
                },
                {
                  "name": "Export both Protocols from `providers/__init__.py` if applicable",
                  "done": true
                },
                {
                  "name": "`from orchestration.providers.base import Agent, AgentProvider` works",
                  "done": true
                },
                {
                  "name": "`from orchestration.providers.base import LLMProvider` raises ImportError (removed)",
                  "done": true
                },
                {
                  "name": "Both are `Protocol` classes (structural typing)",
                  "done": true
                },
                {
                  "name": "`Agent` defines `name`, `agent_type`, `state` properties and `handle_message`, `shutdown` methods",
                  "done": true
                },
                {
                  "name": "`AgentProvider` defines `provider_type` property and `create_agent`, `validate_credentials` methods",
                  "done": true
                },
                {
                  "name": "Change the registry dict type from `dict[str, Callable]` to `dict[str, AgentProvider]`",
                  "done": true
                },
                {
                  "name": "Update `register_provider(name: str, provider: AgentProvider)` — accepts an `AgentProvider` instance, not a factory",
                  "done": true
                },
                {
                  "name": "Update `get_provider(name: str) -> AgentProvider` — returns the registered instance directly (no factory invocation, ...",
                  "done": true
                },
                {
                  "name": "`list_providers() -> list[str]` — unchanged",
                  "done": true
                },
                {
                  "name": "Update imports: replace `LLMProvider` / `ProviderConfig` references with `AgentProvider`",
                  "done": true
                },
                {
                  "name": "`register_provider(\"sdk\", some_provider_instance)` stores the instance",
                  "done": true
                },
                {
                  "name": "`get_provider(\"sdk\")` returns the stored `AgentProvider` instance",
                  "done": true
                },
                {
                  "name": "`get_provider(\"nonexistent\")` raises a clear error",
                  "done": true
                },
                {
                  "name": "`list_providers()` returns registered provider type names",
                  "done": true
                },
                {
                  "name": "No references to `LLMProvider`, `ProviderConfig`, or factory callables remain",
                  "done": true
                },
                {
                  "name": "Create a minimal mock class satisfying the `AgentProvider` Protocol (can use a simple class with `provider_type` prop...",
                  "done": true
                },
                {
                  "name": "Update registration test: register a mock `AgentProvider`, verify it's stored",
                  "done": true
                },
                {
                  "name": "Update lookup test: `get_provider` returns the registered instance directly",
                  "done": true
                },
                {
                  "name": "Update error test: `get_provider` for unregistered name raises error",
                  "done": true
                },
                {
                  "name": "Update listing test: `list_providers` returns names",
                  "done": true
                },
                {
                  "name": "Remove any tests that reference `LLMProvider`, `ProviderConfig`, or factory callables",
                  "done": true
                },
                {
                  "name": "All provider tests pass via `uv run pytest tests/test_providers.py`",
                  "done": true
                },
                {
                  "name": "Tests use mock `AgentProvider` instances, not factories",
                  "done": true
                },
                {
                  "name": "No references to old types remain",
                  "done": true
                },
                {
                  "name": "Add new fields to `Settings`:",
                  "done": true
                },
                {
                  "name": "Update `default_provider` default value from `\"anthropic\"` to `\"sdk\"` — SDK agents are now the primary provider",
                  "done": true
                },
                {
                  "name": "Keep all existing fields (`anthropic_api_key`, `log_level`, `log_format`, `host`, `port`, etc.)",
                  "done": true
                },
                {
                  "name": "`Settings()` produces valid defaults including `default_agent_type=\"sdk\"` and `default_provider=\"sdk\"`",
                  "done": true
                },
                {
                  "name": "`ORCH_ANTHROPIC_AUTH_TOKEN=test` is picked up",
                  "done": true
                },
                {
                  "name": "`ORCH_ANTHROPIC_BASE_URL=http://localhost:4000` is picked up",
                  "done": true
                },
                {
                  "name": "`ORCH_DEFAULT_AGENT_TYPE=api` overrides the default",
                  "done": true
                },
                {
                  "name": "All previously existing settings still work",
                  "done": true
                },
                {
                  "name": "Add test: `default_agent_type` defaults to `\"sdk\"`",
                  "done": true
                },
                {
                  "name": "Add test: `default_provider` defaults to `\"sdk\"`",
                  "done": true
                },
                {
                  "name": "Add test: `ORCH_ANTHROPIC_AUTH_TOKEN` env var is picked up",
                  "done": true
                },
                {
                  "name": "Add test: `ORCH_ANTHROPIC_BASE_URL` env var is picked up",
                  "done": true
                },
                {
                  "name": "Verify existing config tests still pass (update any that assert `default_provider == \"anthropic\"`)",
                  "done": true
                },
                {
                  "name": "All config tests pass via `uv run pytest tests/test_config.py`",
                  "done": true
                },
                {
                  "name": "New fields have test coverage",
                  "done": true
                },
                {
                  "name": "Add section header: `# Agent Defaults`",
                  "done": true
                },
                {
                  "name": "Add `ORCH_DEFAULT_AGENT_TYPE=sdk` with comment",
                  "done": true
                },
                {
                  "name": "Update `ORCH_DEFAULT_PROVIDER=sdk` (was `anthropic`)",
                  "done": true
                },
                {
                  "name": "Add to Anthropic section:",
                  "done": true
                },
                {
                  "name": "Keep all existing entries",
                  "done": true
                },
                {
                  "name": "`.env.example` documents all Settings fields including new ones",
                  "done": true
                },
                {
                  "name": "Comments explain purpose and defaults",
                  "done": true
                },
                {
                  "name": "Logical grouping is maintained",
                  "done": true
                },
                {
                  "name": "`core/message_bus.py` — update from \"Populated in slice 4\" to \"Populated in slice 5\"",
                  "done": true
                },
                {
                  "name": "`core/topology.py` — update from \"Populated in slice 10\" to \"Populated in slice 9\"",
                  "done": true
                },
                {
                  "name": "`core/supervisor.py` — update from \"Populated in slice 6\" to correct slice (supervisor is not a numbered slice in the...",
                  "done": true
                },
                {
                  "name": "`cli/__init__.py` — update from \"Populated in slice 5\" to \"Populated in slice 4\"",
                  "done": true
                },
                {
                  "name": "`server/__init__.py` — update from \"Populated in slice 14\" to \"Populated in slice 13\"",
                  "done": true
                },
                {
                  "name": "`mcp/__init__.py` — update from \"Populated in slice 13\" to \"Populated in slice 12\"",
                  "done": true
                },
                {
                  "name": "`adk/__init__.py` — update from \"Populated in slice 12\" to \"Populated in slice 11\"",
                  "done": true
                },
                {
                  "name": "`core/agent_registry.py` — verify it says \"Populated in slice 3\" (unchanged)",
                  "done": true
                },
                {
                  "name": "All stub docstrings reference correct slice numbers per `100-slices.orchestration-v2.md`",
                  "done": true
                },
                {
                  "name": "No stale slice number references remain",
                  "done": true
                },
                {
                  "name": "Run `uv run pytest` — all tests pass",
                  "done": true
                },
                {
                  "name": "Run `uv run ruff check src/ tests/` — no linting errors",
                  "done": true
                },
                {
                  "name": "Run `uv run ruff format --check src/ tests/` — formatting consistent",
                  "done": true
                },
                {
                  "name": "Run type checker — zero errors",
                  "done": true
                },
                {
                  "name": "Verify updated import paths work:",
                  "done": true
                },
                {
                  "name": "Verify old import paths are gone:",
                  "done": true
                },
                {
                  "name": "All tests pass",
                  "done": true
                },
                {
                  "name": "`ruff check` passes",
                  "done": true
                },
                {
                  "name": "`ruff format --check` passes",
                  "done": true
                },
                {
                  "name": "Type checking passes with zero errors",
                  "done": true
                },
                {
                  "name": "All new import paths verified working",
                  "done": true
                },
                {
                  "name": "All old import paths verified removed",
                  "done": true
                },
                {
                  "name": "Project is ready for slice 2 (SDK Agent Provider) to begin",
                  "done": true
                },
                {
                  "name": "Run `uv init` with src layout in the project root to create the Python project structure",
                  "done": true
                },
                {
                  "name": "Configure `pyproject.toml`:",
                  "done": true
                },
                {
                  "name": "Run `uv sync` to install all dependencies and create the lock file",
                  "done": true
                },
                {
                  "name": "Commit `uv.lock` to source control",
                  "done": true
                },
                {
                  "name": "`pyproject.toml` exists with all specified dependencies",
                  "done": true
                },
                {
                  "name": "`uv sync` completes without errors",
                  "done": true
                },
                {
                  "name": "`uv.lock` is generated and committed",
                  "done": true
                },
                {
                  "name": "Virtual environment is created and functional",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/__init__.py` with package version and top-level exports",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/py.typed` (empty marker file for type checking)",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/core/__init__.py`",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/core/agent_registry.py` — stub with docstring: \"Agent registry: spawn, track, and manage ag...",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/core/message_bus.py` — stub with docstring: \"Async pub/sub message bus for agent communicat...",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/core/topology.py` — stub with docstring: \"Communication topology manager. Populated in slic...",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/core/supervisor.py` — stub with docstring: \"Supervisor for agent health monitoring and rest...",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/providers/__init__.py`",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/adk/__init__.py` — stub with docstring: \"ADK integration bridge. Populated in slice 12.\"",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/cli/__init__.py` — stub with docstring: \"CLI commands via Typer. Populated in slice 5.\"",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/server/__init__.py` — stub with docstring: \"FastAPI REST + WebSocket server. Populated in s...",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/mcp/__init__.py` — stub with docstring: \"MCP server for tool exposure. Populated in slice 13.\"",
                  "done": true
                },
                {
                  "name": "All directories and `__init__.py` files exist per the package structure in the slice design",
                  "done": true
                },
                {
                  "name": "Every stub module contains a descriptive docstring of its future purpose",
                  "done": true
                },
                {
                  "name": "`py.typed` marker file exists",
                  "done": true
                },
                {
                  "name": "All stub modules are importable (e.g., `from orchestration.core import agent_registry` succeeds)",
                  "done": true
                },
                {
                  "name": "Create `tests/__init__.py` (if needed for imports)",
                  "done": true
                },
                {
                  "name": "Create `tests/conftest.py` with any shared fixtures (e.g., a `Settings` fixture with test defaults)",
                  "done": true
                },
                {
                  "name": "Verify pytest discovers and runs from the project root via `uv run pytest`",
                  "done": true
                },
                {
                  "name": "`tests/conftest.py` exists with at least one shared fixture",
                  "done": true
                },
                {
                  "name": "`uv run pytest` runs successfully (even with zero tests, it should not error)",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/core/models.py`",
                  "done": true
                },
                {
                  "name": "Add `from __future__ import annotations` at top",
                  "done": true
                },
                {
                  "name": "Define `AgentState(StrEnum)` with values: `idle`, `processing`, `restarting`, `failed`, `terminated`",
                  "done": true
                },
                {
                  "name": "Define `MessageType(StrEnum)` with values: `chat`, `system`, `command`",
                  "done": true
                },
                {
                  "name": "Define `TopologyType(StrEnum)` with values: `broadcast`, `filtered`, `hierarchical`, `custom`",
                  "done": true
                },
                {
                  "name": "All three enums are defined as `StrEnum` subclasses",
                  "done": true
                },
                {
                  "name": "`from orchestration.core.models import AgentState, MessageType, TopologyType` works",
                  "done": true
                },
                {
                  "name": "Enum values match the slice design specification exactly",
                  "done": true
                },
                {
                  "name": "Add the `Agent` model to `models.py` as a `BaseModel` subclass",
                  "done": true
                },
                {
                  "name": "Fields:",
                  "done": true
                },
                {
                  "name": "`Agent` model validates correctly with required fields (`name`, `instructions`, `provider`, `model`)",
                  "done": true
                },
                {
                  "name": "`id` is auto-generated as a UUID string when not provided",
                  "done": true
                },
                {
                  "name": "`state` defaults to `idle`",
                  "done": true
                },
                {
                  "name": "`created_at` defaults to current UTC time",
                  "done": true
                },
                {
                  "name": "Invalid `state` values are rejected by Pydantic validation",
                  "done": true
                },
                {
                  "name": "Add the `Message` model to `models.py` as a `BaseModel` subclass",
                  "done": true
                },
                {
                  "name": "Fields:",
                  "done": true
                },
                {
                  "name": "`Message` model validates correctly with required fields (`sender`, `recipients`, `content`)",
                  "done": true
                },
                {
                  "name": "`id` and `timestamp` are auto-generated when not provided",
                  "done": true
                },
                {
                  "name": "`message_type` defaults to `chat`",
                  "done": true
                },
                {
                  "name": "`metadata` defaults to empty dict",
                  "done": true
                },
                {
                  "name": "Invalid `message_type` values are rejected",
                  "done": true
                },
                {
                  "name": "Add the `ProviderConfig` model to `models.py`",
                  "done": true
                },
                {
                  "name": "Fields:",
                  "done": true
                },
                {
                  "name": "`ProviderConfig` validates with required fields (`provider`, `model`)",
                  "done": true
                },
                {
                  "name": "Optional fields default to `None` or empty dict as specified",
                  "done": true
                },
                {
                  "name": "Model serializes to JSON correctly",
                  "done": true
                },
                {
                  "name": "Add the `TopologyConfig` model to `models.py`",
                  "done": true
                },
                {
                  "name": "Fields:",
                  "done": true
                },
                {
                  "name": "`TopologyConfig` validates correctly",
                  "done": true
                },
                {
                  "name": "`topology_type` defaults to `broadcast`",
                  "done": true
                },
                {
                  "name": "`config` defaults to empty dict",
                  "done": true
                },
                {
                  "name": "Test `AgentState` enum values",
                  "done": true
                },
                {
                  "name": "Test `MessageType` enum values",
                  "done": true
                },
                {
                  "name": "Test `TopologyType` enum values",
                  "done": true
                },
                {
                  "name": "Test `Agent` creation with required fields, auto-generated `id`, default `state`, default `created_at`",
                  "done": true
                },
                {
                  "name": "Test `Agent` rejects invalid `state` values",
                  "done": true
                },
                {
                  "name": "Test `Message` creation with required fields, auto-generated `id` and `timestamp`, default `message_type`, default `m...",
                  "done": true
                },
                {
                  "name": "Test `Message` rejects invalid `message_type`",
                  "done": true
                },
                {
                  "name": "Test `ProviderConfig` creation with required and optional fields",
                  "done": true
                },
                {
                  "name": "Test `TopologyConfig` default values",
                  "done": true
                },
                {
                  "name": "Test JSON serialization/deserialization round-trip for each model",
                  "done": true
                },
                {
                  "name": "All model tests pass via `uv run pytest tests/test_models.py`",
                  "done": true
                },
                {
                  "name": "Tests cover all models and enums defined in the slice design",
                  "done": true
                },
                {
                  "name": "Edge cases (missing required fields, invalid enum values) are tested",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/providers/base.py`",
                  "done": true
                },
                {
                  "name": "Import `Protocol` from `typing`, `AsyncIterator` from `collections.abc`",
                  "done": true
                },
                {
                  "name": "Import `Message` from `orchestration.core.models`",
                  "done": true
                },
                {
                  "name": "Define `LLMProvider(Protocol)` with:",
                  "done": true
                },
                {
                  "name": "`from orchestration.providers.base import LLMProvider` works",
                  "done": true
                },
                {
                  "name": "`LLMProvider` is a `Protocol` class (structural typing, not ABC)",
                  "done": true
                },
                {
                  "name": "All method signatures match the slice design specification",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/providers/registry.py`",
                  "done": true
                },
                {
                  "name": "Define a module-level registry dict mapping `str` to factory callables",
                  "done": true
                },
                {
                  "name": "Implement `register_provider(name: str, factory: Callable)` — registers a factory function for a provider name",
                  "done": true
                },
                {
                  "name": "Implement `get_provider(name: str, config: ProviderConfig) -> LLMProvider` — looks up the factory by name, calls it w...",
                  "done": true
                },
                {
                  "name": "Implement `list_providers() -> list[str]` — returns registered provider names",
                  "done": true
                },
                {
                  "name": "`register_provider` adds a factory to the registry",
                  "done": true
                },
                {
                  "name": "`get_provider` retrieves and invokes the correct factory",
                  "done": true
                },
                {
                  "name": "`get_provider` raises `KeyError` (or similar clear error) for unregistered names",
                  "done": true
                },
                {
                  "name": "`list_providers` returns the list of registered names",
                  "done": true
                },
                {
                  "name": "Test `register_provider` adds a factory to the registry",
                  "done": true
                },
                {
                  "name": "Test `get_provider` invokes the correct factory with the given config",
                  "done": true
                },
                {
                  "name": "Test `get_provider` raises an error for unregistered provider names",
                  "done": true
                },
                {
                  "name": "Test `list_providers` returns registered names",
                  "done": true
                },
                {
                  "name": "All provider registry tests pass via `uv run pytest tests/test_providers.py`",
                  "done": true
                },
                {
                  "name": "Tests verify registration, lookup, and error handling",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/config.py`",
                  "done": true
                },
                {
                  "name": "Define `Settings(BaseSettings)` with `SettingsConfigDict(env_prefix=\"ORCH_\", env_file=\".env\")`",
                  "done": true
                },
                {
                  "name": "Fields:",
                  "done": true
                },
                {
                  "name": "`from orchestration.config import Settings` works",
                  "done": true
                },
                {
                  "name": "`Settings()` with no env vars produces valid defaults for all fields",
                  "done": true
                },
                {
                  "name": "`Settings()` with `ORCH_ANTHROPIC_API_KEY=test` picks up the value",
                  "done": true
                },
                {
                  "name": "`Settings()` reads from `.env` file when present",
                  "done": true
                },
                {
                  "name": "All env vars are prefixed with `ORCH_`",
                  "done": true
                },
                {
                  "name": "Test `Settings()` produces valid defaults for all fields",
                  "done": true
                },
                {
                  "name": "Test that setting `ORCH_ANTHROPIC_API_KEY` env var is picked up",
                  "done": true
                },
                {
                  "name": "Test that `ORCH_LOG_LEVEL` and `ORCH_LOG_FORMAT` are respected",
                  "done": true
                },
                {
                  "name": "Test that `ORCH_PORT` is parsed as an integer",
                  "done": true
                },
                {
                  "name": "All config tests pass via `uv run pytest tests/test_config.py`",
                  "done": true
                },
                {
                  "name": "Tests verify default values and env var overrides",
                  "done": true
                },
                {
                  "name": "Create `.env.example` in the project root",
                  "done": true
                },
                {
                  "name": "Document every `Settings` field with its `ORCH_`-prefixed env var name, a comment describing the purpose, and the def...",
                  "done": true
                },
                {
                  "name": "Include section headers for logical grouping (Provider Defaults, Anthropic, Logging, Server)",
                  "done": true
                },
                {
                  "name": "`.env.example` exists with all config variables documented",
                  "done": true
                },
                {
                  "name": "Every variable uses the `ORCH_` prefix",
                  "done": true
                },
                {
                  "name": "Comments describe purpose and default values",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/logging.py`",
                  "done": true
                },
                {
                  "name": "Implement a JSON formatter class that outputs structured JSON log lines (timestamp, level, name, message)",
                  "done": true
                },
                {
                  "name": "Implement `setup_logging(settings: Settings)` to configure the root logger based on `Settings.log_level` and `Setting...",
                  "done": true
                },
                {
                  "name": "Implement `get_logger(name: str) -> logging.Logger` that returns a named logger",
                  "done": true
                },
                {
                  "name": "`log_format = \"json\"` uses the JSON formatter; `log_format = \"text\"` uses standard text formatting",
                  "done": true
                },
                {
                  "name": "`from orchestration.logging import get_logger` returns a configured logger",
                  "done": true
                },
                {
                  "name": "JSON format produces valid JSON log lines",
                  "done": true
                },
                {
                  "name": "Text format produces human-readable log lines",
                  "done": true
                },
                {
                  "name": "Log level is configurable via `Settings.log_level`",
                  "done": true
                },
                {
                  "name": "Test `get_logger` returns a `logging.Logger` instance",
                  "done": true
                },
                {
                  "name": "Test JSON formatter produces valid JSON output",
                  "done": true
                },
                {
                  "name": "Test text format produces readable output",
                  "done": true
                },
                {
                  "name": "Test log level configuration is respected",
                  "done": true
                },
                {
                  "name": "All logging tests pass via `uv run pytest tests/test_logging.py`",
                  "done": true
                },
                {
                  "name": "Both JSON and text formats are verified",
                  "done": true
                },
                {
                  "name": "Choose pyright or mypy and add it as a dev dependency via `uv add --dev`",
                  "done": true
                },
                {
                  "name": "Add type checker configuration to `pyproject.toml` (strict mode)",
                  "done": true
                },
                {
                  "name": "Run the type checker against the source and fix any issues",
                  "done": true
                },
                {
                  "name": "Type checker is configured in `pyproject.toml`",
                  "done": true
                },
                {
                  "name": "Type checking passes with zero errors on all source files",
                  "done": true
                },
                {
                  "name": "Run `uv run pytest` — all tests pass",
                  "done": true
                },
                {
                  "name": "Run `uv run ruff check src/ tests/` — no linting errors",
                  "done": true
                },
                {
                  "name": "Run `uv run ruff format --check src/ tests/` — formatting is consistent",
                  "done": true
                },
                {
                  "name": "Run type checker (pyright or mypy) — zero errors",
                  "done": true
                },
                {
                  "name": "Verify all imports from the slice design's success criteria work:",
                  "done": true
                },
                {
                  "name": "All tests pass",
                  "done": true
                },
                {
                  "name": "`ruff check` passes with no errors",
                  "done": true
                },
                {
                  "name": "`ruff format --check` passes",
                  "done": true
                },
                {
                  "name": "Type checking passes with zero errors",
                  "done": true
                },
                {
                  "name": "All import paths from the slice design are verified working",
                  "done": true
                },
                {
                  "name": "Project is ready for slice 2 (Anthropic Provider) to begin",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "101",
            "name": "sdk-agent-provider",
            "status": "complete",
            "dateCreated": "20260219",
            "dateUpdated": "20260220",
            "tasks": {
              "index": "101",
              "name": "tasks.sdk-agent-provider",
              "status": "complete",
              "taskCount": 95,
              "completedTasks": 95,
              "dateCreated": "20260219",
              "dateUpdated": "20260219",
              "items": [
                {
                  "name": "Create `src/orchestration/providers/sdk/translation.py`",
                  "done": true
                },
                {
                  "name": "Import SDK message types:",
                  "done": true
                },
                {
                  "name": "Import orchestration types:",
                  "done": true
                },
                {
                  "name": "Implement `translate_sdk_message(sdk_msg: Any, sender: str) -> Message | None`",
                  "done": true
                },
                {
                  "name": "`translate_sdk_message` handles all five SDK message types from the translation table",
                  "done": true
                },
                {
                  "name": "`AssistantMessage` with multiple content blocks produces multiple Messages",
                  "done": true
                },
                {
                  "name": "Unknown message types return `None` (or empty list)",
                  "done": true
                },
                {
                  "name": "All returned Messages are valid orchestration `Message` objects with correct `sender`, `recipients`, `message_type`, ...",
                  "done": true
                },
                {
                  "name": "Create `tests/providers/` directory and `tests/providers/__init__.py` if they don't exist",
                  "done": true
                },
                {
                  "name": "Create `tests/providers/sdk/` directory and `tests/providers/sdk/__init__.py`",
                  "done": true
                },
                {
                  "name": "Create `tests/providers/sdk/test_translation.py`",
                  "done": true
                },
                {
                  "name": "For constructing test data, try to import and instantiate real SDK message types. If SDK types require CLI interactio...",
                  "done": true
                },
                {
                  "name": "Test cases:",
                  "done": true
                },
                {
                  "name": "All translation tests pass via `uv run pytest tests/providers/sdk/test_translation.py`",
                  "done": true
                },
                {
                  "name": "Every row of the translation table from the slice design has test coverage",
                  "done": true
                },
                {
                  "name": "Edge cases (empty content, unknown types) are covered",
                  "done": true
                },
                {
                  "name": "Replace the stub in `src/orchestration/providers/sdk/provider.py` with the implementation",
                  "done": true
                },
                {
                  "name": "Import required types:",
                  "done": true
                },
                {
                  "name": "Implement `SDKAgentProvider` class:",
                  "done": true
                },
                {
                  "name": "Only pass non-None values to `ClaudeAgentOptions`. Build a dict of kwargs, filter out None values, then unpack: `Clau...",
                  "done": true
                },
                {
                  "name": "`SDKAgentProvider` has `provider_type`, `create_agent`, and `validate_credentials` matching the `AgentProvider` Protocol",
                  "done": true
                },
                {
                  "name": "`create_agent` correctly maps all `AgentConfig` fields to `ClaudeAgentOptions`",
                  "done": true
                },
                {
                  "name": "`permission_mode` defaults to `\"acceptEdits\"` when not specified",
                  "done": true
                },
                {
                  "name": "`mode` is read from `config.credentials` dict",
                  "done": true
                },
                {
                  "name": "`validate_credentials` returns bool, never throws",
                  "done": true
                },
                {
                  "name": "API-specific fields (`api_key`, `auth_token`, `base_url`) are silently ignored",
                  "done": true
                },
                {
                  "name": "Create `tests/providers/sdk/test_provider.py`",
                  "done": true
                },
                {
                  "name": "Mock `claude_agent_sdk.ClaudeAgentOptions` if needed, or use the real class (it's a simple config object, safe to con...",
                  "done": true
                },
                {
                  "name": "Mock `SDKAgent` constructor to verify it receives correct arguments",
                  "done": true
                },
                {
                  "name": "Test cases:",
                  "done": true
                },
                {
                  "name": "All provider tests pass via `uv run pytest tests/providers/sdk/test_provider.py`",
                  "done": true
                },
                {
                  "name": "Options mapping is verified for each AgentConfig field",
                  "done": true
                },
                {
                  "name": "Default permission mode is verified",
                  "done": true
                },
                {
                  "name": "Mode selection from credentials dict is verified",
                  "done": true
                },
                {
                  "name": "Replace the stub in `src/orchestration/providers/sdk/agent.py`",
                  "done": true
                },
                {
                  "name": "Import required types:",
                  "done": true
                },
                {
                  "name": "Implement `SDKAgent.__init__(self, name: str, options: ClaudeAgentOptions, mode: str = \"query\")`:",
                  "done": true
                },
                {
                  "name": "Implement properties: `name` → `self._name`, `agent_type` → `\"sdk\"`, `state` → `self._state`",
                  "done": true
                },
                {
                  "name": "Implement `handle_message` for query mode:",
                  "done": true
                },
                {
                  "name": "Implement `shutdown` (no-op for query mode since there's no persistent client):",
                  "done": true
                },
                {
                  "name": "Note: `handle_message` is an `async def` that returns `AsyncIterator[Message]` — this means it should be an async gen...",
                  "done": true
                },
                {
                  "name": "`SDKAgent` has all properties and methods required by the `Agent` Protocol",
                  "done": true
                },
                {
                  "name": "Query mode: `handle_message` calls `sdk_query()` with `message.content` as prompt",
                  "done": true
                },
                {
                  "name": "Query mode: SDK responses are translated and yielded as orchestration Messages",
                  "done": true
                },
                {
                  "name": "State transitions: idle → processing → idle on success, idle → processing → failed on error",
                  "done": true
                },
                {
                  "name": "All SDK exception types are caught and mapped to correct orchestration errors",
                  "done": true
                },
                {
                  "name": "`shutdown` sets state to terminated",
                  "done": true
                },
                {
                  "name": "Create `tests/providers/sdk/test_agent.py`",
                  "done": true
                },
                {
                  "name": "Mock `claude_agent_sdk.query` using `unittest.mock.patch`. The mock should be an async generator:",
                  "done": true
                },
                {
                  "name": "Test cases:",
                  "done": true
                },
                {
                  "name": "To test state during execution, you can check state inside the mock or collect it via a side effect",
                  "done": true
                },
                {
                  "name": "All query mode tests pass via `uv run pytest tests/providers/sdk/test_agent.py`",
                  "done": true
                },
                {
                  "name": "Happy path (prompt → translated response) is verified",
                  "done": true
                },
                {
                  "name": "All five SDK error types are tested with correct mapping",
                  "done": true
                },
                {
                  "name": "State transitions are verified",
                  "done": true
                },
                {
                  "name": "Add client mode logic to `handle_message`. The method should branch on `self._mode`:",
                  "done": true
                },
                {
                  "name": "Extract existing query mode logic into `_handle_query_mode` private method",
                  "done": true
                },
                {
                  "name": "Implement `_handle_client_mode`:",
                  "done": true
                },
                {
                  "name": "Update `shutdown` to disconnect client if it exists:",
                  "done": true
                },
                {
                  "name": "**Important**: Do NOT use `break` to exit `receive_response()` early. Always iterate the full response. Use a flag if...",
                  "done": true
                },
                {
                  "name": "Client mode creates `ClaudeSDKClient` on first `handle_message` call",
                  "done": true
                },
                {
                  "name": "Client mode reuses existing client on subsequent calls (verify client is NOT recreated)",
                  "done": true
                },
                {
                  "name": "Client calls `connect()` once, then `query()` + `receive_response()` per message",
                  "done": true
                },
                {
                  "name": "`shutdown` calls `disconnect()` on client and sets client to None",
                  "done": true
                },
                {
                  "name": "`shutdown` is safe to call when no client exists (no-op)",
                  "done": true
                },
                {
                  "name": "Error mapping is the same as query mode",
                  "done": true
                },
                {
                  "name": "Mock `claude_agent_sdk.ClaudeSDKClient` class. The mock needs:",
                  "done": true
                },
                {
                  "name": "Test cases:",
                  "done": true
                },
                {
                  "name": "All client mode tests pass",
                  "done": true
                },
                {
                  "name": "Client lifecycle (create once, reuse, disconnect on shutdown) is verified",
                  "done": true
                },
                {
                  "name": "Error mapping matches query mode behavior",
                  "done": true
                },
                {
                  "name": "Replace stub in `src/orchestration/providers/sdk/__init__.py` with:",
                  "done": true
                },
                {
                  "name": "Verify that `from orchestration.providers.sdk import SDKAgentProvider, SDKAgent` works",
                  "done": true
                },
                {
                  "name": "Verify that after import, `get_provider(\"sdk\")` returns the registered instance",
                  "done": true
                },
                {
                  "name": "Importing `orchestration.providers.sdk` registers `\"sdk\"` in the provider registry",
                  "done": true
                },
                {
                  "name": "`get_provider(\"sdk\")` returns an `SDKAgentProvider` instance",
                  "done": true
                },
                {
                  "name": "`SDKAgentProvider` and `SDKAgent` are accessible from the package's public API",
                  "done": true
                },
                {
                  "name": "Add to `tests/providers/sdk/test_provider.py` (or create a new `test_registration.py`):",
                  "done": true
                },
                {
                  "name": "These tests may need to handle registry state carefully — if other tests also import the sdk package, the provider ma...",
                  "done": true
                },
                {
                  "name": "Registration flow tests pass",
                  "done": true
                },
                {
                  "name": "The provider is discoverable through the registry after import",
                  "done": true
                },
                {
                  "name": "Run `uv run pytest` — all tests pass (including foundation tests — no regressions)",
                  "done": true
                },
                {
                  "name": "Run `uv run ruff check src/ tests/` — no linting errors",
                  "done": true
                },
                {
                  "name": "Run `uv run ruff format --check src/ tests/` — formatting consistent",
                  "done": true
                },
                {
                  "name": "Run type checker — zero errors. Specifically verify:",
                  "done": true
                },
                {
                  "name": "Verify import paths:",
                  "done": true
                },
                {
                  "name": "Verify that after importing `orchestration.providers.sdk`:",
                  "done": true
                },
                {
                  "name": "Verify no regressions in foundation tests (`tests/test_models.py`, `tests/test_providers.py`, `tests/test_config.py`,...",
                  "done": true
                },
                {
                  "name": "All tests pass (new and existing)",
                  "done": true
                },
                {
                  "name": "`ruff check` passes",
                  "done": true
                },
                {
                  "name": "`ruff format --check` passes",
                  "done": true
                },
                {
                  "name": "Type checking passes with zero errors",
                  "done": true
                },
                {
                  "name": "Both Protocols are structurally satisfied",
                  "done": true
                },
                {
                  "name": "Provider is auto-registered and functional",
                  "done": true
                },
                {
                  "name": "Project is ready for slice 3 (Agent Registry & Lifecycle) to begin",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "102",
            "name": "agent-registry",
            "status": "complete",
            "dateCreated": "20260219",
            "dateUpdated": "20260219",
            "tasks": {
              "index": "102",
              "name": "tasks.agent-registry",
              "status": "complete",
              "taskCount": 115,
              "completedTasks": 115,
              "dateCreated": "20260219",
              "dateUpdated": "20260219",
              "items": [
                {
                  "name": "Add to `src/orchestration/core/models.py`:",
                  "done": true
                },
                {
                  "name": "Verify both models are importable: `from orchestration.core.models import AgentInfo, ShutdownReport`",
                  "done": true
                },
                {
                  "name": "`AgentInfo(name=\"a\", agent_type=\"sdk\", provider=\"sdk\", state=AgentState.idle)` validates",
                  "done": true
                },
                {
                  "name": "`ShutdownReport()` produces empty defaults",
                  "done": true
                },
                {
                  "name": "`ShutdownReport(succeeded=[\"a\"], failed={\"b\": \"timeout\"})` validates",
                  "done": true
                },
                {
                  "name": "Existing model imports and tests are unaffected",
                  "done": true
                },
                {
                  "name": "Add to `tests/test_models.py` (or `tests/core/test_models.py` — use whichever location the existing model tests are in):",
                  "done": true
                },
                {
                  "name": "Run `uv run pytest tests/test_models.py` — all tests pass (new and existing)",
                  "done": true
                },
                {
                  "name": "All model tests pass",
                  "done": true
                },
                {
                  "name": "New models have construction and validation coverage",
                  "done": true
                },
                {
                  "name": "No regressions in existing model tests",
                  "done": true
                },
                {
                  "name": "Replace the stub content in `src/orchestration/core/agent_registry.py` with the error classes (keep the module docstr...",
                  "done": true
                },
                {
                  "name": "Verify imports: `from orchestration.core.agent_registry import AgentRegistryError, AgentNotFoundError, AgentAlreadyEx...",
                  "done": true
                },
                {
                  "name": "All three errors are importable",
                  "done": true
                },
                {
                  "name": "`AgentNotFoundError` and `AgentAlreadyExistsError` are subclasses of `AgentRegistryError`",
                  "done": true
                },
                {
                  "name": "`AgentRegistryError` is a subclass of `Exception`",
                  "done": true
                },
                {
                  "name": "Add to `src/orchestration/core/agent_registry.py`, below the error classes:",
                  "done": true
                },
                {
                  "name": "Import required types:",
                  "done": true
                },
                {
                  "name": "Implement `AgentRegistry` class:",
                  "done": true
                },
                {
                  "name": "`__init__`: initialize `self._agents: dict[str, Agent] = {}` and `self._configs: dict[str, AgentConfig] = {}` and logger",
                  "done": true
                },
                {
                  "name": "`async def spawn(self, config: AgentConfig) -> Agent`:",
                  "done": true
                },
                {
                  "name": "Add `has(self, name: str) -> bool` — checks if name is in `self._agents`",
                  "done": true
                },
                {
                  "name": "Add `get(self, name: str) -> Agent`:",
                  "done": true
                },
                {
                  "name": "`spawn()` creates an agent via the correct provider and stores it",
                  "done": true
                },
                {
                  "name": "`spawn()` with duplicate name raises `AgentAlreadyExistsError`",
                  "done": true
                },
                {
                  "name": "`spawn()` with unknown provider raises `KeyError` (from provider registry)",
                  "done": true
                },
                {
                  "name": "`get()` returns a stored agent",
                  "done": true
                },
                {
                  "name": "`get()` with unknown name raises `AgentNotFoundError`",
                  "done": true
                },
                {
                  "name": "`has()` returns `True` for spawned agents, `False` otherwise",
                  "done": true
                },
                {
                  "name": "Create `tests/core/` directory and `tests/core/__init__.py` if they don't exist",
                  "done": true
                },
                {
                  "name": "Create `tests/core/test_agent_registry.py`",
                  "done": true
                },
                {
                  "name": "Create test fixtures:",
                  "done": true
                },
                {
                  "name": "A `MockAgent` class satisfying the `Agent` Protocol (properties: `name`, `agent_type`, `state`; async methods: `handl...",
                  "done": true
                },
                {
                  "name": "A `MockProvider` class satisfying the `AgentProvider` Protocol (`provider_type` property, `create_agent` returns a `M...",
                  "done": true
                },
                {
                  "name": "A fixture that creates a fresh `AgentRegistry` and registers a mock provider via `register_provider(\"mock\", MockProvi...",
                  "done": true
                },
                {
                  "name": "Test cases:",
                  "done": true
                },
                {
                  "name": "Run `uv run pytest tests/core/test_agent_registry.py`",
                  "done": true
                },
                {
                  "name": "All spawn and lookup tests pass",
                  "done": true
                },
                {
                  "name": "Mock provider and agent satisfy their respective Protocols",
                  "done": true
                },
                {
                  "name": "Error cases are verified (duplicate, unknown provider, provider failure, not found)",
                  "done": true
                },
                {
                  "name": "Add to `AgentRegistry`:",
                  "done": true
                },
                {
                  "name": "Iterate `self._agents` items",
                  "done": true
                },
                {
                  "name": "For each agent, build `AgentInfo` from `agent.name`, `agent.agent_type`, `agent.state`, and `self._configs[name].prov...",
                  "done": true
                },
                {
                  "name": "Apply filters: if `state` is not None, include only agents with matching state; if `provider` is not None, include on...",
                  "done": true
                },
                {
                  "name": "Return the filtered list",
                  "done": true
                },
                {
                  "name": "Empty registry returns empty list",
                  "done": true
                },
                {
                  "name": "Returns correct `AgentInfo` for all spawned agents",
                  "done": true
                },
                {
                  "name": "Filtering by state works (include matching, exclude non-matching)",
                  "done": true
                },
                {
                  "name": "Filtering by provider works",
                  "done": true
                },
                {
                  "name": "Both filters can be combined",
                  "done": true
                },
                {
                  "name": "`AgentInfo.provider` comes from stored config, not from agent object",
                  "done": true
                },
                {
                  "name": "Test cases (build on the mock fixtures from Task 5):",
                  "done": true
                },
                {
                  "name": "All list_agents tests pass",
                  "done": true
                },
                {
                  "name": "Filtering logic verified for state, provider, and combination",
                  "done": true
                },
                {
                  "name": "Add to `AgentRegistry`:",
                  "done": true
                },
                {
                  "name": "Look up agent by name — raise `AgentNotFoundError` if not found",
                  "done": true
                },
                {
                  "name": "Call `await agent.shutdown()`",
                  "done": true
                },
                {
                  "name": "Remove from `self._agents` and `self._configs` **regardless of whether shutdown raised** (an agent in an indeterminat...",
                  "done": true
                },
                {
                  "name": "Log `agent.shutdown` at INFO level",
                  "done": true
                },
                {
                  "name": "If `agent.shutdown()` raised, log `agent.shutdown_failed` at WARNING with error details, then re-raise the exception ...",
                  "done": true
                },
                {
                  "name": "Shutdown calls `agent.shutdown()` and removes agent from registry",
                  "done": true
                },
                {
                  "name": "After shutdown, `has(name)` returns False and `get(name)` raises `AgentNotFoundError`",
                  "done": true
                },
                {
                  "name": "Shutdown with unknown name raises `AgentNotFoundError`",
                  "done": true
                },
                {
                  "name": "If `agent.shutdown()` raises, agent is still removed from registry",
                  "done": true
                },
                {
                  "name": "If `agent.shutdown()` raises, the exception propagates to the caller",
                  "done": true
                },
                {
                  "name": "Test cases:",
                  "done": true
                },
                {
                  "name": "All individual shutdown tests pass",
                  "done": true
                },
                {
                  "name": "Both happy-path and error-path removal verified",
                  "done": true
                },
                {
                  "name": "Add to `AgentRegistry`:",
                  "done": true
                },
                {
                  "name": "Create a `ShutdownReport`",
                  "done": true
                },
                {
                  "name": "Iterate a snapshot of agent names (copy keys — avoid mutating dict during iteration)",
                  "done": true
                },
                {
                  "name": "For each agent: call `await agent.shutdown()` in a try/except",
                  "done": true
                },
                {
                  "name": "Clear `self._agents` and `self._configs`",
                  "done": true
                },
                {
                  "name": "Log `registry.shutdown_all` at INFO with count, succeeded, failed",
                  "done": true
                },
                {
                  "name": "Return the report",
                  "done": true
                },
                {
                  "name": "All agents are shut down (each `shutdown()` is called)",
                  "done": true
                },
                {
                  "name": "Registry is empty after `shutdown_all()`",
                  "done": true
                },
                {
                  "name": "Successful shutdowns listed in `report.succeeded`",
                  "done": true
                },
                {
                  "name": "Failed shutdowns listed in `report.failed` with error messages",
                  "done": true
                },
                {
                  "name": "One agent's failure does not prevent other agents from being shut down",
                  "done": true
                },
                {
                  "name": "Test cases:",
                  "done": true
                },
                {
                  "name": "All bulk shutdown tests pass",
                  "done": true
                },
                {
                  "name": "Error collection verified — failures don't abort remaining shutdowns",
                  "done": true
                },
                {
                  "name": "Registry is always cleared regardless of individual failures",
                  "done": true
                },
                {
                  "name": "Add at module level in `src/orchestration/core/agent_registry.py`:",
                  "done": true
                },
                {
                  "name": "Export from module: ensure `get_registry`, `reset_registry` are importable from `orchestration.core.agent_registry`",
                  "done": true
                },
                {
                  "name": "`get_registry()` returns same instance on repeated calls",
                  "done": true
                },
                {
                  "name": "`reset_registry()` causes next `get_registry()` to create a new instance",
                  "done": true
                },
                {
                  "name": "Both functions are importable",
                  "done": true
                },
                {
                  "name": "Test cases (use `reset_registry()` in fixture teardown):",
                  "done": true
                },
                {
                  "name": "Ensure test cleanup calls `reset_registry()` to avoid polluting other tests",
                  "done": true
                },
                {
                  "name": "All singleton tests pass",
                  "done": true
                },
                {
                  "name": "Identity checks confirm same-instance and new-instance behavior",
                  "done": true
                },
                {
                  "name": "Run `uv run pytest` — all tests pass (including foundation and SDK provider tests — no regressions)",
                  "done": true
                },
                {
                  "name": "Run `uv run ruff check src/ tests/` — no linting errors",
                  "done": true
                },
                {
                  "name": "Run `uv run ruff format --check src/ tests/` — formatting consistent",
                  "done": true
                },
                {
                  "name": "Run type checker — zero errors",
                  "done": true
                },
                {
                  "name": "Verify import paths:",
                  "done": true
                },
                {
                  "name": "`from orchestration.core.agent_registry import AgentRegistry, get_registry, reset_registry`",
                  "done": true
                },
                {
                  "name": "`from orchestration.core.agent_registry import AgentRegistryError, AgentNotFoundError, AgentAlreadyExistsError`",
                  "done": true
                },
                {
                  "name": "`from orchestration.core.models import AgentInfo, ShutdownReport`",
                  "done": true
                },
                {
                  "name": "Verify functional flow (with mock provider):",
                  "done": true
                },
                {
                  "name": "`get_registry()` returns instance",
                  "done": true
                },
                {
                  "name": "`spawn(config)` creates and tracks agent",
                  "done": true
                },
                {
                  "name": "`list_agents()` returns `AgentInfo` objects",
                  "done": true
                },
                {
                  "name": "`shutdown_agent(name)` removes agent",
                  "done": true
                },
                {
                  "name": "`shutdown_all()` returns `ShutdownReport`",
                  "done": true
                },
                {
                  "name": "Verify no regressions in existing test suites",
                  "done": true
                },
                {
                  "name": "Verify `core/agent_registry.py` docstring is updated (no longer says \"Populated in slice 3\")",
                  "done": true
                },
                {
                  "name": "All tests pass (new and existing)",
                  "done": true
                },
                {
                  "name": "`ruff check` passes",
                  "done": true
                },
                {
                  "name": "`ruff format --check` passes",
                  "done": true
                },
                {
                  "name": "Type checking passes with zero errors",
                  "done": true
                },
                {
                  "name": "All registry operations verified functional",
                  "done": true
                },
                {
                  "name": "Project is ready for slice 4 (CLI Foundation & SDK Agent Tasks) to begin",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "103",
            "name": "cli-foundation",
            "status": "complete",
            "dateCreated": "20260219",
            "dateUpdated": "20260220",
            "tasks": {
              "index": "103",
              "name": "tasks.cli-foundation",
              "status": "complete",
              "taskCount": 61,
              "completedTasks": 61,
              "dateCreated": "20260219",
              "dateUpdated": "20260220",
              "items": [
                {
                  "name": "Create `src/orchestration/cli/app.py`:",
                  "done": true
                },
                {
                  "name": "Update `src/orchestration/cli/__init__.py` to export `app`",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/cli/commands/__init__.py` (empty)",
                  "done": true
                },
                {
                  "name": "Add script entry point to `pyproject.toml`:",
                  "done": true
                },
                {
                  "name": "Run `uv sync` to install the entry point",
                  "done": true
                },
                {
                  "name": "Verify `orchestration --help` runs and shows the app help text",
                  "done": true
                },
                {
                  "name": "`orchestration --help` executes without error and shows help text",
                  "done": true
                },
                {
                  "name": "`src/orchestration/cli/app.py` exists with a Typer app instance",
                  "done": true
                },
                {
                  "name": "`cli/commands/` directory exists with `__init__.py`",
                  "done": true
                },
                {
                  "name": "Create `tests/cli/__init__.py`",
                  "done": true
                },
                {
                  "name": "Create `tests/cli/conftest.py` with fixtures:",
                  "done": true
                },
                {
                  "name": "Create a mock `AgentInfo` factory fixture that builds `AgentInfo` instances with configurable fields for use across t...",
                  "done": true
                },
                {
                  "name": "Verify fixtures work by writing a trivial test that invokes `orchestration --help` via `CliRunner` and asserts exit c...",
                  "done": true
                },
                {
                  "name": "`tests/cli/conftest.py` provides `cli_runner`, `mock_registry`, and `patch_registry` fixtures",
                  "done": true
                },
                {
                  "name": "Trivial `--help` test passes via `CliRunner`",
                  "done": true
                },
                {
                  "name": "`pytest tests/cli/` runs without errors",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/cli/commands/spawn.py`:",
                  "done": true
                },
                {
                  "name": "Register the command with the app: in `app.py`, import and add the spawn command via `app.command()` or `app.add_type...",
                  "done": true
                },
                {
                  "name": "`orchestration spawn --name test --type sdk` is a valid command (visible in `--help`)",
                  "done": true
                },
                {
                  "name": "Command constructs `AgentConfig` correctly from CLI arguments",
                  "done": true
                },
                {
                  "name": "`--provider` defaults to value of `--type` when not specified",
                  "done": true
                },
                {
                  "name": "Error cases produce styled messages (not stack traces) and exit code 1",
                  "done": true
                },
                {
                  "name": "Create `tests/cli/test_spawn.py` with test cases:",
                  "done": true
                },
                {
                  "name": "All spawn tests pass",
                  "done": true
                },
                {
                  "name": "Both success and error paths verified",
                  "done": true
                },
                {
                  "name": "`AgentConfig` construction verified via mock assertions",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/cli/commands/list.py`:",
                  "done": true
                },
                {
                  "name": "Register the command with the app in `app.py`",
                  "done": true
                },
                {
                  "name": "`orchestration list` displays a formatted table of agents",
                  "done": true
                },
                {
                  "name": "`--state` and `--provider` filters are passed through to `list_agents()`",
                  "done": true
                },
                {
                  "name": "Empty registry displays `\"No agents running.\"` instead of empty table",
                  "done": true
                },
                {
                  "name": "Create `tests/cli/test_list.py` with test cases:",
                  "done": true
                },
                {
                  "name": "All list tests pass",
                  "done": true
                },
                {
                  "name": "Empty and populated cases verified",
                  "done": true
                },
                {
                  "name": "Filter parameters passed through correctly",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/cli/commands/task.py`:",
                  "done": true
                },
                {
                  "name": "Register the command with the app in `app.py`",
                  "done": true
                },
                {
                  "name": "`orchestration task myagent \"do something\"` sends the prompt and displays the response",
                  "done": true
                },
                {
                  "name": "Text content is displayed cleanly",
                  "done": true
                },
                {
                  "name": "Tool use blocks get a compact summary rather than raw JSON",
                  "done": true
                },
                {
                  "name": "Agent not found produces a helpful error message and exit code 1",
                  "done": true
                },
                {
                  "name": "Create `tests/cli/test_task.py` with test cases:",
                  "done": true
                },
                {
                  "name": "All task tests pass",
                  "done": true
                },
                {
                  "name": "Response content display verified",
                  "done": true
                },
                {
                  "name": "Error path verified",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/cli/commands/shutdown.py`:",
                  "done": true
                },
                {
                  "name": "Register the command with the app in `app.py`",
                  "done": true
                },
                {
                  "name": "`orchestration shutdown myagent` shuts down one agent with confirmation",
                  "done": true
                },
                {
                  "name": "`orchestration shutdown --all` shuts down all agents with summary report",
                  "done": true
                },
                {
                  "name": "Providing neither name nor `--all` produces an error",
                  "done": true
                },
                {
                  "name": "Agent not found produces a helpful error message and exit code 1",
                  "done": true
                },
                {
                  "name": "Failed shutdowns in bulk mode display error details",
                  "done": true
                },
                {
                  "name": "Create `tests/cli/test_shutdown.py` with test cases:",
                  "done": true
                },
                {
                  "name": "All shutdown tests pass",
                  "done": true
                },
                {
                  "name": "Individual and bulk paths both verified",
                  "done": true
                },
                {
                  "name": "Argument validation verified",
                  "done": true
                },
                {
                  "name": "Create `tests/cli/test_integration.py`:",
                  "done": true
                },
                {
                  "name": "All five commands execute successfully in sequence",
                  "done": true
                },
                {
                  "name": "Each command's output reflects the state changes from prior commands",
                  "done": true
                },
                {
                  "name": "No real SDK or Claude calls — only mock provider and agent",
                  "done": true
                },
                {
                  "name": "Registry is cleaned up after the test",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "104",
            "name": "sdk-client-warm-pool",
            "status": "not-started",
            "dateCreated": "20260220",
            "dateUpdated": "20260220"
          },
          {
            "index": "105",
            "name": "review-workflow-templates",
            "status": "not-started",
            "dateCreated": "20260221",
            "dateUpdated": "20260222",
            "tasks": {
              "index": "105",
              "name": "tasks.review-workflow-templates",
              "status": "complete",
              "taskCount": 137,
              "completedTasks": 137,
              "dateCreated": "20260222",
              "dateUpdated": "20260222",
              "items": [
                {
                  "name": "**T1: Add pyyaml dependency**",
                  "done": true
                },
                {
                  "name": "Add `pyyaml` to `pyproject.toml` under project dependencies",
                  "done": true
                },
                {
                  "name": "Run `uv sync` to install and lock",
                  "done": true
                },
                {
                  "name": "Success: `import yaml` works in the project virtualenv; lock file updated",
                  "done": true
                },
                {
                  "name": "**T2: Create test infrastructure for review module**",
                  "done": true
                },
                {
                  "name": "Create `tests/review/__init__.py`",
                  "done": true
                },
                {
                  "name": "Create `tests/review/conftest.py` with shared fixtures:",
                  "done": true
                },
                {
                  "name": "Success: `pytest tests/review/` collects with no errors; fixtures importable",
                  "done": true
                },
                {
                  "name": "**T3: Implement result models (`models.py`)**",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/__init__.py`",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/models.py` with:",
                  "done": true
                },
                {
                  "name": "Type-check with mypy/pyright; ruff passes",
                  "done": true
                },
                {
                  "name": "Success: all fields and methods present; `to_dict()` returns JSON-serializable dict",
                  "done": true
                },
                {
                  "name": "**T4: Test result models**",
                  "done": true
                },
                {
                  "name": "Create `tests/review/test_models.py`",
                  "done": true
                },
                {
                  "name": "Test `ReviewResult` construction with findings; `to_dict()` serialization; `has_failures` and `concern_count` properties",
                  "done": true
                },
                {
                  "name": "Test `ReviewFinding` with and without `file_ref`",
                  "done": true
                },
                {
                  "name": "Test `Verdict` and `Severity` enum string values",
                  "done": true
                },
                {
                  "name": "Success: `pytest tests/review/test_models.py` passes; zero mypy errors",
                  "done": true
                },
                {
                  "name": "Commit: `feat: add review result models`",
                  "done": true
                },
                {
                  "name": "**T5: Implement ReviewTemplate dataclass and InputDef (`templates.py`)**",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/templates.py` with:",
                  "done": true
                },
                {
                  "name": "Type-check; ruff passes",
                  "done": true
                },
                {
                  "name": "Success: `ReviewTemplate.build_prompt()` returns correct string for both `prompt_template` and `prompt_builder` paths...",
                  "done": true
                },
                {
                  "name": "**T6: Implement YAML loader and template registry (`templates.py` continued)**",
                  "done": true
                },
                {
                  "name": "Add `TemplateValidationError` exception to `models.py` (or a dedicated `exceptions.py`)",
                  "done": true
                },
                {
                  "name": "Implement `load_template(path: Path) -> ReviewTemplate`:",
                  "done": true
                },
                {
                  "name": "Implement registry: `_TEMPLATES` dict, `register_template()`, `get_template()`, `list_templates()`",
                  "done": true
                },
                {
                  "name": "Implement `load_builtin_templates()`: scans `templates/builtin/*.yaml` relative to `templates.py`",
                  "done": true
                },
                {
                  "name": "Type-check; ruff passes",
                  "done": true
                },
                {
                  "name": "Success: `load_builtin_templates()` loads all three YAMLs without error once they exist",
                  "done": true
                },
                {
                  "name": "**T7: Test template loading and registry**",
                  "done": true
                },
                {
                  "name": "Create `tests/review/test_templates.py`",
                  "done": true
                },
                {
                  "name": "Test `load_template()` with a valid inline YAML (using `tmp_path` fixture)",
                  "done": true
                },
                {
                  "name": "Test validation error: both `prompt_template` and `prompt_builder` present",
                  "done": true
                },
                {
                  "name": "Test validation error: neither present",
                  "done": true
                },
                {
                  "name": "Test `prompt_builder` dotted-path resolution (use a real importable function)",
                  "done": true
                },
                {
                  "name": "Test registry: `register_template`, `get_template` hit/miss, `list_templates`",
                  "done": true
                },
                {
                  "name": "Success: `pytest tests/review/test_templates.py` passes",
                  "done": true
                },
                {
                  "name": "Commit: `feat: add ReviewTemplate dataclass, YAML loader, and registry`",
                  "done": true
                },
                {
                  "name": "**T8: Create built-in template directory structure**",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/templates/builtin/` directory",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/templates/__init__.py` (empty)",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/builders/__init__.py` (empty)",
                  "done": true
                },
                {
                  "name": "Ensure `templates/builtin/` is included in package data (update `pyproject.toml` if needed)",
                  "done": true
                },
                {
                  "name": "Success: `Path(__file__).parent / \"templates\" / \"builtin\"` resolves correctly at runtime",
                  "done": true
                },
                {
                  "name": "**T9: Create `arch.yaml` built-in template**",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/templates/builtin/arch.yaml`",
                  "done": true
                },
                {
                  "name": "Include: `name`, `description`, `system_prompt` (alignment criteria per slice design), `allowed_tools: [Read, Glob, G...",
                  "done": true
                },
                {
                  "name": "Success: `load_template(\"arch.yaml\")` returns `ReviewTemplate` with name `arch`; `build_prompt({input: \"a.md\", agains...",
                  "done": true
                },
                {
                  "name": "**T10: Test `arch` template prompt construction**",
                  "done": true
                },
                {
                  "name": "Create `tests/review/test_builtin_arch.py`",
                  "done": true
                },
                {
                  "name": "Test `load_template` on `arch.yaml`; verify name, description, allowed_tools, permission_mode",
                  "done": true
                },
                {
                  "name": "Test `build_prompt` with required inputs; assert both paths appear in output",
                  "done": true
                },
                {
                  "name": "Test `build_prompt` with optional `cwd`",
                  "done": true
                },
                {
                  "name": "Success: `pytest tests/review/test_builtin_arch.py` passes",
                  "done": true
                },
                {
                  "name": "**T11: Create `tasks.yaml` built-in template**",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/templates/builtin/tasks.yaml`",
                  "done": true
                },
                {
                  "name": "Include: system prompt focused on cross-referencing success criteria, gap detection, sequencing, task granularity (pe...",
                  "done": true
                },
                {
                  "name": "Success: `load_template(\"tasks.yaml\")` returns `ReviewTemplate` with name `tasks`; `build_prompt` inserts both paths",
                  "done": true
                },
                {
                  "name": "**T12: Test `tasks` template prompt construction**",
                  "done": true
                },
                {
                  "name": "Create `tests/review/test_builtin_tasks.py`",
                  "done": true
                },
                {
                  "name": "Test load, field values, and `build_prompt` with required inputs",
                  "done": true
                },
                {
                  "name": "Success: `pytest tests/review/test_builtin_tasks.py` passes",
                  "done": true
                },
                {
                  "name": "**T13: Create `code.yaml` built-in template**",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/templates/builtin/code.yaml`",
                  "done": true
                },
                {
                  "name": "Include: system prompt focused on CLAUDE.md conventions, style, test-with pattern, error handling, security; `allowed...",
                  "done": true
                },
                {
                  "name": "Success: `load_template(\"code.yaml\")` returns `ReviewTemplate` with name `code` and `prompt_builder` resolved to call...",
                  "done": true
                },
                {
                  "name": "**T14: Implement `code_review_prompt` builder**",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/builders/code.py`",
                  "done": true
                },
                {
                  "name": "Implement `code_review_prompt(inputs: dict[str, str]) -> str`:",
                  "done": true
                },
                {
                  "name": "Type-check; ruff passes",
                  "done": true
                },
                {
                  "name": "Success: function returns correct prompt string for each combination of inputs",
                  "done": true
                },
                {
                  "name": "**T15: Test `code` template and builder**",
                  "done": true
                },
                {
                  "name": "Create `tests/review/test_builtin_code.py`",
                  "done": true
                },
                {
                  "name": "Test `load_template(\"code.yaml\")`; verify `prompt_builder` is callable",
                  "done": true
                },
                {
                  "name": "Test `code_review_prompt` with `diff` only, `files` only, neither, and both (`diff` + `files`)",
                  "done": true
                },
                {
                  "name": "Success: `pytest tests/review/test_builtin_code.py` passes",
                  "done": true
                },
                {
                  "name": "Commit: `feat: add built-in review templates (arch, tasks, code)`",
                  "done": true
                },
                {
                  "name": "**T16: Implement result parser (`parsers.py`)**",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/parsers.py`",
                  "done": true
                },
                {
                  "name": "Implement `parse_review_output(raw_output, template_name, input_files) -> ReviewResult`:",
                  "done": true
                },
                {
                  "name": "Type-check; ruff passes",
                  "done": true
                },
                {
                  "name": "Success: well-formed agent output parses to correct `ReviewResult`; malformed output returns `UNKNOWN` without raising",
                  "done": true
                },
                {
                  "name": "**T17: Test result parser**",
                  "done": true
                },
                {
                  "name": "Create `tests/review/test_parsers.py`",
                  "done": true
                },
                {
                  "name": "Test well-formed markdown with PASS/CONCERNS/FAIL verdicts and multiple findings",
                  "done": true
                },
                {
                  "name": "Test malformed: missing `## Summary`; missing severity prefix; empty output; partial output",
                  "done": true
                },
                {
                  "name": "Test `UNKNOWN` fallback: raw output preserved in result",
                  "done": true
                },
                {
                  "name": "Parametrize verdict extraction across all three verdict strings",
                  "done": true
                },
                {
                  "name": "Success: `pytest tests/review/test_parsers.py` passes",
                  "done": true
                },
                {
                  "name": "Commit: `feat: add review result parser`",
                  "done": true
                },
                {
                  "name": "**T18: Implement review runner (`runner.py`)**",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/review/runner.py`",
                  "done": true
                },
                {
                  "name": "Implement `async def run_review(template: ReviewTemplate, inputs: dict[str, str]) -> ReviewResult`:",
                  "done": true
                },
                {
                  "name": "Type-check; ruff passes",
                  "done": true
                },
                {
                  "name": "Success: runner compiles; `run_review` signature matches slice design",
                  "done": true
                },
                {
                  "name": "**T19: Test review runner**",
                  "done": true
                },
                {
                  "name": "Create `tests/review/test_runner.py`",
                  "done": true
                },
                {
                  "name": "Use `mock_sdk_client` fixture to inject predefined response",
                  "done": true
                },
                {
                  "name": "Test: `ClaudeAgentOptions` constructed with correct fields from template",
                  "done": true
                },
                {
                  "name": "Test: `ClaudeSDKClient` instantiated with those options",
                  "done": true
                },
                {
                  "name": "Test: `client.query()` called with prompt built from `template.build_prompt(inputs)`",
                  "done": true
                },
                {
                  "name": "Test: `ReviewResult` returned with expected verdict and findings from mock response",
                  "done": true
                },
                {
                  "name": "Success: `pytest tests/review/test_runner.py` passes",
                  "done": true
                },
                {
                  "name": "Commit: `feat: add review runner`",
                  "done": true
                },
                {
                  "name": "**T20: Implement CLI `review` subcommand (`cli/commands/review.py`)**",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/cli/commands/review.py` with Typer app `review_app`",
                  "done": true
                },
                {
                  "name": "Implement `review arch INPUT --against CONTEXT [--cwd DIR] [--output FORMAT]`",
                  "done": true
                },
                {
                  "name": "Implement `review tasks INPUT --against CONTEXT [--cwd DIR] [--output FORMAT]`",
                  "done": true
                },
                {
                  "name": "Implement `review code [--cwd DIR] [--files PATTERN] [--diff REF] [--output FORMAT]`",
                  "done": true
                },
                {
                  "name": "Implement `review list`: loads builtin templates, prints name + description table",
                  "done": true
                },
                {
                  "name": "Implement `display_result(result, output_mode, output_path)`: `terminal` (Rich), `json` (stdout), `file` (JSON to path)",
                  "done": true
                },
                {
                  "name": "Wire `review_app` into the main Typer app in `cli/main.py` (or equivalent entry point)",
                  "done": true
                },
                {
                  "name": "Handle error cases: invalid template name (list available), missing required args (usage error), SDK errors (user-fri...",
                  "done": true
                },
                {
                  "name": "Type-check; ruff passes",
                  "done": true
                },
                {
                  "name": "**T21: Test CLI review subcommand**",
                  "done": true
                },
                {
                  "name": "Create `tests/review/test_cli_review.py`",
                  "done": true
                },
                {
                  "name": "Use Typer `CliRunner` and `mock_sdk_client` fixture",
                  "done": true
                },
                {
                  "name": "Test `review arch` with required args; assert exit code 0 and output contains verdict",
                  "done": true
                },
                {
                  "name": "Test `review tasks` with required args",
                  "done": true
                },
                {
                  "name": "Test `review code` with no args, `--files`, and `--diff`",
                  "done": true
                },
                {
                  "name": "Test `review list`: output contains all three template names",
                  "done": true
                },
                {
                  "name": "Test missing required arg: non-zero exit, usage message shown",
                  "done": true
                },
                {
                  "name": "Test invalid template name: error lists available templates",
                  "done": true
                },
                {
                  "name": "Test `--output json`: stdout is valid JSON matching `ReviewResult` structure",
                  "done": true
                },
                {
                  "name": "Test `--output file PATH`: file created at path with JSON content",
                  "done": true
                },
                {
                  "name": "Success: `pytest tests/review/test_cli_review.py` passes",
                  "done": true
                },
                {
                  "name": "Commit: `feat: add review CLI subcommand`",
                  "done": true
                },
                {
                  "name": "**T22: Full validation pass**",
                  "done": true
                },
                {
                  "name": "Run `pytest tests/review/` — all tests pass",
                  "done": true
                },
                {
                  "name": "Run `mypy src/orchestration/review/` (or pyright) — zero errors",
                  "done": true
                },
                {
                  "name": "Run `ruff check src/orchestration/review/ tests/review/` — zero errors",
                  "done": true
                },
                {
                  "name": "Run `ruff format --check src/orchestration/review/ tests/review/` — no formatting issues",
                  "done": true
                },
                {
                  "name": "Run full project build to confirm nothing is broken",
                  "done": true
                },
                {
                  "name": "Success: all checks pass with no errors; warnings documented if present",
                  "done": true
                },
                {
                  "name": "Commit: `chore: review slice 105 final validation pass`",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "106",
            "name": "m1-polish-and-publish",
            "status": "complete",
            "dateCreated": "20260222",
            "dateUpdated": "20260222",
            "tasks": {
              "index": "106",
              "name": "tasks.m1-polish-and-publish",
              "status": "complete",
              "taskCount": 148,
              "completedTasks": 148,
              "dateCreated": "20260222",
              "dateUpdated": "20260222",
              "items": [
                {
                  "name": "Add `tomli-w>=1.0` to `pyproject.toml` dependencies",
                  "done": true
                },
                {
                  "name": "Run `uv sync` to install",
                  "done": true
                },
                {
                  "name": "SC: `uv pip list` shows `tomli-w` installed",
                  "done": true
                },
                {
                  "name": "SC: `uv run python -c \"import tomli_w\"` succeeds",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/config/__init__.py` (module docstring only)",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/config/keys.py`",
                  "done": true
                },
                {
                  "name": "Define `ConfigKey` dataclass: `name: str`, `type_: type`, `default: object`, `description: str`",
                  "done": true
                },
                {
                  "name": "Define `CONFIG_KEYS: dict[str, ConfigKey]` with initial keys from slice design:",
                  "done": true
                },
                {
                  "name": "Helper `get_default(key: str) -> object` that returns the default for a key, raises `KeyError` for unknown keys",
                  "done": true
                },
                {
                  "name": "SC: All three keys defined with correct types and defaults",
                  "done": true
                },
                {
                  "name": "SC: `ruff check` and `pyright` pass",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/config/manager.py`",
                  "done": true
                },
                {
                  "name": "`user_config_path() -> Path` — returns `~/.config/orchestration/config.toml`",
                  "done": true
                },
                {
                  "name": "`project_config_path(cwd: str = \".\") -> Path` — returns `{cwd}/.orchestration.toml`",
                  "done": true
                },
                {
                  "name": "`load_config(cwd: str = \".\") -> dict[str, object]` — loads user config, overlays project config, fills defaults. Miss...",
                  "done": true
                },
                {
                  "name": "`get_config(key: str, cwd: str = \".\") -> object` — convenience for a single key",
                  "done": true
                },
                {
                  "name": "`set_config(key: str, value: str, project: bool = False, cwd: str = \".\") -> None` — writes to the appropriate TOML fi...",
                  "done": true
                },
                {
                  "name": "`resolve_config_source(key: str, cwd: str = \".\") -> str` — returns `\"project\"`, `\"user\"`, or `\"default\"` indicating w...",
                  "done": true
                },
                {
                  "name": "Use `tomllib` (stdlib) for reading, `tomli_w` for writing",
                  "done": true
                },
                {
                  "name": "SC: `ruff check` and `pyright` pass",
                  "done": true
                },
                {
                  "name": "SC: No silent fallback values — unknown keys raise `KeyError`",
                  "done": true
                },
                {
                  "name": "Create `tests/config/__init__.py`",
                  "done": true
                },
                {
                  "name": "Create `tests/config/conftest.py` with `tmp_path`-based fixtures for user and project config files",
                  "done": true
                },
                {
                  "name": "Create `tests/config/test_manager.py`",
                  "done": true
                },
                {
                  "name": "Test: `load_config` returns defaults when no config files exist",
                  "done": true
                },
                {
                  "name": "Test: user config file overrides defaults",
                  "done": true
                },
                {
                  "name": "Test: project config file overrides user config",
                  "done": true
                },
                {
                  "name": "Test: precedence chain — project > user > default",
                  "done": true
                },
                {
                  "name": "Test: `get_config` returns single key value",
                  "done": true
                },
                {
                  "name": "Test: `set_config` creates user config file and directories",
                  "done": true
                },
                {
                  "name": "Test: `set_config` with `project=True` writes to project config",
                  "done": true
                },
                {
                  "name": "Test: `set_config` coerces string value to int for `verbosity`",
                  "done": true
                },
                {
                  "name": "Test: `set_config` raises `KeyError` for unknown key",
                  "done": true
                },
                {
                  "name": "Test: `resolve_config_source` returns correct source label",
                  "done": true
                },
                {
                  "name": "SC: All tests pass",
                  "done": true
                },
                {
                  "name": "SC: `ruff check` passes",
                  "done": true
                },
                {
                  "name": "Create `src/orchestration/cli/commands/config.py`",
                  "done": true
                },
                {
                  "name": "`config_app = typer.Typer(name=\"config\", ...)`",
                  "done": true
                },
                {
                  "name": "`config set KEY VALUE [--project]` — calls `set_config`, prints confirmation with source",
                  "done": true
                },
                {
                  "name": "`config get KEY [--cwd DIR]` — calls `get_config` and `resolve_config_source`, prints value and source",
                  "done": true
                },
                {
                  "name": "`config list [--cwd DIR]` — iterates `CONFIG_KEYS`, prints each key's resolved value and source in aligned columns",
                  "done": true
                },
                {
                  "name": "`config path` — prints both config file paths with existence status",
                  "done": true
                },
                {
                  "name": "Register `config_app` in `src/orchestration/cli/app.py` via `app.add_typer(config_app, name=\"config\")`",
                  "done": true
                },
                {
                  "name": "SC: `orchestration config --help` works",
                  "done": true
                },
                {
                  "name": "SC: `ruff check` and `pyright` pass",
                  "done": true
                },
                {
                  "name": "Create `tests/config/test_cli_config.py`",
                  "done": true
                },
                {
                  "name": "Test: `config set KEY VALUE` writes to user config",
                  "done": true
                },
                {
                  "name": "Test: `config set KEY VALUE --project` writes to project config",
                  "done": true
                },
                {
                  "name": "Test: `config get KEY` displays resolved value and source",
                  "done": true
                },
                {
                  "name": "Test: `config list` shows all keys with values and sources",
                  "done": true
                },
                {
                  "name": "Test: `config path` shows both file paths",
                  "done": true
                },
                {
                  "name": "Test: unknown key produces error message and non-zero exit",
                  "done": true
                },
                {
                  "name": "SC: All tests pass",
                  "done": true
                },
                {
                  "name": "SC: `ruff check` passes",
                  "done": true
                },
                {
                  "name": "`git add` and commit config module, CLI commands, and tests",
                  "done": true
                },
                {
                  "name": "SC: All tests pass before commit",
                  "done": true
                },
                {
                  "name": "Modify `_display_terminal` in `src/orchestration/cli/commands/review.py`",
                  "done": true
                },
                {
                  "name": "Accept `verbosity: int` parameter (default `0`)",
                  "done": true
                },
                {
                  "name": "Verbosity 0: verdict badge + finding headings with severity (no descriptions)",
                  "done": true
                },
                {
                  "name": "Verbosity 1: above + full finding descriptions",
                  "done": true
                },
                {
                  "name": "Verbosity 2: above + raw_output (tool usage details are embedded in agent output)",
                  "done": true
                },
                {
                  "name": "Update `display_result` signature to accept `verbosity`",
                  "done": true
                },
                {
                  "name": "Update `_run_review_command` to accept and pass through `verbosity`",
                  "done": true
                },
                {
                  "name": "Add `-v` / `--verbose` flag to `review_arch`, `review_tasks`, `review_code` commands",
                  "done": true
                },
                {
                  "name": "`-v` sets verbosity 1, `-vv` sets verbosity 2 (use `typer.Option` count or explicit int)",
                  "done": true
                },
                {
                  "name": "If no flag, read default from config via `get_config(\"verbosity\")`",
                  "done": true
                },
                {
                  "name": "SC: `ruff check` and `pyright` pass",
                  "done": true
                },
                {
                  "name": "Modify `_display_terminal` in `src/orchestration/cli/commands/review.py`",
                  "done": true
                },
                {
                  "name": "Severity badges: keep bright green (PASS), yellow/amber (CONCERN), red (FAIL)",
                  "done": true
                },
                {
                  "name": "Finding headings: use `bold white` (high luminance, readable on any background)",
                  "done": true
                },
                {
                  "name": "Body text (descriptions): use default terminal foreground (no explicit color style) instead of `dim`",
                  "done": true
                },
                {
                  "name": "File paths and code references: use `cyan`",
                  "done": true
                },
                {
                  "name": "All styling via Rich markup — no raw ANSI escape codes",
                  "done": true
                },
                {
                  "name": "SC: Output is readable on both dark and light terminal backgrounds",
                  "done": true
                },
                {
                  "name": "SC: `ruff check` passes",
                  "done": true
                },
                {
                  "name": "Update `tests/review/test_cli_review.py` (or create separate `test_verbosity.py` if cleaner)",
                  "done": true
                },
                {
                  "name": "Test: verbosity 0 shows verdict and finding headings but NOT descriptions",
                  "done": true
                },
                {
                  "name": "Test: verbosity 1 shows verdict, headings, AND descriptions",
                  "done": true
                },
                {
                  "name": "Test: verbosity 2 includes raw output",
                  "done": true
                },
                {
                  "name": "Test: `-v` flag sets verbosity 1",
                  "done": true
                },
                {
                  "name": "Test: config-based default verbosity is respected when no flag given",
                  "done": true
                },
                {
                  "name": "SC: All tests pass",
                  "done": true
                },
                {
                  "name": "SC: `ruff check` passes",
                  "done": true
                },
                {
                  "name": "`git add` and commit review display changes and tests",
                  "done": true
                },
                {
                  "name": "SC: All tests pass before commit",
                  "done": true
                },
                {
                  "name": "Modify `review_code` command in `src/orchestration/cli/commands/review.py`",
                  "done": true
                },
                {
                  "name": "Add `--rules PATH` option (default: `None`)",
                  "done": true
                },
                {
                  "name": "If no `--rules` flag, fall back to `get_config(\"default_rules\")`",
                  "done": true
                },
                {
                  "name": "If rules path is set, read file content at CLI level",
                  "done": true
                },
                {
                  "name": "Pass rules content to `_run_review_command` as part of inputs or as separate parameter",
                  "done": true
                },
                {
                  "name": "Modify `_execute_review` (or `run_review` in runner) to accept optional rules content",
                  "done": true
                },
                {
                  "name": "When rules content is provided, append to template's system prompt as `\\n\\n## Additional Review Rules\\n\\n{rules_conte...",
                  "done": true
                },
                {
                  "name": "The modification happens on a copy of the template's system_prompt, not the template itself",
                  "done": true
                },
                {
                  "name": "SC: `ruff check` and `pyright` pass",
                  "done": true
                },
                {
                  "name": "Add tests to `tests/review/test_cli_review.py` (or new `test_rules.py`)",
                  "done": true
                },
                {
                  "name": "Test: `--rules path/to/file` reads the file and appends content to system prompt",
                  "done": true
                },
                {
                  "name": "Test: config-based `default_rules` is used when no `--rules` flag",
                  "done": true
                },
                {
                  "name": "Test: `--rules` flag overrides config-based default_rules",
                  "done": true
                },
                {
                  "name": "Test: missing rules file produces error and non-zero exit",
                  "done": true
                },
                {
                  "name": "SC: All tests pass",
                  "done": true
                },
                {
                  "name": "SC: `ruff check` passes",
                  "done": true
                },
                {
                  "name": "Modify review commands (`review_arch`, `review_tasks`, `review_code`) to read `cwd` from config when `--cwd` flag is ...",
                  "done": true
                },
                {
                  "name": "CLI `--cwd` flag overrides config value",
                  "done": true
                },
                {
                  "name": "Config `cwd` overrides default `\".\"`",
                  "done": true
                },
                {
                  "name": "Add tests for config-based cwd resolution",
                  "done": true
                },
                {
                  "name": "Test: review command uses config cwd when no `--cwd` flag",
                  "done": true
                },
                {
                  "name": "Test: `--cwd` flag overrides config value",
                  "done": true
                },
                {
                  "name": "SC: All tests pass",
                  "done": true
                },
                {
                  "name": "`git add` and commit rules flag, config integration, and tests",
                  "done": true
                },
                {
                  "name": "SC: All tests pass before commit",
                  "done": true
                },
                {
                  "name": "Run full test suite: `uv run pytest`",
                  "done": true
                },
                {
                  "name": "Run type checker: `uv run pyright`",
                  "done": true
                },
                {
                  "name": "Run linter/formatter: `uv run ruff check` and `uv run ruff format --check`",
                  "done": true
                },
                {
                  "name": "SC: All tests pass",
                  "done": true
                },
                {
                  "name": "SC: Zero pyright errors",
                  "done": true
                },
                {
                  "name": "SC: Zero ruff errors",
                  "done": true
                },
                {
                  "name": "Create `docs/README.md` (primary documentation for external users)",
                  "done": true
                },
                {
                  "name": "Hero section: one sentence, install command, one example",
                  "done": true
                },
                {
                  "name": "Quickstart: clone → install → configure credentials → run first review (target: 5 minutes)",
                  "done": true
                },
                {
                  "name": "Command reference: all commands with examples (review arch/tasks/code/list, config set/get/list/path)",
                  "done": true
                },
                {
                  "name": "Configuration: user vs project config, all keys, examples",
                  "done": true
                },
                {
                  "name": "Review templates: what each template does, when to use it",
                  "done": true
                },
                {
                  "name": "Architecture: brief overview for contributors",
                  "done": true
                },
                {
                  "name": "SC: README enables a new user to install and run first review in under 5 minutes",
                  "done": true
                },
                {
                  "name": "SC: All commands documented with examples",
                  "done": true
                },
                {
                  "name": "Create `docs/COMMANDS.md` (full command reference)",
                  "done": true
                },
                {
                  "name": "Every command and subcommand with all flags, types, defaults",
                  "done": true
                },
                {
                  "name": "Usage examples for each command",
                  "done": true
                },
                {
                  "name": "Exit codes documented",
                  "done": true
                },
                {
                  "name": "SC: Every CLI command is represented",
                  "done": true
                },
                {
                  "name": "Create `docs/TEMPLATES.md` (template authoring guide for future user-defined templates)",
                  "done": true
                },
                {
                  "name": "YAML schema reference with all fields",
                  "done": true
                },
                {
                  "name": "Example template (annotated)",
                  "done": true
                },
                {
                  "name": "Explanation of `prompt_template` vs `prompt_builder`",
                  "done": true
                },
                {
                  "name": "Input definitions (required/optional)",
                  "done": true
                },
                {
                  "name": "How to register a custom template",
                  "done": true
                },
                {
                  "name": "Noted as future capability — not yet implemented for end users",
                  "done": true
                },
                {
                  "name": "SC: A developer can understand how to create a custom template from this guide",
                  "done": true
                },
                {
                  "name": "`git add` and commit all docs",
                  "done": true
                },
                {
                  "name": "SC: Documentation is committed",
                  "done": true
                },
                {
                  "name": "Run full test suite: `uv run pytest`",
                  "done": true
                },
                {
                  "name": "Run type checker: `uv run pyright`",
                  "done": true
                },
                {
                  "name": "Run linter/formatter: `uv run ruff check` and `uv run ruff format --check`",
                  "done": true
                },
                {
                  "name": "SC: All tests pass",
                  "done": true
                },
                {
                  "name": "SC: Zero pyright errors",
                  "done": true
                },
                {
                  "name": "SC: Zero ruff errors",
                  "done": true
                },
                {
                  "name": "Write session summary to DEVLOG.md per prompt.ai-project.system.md guidance",
                  "done": true
                },
                {
                  "name": "SC: DEVLOG entry captures slice 106 completion, commit hashes, test counts",
                  "done": true
                }
              ]
            }
          },
          {
            "index": "109",
            "name": "supervisor",
            "status": "not-started",
            "dateCreated": "20260218",
            "dateUpdated": "20260218"
          }
        ],
        "features": [],
        "arch": {
          "index": "100",
          "name": "orchestration-v2",
          "status": "in-progress",
          "dateCreated": "20251019",
          "dateUpdated": "20260219"
        },
        "slicePlan": {
          "index": "100",
          "name": "orchestration-v2",
          "status": "not-started",
          "dateCreated": "20260217",
          "dateUpdated": "20260221",
          "futureWork": []
        }
      },
      "120": {
        "name": "Automated Dev Pipeline",
        "slices": [],
        "features": [],
        "arch": {
          "index": "120",
          "name": "automated-dev-pipeline",
          "status": "not-started",
          "dateCreated": "20260221",
          "dateUpdated": "20260221"
        }
      }
    },
    "futureSlices": [],
    "quality": [
      {
        "index": "906",
        "name": "model-selection-feature",
        "status": "not-started",
        "dateCreated": "20260223"
      }
    ],
    "investigation": [],
    "maintenance": [
      {
        "index": "906",
        "name": "code-review.model-selection",
        "status": "not-started",
        "dateCreated": "20260223",
        "taskCount": 19,
        "completedTasks": 0
      }
    ],
    "devlog": true
  }
};

// ============================================================================
// UTILITIES
// ============================================================================
const fmtDate = (d) => d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null;
const dateTip = (item) => {
  if (!item?.dateCreated && !item?.dateUpdated) return null;
  const p = [];
  if (item.status === "complete") {
    if (item.dateCreated) p.push(`Started ${fmtDate(item.dateCreated)}`);
    if (item.dateUpdated) p.push(`Completed ${fmtDate(item.dateUpdated)}`);
  } else if (item.status === "in-progress") {
    if (item.dateCreated) p.push(`Started ${fmtDate(item.dateCreated)}`);
    if (item.dateUpdated) p.push(`Updated ${fmtDate(item.dateUpdated)}`);
  } else {
    if (item.dateCreated) p.push(`Created ${fmtDate(item.dateCreated)}`);
  }
  return p.join("  ·  ") || null;
};

// ============================================================================
// SMALL COMPONENTS
// ============================================================================

// Wider hover target — wraps both the dot AND the index number
const StatusZone = ({ status, item, index, colorSet }) => {
  const tip = dateTip(item);
  const inner = (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: THEME.sp.sm,
      padding: "2px 4px", borderRadius: 6, cursor: tip ? "default" : "inherit",
      transition: "background-color 0.15s ease",
    }}
      onMouseEnter={(e) => { if (tip) e.currentTarget.style.backgroundColor = "#ffffff08"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      <span style={{
        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
        backgroundColor: THEME.status[status] || THEME.status["not-started"], flexShrink: 0,
      }} />
      <span style={{
        fontFamily: THEME.fonts.heading, fontSize: 11,
        color: colorSet.accent, opacity: 0.8, minWidth: 28, flexShrink: 0,
      }}>{index}</span>
    </span>
  );
  return tip ? <Tooltip content={tip}>{inner}</Tooltip> : inner;
};

const Badge = ({ children, colorSet, dimmed }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 8px",
    borderRadius: THEME.radius / 2,
    backgroundColor: dimmed ? colorSet.accent + "18" : colorSet.accent + "30",
    color: dimmed ? colorSet.accent + "90" : colorSet.accent,
    fontSize: 10, fontFamily: THEME.fonts.heading, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0,
  }}>{children}</span>
);

const TaskPill = ({ taskCount, completedTasks, accentColor }) => {
  if (taskCount === undefined) return null;
  const done = completedTasks === taskCount;
  const color = accentColor || (done ? THEME.status.complete : "#8888AA");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px",
      borderRadius: 4, backgroundColor: done ? THEME.status.complete + "20" : "#ffffff10",
      fontFamily: THEME.fonts.heading, fontSize: 10,
      color, flexShrink: 0,
    }}>
      <span style={{ fontSize: 8 }}>✓</span>{completedTasks}/{taskCount}
    </span>
  );
};

// ============================================================================
// TASK ITEM LIST — expandable from task blocks
// ============================================================================
const TaskItemList = ({ items, colorSet }) => {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: THEME.sp.sm, paddingLeft: 4 }}>
      {items.map((t, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: THEME.sp.sm,
          padding: "3px 0", borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
        }}>
          <span style={{
            fontSize: 11, lineHeight: "18px", flexShrink: 0,
            color: t.done ? THEME.status.complete : "#555577",
          }}>{t.done ? "✓" : "○"}</span>
          <span style={{
            fontFamily: THEME.fonts.body, fontSize: 12, lineHeight: "18px",
            color: t.done ? colorSet.text + "90" : colorSet.text + "60",
            textDecoration: t.done ? "none" : "none",
          }}>{t.name}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// FUTURE WORK BLOCK — solid dimmed border + hash pattern
// ============================================================================
const FutureBlock = ({ item, colorSet }) => (
  <div style={{
    position: "relative", borderRadius: THEME.radius,
    border: `1px solid ${colorSet.border}40`,
    padding: THEME.sp.md, marginBottom: THEME.sp.sm, overflow: "hidden",
  }}>
    <div style={{ position: "absolute", inset: 0, backgroundColor: colorSet.bg + "40", borderRadius: THEME.radius }} />
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: THEME.radius }}>
      <rect width="100%" height="100%" fill="url(#fh)" />
    </svg>
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: THEME.sp.sm }}>
      <span style={{
        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
        backgroundColor: THEME.status["not-started"], flexShrink: 0,
      }} />
      <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: colorSet.accent, opacity: 0.5, minWidth: 28 }}>{item.index}</span>
      <Badge colorSet={colorSet} dimmed>FUTURE</Badge>
      <span style={{ fontFamily: THEME.fonts.body, fontSize: 13, color: colorSet.text, opacity: 0.6, fontWeight: 500 }}>{item.name}</span>
    </div>
  </div>
);

// ============================================================================
// FUTURE SLICES GROUP — collapsible collection of future slices
// ============================================================================
const FutureSlicesGroup = ({ items }) => {
  const [expanded, setExpanded] = useState(false);
  const colorSet = THEME.colors.slice;
  return (
    <div style={{ marginTop: THEME.sp.sm }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          position: "relative", borderRadius: THEME.radius,
          border: `1px solid ${colorSet.border}40`,
          padding: `${THEME.sp.sm}px ${THEME.sp.md}px`, overflow: "hidden",
          cursor: "pointer", transition: "all 0.15s ease",
        }}
      >
        <div style={{ position: "absolute", inset: 0, backgroundColor: colorSet.bg + "30", borderRadius: THEME.radius }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: THEME.radius }}>
          <rect width="100%" height="100%" fill="url(#fh)" />
        </svg>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: THEME.sp.sm }}>
          <span style={{
            color: colorSet.accent, fontSize: 12, fontFamily: THEME.fonts.heading,
            width: 16, flexShrink: 0, transition: "transform 0.15s ease",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", opacity: 0.5,
          }}>▶</span>
          <span style={{
            fontFamily: THEME.fonts.heading, fontSize: 10, color: "#555577",
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>Future Slices</span>
          <span style={{
            fontFamily: THEME.fonts.heading, fontSize: 10, color: colorSet.accent, opacity: 0.4,
          }}>{items.length}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: THEME.sp.sm, paddingLeft: THEME.sp.md }}>
          {[...items].sort((a, b) => parseInt(a.index) - parseInt(b.index)).map((fs, i) => <FutureBlock key={i} item={fs} colorSet={colorSet} />)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DOC BLOCK — core reusable block
// showTaskPill: only true at task-level or lower
// ============================================================================
const DocBlock = ({
  colorSet, label, name, index, status, children, expandable,
  defaultExpanded = false, count, countLabel, item,
  taskCount, completedTasks, showTaskPill = false, futureWork,
  taskItems,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasKids = expandable && (children || (taskItems && taskItems.length > 0));
  const hasFuture = futureWork?.length > 0;

  return (
    <div style={{
      backgroundColor: colorSet.bg, border: `1px solid ${colorSet.border}`,
      borderRadius: THEME.radius, padding: THEME.sp.md,
      marginBottom: THEME.sp.sm, transition: "all 0.15s ease",
      cursor: hasKids ? "pointer" : "default",
    }}
      onClick={hasKids ? (e) => { e.stopPropagation(); setExpanded(!expanded); } : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.sm }}>
        {hasKids && (
          <span style={{
            color: colorSet.accent, fontSize: 12, fontFamily: THEME.fonts.heading,
            width: 16, flexShrink: 0, transition: "transform 0.15s ease",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
          }}>▶</span>
        )}
        <StatusZone status={status} item={item} index={index} colorSet={colorSet} />
        <Badge colorSet={colorSet}>{label}</Badge>
        <span style={{
          fontFamily: THEME.fonts.body, fontSize: 13, color: colorSet.text, fontWeight: 500,
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{name}</span>
        {showTaskPill && <TaskPill taskCount={taskCount} completedTasks={completedTasks} accentColor={colorSet.accent} />}
        {count !== undefined && (
          <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: colorSet.accent, opacity: 0.7, flexShrink: 0 }}>
            {count} {countLabel || (count === 1 ? "slice" : "slices")}
          </span>
        )}
      </div>
      {expanded && (
        <div style={{ marginTop: THEME.sp.md, paddingLeft: hasKids ? THEME.sp.md : 0 }}>
          {children}
          {taskItems && taskItems.length > 0 && <TaskItemList items={taskItems} colorSet={colorSet} />}
          {hasFuture && (
            <>
              <div style={{
                fontFamily: THEME.fonts.heading, fontSize: 10, color: "#6666AA",
                textTransform: "uppercase", letterSpacing: "0.1em",
                margin: `${THEME.sp.md}px 0 ${THEME.sp.sm}px 0`,
                paddingTop: THEME.sp.sm, borderTop: "1px solid #2A2A4E",
              }}>Future Work</div>
              {futureWork.map((fw, i) => <FutureBlock key={i} item={fw} colorSet={colorSet} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// INITIATIVE CARD
// ============================================================================
const InitiativeCard = ({ band, initiative, futureSlices }) => {
  const [expanded, setExpanded] = useState(false);
  const done = initiative.slices.filter((s) => s.status === "complete").length;
  const total = initiative.slices.length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const tTotal = initiative.slices.reduce((s, sl) => s + (sl.tasks?.taskCount || 0), 0);
  const tDone = initiative.slices.reduce((s, sl) => s + (sl.tasks?.completedTasks || 0), 0);
  const related = futureSlices?.filter((f) => f.parent === String(band)) || [];

  return (
    <div style={{
      backgroundColor: "#1A1A2E", border: "1px solid #2A2A4E",
      borderRadius: THEME.radius + 4, padding: THEME.sp.lg, marginBottom: THEME.sp.lg,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.md, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}>
        <span style={{
          fontFamily: THEME.fonts.heading, fontSize: 22, color: "#FFD700",
          fontWeight: 700, opacity: 0.3, minWidth: 48,
        }}>{band}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: THEME.fonts.heading, fontSize: 16, color: "#E8E8FF", fontWeight: 600, marginBottom: 4 }}>
            {initiative.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.md, flexWrap: "wrap" }}>
            {total > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.sm }}>
                <div style={{ width: 120, height: 4, backgroundColor: "#2A2A4E", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 2,
                    backgroundColor: pct === 100 ? THEME.status.complete : THEME.status["in-progress"],
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#8888AA" }}>{done}/{total}</span>
              </div>
            )}
            {tTotal > 0 && (
              <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#6666AA" }}>{tDone}/{tTotal} tasks</span>
            )}
            {related.length > 0 && (
              <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#555577", fontStyle: "italic" }}>+{related.length} future</span>
            )}
          </div>
        </div>
        <span style={{
          color: "#8888AA", fontSize: 14, transition: "transform 0.15s ease",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
        }}>▶</span>
      </div>

      {expanded && (
        <div style={{ paddingLeft: THEME.sp.sm, marginTop: THEME.sp.md }}>
          {initiative.arch && (
            <DocBlock colorSet={THEME.colors.architecture} label="ARCH"
              name={initiative.arch.name} index={initiative.arch.index}
              status={initiative.arch.status} item={initiative.arch} />
          )}
          {initiative.slicePlan && (
            <DocBlock colorSet={THEME.colors.slicePlan} label="PLAN"
              name={initiative.slicePlan.name} index={initiative.slicePlan.index}
              status={initiative.slicePlan.status} item={initiative.slicePlan}
              expandable={initiative.slices.length > 0 || (initiative.slicePlan.futureWork || []).length > 0}
              count={initiative.slices.length} futureWork={initiative.slicePlan.futureWork}>
              {initiative.slices.map((sl, i) => (
                <DocBlock key={i} colorSet={THEME.colors.slice} label="SLICE"
                  name={sl.name} index={sl.index} status={sl.status} item={sl}
                  expandable={!!sl.tasks || sl.features?.length > 0}>
                  {sl.tasks && (
                    <DocBlock colorSet={THEME.colors.tasks} label="TASKS"
                      name={sl.tasks.name} index={sl.tasks.index}
                      status={sl.tasks.status} item={sl.tasks}
                      showTaskPill taskCount={sl.tasks.taskCount} completedTasks={sl.tasks.completedTasks}
                      expandable={sl.tasks.items?.length > 0}
                      taskItems={sl.tasks.items} />
                  )}
                  {sl.features?.map((f, j) => (
                    <DocBlock key={j} colorSet={THEME.colors.feature} label="FEAT"
                      name={f.name} index={f.index} status={f.status} item={f} />
                  ))}
                </DocBlock>
              ))}
            </DocBlock>
          )}

          {related.length > 0 && <FutureSlicesGroup items={related} />}

          {!initiative.slicePlan && initiative.slices.length === 0 && (
            <div style={{
              padding: THEME.sp.md, color: "#8888AA", fontFamily: THEME.fonts.body,
              fontSize: 12, fontStyle: "italic", borderLeft: "2px solid #2A2A4E", marginLeft: THEME.sp.md,
            }}>Slice planning not yet started</div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PROJECT VIEW
// ============================================================================
const ProjectView = ({ data }) => {
  const bands = Object.entries(data.initiatives).sort(([a], [b]) => Number(a) - Number(b));
  const stats = useMemo(() => {
    let ts = 0, cs = 0, tt = 0, ct = 0;
    bands.forEach(([, init]) => {
      ts += init.slices.length;
      cs += init.slices.filter((s) => s.status === "complete").length;
      init.slices.forEach((s) => { tt += s.tasks?.taskCount || 0; ct += s.tasks?.completedTasks || 0; });
    });
    return { ts, cs, tt, ct, ni: bands.length };
  }, [bands]);

  return (
    <div>
      <div style={{ marginBottom: THEME.sp.xl }}>
        <h2 style={{ fontFamily: THEME.fonts.heading, fontSize: 20, color: "#E8E8FF", fontWeight: 700, margin: "0 0 4px 0" }}>
          {data.name}
        </h2>
        <p style={{ fontFamily: THEME.fonts.body, fontSize: 13, color: "#8888AA", margin: "0 0 12px 0" }}>{data.description}</p>
        <div style={{ display: "flex", gap: THEME.sp.lg, flexWrap: "wrap" }}>
          {[
            { l: "Initiatives", v: stats.ni },
            { l: "Slices", v: `${stats.cs}/${stats.ts}` },
            { l: "Tasks", v: `${stats.ct}/${stats.tt}` },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: THEME.sp.xs }}>
              <span style={{ fontFamily: THEME.fonts.heading, fontSize: 20, color: "#FFD700", fontWeight: 700 }}>{s.v}</span>
              <span style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#6666AA", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {(data.projectArchitecture.length > 0 || data.foundation.length > 0) && (
        <div style={{
          marginBottom: THEME.sp.xl, padding: THEME.sp.lg,
          backgroundColor: "#12121F", borderRadius: THEME.radius + 4, border: "1px solid #1E1E3A",
        }}>
          <div style={{
            fontFamily: THEME.fonts.heading, fontSize: 11, color: "#6666AA",
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: THEME.sp.md,
          }}>Project-Level Documents</div>
          {data.foundation.map((d, i) => (
            <DocBlock key={`f${i}`} colorSet={THEME.colors.foundation}
              label={d.type?.toUpperCase() || "FOUND"} name={d.name}
              index={d.index} status={d.status} item={d} />
          ))}
          {data.projectArchitecture.map((d, i) => (
            <DocBlock key={`a${i}`} colorSet={THEME.colors.projectLevel}
              label={d.type?.toUpperCase() || "ARCH"} name={d.name}
              index={d.index} status={d.status} item={d} />
          ))}
        </div>
      )}

      {bands.map(([band, init]) => (
        <InitiativeCard key={band} band={band} initiative={init} futureSlices={data.futureSlices} />
      ))}

      {(data.quality.length > 0 || data.investigation.length > 0 || data.maintenance.length > 0) && (
        <div style={{ borderTop: "1px solid #2A2A4E", paddingTop: THEME.sp.lg, marginTop: THEME.sp.lg }}>
          <h3 style={{
            fontFamily: THEME.fonts.heading, fontSize: 12, color: "#6666AA",
            textTransform: "uppercase", letterSpacing: "0.1em", margin: `0 0 ${THEME.sp.md}px 0`,
          }}>Operational</h3>
          {data.quality.map((d, i) => <DocBlock key={`q${i}`} colorSet={THEME.colors.review} label="REVIEW" name={d.name} index={d.index} status={d.status} item={d} />)}
          {data.investigation.map((d, i) => <DocBlock key={`an${i}`} colorSet={THEME.colors.analysis} label="ANALYSIS" name={d.name} index={d.index} status={d.status} item={d} />)}
          {data.maintenance.map((d, i) => <DocBlock key={`m${i}`} colorSet={THEME.colors.maintenance} label="MAINT" name={d.name} index={d.index} status={d.status} item={d} />)}
        </div>
      )}

      {data.devlog && (
        <div style={{ marginTop: THEME.sp.md }}>
          <DocBlock colorSet={THEME.colors.devlog} label="DEVLOG" name="DEVLOG.md" index="—" status="in-progress" />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// LEGEND
// ============================================================================
const Legend = () => (
  <div style={{
    display: "flex", gap: THEME.sp.xl, padding: THEME.sp.md,
    backgroundColor: "#12121F", borderRadius: THEME.radius, marginBottom: THEME.sp.xl, flexWrap: "wrap",
  }}>
    <div style={{ display: "flex", gap: THEME.sp.md, flexWrap: "wrap", flex: 1 }}>
      {[
        ["Architecture", THEME.colors.architecture],
        ["Slice Plan", THEME.colors.slicePlan],
        ["Slice", THEME.colors.slice],
        ["Tasks", THEME.colors.tasks],
        ["Feature", THEME.colors.feature],
        ["DevLog", THEME.colors.devlog],
      ].map(([l, cs]) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: THEME.sp.xs }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: cs.bg, border: `1px solid ${cs.border}` }} />
          <span style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#8888AA" }}>{l}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.xs }}>
        <div style={{ position: "relative", width: 14, height: 14, borderRadius: 4, overflow: "hidden", border: "1px solid #9B7CBC40" }}>
          <div style={{ position: "absolute", inset: 0, backgroundColor: "#7C5C9C40" }} />
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <rect width="100%" height="100%" fill="url(#fhd)" />
          </svg>
        </div>
        <span style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#8888AA" }}>Future</span>
      </div>
    </div>
    <div style={{ display: "flex", gap: THEME.sp.md, borderLeft: "1px solid #2A2A4E", paddingLeft: THEME.sp.lg }}>
      {[
        ["Complete", THEME.status.complete],
        ["In Progress", THEME.status["in-progress"]],
        ["Not Started", THEME.status["not-started"]],
      ].map(([l, c]) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: THEME.sp.xs }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: c }} />
          <span style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#8888AA" }}>{l}</span>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// MAIN
// ============================================================================
export default function ProjectStructureVisualizer() {
  const keys = Object.keys(SAMPLE_PROJECTS);
  const [active, setActive] = useState(keys[0]);

  return (
    <div style={{ backgroundColor: "#0D0D1A", minHeight: "100vh", padding: THEME.sp.xl, fontFamily: THEME.fonts.body }}>
      <PatternDefs />
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: THEME.sp.xl, flexWrap: "wrap", gap: THEME.sp.md,
      }}>
        <div>
          <h1 style={{ fontFamily: THEME.fonts.heading, fontSize: 24, color: "#E8E8FF", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#FFD700", opacity: 0.6 }}>⬡</span> Project Structure
          </h1>
          <p style={{ fontFamily: THEME.fonts.body, fontSize: 12, color: "#6666AA", margin: "4px 0 0 0" }}>
            ai-project-guide methodology visualizer
          </p>
        </div>
        <div style={{ display: "flex", gap: THEME.sp.xs }}>
          {keys.map((k) => (
            <button key={k} onClick={() => setActive(k)} style={{
              fontFamily: THEME.fonts.heading, fontSize: 12,
              padding: `${THEME.sp.sm}px ${THEME.sp.lg}px`,
              borderRadius: THEME.radius, border: "1px solid",
              borderColor: active === k ? "#FFD700" : "#2A2A4E",
              backgroundColor: active === k ? "#FFD70015" : "transparent",
              color: active === k ? "#FFD700" : "#6666AA",
              cursor: "pointer", transition: "all 0.15s ease",
            }}>
              {SAMPLE_PROJECTS[k].name}
            </button>
          ))}
        </div>
      </div>
      <Legend />
      <ProjectView data={SAMPLE_PROJECTS[active]} />
    </div>
  );
}
