// Battle state store
import { writable, get } from 'svelte/store';
import { partyStore } from './partyStore';
import { ABILITIES } from '../data/abilities';
import type {
    LegacyBattleState,
    BattleAction,
    Enemy,
    EnemyTemplate,
    DamageNumber,
    PartyMember,
    Ability
} from '../types';

type Combatant = PartyMember | Enemy;

function createBattleStore() {
    const initialState: LegacyBattleState = {
        active: false,
        phase: 'start',
        enemies: [],
        turnOrder: [],
        currentTurnIndex: 0,
        selectedAction: null,
        animating: false,
        damageNumbers: [],
        log: []
    };

    const { subscribe, set, update } = writable<LegacyBattleState>(initialState);

    // Helper to get all combatants
    const getAllCombatants = (): Combatant[] => {
        const state = get({ subscribe });
        const party = get(partyStore);
        return [...party.members, ...state.enemies];
    };

    // Helper to find next alive actor
    const findNextAliveActor = (turnOrder: string[], startIndex: number, combatants: Combatant[]): number => {
        const len = turnOrder.length;
        for (let i = 0; i < len; i++) {
            const idx = (startIndex + i) % len;
            const actorId = turnOrder[idx];
            const actor = combatants.find(c => c.id === actorId);
            if (actor && actor.currentHp > 0) {
                return idx;
            }
        }
        return startIndex;
    };

    // Helper to add log entry
    const addLog = (message: string): void => {
        update(state => ({
            ...state,
            log: [...state.log.slice(-9), message]
        }));
    };

    // Calculate damage
    const calculateDamage = (attacker: Combatant, defender: Combatant, ability: Ability): number => {
        const baseStat = ability.type === 'magic' ? attacker.stats.mag : attacker.stats.atk;
        const defense = ability.type === 'magic' ? defender.stats.mag / 2 : defender.stats.def;
        const power = ability.power / 100;

        const rawDamage = Math.floor(baseStat * power * 2 - defense);
        const variance = 0.9 + Math.random() * 0.2;

        return Math.max(1, Math.floor(rawDamage * variance));
    };

    // Calculate healing
    const calculateHealing = (caster: Combatant, ability: Ability): number => {
        const power = ability.power / 100;
        const baseHeal = Math.floor(caster.stats.mag * power * 1.5);
        const variance = 0.9 + Math.random() * 0.2;

        return Math.max(1, Math.floor(baseHeal * variance));
    };

    return {
        subscribe,

        startBattle: (enemyTemplates: EnemyTemplate[]): void => {
            const enemies: Enemy[] = enemyTemplates.map((template, index) => ({
                ...template,
                id: `${template.id}_${index}`,
                currentHp: template.stats.hp,
                maxHp: template.stats.hp
            }));

            const party = get(partyStore);
            const allCombatants: Combatant[] = [...party.members, ...enemies];

            // Sort by speed for turn order
            const turnOrder = allCombatants
                .sort((a, b) => b.stats.spd - a.stats.spd)
                .map(c => c.id);

            // Find first alive actor
            const firstAliveIndex = findNextAliveActor(turnOrder, 0, allCombatants);

            update(state => ({
                ...state,
                active: true,
                phase: 'player_turn',
                enemies,
                turnOrder,
                currentTurnIndex: firstAliveIndex,
                selectedAction: null,
                log: ['Battle start!']
            }));
        },

        selectAction: (abilityId: string): void => {
            const ability = ABILITIES[abilityId];
            if (!ability) return;

            update(state => {
                const currentActorId = state.turnOrder[state.currentTurnIndex];

                if (ability.target === 'self') {
                    return {
                        ...state,
                        phase: 'execute',
                        selectedAction: {
                            actorId: currentActorId,
                            abilityId,
                            targetId: currentActorId
                        }
                    };
                }

                return {
                    ...state,
                    phase: 'select_target',
                    selectedAction: {
                        actorId: currentActorId,
                        abilityId,
                        targetId: ''
                    }
                };
            });
        },

        selectTarget: (targetId: string): void => {
            update(state => {
                if (!state.selectedAction) return state;

                return {
                    ...state,
                    phase: 'execute',
                    selectedAction: {
                        ...state.selectedAction,
                        targetId
                    }
                };
            });
        },

        executeAction: (): void => {
            const state = get({ subscribe });
            const action = state.selectedAction;
            if (!action) return;

            const ability = ABILITIES[action.abilityId];
            if (!ability) return;

            const party = get(partyStore);
            const allCombatants = getAllCombatants();

            const actor = allCombatants.find(c => c.id === action.actorId);
            const target = allCombatants.find(c => c.id === action.targetId);

            if (!actor || !target) return;

            // Deduct MP
            if (ability.mpCost > 0 && 'currentMp' in actor) {
                partyStore.useMp(actor.id, ability.mpCost);
            }

            update(s => ({ ...s, animating: true }));

            // Process ability
            setTimeout(() => {
                let damage = 0;
                let damageType: 'damage' | 'heal' = 'damage';

                if (ability.type === 'heal') {
                    damage = calculateHealing(actor, ability);
                    damageType = 'heal';

                    if (party.members.find(m => m.id === target.id)) {
                        partyStore.healMember(target.id, damage);
                    }

                    addLog(`${actor.name} heals ${target.name} for ${damage} HP!`);
                } else if (ability.type === 'physical' || ability.type === 'magic') {
                    damage = calculateDamage(actor, target, ability);

                    if (party.members.find(m => m.id === target.id)) {
                        partyStore.damageMember(target.id, damage);
                    } else {
                        update(s => ({
                            ...s,
                            enemies: s.enemies.map(e =>
                                e.id === target.id
                                    ? { ...e, currentHp: Math.max(0, e.currentHp - damage) }
                                    : e
                            )
                        }));
                    }

                    addLog(`${actor.name} uses ${ability.name} on ${target.name} for ${damage} damage!`);
                } else if (ability.type === 'buff') {
                    addLog(`${actor.name} uses ${ability.name}!`);
                }

                // Show damage number
                update(s => ({
                    ...s,
                    damageNumbers: [{ targetId: target.id, amount: damage, type: damageType }]
                }));

                // Clear damage numbers after animation
                setTimeout(() => {
                    update(s => ({ ...s, damageNumbers: [] }));
                }, 1000);

                // Check for victory/defeat
                setTimeout(() => {
                    const currentState = get({ subscribe });
                    const currentParty = get(partyStore);

                    const allEnemiesDead = currentState.enemies.every(e => e.currentHp <= 0);
                    const allPartyDead = currentParty.members.every(m => m.currentHp <= 0);

                    if (allEnemiesDead) {
                        update(s => ({ ...s, phase: 'victory', animating: false }));
                        return;
                    }

                    if (allPartyDead) {
                        update(s => ({ ...s, phase: 'defeat', animating: false }));
                        return;
                    }

                    // Advance to next turn
                    const allCombatantsNow: Combatant[] = [...currentParty.members, ...currentState.enemies];
                    const nextIndex = findNextAliveActor(
                        currentState.turnOrder,
                        (currentState.currentTurnIndex + 1) % currentState.turnOrder.length,
                        allCombatantsNow
                    );

                    const nextActorId = currentState.turnOrder[nextIndex];
                    const isPlayerTurn = currentParty.members.some(m => m.id === nextActorId && m.currentHp > 0);

                    update(s => ({
                        ...s,
                        currentTurnIndex: nextIndex,
                        phase: isPlayerTurn ? 'player_turn' : 'enemy_turn',
                        selectedAction: null,
                        animating: false
                    }));
                }, 500);
            }, 300);
        },

        enemyTurn: (): void => {
            const state = get({ subscribe });
            const party = get(partyStore);

            const currentActorId = state.turnOrder[state.currentTurnIndex];
            const enemy = state.enemies.find(e => e.id === currentActorId);

            if (!enemy || enemy.currentHp <= 0) {
                // Skip dead enemy
                const allCombatants: Combatant[] = [...party.members, ...state.enemies];
                const nextIndex = findNextAliveActor(
                    state.turnOrder,
                    (state.currentTurnIndex + 1) % state.turnOrder.length,
                    allCombatants
                );

                const nextActorId = state.turnOrder[nextIndex];
                const isPlayerTurn = party.members.some(m => m.id === nextActorId && m.currentHp > 0);

                update(s => ({
                    ...s,
                    currentTurnIndex: nextIndex,
                    phase: isPlayerTurn ? 'player_turn' : 'enemy_turn',
                    selectedAction: null
                }));
                return;
            }

            // Pick random ability and alive target
            const abilityId = enemy.abilities[Math.floor(Math.random() * enemy.abilities.length)];
            const aliveParty = party.members.filter(m => m.currentHp > 0);

            if (aliveParty.length === 0) {
                update(s => ({ ...s, phase: 'defeat' }));
                return;
            }

            const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];

            update(s => ({
                ...s,
                phase: 'execute',
                selectedAction: {
                    actorId: enemy.id,
                    abilityId,
                    targetId: target.id
                }
            }));
        },

        endBattle: (): void => {
            set(initialState);
        },

        getCurrentActor: (): Combatant | undefined => {
            const state = get({ subscribe });
            const party = get(partyStore);
            const currentActorId = state.turnOrder[state.currentTurnIndex];
            return [...party.members, ...state.enemies].find(c => c.id === currentActorId);
        }
    };
}

export const battleStore = createBattleStore();
