---
description: How the skill tree system works
---

# Pokemon Skill Tree System

## Overview

Each Pokemon has a universal skill tree with 6 branches (one per stat).
Players spend skill points to unlock stat bonuses and moves.

## Structure

### Branches
- `hp`, `atk`, `def`, `spAtk`, `spDef`, `speed`

### Node Types
- `stat` - Provides stat bonus when unlocked
- `move` - Unlocks a move for the creature

## Key Files

| File | Purpose |
|------|---------|
| `pokemonSkillTree.ts` | Tree structure, node definitions |
| `pokemonSkillUtils.ts` | Unlock logic, stat calculations, move mapping |
| `PokemonSkillTree.svelte` | Visual tree UI |

## Move Node Assignment

`getMoveForSlot(speciesId, branch, slotIndex)`:

1. **Check admin-assigned** - If `move.skillTreeSlot` matches, use that move
2. **Auto-distribute** - Level-up moves (method=1) distributed: move[i] → branch[i % 6]

## Empty Move Nodes

If no move available for a slot, it becomes a stat boost node:
- Uses `EMPTY_MOVE_STAT_VALUE` (default: 3)
- Boosts the branch's stat type

## Unlocking Nodes

`unlockNode(creature, nodeId)`:
1. Check prerequisites (adjacent nodes, skill points)
2. Apply stat bonuses
3. Add moves to `creature.learnedMoves`
4. Update `creature.unlockedSkillNodes`
