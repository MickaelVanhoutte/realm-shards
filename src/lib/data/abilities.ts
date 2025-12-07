// Ability definitions
import type { Ability } from '../types';

export const ABILITIES: Record<string, Ability> = {
    // Basic
    attack: {
        id: 'attack',
        name: 'Attack',
        type: 'physical',
        target: 'enemy',
        power: 100,
        mpCost: 0,
        description: 'A basic physical attack.'
    },

    // Knight abilities
    shield_bash: {
        id: 'shield_bash',
        name: 'Shield Bash',
        type: 'physical',
        target: 'enemy',
        power: 120,
        mpCost: 8,
        description: 'Strike with your shield. May stun.',
        effect: 'stun'
    },
    defend: {
        id: 'defend',
        name: 'Defend',
        type: 'buff',
        target: 'self',
        power: 0,
        mpCost: 0,
        description: 'Raise defense until next turn.',
        effect: 'def_up'
    },

    // Mage abilities
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        type: 'magic',
        target: 'enemy',
        power: 140,
        mpCost: 12,
        description: 'Hurl a ball of fire at the enemy.'
    },
    ice_shard: {
        id: 'ice_shard',
        name: 'Ice Shard',
        type: 'magic',
        target: 'enemy',
        power: 110,
        mpCost: 8,
        description: 'Strike with piercing ice.',
        effect: 'slow'
    },
    heal: {
        id: 'heal',
        name: 'Heal',
        type: 'heal',
        target: 'ally',
        power: 80,
        mpCost: 15,
        description: 'Restore HP to an ally.'
    },

    // Ranger abilities
    quick_shot: {
        id: 'quick_shot',
        name: 'Quick Shot',
        type: 'physical',
        target: 'enemy',
        power: 80,
        mpCost: 5,
        description: 'A fast arrow strike.'
    },
    poison_arrow: {
        id: 'poison_arrow',
        name: 'Poison Arrow',
        type: 'physical',
        target: 'enemy',
        power: 90,
        mpCost: 10,
        description: 'An arrow tipped with venom.',
        effect: 'poison'
    },
    focus: {
        id: 'focus',
        name: 'Focus',
        type: 'buff',
        target: 'self',
        power: 0,
        mpCost: 8,
        description: 'Concentrate to boost next attack.',
        effect: 'atk_up'
    },

    // Enemy abilities
    bite: {
        id: 'bite',
        name: 'Bite',
        type: 'physical',
        target: 'enemy',
        power: 90,
        mpCost: 0,
        description: 'A vicious bite attack.'
    },
    tackle: {
        id: 'tackle',
        name: 'Tackle',
        type: 'physical',
        target: 'enemy',
        power: 80,
        mpCost: 0,
        description: 'Charge at the target.'
    },
    slash: {
        id: 'slash',
        name: 'Slash',
        type: 'physical',
        target: 'enemy',
        power: 110,
        mpCost: 0,
        description: 'A slashing attack with claws.'
    }
};

export const getAbility = (id: string): Ability | undefined => {
    return ABILITIES[id];
};

export const getAbilitiesForCharacter = (abilityIds: string[]): Ability[] => {
    return abilityIds
        .map(id => ABILITIES[id])
        .filter((ability): ability is Ability => ability !== undefined);
};
