import type { Creature, CreatureSpecies, ElementType } from '../types';
import { pokedex } from './pokedex';

import { MOVES } from './moves';

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

    // Map moves (simplified for now, just taking first few level-up moves)
    // In a real implementation, we'd parse the complex move structure
    const learnableMoves = pokedexEntry.moves
        .filter((m: any) => m.method === 1) // Level up
        .map((m: any) => ({
            level: m.level,
            // Normalize to snake_case ID: replace hyphens and spaces with underscores
            moveId: m.name.toLowerCase().replace(/[-\s]+/g, '_')
        }))
        .filter((m: any) => MOVES[m.moveId]); // Only include implemented moves

    console.log(pokedexEntry.name, learnableMoves);
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
        evolutionLevel: undefined, // Need to parse evolution data
        evolvesTo: undefined,
        captureRate: pokedexEntry.captureRate,
        expYield: pokedexEntry.baseXp,
        pokedexId: pokedexEntry.id,
        abilities: pokedexEntry.abilities,
        growthRateId: pokedexEntry.growthRateId,
        height: pokedexEntry.height,
        weight: pokedexEntry.weight,
        description: pokedexEntry.description
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

let creatureIdCounter = 0;

export const createCreature = (speciesId: string, level: number = 5): Creature => {
    const species = getSpecies(speciesId);
    if (!species) {
        throw new Error(`Species ${speciesId} not found`);
    }

    // Calculate stats based on level (simplified formula)
    const calculateStat = (base: number, level: number) => {
        return Math.floor(((2 * base * level) / 100) + 5);
    };

    const calculateHp = (base: number, level: number) => {
        return Math.floor(((2 * base * level) / 100) + level + 10);
    };

    const stats = {
        hp: calculateHp(species.baseStats.hp, level),
        atk: calculateStat(species.baseStats.atk, level),
        def: calculateStat(species.baseStats.def, level),
        spAtk: calculateStat(species.baseStats.spAtk, level),
        spDef: calculateStat(species.baseStats.spDef, level),
        speed: calculateStat(species.baseStats.speed, level)
    };

    // Get moves for level
    const moves = species.learnableMoves
        .filter(m => m.level <= level)
        .slice(-4) // Last 4 moves
        .map(m => m.moveId)
        .map(id => id.toLowerCase().replace(/[-\s]+/g, '_'));

    console.log(moves);

    // Get experience for level
    const exp = pokedex.getExperience(species.growthRateId || 4, level);
    const expToNextLevel = pokedex.getExperience(species.growthRateId || 4, level + 1) - exp;

    creatureIdCounter++;

    return {
        id: `creature_${creatureIdCounter}`,
        speciesId: species.id,
        nickname: species.name,
        level,
        currentHp: stats.hp,
        maxHp: stats.hp,
        stats,
        moves,
        exp,
        expToNextLevel,
        sprite: species.sprite,
        types: species.types,
        isFainted: false
    };
};


