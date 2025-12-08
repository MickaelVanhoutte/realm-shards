---
description: Project architecture and key components overview
---

# Realm Shards - Project Overview

A Pokemon-like game built with Svelte + TypeScript + Vite.

## Directory Structure

```
src/
├── assets/data/          # Static game data
│   └── pokedex.json      # All Pokemon data (stats, moves, types)
├── components/
│   ├── admin/            # Admin panel (AdminPokedex.svelte)
│   ├── battle/           # Battle UI (NewBattleScene.svelte)
│   ├── exploration/      # Overworld (ExplorationScene.svelte)
│   └── ui/               # Menus (PartyMenu, Pokedex, TitleScreen)
├── lib/
│   ├── data/             # Game logic
│   │   ├── creatures.ts  # Species/creature creation
│   │   ├── moves.ts      # Move definitions & type chart
│   │   ├── pokedex.ts    # Pokedex data access
│   │   ├── pokemonSkillTree.ts    # Skill tree structure
│   │   └── pokemonSkillUtils.ts   # Skill tree logic
│   ├── stores/           # Svelte stores
│   │   ├── trainerStore.ts   # Player data
│   │   ├── gameState.ts      # Game screens
│   │   └── adminDataStore.ts # Admin edits
│   └── types.ts          # TypeScript interfaces
└── App.svelte            # Root component with routing
```

## Key Types

- `Creature` - A caught Pokemon instance with stats, moves, HP
- `CreatureSpecies` - Pokemon species data (base stats, learnable moves)
- `Move` - Attack data (power, type, effects)
- `Trainer` - Player with party, inventory, skills

## Data Flow

1. `pokedex.json` → `pokedex.ts` (loads raw data)
2. `creatures.ts` → converts to `CreatureSpecies`
3. `createCreature()` → creates `Creature` instances
4. `trainerStore` → manages player state
