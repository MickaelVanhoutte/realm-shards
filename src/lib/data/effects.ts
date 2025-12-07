// Move Effects System
// Handles status conditions, stat modifiers, and effect parsing

import type { ElementType } from '../types';

// ===== Status Conditions =====
// Only one major status condition can be active at a time
// Confusion is a volatile condition that can coexist with major conditions
export type MajorStatusCondition = 'poison' | 'badly-poisoned' | 'burn' | 'paralysis' | 'sleep' | 'freeze';
export type VolatileCondition = 'confusion' | 'flinch' | 'bound' | 'leech-seed';

export interface StatusState {
    major?: MajorStatusCondition;
    volatile: VolatileCondition[];
    sleepTurns?: number;      // 1-3 turns for sleep
    confusionTurns?: number;  // 2-5 turns for confusion
    toxicCounter?: number;    // Increases each turn for badly-poisoned
}

// ===== Stat Modifiers =====
// Stages range from -6 to +6
export interface StatModifiers {
    atk: number;
    def: number;
    spAtk: number;
    spDef: number;
    speed: number;
    accuracy: number;
    evasion: number;
}

export const DEFAULT_STAT_MODIFIERS: StatModifiers = {
    atk: 0,
    def: 0,
    spAtk: 0,
    spDef: 0,
    speed: 0,
    accuracy: 0,
    evasion: 0
};

// ===== Stat Stage Multipliers =====
// -6 = 2/8 = 0.25x, 0 = 1.0x, +6 = 8/2 = 4.0x
export function getStatStageMultiplier(stage: number): number {
    const clampedStage = Math.max(-6, Math.min(6, stage));
    if (clampedStage >= 0) {
        return (2 + clampedStage) / 2;
    }
    return 2 / (2 - clampedStage);
}

// Accuracy/Evasion use different formula
export function getAccuracyStageMultiplier(stage: number): number {
    const clampedStage = Math.max(-6, Math.min(6, stage));
    if (clampedStage >= 0) {
        return (3 + clampedStage) / 3;
    }
    return 3 / (3 - clampedStage);
}

// ===== Move Effect Types =====
export type EffectType =
    | 'stat-change'
    | 'status'
    | 'heal'
    | 'drain'
    | 'recoil'
    | 'flinch'
    | 'none';

export interface ParsedMoveEffect {
    type: EffectType;
    stat?: keyof StatModifiers;
    stages?: number;
    status?: MajorStatusCondition | VolatileCondition;
    chance: number;           // 0-100, 100 = guaranteed
    target: 'self' | 'opponent';
    healPercent?: number;     // For healing moves
    drainPercent?: number;    // For drain moves
    recoilPercent?: number;   // For recoil moves
}

// ===== Effect Parsing =====
// Parse the natural language effect description from move data

const STAT_NAME_MAP: Record<string, keyof StatModifiers> = {
    'attack': 'atk',
    'defense': 'def',
    'special attack': 'spAtk',
    'special defense': 'spDef',
    'sp. atk': 'spAtk',
    'sp. def': 'spDef',
    'speed': 'speed',
    'accuracy': 'accuracy',
    'evasion': 'evasion',
    'evasiveness': 'evasion'
};

const STAGE_NAME_MAP: Record<string, number> = {
    'one': 1,
    'two': 2,
    'three': 3,
    'four': 4,
    'sharply': 2,  // "sharply raises" = 2 stages
    'drastically': 3  // "drastically raises" = 3 stages
};

