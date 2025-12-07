// Legacy character data for compatibility with old battle system
// This provides the CHARACTERS needed by partyStore.ts

export interface Character {
    id: string;
    name: string;
    class: string;
    level: number;
    stats: {
        hp: number;
        mp: number;
        atk: number;
        def: number;
        mag: number;
        spd: number;
    };
    abilities: string[];
    sprite: {
        idle: string;
        attack?: string;
        hurt?: string;
        defeat?: string;
    };
    color: string;
}

// Default characters for the old party system
export const CHARACTERS: Record<string, Character> = {
    valen: {
        id: 'valen',
        name: 'Valen',
        class: 'Warrior',
        level: 5,
        stats: { hp: 120, mp: 20, atk: 18, def: 15, mag: 8, spd: 12 },
        abilities: ['slash', 'defend'],
        sprite: { idle: '⚔️', attack: '🗡️', hurt: '😣', defeat: '💀' },
        color: '#e74c3c'
    },
    lyra: {
        id: 'lyra',
        name: 'Lyra',
        class: 'Mage',
        level: 5,
        stats: { hp: 80, mp: 50, atk: 8, def: 8, mag: 22, spd: 14 },
        abilities: ['fireball', 'heal'],
        sprite: { idle: '🧙', attack: '✨', hurt: '😣', defeat: '💀' },
        color: '#9b59b6'
    },
    thorne: {
        id: 'thorne',
        name: 'Thorne',
        class: 'Ranger',
        level: 5,
        stats: { hp: 100, mp: 30, atk: 14, def: 10, mag: 12, spd: 18 },
        abilities: ['shoot', 'poison_arrow'],
        sprite: { idle: '🏹', attack: '🎯', hurt: '😣', defeat: '💀' },
        color: '#27ae60'
    }
};
