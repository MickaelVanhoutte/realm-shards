import { describe, it, expect } from 'vitest';
import {
    getStatStageMultiplier,
    getAccuracyStageMultiplier,
    applyStatModifier,
    parseEffectDescription,
    canApplyMajorStatus,
    processStatusDamage,
    getStatusEmoji,
    getStatusName,
    DEFAULT_STAT_MODIFIERS,
    type StatModifiers
} from '../effects';

describe('getStatStageMultiplier', () => {
    it('returns 1 at stage 0', () => {
        expect(getStatStageMultiplier(0)).toBe(1);
    });

    it('returns correct multipliers for positive stages', () => {
        expect(getStatStageMultiplier(1)).toBe(1.5);  // (2+1)/2 = 1.5
        expect(getStatStageMultiplier(2)).toBe(2);    // (2+2)/2 = 2
        expect(getStatStageMultiplier(6)).toBe(4);    // (2+6)/2 = 4
    });

    it('returns correct multipliers for negative stages', () => {
        expect(getStatStageMultiplier(-1)).toBeCloseTo(0.667, 2);  // 2/(2+1) = 0.667
        expect(getStatStageMultiplier(-2)).toBe(0.5);              // 2/(2+2) = 0.5
        expect(getStatStageMultiplier(-6)).toBe(0.25);             // 2/(2+6) = 0.25
    });

    it('clamps values beyond +6/-6', () => {
        expect(getStatStageMultiplier(10)).toBe(getStatStageMultiplier(6));
        expect(getStatStageMultiplier(-10)).toBe(getStatStageMultiplier(-6));
    });
});

describe('getAccuracyStageMultiplier', () => {
    it('returns 1 at stage 0', () => {
        expect(getAccuracyStageMultiplier(0)).toBe(1);
    });

    it('returns correct multipliers for positive stages', () => {
        expect(getAccuracyStageMultiplier(1)).toBeCloseTo(1.333, 2);  // (3+1)/3
        expect(getAccuracyStageMultiplier(6)).toBe(3);                // (3+6)/3
    });

    it('returns correct multipliers for negative stages', () => {
        expect(getAccuracyStageMultiplier(-1)).toBe(0.75);            // 3/(3+1)
        expect(getAccuracyStageMultiplier(-6)).toBeCloseTo(0.333, 2); // 3/(3+6)
    });
});

describe('applyStatModifier', () => {
    it('raises stats correctly', () => {
        const modifiers: StatModifiers = { ...DEFAULT_STAT_MODIFIERS };
        const result = applyStatModifier(modifiers, 'atk', 1);

        expect(modifiers.atk).toBe(1);
        expect(result.newValue).toBe(1);
        expect(result.clamped).toBe(false);
        expect(result.message).toBe('rose!');
    });

    it('lowers stats correctly', () => {
        const modifiers: StatModifiers = { ...DEFAULT_STAT_MODIFIERS };
        const result = applyStatModifier(modifiers, 'def', -1);

        expect(modifiers.def).toBe(-1);
        expect(result.message).toBe('fell!');
    });

    it('clamps at +6', () => {
        const modifiers: StatModifiers = { ...DEFAULT_STAT_MODIFIERS, atk: 5 };
        const result = applyStatModifier(modifiers, 'atk', 3);

        expect(modifiers.atk).toBe(6);
        expect(result.clamped).toBe(true);
        expect(result.message).toContain("can't go any higher");
    });

    it('clamps at -6', () => {
        const modifiers: StatModifiers = { ...DEFAULT_STAT_MODIFIERS, def: -5 };
        const result = applyStatModifier(modifiers, 'def', -3);

        expect(modifiers.def).toBe(-6);
        expect(result.clamped).toBe(true);
        expect(result.message).toContain("can't go any lower");
    });

    it('shows "rose sharply" for +2', () => {
        const modifiers: StatModifiers = { ...DEFAULT_STAT_MODIFIERS };
        const result = applyStatModifier(modifiers, 'speed', 2);
        expect(result.message).toBe('rose sharply!');
    });

    it('shows "rose drastically" for +3 or more', () => {
        const modifiers: StatModifiers = { ...DEFAULT_STAT_MODIFIERS };
        const result = applyStatModifier(modifiers, 'speed', 3);
        expect(result.message).toBe('rose drastically!');
    });
});

