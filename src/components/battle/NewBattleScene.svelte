<script lang="ts">
    import { newBattleStore } from "../../lib/stores/newBattleStore";
    import { trainerStore } from "../../lib/stores/trainerStore";
    import { getMove, MOVES } from "../../lib/data/moves";
    import { getSpecies } from "../../lib/data/creatures";
    import { getSkill } from "../../lib/data/trainer";
    import { getItem } from "../../lib/data/items";
    import type { TrainerAction, Creature, Move } from "../../lib/types";
    import { pokedex } from "../../lib/data/pokedex";
    import { getStatusEmoji } from "../../lib/data/effects";

    // Get battle state
    $: battle = $newBattleStore;
    $: trainer = $trainerStore.trainer;
    $: inventory = $trainerStore.inventory;

    // Target selection state
    let selectingTarget = false;
    let selectedMove: Move | null = null;

    // Current creature for action selection
    $: currentCreature = battle.activeCreatures[battle.selectedCreatureIndex];
    $: currentCreatureMoves =
        currentCreature?.moves.map((id) => getMove(id)).filter(Boolean) || [];

    // Auto-execute when entering resolution phase
    $: if (battle.phase === "resolution" && !battle.animating) {
        executeActions();
    }

    // Mark enemy creatures as seen when battle starts
    $: if (battle.active && battle.enemyCreatures.length > 0) {
        battle.enemyCreatures.forEach((enemy) => {
            const species = getSpecies(enemy.speciesId);
            if (species && species.pokedexId) {
                pokedex.markSeen(species.pokedexId);
            }
        });
    }

    // Get creature display name
    function getCreatureName(creature: Creature): string {
        return (
            creature.nickname ||
            getSpecies(creature.speciesId)?.name ||
            "Creature"
        );
    }

    // Trainer action handlers
    function selectFlee() {
        newBattleStore.setTrainerAction({ type: "flee" });
    }

    function selectItem(itemId: string) {
        newBattleStore.setTrainerAction({ type: "item", itemId });
    }

    function selectSwitch(index: number) {
        newBattleStore.setTrainerAction({ type: "switch", switchIndex: index });
    }

    function selectSkill(skillId: string) {
        newBattleStore.setTrainerAction({ type: "skill", skillId });
    }

    // Move selection - opens target picker or auto-selects
    function pickMove(move: Move) {
        selectedMove = MOVES[move.id] || null;

        // Smart targeting based on move.target
        const targetType = move.target || "selected-pokemon";

        if (targetType === "user") {
            // Self targeting
            if (currentCreature) {
                selectTarget(currentCreature.id);
            }
        } else if (targetType === "users-field") {
            // All allies
            selectTarget("ALL_ALLIES");
        } else if (targetType === "entire-field") {
            // Everyone
            selectTarget("ALL_FIELD");
        } else if (targetType === "all-opponents") {
            // All opponents - highlight all for confirmation
            // For now, we can just auto-select since the user clicked the move
            // Or we can enter a mode where they click any opponent to confirm
            // Let's do the "highlight all and ask for confirm" style by entering selection mode
            // but treating any click on valid target as confirming "ALL_OPPONENTS"
            selectingTarget = true;
        } else if (targetType === "selected-pokemon") {
            // Single target
            // Check if there's only one valid target
            const validTargets = battle.enemyCreatures.filter(
                (c) => !c.isFainted,
            );
            if (validTargets.length === 1) {
                selectTarget(validTargets[0].id);
            } else {
                selectingTarget = true;
            }
        } else {
            // Default fallback
            selectingTarget = true;
        }
    }

    // Target selection
    function selectTarget(targetId: string) {
        if (selectedMove) {
            // If the move targets all opponents, override the specific targetId with the group ID
            if (selectedMove.target === "all-opponents") {
                newBattleStore.setCreatureAction(
                    selectedMove.id,
                    "ALL_OPPONENTS",
                );
            } else {
                newBattleStore.setCreatureAction(selectedMove.id, targetId);
            }

            selectedMove = null;
            selectingTarget = false;
        }
    }

    function cancelTargetSelection() {
        selectedMove = null;
        selectingTarget = false;
    }

    // Execute all actions
    function executeActions() {
        newBattleStore.executeActions();
    }

    import { afterUpdate } from "svelte";
    import { fade } from "svelte/transition";

    let logContainer: HTMLDivElement;

    afterUpdate(() => {
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    });

    // Calculate turn order
    $: turnOrder = [
        // Player Trainer (Priority 1000)
        ...(trainer && trainer.currentHp > 0
            ? [
                  {
                      id: trainer.id,
                      name: trainer.name,
                      isTrainer: true,
                      isEnemy: false,
                      speed: 1000,
                      sprite: trainer.avatar || trainer.sprite, // Use avatar if available
                  },
              ]
            : []),
        // Enemy Trainer (Priority 999)
        ...(battle.enemyTrainer
            ? [
                  {
                      id: battle.enemyTrainer.id,
                      name: battle.enemyTrainer.name,
                      isTrainer: true,
                      isEnemy: true,
                      speed: 999,
                      sprite: battle.enemyTrainer.sprite,
                  },
              ]
            : []),
        // Creatures (Sorted by Speed)
        ...battle.activeCreatures
            .filter((c) => !c.isFainted)
            .map((c) => ({
                id: c.id,
                name: getCreatureName(c),
                isTrainer: false,
                isEnemy: false,
                speed: c.stats.speed,
                sprite: c.sprite.front, // Use front sprite for icon
            })),
        ...battle.enemyCreatures
            .filter((c) => !c.isFainted)
            .map((c) => ({
                id: c.id,
                name: getCreatureName(c),
                isTrainer: false,
                isEnemy: true,
                speed: c.stats.speed,
                sprite: c.sprite.front,
            })),
    ].sort((a, b) => b.speed - a.speed);
