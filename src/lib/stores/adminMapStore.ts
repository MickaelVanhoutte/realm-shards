// Admin Map Store - Manages map modifications for admin editing
import { writable, get } from 'svelte/store';
import { STARTER_MAP, FIRST_BEACH_MAP } from '../data/maps';
import type { MapData, NPC, OverworldItem, Warp, EncounterZone, TileType } from '../types';

const STORAGE_KEY = 'admin_map_edits';

// Spritesheet tile reference
export interface SpriteTile {
    sheet: 'buildings' | 'nature' | 'urban';
    x: number;  // tile x position in spritesheet
    y: number;  // tile y position in spritesheet
    w?: number; // width in tiles (default 1)
    h?: number; // height in tiles (default 1)
}

// Extended map data for editor
export interface MapEdit extends Partial<MapData> {
    id: string;
    spriteTiles?: (SpriteTile | null)[][]; // 2D grid of sprite tiles
    tileSize?: number; // 16 or 32 pixels per tile
}

export interface AdminMapState {
    maps: Map<string, MapEdit>;
    isDirty: boolean;
    lastSaved: number | null;
}

// Built-in maps that can be edited
const BUILTIN_MAPS: MapData[] = [STARTER_MAP, FIRST_BEACH_MAP];

function createAdminMapStore() {
    const { subscribe, set, update } = writable<AdminMapState>({
        maps: new Map(),
        isDirty: false,
        lastSaved: null
    });

    // Load edits from localStorage
    const loadFromStorage = (): Map<string, MapEdit> => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                const entries = parsed.maps || [];
                return new Map(entries);
            }
        } catch (e) {
            console.error('Failed to load map edits from storage:', e);
        }
        return new Map();
    };

    // Save edits to localStorage
    const saveToStorage = () => {
        const state = get({ subscribe });
        try {
            const mapsArray = Array.from(state.maps.entries());
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                maps: mapsArray,
                lastSaved: Date.now()
            }));
            update(s => ({ ...s, isDirty: false, lastSaved: Date.now() }));
        } catch (e) {
            console.error('Failed to save map edits to storage:', e);
        }
    };

    return {
        subscribe,

        // Initialize store from localStorage
        init: () => {
            const maps = loadFromStorage();
            set({
                maps,
                isDirty: false,
                lastSaved: maps.size > 0 ? Date.now() : null
            });
        },

        // Get all available maps (builtins + custom)
        getAllMaps: (): MapData[] => {
            const state = get({ subscribe });
            const result: MapData[] = [];

            // Add builtins with edits applied
            for (const builtin of BUILTIN_MAPS) {
                const edit = state.maps.get(builtin.id);
                if (edit) {
                    result.push({ ...builtin, ...edit } as MapData);
                } else {
                    result.push(builtin);
                }
            }

            // Add custom maps (those not matching builtin IDs)
            for (const [id, mapEdit] of state.maps.entries()) {
                if (!BUILTIN_MAPS.find(b => b.id === id)) {
                    result.push(mapEdit as MapData);
                }
            }

            return result;
        },

        // Get a specific map with edits applied
        getEditedMap: (mapId: string): MapData | null => {
            const state = get({ subscribe });
            const builtin = BUILTIN_MAPS.find(m => m.id === mapId);
            const edit = state.maps.get(mapId);

            if (!builtin && !edit) return null;

            if (builtin && edit) {
                return { ...builtin, ...edit } as MapData;
            }

            return edit as MapData ?? builtin ?? null;
        },

        // Create a new blank map
        createMap: (name: string, width: number, height: number): string => {
            const id = `map_${Date.now()}`;
            const newMap: MapEdit = {
                id,
                name,
                width,
                height,
                playerStart: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
                tiles: Array(width * height).fill('ground') as TileType[],
                collisions: [],
                npcs: [],
                items: [],
                warps: [],
                encounterZones: [],
                spriteTiles: Array.from({ length: height }, () =>
                    Array.from({ length: width }, () => null)
                ),
                tileSize: 32
            };

            update(state => {
                state.maps.set(id, newMap);
                return { ...state, isDirty: true };
            });
            saveToStorage();
            return id;
        },

        // Update map properties
        updateMap: (mapId: string, changes: Partial<MapEdit>) => {
            update(state => {
                const existing = state.maps.get(mapId) || { id: mapId };
                state.maps.set(mapId, { ...existing, ...changes });
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        // Delete a custom map (cannot delete builtins)
        deleteMap: (mapId: string): boolean => {
            if (BUILTIN_MAPS.find(m => m.id === mapId)) {
                console.warn('Cannot delete builtin map');
                return false;
            }
            update(state => {
                state.maps.delete(mapId);
                return { ...state, isDirty: true };
            });
            saveToStorage();
            return true;
        },

        // Set a tile at position
        setTile: (mapId: string, x: number, y: number, tileType: TileType) => {
            update(state => {
                const map = state.maps.get(mapId);
                const builtin = BUILTIN_MAPS.find(m => m.id === mapId);
                const base = map || (builtin ? { id: mapId, tiles: [...builtin.tiles], width: builtin.width, height: builtin.height } : null);

                if (!base) return state;

                const tiles = base.tiles ? [...base.tiles] : [];
                const index = y * (base.width || 0) + x;
                tiles[index] = tileType;

                state.maps.set(mapId, { ...base, tiles } as MapEdit);
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        // Set sprite tile at position
        setSpriteTile: (mapId: string, x: number, y: number, spriteTile: SpriteTile | null) => {
            update(state => {
                const map = state.maps.get(mapId);
                const builtin = BUILTIN_MAPS.find(m => m.id === mapId);
                const base = map || (builtin ? { id: mapId, width: builtin.width, height: builtin.height } : null);

                if (!base || !base.width || !base.height) return state;

                // Initialize sprite tiles grid if needed
                let spriteTiles = (base as MapEdit).spriteTiles;
                if (!spriteTiles) {
                    spriteTiles = Array.from({ length: base.height }, () =>
                        Array.from({ length: base.width! }, () => null)
                    );
                } else {
                    // Deep clone
                    spriteTiles = spriteTiles.map(row => [...row]);
                }

                if (y >= 0 && y < spriteTiles.length && x >= 0 && x < spriteTiles[0].length) {
                    spriteTiles[y][x] = spriteTile;
                }

                state.maps.set(mapId, { ...base, spriteTiles } as MapEdit);
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        // Toggle collision at position
        setCollision: (mapId: string, x: number, y: number, isBlocked: boolean) => {
            update(state => {
                const map = state.maps.get(mapId);
                const builtin = BUILTIN_MAPS.find(m => m.id === mapId);
                const base = map || (builtin ? { id: mapId, collisions: [...builtin.collisions], width: builtin.width, height: builtin.height } : null);

                if (!base || !base.width || !base.height) return state;

                let collisions = base.collisions ? [...base.collisions] : Array(base.width * base.height).fill(0);
                const index = y * base.width + x;
                collisions[index] = isBlocked ? 1 : 0;

                state.maps.set(mapId, { ...base, collisions } as MapEdit);
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        // NPC management
        addNPC: (mapId: string, npc: NPC) => {
            update(state => {
                const map = state.maps.get(mapId);
                const builtin = BUILTIN_MAPS.find(m => m.id === mapId);
                const base = map || (builtin ? { id: mapId, npcs: [...builtin.npcs] } : null);

                if (!base) return state;

                const npcs = base.npcs ? [...base.npcs, npc] : [npc];
                state.maps.set(mapId, { ...base, npcs } as MapEdit);
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        updateNPC: (mapId: string, npcId: string, changes: Partial<NPC>) => {
            update(state => {
                const map = state.maps.get(mapId);
                if (!map?.npcs) return state;

                const npcs = map.npcs.map(n => n.id === npcId ? { ...n, ...changes } : n);
                state.maps.set(mapId, { ...map, npcs });
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        removeNPC: (mapId: string, npcId: string) => {
            update(state => {
                const map = state.maps.get(mapId);
                if (!map?.npcs) return state;

                const npcs = map.npcs.filter(n => n.id !== npcId);
                state.maps.set(mapId, { ...map, npcs });
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        // Item management
        addItem: (mapId: string, item: OverworldItem) => {
            update(state => {
                const map = state.maps.get(mapId);
                const builtin = BUILTIN_MAPS.find(m => m.id === mapId);
                const base = map || (builtin ? { id: mapId, items: [...builtin.items] } : null);

                if (!base) return state;

                const items = base.items ? [...base.items, item] : [item];
                state.maps.set(mapId, { ...base, items } as MapEdit);
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        updateItem: (mapId: string, itemId: string, changes: Partial<OverworldItem>) => {
            update(state => {
                const map = state.maps.get(mapId);
                if (!map?.items) return state;

                const items = map.items.map(i => i.id === itemId ? { ...i, ...changes } : i);
                state.maps.set(mapId, { ...map, items });
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        removeItem: (mapId: string, itemId: string) => {
            update(state => {
                const map = state.maps.get(mapId);
                if (!map?.items) return state;

                const items = map.items.filter(i => i.id !== itemId);
                state.maps.set(mapId, { ...map, items });
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        // Warp management
        addWarp: (mapId: string, warp: Warp) => {
            update(state => {
                const map = state.maps.get(mapId);
                const builtin = BUILTIN_MAPS.find(m => m.id === mapId);
                const base = map || (builtin ? { id: mapId, warps: [...builtin.warps] } : null);

                if (!base) return state;

                const warps = base.warps ? [...base.warps, warp] : [warp];
                state.maps.set(mapId, { ...base, warps } as MapEdit);
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        updateWarp: (mapId: string, x: number, y: number, changes: Partial<Warp>) => {
            update(state => {
                const map = state.maps.get(mapId);
                if (!map?.warps) return state;

                const warps = map.warps.map(w => (w.x === x && w.y === y) ? { ...w, ...changes } : w);
                state.maps.set(mapId, { ...map, warps });
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        removeWarp: (mapId: string, x: number, y: number) => {
            update(state => {
                const map = state.maps.get(mapId);
                if (!map?.warps) return state;

                const warps = map.warps.filter(w => !(w.x === x && w.y === y));
                state.maps.set(mapId, { ...map, warps });
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        // Encounter zone management
        addEncounterZone: (mapId: string, zone: EncounterZone) => {
            update(state => {
                const map = state.maps.get(mapId);
                const builtin = BUILTIN_MAPS.find(m => m.id === mapId);
                const base = map || (builtin ? { id: mapId, encounterZones: [...builtin.encounterZones] } : null);

                if (!base) return state;

                const encounterZones = base.encounterZones ? [...base.encounterZones, zone] : [zone];
                state.maps.set(mapId, { ...base, encounterZones } as MapEdit);
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        updateEncounterZone: (mapId: string, zoneId: string, changes: Partial<EncounterZone>) => {
            update(state => {
                const map = state.maps.get(mapId);
                if (!map?.encounterZones) return state;

                const encounterZones = map.encounterZones.map(z => z.id === zoneId ? { ...z, ...changes } : z);
                state.maps.set(mapId, { ...map, encounterZones });
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        removeEncounterZone: (mapId: string, zoneId: string) => {
            update(state => {
                const map = state.maps.get(mapId);
                if (!map?.encounterZones) return state;

                const encounterZones = map.encounterZones.filter(z => z.id !== zoneId);
                state.maps.set(mapId, { ...map, encounterZones });
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        // Export all maps as JSON
        exportAsJson: (): string => {
            const allMaps = get({ subscribe }).maps;
            const exportData: MapData[] = [];

            // Export builtins with edits
            for (const builtin of BUILTIN_MAPS) {
                const edit = allMaps.get(builtin.id);
                if (edit) {
                    exportData.push({ ...builtin, ...edit } as MapData);
                } else {
                    exportData.push(builtin);
                }
            }

            // Export custom maps
            for (const [id, mapEdit] of allMaps.entries()) {
                if (!BUILTIN_MAPS.find(b => b.id === id)) {
                    exportData.push(mapEdit as MapData);
                }
            }

            return JSON.stringify(exportData, null, 2);
        },

        // Download maps as JSON file
        downloadJson: () => {
            const jsonString = get({ subscribe }).maps.size > 0
                ? createAdminMapStore().exportAsJson()
                : '[]';
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'maps.json';
            a.style.display = 'none';
            document.body.appendChild(a);

            setTimeout(() => {
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            }, 0);
        },

        // Clear all edits
        clearEdits: () => {
            localStorage.removeItem(STORAGE_KEY);
            set({
                maps: new Map(),
                isDirty: false,
                lastSaved: null
            });
        },

        // Get count of modified maps
        getEditCount: (): number => {
            return get({ subscribe }).maps.size;
        },

        // Manual save
        save: saveToStorage
    };
}

export const adminMapStore = createAdminMapStore();
