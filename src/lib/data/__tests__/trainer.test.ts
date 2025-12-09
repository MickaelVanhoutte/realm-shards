import { describe, it, expect } from 'vitest';
import {
    canUnlockSkill,
    unlockSkill,
    addTrainerExp,
    getExpToNextLevel,
    getActiveCreatures,
    getSkill,
    getTrainerActionInterval,
    getPassiveStatMultiplier,
    getSkillsByBranch,
    TRAINER_SKILLS
} from '../trainer';
import type { Trainer, Creature } from '../../types';

// Create a mock trainer without depending on createCreature/pokedex
function createMockTrainer(): Trainer {
    const mockCreature: Creature = {
        id: 'test_creature_1',
        speciesId: 'bulbasaur',
        nickname: 'TestMon',
        level: 5,
        currentHp: 45,
        maxHp: 45,
        stats: { hp: 45, atk: 49, def: 49, spAtk: 65, spDef: 65, speed: 45 },
        moves: ['tackle', 'growl'],
        learnedMoves: ['tackle', 'growl'],
        exp: 0,
        expToNextLevel: 100,
        sprite: { front: '/test.png', back: '/test.png' },
        types: ['grass', 'poison'],
        isFainted: false,
        skillPoints: 2,
        unlockedSkillNodes: ['start']
    };

    return {
        id: 'player',
        name: 'TestTrainer',
        sprite: '/trainer.png',
        avatar: '/trainer.png',
        level: 10,
        exp: 0,
        expToNextLevel: 100,
        stats: { hp: 50, speed: 15 },
        currentHp: 50,
        maxHp: 50,
        skillPoints: 10,
        unlockedSkills: [],
        party: [mockCreature],
        pcBox: []
    };
}

describe('getExpToNextLevel', () => {
    it('increases exponentially with level', () => {
        const exp5 = getExpToNextLevel(5);
        const exp10 = getExpToNextLevel(10);
        const exp20 = getExpToNextLevel(20);

        expect(exp10).toBeGreaterThan(exp5);
        expect(exp20).toBeGreaterThan(exp10);
    });

    it('returns positive values', () => {
        for (let level = 1; level <= 100; level++) {
            expect(getExpToNextLevel(level)).toBeGreaterThan(0);
        }
    });
});

describe('addTrainerExp', () => {
    it('adds experience without level up', () => {
        const trainer = createMockTrainer();
        const initialExp = trainer.exp;

        const result = addTrainerExp(trainer, 10);

        expect(trainer.exp).toBe(initialExp + 10);
        expect(result.leveledUp).toBe(false);
        expect(result.newLevel).toBeUndefined();
    });

    it('triggers level up when exp exceeds threshold', () => {
        const trainer = createMockTrainer();
        trainer.exp = trainer.expToNextLevel - 1;
        const initialLevel = trainer.level;
        const initialSkillPoints = trainer.skillPoints;

        const result = addTrainerExp(trainer, 10);

        expect(result.leveledUp).toBe(true);
        expect(result.newLevel).toBe(initialLevel + 1);
        expect(trainer.level).toBe(initialLevel + 1);
        expect(trainer.skillPoints).toBe(initialSkillPoints + 1);
    });

    it('increases max HP on level up', () => {
        const trainer = createMockTrainer();
        trainer.exp = trainer.expToNextLevel - 1;
        const initialMaxHp = trainer.maxHp;

        addTrainerExp(trainer, 10);

        expect(trainer.maxHp).toBeGreaterThan(initialMaxHp);
    });
});

describe('canUnlockSkill', () => {
    it('returns false for non-existent skill', () => {
        const trainer = createMockTrainer();
        expect(canUnlockSkill(trainer, 'nonexistent')).toBe(false);
    });

    it('returns false when already unlocked', () => {
        const trainer = createMockTrainer();
        trainer.unlockedSkills = ['warlord_1'];

        expect(canUnlockSkill(trainer, 'warlord_1')).toBe(false);
    });

    it('returns false when not enough skill points', () => {
        const trainer = createMockTrainer();
        trainer.skillPoints = 0;

        expect(canUnlockSkill(trainer, 'warlord_1')).toBe(false);
    });

    it('returns false when prerequisites not met', () => {
        const trainer = createMockTrainer();
        trainer.skillPoints = 10;

        // warlord_2 requires warlord_1
        expect(canUnlockSkill(trainer, 'warlord_2')).toBe(false);
    });

    it('returns true when all conditions met', () => {
        const trainer = createMockTrainer();
        trainer.skillPoints = 10;

        expect(canUnlockSkill(trainer, 'warlord_1')).toBe(true);
    });

    it('returns true for tier 2 when prerequisites met', () => {
        const trainer = createMockTrainer();
        trainer.skillPoints = 10;
        trainer.unlockedSkills = ['warlord_1'];

        expect(canUnlockSkill(trainer, 'warlord_2')).toBe(true);
    });
});

