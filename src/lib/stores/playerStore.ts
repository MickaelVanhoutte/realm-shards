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
            const tile = mapData.tiles[tileIndex];

            if (tile === 'wall' || tile === 'water' || tile === 'tree') {
                update(s => ({ ...s, direction }));
                return false;
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

            // Check for random encounter
            checkRandomEncounter(tile);

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
