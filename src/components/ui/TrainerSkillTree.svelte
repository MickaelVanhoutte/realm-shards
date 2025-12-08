<script lang="ts">
    import { trainerStore } from "../../lib/stores/trainerStore";
    import {
        TRAINER_SKILLS,
        getSkillsByBranch,
        BRANCH_INFO,
        canUnlockSkill,
        unlockSkill,
    } from "../../lib/data/trainer";
    import type { Trainer } from "../../lib/types";

    export let onClose: () => void;

    $: trainer = $trainerStore.trainer as Trainer | null;
    $: skillsByBranch = getSkillsByBranch();

    // Create a reactive key that changes when trainer's skills change
    $: trainerSkillKey = trainer?.unlockedSkills.join(",") || "";
    $: trainerPoints = trainer?.skillPoints || 0;

    // Pre-compute skill states reactively based on trainer
    $: skillStates = Object.fromEntries(
        Object.keys(TRAINER_SKILLS).map((skillId) => [
            skillId,
            {
                unlocked: trainer?.unlockedSkills.includes(skillId) || false,
                available: trainer ? canUnlockSkill(trainer, skillId) : false,
                locked: (() => {
                    const skill = TRAINER_SKILLS[skillId];
                    if (!skill || !trainer) return true;
                    for (const prereq of skill.prerequisites) {
                        if (!trainer.unlockedSkills.includes(prereq)) {
                            return true;
                        }
                    }
                    return false;
                })(),
            },
        ]),
    );

    function handleUnlock(skillId: string) {
        if (trainer && canUnlockSkill(trainer, skillId)) {
            trainerStore.unlockSkill(skillId);
        }
    }
</script>

