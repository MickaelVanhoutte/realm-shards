// Player position and movement store
import { writable, get } from 'svelte/store';
import { gameState } from './gameState';
import { newBattleStore } from './newBattleStore';
import { createCreature, CREATURE_SPECIES } from '../data/creatures';
import { pokedex } from '../data/pokedex';
import type { PlayerState, Direction, MapData, TileType } from '../types';

function createPlayerStore() {
    const initialState: PlayerState = {
        x: 5,
        y: 5,
        direction: 'down',
        isMoving: false
    };

    const { subscribe, set, update } = writable<PlayerState>(initialState);

    // Movement cooldown to prevent too fast movement
    let canMove = true;
    const MOVE_COOLDOWN = 150; // ms

    // Pre-calculate available wild Pokémon (first evolution stage only)
    const getAvailableWildPokemon = () => {
        const allPokemon = pokedex.getAllPokemon();

        // Find all Pokémon that are the result of an evolution
        const evolvedIds = new Set<number>();
        allPokemon.forEach(p => {
            if (p.evolution) {
                p.evolution.forEach(evo => evolvedIds.add(evo.id));
            }
        });

        // Filter for Pokémon that:
        // 1. Are NOT in the evolvedIds set (meaning they are base stage)
        // 2. Have at least one evolution (meaning they can evolve)
        return allPokemon.filter(p =>
            !evolvedIds.has(p.id) &&
            p.evolution &&
            p.evolution.length > 0
        );
    };

    const availableWildPokemon = getAvailableWildPokemon();

    const checkRandomEncounter = (tileType: TileType): boolean => {
        if (tileType === 'grass') {
            // 15% chance of encounter in grass
            if (Math.random() < 0.15) {
                // Generate 1-2 wild creatures
                const count = Math.floor(Math.random() * 2) + 1;
                const wildCreatures: import('../types').Creature[] = [];

                for (let i = 0; i < count; i++) {
                    if (availableWildPokemon.length > 0) {
                        const randomEntry = availableWildPokemon[Math.floor(Math.random() * availableWildPokemon.length)];
                        const speciesId = randomEntry.name.toLowerCase();
                        const level = Math.floor(Math.random() * 3) + 2; // Level 2-4

                        try {
                            const creature = createCreature(speciesId, level);
                            if (creature) {
                                wildCreatures.push(creature);
                            }
                        } catch (e) {
                            console.warn(`Failed to create wild creature ${speciesId}:`, e);
                        }
                    }
                }

                if (wildCreatures.length > 0) {
                    setTimeout(() => {
                        newBattleStore.startWildBattle(wildCreatures);
                        gameState.setScreen('battle');
                    }, 200);
                    return true;
                }
            }
        }
        return false;
    };

    return {
        subscribe,

        move: (direction: Direction, mapData: MapData): boolean => {
            if (!canMove) return false;

            const state = get({ subscribe });
            let newX = state.x;
            let newY = state.y;

            // Calculate new position
            switch (direction) {
                case 'up': newY -= 1; break;
                case 'down': newY += 1; break;
                case 'left': newX -= 1; break;
                case 'right': newX += 1; break;
            }

            // Check bounds
            if (newX < 0 || newX >= mapData.width || newY < 0 || newY >= mapData.height) {
                update(s => ({ ...s, direction }));
                return false;
            }

            // Check collision
            const tileIndex = newY * mapData.width + newX;
            let tile: TileType | undefined;
            if (mapData.tiles && mapData.tiles.length > tileIndex) {
                tile = mapData.tiles[tileIndex];
            }

            // Priority: Check collision array first (new system)
            if (mapData.collisions && mapData.collisions.length > 0) {
                const collisionType = mapData.collisions[tileIndex];
                // 0 = walkable, 1 = solid, 2 = water, etc.
                if (collisionType !== 0) {
                    update(s => ({ ...s, direction }));
                    return false;
                }
            } else if (tile) {
                // Fallback: Check tile type (legacy system)
                if (tile === 'wall' || tile === 'water' || tile === 'tree') {
                    update(s => ({ ...s, direction }));
                    return false;
                }
            } else {
                // No collision data found? Allow movement but warn?
                // Defaulting to walkable.
            }

            // Check for NPC collision (simple check)
            if (mapData.npcs) {
                const npcAtPos = mapData.npcs.find(n => n.x === newX && n.y === newY);
                if (npcAtPos) {
                    update(s => ({ ...s, direction }));
                    return false;
                }
            }

            // Move player
            canMove = false;
            update(s => ({
                ...s,
                x: newX,
                y: newY,
                direction,
                isMoving: true
            }));

            // Check for Warps (Step Trigger)
            if (mapData.warps) {
                const warp = mapData.warps.find(w => w.x === newX && w.y === newY && w.trigger === 'step');
                if (warp) {
                    setTimeout(() => {
                        // Execute Warp
                        if (warp.toMapId !== mapData.id) {
                            gameState.setMap(warp.toMapId);
                        }
                        update(s => ({ ...s, x: warp.toX, y: warp.toY }));
                        // Reset movement state immediately to prevent glitching
                        canMove = true;
                    }, 200); // Small delay for "walking into" effect
                    return true;
                }
            }

            // Check for random encounter (only if no warp ?)
            if (tile) {
                checkRandomEncounter(tile);
            } else if (mapData.encounterZones && mapData.encounterZones.length > 0) {
                const zone = mapData.encounterZones.find(z =>
                    newX >= z.rect.x && newX < z.rect.x + z.rect.w &&
                    newY >= z.rect.y && newY < z.rect.y + z.rect.h
                );

                if (zone) {
                    // 15% encounter rate per step in valid zones
                    if (Math.random() < 0.15) {
                        const totalWeight = zone.encounters.reduce((sum, e) => sum + e.chance, 0);
                        let random = Math.random() * totalWeight;

                        let selectedEncounter: import('../types').EncounterZone['encounters'][0] | undefined;

                        for (const enc of zone.encounters) {
                            random -= enc.chance;
                            if (random <= 0) {
                                selectedEncounter = enc;
                                break;
                            }
                        }

                        // Fallback to last if rounding errors
                        if (!selectedEncounter && zone.encounters.length > 0) {
                            selectedEncounter = zone.encounters[zone.encounters.length - 1];
                        }

                        if (selectedEncounter) {
                            const level = Math.floor(Math.random() * (selectedEncounter.maxLevel - selectedEncounter.minLevel + 1)) + selectedEncounter.minLevel;
                            try {
                                const creature = createCreature(selectedEncounter.speciesId, level);
                                if (creature) {
                                    setTimeout(() => {
                                        newBattleStore.startWildBattle([creature]);
                                        gameState.setScreen('battle');
                                    }, 200);
                                    return true;
                                }
                            } catch (e) {
                                console.warn('Failed to spawn zone creature:', e);
                            }
                        }
                    }
                }
            }

            // Reset movement state after animation
            setTimeout(() => {
                update(s => ({ ...s, isMoving: false }));
            }, MOVE_COOLDOWN - 50);

            // Reset cooldown
            setTimeout(() => {
                canMove = true;
            }, MOVE_COOLDOWN);

            return true;
        },

        interact: (mapData: MapData): void => {
            const state = get({ subscribe });
            let targetX = state.x;
            let targetY = state.y;

            switch (state.direction) {
                case 'up': targetY -= 1; break;
                case 'down': targetY += 1; break;
                case 'left': targetX -= 1; break;
                case 'right': targetX += 1; break;
            }

            // 1. Check NPCs
            if (mapData.npcs) {
                const npc = mapData.npcs.find(n => n.x === targetX && n.y === targetY);
                if (npc) {
                    console.log('Interacting with NPC:', npc.name);
                    // TODO: Emit interaction event or open dialog
                    if (npc.dialogue) {
                        alert(npc.dialogue[0]); // Temporary
                    }
                    return;
                }
            }

            // 2. Check Items
            if (mapData.items) {
                const item = mapData.items.find(i => i.x === targetX && i.y === targetY && i.visible && !i.collected);
                if (item) {
                    console.log('Found item:', item.itemId);
                    item.collected = true; // Local update (should be persisted)
                    // TODO: Add to inventory
                    alert(`Found ${item.itemId}!`);
                    // Force re-render of items (svelte reactivity might need help if deep object)
                    // interacting with mapData directly strictly isn't reactive if mapData isn't a store
                    return;
                }
            }

            // 3. Check Interact Warps (Doors)
            if (mapData.warps) {
                const warp = mapData.warps.find(w => w.x === targetX && w.y === targetY && w.trigger === 'interact');
                if (warp) {
                    if (warp.toMapId !== mapData.id) {
                        gameState.setMap(warp.toMapId);
                    }
                    update(s => ({ ...s, x: warp.toX, y: warp.toY }));
                    return;
                }
            }
        },

        setPosition: (x: number, y: number, direction?: Direction): void => {
            update(s => ({ ...s, x, y, direction: direction || s.direction }));
        },

        reset: (): void => {
            set(initialState);
            canMove = true;
        }
    };
}

export const playerStore = createPlayerStore();
