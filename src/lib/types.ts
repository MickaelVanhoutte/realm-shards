// ===== REALM SHARDS - TYPE DEFINITIONS =====
// Trainer + Creature Battle System

// ===== Elemental Types =====
export type ElementType =
    | 'normal'
    | 'fire'
    | 'water'
    | 'grass'
    | 'electric'
    | 'ice'
    | 'fighting'
    | 'poison'
    | 'ground'
    | 'flying'
    | 'psychic'
    | 'bug'
    | 'rock'
    | 'ghost'
    | 'dragon'
    | 'dark'
    | 'steel';

// ===== Base Stats =====
export interface CreatureStats {
    hp: number;
    atk: number;      // Physical attack
    def: number;      // Physical defense
    spAtk: number;    // Special attack
    spDef: number;    // Special defense
    speed: number;
}

export interface TrainerStats {
    hp: number;
    speed: number;    // Very low (10-20), but acts first
}

// ===== Trainer (Player Character) =====
export interface Trainer {
    id: string;
    name: string;
    sprite: string;            // Battle sprite (throwing animation)
    avatar: string;            // Static avatar
    level: number;
    exp: number;
    expToNextLevel: number;
    stats: TrainerStats;
    currentHp: number;
    maxHp: number;
    skillPoints: number;
    unlockedSkills: string[];  // IDs of unlocked trainer skills

    // Creatures
    party: Creature[];         // Up to 6 carried
    pcBox: Creature[];         // Unlimited storage
}

export interface TrainerSkill {
    id: string;
    name: string;
    description: string;
    cost: number;              // Skill points to unlock
    effect: 'buff' | 'heal' | 'capture' | 'command';
    prerequisites: string[];   // Required skill IDs
    branch?: 'warlord' | 'commander' | 'ranger' | 'elementalist' | 'tactician';
    tier?: 1 | 2 | 3;
    passive?: boolean;         // true = always active, false = activated on trainer turn
    effectData?: {
        type: string;
        stat?: string;
        value?: number;
        duration?: number;
        elementType?: string;
    };
}

// ===== Creatures (Catchable Monsters) =====
export interface Creature {
    id: string;                // Unique instance ID
    speciesId: string;         // Reference to CreatureSpecies
    nickname?: string;         // Custom name
    level: number;
    exp: number;
    expToNextLevel: number;
    nature?: string;           // Affects stat growth

    // Combat stats
    stats: CreatureStats;
    currentHp: number;
    maxHp: number;
    moves: string[];           // Up to 4 move IDs

    // Display
    sprite: {
        front: string;
        back: string;
    };
    types: ElementType[];

    // Status
    isFainted: boolean;

    // Status Conditions (persists after battle, except confusion)
    statusCondition?: 'poison' | 'badly-poisoned' | 'burn' | 'paralysis' | 'sleep' | 'freeze';
    sleepTurns?: number;       // Remaining sleep turns (1-3)
    toxicCounter?: number;     // For badly-poisoned, increases each turn

    // Volatile Conditions (reset after battle)
    isConfused?: boolean;
    confusionTurns?: number;   // Remaining confusion turns (2-5)

    // Stat Modifiers (reset after battle, -6 to +6 stages)
    statModifiers?: {
        atk: number;
        def: number;
        spAtk: number;
        spDef: number;
        speed: number;
        accuracy: number;
        evasion: number;
    };
}


export interface CreatureSpecies {
    id: string;
    name: string;
    types: ElementType[];
    baseStats: CreatureStats;
    sprite: {
        front: string;
        back: string;
    };
    learnableMoves: { level: number; moveId: string }[];
    evolutionLevel?: number;
    evolvesTo?: string;
    captureRate: number;       // 0-255, higher = easier
    expYield: number;

    // New fields from Pokedex
    pokedexId: number;
    abilities: string[];
    growthRateId: number;
    height: number;
    weight: number;
    description: string;
}

// ===== Moves (Creature Abilities) =====
export type MoveCategory = 'physical' | 'special' | 'status';
export type MoveTarget =
    | 'single_enemy' | 'all_enemies' | 'self' | 'single_ally' | 'all_allies' // Legacy
    | 'selected-pokemon' | 'user' | 'all-opponents' | 'users-field' | 'entire-field'
    | 'random-opponent' | 'all-other-pokemon' | 'specific-move' | 'user-and-allies';

export interface Move {
    id: string;
    name: string;
    type: ElementType;
    category: MoveCategory;
    target: MoveTarget;
    power: number;             // 0 for status moves
    accuracy: number;          // 0-100
    pp: number;                // Power points (uses)
    description: string;
    effect?: string;           // Raw effect description text
    effectChance?: number;     // Chance of secondary effect (0-100)
    parsedEffects?: Array<{    // Parsed effect data for battle system
        type: 'stat-change' | 'status' | 'heal' | 'drain' | 'recoil' | 'flinch' | 'none';
        stat?: 'atk' | 'def' | 'spAtk' | 'spDef' | 'speed' | 'accuracy' | 'evasion';
        stages?: number;
        status?: 'poison' | 'badly-poisoned' | 'burn' | 'paralysis' | 'sleep' | 'freeze' | 'confusion' | 'flinch' | 'bound' | 'leech-seed';
        chance: number;
        target: 'self' | 'opponent';
        healPercent?: number;
        drainPercent?: number;
        recoilPercent?: number;
    }>;
}



// ===== Battle System =====

// Battle Phases - Turn-based with selection then resolution
export type BattlePhase =
    | 'start'                  // Battle begins
    | 'trainer_select'         // Player selects trainer action
    | 'creature_select'        // Player selects each creature's action
    | 'resolution'             // All actions execute in order
    | 'victory'                // All enemies defeated
    | 'defeat';                // Trainer fainted

