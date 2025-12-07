<script lang="ts">
    import type { PartyMember, DamageNumber } from "../../lib/types";

    export let party: PartyMember[];
    export let currentActor: PartyMember | null;
    export let damageNumbers: DamageNumber[] = [];

    function getHpColor(percent: number): string {
        if (percent > 50) return "var(--hp-bar)";
        if (percent > 25) return "var(--warning)";
        return "var(--hp-bar-low)";
    }
</script>

<div class="party-status">
    {#each party as member}
        {@const hpPercent = (member.currentHp / member.maxHp) * 100}
        {@const mpPercent = (member.currentMp / member.maxMp) * 100}
        {@const isActive = currentActor?.id === member.id}
        {@const isDead = member.currentHp <= 0}
        {@const memberDamage = damageNumbers.find(
            (d) => d.targetId === member.id,
        )}

        <div class="member-card" class:active={isActive} class:dead={isDead}>
            <div class="sprite-container">
                <span
                    class="sprite"
                    class:hurt={memberDamage?.type === "damage"}
                >
                    {isDead ? member.sprite?.defeat : member.sprite?.idle}
                </span>
                {#if memberDamage}
                    <span
                        class="damage-number"
                        class:heal={memberDamage.type === "heal"}
                    >
                        {memberDamage.type === "heal"
                            ? "+"
                            : "-"}{memberDamage.amount}
                    </span>
                {/if}
            </div>

            <div class="info">
                <div class="name-row">
                    <span class="name" style="color: {member.color}"
                        >{member.name}</span
                    >
                    {#if isActive}
                        <span class="turn-indicator">▶</span>
                    {/if}
                </div>

                <div class="bars">
                    <div class="bar hp-bar">
                        <div
                            class="bar-fill"
                            style="width: {hpPercent}%; background: {getHpColor(
                                hpPercent,
                            )}"
                        ></div>
                        <span class="bar-text"
                            >{member.currentHp}/{member.maxHp}</span
                        >
                    </div>
                    <div class="bar mp-bar">
                        <div
                            class="bar-fill"
                            style="width: {mpPercent}%; background: var(--mp-bar)"
                        ></div>
                        <span class="bar-text"
                            >{member.currentMp}/{member.maxMp}</span
                        >
                    </div>
                </div>
            </div>
        </div>
    {/each}
</div>

<style>
    .party-status {
        display: flex;
        gap: var(--space-sm);
        justify-content: center;
        flex-wrap: wrap;
    }

    .member-card {
        display: flex;
        gap: var(--space-xs);
        padding: var(--space-xs);
        background: rgba(0, 0, 0, 0.7);
        border: 1px solid var(--bg-light);
        min-width: 0;
        flex: 1;
        max-width: 200px;
        min-width: 140px;
        transition: all 0.2s;
    }

    .member-card.active {
        border-color: var(--primary);
        box-shadow: 0 0 10px rgba(233, 69, 96, 0.4);
    }

    .member-card.dead {
        opacity: 0.5;
        filter: grayscale(0.8);
    }

    .sprite-container {
        width: clamp(28px, 8vw, 40px);
        height: clamp(28px, 8vw, 40px);
        flex-shrink: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: clamp(16px, 5vw, 24px);
        background: var(--bg-dark);
        border: 1px solid var(--bg-light);
        position: relative;
    }

    .sprite.hurt {
        animation: shake 0.3s ease-in-out;
    }

    .damage-number {
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: var(--font-size-base);
        font-weight: bold;
        color: var(--danger);
        text-shadow:
            1px 1px 0 black,
            -1px -1px 0 black;
        animation: damage-text 1s ease-out forwards;
        pointer-events: none;
    }

    .damage-number.heal {
        color: var(--success);
    }

    .info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .name-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .name {
        font-size: var(--font-size-sm);
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .turn-indicator {
        color: var(--primary);
        font-size: var(--font-size-sm);
        animation: pulse 1s ease-in-out infinite;
        flex-shrink: 0;
    }

    .bars {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .bar {
        height: clamp(8px, 2vw, 12px);
        background: var(--bg-dark);
        border: 1px solid var(--bg-light);
        position: relative;
        overflow: hidden;
    }

    .bar-fill {
        height: 100%;
        transition: width 0.3s ease-out;
    }

    .bar-text {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: clamp(5px, 1.5vw, 7px);
        color: var(--text-primary);
        text-shadow: 1px 1px 0 black;
    }

    /* Small screens: compact layout */
    @media (max-width: 480px) {
        .member-card {
            min-width: 100px;
            max-width: 150px;
        }
    }

    @keyframes shake {
        0%,
        100% {
            transform: translateX(0);
        }
        25% {
            transform: translateX(-3px);
        }
        75% {
            transform: translateX(3px);
        }
    }

    @keyframes damage-text {
        0% {
            opacity: 1;
            transform: translateY(0) scale(1.2);
        }
        100% {
            opacity: 0;
            transform: translateY(-30px) scale(0.8);
        }
    }
</style>
