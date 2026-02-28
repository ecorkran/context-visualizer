<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# An agent just mentioned this in a UI task breakdown it created:

- No frontend test infrastructure exists; verification is manual (server endpoints already tested in `test_serve.py`)

and it's right.  this is Claude Code running in VS Code and implementing tasks for a React project.  I need to find and provide some frontend test infrastructure.

What are the best options for me to use here?

**Frontend Testing Infrastructure for React + Claude Code in VS Code**

This is a common gap — you've got backend tests but nothing for the frontend. The good news is the React testing ecosystem is mature and the setup is straightforward. Here's the breakdown of your best options, layered by what they cover.

***

## The Standard Stack (What Most React Projects Should Start With)

### 1. Vitest + React Testing Library — Unit \& Component Tests

This is the modern default and the one I'd reach for first, especially if your project already uses Vite (which most new React projects do).

- **Vitest** replaces Jest as the test runner — it's faster, natively understands ESM, and shares your Vite config (so aliases, plugins, etc. just work)
- **React Testing Library (RTL)** provides the component rendering and querying layer — it tests components the way users interact with them (by text, role, label) rather than implementation details
- **Setup is minimal:**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Add to `vite.config.ts`:

```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/setupTests.ts',
}
```

- Claude Code can easily generate and run these tests since `vitest` works from the CLI (`npx vitest run`) — no browser needed, fast feedback loop

**If you're NOT using Vite** (e.g., CRA or a custom webpack setup), **Jest + RTL** is the equivalent. Jest is heavier to configure but still the most widely documented option.

### 2. Playwright — E2E \& Integration Tests

For testing actual user flows through the running app (click this, fill that, assert the page changed):

- **Playwright** is the current best-in-class E2E framework — faster and more reliable than Cypress, better multi-browser support, and Microsoft actively maintains it
- It can run headless, which matters for CI and for Claude Code invoking tests programmatically
- Setup:

```bash
npm init playwright@latest
```

- Tests look like:

```ts
test('user can submit form', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Name').fill('Test');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Success')).toBeVisible();
});
```

- **Trade-off:** E2E tests are slower and require the dev server running. They catch integration bugs that unit tests miss, but you don't need 100 of them — a handful covering critical paths is high-value.

***

## What to Wire Up for Claude Code Specifically

The key thing that makes test infrastructure useful *for an agent* is that it can **run tests from the terminal and get pass/fail signal**. Here's what I'd set up:

- **`package.json` scripts** — give Claude Code clear entry points:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:coverage": "vitest run --coverage"
}
```

- **A `setupTests.ts`** file with `@testing-library/jest-dom` matchers imported — this gives you `.toBeInTheDocument()`, `.toHaveTextContent()`, etc.
- **One example test file** next to a component (e.g., `Button.test.tsx`) — this gives the agent a pattern to follow when generating new tests. Agents are dramatically better at producing tests when they have an existing example in the codebase to match style and conventions.
- **A testing conventions note** in your project README or a `CLAUDE.md` file — something like:
> "Component tests use Vitest + React Testing Library. Test files are co-located with components as `ComponentName.test.tsx`. Prefer querying by role/label over test IDs."

Claude Code reads `CLAUDE.md` automatically and will follow these patterns.

***

## What I'd Skip (For Now)

| Tool | Why Skip |
| :-- | :-- |
| **Storybook** | Great for visual component dev, but it's not *test* infrastructure — it won't give Claude Code a pass/fail signal |
| **Jest snapshot tests** | Brittle, low signal-to-noise — agents end up just updating snapshots without understanding diffs |
| **Cypress** | Still works, but Playwright has overtaken it in speed, reliability, and DX. New projects should default to Playwright |
| **Visual regression (Chromatic, Percy)** | Valuable at scale, overkill for bootstrapping test infra |


***

## Recommended Action Plan

1. **Install Vitest + RTL** and write one test for your simplest component — confirm `npm test` passes
2. **Add the scripts and `CLAUDE.md` conventions** so the agent knows how to run and write tests
3. **Tell the agent** to add a test step to its task breakdowns: "Write component tests in `*.test.tsx` and verify with `npm test`"
4. **Add Playwright later** when you have user flows worth testing end-to-end

This gets you from "verification is manual" to "agent can self-verify" with about 15 minutes of setup. The Vitest + RTL combo in particular is lightweight enough that there's no reason not to have it from day one.

