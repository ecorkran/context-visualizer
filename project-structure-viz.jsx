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
  "context-forge-old": {
    name: "Context Forge",
    description: "MCP server for structured context prompt generation",
    foundation: [
      { index: "001", type: "concept", name: "concept.context-forge", status: "complete", dateCreated: "20260110", dateUpdated: "20260112" },
    ],
    projectArchitecture: [
      { index: "050", type: "hld", name: "hld-context-forge", status: "complete", dateCreated: "20260110", dateUpdated: "20260115" },
    ],
    initiatives: {
      140: {
        name: "Context Forge Restructure",
        arch: { index: "140", name: "arch.context-forge-restructure", status: "complete", dateCreated: "20260115", dateUpdated: "20260122" },
        slicePlan: {
          index: "140", name: "slices.context-forge-restructure", status: "complete",
          dateCreated: "20260115", dateUpdated: "20260122",
          futureWork: [
            { index: "F1", name: "Project Schema Standardization", status: "not-started" },
            { index: "F2", name: "Command Grammar & Slash Commands", status: "not-started" },
          ],
        },
        slices: [
          { index: "140", name: "monorepo-scaffolding", status: "complete", dateCreated: "20260116", dateUpdated: "20260116",
            tasks: { index: "140", name: "tasks.monorepo-scaffolding", status: "complete", taskCount: 8, completedTasks: 8,
              items: [
                { name: "Initialize pnpm workspace", done: true },
                { name: "Create packages/core directory structure", done: true },
                { name: "Create packages/mcp-server scaffold", done: true },
                { name: "Configure shared tsconfig base", done: true },
                { name: "Move src/ to packages/electron/src/", done: true },
                { name: "Set up cross-package references", done: true },
                { name: "Verify workspace build pipeline", done: true },
                { name: "Update CI configuration", done: true },
              ] } },
          { index: "141", name: "core-types-extraction", status: "complete", dateCreated: "20260116", dateUpdated: "20260117",
            tasks: { index: "141", name: "tasks.core-types-extraction", status: "complete", taskCount: 6, completedTasks: 6,
              items: [
                { name: "Extract ProjectData interface to core", done: true },
                { name: "Extract SliceConfig and TaskConfig types", done: true },
                { name: "Extract PromptTemplate types", done: true },
                { name: "Create core/src/types/index.ts barrel", done: true },
                { name: "Update electron imports to use @context-forge/core", done: true },
                { name: "Verify type-check across all packages", done: true },
              ] } },
          { index: "142", name: "core-services-extraction", status: "complete", dateCreated: "20260117", dateUpdated: "20260118",
            tasks: { index: "142", name: "tasks.core-services-extraction", status: "complete", taskCount: 10, completedTasks: 10,
              items: [
                { name: "Extract SystemPromptParser to core", done: true },
                { name: "Extract StatementManager to core", done: true },
                { name: "Extract TemplateEngine to core", done: true },
                { name: "Extract ProjectValidator service", done: true },
                { name: "Remove Electron dependencies from extracted services", done: true },
                { name: "Create service factory pattern", done: true },
                { name: "Add unit tests for extracted services", done: true },
                { name: "Wire up dependency injection", done: true },
                { name: "Update electron to consume core services", done: true },
                { name: "Verify no Electron imports leak into core", done: true },
              ] } },
          { index: "143", name: "core-orchestration-extraction", status: "complete", dateCreated: "20260118", dateUpdated: "20260119",
            tasks: { index: "143", name: "tasks.core-orchestration-extraction", status: "complete", taskCount: 9, completedTasks: 9,
              items: [
                { name: "Extract ContextAssembler to core", done: true },
                { name: "Extract PromptOrchestrator to core", done: true },
                { name: "Extract pipeline coordination logic", done: true },
                { name: "Create AssemblyPipeline interface", done: true },
                { name: "Implement phase-based assembly", done: true },
                { name: "Add orchestration unit tests", done: true },
                { name: "Remove IPC wrappers from core path", done: true },
                { name: "Wire orchestration into service factory", done: true },
                { name: "Integration test: full assembly pipeline", done: true },
              ] } },
          { index: "144", name: "storage-migration", status: "complete", dateCreated: "20260118", dateUpdated: "20260119",
            tasks: { index: "144", name: "tasks.storage-migration", status: "complete", taskCount: 11, completedTasks: 11,
              items: [
                { name: "Implement FileProjectStore", done: true },
                { name: "Implement getStoragePath() with env-paths", done: true },
                { name: "Create storage abstraction interface", done: true },
                { name: "Build migration script from electron-store", done: true },
                { name: "Add JSON file read/write with atomicity", done: true },
                { name: "Handle concurrent access edge cases", done: true },
                { name: "Add storage unit tests", done: true },
                { name: "Create backup mechanism for migration", done: true },
                { name: "Wire FileProjectStore into core", done: true },
                { name: "Replace ElectronStorageService references", done: true },
                { name: "Verify data integrity post-migration", done: true },
              ] } },
          { index: "145", name: "mcp-server-project-tools", status: "complete", dateCreated: "20260119", dateUpdated: "20260120",
            tasks: { index: "145", name: "tasks.mcp-server-project-tools", status: "complete", taskCount: 7, completedTasks: 7,
              items: [
                { name: "Scaffold MCP server with StdioTransport", done: true },
                { name: "Implement project_list tool", done: true },
                { name: "Implement project_get tool", done: true },
                { name: "Implement project_update tool", done: true },
                { name: "Add zod input validation schemas", done: true },
                { name: "Add MCP server unit tests", done: true },
                { name: "Verify stdio transport end-to-end", done: true },
              ] } },
          { index: "146", name: "mcp-context-tools", status: "complete", dateCreated: "20260120", dateUpdated: "20260121",
            tasks: { index: "146", name: "tasks.mcp-context-tools", status: "complete", taskCount: 8, completedTasks: 8,
              items: [
                { name: "Implement context_build tool", done: true },
                { name: "Implement template_preview tool", done: true },
                { name: "Implement prompt_list tool", done: true },
                { name: "Implement prompt_get tool", done: true },
                { name: "Wire context tools to core orchestration", done: true },
                { name: "Add input validation for all context tools", done: true },
                { name: "Add context tool unit tests", done: true },
                { name: "Integration test: build context via MCP", done: true },
              ] } },
          { index: "147", name: "mcp-state-update-tools", status: "complete", dateCreated: "20260121", dateUpdated: "20260121",
            tasks: { index: "147", name: "tasks.mcp-state-update-tools", status: "complete", taskCount: 5, completedTasks: 5,
              items: [
                { name: "Implement context_summarize tool", done: true },
                { name: "Add summary persistence to storage", done: true },
                { name: "Add state update input validation", done: true },
                { name: "Unit tests for state update tools", done: true },
                { name: "Verify full tool surface end-to-end", done: true },
              ] } },
          { index: "148", name: "electron-client-conversion", status: "complete", dateCreated: "20260121", dateUpdated: "20260122",
            tasks: { index: "148", name: "tasks.electron-client-conversion", status: "complete", taskCount: 8, completedTasks: 8,
              items: [
                { name: "Replace internal services with core imports", done: true },
                { name: "Remove SystemPromptParserIPC", done: true },
                { name: "Remove StatementManagerIPC", done: true },
                { name: "Simplify IPC layer to delegate to core", done: true },
                { name: "Update renderer to use new IPC surface", done: true },
                { name: "Remove duplicate type definitions", done: true },
                { name: "Verify Electron app functions as before", done: true },
                { name: "Clean up unused electron-specific code", done: true },
              ] } },
          { index: "149", name: "core-test-suite", status: "complete", dateCreated: "20260121", dateUpdated: "20260122",
            tasks: { index: "149", name: "tasks.core-test-suite", status: "complete", taskCount: 12, completedTasks: 12,
              items: [
                { name: "Set up vitest for packages/core", done: true },
                { name: "Unit tests: SystemPromptParser", done: true },
                { name: "Unit tests: StatementManager", done: true },
                { name: "Unit tests: TemplateEngine", done: true },
                { name: "Unit tests: ContextAssembler", done: true },
                { name: "Unit tests: PromptOrchestrator", done: true },
                { name: "Unit tests: FileProjectStore", done: true },
                { name: "Unit tests: ProjectValidator", done: true },
                { name: "Integration: full assembly pipeline", done: true },
                { name: "Integration: storage round-trip", done: true },
                { name: "Fixture project for test data", done: true },
                { name: "Coverage reporting configuration", done: true },
              ] } },
          { index: "150", name: "mcp-integration-testing", status: "complete", dateCreated: "20260122", dateUpdated: "20260122",
            tasks: { index: "150", name: "tasks.mcp-integration-testing", status: "complete", taskCount: 7, completedTasks: 7,
              items: [
                { name: "Set up MCP test harness", done: true },
                { name: "Test project_list via MCP protocol", done: true },
                { name: "Test project_get via MCP protocol", done: true },
                { name: "Test context_build via MCP protocol", done: true },
                { name: "Test context_summarize via MCP protocol", done: true },
                { name: "Test error handling and edge cases", done: true },
                { name: "Validate against fixture project output", done: true },
              ] } },
          { index: "151", name: "documentation-and-packaging", status: "complete", dateCreated: "20260122", dateUpdated: "20260122",
            tasks: { index: "151", name: "tasks.documentation-and-packaging", status: "complete", taskCount: 9, completedTasks: 9,
              items: [
                { name: "Write context-forge-mcp README", done: true },
                { name: "Document Claude Code configuration", done: true },
                { name: "Document Cursor configuration", done: true },
                { name: "Document all available MCP tools", done: true },
                { name: "Update root monorepo README", done: true },
                { name: "Configure npm publishing for @context-forge/core", done: true },
                { name: "Configure npm publishing for context-forge-mcp", done: true },
                { name: "Add package.json metadata (license, repo, etc.)", done: true },
                { name: "Publish initial versions to npm", done: true },
              ] } },
        ],
        features: [],
      },
    },
    futureSlices: [
      { index: "153", name: "config-system", status: "not-started", parent: "140" },
      { index: "154", name: "bundled-prompt-system-and-guide-install", status: "not-started", parent: "140" },
      { index: "155", name: "guide-versioning-and-update", status: "not-started", parent: "140" },
    ],
    quality: [],
    investigation: [],
    maintenance: [],
    devlog: true,
  },
  orchestration: {
    name: "Orchestration v2",
    description: "Multi-agent AI workflow orchestration (Python/FastAPI)",
    foundation: [],
    projectArchitecture: [
      { index: "050", type: "hld", name: "hld-orchestration", status: "complete", dateCreated: "20260210", dateUpdated: "20260218" },
    ],
    initiatives: {
      100: {
        name: "Orchestration v2",
        arch: { index: "100", name: "arch.orchestration-v2", status: "complete", dateCreated: "20260212", dateUpdated: "20260220" },
        slicePlan: {
          index: "100", name: "slices.orchestration-v2", status: "in-progress",
          dateCreated: "20260212", dateUpdated: "20260222", futureWork: [],
        },
        slices: [
          { index: "100", name: "foundation", status: "complete", dateCreated: "20260215", dateUpdated: "20260216",
            tasks: { index: "100", name: "tasks.foundation", status: "complete", taskCount: 14, completedTasks: 14,
              items: [
                { name: "Initialize Python project with pyproject.toml", done: true },
                { name: "Set up uv workspace and dependencies", done: true },
                { name: "Create package directory structure", done: true },
                { name: "Implement AgentConfig pydantic model", done: true },
                { name: "Implement AgentState pydantic model", done: true },
                { name: "Implement Message pydantic model", done: true },
                { name: "Implement Settings with env-var loading", done: true },
                { name: "Set up structured logging with structlog", done: true },
                { name: "Create AgentProvider protocol", done: true },
                { name: "Create AgentHandle protocol", done: true },
                { name: "Add foundation unit tests", done: true },
                { name: "Configure pytest with async support", done: true },
                { name: "Set up pre-commit hooks (ruff, mypy)", done: true },
                { name: "Verify clean build and test pass", done: true },
              ] } },
          { index: "101", name: "sdk-agent-provider", status: "complete", dateCreated: "20260216", dateUpdated: "20260218",
            tasks: { index: "101", name: "tasks.sdk-agent-provider", status: "complete", taskCount: 11, completedTasks: 11,
              items: [
                { name: "Implement SdkAgentProvider class", done: true },
                { name: "Implement SdkAgentHandle class", done: true },
                { name: "Integrate anthropic SDK client creation", done: true },
                { name: "Implement query() with message handling", done: true },
                { name: "Implement conversation history tracking", done: true },
                { name: "Implement cleanup/shutdown lifecycle", done: true },
                { name: "Add system prompt configuration", done: true },
                { name: "Add permission mode support", done: true },
                { name: "Unit tests with mocked SDK client", done: true },
                { name: "Integration test with live API (optional)", done: true },
                { name: "Error handling for API failures", done: true },
              ] } },
          { index: "102", name: "agent-registry", status: "complete", dateCreated: "20260218", dateUpdated: "20260219",
            tasks: { index: "102", name: "tasks.agent-registry", status: "complete", taskCount: 9, completedTasks: 9,
              items: [
                { name: "Implement AgentRegistry singleton", done: true },
                { name: "Implement spawn() with provider resolution", done: true },
                { name: "Implement get() agent lookup", done: true },
                { name: "Implement list_agents() with filtering", done: true },
                { name: "Implement shutdown_agent() with cleanup", done: true },
                { name: "Implement shutdown_all() with report", done: true },
                { name: "Add name uniqueness validation", done: true },
                { name: "Unit tests for registry operations", done: true },
                { name: "Test concurrent spawn/shutdown safety", done: true },
              ] } },
          { index: "103", name: "cli-foundation", status: "complete", dateCreated: "20260219", dateUpdated: "20260220",
            tasks: { index: "103", name: "tasks.cli-foundation", status: "complete", taskCount: 10, completedTasks: 10,
              items: [
                { name: "Create Typer app with entry point", done: true },
                { name: "Implement spawn command", done: true },
                { name: "Implement list command with rich table", done: true },
                { name: "Implement task command", done: true },
                { name: "Implement shutdown command", done: true },
                { name: "Implement shutdown --all flag", done: true },
                { name: "Add pyproject.toml script entry point", done: true },
                { name: "Add CliRunner unit tests", done: true },
                { name: "Error handling for all commands", done: true },
                { name: "Verify end-to-end: spawn → task → shutdown", done: true },
              ] } },
          { index: "104", name: "sdk-client-warm-pool", status: "not-started", dateCreated: "20260219",
            tasks: { index: "104", name: "tasks.sdk-client-warm-pool", status: "not-started", taskCount: 8, completedTasks: 0,
              items: [
                { name: "Implement WarmPool manager class", done: false },
                { name: "Pre-initialize SDK client instances", done: false },
                { name: "Implement checkout/checkin lifecycle", done: false },
                { name: "Add pool size configuration", done: false },
                { name: "Integrate with spawn command transparently", done: false },
                { name: "Add health check for pooled clients", done: false },
                { name: "Unit tests for pool operations", done: false },
                { name: "Benchmark: pool vs cold-start latency", done: false },
              ] } },
          { index: "105", name: "review-workflow-templates", status: "not-started", dateCreated: "20260219",
            tasks: { index: "105", name: "tasks.review-workflow-templates", status: "not-started", taskCount: 12, completedTasks: 0,
              items: [
                { name: "Define ReviewTemplate data model", done: false },
                { name: "Implement template loading from YAML", done: false },
                { name: "Create arch-review template", done: false },
                { name: "Create task-review template", done: false },
                { name: "Create slice-design-review template", done: false },
                { name: "Create code-review template", done: false },
                { name: "Implement review CLI command", done: false },
                { name: "Wire template → spawn + task composition", done: false },
                { name: "Add template validation", done: false },
                { name: "Unit tests for template loading", done: false },
                { name: "Integration test: full review workflow", done: false },
                { name: "Document review command usage", done: false },
              ] } },
          { index: "106", name: "m1-polish-and-publish", status: "not-started", dateCreated: "20260219",
            tasks: { index: "106", name: "tasks.m1-polish-and-publish", status: "not-started", taskCount: 7, completedTasks: 0,
              items: [
                { name: "Write comprehensive README", done: false },
                { name: "Add installation instructions", done: false },
                { name: "Add usage examples and quickstart", done: false },
                { name: "Configure PyPI publishing", done: false },
                { name: "Add license and metadata", done: false },
                { name: "Final test pass across all slices", done: false },
                { name: "Publish initial version", done: false },
              ] } },
        ],
        features: [],
      },
      160: {
        name: "Automated Dev Pipeline",
        arch: { index: "160", name: "arch.automated-dev-pipeline", status: "in-progress", dateCreated: "20260220", dateUpdated: "20260222" },
        slicePlan: null, slices: [], features: [],
      },
    },
    futureSlices: [],
    quality: [],
    investigation: [],
    maintenance: [],
    devlog: true,
  },
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
          {items.map((fs, i) => <FutureBlock key={i} item={fs} colorSet={colorSet} />)}
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
