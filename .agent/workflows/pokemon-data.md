---
description: How Pokemon data flows through the system
---

# Pokemon Data & Pokedex System

## Data Sources

### 1. pokedex.json (Raw Source)
Located at `src/assets/data/pokedex.json`

Each Pokemon entry contains:
- `id`, `name`, `types[]`
- `stats` (hp, attack, defense, specialAttack, specialDefense, speed)
- `moves[]` - Full move data with:
  - `name`, `type`, `category`, `power`, `accuracy`
  - `level`, `method` (1=level-up, 2=TM/HM, etc)
  - `skillTreeSlot` (admin-assigned tree slot)
  - `treeSkill` (priority flag)
- `starter` - Boolean for starter selection

### 2. Admin Panel Edits
- Stored in `localStorage` via `adminDataStore`
- Merged with original data on load
- Export creates new `pokedex.json`

## Data Transformations

```
pokedex.json
    ↓
pokedex.ts (Pokedex class)
    ↓
creatures.ts (convertToSpecies → CreatureSpecies)
    ↓
createCreature() → Creature instance
```

## Move Assignment

Moves are assigned to skill tree slots by:

1. **Admin-assigned** - Check `move.skillTreeSlot.branch` and `slotIndex`
2. **Auto-distribution** - Level-up moves distributed across branches

See `getMoveForSlot()` in `pokemonSkillUtils.ts`

## Starter Selection

TitleScreen checks `CreatureSpecies.isStarter`:
- Uses species marked as starters (max 3)
- Falls back to defaults if < 3 defined