describe('unlockSkill', () => {
    it('returns false and does nothing when cannot unlock', () => {
        const trainer = createMockTrainer();
        trainer.skillPoints = 0;

        const result = unlockSkill(trainer, 'warlord_1');

        expect(result).toBe(false);
        expect(trainer.unlockedSkills).not.toContain('warlord_1');
    });

    it('unlocks skill and deducts points', () => {
        const trainer = createMockTrainer();
        const initialPoints = trainer.skillPoints;
        const skill = TRAINER_SKILLS['warlord_1'];

        const result = unlockSkill(trainer, 'warlord_1');

        expect(result).toBe(true);
        expect(trainer.unlockedSkills).toContain('warlord_1');
        expect(trainer.skillPoints).toBe(initialPoints - skill.cost);
    });
});

describe('getActiveCreatures', () => {
    it('returns non-fainted creatures', () => {
        const trainer = createMockTrainer();
        trainer.party[0].isFainted = false;

        const active = getActiveCreatures(trainer);

        expect(active).toHaveLength(1);
        expect(active[0].isFainted).toBe(false);
    });

    it('filters out fainted creatures', () => {
        const trainer = createMockTrainer();
        trainer.party[0].isFainted = true;

        const active = getActiveCreatures(trainer);

        expect(active).toHaveLength(0);
    });

    it('returns at most 3 creatures', () => {
        const trainer = createMockTrainer();
        const creature = trainer.party[0];
        trainer.party = [
            { ...creature, id: '1', isFainted: false },
            { ...creature, id: '2', isFainted: false },
            { ...creature, id: '3', isFainted: false },
            { ...creature, id: '4', isFainted: false },
        ];

        const active = getActiveCreatures(trainer);

        expect(active).toHaveLength(3);
    });
});

describe('getSkill', () => {
    it('returns skill by ID', () => {
        const skill = getSkill('warlord_1');

        expect(skill).toBeDefined();
        expect(skill?.id).toBe('warlord_1');
        expect(skill?.name).toBe('Battle Cry');
    });

    it('returns undefined for invalid ID', () => {
        expect(getSkill('nonexistent')).toBeUndefined();
    });
});

describe('getTrainerActionInterval', () => {
    it('returns 5 by default', () => {
        const trainer = createMockTrainer();

        expect(getTrainerActionInterval(trainer)).toBe(5);
    });

    it('returns 4 with ranger_1 unlocked', () => {
        const trainer = createMockTrainer();
        trainer.unlockedSkills = ['ranger_1'];

        expect(getTrainerActionInterval(trainer)).toBe(4);
    });

    it('returns 3 with ranger_3 unlocked', () => {
        const trainer = createMockTrainer();
        trainer.unlockedSkills = ['ranger_1', 'ranger_2', 'ranger_3'];

        expect(getTrainerActionInterval(trainer)).toBe(3);
    });
});

describe('getPassiveStatMultiplier', () => {
    it('returns 1.0 with no skills', () => {
        const trainer = createMockTrainer();

        expect(getPassiveStatMultiplier(trainer, 'atk')).toBe(1.0);
    });

    it('increases multiplier with stat buff skills', () => {
        const trainer = createMockTrainer();
        trainer.unlockedSkills = ['warlord_1', 'warlord_2'];

        // warlord_2 is passive and gives +20% atk
        expect(getPassiveStatMultiplier(trainer, 'atk')).toBeGreaterThan(1.0);
    });
});

describe('getSkillsByBranch', () => {
    it('returns skills grouped by branch', () => {
        const branches = getSkillsByBranch();

        expect(branches).toHaveProperty('warlord');
        expect(branches).toHaveProperty('commander');
        expect(branches).toHaveProperty('ranger');
        expect(branches).toHaveProperty('elementalist');
        expect(branches).toHaveProperty('tactician');
    });

    it('skills are sorted by tier', () => {
        const branches = getSkillsByBranch();

        for (const skills of Object.values(branches)) {
            for (let i = 1; i < skills.length; i++) {
                expect(skills[i].tier).toBeGreaterThanOrEqual(skills[i - 1].tier!);
            }
        }
    });
});

describe('TRAINER_SKILLS', () => {
    it('all skills have required properties', () => {
        for (const [id, skill] of Object.entries(TRAINER_SKILLS)) {
            expect(skill.id).toBe(id);
            expect(skill.name).toBeTruthy();
            expect(skill.description).toBeTruthy();
            expect(skill.cost).toBeGreaterThan(0);
            expect(skill.branch).toBeTruthy();
            expect(skill.tier).toBeGreaterThanOrEqual(1);
            expect(skill.tier).toBeLessThanOrEqual(3);
        }
    });

    it('prerequisites reference existing skills', () => {
        for (const skill of Object.values(TRAINER_SKILLS)) {
            for (const prereq of skill.prerequisites) {
                expect(TRAINER_SKILLS[prereq]).toBeDefined();
            }
        }
    });
});
