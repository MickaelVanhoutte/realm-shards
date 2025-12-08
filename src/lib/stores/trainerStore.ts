// Trainer Store - Player character state management
import { writable, get } from 'svelte/store';
import type { Trainer, Creature, Inventory } from '../types';
import { createTrainer, addTrainerExp, unlockSkill, getActiveCreatures } from '../data/trainer';
import { createCreature } from '../data/creatures';
import { createDefaultInventory } from '../data/items';

interface TrainerStoreState {
    trainer: Trainer | null;
    inventory: Inventory;
}

function createTrainerStore() {
    const initialState: TrainerStoreState = {
        trainer: null,
        inventory: { items: [] }
    };

    const { subscribe, set, update } = writable<TrainerStoreState>(initialState);

    return {
        subscribe,

        // Initialize new trainer with starter
        initTrainer: (name: string, starterSpeciesId: string): void => {
            const trainer = createTrainer(name, starterSpeciesId);
            const inventory = createDefaultInventory();
            set({ trainer, inventory });
        },

        // Get current trainer
        getTrainer: (): Trainer | null => {
            return get({ subscribe }).trainer;
        },

        // Get active creatures for battle
        getActiveCreatures: (): Creature[] => {
            const state = get({ subscribe });
            if (!state.trainer) return [];
            return getActiveCreatures(state.trainer);
        },

        // Add XP to trainer
        addExp: (exp: number): { leveledUp: boolean; newLevel: number | undefined } => {
            let result: { leveledUp: boolean; newLevel: number | undefined } = { leveledUp: false, newLevel: undefined };
            update(state => {
                if (state.trainer) {
                    result = addTrainerExp(state.trainer, exp);
                }
                return state;
            });
            return result;
        },

        // Heal trainer HP
        healTrainer: (amount: number): void => {
            update(state => {
                if (state.trainer) {
                    state.trainer.currentHp = Math.min(
                        state.trainer.currentHp + amount,
                        state.trainer.maxHp
                    );
                }
                return state;
            });
        },

        // Damage trainer
        damageTrainer: (amount: number): boolean => {
            let isFainted = false;
            update(state => {
                if (state.trainer) {
                    state.trainer.currentHp = Math.max(0, state.trainer.currentHp - amount);
                    isFainted = state.trainer.currentHp <= 0;
                }
                return state;
            });
            return isFainted;
        },

        // Add creature to party (max 6) or PC box
        addCreature: (creature: Creature): 'party' | 'box' | 'error' => {
            let result: 'party' | 'box' | 'error' = 'error';
            update(state => {
                if (!state.trainer) return state;

                if (state.trainer.party.length < 6) {
                    state.trainer.party.push(creature);
                    result = 'party';
                } else {
                    state.trainer.pcBox.push(creature);
                    result = 'box';
                }
                return state;
            });
            return result;
        },

        // Swap creature from party to box
        swapToBox: (partyIndex: number, boxIndex: number): boolean => {
            let success = false;
            update(state => {
                if (!state.trainer) return state;
                if (partyIndex < 0 || partyIndex >= state.trainer.party.length) return state;
                if (boxIndex < 0 || boxIndex >= state.trainer.pcBox.length) return state;

                const partyCreature = state.trainer.party[partyIndex];
                const boxCreature = state.trainer.pcBox[boxIndex];

                state.trainer.party[partyIndex] = boxCreature;
                state.trainer.pcBox[boxIndex] = partyCreature;
                success = true;

                return state;
            });
            return success;
        },

        // Swap positions in party (for battle order)
        reorderParty: (fromIndex: number, toIndex: number): void => {
            update(state => {
                if (!state.trainer) return state;
                const party = state.trainer.party;
                if (fromIndex < 0 || fromIndex >= party.length) return state;
                if (toIndex < 0 || toIndex >= party.length) return state;

                const [creature] = party.splice(fromIndex, 1);
                party.splice(toIndex, 0, creature);

                return state;
            });
        },

        // Unlock a trainer skill
        unlockSkill: (skillId: string): boolean => {
            let success = false;
            update(state => {
                if (state.trainer) {
                    success = unlockSkill(state.trainer, skillId);
                    if (success) {
                        // Return a new state object to trigger reactivity
                        return {
                            ...state,
                            trainer: {
                                ...state.trainer,
                                skillPoints: state.trainer.skillPoints,
                                unlockedSkills: [...state.trainer.unlockedSkills]
                            }
                        };
                    }
                }
                return state;
            });
            return success;
        },

        // Heal a creature
        healCreature: (creatureId: string, amount: number): void => {
            update(state => {
                if (!state.trainer) return state;

                // Check party
                const partyCreature = state.trainer.party.find(c => c.id === creatureId);
                if (partyCreature) {
                    partyCreature.currentHp = Math.min(
                        partyCreature.currentHp + amount,
                        partyCreature.maxHp
                    );
                    if (partyCreature.isFainted && partyCreature.currentHp > 0) {
                        partyCreature.isFainted = false;
                    }
                }

                return state;
            });
        },

        // Damage a creature
        damageCreature: (creatureId: string, amount: number): boolean => {
            let isFainted = false;
            update(state => {
                if (!state.trainer) return state;

                const creature = state.trainer.party.find(c => c.id === creatureId);
                if (creature) {
                    creature.currentHp = Math.max(0, creature.currentHp - amount);
                    if (creature.currentHp <= 0) {
                        creature.isFainted = true;
                        isFainted = true;
                    }
                }

                return state;
            });
            return isFainted;
        },

        // Add XP to creature
        addCreatureExp: (creatureId: string, exp: number): { leveledUp: boolean; newLevel?: number } => {
            let result = { leveledUp: false, newLevel: undefined as number | undefined };
            update(state => {
                if (!state.trainer) return state;

                const creature = state.trainer.party.find(c => c.id === creatureId);
                if (creature) {
                    creature.exp += exp;
                    if (creature.exp >= creature.expToNextLevel) {
                        creature.level++;
                        creature.exp -= creature.expToNextLevel;
                        creature.expToNextLevel = Math.pow(creature.level + 1, 3);
                        result = { leveledUp: true, newLevel: creature.level };
                        // TODO: Recalculate stats and check for new moves
                    }
                }

                return state;
            });
            return result;
        },

        // Inventory management
        addItem: (itemId: string, quantity: number = 1): void => {
            update(state => {
                const existing = state.inventory.items.find(i => i.itemId === itemId);
                if (existing) {
                    existing.quantity += quantity;
                } else {
                    state.inventory.items.push({ itemId, quantity });
                }
                return state;
            });
        },

        useItem: (itemId: string): boolean => {
            let success = false;
            update(state => {
                const item = state.inventory.items.find(i => i.itemId === itemId);
                if (item && item.quantity > 0) {
                    item.quantity--;
                    success = true;
                    // Remove if empty
                    if (item.quantity <= 0) {
                        state.inventory.items = state.inventory.items.filter(i => i.itemId !== itemId);
                    }
                }
                return state;
            });
            return success;
        },

        getItemCount: (itemId: string): number => {
            const state = get({ subscribe });
            const item = state.inventory.items.find(i => i.itemId === itemId);
            return item?.quantity || 0;
        },

        // Update a creature (for skill tree changes, etc.)
        updateCreature: (creature: Creature): void => {
            update(state => {
                if (!state.trainer) return state;

                // Find and update in party
                const partyIndex = state.trainer.party.findIndex(c => c.id === creature.id);
                if (partyIndex >= 0) {
                    state.trainer.party[partyIndex] = { ...creature };
                    return { ...state };
                }

                // Find and update in PC box
                const boxIndex = state.trainer.pcBox.findIndex(c => c.id === creature.id);
                if (boxIndex >= 0) {
                    state.trainer.pcBox[boxIndex] = { ...creature };
                    return { ...state };
                }

                return state;
            });
        },

        // Full heal (rest at save point)
        fullHeal: (): void => {
            update(state => {
                if (!state.trainer) return state;

                state.trainer.currentHp = state.trainer.maxHp;
                state.trainer.party.forEach(c => {
                    c.currentHp = c.maxHp;
                    c.isFainted = false;
                });

                return state;
            });
        },

        // Reset store
        reset: (): void => {
            set(initialState);
        },

        // Load from save data
        loadFromSave: (trainer: Trainer, inventory: Inventory): void => {
            set({ trainer, inventory });
        }
    };
}

export const trainerStore = createTrainerStore();
