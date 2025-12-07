// Move Data
import type { Move, ElementType, MoveCategory, MoveTarget } from '../types';
import { pokedex } from './pokedex';
import { parseEffectDescription } from './effects';

// Helper to map JSON data to Move interface
const mapJsonToMove = (jsonMove: any): Move => {
    // Map category string to MoveCategory
    let category: MoveCategory = 'physical';
    if (jsonMove.category === 'special') category = 'special';
    if (jsonMove.category === 'status' || jsonMove.category === 'no-damage') category = 'status';

    // Map target string to MoveTarget
    // We use the JSON values directly now as they are added to MoveTarget type
    const target: MoveTarget = jsonMove.target;

    // Get effect chance from JSON (defaults to 100 if move has an effect)
    const effectChance = jsonMove.effectChance !== undefined ? Number(jsonMove.effectChance) : 100;

    // Parse the effect description to get structured effect data
    const effectText = jsonMove.effect?.short_effect;
    const parsedEffects = parseEffectDescription(effectText, effectChance, target);

    return {
        id: jsonMove.name.toLowerCase().replace(/[-\s]+/g, '_'), // snake_case ID
        name: jsonMove.name, // Display name (might be kebab-case in JSON, let's fix if needed)
        type: jsonMove.type.toLowerCase() as ElementType,
        category,
        target,
        power: jsonMove.power === '' ? 0 : Number(jsonMove.power),
        accuracy: jsonMove.accuracy === '' ? 100 : Number(jsonMove.accuracy),
        pp: Number(jsonMove.pp),
        description: jsonMove.description,
        effect: effectText,
        effectChance,
        parsedEffects: parsedEffects.length > 0 ? parsedEffects : undefined
    };
};

// Generate MOVES dictionary dynamically
export const MOVES: Record<string, Move> = {};

const loadMoves = () => {
    const allPokemon = pokedex.getAllPokemon();
    allPokemon.forEach(pokemon => {
        if (pokemon.moves) {
            pokemon.moves.forEach(m => {
                // Normalize to snake_case: replace hyphens and spaces with underscores
                const moveId = m.name.toLowerCase().replace(/[-\s]+/g, '_');
                if (!MOVES[moveId]) {
                    // Create a cleaner display name from kebab-case
                    const displayName = m.name
                        .split('-')
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

                    const move = mapJsonToMove(m);
                    move.name = displayName; // Override with formatted name
                    MOVES[moveId] = move;
                }
            });
        }
    });
};


// Load moves immediately
loadMoves();

