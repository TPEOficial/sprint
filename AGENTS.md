# AGENTS.md - Sprint Node Developer Guide

This document provides guidelines for AI agents working on the Sprint Node codebase.

## Repository Structure

```
sprint-node/
├── packages/
│   ├── sprint-es/          # Main framework package
│   └── create-sprint/      # CLI for creating new Sprint projects
└── (project root)
```

## Build, Lint, and Test Commands

### sprint-es (Main Package)

| Command | Description |
|---------|-------------|
| `npm run build` | Build the library using Vite (outputs to dist/) |
| `npm run dev` | Run in development mode with ts-node |
| `npm run start` | Run in production mode |
| `npm run test` | Run Jest tests |
| `npm run clean` | Remove dist folder |
| `npm run dev:example` | Build and run example app |

### Running a Single Test

Jest is configured in the project. To run a single test file:

```bash
# Run all tests
npm test

# Run specific test file (if tests exist)
npx jest path/to/testfile.ts

# Run tests matching a pattern
npx jest --testNamePattern="pattern"
```

### create-sprint (CLI Package)

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Run the CLI |

## Code Style Guidelines

### TypeScript Configuration

- **Target**: ES2020 (sprint-es), ES2022 (create-sprint)
- **Module**: ESNext
- **Strict mode**: Enabled (sprint-es), Disabled (create-sprint)
- **Module Resolution**: Bundler

### Formatting

- **Indentation**: 4 spaces (from prettier config)
- **useTabs**: false
- Use Prettier for code formatting

### Imports and Exports

```typescript
// Named exports for modules
export { Sprint, isDevelopment, isProduction } from "./sprint";

// Type exports
export type { Handler, AsyncRequestHandler } from "./types";

// Default export for main class
import { Sprint } from "sprint-es";
export default Sprint;

// Router helper
export const Router = () => ExpressRouter();
```

### Naming Conventions

- **Files**: kebab-case (e.g., `sprint.config.ts`, `middleware.ts`)
- **Classes**: PascalCase (e.g., `Sprint`, `RateLimiter`)
- **Functions/variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE for true constants, camelCase for others
- **Interfaces**: PascalCase, no "I" prefix (e.g., `SprintOptions`, not `ISprintOptions`)

### Type Definitions

```typescript
// Prefer interfaces for object shapes
interface SprintOptions {
    port?: string | number | null;
    routesPath?: string;
}

// Use type for unions, primitives, etc.
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

// Use export type { } for types only
export type { Handler, NextFunction } from "express";
```

### Error Handling

```typescript
// Always wrap async operations in try-catch
try {
    const module = await import(moduleUrl);
    // ...
} catch (err) {
    console.warn(`[Sprint] Failed to load ${filePath}:`, err);
}

// For promises, handle errors appropriately
const result = handler(req, res, next);
if (result instanceof Promise) result.catch(next);
```

### JSDoc Comments

Use JSDoc for public APIs and complex functions:

```typescript
/**
 * Configuration for a middleware defined in the middlewares folder.
 * Export this from your middleware file using `defineMiddleware()`.
 *
 * @example
 * // middlewares/auth.ts
 * import { defineMiddleware } from "sprint-es";
 *
 * export default defineMiddleware({
 *     name: "auth",
 *     handler: async (req, res, next) => { ... },
 *     include: ["/api/**"],
 *     priority: 10
 * });
 */
export function defineMiddleware(config: MiddlewareConfig): MiddlewareConfig { }
```

### Logging Conventions

- Use `[Sprint]` prefix for framework logs
- Use appropriate log levels: `console.log`, `console.warn`, `console.error`
- Use `isVerbose` flag for optional detailed logging

```typescript
if (isVerbose) console.log(`[Sprint] Loaded middleware: ${name}`);
```

### Express Patterns

- Use middleware pattern with `include`/`exclude` patterns
- Route paths should be normalized (no leading/trailing slashes when combining)
- Use Express Router for route organization

### Async/Await

- Use `async/await` over raw Promises
- Remember to handle async errors (wrap or use `.catch()`)

### Module Structure

Each module should have:
- Main index.ts exporting public API
- Types defined in separate files when complex
- Follow existing patterns in `src/modules/`

### Dependencies

- Keep dependencies minimal
- Use `toolkitify` for common utilities (rate-limit, cache, logger)
- Use `zod` for schema validation

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/sprint.ts` | Main Sprint class - API server |
| `src/types.ts` | TypeScript interfaces and types |
| `src/middleware.ts` | Middleware helper function |
| `src/index.ts` | Package exports |
| `src/cli.ts` | CLI entry point |
| `vite.config.ts` | Build configuration |
| `jest.config.js` | Test configuration |

## Development Workflow

1. Make changes in `src/` directory
2. Run `npm run dev` to test locally
3. Run `npm run build` before committing
4. Run `npm run test` to verify tests pass

## Publishing

For sprint-es:
```bash
npm run build
npm publish
```

For create-sprint:
```bash
npm run prepublishOnly  # bumps version + builds
npm publish
```
