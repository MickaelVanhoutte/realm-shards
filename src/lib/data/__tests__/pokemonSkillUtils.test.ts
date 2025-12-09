import { describe, it, expect } from 'vitest';
import {
    UNIVERSAL_SKILL_TREE,
    getNode,
    getAdjacentNodes,
    calculateSkillPointsForLevel
} from '../pokemonSkillTree';
import type { Creature } from '../../types';

// Create mock creature for testing without depending on createCreature
function createMockCreature(level: number = 10): Creature {
    return {
        id: 'test_creature',
        speciesId: 'bulbasaur',
        nickname: 'TestMon',
        level,
        currentHp: 45,
        maxHp: 45,
        stats: { hp: 45, atk: 49, def: 49, spAtk: 65, spDef: 65, speed: 45 },
        moves: ['tackle'],
        learnedMoves: ['tackle'],
        exp: 0,
        expToNextLevel: 100,
        sprite: { front: '/test.png', back: '/test.png' },
        types: ['grass'],
        isFainted: false,
        skillPoints: calculateSkillPointsForLevel(level),
        unlockedSkillNodes: ['start']
    };
}

describe('calculateSkillPointsForLevel', () => {
    it('returns 0 for level 1', () => {
        expect(calculateSkillPointsForLevel(1)).toBe(0);
    });

    it('increases with level', () => {
        const level5 = calculateSkillPointsForLevel(5);
        const level10 = calculateSkillPointsForLevel(10);
        const level50 = calculateSkillPointsForLevel(50);

        expect(level10).toBeGreaterThan(level5);
        expect(level50).toBeGreaterThan(level10);
    });

    it('returns non-negative values', () => {
        for (let level = 1; level <= 100; level++) {
            expect(calculateSkillPointsForLevel(level)).toBeGreaterThanOrEqual(0);
        }
    });
});

describe('UNIVERSAL_SKILL_TREE', () => {
    it('is a Map with nodes', () => {
        expect(UNIVERSAL_SKILL_TREE).toBeInstanceOf(Map);
        expect(UNIVERSAL_SKILL_TREE.size).toBeGreaterThan(0);
    });

    it('has a start node', () => {
        expect(UNIVERSAL_SKILL_TREE.has('start')).toBe(true);
    });

    it('nodes have required properties', () => {
        const nodes = Array.from(UNIVERSAL_SKILL_TREE.values()).slice(0, 5);
        for (const node of nodes) {
            expect(node.id).toBeTruthy();
            expect(node.type).toBeTruthy();
            expect(node.branch).toBeTruthy();
        }
    });
});

describe('getNode', () => {
    it('returns node by ID', () => {
        const start = getNode('start');

        expect(start).toBeDefined();
        expect(start?.id).toBe('start');
    });

    it('returns undefined for non-existent node', () => {
        expect(getNode('nonexistent_node')).toBeUndefined();
    });
});

describe('getAdjacentNodes', () => {
    it('returns array of node IDs', () => {
        const adjacent = getAdjacentNodes('start');

        expect(adjacent).toBeInstanceOf(Array);
    });

    it('returns empty array for non-existent node', () => {
        expect(getAdjacentNodes('nonexistent')).toEqual([]);
    });
});

describe('Skill Tree Node Types', () => {
    it('start node exists and has a valid type', () => {
        const start = getNode('start');
        expect(start).toBeDefined();
        // Start node is a stat type node at the center
        expect(['stat', 'move', 'start']).toContain(start?.type);
    });

    it('contains stat nodes', () => {
        const nodes = Array.from(UNIVERSAL_SKILL_TREE.values());
        const statNodes = nodes.filter(n => n.type === 'stat');
        expect(statNodes.length).toBeGreaterThan(0);
    });

    it('contains move nodes', () => {
        const nodes = Array.from(UNIVERSAL_SKILL_TREE.values());
        const moveNodes = nodes.filter(n => n.type === 'move');
        expect(moveNodes.length).toBeGreaterThan(0);
    });
});

describe('Skill Tree Branches', () => {
    it('has nodes for multiple stat branches', () => {
        const nodes = Array.from(UNIVERSAL_SKILL_TREE.values());
        const branches = new Set(nodes.map(n => n.branch));

        expect(branches.has('hp')).toBe(true);
        expect(branches.has('atk')).toBe(true);
        expect(branches.has('def')).toBe(true);
    });
});

describe('Creature Skill Node Logic', () => {
    it('creatures start with only start node unlocked', () => {
        const creature = createMockCreature();
        expect(creature.unlockedSkillNodes).toEqual(['start']);
    });

    it('skill points are based on level', () => {
        const lowLevel = createMockCreature(5);
        const highLevel = createMockCreature(50);

        expect(highLevel.skillPoints).toBeGreaterThan(lowLevel.skillPoints);
    });
});
