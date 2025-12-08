// Admin Data Store - Manages Pokedex modifications for admin editing
import { writable, get } from 'svelte/store';
import { pokedex } from '../data/pokedex';

const STORAGE_KEY = 'admin_pokedex_edits';

export interface MoveEdit {
    name: string;
    level: number;
    method: number;
    treeSkill?: boolean;
    skillTreeSlot?: {
        branch: 'hp' | 'atk' | 'def' | 'spAtk' | 'spDef' | 'speed';
        slotIndex: number;
    };
}

export interface PokemonEdit {
    id: number;
    starter?: boolean;  // Flag for game starters (max 3)
    stats?: {
        hp?: number;
        attack?: number;
        defense?: number;
        specialAttack?: number;
        specialDefense?: number;
        speed?: number;
    };
    types?: string[];
    moves?: MoveEdit[];
}

export interface AdminDataState {
    edits: Map<number, PokemonEdit>;
    isDirty: boolean;
    lastSaved: number | null;
}

function createAdminDataStore() {
    const { subscribe, set, update } = writable<AdminDataState>({
        edits: new Map(),
        isDirty: false,
        lastSaved: null
    });

    // Load edits from localStorage
    const loadFromStorage = (): Map<number, PokemonEdit> => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Convert array back to Map
                const entries = parsed.edits || [];
                return new Map(entries);
            }
        } catch (e) {
            console.error('Failed to load admin edits from storage:', e);
        }
        return new Map();
    };

    // Save edits to localStorage
    const saveToStorage = () => {
        const state = get({ subscribe });
        try {
            // Convert Map to array for JSON serialization
            const editsArray = Array.from(state.edits.entries());
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                edits: editsArray,
                lastSaved: Date.now()
            }));
            update(s => ({ ...s, isDirty: false, lastSaved: Date.now() }));
        } catch (e) {
            console.error('Failed to save admin edits to storage:', e);
        }
    };

    return {
        subscribe,

        // Initialize store from localStorage
        init: () => {
            const edits = loadFromStorage();
            set({
                edits,
                isDirty: false,
                lastSaved: edits.size > 0 ? Date.now() : null
            });
        },

        // Get edit for a specific Pokemon (merged with original data)
        getEditedPokemon: (pokemonId: number): any => {
            const state = get({ subscribe });
            const original = pokedex.getPokemon(pokemonId);
            if (!original) return null;

            const edit = state.edits.get(pokemonId);
            if (!edit) return original;

            // Deep merge original with edits
            return {
                ...original,
                starter: edit.starter ?? original.starter,
                stats: { ...original.stats, ...(edit.stats || {}) },
                types: edit.types || original.types,
                moves: edit.moves !== undefined ? edit.moves : original.moves
            };
        },

        // Update a Pokemon's data
        updatePokemon: (pokemonId: number, changes: Partial<PokemonEdit>) => {
            update(state => {
                const existing = state.edits.get(pokemonId) || { id: pokemonId };
                const updated = {
                    ...existing,
                    ...changes,
                    stats: { ...(existing.stats || {}), ...(changes.stats || {}) }
                };
                state.edits.set(pokemonId, updated);
                return { ...state, isDirty: true };
            });
            // Auto-save on every change
            saveToStorage();
        },

        // Update a specific move
        updateMove: (pokemonId: number, moveName: string, moveChanges: Partial<MoveEdit>) => {
            update(state => {
                const original = pokedex.getPokemon(pokemonId);
                const existing = state.edits.get(pokemonId) || { id: pokemonId };

                // Get current moves (from edits or original)
                let moves: MoveEdit[] = existing.moves
                    ? [...existing.moves]
                    : (original?.moves?.map((m: any) => ({
                        name: m.name,
                        level: m.level,
                        method: m.method,
                        treeSkill: m.treeSkill,
                        skillTreeSlot: m.skillTreeSlot
                    })) || []);

                // Find and update the move
                const moveIndex = moves.findIndex(m => m.name === moveName);
                if (moveIndex >= 0) {
                    moves[moveIndex] = { ...moves[moveIndex], ...moveChanges };
                }

                existing.moves = moves;
                state.edits.set(pokemonId, existing);
                return { ...state, isDirty: true };
            });
            saveToStorage();
        },

        // Helper to merge edit moves with original moves
        getMergedMoves: (originalMoves: any[], editedMoves?: MoveEdit[]): any[] => {
            if (!editedMoves) return originalMoves;

            // For each edited move, merge with original to preserve full move data
            return originalMoves.map(originalMove => {
                const editedMove = editedMoves.find(em => em.name === originalMove.name);
                if (!editedMove) return originalMove;

                // Merge: keep all original fields, add/override with edited fields
                return {
                    ...originalMove,
                    level: editedMove.level ?? originalMove.level,
                    method: editedMove.method ?? originalMove.method,
                    treeSkill: editedMove.treeSkill,
                    skillTreeSlot: editedMove.skillTreeSlot
                };
            });
        },

        // Export all modifications as complete pokedex.json format
        exportAsJson: (): string => {
            const allPokemon = pokedex.getAllPokemon();
            const state = get({ subscribe });

            // Apply edits to each Pokemon
            const exportData = allPokemon.map(pokemon => {
                const edit = state.edits.get(pokemon.id);
                if (!edit) return pokemon;

                // Merge edited moves with original moves to preserve full move data
                const mergedMoves = edit.moves
                    ? pokemon.moves.map((originalMove: any) => {
                        const editedMove = edit.moves!.find(em => em.name === originalMove.name);
                        if (!editedMove) return originalMove;
                        return {
                            ...originalMove,
                            level: editedMove.level ?? originalMove.level,
                            method: editedMove.method ?? originalMove.method,
                            treeSkill: editedMove.treeSkill,
                            skillTreeSlot: editedMove.skillTreeSlot
                        };
                    })
                    : pokemon.moves;

                return {
                    ...pokemon,
                    starter: edit.starter,
                    stats: { ...pokemon.stats, ...(edit.stats || {}) },
                    types: edit.types || pokemon.types,
                    moves: mergedMoves
                };
            });

            return JSON.stringify(exportData, null, 2);
        },

        // Download as JSON file
        downloadJson: () => {
            const allPokemon = pokedex.getAllPokemon();
            const state = get({ subscribe });

            // Apply edits to each Pokemon  
            const exportData = allPokemon.map(pokemon => {
                const edit = state.edits.get(pokemon.id);
                if (!edit) return pokemon;

                // Merge edited moves with original moves to preserve full move data
                const mergedMoves = edit.moves
                    ? pokemon.moves.map((originalMove: any) => {
                        const editedMove = edit.moves!.find(em => em.name === originalMove.name);
                        if (!editedMove) return originalMove;
                        return {
                            ...originalMove,
                            level: editedMove.level ?? originalMove.level,
                            method: editedMove.method ?? originalMove.method,
                            treeSkill: editedMove.treeSkill,
                            skillTreeSlot: editedMove.skillTreeSlot
                        };
                    })
                    : pokemon.moves;

                return {
                    ...pokemon,
                    starter: edit.starter,
                    stats: { ...pokemon.stats, ...(edit.stats || {}) },
                    types: edit.types || pokemon.types,
                    moves: mergedMoves
                };
            });

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Create link and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pokedex.json';
            a.style.display = 'none';
            document.body.appendChild(a);

            // Use setTimeout to ensure the link is in the DOM
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
                edits: new Map(),
                isDirty: false,
                lastSaved: null
            });
        },

        // Get count of modified Pokemon
        getEditCount: (): number => {
            return get({ subscribe }).edits.size;
        },

        // Save manually (also auto-saves on changes)
        save: saveToStorage
    };
}

export const adminDataStore = createAdminDataStore();