// Trainer actions
export type TrainerActionType = 'flee' | 'item' | 'switch' | 'skill' | 'command';

export interface TrainerAction {
    type: TrainerActionType;
    itemId?: string;           // For 'item' action
    switchIndex?: number;      // For 'switch' - which party slot
    skillId?: string;          // For 'skill' action
}

// Creature actions
export interface CreatureAction {
    creatureId: string;
    moveId: string;
    targetId: string;
}

// Complete turn plan
export interface TurnPlan {
    trainerAction: TrainerAction | null;
    creatureActions: CreatureAction[];
}

// Enemy side (can be wild or trainer battle)
export interface EnemyTrainer {
    id: string;
    name: string;
    sprite: string;
    creatures: Creature[];
    dialogue?: {
        intro: string;
        win: string;
        lose: string;
    };
}

// Battle participants
export interface BattleParticipant {
    id: string;
    name: string;
    isTrainer: boolean;
    isEnemy: boolean;
    currentHp: number;
    maxHp: number;
    speed: number;
    sprite: string | { front: string; back: string; };
}

// Damage display
export interface DamageNumber {
    targetId: string;
    amount: number;
    type: 'damage' | 'heal' | 'miss' | 'critical';
    elementType?: ElementType;
}

// Main battle state
export interface BattleState {
    active: boolean;
    phase: BattlePhase;

    // Player side
    playerTrainer: Trainer;
    activeCreatures: Creature[];  // First 3 non-fainted from party

    // Enemy side (wild or trainer)
    isWildBattle: boolean;
    enemyTrainer?: EnemyTrainer;
    enemyCreatures: Creature[];

    // Turn management
    currentTurnPlan: TurnPlan | null;
    actionQueue: Array<{ participant: BattleParticipant; action: any }>;

    // UI state
    selectedCreatureIndex: number;  // Which creature we're selecting action for
    animating: boolean;
    damageNumbers: DamageNumber[];
    currentActorId?: string;
    log: string[];

    // Turn tracking
    turnNumber: number;             // Current turn count (starts at 1)
    trainerActionInterval: number;  // Trainer acts every N turns (default 5)

    // XP Tracking
    // Map<EnemyId, Set<PlayerCreatureId>> - tracks who fought whom
    participation: Record<string, string[]>;

    // Level Up Event
    levelUpEvent?: LevelUpEvent;
}

export interface LevelUpEvent {
    creatureId: string;
    oldStats: CreatureStats;
    newStats: CreatureStats;
    level: number;
}

// ===== Exploration Types =====
export type TileType = 'ground' | 'grass' | 'wall' | 'water' | 'path' | 'tree';

export interface TileInfo {
    walkable: boolean;
    sprite: string;
    color: string;
    encounter?: boolean;
}

export interface MapData {
    name: string;
    width: number;
    height: number;
    playerStart: { x: number; y: number };
    tiles: TileType[];
    encounters?: {
        species: string[];
        minLevel: number;
        maxLevel: number;
    };
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PlayerState {
    x: number;
    y: number;
    direction: Direction;
    isMoving: boolean;
}

// ===== Game State =====
export type GameScreen = 'title' | 'exploration' | 'battle' | 'menu' | 'pc_box';

export interface GameState {
    screen: GameScreen;
    currentMap: string;
    flags: Record<string, boolean>;
    isLoadedGame: boolean;
}

// ===== Items =====
export type ItemCategory = 'healing' | 'capture' | 'buff' | 'key';

export interface Item {
    id: string;
    name: string;
    category: ItemCategory;
    description: string;
    sprite: string;
    effect: {
        type: 'heal_hp' | 'heal_status' | 'capture' | 'boost';
        value?: number;
        captureBonus?: number;
    };
}

export interface Inventory {
    items: { itemId: string; quantity: number }[];
}

// ===== Save Data =====
export interface SaveData {
    id: number;
    slot: number;
    name: string;
    created: number;
    updated: number;
    playtime: number;

    trainer: Trainer;
    inventory: Inventory;

    player: {
        x: number;
        y: number;
        direction: Direction;
        currentMap: string;
    };

    flags: Record<string, boolean>;

    preview: {
        trainerLevel: number;
        creatureCount: number;
        location: string;
    };
}

// ===== Legacy compatibility (will be removed) =====
export interface PartyMember {
    id: string;
    name: string;
    class: string;
    level: number;
    stats: { hp: number; mp: number; atk: number; def: number; mag: number; spd: number };
    abilities: string[];
    sprite: { idle: string; attack?: string; hurt?: string; defeat?: string };
    color: string;
    currentHp: number;
    maxHp: number;
    currentMp: number;
    maxMp: number;
}

export interface PartyState {
    members: PartyMember[];
    gold: number;
    inventory: string[];
}

// Legacy battle types for old battleStore.ts
export interface EnemyTemplate {
    id: string;
    name: string;
    stats: { hp: number; mp?: number; atk: number; def: number; mag: number; spd: number };
    abilities: string[];
    sprite: string;
    color: string;
}

export interface Enemy extends EnemyTemplate {
    currentHp: number;
    maxHp: number;
}

export interface BattleAction {
    actorId: string;
    abilityId: string;
    targetId: string;
}

export interface LegacyBattleState {
    active: boolean;
    phase: 'start' | 'player_turn' | 'select_target' | 'execute' | 'enemy_turn' | 'victory' | 'defeat';
    enemies: Enemy[];
    turnOrder: string[];
    currentTurnIndex: number;
    selectedAction: BattleAction | null;
    animating: boolean;
    damageNumbers: DamageNumber[];
    log: string[];
}

