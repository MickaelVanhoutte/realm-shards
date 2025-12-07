<script lang="ts">
    import { battleStore } from "../../lib/stores/battleStore";
    import type { Enemy, DamageNumber, BattlePhase } from "../../lib/types";

    export let enemies: Enemy[] = [];
    export let selectedTarget: string | null = null;
    export let phase: BattlePhase = "player_turn";
    export let damageNumbers: DamageNumber[] = [];

    function selectEnemy(enemyId: string): void {
        if (phase === "select_target") {
            battleStore.selectTarget(enemyId);
        }
    }
</script>

<div class="enemy-display">
    {#each enemies as enemy, index}
        {@const isDead = enemy.currentHp <= 0}
        {@const hpPercent = (enemy.currentHp / enemy.maxHp) * 100}
        {@const isSelected = selectedTarget === enemy.id}
        {@const isTargetable = phase === "select_target" && !isDead}
        {@const enemyDamage = damageNumbers.find(
            (d) => d.targetId === enemy.id,
        )}

        <button
            class="enemy-slot"
            class:dead={isDead}
            class:selected={isSelected}
            class:targetable={isTargetable}
            disabled={!isTargetable}
            on:click={() => selectEnemy(enemy.id)}
        >
            <div class="enemy-sprite" style="--enemy-color: {enemy.color}">
                <span class="sprite" class:hurt={enemyDamage}>
                    {enemy.sprite}
                </span>
                {#if enemyDamage}
                    <span class="damage-number">-{enemyDamage.amount}</span>
                {/if}
            </div>

            <div class="enemy-info">
                <span class="enemy-name">{enemy.name}</span>
                <div class="hp-bar">
                    <div class="hp-fill" style="width: {hpPercent}%"></div>
                </div>
            </div>

            {#if isTargetable}
                <div class="target-cursor">▼</div>
            {/if}
        </button>
    {/each}
</div>

<style>
    .enemy-display {
        display: flex;
        gap: var(--space-md);
        justify-content: center;
        align-items: flex-end;
        flex-wrap: wrap;
    }

    .enemy-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-xs);
        background: transparent;
        border: none;
        cursor: default;
        padding: var(--space-sm);
        transition: all 0.2s;
        position: relative;
        min-width: var(--touch-min);
        min-height: var(--touch-min);
    }

    .enemy-slot.targetable {
        cursor: pointer;
    }

    .enemy-slot.targetable:hover,
    .enemy-slot.targetable:active {
        transform: scale(1.1);
    }

    .enemy-slot.targetable:hover .enemy-sprite,
    .enemy-slot.targetable:active .enemy-sprite {
        filter: brightness(1.3);
        box-shadow: 0 0 20px var(--enemy-color);
    }

    .enemy-slot.dead {
        opacity: 0.3;
        filter: grayscale(1);
        transform: rotate(90deg) translateY(20px);
    }

    .enemy-slot.selected .enemy-sprite {
        box-shadow: 0 0 20px var(--primary);
    }

    .enemy-sprite {
        width: clamp(50px, 15vw, 80px);
        height: clamp(50px, 15vw, 80px);
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: clamp(28px, 10vw, 48px);
        background: rgba(0, 0, 0, 0.4);
        border: 2px solid var(--enemy-color);
        border-radius: 4px;
        transition: all 0.2s;
        position: relative;
    }

    .sprite.hurt {
        animation:
            flash 0.2s ease-in-out,
            shake 0.3s ease-in-out;
    }

    .damage-number {
        position: absolute;
        top: -10px;
        right: -10px;
        font-family: var(--font-pixel);
        font-size: var(--font-size-lg);
        font-weight: bold;
        color: var(--danger);
        text-shadow:
            2px 2px 0 black,
            -2px -2px 0 black;
        animation: damage-text 1s ease-out forwards;
        pointer-events: none;
    }

    .enemy-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }

    .enemy-name {
        font-family: var(--font-pixel);
        font-size: var(--font-size-sm);
        color: var(--text-primary);
        text-shadow: 1px 1px 0 black;
    }

    .hp-bar {
        width: clamp(50px, 12vw, 70px);
        height: clamp(4px, 1vw, 6px);
        background: var(--bg-dark);
        border: 1px solid var(--bg-light);
        overflow: hidden;
    }

    .hp-fill {
        height: 100%;
        background: var(--hp-bar-low);
        transition: width 0.3s ease-out;
    }

    .target-cursor {
        position: absolute;
        top: -8px;
        color: var(--primary);
        font-size: var(--font-size-lg);
        animation: bounce 0.5s ease-in-out infinite;
    }

    @keyframes bounce {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-5px);
        }
    }

    @keyframes flash {
        0%,
        100% {
            filter: brightness(1);
        }
        50% {
            filter: brightness(3);
        }
    }

    @keyframes shake {
        0%,
        100% {
            transform: translateX(0);
        }
        25% {
            transform: translateX(-5px);
        }
        75% {
            transform: translateX(5px);
        }
    }

    @keyframes damage-text {
        0% {
            opacity: 1;
            transform: translateY(0) scale(1.3);
        }
        100% {
            opacity: 0;
            transform: translateY(-40px) scale(0.8);
        }
    }
</style>
