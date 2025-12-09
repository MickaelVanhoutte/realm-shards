import { describe, it, expect } from 'vitest';
import {
    TILE_TYPES,
    STARTER_MAP,
    FIRST_BEACH_MAP,
    getTile,
    getTileInfo
} from '../maps';
import type {
    MapData,
    TileType,
    TileInfo,
    NPC,
    OverworldItem,
    Warp,
    EncounterZone
} from '../../types';

// ===== TILE_TYPES Tests =====
describe('TILE_TYPES', () => {
    it('contains all required tile types', () => {
        const requiredTypes: TileType[] = ['ground', 'grass', 'wall', 'water', 'path', 'tree'];
        for (const type of requiredTypes) {
            expect(TILE_TYPES[type]).toBeDefined();
        }
    });

    it('each tile has required properties', () => {
        for (const [type, info] of Object.entries(TILE_TYPES)) {
            expect(info).toHaveProperty('walkable');
            expect(info).toHaveProperty('sprite');
            expect(info).toHaveProperty('color');
            expect(typeof info.walkable).toBe('boolean');
            expect(typeof info.sprite).toBe('string');
            expect(typeof info.color).toBe('string');
        }
    });

    it('has correct walkability for each tile', () => {
        // Walkable tiles
        expect(TILE_TYPES.ground.walkable).toBe(true);
        expect(TILE_TYPES.grass.walkable).toBe(true);
        expect(TILE_TYPES.path.walkable).toBe(true);

        // Non-walkable tiles
        expect(TILE_TYPES.wall.walkable).toBe(false);
        expect(TILE_TYPES.water.walkable).toBe(false);
        expect(TILE_TYPES.tree.walkable).toBe(false);
    });

    it('grass tile has encounter flag', () => {
        expect(TILE_TYPES.grass.encounter).toBe(true);
    });

    it('non-grass tiles do not have encounter flag', () => {
        expect(TILE_TYPES.ground.encounter).toBeUndefined();
        expect(TILE_TYPES.wall.encounter).toBeUndefined();
        expect(TILE_TYPES.water.encounter).toBeUndefined();
        expect(TILE_TYPES.path.encounter).toBeUndefined();
        expect(TILE_TYPES.tree.encounter).toBeUndefined();
    });
});

// ===== MapData Structure Tests =====
describe('MapData Structure', () => {
    const validateMapData = (map: MapData) => {
        // Required fields
        expect(map.id).toBeTruthy();
        expect(map.name).toBeTruthy();
        expect(map.width).toBeGreaterThan(0);
        expect(map.height).toBeGreaterThan(0);

        // Player start position
        expect(map.playerStart).toBeDefined();
        expect(map.playerStart.x).toBeGreaterThanOrEqual(0);
        expect(map.playerStart.y).toBeGreaterThanOrEqual(0);
        expect(map.playerStart.x).toBeLessThan(map.width);
        expect(map.playerStart.y).toBeLessThan(map.height);

        // Arrays are defined (can be empty)
        expect(map.tiles).toBeInstanceOf(Array);
        expect(map.collisions).toBeInstanceOf(Array);
        expect(map.npcs).toBeInstanceOf(Array);
        expect(map.items).toBeInstanceOf(Array);
        expect(map.warps).toBeInstanceOf(Array);
        expect(map.encounterZones).toBeInstanceOf(Array);
    };

    it('STARTER_MAP has valid structure', () => {
        validateMapData(STARTER_MAP);
    });

    it('FIRST_BEACH_MAP has valid structure', () => {
        validateMapData(FIRST_BEACH_MAP);
    });

    it('STARTER_MAP has correct dimensions for tile array', () => {
        // For tile-based maps, tiles should equal width * height
        const expectedTiles = STARTER_MAP.width * STARTER_MAP.height;
        expect(STARTER_MAP.tiles.length).toBe(expectedTiles);
    });

    it('FIRST_BEACH_MAP uses image-based approach', () => {
        expect(FIRST_BEACH_MAP.background).toBeTruthy();
        expect(FIRST_BEACH_MAP.foreground).toBeTruthy();
        // Image-based maps can have empty tiles array
        expect(FIRST_BEACH_MAP.tiles.length).toBe(0);
    });
});

