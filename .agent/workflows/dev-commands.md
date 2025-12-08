---
description: Common development commands
---

# Development Commands

// turbo-all

## Start Dev Server

```bash
cd /Users/20017225/PERSO/realm-shards
npm run dev
```

Opens at: http://localhost:5173/realm-shards/

## Build for Production

```bash
npm run build
```

## Linting & Formatting

```bash
# Install dev dependencies first
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-svelte svelte-eslint-parser prettier prettier-plugin-svelte

# Run type check
npm run check

# Format code (after installing prettier)
npx prettier --write src/
```

## After Pokedex Changes

1. Export JSON from admin panel
2. Replace `src/assets/data/pokedex.json`
3. Restart dev server (Ctrl+C, then npm run dev)

## Troubleshooting

### Rollup Error
If you see `Cannot find module @rollup/rollup-darwin-arm64`:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Type Errors
Most TypeScript errors are warnings and don't block runtime.
Check browser console for actual runtime errors.
