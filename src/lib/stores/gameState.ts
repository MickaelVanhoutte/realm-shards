// Game state store
import { writable, get } from 'svelte/store';
import type { GameScreen } from '../types';

interface GameStateData {
    screen: GameScreen;
    currentMap: string;
    flags: Record<string, boolean>;
    isLoadedGame: boolean; // True when loading from a save
}

function createGameState() {
    const initialState: GameStateData = {
        screen: 'title',
        currentMap: 'first-beach',
        flags: {},
        isLoadedGame: false
    };

    const { subscribe, set, update } = writable<GameStateData>(initialState);

    return {
        subscribe,

        setScreen: (screen: GameScreen): void => {
            update(state => ({ ...state, screen }));
        },

        setMap: (mapId: string): void => {
            update(state => ({ ...state, currentMap: mapId }));
        },

        setFlag: (flag: string, value: boolean): void => {
            update(state => ({
                ...state,
                flags: { ...state.flags, [flag]: value }
            }));
        },

        getFlag: (flag: string): boolean => {
            let value = false;
            subscribe(state => { value = state.flags[flag] || false; })();
            return value;
        },

        // Mark as loaded game (prevents position reset)
        setLoadedGame: (value: boolean): void => {
            update(state => ({ ...state, isLoadedGame: value }));
        },

        reset: (): void => {
            set(initialState);
        }
    };
}

export const gameState = createGameState();