describe('parseEffectDescription', () => {
    it('returns empty array for undefined text', () => {
        expect(parseEffectDescription(undefined)).toEqual([]);
    });

    it('returns empty array for empty text', () => {
        expect(parseEffectDescription('')).toEqual([]);
    });

    it('parses healing effects', () => {
        const effects = parseEffectDescription('Restores 50% of the user\'s HP');
        const healEffect = effects.find(e => e.type === 'heal');

        expect(healEffect).toBeDefined();
        expect(healEffect?.healPercent).toBe(50);
        expect(healEffect?.target).toBe('self');
    });

    it('parses drain effects', () => {
        const effects = parseEffectDescription('Drains half of the damage dealt');
        const drainEffect = effects.find(e => e.type === 'drain');

        expect(drainEffect).toBeDefined();
        expect(drainEffect?.drainPercent).toBe(50);
    });

    it('parses recoil effects', () => {
        const effects = parseEffectDescription('User takes 25% of damage dealt as recoil');
        const recoilEffect = effects.find(e => e.type === 'recoil');

        expect(recoilEffect).toBeDefined();
        expect(recoilEffect?.recoilPercent).toBe(25);
    });
});

describe('canApplyMajorStatus', () => {
    it('returns true when no status exists', () => {
        expect(canApplyMajorStatus(undefined)).toBe(true);
    });

    it('returns false when a status already exists', () => {
        expect(canApplyMajorStatus('poison')).toBe(false);
        expect(canApplyMajorStatus('burn')).toBe(false);
        expect(canApplyMajorStatus('paralysis')).toBe(false);
    });
});

describe('processStatusDamage', () => {
    const maxHp = 100;

    it('calculates poison damage correctly', () => {
        const result = processStatusDamage('poison', maxHp);
        expect(result.damage).toBe(Math.floor(maxHp / 8)); // 12
        expect(result.message).toContain('poison');
    });

    it('calculates burn damage correctly', () => {
        const result = processStatusDamage('burn', maxHp);
        expect(result.damage).toBe(Math.floor(maxHp / 16)); // 6
        expect(result.message).toContain('burn');
    });

    it('calculates badly-poisoned damage with counter', () => {
        const result1 = processStatusDamage('badly-poisoned', maxHp, 1);
        const result3 = processStatusDamage('badly-poisoned', maxHp, 3);

        expect(result3.damage).toBeGreaterThan(result1.damage);
        expect(result1.damage).toBe(Math.floor((maxHp * 1) / 16));
        expect(result3.damage).toBe(Math.floor((maxHp * 3) / 16));
    });

    it('returns 0 damage for non-damaging statuses', () => {
        const result = processStatusDamage('paralysis', maxHp);
        expect(result.damage).toBe(0);
    });
});

describe('getStatusEmoji', () => {
    it('returns correct emojis', () => {
        expect(getStatusEmoji('poison')).toBe('☠️');
        expect(getStatusEmoji('burn')).toBe('🔥');
        expect(getStatusEmoji('paralysis')).toBe('⚡');
        expect(getStatusEmoji('sleep')).toBe('💤');
        expect(getStatusEmoji('freeze')).toBe('❄️');
        expect(getStatusEmoji('confusion')).toBe('💫');
    });
});

describe('getStatusName', () => {
    it('returns correct display names', () => {
        expect(getStatusName('poison')).toBe('Poisoned');
        expect(getStatusName('badly-poisoned')).toBe('Badly Poisoned');
        expect(getStatusName('burn')).toBe('Burned');
        expect(getStatusName('paralysis')).toBe('Paralyzed');
        expect(getStatusName('sleep')).toBe('Asleep');
        expect(getStatusName('freeze')).toBe('Frozen');
        expect(getStatusName('confusion')).toBe('Confused');
    });
});