export function parseEffectDescription(
    effectText: string | undefined,
    effectChance: number = 100,
    moveTarget: string = 'selected-pokemon'
): ParsedMoveEffect[] {
    const effects: ParsedMoveEffect[] = [];

    if (!effectText) return effects;

    const text = effectText.toLowerCase();

    // Parse stat changes
    // Examples: 
    // "Raises the user's Attack by two stages."
    // "Lowers the target's Defense by one stage."
    // "Has a 10% chance to raise all of the user's stats by one stage."

    const statChangePatterns = [
        // "Raises/Lowers the user's/target's [stat] by [X] stage(s)"
        /(?:has\s+a\s+\$?(\d+)%?\s+chance\s+to\s+)?(raise|lower)s?\s+(?:the\s+)?(user'?s?|target'?s?)\s+(\w+(?:\s+\w+)?)\s+by\s+(\w+)\s+stage/gi,
        // "Sharply/Drastically raises [stat]"
        /(sharply|drastically)\s+(raise|lower)s?\s+(?:the\s+)?(user'?s?|target'?s?)\s+(\w+(?:\s+\w+)?)/gi
    ];

    for (const pattern of statChangePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            if (match.length >= 5) {
                const chance = match[1] ? parseInt(match[1]) : effectChance;
                const direction = match[2].toLowerCase().includes('raise') ? 1 : -1;
                const targetType = match[3]?.toLowerCase().includes('user') ? 'self' : 'opponent';
                const statName = match[4]?.toLowerCase();
                const stageWord = match[5]?.toLowerCase() || match[1]?.toLowerCase();

                const stat = STAT_NAME_MAP[statName];
                const stages = STAGE_NAME_MAP[stageWord] || 1;

                if (stat) {
                    effects.push({
                        type: 'stat-change',
                        stat,
                        stages: direction * stages,
                        chance,
                        target: targetType as 'self' | 'opponent'
                    });
                }
            }
        }
    }

    // Parse status conditions
    const statusPatterns: Array<{ pattern: RegExp; status: MajorStatusCondition | VolatileCondition }> = [
        { pattern: /(?:has\s+a\s+\$?(\d+)%?\s+chance\s+to\s+)?(?:badly\s+)?poison/i, status: 'poison' },
        { pattern: /(?:has\s+a\s+\$?(\d+)%?\s+chance\s+to\s+)?burn/i, status: 'burn' },
        { pattern: /(?:has\s+a\s+\$?(\d+)%?\s+chance\s+to\s+)?(?:paralyze|paralysis)/i, status: 'paralysis' },
        { pattern: /(?:has\s+a\s+\$?(\d+)%?\s+chance\s+to\s+)?(?:put.*to\s+sleep|sleep)/i, status: 'sleep' },
        { pattern: /(?:has\s+a\s+\$?(\d+)%?\s+chance\s+to\s+)?freeze/i, status: 'freeze' },
        { pattern: /(?:has\s+a\s+\$?(\d+)%?\s+chance\s+to\s+)?confuse/i, status: 'confusion' },
        { pattern: /(?:has\s+a\s+\$?(\d+)%?\s+chance\s+to\s+)?(?:cause.*to\s+)?flinch/i, status: 'flinch' }
    ];

    for (const { pattern, status } of statusPatterns) {
        const match = text.match(pattern);
        if (match) {
            // Check if it's "badly poison"
            const actualStatus = text.includes('badly poison') ? 'badly-poisoned' : status;
            const chance = match[1] ? parseInt(match[1]) : (text.includes('chance') ? effectChance : 100);

            effects.push({
                type: 'status',
                status: actualStatus,
                chance,
                target: moveTarget === 'user' ? 'self' : 'opponent'
            });
        }
    }

    // Parse healing
    const healMatch = text.match(/(?:restores?|heals?|recovers?)\s+(?:up\s+to\s+)?(\d+)?\s*%?\s*(?:of\s+)?(?:the\s+)?(?:user'?s?|its?)?\s*(?:max(?:imum)?)?\s*hp/i);
    if (healMatch) {
        effects.push({
            type: 'heal',
            healPercent: healMatch[1] ? parseInt(healMatch[1]) : 50,
            chance: 100,
            target: 'self'
        });
    }

    // Parse drain
    const drainMatch = text.match(/drains?\s+(?:half|(\d+)%?)\s+(?:of\s+)?(?:the\s+)?damage/i);
    if (drainMatch) {
        effects.push({
            type: 'drain',
            drainPercent: drainMatch[1] ? parseInt(drainMatch[1]) : 50,
            chance: 100,
            target: 'self'
        });
    }

    // Parse recoil
    const recoilMatch = text.match(/(?:user\s+)?(?:takes?|receives?|suffers?)\s+(?:(\d+)%?\s+)?(?:of\s+)?(?:the\s+)?(?:damage\s+)?(?:dealt\s+)?(?:as\s+)?recoil/i);
    if (recoilMatch) {
        effects.push({
            type: 'recoil',
            recoilPercent: recoilMatch[1] ? parseInt(recoilMatch[1]) : 25,
            chance: 100,
            target: 'self'
        });
    }

    return effects;
}

// ===== Effect Application Helpers =====

export function applyStatModifier(
    modifiers: StatModifiers,
    stat: keyof StatModifiers,
    stages: number
): { newValue: number; clamped: boolean; message: string } {
    const oldValue = modifiers[stat];
    const newValue = Math.max(-6, Math.min(6, oldValue + stages));
    const clamped = newValue !== oldValue + stages;

    modifiers[stat] = newValue;

    let message = '';
    if (clamped) {
        message = stages > 0 ? "can't go any higher!" : "can't go any lower!";
    } else if (stages >= 3) {
        message = 'rose drastically!';
    } else if (stages === 2) {
        message = 'rose sharply!';
    } else if (stages === 1) {
        message = 'rose!';
    } else if (stages === -1) {
        message = 'fell!';
    } else if (stages === -2) {
        message = 'fell harshly!';
    } else if (stages <= -3) {
        message = 'fell severely!';
    }

    return { newValue, clamped, message };
}

export function canApplyMajorStatus(currentStatus: MajorStatusCondition | undefined): boolean {
    return currentStatus === undefined;
}

export function getStatusEmoji(status: MajorStatusCondition | VolatileCondition): string {
    switch (status) {
        case 'poison':
        case 'badly-poisoned':
            return '☠️';
        case 'burn':
            return '🔥';
        case 'paralysis':
            return '⚡';
        case 'sleep':
            return '💤';
        case 'freeze':
            return '❄️';
        case 'confusion':
            return '💫';
        case 'flinch':
            return '😵';
        default:
            return '❓';
    }
}

export function getStatusName(status: MajorStatusCondition | VolatileCondition): string {
    switch (status) {
        case 'poison': return 'Poisoned';
        case 'badly-poisoned': return 'Badly Poisoned';
        case 'burn': return 'Burned';
        case 'paralysis': return 'Paralyzed';
        case 'sleep': return 'Asleep';
        case 'freeze': return 'Frozen';
        case 'confusion': return 'Confused';
        case 'flinch': return 'Flinched';
        default: return status;
    }
}

// ===== Status Effect Processing =====

export interface StatusDamageResult {
    damage: number;
    message: string;
    cured?: boolean;
}

export function processStatusDamage(
    status: MajorStatusCondition,
    maxHp: number,
    toxicCounter?: number
): StatusDamageResult {
    switch (status) {
        case 'poison':
            return {
                damage: Math.max(1, Math.floor(maxHp / 8)),
                message: 'is hurt by poison!'
            };
        case 'badly-poisoned':
            const counter = toxicCounter || 1;
            return {
                damage: Math.max(1, Math.floor((maxHp * counter) / 16)),
                message: 'is badly hurt by poison!'
            };
        case 'burn':
            return {
                damage: Math.max(1, Math.floor(maxHp / 16)),
                message: 'is hurt by its burn!'
            };
        default:
            return { damage: 0, message: '' };
    }
}

export function checkParalysis(): boolean {
    // 25% chance to be fully paralyzed
    return Math.random() < 0.25;
}

export function checkFreezeThaw(moveType?: ElementType): boolean {
    // 20% chance to thaw naturally, or 100% if hit by Fire move
    if (moveType === 'fire') return true;
    return Math.random() < 0.2;
}

export function checkSleepWake(sleepTurns: number): boolean {
    // Wake up after 1-3 turns
    return sleepTurns >= 1 && Math.random() < (sleepTurns >= 3 ? 1 : 0.33);
}

export function checkConfusionEnd(confusionTurns: number): boolean {
    // Confusion lasts 2-5 turns
    return confusionTurns >= 2 && Math.random() < (confusionTurns >= 5 ? 1 : 0.25);
}

export function checkConfusionSelfHit(): boolean {
    // 50% chance to hit self in confusion (was 33% in later games)
    return Math.random() < 0.5;
}

// ===== Stat Name Formatting =====
export function getStatDisplayName(stat: keyof StatModifiers): string {
    switch (stat) {
        case 'atk': return 'Attack';
        case 'def': return 'Defense';
        case 'spAtk': return 'Sp. Atk';
        case 'spDef': return 'Sp. Def';
        case 'speed': return 'Speed';
        case 'accuracy': return 'Accuracy';
        case 'evasion': return 'Evasion';
    }
}
