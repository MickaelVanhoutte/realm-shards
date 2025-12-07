// Save/Load system using localStorage
import { writable, get } from 'svelte/store';
import { partyStore } from './partyStore';
import { playerStore } from './playerStore';
import { gameState } from './gameState';
import type { PartyMember, Direction, GameScreen } from '../types';

// Save data structure
export interface SaveData {
    id: number;
    slot: number;
    name: string;
    created: number;
    updated: number;
    playtime: number; // in seconds

    // Party state
    party: {
        members: PartyMember[];
        gold: number;
        inventory: string[];
    };

    // Player position
    player: {
        x: number;
        y: number;
        direction: Direction;
        currentMap: string;
    };

    // Game progress
    flags: Record<string, boolean>;

    // Quick preview info
    preview: {
        partyLevel: number;
        location: string;
    };
}

export interface SaveSlot {
    slot: number;
    isEmpty: boolean;
    data?: SaveData;
}

const STORAGE_KEY = 'realm_shards_saves';
const MAX_SLOTS = 3;

function createSaveStore() {
    const { subscribe, set, update } = writable<SaveSlot[]>([]);

    // Load all saves from localStorage
    const loadAllSaves = (): SaveSlot[] => {
        const slots: SaveSlot[] = [];

        for (let i = 0; i < MAX_SLOTS; i++) {
            const key = `${STORAGE_KEY}_${i}`;
            const data = localStorage.getItem(key);

            if (data) {
                try {
                    const parsed = JSON.parse(data) as SaveData;
                    slots.push({
                        slot: i,
                        isEmpty: false,
                        data: parsed
                    });
                } catch (e) {
                    console.error(`Failed to parse save slot ${i}:`, e);
                    slots.push({ slot: i, isEmpty: true });
                }
            } else {
                slots.push({ slot: i, isEmpty: true });
            }
        }

        return slots;
    };

    // Initialize
    const slots = loadAllSaves();
    set(slots);

    return {
        subscribe,

        // Refresh saves from localStorage
        refresh: (): void => {
            set(loadAllSaves());
        },

        // Save current game state to a slot
        saveGame: (slot: number, saveName?: string): boolean => {
            if (slot < 0 || slot >= MAX_SLOTS) return false;

            try {
                const party = get(partyStore);
                const player = get(playerStore);
                const game = get(gameState);

                // Calculate average party level
                const avgLevel = party.members.length > 0
                    ? Math.round(party.members.reduce((sum, m) => sum + m.level, 0) / party.members.length)
                    : 1;

                // Get existing save for playtime tracking
                const existingKey = `${STORAGE_KEY}_${slot}`;
                const existing = localStorage.getItem(existingKey);
                let playtime = 0;
                let created = Date.now();

                if (existing) {
                    try {
                        const parsed = JSON.parse(existing) as SaveData;
                        playtime = parsed.playtime || 0;
                        created = parsed.created || Date.now();
                    } catch (e) {
                        // Ignore parse errors
                    }
                }

                const saveData: SaveData = {
                    id: Date.now(),
                    slot,
                    name: saveName || `Save ${slot + 1}`,
                    created,
                    updated: Date.now(),
                    playtime,

                    party: {
                        members: party.members,
                        gold: party.gold,
                        inventory: party.inventory
                    },

                    player: {
                        x: player.x,
                        y: player.y,
                        direction: player.direction,
                        currentMap: game.currentMap
                    },

                    flags: game.flags,

                    preview: {
                        partyLevel: avgLevel,
                        location: 'Starter Meadow' // TODO: Get from map data
                    }
                };

                localStorage.setItem(`${STORAGE_KEY}_${slot}`, JSON.stringify(saveData));

                // Refresh store
                set(loadAllSaves());

                return true;
            } catch (e) {
                console.error('Failed to save game:', e);
                return false;
            }
        },

        // Load a save into the game state
        loadGame: (slot: number): boolean => {
            if (slot < 0 || slot >= MAX_SLOTS) return false;

            try {
                const key = `${STORAGE_KEY}_${slot}`;
                const data = localStorage.getItem(key);

                if (!data) return false;

                const saveData = JSON.parse(data) as SaveData;

                // Restore party state
                partyStore.reset();
                // We need to manually set the party members
                const partyState = get(partyStore);
                saveData.party.members.forEach(member => {
                    partyStore.addMember(member.id);
                    // Restore HP/MP
                    partyStore.updateMember(member.id, {
                        currentHp: member.currentHp,
                        currentMp: member.currentMp,
                        level: member.level
                    });
                });

                // Restore player position and direction
                playerStore.setPosition(saveData.player.x, saveData.player.y, saveData.player.direction);

                // Restore game state
                gameState.setMap(saveData.player.currentMap);
                Object.entries(saveData.flags).forEach(([flag, value]) => {
                    gameState.setFlag(flag, value);
                });

                // Mark as loaded game and switch to exploration
                gameState.setLoadedGame(true);
                gameState.setScreen('exploration');

                return true;
            } catch (e) {
                console.error('Failed to load game:', e);
                return false;
            }
        },

        // Delete a save
        deleteSave: (slot: number): boolean => {
            if (slot < 0 || slot >= MAX_SLOTS) return false;

            try {
                localStorage.removeItem(`${STORAGE_KEY}_${slot}`);
                set(loadAllSaves());
                return true;
            } catch (e) {
                console.error('Failed to delete save:', e);
                return false;
            }
        },

        // Check if any saves exist
        hasSaves: (): boolean => {
            const slots = loadAllSaves();
            return slots.some(s => !s.isEmpty);
        },

        // Get a specific slot
        getSlot: (slot: number): SaveSlot | undefined => {
            const slots = get({ subscribe });
            return slots.find(s => s.slot === slot);
        }
    };
}

export const saveStore = createSaveStore();

// Helper to format playtime
export function formatPlaytime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

// Helper to format date
export function formatSaveDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
