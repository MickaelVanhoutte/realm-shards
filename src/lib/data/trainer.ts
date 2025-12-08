// Trainer Data and Skills
import type { Trainer, TrainerSkill, Creature } from '../types';
import { createCreature } from './creatures';
const trainerSprite = `${import.meta.env.BASE_URL}sprites/trainers/throwing/ethan.png`;

// ===== Skill Branches =====
export type SkillBranch = 'warlord' | 'commander' | 'ranger' | 'elementalist' | 'tactician';
export type SkillTier = 1 | 2 | 3;

export interface SkillEffect {
    type: 'stat-buff' | 'turn-frequency' | 'type-boost' | 'weather-extend' | 'crit-boost' | 'follow-up' | 'damage-redirect' | 'guaranteed-crit';
    stat?: 'atk' | 'spAtk' | 'def' | 'spDef' | 'speed' | 'accuracy';
    value?: number;       // Percentage or flat value
    duration?: number;    // Turns (0 = passive/permanent)
    elementType?: string; // For type-boost
}

// ===== Trainer Skills (Job-like Skill Tree) =====
export const TRAINER_SKILLS: Record<string, TrainerSkill> = {
    // ===== WARLORD BRANCH (Offense) =====
    'warlord_1': {
        id: 'warlord_1',
        name: 'Battle Cry',
        description: '+10% ATK to all party for 3 turns.',
        cost: 1,
        effect: 'buff',
        prerequisites: [],
        branch: 'warlord',
        tier: 1,
        passive: false,
        effectData: { type: 'stat-buff', stat: 'atk', value: 10, duration: 3 }
    },
    'warlord_2': {
        id: 'warlord_2',
        name: 'Berserker Rage',
        description: '+20% ATK/SP.ATK to party (passive).',
        cost: 2,
        effect: 'buff',
        prerequisites: ['warlord_1'],
        branch: 'warlord',
        tier: 2,
        passive: true,
        effectData: { type: 'stat-buff', stat: 'atk', value: 20, duration: 0 }
    },
    'warlord_3': {
        id: 'warlord_3',
        name: 'Combo Master',
        description: 'Next 3 attacks trigger 50% follow-up from strongest ally.',
        cost: 3,
        effect: 'command',
        prerequisites: ['warlord_2'],
        branch: 'warlord',
        tier: 3,
        passive: false,
        effectData: { type: 'follow-up', value: 50, duration: 3 }
    },

    // ===== COMMANDER BRANCH (Defense) =====
    'commander_1': {
        id: 'commander_1',
        name: 'Rally Defense',
        description: '+10% DEF to all party for 3 turns.',
        cost: 1,
        effect: 'buff',
        prerequisites: [],
        branch: 'commander',
        tier: 1,
        passive: false,
        effectData: { type: 'stat-buff', stat: 'def', value: 10, duration: 3 }
    },
    'commander_2': {
        id: 'commander_2',
        name: 'Fortress',
        description: '+20% DEF/SP.DEF to party (passive).',
        cost: 2,
        effect: 'buff',
        prerequisites: ['commander_1'],
        branch: 'commander',
        tier: 2,
        passive: true,
        effectData: { type: 'stat-buff', stat: 'def', value: 20, duration: 0 }
    },
    'commander_3': {
        id: 'commander_3',
        name: 'Guardian Shield',
        description: 'Redirect 30% of damage to trainer for 3 turns.',
        cost: 3,
        effect: 'buff',
        prerequisites: ['commander_2'],
        branch: 'commander',
        tier: 3,
        passive: false,
        effectData: { type: 'damage-redirect', value: 30, duration: 3 }
    },

    // ===== RANGER BRANCH (Speed/Turn Frequency) =====
    'ranger_1': {
        id: 'ranger_1',
        name: 'Quick Orders',
        description: 'Play every 4 turns instead of 5.',
        cost: 1,
        effect: 'buff',
        prerequisites: [],
        branch: 'ranger',
        tier: 1,
        passive: true,
        effectData: { type: 'turn-frequency', value: 4, duration: 0 }
    },
    'ranger_2': {
        id: 'ranger_2',
        name: 'Swift Strike',
        description: '+20% Speed to party (passive).',
        cost: 2,
        effect: 'buff',
        prerequisites: ['ranger_1'],
        branch: 'ranger',
        tier: 2,
        passive: true,
        effectData: { type: 'stat-buff', stat: 'speed', value: 20, duration: 0 }
    },
    'ranger_3': {
        id: 'ranger_3',
        name: 'Rapid Command',
        description: 'Play every 3 turns instead of 5.',
        cost: 3,
        effect: 'buff',
        prerequisites: ['ranger_2'],
        branch: 'ranger',
        tier: 3,
        passive: true,
        effectData: { type: 'turn-frequency', value: 3, duration: 0 }
    },

    // ===== ELEMENTALIST BRANCH (Type/Weather) =====
    'elementalist_1': {
        id: 'elementalist_1',
        name: 'Fire Affinity',
        description: 'Fire moves +15% damage.',
        cost: 1,
        effect: 'buff',
        prerequisites: [],
        branch: 'elementalist',
        tier: 1,
        passive: true,
        effectData: { type: 'type-boost', elementType: 'fire', value: 15, duration: 0 }
    },
    'elementalist_2': {
        id: 'elementalist_2',
        name: 'Weather Master',
        description: 'Weather effects last +2 turns.',
        cost: 2,
        effect: 'buff',
        prerequisites: ['elementalist_1'],
        branch: 'elementalist',
        tier: 2,
        passive: true,
        effectData: { type: 'weather-extend', value: 2, duration: 0 }
    },
    'elementalist_3': {
        id: 'elementalist_3',
        name: 'Elemental Surge',
        description: 'Super-effective moves deal +25% damage.',
        cost: 3,
        effect: 'buff',
        prerequisites: ['elementalist_2'],
        branch: 'elementalist',
        tier: 3,
        passive: true,
        effectData: { type: 'type-boost', value: 25, duration: 0 }
    },

    // ===== TACTICIAN BRANCH (Crit/Accuracy) =====
    'tactician_1': {
        id: 'tactician_1',
        name: 'Focus Command',
        description: '+10% crit rate for party this turn.',
        cost: 1,
        effect: 'buff',
        prerequisites: [],
        branch: 'tactician',
        tier: 1,
        passive: false,
        effectData: { type: 'crit-boost', value: 10, duration: 1 }
    },
    'tactician_2': {
        id: 'tactician_2',
        name: 'Precision',
        description: '+20% Accuracy for party (passive).',
        cost: 2,
        effect: 'buff',
        prerequisites: ['tactician_1'],
        branch: 'tactician',
        tier: 2,
        passive: true,
        effectData: { type: 'stat-buff', stat: 'accuracy', value: 20, duration: 0 }
    },
    'tactician_3': {
        id: 'tactician_3',
        name: 'Perfect Strategy',
        description: 'First move each battle is guaranteed crit.',
        cost: 3,
        effect: 'command',
        prerequisites: ['tactician_2'],
        branch: 'tactician',
        tier: 3,
        passive: true,
        effectData: { type: 'guaranteed-crit', value: 1, duration: 0 }
    }
};

