# Lilium - Project Overview

## Purpose
Mastodon client built with Electron + React.

## Tech Stack
- Runtime: Bun (build/dev tool only, NOT used in app code)
- Language: TypeScript (strict mode)
- UI: React 19 + Ant Design 6 + styled-components
- Platform: Electron 40 (electron-vite for build)
- Mastodon API: masto library
- Linting: ESLint + Prettier

## Project Structure
```
src/
├── main/          # Electron main process (Node.js)
├── preload/       # contextBridge (contextIsolation: true)
├── renderer/      # React frontend
│   ├── components/
│   ├── pages/
│   └── hooks/
└── shared/        # Shared types/utilities (e.g., ipc.ts)
```

## Key Commands
- `bun run dev` — Start dev server
- `bun run build` — Build for production
- `bun run lint` / `bun run lint:fix` — ESLint
- `bun run format` / `bun run format:check` — Prettier
- `bun run typecheck` — TypeScript type checking
- `bun test` — Run tests

## Conventions
- Function components only (no class components)
- `import type` for type-only imports
- File extensions in import paths (e.g., `./foo.ts`)
- IPC channels defined in `src/shared/ipc.ts`
- Conventional Commits for git messages
- No Bun-specific APIs in app code
- No npm/yarn/pnpm