// Type effectiveness chart
// Returns multiplier: 2 = super effective, 0.5 = not very effective, 0 = no effect
// Type effectiveness chart
const TYPE_CHART: Record<string, Record<string, number | string | undefined>> = {
    "normal": {
        "normal": 1,
        "fire": 1,
        "water": 1,
        "electric": 1,
        "grass": 1,
        "ice": 1,
        "fighting": 1,
        "poison": 1,
        "ground": 1,
        "flying": 1,
        "psychic": 1,
        "bug": 1,
        "rock": 0.5,
        "ghost": 0,
        "dragon": 1,
        "dark": 1,
        "steel": 0.5,
        "fairy": 1,
        color: 'rgb(148, 155, 163)'
    },
    "fire": {
        "normal": 1,
        "fire": 0.5,
        "water": 0.5,
        "electric": 1,
        "grass": 2,
        "ice": 2,
        "fighting": 1,
        "poison": 1,
        "ground": 1,
        "flying": 1,
        "psychic": 1,
        "bug": 2,
        "rock": 0.5,
        "ghost": 1,
        "dragon": 0.5,
        "dark": 1,
        "steel": 2,
        "fairy": 1,
        color: 'rgb(241,163,98)'
    },
    "water": {
        "normal": 1,
        "fire": 2,
        "water": 0.5,
        "electric": 1,
        "grass": 0.5,
        "ice": 1,
        "fighting": 1,
        "poison": 1,
        "ground": 2,
        "flying": 1,
        "psychic": 1,
        "bug": 1,
        "rock": 2,
        "ghost": 1,
        "dragon": 0.5,
        "dark": 1,
        "steel": 1,
        "fairy": 1,
        color: 'rgb(95, 144, 210)',
    },
    "electric": {
        "normal": 1,
        "fire": 1,
        "water": 2,
        "electric": 0.5,
        "grass": 0.5,
        "ice": 1,
        "fighting": 1,
        "poison": 1,
        "ground": 0,
        "flying": 2,
        "psychic": 1,
        "bug": 1,
        "rock": 1,
        "ghost": 1,
        "dragon": 0.5,
        "dark": 1,
        "steel": 1,
        "fairy": 1,
        color: 'rgb(239, 212, 89)'
    },
    "grass": {
        "normal": 1,
        "fire": 0.5,
        "water": 2,
        "electric": 1,
        "grass": 0.5,
        "ice": 1,
        "fighting": 1,
        "poison": 0.5,
        "ground": 2,
        "flying": 0.5,
        "psychic": 1,
        "bug": 0.5,
        "rock": 2,
        "ghost": 1,
        "dragon": 0.5,
        "dark": 1,
        "steel": 0.5,
        "fairy": 1,
        color: 'rgb(122,187,101)'
    },
    "ice": {
        "normal": 1,
        "fire": 0.5,
        "water": 0.5,
        "electric": 1,
        "grass": 2,
        "ice": 0.5,
        "fighting": 1,
        "poison": 1,
        "ground": 2,
        "flying": 2,
        "psychic": 1,
        "bug": 1,
        "rock": 1,
        "ghost": 1,
        "dragon": 2,
        "dark": 1,
        "steel": 0.5,
        "fairy": 1,
        color: 'rgb(138, 205, 193)'
    },
    "fighting": {
        "normal": 2,
        "fire": 1,
        "water": 1,
        "electric": 1,
        "grass": 1,
        "ice": 2,
        "fighting": 1,
        "poison": 0.5,
        "ground": 1,
        "flying": 0.5,
        "psychic": 0.5,
        "bug": 0.5,
        "rock": 2,
        "ghost": 0,
        "dragon": 1,
        "dark": 2,
        "steel": 2,
        "fairy": .5,
        color: 'rgb(191, 74, 108)',
    },
    "poison": {
        "normal": 1,
        "fire": 1,
        "water": 1,
        "electric": 1,
        "grass": 2,
        "ice": 1,
        "fighting": 1,
        "poison": 0.5,
        "ground": 0.5,
        "flying": 1,
        "psychic": 1,
        "bug": 1,
        "rock": 0.5,
        "ghost": 0.5,
        "dragon": 1,
        "dark": 1,
        "steel": 0,
        "fairy": 2,
        color: 'rgb(162, 110, 196)'
    },
    "ground": {
        "normal": 1,
        "fire": 2,
        "water": 1,
        "electric": 2,
        "grass": 0.5,
        "ice": 1,
        "fighting": 1,
        "poison": 2,
        "ground": 1,
        "flying": 0,
        "psychic": 1,
        "bug": 0.5,
        "rock": 2,
        "ghost": 1,
        "dragon": 1,
        "dark": 1,
        "steel": 2,
        "fairy": 1,
        color: 'rgb(205, 126, 78)'
    },
    "flying": {
        "normal": 1,
        "fire": 1,
        "water": 1,
        "electric": 0.5,
        "grass": 2,
        "ice": 1,
        "fighting": 2,
        "poison": 1,
        "ground": 1,
        "flying": 1,
        "psychic": 1,
        "bug": 2,
        "rock": 0.5,
        "ghost": 1,
        "dragon": 1,
        "dark": 1,
        "steel": 0.5,
        "fairy": 1,
        color: 'rgb(149, 170, 219)'
    },
    "psychic": {
        "normal": 1,
        "fire": 1,
        "water": 1,
        "electric": 1,
        "grass": 1,
        "ice": 1,
        "fighting": 2,
        "poison": 2,
        "ground": 1,
        "flying": 1,
        "psychic": 0.5,
        "bug": 1,
        "rock": 1,
        "ghost": 1,
        "dragon": 1,
        "dark": 0,
        "steel": 0.5,
        "fairy": 1,
        color: 'rgb(233, 122, 125)'
    },
    "bug": {
        "normal": 1,
        "fire": 0.5,
        "water": 1,
        "electric": 1,
        "grass": 2,
        "ice": 1,
        "fighting": 0.5,
        "poison": 0.5,
        "ground": 1,
        "flying": 0.5,
        "psychic": 2,
        "bug": 1,
        "rock": 1,
        "ghost": 0.5,
        "dragon": 1,
        "dark": 2,
        "steel": 0.5,
        "fairy": .5,
        color: 'rgb(156, 193, 73)'
    },
    "rock": {
        "normal": 1,
        "fire": 2,
        "water": 1,
        "electric": 1,
        "grass": 1,
        "ice": 2,
        "fighting": 0.5,
        "poison": 1,
        "ground": 0.5,
        "flying": 2,
        "psychic": 1,
        "bug": 2,
        "rock": 1,
        "ghost": 1,
        "dragon": 1,
        "dark": 1,
        "steel": 0.5,
        "fairy": 1,
        color: 'rgb(196, 185, 146)'
    },
    "ghost": {
        "normal": 0,
        "fire": 1,
        "water": 1,
        "electric": 1,
        "grass": 1,
        "ice": 1,
        "fighting": 1,
        "poison": 1,
        "ground": 1,
        "flying": 1,
        "psychic": 2,
        "bug": 1,
        "rock": 1,
        "ghost": 2,
        "dragon": 1,
        "dark": 0.5,
        "steel": 0.5,
        "fairy": 1,
        color: 'rgb(86, 105, 170)'
    },
    "dragon": {
        "normal": 1,
        "fire": 1,
        "water": 1,
        "electric": 1,
        "grass": 1,
        "ice": 1,
        "fighting": 1,
        "poison": 1,
        "ground": 1,
        "flying": 1,
        "psychic": 1,
        "bug": 1,
        "rock": 1,
        "ghost": 1,
        "dragon": 2,
        "dark": 1,
        "steel": 0.5,
        "fairy": 0,
        color: 'rgb(47, 108, 190)'
    },
    "dark": {
        "normal": 1,
        "fire": 1,
        "water": 1,
        "electric": 1,
        "grass": 1,
        "ice": 1,
        "fighting": 0.5,
        "poison": 1,
        "ground": 1,
        "flying": 1,
        "psychic": 2,
        "bug": 1,
        "rock": 1,
        "ghost": 2,
        "dragon": 1,
        "dark": 0.5,
        "steel": 0.5,
        "fairy": .5,
        color: 'rgb(88, 83, 100)'
    },
    "steel": {
        "normal": 1,
        "fire": 0.5,
        "water": 0.5,
        "electric": 0.5,
        "grass": 1,
        "ice": 2,
        "fighting": 1,
        "poison": 1,
        "ground": 1,
        "flying": 1,
        "psychic": 1,
        "bug": 1,
        "rock": 2,
        "ghost": 1,
        "dragon": 1,
        "dark": 1,
        "steel": 0.5,
        "fairy": 2,
        color: 'rgb(102, 142, 161)'
    },
    "fairy": {
        "normal": 1,
        "fire": .5,
        "water": 1,
        "electric": 1,
        "grass": 1,
        "ice": 1,
        "fighting": 2,
        "poison": .5,
        "ground": 1,
        "flying": 1,
        "psychic": 1,
        "bug": 1,
        "rock": 1,
        "ghost": 1,
        "dragon": 2,
        "dark": 2,
        "steel": .5,
        "fairy": 1, // Added self-reference for completeness, assumed 1 if not specified
        color: 'rgb(224, 149, 226)'
    }
};

export function getTypeEffectiveness(attackType: ElementType, defenderTypes: ElementType[]): number {
    let multiplier = 1;
    const chart = TYPE_CHART[attackType];

    if (chart) {
        for (const defType of defenderTypes) {
            // Ensure defType exists in chart, fallback to 1 if not found (e.g. new types)
            const val = chart[defType];
            const effectiveness = typeof val === 'number' ? val : 1;
            multiplier *= effectiveness;
        }
    }

    return multiplier;
}

export function getMove(moveId: string): Move | undefined {
    console.log(moveId);
    // 1. Exact match
    // if (MOVES[moveId]) return MOVES[moveId];

    // 2. Lowercase match
    const lowerId = moveId.toLowerCase();
    //if (MOVES[lowerId]) return MOVES[lowerId];

    // 3. Snake case match
    const snakeId = lowerId.replace(/\s+/g, '_');
    if (MOVES[snakeId]) return MOVES[snakeId];

    // 4. Name match (slowest but most robust)
    return Object.values(MOVES).find(m =>
        m.name.toLowerCase().replace(/\s+/g, '_') === snakeId
    );
}
