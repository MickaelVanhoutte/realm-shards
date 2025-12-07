// New Battle Store - Trainer + Creature Battle System
import { writable, get } from 'svelte/store';
import type {
    BattleState,
    BattlePhase,
    Creature,
    Trainer,
    TrainerAction,
    CreatureAction,
    TurnPlan,
    DamageNumber,
    BattleParticipant,
    EnemyTrainer,
    Move
} from '../types';
import { trainerStore } from './trainerStore';
import { gameState } from './gameState';
import { getMove, getTypeEffectiveness } from '../data/moves';
import { createCreature, getSpecies } from '../data/creatures';
import { pokedex } from '../data/pokedex';
import {
    getStatStageMultiplier,
    getAccuracyStageMultiplier,
    applyStatModifier,
    canApplyMajorStatus,
    processStatusDamage,
    checkParalysis,
    checkFreezeThaw,
    checkSleepWake,
    checkConfusionEnd,
    checkConfusionSelfHit,
    getStatusName,
    DEFAULT_STAT_MODIFIERS
} from '../data/effects';

// Helper to initialize creature for battle (reset temp stats/status)
function initializeBattleCreature(creature: Creature): Creature {
    // Reset volatile status
    creature.isConfused = false;
    creature.confusionTurns = 0;
    // Reset stat modifiers
    creature.statModifiers = { ...DEFAULT_STAT_MODIFIERS };

    // Ensure fields exist
    if (!creature.sleepTurns) creature.sleepTurns = 0;
    if (!creature.toxicCounter) creature.toxicCounter = 0;

    return creature;
}


