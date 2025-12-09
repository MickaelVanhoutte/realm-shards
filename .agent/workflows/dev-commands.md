---
description: Common development commands
---

# Development Commands

// turbo-all

## Start Dev Server

```bash
cd /Users/mvanhoutte/IdeaProjects/realm-shards
npm run dev
```

Opens at: http://localhost:5173/realm-shards/

## Build for Production

```bash
npm run build
```

## Testing

**Run tests before committing any changes to game logic!**

```bash
# Run all tests
npm run test

# Run tests in watch mode during development
npm run test:watch

# Run with coverage report
npm run test:coverage
```

Tests are located in `src/lib/data/__tests__/` and cover:
- Type effectiveness (`moves.test.ts`)
- Status effects and stat modifiers (`effects.test.ts`)
- Trainer skills and exp (`trainer.test.ts`)
- Skill tree logic (`pokemonSkillUtils.test.ts`)
- Creature data structures (`creatures.test.ts`)

## Linting & Formatting

```bash
# Run type check
npm run check

# Format code
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
