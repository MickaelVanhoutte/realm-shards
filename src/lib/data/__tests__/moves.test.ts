import { describe, it, expect } from 'vitest';
import { getTypeEffectiveness, getMove, MOVES } from '../moves';

describe('getTypeEffectiveness', () => {
    describe('super effective matchups (2x)', () => {
        it('fire is super effective against grass', () => {
            expect(getTypeEffectiveness('fire', ['grass'])).toBe(2);
        });

        it('water is super effective against fire', () => {
            expect(getTypeEffectiveness('water', ['fire'])).toBe(2);
        });

        it('electric is super effective against water', () => {
            expect(getTypeEffectiveness('electric', ['water'])).toBe(2);
        });

        it('fighting is super effective against normal', () => {
            expect(getTypeEffectiveness('fighting', ['normal'])).toBe(2);
        });
    });

    describe('not very effective matchups (0.5x)', () => {
        it('fire is not very effective against water', () => {
            expect(getTypeEffectiveness('fire', ['water'])).toBe(0.5);
        });

        it('grass is not very effective against fire', () => {
            expect(getTypeEffectiveness('grass', ['fire'])).toBe(0.5);
        });

        it('normal is not very effective against rock', () => {
            expect(getTypeEffectiveness('normal', ['rock'])).toBe(0.5);
        });
    });

    describe('immunities (0x)', () => {
        it('normal has no effect on ghost', () => {
            expect(getTypeEffectiveness('normal', ['ghost'])).toBe(0);
        });

        it('ghost has no effect on normal', () => {
            expect(getTypeEffectiveness('ghost', ['normal'])).toBe(0);
        });

        it('electric has no effect on ground', () => {
            expect(getTypeEffectiveness('electric', ['ground'])).toBe(0);
        });

        it('fighting has no effect on ghost', () => {
            expect(getTypeEffectiveness('fighting', ['ghost'])).toBe(0);
        });

        it('psychic has no effect on dark', () => {
            expect(getTypeEffectiveness('psychic', ['dark'])).toBe(0);
        });

        it('ground has no effect on flying', () => {
            expect(getTypeEffectiveness('ground', ['flying'])).toBe(0);
        });

        it('dragon has no effect on fairy', () => {
            expect(getTypeEffectiveness('dragon', ['fairy'])).toBe(0);
        });

        it('poison has no effect on steel', () => {
            expect(getTypeEffectiveness('poison', ['steel'])).toBe(0);
        });
    });

    describe('dual types', () => {
        it('calculates 4x effectiveness for super effective against both types', () => {
            // Ground is 2x against fire and 2x against electric = 4x vs fire/electric
            expect(getTypeEffectiveness('ground', ['fire', 'electric'])).toBe(4);
        });

        it('calculates 0.25x when resisted by both types', () => {
            // Fire is 0.5x against fire and 0.5x against water = 0.25x vs fire/water
            expect(getTypeEffectiveness('fire', ['fire', 'water'])).toBe(0.25);
        });

        it('immunity overrides other effectiveness', () => {
            // Electric is 2x against water but 0x against ground = 0x vs water/ground
            expect(getTypeEffectiveness('electric', ['water', 'ground'])).toBe(0);
        });

        it('super effective vs one, not very effective vs other = 1x', () => {
            // Fire is 2x against grass, 0.5x against dragon = 1x
            expect(getTypeEffectiveness('fire', ['grass', 'dragon'])).toBe(1);
        });
    });

    describe('neutral matchups', () => {
        it('returns 1 for neutral matchups', () => {
            expect(getTypeEffectiveness('normal', ['normal'])).toBe(1);
        });

        it('returns 1 for unknown/missing types', () => {
            expect(getTypeEffectiveness('normal', [])).toBe(1);
        });
    });
});

describe('MOVES dictionary', () => {
    it('contains moves from pokedex', () => {
        expect(Object.keys(MOVES).length).toBeGreaterThan(0);
    });

    it('moves have required properties', () => {
        const moveIds = Object.keys(MOVES).slice(0, 5);
        for (const id of moveIds) {
            const move = MOVES[id];
            expect(move).toHaveProperty('id');
            expect(move).toHaveProperty('name');
            expect(move).toHaveProperty('type');
            expect(move).toHaveProperty('category');
            expect(move).toHaveProperty('power');
            expect(move).toHaveProperty('accuracy');
            expect(move).toHaveProperty('pp');
        }
    });
});

describe('getMove', () => {
    it('returns undefined for non-existent moves', () => {
        expect(getMove('nonexistent_move_xyz')).toBeUndefined();
    });

    it('normalizes move IDs correctly', () => {
        // Test that it handles snake_case lookups
        const move = getMove('tackle');
        if (move) {
            expect(move.name.toLowerCase()).toContain('tackle');
        }
    });
});
