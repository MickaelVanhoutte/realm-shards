// Item Data
import type { Item } from '../types';

export const ITEMS: Record<string, Item> = {
    // Healing items
    'potion': {
        id: 'potion',
        name: 'Potion',
        category: 'healing',
        description: 'Restores 20 HP to a creature.',
        sprite: '🧪',
        effect: { type: 'heal_hp', value: 20 }
    },
    'super_potion': {
        id: 'super_potion',
        name: 'Super Potion',
        category: 'healing',
        description: 'Restores 50 HP to a creature.',
        sprite: '🧪',
        effect: { type: 'heal_hp', value: 50 }
    },
    'hyper_potion': {
        id: 'hyper_potion',
        name: 'Hyper Potion',
        category: 'healing',
        description: 'Restores 200 HP to a creature.',
        sprite: '🧪',
        effect: { type: 'heal_hp', value: 200 }
    },
    'revive': {
        id: 'revive',
        name: 'Revive',
        category: 'healing',
        description: 'Revives a fainted creature with half HP.',
        sprite: '💎',
        effect: { type: 'heal_hp', value: -1 }  // -1 = half HP revive
    },

    // Capture balls
    'capture_ball': {
        id: 'capture_ball',
        name: 'Capture Ball',
        category: 'capture',
        description: 'A basic ball for capturing wild creatures.',
        sprite: '🔴',
        effect: { type: 'capture', captureBonus: 1.0 }
    },
    'great_ball': {
        id: 'great_ball',
        name: 'Great Ball',
        category: 'capture',
        description: 'An improved ball with higher capture rate.',
        sprite: '🔵',
        effect: { type: 'capture', captureBonus: 1.5 }
    },
    'ultra_ball': {
        id: 'ultra_ball',
        name: 'Ultra Ball',
        category: 'capture',
        description: 'A high-performance ball for tough captures.',
        sprite: '🟡',
        effect: { type: 'capture', captureBonus: 2.0 }
    },
    'master_ball': {
        id: 'master_ball',
        name: 'Master Ball',
        category: 'capture',
        description: 'Never fails to capture any creature.',
        sprite: '🟣',
        effect: { type: 'capture', captureBonus: 255 }  // Guaranteed
    },

    // Buff items
    'x_attack': {
        id: 'x_attack',
        name: 'X Attack',
        category: 'buff',
        description: 'Sharply raises a creature\'s Attack.',
        sprite: '⚔️',
        effect: { type: 'boost', value: 1 }  // +1 stage
    },
    'x_defense': {
        id: 'x_defense',
        name: 'X Defense',
        category: 'buff',
        description: 'Sharply raises a creature\'s Defense.',
        sprite: '🛡️',
        effect: { type: 'boost', value: 1 }
    },
    'x_speed': {
        id: 'x_speed',
        name: 'X Speed',
        category: 'buff',
        description: 'Sharply raises a creature\'s Speed.',
        sprite: '💨',
        effect: { type: 'boost', value: 1 }
    }
};

// Get item by ID
export function getItem(itemId: string): Item | undefined {
    return ITEMS[itemId];
}

// Create default inventory for new game
export function createDefaultInventory(): import('../types').Inventory {
    return {
        items: [
            { itemId: 'potion', quantity: 5 },
            { itemId: 'capture_ball', quantity: 10 }
        ]
    };
}