// Create a new trainer with a starter creature
export function createTrainer(name: string, starterSpeciesId: string): Trainer {
    const starter = createCreature(starterSpeciesId, 5);
    if (!starter) {
        throw new Error(`Invalid starter species: ${starterSpeciesId}`);
    }

    return {
        id: 'player',
        name,
        sprite: trainerSprite,
        avatar: trainerSprite, // Using same sprite for now, could be cropped
        level: 10,
        exp: 0,
        expToNextLevel: 100,
        stats: {
            hp: 50,
            speed: 15  // Very low, but trainer acts first anyway
        },
        currentHp: 50,
        maxHp: 50,
        skillPoints: 10,  // Start with 1 point
        unlockedSkills: [],
        party: [starter],
        pcBox: []
    };
}

// Calculate XP needed for next level
export function getExpToNextLevel(level: number): number {
    return Math.floor(Math.pow(level + 1, 3) * 0.8);
}

// Add XP to trainer and handle level up
export function addTrainerExp(trainer: Trainer, exp: number): { leveledUp: boolean; newLevel: number | undefined } {
    trainer.exp += exp;

    if (trainer.exp >= trainer.expToNextLevel) {
        trainer.level++;
        trainer.exp -= trainer.expToNextLevel;
        trainer.expToNextLevel = getExpToNextLevel(trainer.level);
        trainer.skillPoints++;

        // Increase HP on level up
        const hpGain = 5 + Math.floor(trainer.level / 2);
        trainer.maxHp += hpGain;
        trainer.currentHp += hpGain;

        return { leveledUp: true, newLevel: trainer.level };
    }

    return { leveledUp: false, newLevel: undefined };
}