function createNewBattleStore() {
    const initialState: BattleState = {
        active: false,
        phase: 'start',

        playerTrainer: null as unknown as Trainer,
        activeCreatures: [],

        isWildBattle: true,
        enemyTrainer: undefined,
        enemyCreatures: [],

        currentTurnPlan: null,
        actionQueue: [],

        selectedCreatureIndex: 0,
        animating: false,
        damageNumbers: [],
        log: [],
        turnNumber: 1,
        trainerActionInterval: 5,
        participation: {}
    };

    const { subscribe, set, update } = writable<BattleState>(initialState);

    // Helper to add log message
    const addLog = (message: string): void => {
        update(state => {
            state.log = [...state.log.slice(-9), message];
            return state;
        });
    };

    // Helper to add damage number display
    const addDamageNumber = (targetId: string, amount: number, type: 'damage' | 'heal' | 'miss' | 'critical'): void => {
        update(state => {
            state.damageNumbers.push({ targetId, amount, type });
            return state;
        });

        // Remove after animation
        setTimeout(() => {
            update(state => {
                state.damageNumbers = state.damageNumbers.filter(d =>
                    !(d.targetId === targetId && d.amount === amount && d.type === type)
                );
                return state;
            });
        }, 1000);
    };

    // Calculate damage
    const calculateDamage = (
        attacker: Creature | Trainer,
        defender: Creature | Trainer,
        moveId: string
    ): { damage: number; effectiveness: number; isCritical: boolean } => {
        const move = getMove(moveId);
        if (!move || move.category === 'status') {
            return { damage: 0, effectiveness: 1, isCritical: false };
        }

        // Check if attacker/defender is Trainer (simplified stats)
        const attackerStats = 'stats' in attacker && 'atk' in attacker.stats
            ? attacker.stats as Creature['stats']
            : { atk: 30, spAtk: 20, speed: 15, def: 30, spDef: 20 };

        const defenderStats = 'stats' in defender && 'def' in defender.stats
            ? defender.stats as Creature['stats']
            : { def: 30, spDef: 20, atk: 30, spAtk: 20, speed: 15 };

        // Get stat modifiers if available
        const attackerMods = 'statModifiers' in attacker ? attacker.statModifiers : DEFAULT_STAT_MODIFIERS;
        const defenderMods = 'statModifiers' in defender ? defender.statModifiers : DEFAULT_STAT_MODIFIERS;

        const defenderTypes = ('types' in defender ? defender.types : ['normal']) as import('../types').ElementType[];
        const attackerTypes = ('types' in attacker ? attacker.types : ['normal']) as import('../types').ElementType[];

        // Calculate modified stats
        let atk = attackerStats.atk * getStatStageMultiplier(attackerMods?.atk || 0);
        let def = defenderStats.def * getStatStageMultiplier(defenderMods?.def || 0);
        let spAtk = attackerStats.spAtk * getStatStageMultiplier(attackerMods?.spAtk || 0);
        let spDef = defenderStats.spDef * getStatStageMultiplier(defenderMods?.spDef || 0);

        // Apply Burn effect (halves physical attack)
        if ('statusCondition' in attacker && attacker.statusCondition === 'burn' && move.category === 'physical') {
            atk = Math.floor(atk * 0.5);
        }

        // Attack and defense based on move category
        const attack = move.category === 'physical' ? atk : spAtk;
        const defense = move.category === 'physical' ? def : spDef;

        // Type effectiveness
        const effectiveness = getTypeEffectiveness(move.type, defenderTypes);

        // Critical hit (6.25% chance)
        let isCritical = false;
        let critMultiplier = 1;

        if (effectiveness > 0) {
            // Higher crit chance stages not implemented yet (default is stage 0 = 6.25%)
            isCritical = Math.random() < 0.0625;
            critMultiplier = isCritical ? 1.5 : 1;
        }

        // STAB (Same Type Attack Bonus)
        const stab = attackerTypes.includes(move.type) ? 1.5 : 1;

        // Random factor (0.85 to 1.0)
        const random = Math.random() * 0.15 + 0.85;

        // Damage formula
        const level = 'level' in attacker ? attacker.level : 5;

        // Base damage calculation part
        const baseCalc = ((2 * level / 5 + 2) * move.power * attack / defense) / 50 + 2;

        // Final damage
        const damage = Math.floor(baseCalc * effectiveness * critMultiplier * stab * random);

        return { damage: Math.max(0, damage), effectiveness, isCritical };
    };

    return {
        subscribe,
        update,

        // Start a wild battle
        startWildBattle: (wildCreatures: Creature[]): void => {
            const state = get(trainerStore);
            if (!state.trainer) return;

            // Initialize player creatures for battle
            const activeCreatures = trainerStore.getActiveCreatures().map(initializeBattleCreature);
            // Initialize wild creatures
            const initializedWild = wildCreatures.map(initializeBattleCreature);

            set({
                active: true,
                phase: 'start',
                playerTrainer: state.trainer,
                activeCreatures,
                isWildBattle: true,
                enemyTrainer: undefined,
                enemyCreatures: initializedWild,
                currentTurnPlan: null,
                actionQueue: [],
                selectedCreatureIndex: 0,
                animating: false,
                damageNumbers: [],
                log: [`Wild ${wildCreatures.map(c => c.nickname || getSpecies(c.speciesId)?.name).join(', ')} appeared!`],
                turnNumber: 1,
                trainerActionInterval: 5,  // TODO: Read from trainer skills
                participation: {}
            });

            // Transition to appropriate selection phase after delay
            setTimeout(() => {
                update(s => {
                    // Check if trainer acts this turn (turn 1 always yes for wild battles)
                    const isTrainerTurn = s.turnNumber === 1 || s.turnNumber % s.trainerActionInterval === 1;
                    return { ...s, phase: isTrainerTurn ? 'trainer_select' : 'creature_select' };
                });
            }, 1500);
        },


        // Start a trainer battle
        startTrainerBattle: (enemyTrainer: EnemyTrainer): void => {
            const state = get(trainerStore);
            if (!state.trainer) return;

            // Initialize player creatures for battle
            const activeCreatures = trainerStore.getActiveCreatures().map(initializeBattleCreature);
            // Initialize enemy creatures
            const enemyActive = enemyTrainer.creatures.filter(c => !c.isFainted).slice(0, 3).map(initializeBattleCreature);

            set({
                active: true,
                phase: 'start',
                playerTrainer: state.trainer,
                activeCreatures,
                isWildBattle: false,
                enemyTrainer,
                enemyCreatures: enemyActive,
                currentTurnPlan: null,
                actionQueue: [],
                selectedCreatureIndex: 0,
                animating: false,
                damageNumbers: [],
                log: [enemyTrainer.dialogue?.intro || `${enemyTrainer.name} wants to battle!`],
                turnNumber: 1,
                trainerActionInterval: 5,  // TODO: Read from trainer skills
                participation: {}
            });

            setTimeout(() => {
                update(s => {
                    // Check if trainer acts this turn
                    const isTrainerTurn = s.turnNumber === 1 || s.turnNumber % s.trainerActionInterval === 1;
                    return { ...s, phase: isTrainerTurn ? 'trainer_select' : 'creature_select' };
                });
            }, 1500);
        },

        // Set trainer action
        setTrainerAction: (action: TrainerAction): void => {
            update(state => {
                state.currentTurnPlan = {
                    trainerAction: action,
                    creatureActions: []
                };
                // Move to creature selection if we have active creatures
                if (state.activeCreatures.length > 0) {
                    state.phase = 'creature_select';
                    state.selectedCreatureIndex = 0;
                } else {
                    // No creatures, skip to resolution
                    state.phase = 'resolution';
                }
                return state;
            });
        },

        // Set action for current creature
        setCreatureAction: (moveId: string, targetId: string): void => {
            update(state => {
                if (!state.currentTurnPlan) return state;

                const creature = state.activeCreatures[state.selectedCreatureIndex];
                if (!creature) return state;

                state.currentTurnPlan.creatureActions.push({
                    creatureId: creature.id,
                    moveId,
                    targetId
                });

                // Move to next creature or resolution
                if (state.selectedCreatureIndex < state.activeCreatures.length - 1) {
                    state.selectedCreatureIndex++;
                } else {
                    state.phase = 'resolution';
                }

                return state;
            });
        },

        // Execute all actions in order
        executeActions: async (): Promise<void> => {
            const state = get({ subscribe });
            if (!state.currentTurnPlan) return;

            update(s => ({ ...s, animating: true }));

            // Build action queue
            const queue: Array<{ participant: BattleParticipant; action: any; priority: number }> = [];

            // Check if trainer acts this turn (turn 1, then every N turns)
            const isTrainerTurn = state.turnNumber === 1 || state.turnNumber % state.trainerActionInterval === 1;

            // 1. Player trainer (priority 1000) - only on trainer turns
            if (state.currentTurnPlan.trainerAction && isTrainerTurn) {
                queue.push({
                    participant: {
                        id: state.playerTrainer.id,
                        name: state.playerTrainer.name,
                        isTrainer: true,
                        isEnemy: false,
                        currentHp: state.playerTrainer.currentHp,
                        maxHp: state.playerTrainer.maxHp,
                        speed: state.playerTrainer.stats.speed,
                        sprite: state.playerTrainer.sprite
                    },
                    action: state.currentTurnPlan.trainerAction,
                    priority: 1000
                });
            }

            // 2. Enemy trainer (priority 999) - if trainer battle
            if (state.enemyTrainer) {
                queue.push({
                    participant: {
                        id: state.enemyTrainer.id,
                        name: state.enemyTrainer.name,
                        isTrainer: true,
                        isEnemy: true,
                        currentHp: 100, // Enemy trainers have fixed HP for now
                        maxHp: 100,
                        speed: 10,
                        sprite: state.enemyTrainer.sprite
                    },
                    action: { type: 'skip' }, // AI: for now just skip
                    priority: 999
                });
            }

            // 3. Player creatures (sorted by speed)
            state.currentTurnPlan.creatureActions.forEach(action => {
                const creature = state.activeCreatures.find(c => c.id === action.creatureId);
                if (creature && !creature.isFainted) {
                    queue.push({
                        participant: {
                            id: creature.id,
                            name: creature.nickname || getSpecies(creature.speciesId)?.name || 'Creature',
                            isTrainer: false,
                            isEnemy: false,
                            currentHp: creature.currentHp,
                            maxHp: creature.maxHp,
                            speed: creature.stats.speed,
                            sprite: creature.sprite
                        },
                        action,
                        priority: creature.stats.speed
                    });
                }
            });

            // 4. Enemy creatures (AI picks random move)
            state.enemyCreatures.forEach(enemy => {
                if (!enemy.isFainted) {
                    if (enemy.moves.length > 0) {
                        const randomMove = enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
                        // Target random player creature (trainers are not directly targetable)
                        const targets = [...state.activeCreatures.filter(c => !c.isFainted)];
                        if (targets.length === 0) {
                            console.warn('No valid targets for enemy');
                            return; // Skip if no valid targets
                        }
                        const target = targets[Math.floor(Math.random() * targets.length)];

                        queue.push({
                            participant: {
                                id: enemy.id,
                                name: enemy.nickname || getSpecies(enemy.speciesId)?.name || 'Enemy',
                                isTrainer: false,
                                isEnemy: true,
                                currentHp: enemy.currentHp,
                                maxHp: enemy.maxHp,
                                speed: enemy.stats.speed,
                                sprite: enemy.sprite
                            },
                            action: { creatureId: enemy.id, moveId: randomMove, targetId: target.id },
                            priority: enemy.stats.speed
                        });
                    } else {
                        console.warn(`Enemy ${enemy.id} has no moves!`);
                    }
                }
            });

            // Sort: trainers first (high priority), then by speed
            queue.sort((a, b) => b.priority - a.priority);

            console.log(`Executing actions. Queue length: ${queue.length}`, queue);

            // Execute each action
            for (let i = 0; i < queue.length; i++) {
                const queueItem = queue[i];
                // Check if battle is still active
                const currentState = get({ subscribe });
                if (!currentState.active) {
                    console.log('Battle ended, stopping execution');
                    break;
                }

                const { participant, action } = queueItem;
                console.log(`Processing action ${i + 1}/${queue.length} for ${participant.name} (${participant.id})`);

                // Check if participant is fainted (using fresh state)
                let isFainted = false;
                if (participant.isTrainer) {
                    if (!participant.isEnemy) {
                        if (currentState.playerTrainer.currentHp <= 0) isFainted = true;
                    }
                } else {
                    const creature = participant.isEnemy
                        ? currentState.enemyCreatures.find(c => c.id === participant.id)
                        : currentState.activeCreatures.find(c => c.id === participant.id);
                    if (!creature || creature.currentHp <= 0) isFainted = true;
                }

                if (isFainted) continue;

                if (isFainted) {
                    console.log(`${participant.name} is fainted, skipping action`);
                    continue;
                }

                // Check status conditions that prevent movement
                let canMove = true;
                let isCreature = !participant.isTrainer;

                if (isCreature) {
                    // We need to work with the actual creature object from state to update it
                    const creatureState = participant.isEnemy
                        ? currentState.enemyCreatures.find(c => c.id === participant.id)
                        : currentState.activeCreatures.find(c => c.id === participant.id);

                    if (creatureState) {
                        // Sleep
                        if (creatureState.statusCondition === 'sleep') {
                            creatureState.sleepTurns = (creatureState.sleepTurns || 0) - 1;
                            if (creatureState.sleepTurns <= 0 || checkSleepWake(creatureState.sleepTurns)) {
                                creatureState.statusCondition = undefined;
                                creatureState.sleepTurns = 0;
                                addLog(`${participant.name} woke up!`);
                            } else {
                                canMove = false;
                                addLog(`${participant.name} is fast asleep.`);
                            }
                        }

                        // Freeze
                        else if (creatureState.statusCondition === 'freeze') {
                            // Check for thaw
                            // Check if move is Fire type (simplified: we don't have move type here easily without lookup)
                            // For now just random thaw check
                            if (checkFreezeThaw()) {
                                creatureState.statusCondition = undefined;
                                addLog(`${participant.name} thawed out!`);
                            } else {
                                canMove = false;
                                addLog(`${participant.name} is frozen solid!`);
                            }
                        }

                        // Paralysis
                        else if (creatureState.statusCondition === 'paralysis') {
                            if (checkParalysis()) {
                                canMove = false;
                                addLog(`${participant.name} is paralyzed! It can't move!`);
                            }
                        }

                        // Confusion
                        if (canMove && creatureState.isConfused) {
                            creatureState.confusionTurns = (creatureState.confusionTurns || 0) - 1;
                            if (creatureState.confusionTurns <= 0 || checkConfusionEnd(creatureState.confusionTurns)) {
                                creatureState.isConfused = false;
                                creatureState.confusionTurns = 0;
                                addLog(`${participant.name} snapped out of its confusion!`);
                            } else {
                                addLog(`${participant.name} is confused!`);
                                if (checkConfusionSelfHit()) {
                                    canMove = false;
                                    addLog(`It hurt itself in its confusion!`);
                                    // Deal confusion damage (Typeless 40 power physical hit)
                                    // Simplified: 1/8 max HP or fixed calculation
                                    // Standard formula: Power 40, Attack vs Defense
                                    const damage = Math.floor(calculateDamage(creatureState, creatureState, 'tackle').damage); // Hack: use tackle as base
                                    creatureState.currentHp = Math.max(0, creatureState.currentHp - damage);
                                    addDamageNumber(creatureState.id, damage, 'damage');

                                    if (creatureState.currentHp <= 0) {
                                        creatureState.isFainted = true;
                                        addLog(`${participant.name} fainted!`);
                                    }
                                }
                            }
                        }

                        // Flinch (reset at end of turn, check here)
                        // If we implemented flinch content, checking it here:
                        if (canMove && creatureState.statusCondition === 'flinch' as any) { // Flinch is technically volatile but I put it in status enum for parsing
                            // Flinch is handled as skipping turn
                            canMove = false;
                            addLog(`${participant.name} flinched!`);
                            creatureState.statusCondition = undefined; // Flinch only lasts one turn
                        }
                    }
                }

                if (!canMove) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                    continue;
                }

                // Set current actor for UI highlight
                update(s => ({ ...s, currentActorId: participant.id }));

                try {
                    if (participant.isTrainer && !participant.isEnemy) {
                        // Player trainer action
                        await executeTrainerAction(action as TrainerAction);
                    } else if (!participant.isTrainer) {
                        // Creature action
                        console.log(`Executing creature action for ${participant.name}`);
                        await executeCreatureAction(action as CreatureAction, participant.isEnemy);
                        console.log(`Finished creature action for ${participant.name}`);
                    }
                } catch (error) {
                    console.error('Error executing action:', error);
                    addLog(`Error executing action for ${participant.name}`);
                }

                // Small delay between actions
                await new Promise(resolve => setTimeout(resolve, 800));

                // Clear current actor
                update(s => ({ ...s, currentActorId: undefined }));
            }

            // End of Turn Processing (Status Damage)
            const finalState = get({ subscribe });
            const allCreatures = [
                ...finalState.activeCreatures.filter(c => !c.isFainted),
                ...finalState.enemyCreatures.filter(c => !c.isFainted)
            ];

            for (const creature of allCreatures) {
                if (creature.statusCondition) {
                    const result = processStatusDamage(
                        creature.statusCondition as any, // Cast because 'flinch'/'sleep' etc handled safely or ignored by helper
                        creature.maxHp,
                        creature.toxicCounter
                    );

                    if (result.damage > 0) {
                        creature.currentHp = Math.max(0, creature.currentHp - result.damage);
                        addLog(`${creature.nickname || getSpecies(creature.speciesId)?.name} ${result.message}`);
                        addDamageNumber(creature.id, result.damage, 'damage');

                        // Increment toxic counter
                        if (creature.statusCondition === 'badly-poisoned') {
                            creature.toxicCounter = (creature.toxicCounter || 0) + 1;
                        }

                        if (creature.currentHp <= 0) {
                            creature.isFainted = true;
                            addLog(`${creature.nickname || getSpecies(creature.speciesId)?.name} fainted!`);
                        }

                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }

            // Increment turn counter
            update(s => ({ ...s, turnNumber: s.turnNumber + 1 }));

            // Check battle end conditions
            checkBattleEnd();

        },

        // Add damage number display
        addDamageNumber,

        // End battle
        endBattle: (victory: boolean): void => {
            // Cleanup player creatures
            const state = get({ subscribe });
            if (state.playerTrainer) {
                // We need to clean up all creatures in the party, not just active ones, 
                // in case some were switched out but had stats modified.
                // However, newBattleStore only tracks activeCreatures fully if we swapped.
                // But since we are mutating, we can iterate over state.activeCreatures (which should be the party).

                state.activeCreatures.forEach(c => {
                    c.statModifiers = { ...DEFAULT_STAT_MODIFIERS };
                    c.isConfused = false;
                    c.confusionTurns = 0;
                    c.toxicCounter = 0; // Toxic counter also resets on switch/end
                    // Status conditions persist
                });
            }

            update(state => {
                state.phase = victory ? 'victory' : 'defeat';
                state.animating = false;
                return state;
            });

            // Return to exploration after delay
            setTimeout(() => {
                set(initialState);
                if (victory) {
                    gameState.setScreen('exploration');
                } else {
                    // Defeat - return to title
                    gameState.setScreen('title');
                }
            }, 2000);
        },

        // Reset store
        reset: (): void => {
            set(initialState);
        }
    };

    // Helper functions inside closure
    async function executeTrainerAction(action: TrainerAction): Promise<void> {
        const state = get({ subscribe });

        switch (action.type) {
            case 'flee':
                // Calculate flee chance
                const fleeChance = state.isWildBattle ? 0.5 : 0;
                if (Math.random() < fleeChance) {
                    addLog('Got away safely!');
                    update(s => ({ ...s, active: false }));
                    setTimeout(() => {
                        set(initialState);
                        gameState.setScreen('exploration');
                    }, 1000);
                } else {
                    addLog("Can't escape!");
                }
                break;

            case 'item':
                if (action.itemId) {
                    addLog(`Used ${action.itemId}!`);

                    // Check if it's a capture item (Pokeball)
                    // Simplified check - assuming any item starting with 'ball' or 'capture' is a capture item
                    // In a real implementation we'd check item category
                    if (action.itemId.includes('ball') || action.itemId.includes('capture')) {
                        const target = state.enemyCreatures.find(c => !c.isFainted);
                        if (target) {
                            // Simplified capture formula
                            const captureChance = 0.5; // 50% chance for now
                            if (Math.random() < captureChance) {
                                addLog(`Gotcha! ${target.nickname || 'Creature'} was caught!`);

                                // Mark as caught in Pokedex
                                const species = getSpecies(target.speciesId);
                                if (species && species.pokedexId) {
                                    pokedex.markCaught(species.pokedexId);
                                }

                                // Add to player's party/PC
                                trainerStore.addCreature(target);

                                // End battle
                                update(s => ({ ...s, phase: 'victory', animating: false }));
                                setTimeout(() => {
                                    set(initialState);
                                    gameState.setScreen('exploration');
                                }, 2000);
                                return;
                            } else {
                                addLog(`Oh no! The Pokemon broke free!`);
                            }
                        } else {
                            addLog('There is no one to capture!');
                        }
                    } else {
                        trainerStore.useItem(action.itemId);
                        // TODO: Apply other item effects (potions, etc.)
                    }
                }
                break;

            case 'switch':
                if (action.switchIndex !== undefined) {
                    addLog('Switched creatures!');
                    // TODO: Implement switch logic
                }
                break;

            case 'skill':
                if (action.skillId) {
                    addLog(`Used ${action.skillId}!`);
                    // TODO: Apply skill effect
                }
                break;

            case 'command':
                // Trainer gives orders - no specific action effect
                break;
        }
    }

    async function executeCreatureAction(action: CreatureAction, isEnemy: boolean): Promise<void> {
        const state = get({ subscribe });
        const move = getMove(action.moveId);

        // Find attacker
        let attacker: Creature | undefined;
        if (isEnemy) {
            attacker = state.enemyCreatures.find(c => c.id === action.creatureId);
        } else {
            attacker = state.activeCreatures.find(c => c.id === action.creatureId);
        }

        if (!move) {
            console.error(`Move not found: ${action.moveId}`);
            addLog(`${attacker?.nickname || 'Enemy'} tried to use unknown move: ${action.moveId}`);
            return;
        }

        if (!attacker) return;

        const attackerName = attacker.nickname || getSpecies(attacker.speciesId)?.name || 'Creature';
        addLog(`${attackerName} used ${move.name}!`);

        // Resolve targets
        let targets: (Creature | Trainer)[] = [];

        // Handle special target IDs
        if (action.targetId === 'ALL_OPPONENTS') {
            if (isEnemy) {
                // Enemy targeting all players (creatures + trainer if applicable, but usually just creatures for moves)
                // For now, moves usually target creatures. If we want to target trainer, we need specific logic.
                // Standard moves target active creatures.
                targets = [...state.activeCreatures.filter(c => !c.isFainted)];
            } else {
                // Player targeting all enemies
                targets = [...state.enemyCreatures.filter(c => !c.isFainted)];
            }
        } else if (action.targetId === 'ALL_ALLIES') {
            if (isEnemy) {
                targets = [...state.enemyCreatures.filter(c => !c.isFainted)];
            } else {
                targets = [...state.activeCreatures.filter(c => !c.isFainted)];
            }
        } else if (action.targetId === 'ALL_FIELD') {
            targets = [
                ...state.activeCreatures.filter(c => !c.isFainted),
                ...state.enemyCreatures.filter(c => !c.isFainted)
            ];
        } else {
            // Single target
            let target: Creature | Trainer | undefined;

            // Override target for self-targeting moves
            if (move.target === 'self' || move.target === 'user') {
                target = attacker;
            } else if (isEnemy) {
                if (state.playerTrainer && action.targetId === state.playerTrainer.id) {
                    target = state.playerTrainer;
                } else {
                    target = state.activeCreatures.find(c => c.id === action.targetId);
                    // If target is fainted, try to find another valid target
                    if (target && 'isFainted' in target && target.isFainted) {
                        const newTarget = state.activeCreatures.find(c => !c.isFainted);
                        if (newTarget) target = newTarget;
                    }
                }
            } else {
                target = state.enemyCreatures.find(c => c.id === action.targetId);
                // Also check own team for self-targeting or ally targeting if we allow selecting allies directly
                if (!target) {
                    target = state.activeCreatures.find(c => c.id === action.targetId);
                }
            }
            if (target) {
                targets.push(target);
            }
        }

        if (targets.length === 0) {
            addLog('But there was no target...');
            return;
        }

        // Apply move to each target
        for (const target of targets) {
            await applyMoveToTarget(attacker, target, move);
        }
    }

    // Calculate XP gain based on formula
    function calculateExpGain(opponent: Creature, participatedCount: number, isTrainer: boolean): number {
        const species = getSpecies(opponent.speciesId);
        const b = species?.expYield || 50;
        const l = opponent.level;
        const a = isTrainer ? 1.5 : 1;
        const s = participatedCount || 1; // Avoid division by zero
        const t = 1; // Traded
        const e = 1; // Lucky Egg
        const v = 1; // Evolution
        const f = 1; // Affection
        const p = 1; // Power

        return Math.floor(((b * l) / 7) * a * (1 / s) * t * e * v * f * p);
    }

    // Handle XP gain and leveling
    function gainExp(creature: Creature, amount: number): void {
        creature.exp += amount;
        addLog(`${creature.nickname || getSpecies(creature.speciesId)?.name} gained ${amount} Exp. Points!`);

        // Check for level up
        while (creature.exp >= creature.expToNextLevel && creature.level < 100) {
            creature.level++;
            addLog(`${creature.nickname || getSpecies(creature.speciesId)?.name} grew to Lv. ${creature.level}!`);

            // Update stats
            const species = getSpecies(creature.speciesId);
            if (species) {
                const oldStats = { ...creature.stats };

                // Simplified stat growth - recalculate based on new level
                // In a real game, we'd use IVs and EVs
                const calculateStat = (base: number, level: number) => Math.floor(((2 * base * level) / 100) + 5);
                const calculateHp = (base: number, level: number) => Math.floor(((2 * base * level) / 100) + level + 10);

                const oldMaxHp = creature.maxHp;
                creature.maxHp = calculateHp(species.baseStats.hp, creature.level);
                creature.currentHp += (creature.maxHp - oldMaxHp); // Heal the difference

                creature.stats = {
                    hp: creature.maxHp,
                    atk: calculateStat(species.baseStats.atk, creature.level),
                    def: calculateStat(species.baseStats.def, creature.level),
                    spAtk: calculateStat(species.baseStats.spAtk, creature.level),
                    spDef: calculateStat(species.baseStats.spDef, creature.level),
                    speed: calculateStat(species.baseStats.speed, creature.level)
                };

                // Trigger Level Up Event
                update(s => ({
                    ...s,
                    levelUpEvent: {
                        creatureId: creature.id,
                        oldStats,
                        newStats: { ...creature.stats },
                        level: creature.level
                    }
                }));

                // Clear event after delay
                setTimeout(() => {
                    update(s => {
                        if (s.levelUpEvent?.creatureId === creature.id) {
                            return { ...s, levelUpEvent: undefined };
                        }
                        return s;
                    });
                }, 3000);
            }

            // Update next level requirement
            const speciesData = getSpecies(creature.speciesId);
            if (speciesData) {
                creature.expToNextLevel = pokedex.getExperience(speciesData.growthRateId || 4, creature.level + 1);
            }

            // Check for new moves
            if (species) {
                console.log(`[Level Up] Checking moves for ${species.name} at level ${creature.level}`);
                console.log(`[Level Up] Species learnable moves:`, species.learnableMoves);
                const newMoves = species.learnableMoves.filter(m => m.level === creature.level);
                console.log(`[Level Up] New moves at level ${creature.level}:`, newMoves);
                for (const move of newMoves) {
                    console.log(`[Level Up] Processing move:`, move.moveId, 'Already knows:', creature.moves.includes(move.moveId));
                    if (!creature.moves.includes(move.moveId)) {
                        if (creature.moves.length < 4) {
                            creature.moves.push(move.moveId);
                            const moveName = getMove(move.moveId)?.name || move.moveId;
                            addLog(`${creature.nickname || species.name} learned ${moveName}!`);
                            console.log(`[Level Up] ${species.name} learned ${moveName}!`);
                        } else {
                            // TODO: Move learning UI for replacing moves
                            const moveName = getMove(move.moveId)?.name || move.moveId;
                            addLog(`${creature.nickname || species.name} wants to learn ${moveName}, but already knows 4 moves!`);
                        }
                    }
                }
            } else {
                console.warn(`[Level Up] No species found for creature ${creature.speciesId}`);
            }
        }
    }

    // Helper to apply move effects
    async function applyMoveToTarget(attacker: Creature | Trainer, target: Creature | Trainer, move: Move): Promise<void> {
        // Track participation if attacker is player creature and target is enemy creature
        if (!('party' in attacker) && !('party' in target)) {
            // Both are creatures
            const state = get({ subscribe });
            const isPlayerAttacker = state.activeCreatures.some(c => c.id === attacker.id);
            const isEnemyTarget = state.enemyCreatures.some(c => c.id === target.id);

            if (isPlayerAttacker && isEnemyTarget) {
                update(s => {
                    const participation = { ...s.participation };
                    if (!participation[target.id]) {
                        participation[target.id] = [];
                    }
                    if (!participation[target.id].includes(attacker.id)) {
                        participation[target.id].push(attacker.id);
                    }
                    return { ...s, participation };
                });
            }
        }

        // Check accuracy
        if (move.accuracy !== undefined && Math.random() * 100 > move.accuracy) {
            let targetName = 'Creature';
            if ('nickname' in target) {
                targetName = target.nickname || getSpecies(target.speciesId)?.name || 'Creature';
            } else {
                targetName = (target as Trainer).name;
            }

            // Only log miss if it's a single target or we want verbose logs. 
            // For multi-target, maybe "Missed [Name]!"
            addLog(`Missed ${targetName}!`);
            addDamageNumber(target.id, 0, 'miss');
            return;
        }

        // Calculate and apply damage
        const { damage, effectiveness, isCritical } = calculateDamage(attacker, target, move.id);

        if (damage > 0) {
            // Apply damage
            if (damage > 0) {
                // Apply damage
                if ('speciesId' in target) {
                    // Target is creature
                    target.currentHp = Math.max(0, target.currentHp - damage);
                    addDamageNumber(target.id, damage, isCritical ? 'critical' : 'damage');

                    // Log effectiveness
                    if (effectiveness > 1) addLog('It\'s super effective!');
                    if (effectiveness < 1 && effectiveness > 0) addLog('It\'s not very effective...');
                    if (effectiveness === 0) addLog('It had no effect...');
                    if (isCritical) addLog('A critical hit!');

                    // Check faint
                    if (target.currentHp <= 0) {
                        target.isFainted = true;
                        const targetName = target.nickname || getSpecies(target.speciesId)?.name || 'Creature';
                        addLog(`${targetName} fainted!`);

                        // Award XP if enemy fainted
                        const state = get({ subscribe });
                        const isEnemy = state.enemyCreatures.some(c => c.id === target.id);
                        if (isEnemy) {
                            const participants = state.participation[target.id] || [];

                            const participatingCreatures = state.activeCreatures.filter(c => participants.includes(c.id) && !c.isFainted);

                            if (participatingCreatures.length > 0) {
                                const xpAmount = calculateExpGain(target, participatingCreatures.length, !state.isWildBattle);
                                for (const participant of participatingCreatures) {
                                    gainExp(participant, xpAmount);
                                }
                            }

                            // Also award XP to trainer (30% of creature XP)
                            const trainerXp = Math.floor(calculateExpGain(target, 1, !state.isWildBattle) * 0.3);
                            if (trainerXp > 0) {
                                const result = trainerStore.addExp(trainerXp);
                                addLog(`Trainer gained ${trainerXp} Exp. Points!`);
                                if (result.leveledUp) {
                                    addLog(`Trainer leveled up to Lv. ${result.newLevel}!`);
                                    addLog(`Trainer gained 1 Skill Point!`);
                                }
                            }
                        }
                    }

                    // Check if enemy attack should also damage the player's trainer
                    // This happens for: AOE moves (hitting whole team/field) or high-power moves (>=100)
                    const state = get({ subscribe });
                    const isEnemyAttacker = state.enemyCreatures.some(c => c.id === attacker.id);
                    const isPlayerTarget = state.activeCreatures.some(c => c.id === target.id);

                    if (isEnemyAttacker && isPlayerTarget && state.playerTrainer) {
                        // Check if move is AOE (affects entire field or all opponents)
                        const isAOE = ['all-opponents', 'entire-field', 'all-other-pokemon', 'users-field'].includes(move.target);
                        // Check if move is high-power (100+)
                        const isHighPower = move.power >= 100;

                        if (isAOE) {
                            // AOE moves deal full damage to trainer
                            addLog(`The attack also hit the trainer!`);
                            const trainerFainted = trainerStore.damageTrainer(damage);
                            addDamageNumber(state.playerTrainer.id, damage, 'damage');
                            if (trainerFainted) {
                                addLog('You blacked out!');
                            }
                        } else if (move.power >= 100) {
                            addLog('The powerful attack grazed the trainer!');
                            // Half damage to trainer
                            const fainted = trainerStore.damageTrainer(Math.floor(damage / 2));
                            addDamageNumber(state.playerTrainer.id, Math.floor(damage / 2), 'damage');
                            if (fainted) {
                                addLog('You blacked out!');
                            }
                        }
                    }
                } else {
                    // Target is trainer
                    const fainted = trainerStore.damageTrainer(damage);
                    addDamageNumber(target.id, damage, isCritical ? 'critical' : 'damage');
                    if (fainted) {
                        addLog('You blacked out!');
                    }
                }
            } else {
                // Status move or no damage (but could still have effects)
                addLog(`It had some effect!`);
            }

            // Apply Move Effects (Stats, Status, etc.)
            if (move.parsedEffects && 'speciesId' in target) { // Only affect creatures with status/stats for now
                for (const effect of move.parsedEffects) {
                    // Check chance
                    if (effect.chance < 100 && Math.random() * 100 > effect.chance) continue;

                    // Determine target for effect
                    const effectTarget = effect.target === 'self' && 'speciesId' in attacker ? attacker as Creature : target as Creature;

                    if (!('speciesId' in effectTarget)) continue; // Skip if target is trainer

                    if (effect.type === 'stat-change' && effect.stat && effect.stages) {
                        // Apply stat change
                        if (!effectTarget.statModifiers) effectTarget.statModifiers = { ...DEFAULT_STAT_MODIFIERS };
                        const { message } = applyStatModifier(effectTarget.statModifiers, effect.stat, effect.stages);

                        const targetName = effectTarget.nickname || getSpecies(effectTarget.speciesId)?.name || 'Creature';
                        const statName = effect.stat === 'spAtk' ? 'Sp. Atk' :
                            effect.stat === 'spDef' ? 'Sp. Def' :
                                effect.stat.charAt(0).toUpperCase() + effect.stat.slice(1);
                        addLog(`${targetName}'s ${statName} ${message}`);
                    }
                    else if (effect.type === 'status' && effect.status) {
                        // Apply status condition
                        if (['poison', 'badly-poisoned', 'burn', 'paralysis', 'sleep', 'freeze'].includes(effect.status)) {
                            // Major status
                            if (canApplyMajorStatus(effectTarget.statusCondition)) {
                                // Type immunities (e.g. Fire type can't be burned, Poison/Steel can't be poisoned)
                                const targetTypes = getSpecies(effectTarget.speciesId)?.types || ['normal'];
                                let immune = false;
                                if (effect.status === 'burn' && targetTypes.includes('fire')) immune = true;
                                if ((effect.status === 'poison' || effect.status === 'badly-poisoned') &&
                                    (targetTypes.includes('poison') || targetTypes.includes('steel'))) immune = true;
                                if (effect.status === 'freeze' && targetTypes.includes('ice')) immune = true;
                                if (effect.status === 'paralysis' && targetTypes.includes('electric')) immune = true; // Gen 6+

                                if (!immune) {
                                    effectTarget.statusCondition = effect.status as any;
                                    const targetName = effectTarget.nickname || getSpecies(effectTarget.speciesId)?.name || 'Creature';

                                    if (effect.status === 'sleep') {
                                        effectTarget.sleepTurns = Math.floor(Math.random() * 3) + 1; // 1-3 turns
                                        addLog(`${targetName} fell asleep!`);
                                    } else if (effect.status === 'badly-poisoned') {
                                        effectTarget.toxicCounter = 1;
                                        addLog(`${targetName} was badly poisoned!`);
                                    } else if (effect.status === 'poison') {
                                        addLog(`${targetName} was poisoned!`);
                                    } else if (effect.status === 'burn') {
                                        addLog(`${targetName} was burned!`);
                                    } else if (effect.status === 'paralysis') {
                                        addLog(`${targetName} is paralyzed! It may be unable to move!`);
                                    } else if (effect.status === 'freeze') {
                                        addLog(`${targetName} was frozen solid!`);
                                    }
                                } else {
                                    addLog(`It doesn't affect ${effectTarget.nickname || 'the target'}...`);
                                }
                            } else {
                                // Already has status
                                addLog(`But it failed!`);
                            }
                        } else if (effect.status === 'confusion') {
                            // Volatile status
                            if (!effectTarget.isConfused) {
                                effectTarget.isConfused = true;
                                effectTarget.confusionTurns = Math.floor(Math.random() * 4) + 2; // 2-5 turns
                                const targetName = effectTarget.nickname || getSpecies(effectTarget.speciesId)?.name || 'Creature';
                                addLog(`${targetName} became confused!`);
                            } else {
                                addLog(`But it failed!`);
                            }
                        } else if (effect.status === 'flinch') {
                            // Flinch handled in execution order (needs to be applied before target moves)
                            // This requires tracking flinch state for the current turn
                            // TODO: Implement flinch logic
                        }
                    }
                    else if (effect.type === 'heal' && effect.healPercent) {
                        const healAmount = Math.floor(effectTarget.maxHp * (effect.healPercent / 100));
                        effectTarget.currentHp = Math.min(effectTarget.maxHp, effectTarget.currentHp + healAmount);
                        const targetName = effectTarget.nickname || getSpecies(effectTarget.speciesId)?.name || 'Creature';
                        addDamageNumber(effectTarget.id, healAmount, 'heal');
                        addLog(`${targetName} regained health!`);
                    }
                    else if (effect.type === 'drain' && effect.drainPercent && damage > 0) {
                        // User heals from damage dealt
                        const drainAmount = Math.floor(damage * (effect.drainPercent / 100));
                        // Attacker is always user for drain moves
                        if ('speciesId' in attacker) { // Only creatures heal
                            const user = attacker as Creature;
                            user.currentHp = Math.min(user.maxHp, user.currentHp + drainAmount);
                            addDamageNumber(user.id, drainAmount, 'heal');
                            const userName = user.nickname || getSpecies(user.speciesId)?.name || 'Creature';
                            addLog(`${userName} drained energy!`);
                        }
                    }
                    else if (effect.type === 'recoil' && effect.recoilPercent && damage > 0) {
                        // User takes damage
                        const recoilAmount = Math.max(1, Math.floor(damage * (effect.recoilPercent / 100)));
                        if ('speciesId' in attacker) {
                            const user = attacker as Creature;
                            user.currentHp = Math.max(0, user.currentHp - recoilAmount);
                            addDamageNumber(user.id, recoilAmount, 'damage');
                            const userName = user.nickname || getSpecies(user.speciesId)?.name || 'Creature';
                            addLog(`${userName} is hit with recoil!`);
                            if (user.currentHp <= 0) {
                                user.isFainted = true;
                                addLog(`${userName} fainted!`);
                            }
                        }
                    }
                }
            }
        }


    }

    function checkBattleEnd(): void {
        const state = get({ subscribe });

        // Check player trainer fainted
        if (state.playerTrainer.currentHp <= 0) {
            update(s => ({ ...s, phase: 'defeat', animating: false }));
            return;
        }

        // Check all enemy creatures fainted
        const allEnemiesFainted = state.enemyCreatures.every(c => c.isFainted);
        if (allEnemiesFainted) {
            // Calculate XP rewards
            const totalExp = state.enemyCreatures.reduce((sum, c) => {
                const species = getSpecies(c.speciesId);
                return sum + (species?.expYield || 50);
            }, 0);

            addLog(`Gained ${totalExp} EXP!`);

            // Distribute XP
            state.activeCreatures.filter(c => !c.isFainted).forEach(c => {
                trainerStore.addCreatureExp(c.id, Math.floor(totalExp / state.activeCreatures.length));
            });
            trainerStore.addExp(Math.floor(totalExp / 2));

            update(s => ({ ...s, phase: 'victory', animating: false }));
            return;
        }

        // Check all player creatures fainted (but trainer alive)
        const allPlayerCreaturesFainted = state.activeCreatures.every(c => c.isFainted);
        if (allPlayerCreaturesFainted) {
            addLog('All your creatures fainted!');
            update(s => ({ ...s, phase: 'defeat', animating: false }));
            return;
        }

        // Continue battle - new turn
        update(s => ({
            ...s,
            phase: 'trainer_select',
            currentTurnPlan: null,
            selectedCreatureIndex: 0,
            animating: false
        }));
    }
}


export const newBattleStore = createNewBattleStore();
