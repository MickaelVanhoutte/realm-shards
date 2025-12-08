// Pokemon Skill Tree Utilities
// Functions for managing skill node unlocking, stat calculation, and moves

import type { Creature, CreatureStats, PokemonSkillNode, SkillTreeBranch } from '../types';
import {
    UNIVERSAL_SKILL_TREE,
    getNode,
    getAdjacentNodes,
    calculateSkillPointsForLevel,
    EMPTY_MOVE_STAT_VALUE
} from './pokemonSkillTree';
import { getSpecies } from './creatures';

// ===== Move Mapping =====

// Get move for a slot, checking admin-assigned skillTreeSlot first, then auto-distribution
export function getMoveForSlot(
    speciesId: string,
    branch: SkillTreeBranch,
    slotIndex: number
): { moveId: string; level: number } | null {
    const species = getSpecies(speciesId);
    if (!species || !species.learnableMoves) return null;

    // First: Check for admin-assigned slot (exact match)
    const assignedMove = species.learnableMoves.find(
        m => m.skillTreeSlot?.branch === branch && m.skillTreeSlot?.slotIndex === slotIndex
    );
    if (assignedMove) {
        return { moveId: assignedMove.moveId, level: assignedMove.level || 0 };
    }

    // Fallback: Auto-distribution algorithm (for unassigned slots)
    // Only use level-up moves (method === 1) for auto-distribution
    const levelUpMoves = species.learnableMoves
        .filter(m => m.method === 1 && !m.skillTreeSlot)  // Exclude already-assigned moves
        .sort((a, b) => (a.level || 0) - (b.level || 0));

    // Distribute slots: divide moves among branches
    const branchOrder: SkillTreeBranch[] = ['atk', 'spAtk', 'def', 'spDef', 'hp', 'speed'];
    const branchIndex = branchOrder.indexOf(branch);

    // Each branch gets every 6th move starting from its index
    const movesForBranch = levelUpMoves.filter((_, i) => i % 6 === branchIndex);

    if (slotIndex < movesForBranch.length) {
        const move = movesForBranch[slotIndex];
        if (move && move.moveId) {
            return { moveId: move.moveId, level: move.level || 0 };
        }
    }

    return null;
}

// Check if a move slot would be empty (used for display)
export function isMoveSlotEmpty(
    speciesId: string,
    branch: SkillTreeBranch,
    slotIndex: number
): boolean {
    return getMoveForSlot(speciesId, branch, slotIndex) === null;
}

// Get stat boost value for empty move slot
export function getStatBoostForEmptySlot(branch: SkillTreeBranch): { stat: SkillTreeBranch, value: number } {
    return { stat: branch, value: EMPTY_MOVE_STAT_VALUE };
}

// ===== Stat Calculations =====

// Get stat bonuses from unlocked nodes
export function getStatBonusesFromNodes(creature: Creature): CreatureStats {
    const bonuses: CreatureStats = {
        hp: 0,
        atk: 0,
        def: 0,
        spAtk: 0,
        spDef: 0,
        speed: 0,
    };

    for (const nodeId of creature.unlockedSkillNodes) {
        const node = getNode(nodeId);
        if (node && node.type === 'stat' && node.stat && node.value) {
            bonuses[node.stat] += node.value;
        }
        // Handle empty move nodes that became stat boosts
        if (node && node.type === 'move' && node.moveSlot !== undefined) {
            const moveData = getMoveForSlot(creature.speciesId, node.branch, node.moveSlot);
            if (!moveData) {
                // Empty slot gives stat boost instead
                bonuses[node.branch] += EMPTY_MOVE_STAT_VALUE;
            }
        }
    }

    return bonuses;
}

// Get effective stats (base stats + node bonuses)
export function getEffectiveStats(creature: Creature): CreatureStats {
    const species = getSpecies(creature.speciesId);
    if (!species) return creature.stats;

    const bonuses = getStatBonusesFromNodes(creature);

    const base = species.baseStats;

    return {
        hp: base.hp + bonuses.hp,
        atk: base.atk + bonuses.atk,
        def: base.def + bonuses.def,
        spAtk: base.spAtk + bonuses.spAtk,
        spDef: base.spDef + bonuses.spDef,
        speed: base.speed + bonuses.speed,
    };
}

// ===== Move Access =====

// Get moves from unlocked move nodes
export function getMovesFromNodes(creature: Creature): string[] {
    const moves: string[] = [];

    for (const nodeId of creature.unlockedSkillNodes) {
        const node = getNode(nodeId);
        if (node && node.type === 'move' && node.moveSlot !== undefined) {
            const moveData = getMoveForSlot(creature.speciesId, node.branch, node.moveSlot);
            if (moveData) {
                moves.push(moveData.moveId);
            }
        }
    }

    return moves;
}

// ===== Node Unlocking =====

// Check if a node can be unlocked
export function canUnlockNode(creature: Creature, nodeId: string): boolean {
    const node = getNode(nodeId);
    if (!node) return false;

    // Already unlocked?
    if (creature.unlockedSkillNodes.includes(nodeId)) return false;

    // Has skill points?
    if (creature.skillPoints < 1) return false;

    // Start node is always available first
    if (nodeId === 'start') return true;

    // Check if adjacent to an unlocked node
    const adjacentNodes = getAdjacentNodes(nodeId);
    const hasUnlockedAdjacent = adjacentNodes.some(adj =>
        creature.unlockedSkillNodes.includes(adj)
    );

    return hasUnlockedAdjacent;
}