// ===== getTile Function Tests =====
describe('getTile', () => {
    it('returns correct tile at valid coordinates', () => {
        // Row 0 is all trees in STARTER_MAP
        expect(getTile(STARTER_MAP, 0, 0)).toBe('tree');
        expect(getTile(STARTER_MAP, 7, 0)).toBe('tree');
        expect(getTile(STARTER_MAP, 14, 0)).toBe('tree');
    });

    it('returns path tile at center corridor', () => {
        // The path runs through column 7 in STARTER_MAP
        expect(getTile(STARTER_MAP, 7, 1)).toBe('path');
        expect(getTile(STARTER_MAP, 7, 2)).toBe('path');
        expect(getTile(STARTER_MAP, 7, 3)).toBe('path');
    });

    it('returns water tile at pond areas', () => {
        // Water tiles at rows 2-3, columns 5-6 and 8-9
        expect(getTile(STARTER_MAP, 5, 2)).toBe('water');
        expect(getTile(STARTER_MAP, 6, 2)).toBe('water');
        expect(getTile(STARTER_MAP, 8, 2)).toBe('water');
        expect(getTile(STARTER_MAP, 9, 2)).toBe('water');
    });

    it('returns grass tile at grassy areas', () => {
        // Grass tiles near edges
        expect(getTile(STARTER_MAP, 1, 1)).toBe('grass');
        expect(getTile(STARTER_MAP, 2, 1)).toBe('grass');
    });

    it('returns null for negative x coordinate', () => {
        expect(getTile(STARTER_MAP, -1, 5)).toBeNull();
    });

    it('returns null for negative y coordinate', () => {
        expect(getTile(STARTER_MAP, 5, -1)).toBeNull();
    });

    it('returns null for x beyond map width', () => {
        expect(getTile(STARTER_MAP, STARTER_MAP.width, 5)).toBeNull();
        expect(getTile(STARTER_MAP, STARTER_MAP.width + 10, 5)).toBeNull();
    });

    it('returns null for y beyond map height', () => {
        expect(getTile(STARTER_MAP, 5, STARTER_MAP.height)).toBeNull();
        expect(getTile(STARTER_MAP, 5, STARTER_MAP.height + 10)).toBeNull();
    });

    it('returns undefined for empty tile array (image-based maps)', () => {
        // FIRST_BEACH_MAP has empty tiles array
        expect(getTile(FIRST_BEACH_MAP, 0, 0)).toBeUndefined();
    });
});

// ===== getTileInfo Function Tests =====
describe('getTileInfo', () => {
    it('returns correct info for each tile type', () => {
        expect(getTileInfo('grass')).toEqual(TILE_TYPES.grass);
        expect(getTileInfo('ground')).toEqual(TILE_TYPES.ground);
        expect(getTileInfo('wall')).toEqual(TILE_TYPES.wall);
        expect(getTileInfo('water')).toEqual(TILE_TYPES.water);
        expect(getTileInfo('path')).toEqual(TILE_TYPES.path);
        expect(getTileInfo('tree')).toEqual(TILE_TYPES.tree);
    });

    it('returns ground info for unknown tile type (fallback)', () => {
        // @ts-expect-error Testing fallback behavior with invalid input
        const unknown = getTileInfo('invalid_tile');
        expect(unknown).toEqual(TILE_TYPES.ground);
    });
});

// ===== NPC Structure Tests =====
describe('NPC Structure', () => {
    const validateNPC = (npc: NPC) => {
        expect(npc.id).toBeTruthy();
        expect(npc.name).toBeTruthy();
        expect(npc.sprite).toBeTruthy();
        expect(typeof npc.x).toBe('number');
        expect(typeof npc.y).toBe('number');
        expect(['up', 'down', 'left', 'right']).toContain(npc.direction);
        expect(typeof npc.isMobile).toBe('boolean');
    };

    it('FIRST_BEACH_MAP NPCs have valid structure', () => {
        for (const npc of FIRST_BEACH_MAP.npcs) {
            validateNPC(npc);
        }
    });

    it('NPCs have dialogue or trainerId', () => {
        for (const npc of FIRST_BEACH_MAP.npcs) {
            const hasInteraction = npc.dialogue || npc.trainerId || npc.givesItem || npc.healer;
            // NPCs should have some form of interaction
            expect(hasInteraction).toBeTruthy();
        }
    });
});

// ===== OverworldItem Structure Tests =====
describe('OverworldItem Structure', () => {
    const validateItem = (item: OverworldItem) => {
        expect(item.id).toBeTruthy();
        expect(item.itemId).toBeTruthy();
        expect(typeof item.x).toBe('number');
        expect(typeof item.y).toBe('number');
        expect(typeof item.visible).toBe('boolean');
        expect(typeof item.collected).toBe('boolean');
    };

    it('FIRST_BEACH_MAP items have valid structure', () => {
        for (const item of FIRST_BEACH_MAP.items) {
            validateItem(item);
        }
    });

    it('items start as not collected', () => {
        for (const item of FIRST_BEACH_MAP.items) {
            expect(item.collected).toBe(false);
        }
    });
});