// Check if trainer can unlock a skill
export function canUnlockSkill(trainer: Trainer, skillId: string): boolean {
    const skill = TRAINER_SKILLS[skillId];
    if (!skill) return false;

    // Check if already unlocked
    if (trainer.unlockedSkills.includes(skillId)) return false;

    // Check skill points
    if (trainer.skillPoints < skill.cost) return false;

    // Check prerequisites
    for (const prereq of skill.prerequisites) {
        if (!trainer.unlockedSkills.includes(prereq)) return false;
    }

    return true;
}

// Unlock a skill
export function unlockSkill(trainer: Trainer, skillId: string): boolean {
    if (!canUnlockSkill(trainer, skillId)) return false;

    const skill = TRAINER_SKILLS[skillId];
    trainer.skillPoints -= skill.cost;
    trainer.unlockedSkills.push(skillId);

    return true;
}

// Get active creatures for battle (first 3 non-fainted)
export function getActiveCreatures(trainer: Trainer): Creature[] {
    return trainer.party
        .filter(c => !c.isFainted)
        .slice(0, 3);
}

// Get skill by ID
export function getSkill(skillId: string): TrainerSkill | undefined {
    return TRAINER_SKILLS[skillId];
}

// Calculate trainer action interval based on unlocked skills
export function getTrainerActionInterval(trainer: Trainer): number {
    // Check for ranger skills that modify turn frequency
    if (trainer.unlockedSkills.includes('ranger_3')) {
        return 3; // Rapid Command: every 3 turns
    }
    if (trainer.unlockedSkills.includes('ranger_1')) {
        return 4; // Quick Orders: every 4 turns
    }
    return 5; // Default: every 5 turns
}

// Get passive stat multiplier for a given stat from unlocked skills
export function getPassiveStatMultiplier(trainer: Trainer, stat: string): number {
    let multiplier = 1.0;

    for (const skillId of trainer.unlockedSkills) {
        const skill = TRAINER_SKILLS[skillId];
        if (skill && skill.passive && skill.effectData?.type === 'stat-buff') {
            if (skill.effectData.stat === stat ||
                (stat === 'spAtk' && skill.effectData.stat === 'atk' && skillId === 'warlord_2') || // Berserker affects both
                (stat === 'spDef' && skill.effectData.stat === 'def' && skillId === 'commander_2')) { // Fortress affects both
                multiplier += (skill.effectData.value || 0) / 100;
            }
        }
    }

    return multiplier;
}

// Get skills grouped by branch for UI
export function getSkillsByBranch(): Record<string, TrainerSkill[]> {
    const branches: Record<string, TrainerSkill[]> = {
        warlord: [],
        commander: [],
        ranger: [],
        elementalist: [],
        tactician: []
    };

    for (const skill of Object.values(TRAINER_SKILLS)) {
        if (skill.branch) {
            branches[skill.branch].push(skill);
        }
    }

    // Sort each branch by tier
    for (const branch of Object.keys(branches)) {
        branches[branch].sort((a, b) => (a.tier || 0) - (b.tier || 0));
    }

    return branches;
}

// Get branch info for display
export const BRANCH_INFO: Record<string, { name: string; icon: string; color: string }> = {
    warlord: { name: 'Warlord', icon: '⚔️', color: '#e74c3c' },
    commander: { name: 'Commander', icon: '🛡️', color: '#3498db' },
    ranger: { name: 'Ranger', icon: '🏃', color: '#2ecc71' },
    elementalist: { name: 'Elementalist', icon: '🔥', color: '#e67e22' },
    tactician: { name: 'Tactician', icon: '🎯', color: '#9b59b6' }
};