<div class="skill-tree-overlay" on:click|self={onClose}>
    <div class="skill-tree-modal">
        <div class="modal-header">
            <h2>Trainer Skills</h2>
            <div class="trainer-info">
                <span class="level">Lv. {trainer?.level || 1}</span>
                <span class="points">🌟 {trainerPoints} Points</span>
            </div>
            <button class="close-btn" on:click={onClose}>✕</button>
        </div>

        <div class="branches-container">
            {#each Object.entries(skillsByBranch) as [branchId, skills]}
                {@const branchInfo = BRANCH_INFO[branchId]}
                <div class="branch" style="--branch-color: {branchInfo.color}">
                    <div class="branch-header">
                        <span class="branch-icon">{branchInfo.icon}</span>
                        <span class="branch-name">{branchInfo.name}</span>
                    </div>

                    <div class="skill-list">
                        {#each skills as skill (skill.id + trainerSkillKey)}
                            {@const state = skillStates[skill.id]}
                            {@const unlocked = state?.unlocked || false}
                            {@const available = state?.available || false}
                            {@const locked =
                                (state?.locked || false) && !unlocked}

                            <button
                                class="skill-node"
                                class:unlocked
                                class:available
                                class:locked
                                on:click={() => handleUnlock(skill.id)}
                                disabled={!available}
                                title={skill.description}
                            >
                                <div class="skill-tier">T{skill.tier}</div>
                                <div class="skill-name">{skill.name}</div>
                                <div class="skill-cost">
                                    {#if unlocked}
                                        ✓
                                    {:else}
                                        {skill.cost} ⭐
                                    {/if}
                                </div>
                                {#if skill.passive}
                                    <div class="passive-badge">P</div>
                                {/if}
                            </button>

                            {#if skill.tier && skill.tier < 3}
                                <div
                                    class="connector"
                                    class:active={unlocked}
                                ></div>
                            {/if}
                        {/each}
                    </div>
                </div>
            {/each}
        </div>

        <div class="legend">
            <span class="legend-item"
                ><span class="dot unlocked"></span> Unlocked</span
            >
            <span class="legend-item"
                ><span class="dot available"></span> Available</span
            >
            <span class="legend-item"
                ><span class="dot locked"></span> Locked</span
            >
            <span class="legend-item"
                ><span class="passive-indicator">P</span> Passive</span
            >
        </div>
    </div>
</div>

<style>
    .skill-tree-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .skill-tree-modal {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        padding: 20px;
        max-width: 95vw;
        max-height: 90vh;
        overflow: auto;
        border: 2px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
        color: white;
    }

    .trainer-info {
        display: flex;
        gap: 15px;
        margin-left: auto;
    }

    .level {
        background: rgba(52, 152, 219, 0.3);
        padding: 5px 12px;
        border-radius: 20px;
        color: #3498db;
        font-weight: bold;
    }

    .points {
        background: rgba(243, 156, 18, 0.3);
        padding: 5px 12px;
        border-radius: 20px;
        color: #f39c12;
        font-weight: bold;
    }

    .close-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: rgba(231, 76, 60, 0.5);
    }

    .branches-container {
        display: flex;
        gap: 15px;
        overflow-x: auto;
        padding: 10px 0;
    }

    .branch {
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 15px;
        min-width: 160px;
        border: 2px solid var(--branch-color);
    }

    .branch-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .branch-icon {
        font-size: 1.5rem;
    }

    .branch-name {
        font-weight: bold;
        color: var(--branch-color);
        font-size: 0.9rem;
    }

    .skill-list {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0;
    }

    .skill-node {
        width: 100%;
        padding: 12px;
        border-radius: 8px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        background: rgba(0, 0, 0, 0.3);
        color: white;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        text-align: left;
    }

    .skill-node:disabled {
        cursor: not-allowed;
    }

    .skill-node.unlocked {
        border-color: var(--branch-color);
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.05) 100%
        );
        box-shadow: 0 0 15px rgba(var(--branch-color), 0.3);
    }

    .skill-node.available {
        border-color: #f39c12;
        animation: pulse 2s infinite;
    }

    .skill-node.available:hover {
        background: rgba(243, 156, 18, 0.2);
        transform: scale(1.02);
    }

    .skill-node.locked {
        opacity: 0.5;
        filter: grayscale(50%);
    }

    @keyframes pulse {
        0%,
        100% {
            box-shadow: 0 0 5px rgba(243, 156, 18, 0.3);
        }
        50% {
            box-shadow: 0 0 20px rgba(243, 156, 18, 0.6);
        }
    }

    .skill-tier {
        position: absolute;
        top: 5px;
        right: 5px;
        font-size: 0.65rem;
        color: rgba(255, 255, 255, 0.5);
    }

    .skill-name {
        font-size: 0.8rem;
        font-weight: bold;
        margin-bottom: 4px;
    }

    .skill-cost {
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.7);
    }

    .passive-badge {
        position: absolute;
        bottom: 5px;
        right: 5px;
        background: rgba(155, 89, 182, 0.5);
        color: white;
        font-size: 0.6rem;
        padding: 2px 5px;
        border-radius: 4px;
    }

    .connector {
        width: 2px;
        height: 15px;
        background: rgba(255, 255, 255, 0.2);
    }

    .connector.active {
        background: var(--branch-color);
    }

    .legend {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.7);
    }

    .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    .dot.unlocked {
        background: #2ecc71;
    }

    .dot.available {
        background: #f39c12;
    }

    .dot.locked {
        background: #7f8c8d;
    }

    .passive-indicator {
        background: rgba(155, 89, 182, 0.5);
        color: white;
        font-size: 0.6rem;
        padding: 2px 5px;
        border-radius: 4px;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .skill-tree-modal {
            padding: 15px;
            border-radius: 0;
            max-height: 100vh;
        }

        .modal-header {
            flex-wrap: wrap;
        }

        .modal-header h2 {
            font-size: 1.2rem;
        }

        .trainer-info {
            order: 3;
            width: 100%;
            justify-content: center;
            margin-top: 10px;
        }

        .branches-container {
            gap: 10px;
        }

        .branch {
            min-width: 140px;
            padding: 10px;
        }

        .skill-node {
            padding: 10px;
        }

        .skill-name {
            font-size: 0.75rem;
        }

        .legend {
            flex-wrap: wrap;
            gap: 10px;
        }
    }
</style>
