// Map definitions and tile data
import type { TileType, TileInfo, MapData } from '../types';

export const TILE_TYPES: Record<TileType, TileInfo> = {
    ground: { walkable: true, sprite: '🟫', color: '#3d2914' },
    grass: { walkable: true, sprite: '🌿', color: '#2d5016', encounter: true },
    wall: { walkable: false, sprite: '🧱', color: '#555555' },
    water: { walkable: false, sprite: '💧', color: '#1a5f7a' },
    path: { walkable: true, sprite: '⬜', color: '#8b7355' },
    tree: { walkable: false, sprite: '🌲', color: '#1a3a1a' }
};

// Simple starter map (15x10 tiles)
export const STARTER_MAP: MapData = {
    name: 'Starter Meadow',
    width: 15,
    height: 10,
    playerStart: { x: 7, y: 8 },
    tiles: [
        // Row 0
        'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree',
        // Row 1
        'tree', 'grass', 'grass', 'grass', 'ground', 'ground', 'ground', 'path', 'ground', 'ground', 'ground', 'grass', 'grass', 'grass', 'tree',
        // Row 2
        'tree', 'grass', 'grass', 'ground', 'ground', 'water', 'water', 'path', 'water', 'water', 'ground', 'ground', 'grass', 'grass', 'tree',
        // Row 3
        'tree', 'grass', 'ground', 'ground', 'ground', 'water', 'water', 'path', 'water', 'water', 'ground', 'ground', 'ground', 'grass', 'tree',
        // Row 4
        'tree', 'ground', 'ground', 'ground', 'ground', 'ground', 'path', 'path', 'path', 'ground', 'ground', 'ground', 'ground', 'ground', 'tree',
        // Row 5
        'tree', 'grass', 'grass', 'ground', 'ground', 'path', 'path', 'ground', 'path', 'path', 'ground', 'ground', 'grass', 'grass', 'tree',
        // Row 6
        'tree', 'grass', 'grass', 'grass', 'ground', 'path', 'ground', 'ground', 'ground', 'path', 'ground', 'grass', 'grass', 'grass', 'tree',
        // Row 7
        'tree', 'grass', 'grass', 'grass', 'ground', 'path', 'ground', 'ground', 'ground', 'path', 'ground', 'grass', 'grass', 'grass', 'tree',
        // Row 8
        'tree', 'ground', 'ground', 'ground', 'ground', 'path', 'path', 'path', 'path', 'path', 'ground', 'ground', 'ground', 'ground', 'tree',
        // Row 9
        'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree'
    ]
};

export const getTile = (map: MapData, x: number, y: number): TileType | null => {
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
        return null;
    }
    const index = y * map.width + x;
    return map.tiles[index];
};

export const getTileInfo = (tileType: TileType): TileInfo => {
    return TILE_TYPES[tileType] || TILE_TYPES.ground;
};
