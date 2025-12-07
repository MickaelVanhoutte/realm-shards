// Trainer Data and Skills
import type { Trainer, TrainerSkill, Creature } from '../types';
import { createCreature } from './creatures';
import trainerSprite from '../../assets/sprites/trainers/throwing/ethan.png';

// ===== Trainer Skills =====
export const TRAINER_SKILLS: Record<string, TrainerSkill> = {
    // Offense branch
    'battle_cry': {
        id: 'battle_cry',
        name: 'Battle Cry',
        description: 'Boost all creatures\' ATK by 20% for 3 turns.',
        cost: 1,
        effect: 'buff',
        prerequisites: []
    },
    'focus_command': {
        id: 'focus_command',
        name: 'Focus Command',
        description: 'Increase critical hit rate for all creatures this turn.',
        cost: 2,
        effect: 'buff',
        prerequisites: ['battle_cry']
    },
    'combo_strike': {
        id: 'combo_strike',
        name: 'Combo Strike',
        description: 'Trainer assists next creature attack for +50% damage.',
        cost: 3,
        effect: 'command',
        prerequisites: ['focus_command']
    },

    // Support branch
    'first_aid': {
        id: 'first_aid',
        name: 'First Aid',
        description: 'Heal a creature for 30% HP without using an item.',
        cost: 1,
        effect: 'heal',
        prerequisites: []
    },
    'rally': {
        id: 'rally',
        name: 'Rally',
        description: 'Boost all creatures\' Speed by 20% for 3 turns.',
        cost: 2,
        effect: 'buff',
        prerequisites: ['first_aid']
    },
    'shield_order': {
        id: 'shield_order',
        name: 'Shield Order',
        description: 'Boost all creatures\' DEF by 30% this turn.',
        cost: 2,
        effect: 'buff',
        prerequisites: ['first_aid']
    },

    // Capture branch
    'weakening_gaze': {
        id: 'weakening_gaze',
        name: 'Weakening Gaze',
        description: 'Lower wild creature\'s capture resistance by 20%.',
        cost: 1,
        effect: 'capture',
        prerequisites: []
    },
    'master_craft': {
        id: 'master_craft',
        name: 'Master Ball Craft',
        description: 'Increase capture ball effectiveness by 30%.',
        cost: 2,
        effect: 'capture',
        prerequisites: ['weakening_gaze']
    },
    'tame': {
        id: 'tame',
        name: 'Tame',
        description: 'Instantly capture a creature below 10% HP.',
        cost: 3,
        effect: 'capture',
        prerequisites: ['master_craft']
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
        level: 1,
        exp: 0,
        expToNextLevel: 100,
        stats: {
            hp: 50,
            speed: 15  // Very low, but trainer acts first anyway
        },
        currentHp: 50,
        maxHp: 50,
        skillPoints: 1,  // Start with 1 point
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
