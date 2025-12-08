// Pokemon Skill Tree - FFX Sphere Grid inspired structure
// Improved layout with collision detection and better spacing

import type { PokemonSkillNode, SkillTreeBranch } from '../types';

// ===== Constants =====
export const CENTER_X = 500;
export const CENTER_Y = 500;
export const NODE_SPACING = 70; // Increased spacing
export const MIN_NODE_DISTANCE = 45; // Minimum distance between nodes for collision detection

// ===== Stat values by tier =====
const getStatValueForTier = (tier: number): number => {
    if (tier <= 2) return 3;
    if (tier <= 5) return 5;
    if (tier <= 8) return 8;
    return 12;
};

// Bonus stat value for empty move slots
export const EMPTY_MOVE_STAT_VALUE = 10;

// ===== Branch Colors =====
export const BRANCH_COLORS: Record<SkillTreeBranch, string> = {
    hp: '#ef4444',      // Red
    atk: '#f97316',     // Orange
    def: '#eab308',     // Yellow
    spAtk: '#3b82f6',   // Blue
    spDef: '#22c55e',   // Green
    speed: '#ec4899',   // Pink
};

export const MOVE_NODE_COLOR = '#a855f7'; // Purple

// ===== Branch angles (matching the UI labels) =====
const BRANCH_ANGLES: Record<SkillTreeBranch, number> = {
    speed: -Math.PI / 2,        // Top (270°)
    spDef: -Math.PI / 6,        // Top-right (330°)
    def: Math.PI / 6,           // Right (30°)
    hp: Math.PI / 2,            // Bottom (90°)
    spAtk: Math.PI * 5 / 6,     // Bottom-left (150°)
    atk: -Math.PI * 5 / 6,      // Top-left (210°)
};

// ===== Collision Detection =====

interface NodePosition {
    x: number;
    y: number;
}

// Push overlapping nodes apart using iterative relaxation
function resolveCollisions(positions: NodePosition[], iterations: number = 15): void {
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const dx = positions[j].x - positions[i].x;
                const dy = positions[j].y - positions[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < MIN_NODE_DISTANCE && dist > 0) {
                    // Calculate push force
                    const push = (MIN_NODE_DISTANCE - dist) / 2;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Push both nodes apart
                    positions[i].x -= nx * push;
                    positions[i].y -= ny * push;
                    positions[j].x += nx * push;
                    positions[j].y += ny * push;
                }
            }
        }
    }
}

// ===== Grid-based layout generation =====

interface NodePlacement {
    x: number;
    y: number;
    branch: SkillTreeBranch;
    tier: number;
    isMoveNode: boolean;
}

// Generate nodes for a single branch zone using a structured path
function generateBranchZone(branch: SkillTreeBranch, baseAngle: number): NodePlacement[] {
    const placements: NodePlacement[] = [];

    // Create 3 parallel paths per branch with wider angular separation
    const pathOffsets = [-0.18, 0, 0.18]; // Wider angular offset

    for (let pathIdx = 0; pathIdx < 3; pathIdx++) {
        const angleOffset = pathOffsets[pathIdx];
        const pathAngle = baseAngle + angleOffset;

        // Each path has 5 nodes
        for (let nodeIdx = 0; nodeIdx < 5; nodeIdx++) {
            const radius = NODE_SPACING * 2 + nodeIdx * NODE_SPACING * 1.4;

            // Slight wobble to make it more organic
            const wobble = (Math.sin(nodeIdx * 1.7 + pathIdx) * 0.04);
            const finalAngle = pathAngle + wobble;

            const x = CENTER_X + Math.cos(finalAngle) * radius;
            const y = CENTER_Y + Math.sin(finalAngle) * radius;

            // Move nodes: one per path, at different positions
            const isMoveNode = (pathIdx === 1 && nodeIdx === 2) ||
                (pathIdx === 0 && nodeIdx === 4) ||
                (pathIdx === 2 && nodeIdx === 3);

            placements.push({
                x,
                y,
                branch,
                tier: nodeIdx + 1,
                isMoveNode
            });
        }
    }

    return placements;
}

// Generate cross-connection nodes between adjacent zones
function generateCrossConnections(): NodePlacement[] {
    const placements: NodePlacement[] = [];
    const branches: SkillTreeBranch[] = ['speed', 'spDef', 'def', 'hp', 'spAtk', 'atk'];

    for (let i = 0; i < branches.length; i++) {
        const currentBranch = branches[i];
        const nextBranch = branches[(i + 1) % branches.length];

        const currentAngle = BRANCH_ANGLES[currentBranch];
        const nextAngle = BRANCH_ANGLES[nextBranch];

        // Midpoint angle between zones
        let midAngle = (currentAngle + nextAngle) / 2;

        // Handle wraparound
        if (Math.abs(currentAngle - nextAngle) > Math.PI) {
            midAngle = midAngle + Math.PI;
        }

        // Add 2 connection nodes between zones
        for (let j = 0; j < 2; j++) {
            const radius = NODE_SPACING * 4.5 + j * NODE_SPACING * 1.8;
            placements.push({
                x: CENTER_X + Math.cos(midAngle) * radius,
                y: CENTER_Y + Math.sin(midAngle) * radius,
                branch: j % 2 === 0 ? currentBranch : nextBranch,
                tier: 3 + j,
                isMoveNode: false
            });
        }
    }

    return placements;
}

