---
description: How the battle system works
---

# Battle System

## Overview

Turn-based Pokemon battles with trainer participation every 5 turns.

## Key Files

| File | Purpose |
|------|---------|
| `NewBattleScene.svelte` | Main battle UI |
| `newBattleStore.ts` | Battle state management |
| `moves.ts` | Move data, type effectiveness |
| `effects.ts` | Status effects, stat changes |

## Battle Flow

1. **Start** - Battle initializes with player party vs wild/trainer
2. **Turn Order** - Sorted by speed stat
3. **Actions** - Attack, use item, switch, flee
4. **Damage Calc** - Type effectiveness, STAB, crits
5. **Effects** - Apply status, stat changes
6. **End** - Victory (XP/catch) or defeat

## Trainer Actions

Every 5 turns, trainer can use a skill from their skill tree:
- Heal party
- Boost stats
- Apply barriers

## Type Effectiveness

See `TYPE_CHART` in `moves.ts`:
- `2` = Super effective (2x damage)
- `0.5` = Not very effective (0.5x damage)
- `0` = No effect

## Status Effects

Defined in `types.ts`:
- Poison, Burn, Paralysis, Sleep, Freeze
- Confusion, Flinch, Leech Seed, Bound
