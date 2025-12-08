import type { Creature, CreatureSpecies, ElementType, SkillTreeBranch } from '../types';
import { pokedex } from './pokedex';
import { MOVES } from './moves';
import {
    calculateSkillPointsForLevel,
    UNIVERSAL_SKILL_TREE,
    getNode,
    getAdjacentNodes
} from './pokemonSkillTree';

// Helper to convert Pokedex entry to CreatureSpecies
function convertToSpecies(pokedexEntry: any): CreatureSpecies {
    // Map types to ElementType
    const types = pokedexEntry.types.map((t: string) => t.toLowerCase() as ElementType);

    // Map stats
    const baseStats = {
        hp: pokedexEntry.stats.hp,
        atk: pokedexEntry.stats.attack,
        def: pokedexEntry.stats.defense,
        spAtk: pokedexEntry.stats.specialAttack,
        spDef: pokedexEntry.stats.specialDefense,
        speed: pokedexEntry.stats.speed
    };

    // Map ALL moves (not just level-up) and preserve skillTreeSlot for tree assignments
    const learnableMoves = pokedexEntry.moves
        .map((m: any) => ({
            level: m.level,
            method: m.method,
            moveId: m.name.toLowerCase().replace(/[-\s]+/g, '_'),
            treeSkill: m.treeSkill,
            skillTreeSlot: m.skillTreeSlot  // Preserve admin-assigned slot
        }))
        .filter((m: any) => MOVES[m.moveId]); // Only include implemented moves

    return {
        id: pokedexEntry.name.toLowerCase(),
        name: pokedexEntry.name,
        types,
        baseStats,
        sprite: {
            front: pokedex.getSprite(pokedexEntry.id, 'front'),
            back: pokedex.getSprite(pokedexEntry.id, 'back')
        },
        learnableMoves,
        evolutionLevel: undefined,
        evolvesTo: undefined,
        captureRate: pokedexEntry.captureRate,
        expYield: pokedexEntry.baseXp,
        pokedexId: pokedexEntry.id,
        abilities: pokedexEntry.abilities,
        growthRateId: pokedexEntry.growthRateId,
        height: pokedexEntry.height,
        weight: pokedexEntry.weight,
        description: pokedexEntry.description,
        isStarter: pokedexEntry.starter  // Preserve starter flag
    };
}

// Populate CREATURE_SPECIES from Pokedex
export const CREATURE_SPECIES: Record<string, CreatureSpecies> = {};

pokedex.getAllPokemon().forEach(entry => {
    const species = convertToSpecies(entry);
    CREATURE_SPECIES[species.id] = species;
});

export const getSpecies = (id: string): CreatureSpecies | undefined => {
    return CREATURE_SPECIES[id.toLowerCase()];
};

// Helper to get move for a skill tree slot
function getMoveForSlotInternal(species: CreatureSpecies, branch: SkillTreeBranch, slotIndex: number): { moveId: string; level: number } | null {
    const sortedMoves = [...species.learnableMoves].sort((a, b) => a.level - b.level);
    const branchOrder: SkillTreeBranch[] = ['atk', 'spAtk', 'def', 'spDef', 'hp', 'speed'];
    const branchIndex = branchOrder.indexOf(branch);
    const branchMoves = sortedMoves.filter((_, i) => i % 6 === branchIndex);
    return slotIndex < branchMoves.length ? branchMoves[slotIndex] : null;
}

let creatureIdCounter = 0;

// Create a new creature with skill tree
// isWild: if true, randomly allocate skill points; if false, start with unspent points
export const createCreature = (speciesId: string, level: number = 5, isWild: boolean = true): Creature => {
    const species = getSpecies(speciesId);
    if (!species) {
        throw new Error(`Species ${speciesId} not found`);
    }

    // Base stats from species
    const stats = { ...species.baseStats };
    const maxHp = species.baseStats.hp;

    // Calculate skill points for this level
    const skillPoints = calculateSkillPointsForLevel(level);

    // Get experience for level
    const exp = pokedex.getExperience(species.growthRateId || 4, level);
    const expToNextLevel = pokedex.getExperience(species.growthRateId || 4, level + 1) - exp;

    // Get base moves: level-up moves where level <= creature level
    const baseMoves = species.learnableMoves
        .filter(m => m.level <= level)
        .sort((a, b) => b.level - a.level) // Sort by level descending (newer moves first)
        .map(m => m.moveId)
        .filter((moveId, index, self) => self.indexOf(moveId) === index); // Remove duplicates

    // Active moves: take up to 4 most recent learned moves
    const activeMoves = baseMoves.slice(0, 4);

    creatureIdCounter++;

    const creature: Creature = {
        id: `creature_${creatureIdCounter}`,
        speciesId: species.id,
        nickname: species.name,
        level,
        currentHp: maxHp,
        maxHp,
        stats,
        moves: activeMoves,
        learnedMoves: [...baseMoves], // All base moves are learned
        exp,
        expToNextLevel,
        sprite: species.sprite,
        types: species.types,
        isFainted: false,
        skillPoints,
        unlockedSkillNodes: ['start'],
    };

    // For wild Pokemon, randomly allocate skill points
    if (isWild && skillPoints > 0) {
        allocateRandomNodes(creature, species, skillPoints);
    }

    // Ensure HP is consistent after any stat modifications
    creature.currentHp = Math.min(creature.currentHp, creature.maxHp);

    return creature;
};

// Synchronous random allocation for wild Pokemon
function allocateRandomNodes(creature: Creature, species: CreatureSpecies, points: number): void {
    for (let i = 0; i < points && creature.skillPoints > 0; i++) {
        // Get available nodes (adjacent to unlocked, not already unlocked)
        const available: string[] = [];
        for (const [nodeId] of UNIVERSAL_SKILL_TREE) {
            if (nodeId === 'start') continue;
            if (creature.unlockedSkillNodes.includes(nodeId)) continue;

            const adjacentNodes = getAdjacentNodes(nodeId);
            if (adjacentNodes.some(adj => creature.unlockedSkillNodes.includes(adj))) {
                available.push(nodeId);
            }
        }

        if (available.length === 0) break;

        // Pick a random node
        const nodeId = available[Math.floor(Math.random() * available.length)];

        creature.skillPoints -= 1;
        creature.unlockedSkillNodes.push(nodeId);

        // Apply node effects
        const node = getNode(nodeId);
        if (node && node.type === 'stat' && node.stat && node.value) {
            creature.stats[node.stat] += node.value;
            if (node.stat === 'hp') {
                creature.maxHp += node.value;
                creature.currentHp = Math.min(creature.currentHp + node.value, creature.maxHp);
            }
        }

        if (node && node.type === 'move' && node.moveSlot !== undefined) {
            const moveData = getMoveForSlotInternal(species, node.branch, node.moveSlot);
            if (moveData && !creature.moves.includes(moveData.moveId) && creature.moves.length < 4) {
                creature.moves.push(moveData.moveId);
            }
        }
    }
}