// Main tree generation function
function generateUniversalTree(): Map<string, PokemonSkillNode> {
    const tree = new Map<string, PokemonSkillNode>();

    // Add start node at center
    tree.set('start', {
        id: 'start',
        type: 'stat',
        branch: 'hp',
        tier: 0,
        stat: 'hp',
        value: 0,
        x: CENTER_X,
        y: CENTER_Y,
        connections: []
    });

    const allPlacements: NodePlacement[] = [];

    // Generate nodes for each branch zone
    const branches: SkillTreeBranch[] = ['speed', 'spDef', 'def', 'hp', 'spAtk', 'atk'];
    for (const branch of branches) {
        const angle = BRANCH_ANGLES[branch];
        allPlacements.push(...generateBranchZone(branch, angle));
    }

    // Add cross-connections
    allPlacements.push(...generateCrossConnections());

    // Apply collision detection to resolve overlaps
    const positions = allPlacements.map(p => ({ x: p.x, y: p.y }));
    resolveCollisions(positions);

    // Update placements with resolved positions
    for (let i = 0; i < allPlacements.length; i++) {
        allPlacements[i].x = positions[i].x;
        allPlacements[i].y = positions[i].y;
    }

    // Track move slot counters per branch
    const moveSlotCounters: Record<SkillTreeBranch, number> = {
        hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0
    };

    // Create nodes from placements
    allPlacements.forEach((placement, index) => {
        const nodeId = `${placement.branch}_${index}`;

        const node: PokemonSkillNode = {
            id: nodeId,
            type: placement.isMoveNode ? 'move' : 'stat',
            branch: placement.branch,
            tier: placement.tier,
            x: placement.x,
            y: placement.y,
            connections: []
        };

        if (node.type === 'stat') {
            node.stat = placement.branch;
            node.value = getStatValueForTier(placement.tier);
        } else {
            node.moveSlot = moveSlotCounters[placement.branch];
            moveSlotCounters[placement.branch]++;
        }

        tree.set(nodeId, node);
    });

    // Create connections based on proximity
    const nodes = Array.from(tree.values());
    const maxConnectionDist = NODE_SPACING * 1.8;

    // Connect each node to nearby nodes
    nodes.forEach(node => {
        if (node.id === 'start') return;

        const nearby = nodes
            .filter(other => other.id !== node.id && other.id !== 'start')
            .map(other => ({
                id: other.id,
                dist: Math.sqrt((node.x - other.x) ** 2 + (node.y - other.y) ** 2)
            }))
            .filter(n => n.dist <= maxConnectionDist)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3); // Max 3 connections per node

        nearby.forEach(({ id }) => {
            if (!node.connections.includes(id)) {
                node.connections.push(id);
            }
        });
    });

    // Connect start node to the 6 closest nodes (one per branch)
    const startNode = tree.get('start')!;
    const sortedByDistance = nodes
        .filter(n => n.id !== 'start')
        .map(n => ({
            id: n.id,
            branch: n.branch,
            dist: Math.sqrt((n.x - CENTER_X) ** 2 + (n.y - CENTER_Y) ** 2)
        }))
        .sort((a, b) => a.dist - b.dist);

    const connectedBranches = new Set<SkillTreeBranch>();
    for (const { id, branch } of sortedByDistance) {
        if (!connectedBranches.has(branch) && connectedBranches.size < 6) {
            startNode.connections.push(id);
            const connectedNode = tree.get(id);
            if (connectedNode && !connectedNode.connections.includes('start')) {
                connectedNode.connections.push('start');
            }
            connectedBranches.add(branch);
        }
    }

    // Ensure no orphan nodes
    nodes.forEach(node => {
        if (node.id !== 'start' && node.connections.length === 0) {
            const closest = nodes
                .filter(n => n.id !== node.id)
                .map(n => ({
                    id: n.id,
                    dist: Math.sqrt((node.x - n.x) ** 2 + (node.y - n.y) ** 2)
                }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 2);

            closest.forEach(({ id }) => {
                node.connections.push(id);
                const other = tree.get(id);
                if (other && !other.connections.includes(node.id)) {
                    other.connections.push(node.id);
                }
            });
        }
    });

    return tree;
}

// ===== Exported tree =====
export const UNIVERSAL_SKILL_TREE: Map<string, PokemonSkillNode> = generateUniversalTree();

// ===== Helper functions =====

export function getNode(nodeId: string): PokemonSkillNode | undefined {
    return UNIVERSAL_SKILL_TREE.get(nodeId);
}

export function getAllNodes(): PokemonSkillNode[] {
    return Array.from(UNIVERSAL_SKILL_TREE.values());
}

export function getNodesByBranch(branch: SkillTreeBranch): PokemonSkillNode[] {
    return getAllNodes().filter(n => n.branch === branch && n.id !== 'start');
}

export function getStatNodesByBranch(branch: SkillTreeBranch): PokemonSkillNode[] {
    return getNodesByBranch(branch).filter(n => n.type === 'stat');
}

export function getMoveSlotsByBranch(branch: SkillTreeBranch): PokemonSkillNode[] {
    return getNodesByBranch(branch).filter(n => n.type === 'move');
}

// Get adjacent nodes (for unlocking)
export function getAdjacentNodes(nodeId: string): string[] {
    const node = getNode(nodeId);
    if (!node) return [];

    const adjacent: string[] = [...node.connections];

    // Also check reverse connections
    for (const [id, n] of UNIVERSAL_SKILL_TREE) {
        if (n.connections.includes(nodeId) && !adjacent.includes(id)) {
            adjacent.push(id);
        }
    }

    return adjacent;
}

// Calculate total skill points available for a given level
export function calculateSkillPointsForLevel(level: number): number {
    const basePoints = level - 1;
    const bonusPoints = Math.floor(level / 10);
    return basePoints + bonusPoints;
}

// Get total possible stat from a branch if fully unlocked
export function getTotalStatFromBranch(branch: SkillTreeBranch): number {
    return getStatNodesByBranch(branch).reduce((sum, n) => sum + (n.value || 0), 0);
}
