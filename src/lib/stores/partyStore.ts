// Party management store
import { writable, get } from 'svelte/store';
import { CHARACTERS, type Character } from '../data/characters';
import type { PartyMember } from '../types';

interface PartyState {
    members: PartyMember[];
    gold: number;
    inventory: string[];
}

function createPartyMember(character: Character): PartyMember {
    return {
        ...character,
        currentHp: character.stats.hp,
        maxHp: character.stats.hp,
        currentMp: character.stats.mp,
        maxMp: character.stats.mp
    };
}

function createPartyStore() {
    const initialState: PartyState = {
        members: [],
        gold: 100,
        inventory: []
    };

    const { subscribe, set, update } = writable<PartyState>(initialState);

    return {
        subscribe,

        initParty: (): void => {
            const startingParty: PartyMember[] = [
                createPartyMember(CHARACTERS.valen),
                createPartyMember(CHARACTERS.lyra),
                createPartyMember(CHARACTERS.thorne)
            ];

            update(state => ({ ...state, members: startingParty }));
        },

        addMember: (characterId: string): void => {
            const character = CHARACTERS[characterId];
            if (!character) return;

            update(state => ({
                ...state,
                members: [...state.members, createPartyMember(character)]
            }));
        },

        removeMember: (characterId: string): void => {
            update(state => ({
                ...state,
                members: state.members.filter(m => m.id !== characterId)
            }));
        },

        updateMember: (characterId: string, updates: Partial<PartyMember>): void => {
            update(state => ({
                ...state,
                members: state.members.map(m =>
                    m.id === characterId ? { ...m, ...updates } : m
                )
            }));
        },

        healMember: (characterId: string, amount: number): void => {
            update(state => ({
                ...state,
                members: state.members.map(m => {
                    if (m.id !== characterId) return m;
                    const newHp = Math.min(m.currentHp + amount, m.maxHp);
                    return { ...m, currentHp: newHp };
                })
            }));
        },

        damageMember: (characterId: string, amount: number): void => {
            update(state => ({
                ...state,
                members: state.members.map(m => {
                    if (m.id !== characterId) return m;
                    const newHp = Math.max(m.currentHp - amount, 0);
                    return { ...m, currentHp: newHp };
                })
            }));
        },

        restoreMp: (characterId: string, amount: number): void => {
            update(state => ({
                ...state,
                members: state.members.map(m => {
                    if (m.id !== characterId) return m;
                    const newMp = Math.min(m.currentMp + amount, m.maxMp);
                    return { ...m, currentMp: newMp };
                })
            }));
        },

        useMp: (characterId: string, amount: number): boolean => {
            const state = get({ subscribe });
            const member = state.members.find(m => m.id === characterId);
            if (!member || member.currentMp < amount) return false;

            update(s => ({
                ...s,
                members: s.members.map(m => {
                    if (m.id !== characterId) return m;
                    return { ...m, currentMp: m.currentMp - amount };
                })
            }));
            return true;
        },

        fullRestore: (): void => {
            update(state => ({
                ...state,
                members: state.members.map(m => ({
                    ...m,
                    currentHp: m.maxHp,
                    currentMp: m.maxMp
                }))
            }));
        },

        addGold: (amount: number): void => {
            update(state => ({ ...state, gold: state.gold + amount }));
        },

        spendGold: (amount: number): boolean => {
            const state = get({ subscribe });
            if (state.gold < amount) return false;

            update(s => ({ ...s, gold: s.gold - amount }));
            return true;
        },

        reset: (): void => {
            set(initialState);
        }
    };
}

export const partyStore = createPartyStore();