</script>

{#if battle.active && battle.phase !== "victory" && battle.phase !== "defeat"}
    <div class="battle-screen">
        <!-- Background Layer -->
        <div class="battle-background">
            <!-- Placeholder for actual background asset -->
        </div>

        <!-- Arena Layer (Sprites) -->
        <div class="arena">
            <!-- Enemy Side -->
            {#each battle.enemyCreatures as enemy, i (enemy.id)}
                <div
                    class="sprite-container enemy"
                    class:fainted={enemy.isFainted}
                    class:targetable={selectingTarget && !enemy.isFainted}
                    class:multi-target={selectingTarget &&
                        selectedMove?.target === "all-opponents" &&
                        !enemy.isFainted}
                    style="top: {25 + i * 5}%; right: {20 +
                        i * 10}%; z-index: {10 - i};"
                    on:click={() => selectingTarget && selectTarget(enemy.id)}
                    role="button"
                    tabindex="0"
                    on:keydown={(e) =>
                        e.key === "Enter" &&
                        selectingTarget &&
                        selectTarget(enemy.id)}
                >
                    <img
                        src={enemy.sprite.front}
                        alt={getCreatureName(enemy)}
                        class="creature-sprite front"
                    />
                    <div class="shadow"></div>
                </div>
            {/each}

            <!-- Player Side -->
            <!-- Target Selection Overlay Removed -->

            <!-- Trainer -->
            {#if trainer}
                <div
                    class="sprite-container player trainer"
                    style="bottom: 20%; left: 10%; z-index: 1;"
                >
                    <div
                        class="trainer-sprite"
                        style="background-image: url({trainer.sprite})"
                    ></div>
                    <div class="shadow"></div>
                </div>
            {/if}

            <!-- Player Creatures -->
            {#each battle.activeCreatures as creature, i (creature.id)}
                <div
                    class="sprite-container player"
                    class:fainted={creature.isFainted}
                    style="bottom: {15 - i * 5}%; left: {30 +
                        i * 10}%; z-index: {5 + i};"
                >
                    <img
                        src={creature.sprite.back}
                        alt={getCreatureName(creature)}
                        class="creature-sprite back"
                    />
                    <div class="shadow"></div>
                </div>
            {/each}
        </div>

        <!-- UI Layer -->
        <div class="ui-layer">
            <!-- Timeline (Left) -->
            <div class="timeline">
                <div class="timeline-header">NEXT</div>
                {#each turnOrder as participant (participant.id)}
                    <div
                        class="timeline-item"
                        class:player={!participant.isEnemy}
                        class:enemy={participant.isEnemy}
                        class:active={battle.currentActorId === participant.id}
                        title={participant.name}
                    >
                        {#if participant.isTrainer}
                            <div
                                class="trainer-avatar"
                                style="background-image: url({participant.sprite})"
                            ></div>
                        {:else}
                            <img
                                src={participant.sprite}
                                alt={participant.name}
                            />
                        {/if}
                    </div>
                {/each}
            </div>

            <!-- Top HUD (Health Bars) -->
            <div class="hud-top">
                <!-- Player Status (Top Left) -->
                <div
                    class="status-group player"
                    class:compact={battle.activeCreatures.length >= 3}
                >
                    <!-- Trainer Status -->
                    {#if trainer}
                        <div class="status-card trainer">
                            <div class="status-info">
                                <span class="name">TRAINER {trainer.name}</span>
                                <span class="level">Lv.{trainer.level}</span>
                            </div>
                            <div class="hp-container">
                                <div class="hp-bar">
                                    <div
                                        class="hp-fill trainer"
                                        style="width: {(trainer.currentHp /
                                            trainer.maxHp) *
                                            100}%"
                                    ></div>
                                </div>
                                <span class="hp-text"
                                    >{trainer.currentHp} / {trainer.maxHp}</span
                                >
                            </div>
                        </div>
                    {/if}

                    <!-- Creature Status -->
                    {#each battle.activeCreatures as creature}
                        <div class="status-card player">
                            <div class="status-info">
                                <span class="name"
                                    >{getCreatureName(creature)}</span
                                >
                                {#if creature.statusCondition}
                                    <span
                                        class="status-icon"
                                        title={creature.statusCondition}
                                    >
                                        {getStatusEmoji(
                                            creature.statusCondition,
                                        )}
                                    </span>
                                {/if}
                                <span class="level">Lv.{creature.level}</span>
                            </div>
                            <div class="hp-container">
                                <div class="hp-bar">
                                    <div
                                        class="hp-fill ally"
                                        style="width: {(creature.currentHp /
                                            creature.maxHp) *
                                            100}%"
                                    ></div>
                                </div>
                                <span class="hp-text"
                                    >{creature.currentHp} / {creature.maxHp}</span
                                >

                                <!-- XP Bar -->
                                {#if !creature.isFainted}
                                    {@const species = getSpecies(
                                        creature.speciesId,
                                    )}
                                    {@const currentLevelExp =
                                        pokedex.getExperience(
                                            species?.growthRateId || 4,
                                            creature.level,
                                        )}
                                    {@const nextLevelExp =
                                        pokedex.getExperience(
                                            species?.growthRateId || 4,
                                            creature.level + 1,
                                        )}
                                    {@const xpPercent = Math.min(
                                        100,
                                        Math.max(
                                            0,
                                            ((creature.exp - currentLevelExp) /
                                                (nextLevelExp -
                                                    currentLevelExp)) *
                                                100,
                                        ),
                                    )}
                                    <div class="xp-bar-container">
                                        <div
                                            class="xp-bar"
                                            style="width: {xpPercent}%"
                                        ></div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>

                <!-- Enemy Status (Top Right) -->
                <div
                    class="status-group enemy"
                    class:compact={battle.enemyCreatures.length >= 3}
                >
                    {#each battle.enemyCreatures as enemy}
                        <div class="status-card enemy">
                            <div class="status-info">
                                <span class="name"
                                    >{getCreatureName(enemy)}</span
                                >
                                {#if enemy.statusCondition}
                                    <span
                                        class="status-icon"
                                        title={enemy.statusCondition}
                                    >
                                        {getStatusEmoji(enemy.statusCondition)}
                                    </span>
                                {/if}
                                <span class="level">Lv.{enemy.level}</span>
                            </div>
                            <div class="hp-container">
                                <div class="hp-bar">
                                    <div
                                        class="hp-fill enemy"
                                        style="width: {(enemy.currentHp /
                                            enemy.maxHp) *
                                            100}%"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Level Up Popup -->
            {#if battle.levelUpEvent}
                <div class="level-up-popup" transition:fade>
                    <div class="level-up-content">
                        <h3>Level Up!</h3>
                        <div class="level-change">
                            Lv. {battle.levelUpEvent.level - 1} ➝
                            <span class="new-level"
                                >Lv. {battle.levelUpEvent.level}</span
                            >
                        </div>
                        <div class="stats-grid">
                            <div class="stat-row">
                                <span class="stat-label">HP</span>
                                <span class="stat-old"
                                    >{battle.levelUpEvent.oldStats.hp}</span
                                >
                                <span class="arrow">➝</span>
                                <span class="stat-new"
                                    >{battle.levelUpEvent.newStats.hp}</span
                                >
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Attack</span>
                                <span class="stat-old"
                                    >{battle.levelUpEvent.oldStats.atk}</span
                                >
                                <span class="arrow">➝</span>
                                <span class="stat-new"
                                    >{battle.levelUpEvent.newStats.atk}</span
                                >
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Defense</span>
                                <span class="stat-old"
                                    >{battle.levelUpEvent.oldStats.def}</span
                                >
                                <span class="arrow">➝</span>
                                <span class="stat-new"
                                    >{battle.levelUpEvent.newStats.def}</span
                                >
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Sp. Atk</span>
                                <span class="stat-old"
                                    >{battle.levelUpEvent.oldStats.spAtk}</span
                                >
                                <span class="arrow">➝</span>
                                <span class="stat-new"
                                    >{battle.levelUpEvent.newStats.spAtk}</span
                                >
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Sp. Def</span>
                                <span class="stat-old"
                                    >{battle.levelUpEvent.oldStats.spDef}</span
                                >
                                <span class="arrow">➝</span>
                                <span class="stat-new"
                                    >{battle.levelUpEvent.newStats.spDef}</span
                                >
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Speed</span>
                                <span class="stat-old"
                                    >{battle.levelUpEvent.oldStats.speed}</span
                                >
                                <span class="arrow">➝</span>
                                <span class="stat-new"
                                    >{battle.levelUpEvent.newStats.speed}</span
                                >
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Bottom HUD (Dialogue & Actions) -->
            <div class="hud-bottom">
                <!-- Dialogue Box (Bottom Left) -->
                <!-- Dialogue Box (Bottom Left) -->
                <div class="dialogue-box" bind:this={logContainer}>
                    {#if battle.log.length > 0}
                        {#each battle.log as message}
                            <p class="message">{message}</p>
                        {/each}
                    {:else}
                        <p class="message">
                            What will {getCreatureName(currentCreature)} do?
                        </p>
                    {/if}
                </div>

                <!-- Action Menu (Bottom Right) -->
                <div class="action-menu">
                    {#if battle.phase === "trainer_select"}
                        <div class="menu-stack">
                            <button
                                class="menu-btn fight"
                                on:click={() =>
                                    newBattleStore.setTrainerAction({
                                        type: "command",
                                    })}
                            >
                                FIGHT
                            </button>
                            <button
                                class="menu-btn bag"
                                on:click={() => selectItem("potion")}
                            >
                                BAG
                            </button>
                            <button
                                class="menu-btn pokemon"
                                on:click={() => selectSwitch(0)}
                            >
                                POKEMON
                            </button>
                            <button class="menu-btn run" on:click={selectFlee}>
                                RUN
                            </button>
                        </div>
                    {:else if battle.phase === "creature_select" && !selectingTarget}
                        <div class="menu-stack">
                            <div class="sub-menu moves">
                                {#each currentCreatureMoves as move}
                                    {#if move}
                                        <button
                                            class="move-btn type-{move.type}"
                                            on:click={() =>
                                                move && pickMove(move)}
                                        >
                                            {move.name}
                                            <span class="pp"
                                                >PWR {move.power}</span
                                            >
                                        </button>
                                    {/if}
                                {/each}
                                <button
                                    class="move-btn back"
                                    on:click={() =>
                                        newBattleStore.update((s) => ({
                                            ...s,
                                            phase: "trainer_select",
                                        }))}>BACK</button
                                >
                            </div>
                        </div>
                    {:else if selectingTarget}
                        <div class="menu-stack">
                            <div class="sub-menu targets">
                                <div class="menu-header">SELECT TARGET</div>
                                {#each battle.enemyCreatures as enemy}
                                    {#if !enemy.isFainted}
                                        <button
                                            class="menu-btn target"
                                            on:click={() =>
                                                selectTarget(enemy.id)}
                                        >
                                            {enemy.nickname ||
                                                getSpecies(enemy.speciesId)
                                                    ?.name ||
                                                "Enemy"}
                                        </button>
                                    {/if}
                                {/each}
                                <button
                                    class="menu-btn back"
                                    on:click={cancelTargetSelection}
                                    >CANCEL</button
                                >
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{:else if battle.phase === "victory"}
    <div class="battle-result victory">
        <h2>🎉 Victory!</h2>
        <p>You won the battle!</p>
        <button
            class="action-btn"
            on:click={() => newBattleStore.endBattle(true)}>Continue</button
        >
    </div>
{:else if battle.phase === "defeat"}
    <div class="battle-result defeat">
        <h2>💀 Defeat</h2>
        <p>You blacked out...</p>
        <button
            class="action-btn"
            on:click={() => newBattleStore.endBattle(false)}
            >Return to Title</button
        >
    </div>
{/if}

<style>
    :global(body) {
        margin: 0;
        overflow: hidden;
    }

    .battle-screen {
        position: relative;
        width: 100%;
        height: 100%;
        background: linear-gradient(
            180deg,
            #87ceeb 0%,
            #e0f7fa 50%,
            #f0e68c 50%,
            #deb887 100%
        );
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        overflow: hidden;
    }

    /* Arena Layer */
    .arena {
        position: absolute;
        inset: 0;
        pointer-events: none; /* Let clicks pass through to sprites if needed, but sprites have pointer-events: auto */
    }

    .sprite-container {
        position: absolute;
        pointer-events: auto;
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        width: 200px; /* Fixed width for centering */
        height: 200px; /* Fixed height for alignment */
    }

    .sprite-container.targetable {
        cursor: pointer;
    }

    .sprite-container.targetable:hover .creature-sprite {
        filter: drop-shadow(0 0 10px #e74c3c) brightness(1.2);
        transform: scale(1.05);
    }

    .sprite-container.multi-target .creature-sprite {
        filter: drop-shadow(0 0 8px #e74c3c);
    }

    .sprite-container.multi-target:hover .creature-sprite {
        filter: drop-shadow(0 0 15px #c0392b) brightness(1.3);
    }

    /* Removed static positioning for .enemy and .player as they are now inline styles */

    .creature-sprite {
        width: 160px; /* Larger sprites */
        height: 160px;
        object-fit: contain;
        image-rendering: pixelated;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        z-index: 2; /* Ensure sprite is above shadow */
        position: absolute;
        bottom: 20px; /* Sit above shadow */
    }

    .trainer-sprite {
        width: 128px;
        height: 128px;
        background-repeat: no-repeat;
        background-size: 500% 100%; /* 5 frames horizontal */
        image-rendering: pixelated;
        z-index: 2;
        position: absolute;
        bottom: 20px;
    }

    .shadow {
        width: 100px;
        height: 30px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 50%;
        transform: scaleY(0.5);
        z-index: 1;
        filter: blur(4px); /* Softer shadow */
        position: absolute;
        bottom: 10px; /* Pin to bottom of container */

        /* FIXME : positionning is not correct */
        display: none;
    }

    /* Target Selection Overlay */
    .target-selection-overlay {
        position: absolute;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 10px;
        z-index: 100;
        text-align: center;
        border: 2px solid #fff;
        pointer-events: auto; /* Make it clickable */
    }

    .target-prompt {
        color: white;
        font-size: 1.2rem;
        margin-bottom: 15px;
        font-family: "Press Start 2P", cursive;
    }

    .target-buttons {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .target-btn {
        padding: 10px 20px;
        font-family: "Press Start 2P", cursive;
        font-size: 0.8rem;
        cursor: pointer;
        border: 2px solid #fff;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        transition: all 0.2s;
    }

    .target-btn:hover {
        background: white;
        color: black;
    }

    .target-btn.enemy {
        border-color: #e74c3c;
    }

    .target-btn.enemy:hover {
        background: #e74c3c;
        color: white;
    }

    .target-btn.cancel {
        margin-top: 10px;
        border-color: #95a5a6;
    }

    /* UI Layer */
    .ui-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 20px;
    }

    /* Timeline */
    .timeline {
        position: absolute;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 15px;
        pointer-events: auto;
        z-index: 100;
    }

    .timeline-header {
        color: white;
        font-weight: bold;
        text-align: center;
        text-shadow: 1px 1px 0 #000;
        font-size: 12px;
        margin-bottom: 5px;
        background: rgba(0, 0, 0, 0.5);
        padding: 2px 5px;
        border-radius: 4px;
        transform: skewX(-10deg);
    }

    .timeline-item {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid #fff;
        background: rgba(0, 0, 0, 0.6);
        overflow: hidden;
        position: relative;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
        transition: transform 0.2s;
    }

    .timeline-item.active {
        transform: scale(1.2);
        box-shadow: 0 0 15px #f1c40f;
        border-color: #f1c40f;
        z-index: 10;
    }

    .timeline-item img {
        width: 115%;
        height: 115%;
        object-fit: none;
        image-rendering: pixelated;
    }

    .timeline-item .trainer-avatar {
        width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
    }

    /* HUD Top */
    .hud-top {
        display: flex;
        justify-content: space-between;
        width: 100%;
        gap: 20px;
        padding-left: 80px; /* Make room for timeline */
    }

    /* Group status cards to manage layout */
    .status-group {
        display: flex;
        flex-direction: column; /* Stack vertically if needed, or row with wrap */
        gap: 10px;
        max-width: 45%; /* Limit width to prevent overlap */
    }

    /* Compact mode for 3+ party members */
    .status-group.compact {
        gap: 5px;
    }

    .status-group.compact .status-card {
        padding: 5px 10px;
        min-width: 150px;
    }

    .status-group.compact .status-info {
        font-size: 11px;
    }

    .status-group.compact .hp-bar {
        height: 6px;
    }

    .status-group.compact .hp-text {
        font-size: 0.55rem;
    }

    .status-group.compact .xp-bar-container {
        height: 2px;
        margin-top: 2px;
    }

    .status-card {
        background: rgba(0, 0, 0, 0.6);
        padding: 8px 15px; /* Slightly smaller padding */
        color: white;
        transform: skewX(-20deg);
        border-left: 5px solid;
        min-width: 200px; /* Reduced min-width */
        pointer-events: auto;
        box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.2);
        transition: transform 0.2s;
    }

    .status-card.trainer {
        background: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.8),
            rgba(50, 50, 50, 0.8)
        );
        border-color: #f1c40f; /* Gold for trainer */
        margin-bottom: 5px;
    }

    .status-card:hover {
        transform: skewX(-20deg) scale(1.02);
        z-index: 10;
    }

    .status-card.player {
        border-color: #3498db;
        margin-right: auto; /* Push to left */
    }

    .status-card.enemy {
        border-color: #e74c3c;
        margin-left: auto; /* Push to right */
    }

    .status-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 2px;
        transform: skewX(20deg); /* Counter-skew text */
        font-weight: bold;
        text-shadow: 1px 1px 0 #000;
        font-size: 14px; /* Slightly smaller font */
    }

    .hp-container {
        transform: skewX(20deg); /* Counter-skew bars */
    }

    .hp-bar {
        height: 10px; /* Slightly thinner */
        background: #333;
        border: 2px solid #fff;
        border-radius: 5px;
        overflow: hidden;
        position: relative;
    }

    .hp-fill {
        height: 100%;
        transition: width 0.5s ease-out;
    }

    .hp-fill.ally {
        background: #2ecc71;
    }
    .hp-fill.enemy {
        background: #e74c3c;
    }
    .hp-fill.trainer {
        background: #f1c40f;
    } /* Gold for trainer HP */

    .hp-text {
        font-size: 0.7rem;
        text-align: right;
        margin-top: 2px;
    }

    .xp-bar-container {
        width: 100%;
        height: 4px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 2px;
        margin-top: 4px;
        overflow: hidden;
    }

    .xp-bar {
        height: 100%;
        background: #3b82f6;
        transition: width 0.5s ease-out;
    }

    /* Level Up Popup */
    .level-up-popup {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #fbbf24;
        border-radius: 12px;
        padding: 20px;
        z-index: 100;
        color: white;
        min-width: 300px;
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
    }

    .level-up-content h3 {
        text-align: center;
        color: #fbbf24;
        margin: 0 0 10px 0;
        font-size: 1.5rem;
    }

    .level-change {
        text-align: center;
        font-size: 1.2rem;
        margin-bottom: 15px;
    }

    .new-level {
        color: #fbbf24;
        font-weight: bold;
    }

    .stats-grid {
        display: grid;
        gap: 8px;
    }

    .stat-row {
        display: grid;
        grid-template-columns: 1fr auto auto auto;
        gap: 10px;
        align-items: center;
    }

    .stat-label {
        color: #9ca3af;
    }

    .stat-old {
        color: #d1d5db;
    }

    .arrow {
        color: #fbbf24;
    }

    .stat-new {
        color: #10b981;
        font-weight: bold;
    }

    /* HUD Bottom */
    .hud-bottom {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding: 0;
        height: 60%;
    }

    /* Dialogue Box */
    .dialogue-box {
        background: rgba(0, 0, 0, 0.8);
        /* background-color: gradient from top left to bottom right, dark to lighter */
        background: linear-gradient(
            to bottom right,
            rgba(0, 0, 0, 1),
            rgba(0, 0, 0, 0.6)
        );
        padding: 20px 40px;
        width: 60%;
        height: 50%;
        clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%);
        color: white;
        display: flex;
        align-items: flex-start;
        pointer-events: auto;
        border-left: 5px solid #fff;
        position: relative;
        z-index: 20;
        flex-direction: column;
        align-content: flex-start;
        overflow: scroll;
    }

    .message {
        font-size: 18px;
        margin: 0;
        font-style: italic;
        letter-spacing: 1px;
    }

    /* Action Menu */
    .action-menu {
        max-width: 35%;
        max-height: 90%;
        pointer-events: auto;
    }

    .menu-stack {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: flex-end;
        flex-wrap: wrap;
    }

    .menu-btn {
        width: 100%;
        padding: 8px 24px;
        border: none;
        color: white;
        font-size: 18px;
        font-weight: bold;
        text-transform: uppercase;
        cursor: pointer;
        transform: skewX(-20deg);
        transition:
            transform 0.2s,
            width 0.2s;
        text-align: right;
        box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.2);
        position: relative;
        overflow: hidden;
    }

    .menu-btn:hover {
        transform: skewX(-20deg) translateX(-10px);
        width: 110%;
    }

    .menu-btn.fight {
        background: linear-gradient(90deg, #c0392b, #e74c3c);
        border-right: 5px solid #c0392b;
    }
    .menu-btn.bag {
        background: linear-gradient(90deg, #d35400, #e67e22);
        border-right: 5px solid #d35400;
    }
    .menu-btn.pokemon {
        background: linear-gradient(90deg, #27ae60, #2ecc71);
        border-right: 5px solid #27ae60;
    }
    .menu-btn.run {
        background: linear-gradient(90deg, #2980b9, #3498db);
        border-right: 5px solid #2980b9;
    }

    .sub-menu {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 100%;
    }

    .move-btn {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border: none;
        padding: 12px;
        text-align: left;
        cursor: pointer;
        border-left: 4px solid #fff;
        display: flex;
        justify-content: space-between;
        transition: background 0.2s;
    }

    .move-btn:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .move-btn.type-fire {
        border-color: #e74c3c;
    }
    .move-btn.type-water {
        border-color: #3498db;
    }
    .move-btn.type-grass {
        border-color: #2ecc71;
    }
    .move-btn.type-normal {
        border-color: #95a5a6;
    }

    .menu-btn.target {
        background: linear-gradient(90deg, #c0392b, #e74c3c);
        border-right: 5px solid #c0392b;
        color: white;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }

    .menu-btn.target:hover {
        background: linear-gradient(90deg, #e74c3c, #ff6b6b);
        transform: skewX(-20deg) translateX(-10px);
        width: 110%;
    }

    .menu-btn.back {
        background: linear-gradient(90deg, #7f8c8d, #95a5a6);
        border-right: 5px solid #7f8c8d;
        color: white;
    }

    .menu-btn.back:hover {
        background: linear-gradient(90deg, #95a5a6, #bdc3c7);
    }

    .move-btn.back {
        background: rgba(100, 100, 100, 0.8);
        border-left: 4px solid #7f8c8d;
    }

    .menu-header {
        background: rgba(0, 0, 0, 0.6);
        color: #f1c40f;
        padding: 8px;
        text-align: center;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        border-bottom: 2px solid #f1c40f;
    }

    .target-prompt {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 10px;
    }

    /* Animations */
    .sprite-container.targetable {
        cursor: pointer;
        animation: pulse 1s infinite;
    }

    @keyframes pulse {
        0% {
            transform: scale(1);
            filter: brightness(1);
        }
        50% {
            transform: scale(1.05);
            filter: brightness(1.3);
        }
        100% {
            transform: scale(1);
            filter: brightness(1);
        }
    }

    .battle-result {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        color: white;
    }

    /* ... existing styles ... */
    /* appending new styles correctly requires careful insertion or using a separate style block if the tool allows, 
       but here I will append before the closing tag */

    @media (max-width: 768px) {
        .battle-screen {
            font-size: 14px;
        }

        /* Timeline adjustments - move to top on mobile */
        .timeline {
            position: fixed;
            left: 5px;
            top: 10px;
            transform: none;
            flex-direction: row;
            gap: 8px;
            z-index: 200;
        }

        .timeline-header {
            display: none;
        }

        .timeline-item {
            width: 32px;
            height: 32px;
            border-width: 2px;
        }

        /* HUD Top adjustments */
        .hud-top {
            gap: 10px;
            padding-left: 10px;
            padding-top: 50px; /* Space for timeline */
            flex-wrap: wrap;
        }

        .status-group {
            max-width: 48%;
        }

        .status-card {
            padding: 6px 10px;
            min-width: unset;
            width: 100%;
            transform: skewX(-10deg); /* Less skew on mobile */
        }

        .status-info {
            font-size: 11px;
            transform: skewX(10deg);
        }

        .hp-container {
            transform: skewX(10deg);
        }

        .hp-bar {
            height: 6px;
        }

        .hp-text {
            font-size: 0.6rem;
        }

        .xp-bar-container {
            height: 3px;
        }

        /* Arena adjustments */
        .sprite-container {
            width: 120px;
            height: 120px;
        }

        .creature-sprite {
            width: 100px;
            height: 100px;
            bottom: 15px;
        }

        .trainer-sprite {
            width: 80px;
            height: 80px;
            bottom: 15px;
        }

        /* HUD Bottom adjustments */
        .hud-bottom {
            flex-direction: column;
            gap: 8px;
            height: auto;
            max-height: 55%;
        }

        .dialogue-box {
            width: 100%;
            height: auto;
            min-height: 60px;
            max-height: 80px;
            clip-path: none;
            padding: 10px 15px;
            font-size: 14px;
            border-radius: 8px;
            margin-bottom: 5px;
        }

        .message {
            font-size: 13px;
        }

        .action-menu {
            width: 100%;
            max-width: 100%;
            max-height: none;
        }

        .menu-stack {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 6px;
            justify-content: center;
        }

        .menu-btn {
            width: 48%;
            min-height: 44px; /* Touch target */
            font-size: 14px;
            text-align: center;
            padding: 10px 16px;
            transform: none;
            box-shadow: none;
            border-right: none;
            border-bottom: 3px solid rgba(0, 0, 0, 0.3);
            border-radius: 6px;
        }

        .menu-btn:hover,
        .menu-btn:active {
            transform: translateY(-2px);
            width: 48%;
        }

        .sub-menu.moves {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
        }

        .move-btn {
            padding: 10px;
            font-size: 12px;
            min-height: 44px;
            border-radius: 6px;
        }

        .sub-menu.targets {
            position: fixed;
            bottom: 10px;
            left: 10px;
            right: 10px;
            width: auto;
            z-index: 200;
            background: rgba(0, 0, 0, 0.95);
            border-radius: 8px;
            padding: 10px;
        }

        .menu-header {
            font-size: 12px;
            padding: 6px;
        }

        /* Level Up Popup */
        .level-up-popup {
            padding: 15px;
            min-width: 260px;
            width: 90%;
            max-width: 320px;
        }

        .level-up-content h3 {
            font-size: 1.2rem;
        }

        .level-change {
            font-size: 1rem;
        }

        .stat-row {
            font-size: 0.85rem;
        }
    }

    /* Extra small screens (phones in portrait) */
    @media (max-width: 480px) {
        .hud-top {
            flex-direction: column;
            padding-top: 45px;
            gap: 5px;
        }

        .status-group {
            max-width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
        }

        .status-card {
            padding: 4px 8px;
            transform: none;
            border-radius: 4px;
        }

        .status-info {
            transform: none;
            font-size: 10px;
        }

        .hp-container {
            transform: none;
        }

        .hp-bar {
            height: 5px;
        }

        .hp-text {
            display: none; /* Hide text on very small screens */
        }

        .xp-bar-container {
            display: none; /* Hide XP on very small screens */
        }

        .sprite-container {
            width: 90px;
            height: 90px;
        }

        .creature-sprite {
            width: 80px;
            height: 80px;
        }

        .trainer-sprite {
            width: 64px;
            height: 64px;
        }

        .dialogue-box {
            padding: 8px 12px;
            min-height: 50px;
            max-height: 60px;
        }

        .message {
            font-size: 12px;
        }

        .menu-btn {
            font-size: 12px;
            padding: 8px 12px;
            min-height: 40px;
        }

        .move-btn {
            font-size: 11px;
            padding: 8px;
            min-height: 40px;
        }

        .timeline-item {
            width: 28px;
            height: 28px;
        }
    }
</style>