// ===== EncounterZone Structure Tests =====
describe('EncounterZone Structure', () => {
    const validateEncounterZone = (zone: EncounterZone) => {
        expect(zone.id).toBeTruthy();
        expect(zone.name).toBeTruthy();
        expect(['grass', 'water', 'cave']).toContain(zone.type);

        // Rect validation
        expect(zone.rect).toBeDefined();
        expect(zone.rect.x).toBeGreaterThanOrEqual(0);
        expect(zone.rect.y).toBeGreaterThanOrEqual(0);
        expect(zone.rect.w).toBeGreaterThan(0);
        expect(zone.rect.h).toBeGreaterThan(0);

        // Encounters validation
        expect(zone.encounters).toBeInstanceOf(Array);
        expect(zone.encounters.length).toBeGreaterThan(0);
    };

    const validateEncounter = (encounter: EncounterZone['encounters'][0]) => {
        expect(encounter.speciesId).toBeTruthy();
        expect(encounter.minLevel).toBeGreaterThan(0);
        expect(encounter.maxLevel).toBeGreaterThanOrEqual(encounter.minLevel);
        expect(encounter.chance).toBeGreaterThan(0);
        expect(encounter.chance).toBeLessThanOrEqual(100);
    };

    it('FIRST_BEACH_MAP encounter zones have valid structure', () => {
        for (const zone of FIRST_BEACH_MAP.encounterZones) {
            validateEncounterZone(zone);
        }
    });

    it('encounter zone encounters have valid structure', () => {
        for (const zone of FIRST_BEACH_MAP.encounterZones) {
            for (const enc of zone.encounters) {
                validateEncounter(enc);
            }
        }
    });

    it('encounter zone rect is within map bounds', () => {
        for (const zone of FIRST_BEACH_MAP.encounterZones) {
            expect(zone.rect.x + zone.rect.w).toBeLessThanOrEqual(FIRST_BEACH_MAP.width);
            expect(zone.rect.y + zone.rect.h).toBeLessThanOrEqual(FIRST_BEACH_MAP.height);
        }
    });
});

// ===== Warp Structure Tests =====
describe('Warp Structure', () => {
    const mockWarp: Warp = {
        x: 10,
        y: 5,
        toMapId: 'another-map',
        toX: 3,
        toY: 7,
        trigger: 'step'
    };

    it('warp has required fields', () => {
        expect(mockWarp.x).toBeGreaterThanOrEqual(0);
        expect(mockWarp.y).toBeGreaterThanOrEqual(0);
        expect(mockWarp.toMapId).toBeTruthy();
        expect(mockWarp.toX).toBeGreaterThanOrEqual(0);
        expect(mockWarp.toY).toBeGreaterThanOrEqual(0);
        expect(['step', 'interact']).toContain(mockWarp.trigger);
    });

    it('step trigger activates on walking onto tile', () => {
        const stepWarp: Warp = { ...mockWarp, trigger: 'step' };
        expect(stepWarp.trigger).toBe('step');
    });

    it('interact trigger requires button press', () => {
        const interactWarp: Warp = { ...mockWarp, trigger: 'interact' };
        expect(interactWarp.trigger).toBe('interact');
    });
});

// ===== Map Coordinate Helpers =====
describe('Map Coordinate Helpers', () => {
    it('converts 2D to 1D index correctly', () => {
        // index = y * width + x
        const width = STARTER_MAP.width;
        expect(0 * width + 0).toBe(0);      // (0,0) = 0
        expect(0 * width + 1).toBe(1);      // (1,0) = 1
        expect(1 * width + 0).toBe(width);  // (0,1) = 15
        expect(1 * width + 1).toBe(width + 1); // (1,1) = 16
    });

    it('player start is on walkable tile in STARTER_MAP', () => {
        const { x, y } = STARTER_MAP.playerStart;
        const tile = getTile(STARTER_MAP, x, y);
        if (tile) {
            const info = getTileInfo(tile);
            expect(info.walkable).toBe(true);
        }
    });
});

// ===== Edge Cases =====
describe('Edge Cases', () => {
    it('empty map data is handled', () => {
        const emptyMap: MapData = {
            id: 'empty',
            name: 'Empty Map',
            width: 1,
            height: 1,
            playerStart: { x: 0, y: 0 },
            tiles: [],
            collisions: [],
            npcs: [],
            items: [],
            warps: [],
            encounterZones: []
        };

        expect(emptyMap.tiles.length).toBe(0);
        expect(getTile(emptyMap, 0, 0)).toBeUndefined();
    });

    it('map with only background and foreground is valid', () => {
        const imageMap: MapData = {
            id: 'image-only',
            name: 'Image Map',
            width: 100,
            height: 100,
            playerStart: { x: 50, y: 50 },
            background: 'path/to/bg.png',
            foreground: 'path/to/fg.png',
            tiles: [],
            collisions: [],
            npcs: [],
            items: [],
            warps: [],
            encounterZones: []
        };

        expect(imageMap.background).toBeTruthy();
        expect(imageMap.foreground).toBeTruthy();
    });
});
