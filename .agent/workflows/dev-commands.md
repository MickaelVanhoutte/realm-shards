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

Output in `dist/` directory.

## Key URLs

| URL | Description |
|-----|-------------|
| `/realm-shards/` | Main game |
| `/realm-shards/admin` | Admin panel |

## Testing Locally

1. Start dev server
2. Open browser to localhost:5173/realm-shards/
3. For admin: navigate to /realm-shards/admin

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