// Unlock a node
export function unlockNode(creature: Creature, nodeId: string): boolean {
    if (!canUnlockNode(creature, nodeId)) return false;

    creature.skillPoints -= 1;
    creature.unlockedSkillNodes.push(nodeId);

    const node = getNode(nodeId);

    // Update stats if it's a stat node
    if (node && node.type === 'stat' && node.stat && node.value) {
        creature.stats[node.stat] += node.value;
        if (node.stat === 'hp') {
            creature.maxHp += node.value;
            creature.currentHp = Math.min(creature.currentHp + node.value, creature.maxHp);
        }
    }

    // Handle move nodes
    if (node && node.type === 'move' && node.moveSlot !== undefined) {
        const moveData = getMoveForSlot(creature.speciesId, node.branch, node.moveSlot);
        if (moveData) {
            // Has a move - add to learnedMoves if not already there
            if (!creature.learnedMoves) {
                creature.learnedMoves = [];
            }
            if (!creature.learnedMoves.includes(moveData.moveId)) {
                creature.learnedMoves.push(moveData.moveId);
            }
            // Also add to active moves if there's room
            if (!creature.moves.includes(moveData.moveId)) {
                if (creature.moves.length < 4) {
                    creature.moves.push(moveData.moveId);
                }
            }
        } else {
            // Empty slot - give stat boost instead
            const statBoost = getStatBoostForEmptySlot(node.branch);
            creature.stats[statBoost.stat] += statBoost.value;
            if (statBoost.stat === 'hp') {
                creature.maxHp += statBoost.value;
                creature.currentHp = Math.min(creature.currentHp + statBoost.value, creature.maxHp);
            }
        }
    }

    return true;
}

// ===== Reset =====

// Reset skill tree - refund all points
export function resetSkillTree(creature: Creature): void {
    const species = getSpecies(creature.speciesId);
    if (!species) return;

    // Count how many nodes were unlocked (excluding start)
    const pointsToRefund = creature.unlockedSkillNodes.filter(id => id !== 'start').length;

    // Reset skill points
    creature.skillPoints += pointsToRefund;
    creature.unlockedSkillNodes = ['start']; // Keep start node unlocked

    // Reset stats to base
    creature.stats = { ...species.baseStats };
    creature.maxHp = species.baseStats.hp;
    creature.currentHp = Math.min(creature.currentHp, creature.maxHp);

    // Reset moves (empty, will be added from nodes)
    creature.moves = [];
}

// ===== Random Allocation (for wild Pokemon) =====

// Randomly allocate skill points for a wild Pokemon
export function randomlyAllocateNodes(creature: Creature, points: number): void {
    // Start by unlocking the start node
    if (!creature.unlockedSkillNodes.includes('start')) {
        creature.unlockedSkillNodes.push('start');
    }

    for (let i = 0; i < points && creature.skillPoints > 0; i++) {
        // Get all available nodes
        const available: string[] = [];
        for (const [nodeId] of UNIVERSAL_SKILL_TREE) {
            if (canUnlockNode(creature, nodeId)) {
                available.push(nodeId);
            }
        }

        if (available.length === 0) break;

        // Pick a random node
        const randomIndex = Math.floor(Math.random() * available.length);
        unlockNode(creature, available[randomIndex]);
    }
}

// ===== Initialization =====

// Initialize skill tree for a new creature
export function initializeSkillTree(creature: Creature, randomize: boolean = false): void {
    // Calculate points based on level
    creature.skillPoints = calculateSkillPointsForLevel(creature.level);
    creature.unlockedSkillNodes = [];

    // Reset stats to base
    const species = getSpecies(creature.speciesId);
    if (species) {
        creature.stats = { ...species.baseStats };
        creature.maxHp = species.baseStats.hp;
        creature.currentHp = creature.maxHp;
    }

    // Reset moves (will be populated from nodes)
    creature.moves = [];

    // Unlock start node (doesn't cost a point)
    creature.unlockedSkillNodes.push('start');

    // For wild Pokemon, randomly allocate points
    if (randomize && creature.skillPoints > 0) {
        randomlyAllocateNodes(creature, creature.skillPoints);
    }
}

// ===== UI Helpers =====

// Check if a node is unlockable (adjacent and has points)
export function isNodeAvailable(creature: Creature, nodeId: string): boolean {
    return canUnlockNode(creature, nodeId);
}

// Check if a node is unlocked
export function isNodeUnlocked(creature: Creature, nodeId: string): boolean {
    return creature.unlockedSkillNodes.includes(nodeId);
}

// Get node display name
export function getNodeDisplayName(node: PokemonSkillNode, creature: Creature): string {
    if (node.type === 'stat') {
        return `+${node.value} ${node.stat?.toUpperCase() || ''}`;
    }

    if (node.type === 'move' && node.moveSlot !== undefined) {
        const moveData = getMoveForSlot(creature.speciesId, node.branch, node.moveSlot);
        if (moveData) {
            // Get move name from moves data
            return moveData.moveId.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        // Empty slot shows stat boost instead
        return `+${EMPTY_MOVE_STAT_VALUE} ${node.branch.toUpperCase()}`;
    }

    return node.id;
}

// Check if node is an empty move slot (for UI display)
export function isEmptyMoveSlot(node: PokemonSkillNode, creature: Creature): boolean {
    if (node.type !== 'move' || node.moveSlot === undefined) return false;
    return getMoveForSlot(creature.speciesId, node.branch, node.moveSlot) === null;
}
