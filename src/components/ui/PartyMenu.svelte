<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { trainerStore } from "../../lib/stores/trainerStore";
    import { getSpecies } from "../../lib/data/creatures";
    import { getMove } from "../../lib/data/moves";
    import type { Creature } from "../../lib/types";

    export let isOpen = false;

    const dispatch = createEventDispatcher();

    let selectedIndex = 0;
    let activeTab: "info" | "stats" | "moves" = "info";

    $: party = $trainerStore.trainer?.party || [];
    $: selectedCreature = party[selectedIndex] as Creature | undefined;
    $: species = selectedCreature
        ? getSpecies(selectedCreature.speciesId)
        : null;

    function close() {
        dispatch("close");
    }

    function nextCreature() {
        if (party.length > 0) {
            selectedIndex = (selectedIndex + 1) % party.length;
        }
    }

    function prevCreature() {
        if (party.length > 0) {
            selectedIndex = (selectedIndex - 1 + party.length) % party.length;
        }
    }

    function getTypeColor(type: string): string {
        const colors: Record<string, string> = {
            normal: "#A8A878",
            fire: "#F08030",
            water: "#6890F0",
            grass: "#78C850",
            electric: "#F8D030",
            ice: "#98D8D8",
            fighting: "#C03028",
            poison: "#A040A0",
            ground: "#E0C068",
            flying: "#A890F0",
            psychic: "#F85888",
            bug: "#A8B820",
            rock: "#B8A038",
            ghost: "#705898",
            dragon: "#7038F8",
            dark: "#705848",
            steel: "#B8B8D0",
            fairy: "#EE99AC",
        };
        return colors[type.toLowerCase()] || "#777";
    }

    function getMoveCategory(category: string): string {
        const icons: Record<string, string> = {
            physical: "💥",
            special: "✨",
            status: "📊",
        };
        return icons[category] || "";
    }

    // XP calculations
    $: currentExp = selectedCreature?.exp || 0;
    $: expToNext = selectedCreature?.expToNextLevel || 100;
    $: xpPercent = Math.min(100, (currentExp / expToNext) * 100);

    // Stat colors/labels
    const statLabels: Record<string, { label: string; color: string }> = {
        hp: { label: "HP", color: "#ef4444" },
        atk: { label: "ATK", color: "#f97316" },
        def: { label: "DEF", color: "#eab308" },
        spAtk: { label: "SP.ATK", color: "#3b82f6" },
        spDef: { label: "SP.DEF", color: "#22c55e" },
        speed: { label: "SPEED", color: "#ec4899" },
    };

    // Helper to get stat value safely
    function getStatValue(creature: Creature, key: string): number {
        if (key === "hp") return creature.maxHp;
        const stats = creature.stats as unknown as Record<string, number>;
        return stats[key] ?? 0;
    }
</script>

{#if isOpen && selectedCreature && species}
    <div
        class="party-menu-overlay"
        on:click={close}
        on:keydown={(e) => e.key === "Escape" && close()}
        role="dialog"
        tabindex="-1"
    >
        <div class="party-menu" on:click|stopPropagation role="document">
            <!-- Header -->
            <div class="menu-header">
                <h2 class="creature-name">
                    {selectedCreature.nickname || species.name}
                </h2>
                <nav class="tabs">
                    <button
                        class="tab"
                        class:active={activeTab === "info"}
                        on:click={() => (activeTab = "info")}>INFO</button
                    >
                    <button
                        class="tab"
                        class:active={activeTab === "stats"}
                        on:click={() => (activeTab = "stats")}>STATS</button
                    >
                    <button
                        class="tab"
                        class:active={activeTab === "moves"}
                        on:click={() => (activeTab = "moves")}>MOVES</button
                    >
                </nav>
                <div class="nav-buttons">
                    <button
                        class="nav-btn"
                        on:click={prevCreature}
                        title="Previous">▲</button
                    >
                    <button class="nav-btn" on:click={nextCreature} title="Next"
                        >▼</button
                    >
                    <button class="close-btn" on:click={close} title="Close"
                        >✕</button
                    >
                </div>
            </div>

            <div class="menu-content">
                <!-- Left Panel: Sprite -->
                <div class="sprite-panel">
                    <div class="sprite-container">
                        <img
                            src={selectedCreature.sprite.front}
                            alt={species.name}
                            class="creature-sprite"
                        />
                    </div>

                    {#if species.abilities && species.abilities.length > 0}
                        <div class="ability-box">
                            <span class="ability-label"
                                >ABILITY「 {species.abilities[0]} 」</span
                            >
                        </div>
                    {/if}

                    <div class="level-badge">
                        Lv{selectedCreature.level}
                        <span class="species-name">{species.name}</span>
                    </div>
                </div>

                <!-- Right Panel: Tab Content -->
                <div class="info-panel">
                    {#if activeTab === "info"}
                        <div class="info-grid">
                            <div class="info-row">
                                <span class="info-label">Pokedex ID</span>
                                <span class="info-value"
                                    >{String(species.pokedexId).padStart(
                                        3,
                                        "0",
                                    )}</span
                                >
                            </div>
                            <div class="info-row">
                                <span class="info-label">Name</span>
                                <span class="info-value">{species.name}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Type</span>
                                <span class="info-value types">
                                    {#each selectedCreature.types as type}
                                        <span
                                            class="type-badge"
                                            style="background: {getTypeColor(
                                                type,
                                            )}">{type.toUpperCase()}</span
                                        >
                                    {/each}
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Nature</span>
                                <span class="info-value nature">
                                    {selectedCreature.nature || "Hardy"}
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Exp.</span>
                                <div class="exp-container">
                                    <div class="exp-bar">
                                        <div
                                            class="exp-fill"
                                            style="width: {xpPercent}%"
                                        ></div>
                                    </div>
                                    <span class="exp-text"
                                        >{currentExp} / {expToNext}</span
                                    >
                                </div>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Height</span>
                                <span class="info-value"
                                    >{(species.height / 10).toFixed(1)} m</span
                                >
                            </div>
                            <div class="info-row">
                                <span class="info-label">Weight</span>
                                <span class="info-value"
                                    >{(species.weight / 10).toFixed(1)} kg</span
                                >
                            </div>
                        </div>

                        {#if species.description}
                            <p class="description">{species.description}</p>
                        {/if}
                    {:else if activeTab === "stats"}
                        <div class="stats-table">
                            <div class="stats-header">
                                <span></span>
                                <span class="header-cell">Value</span>
                            </div>

                            {#each Object.entries(statLabels) as [key, info]}
                                {@const value = getStatValue(
                                    selectedCreature,
                                    key,
                                )}
                                {@const maxStat = 200}
                                {@const barPercent = Math.min(
                                    100,
                                    (value / maxStat) * 100,
                                )}
                                <div class="stat-row">
                                    <span
                                        class="stat-label"
                                        style="color: {info.color}"
                                        >{info.label}</span
                                    >
                                    <span class="stat-value">
                                        {#if key === "hp"}
                                            {selectedCreature.currentHp} / {selectedCreature.maxHp}
                                        {:else}
                                            {value}
                                        {/if}
                                    </span>
                                    <div class="stat-bar-container">
                                        <div
                                            class="stat-bar"
                                            style="width: {barPercent}%; background: {info.color}"
                                        ></div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else if activeTab === "moves"}
                        <div class="moves-list">
                            {#each selectedCreature.moves as moveId}
                                {@const move = getMove(moveId)}
                                {#if move}
                                    <div class="move-card">
                                        <span
                                            class="move-type-badge"
                                            style="background: {getTypeColor(
                                                move.type,
                                            )}">{move.type.toUpperCase()}</span
                                        >
                                        <div class="move-info">
                                            <span class="move-name"
                                                >{move.name}</span
                                            >
                                            <span class="move-category"
                                                >{move.category}</span
                                            >
                                        </div>
                                        <div class="move-stats">
                                            <span class="move-power"
                                                >power {move.power || "-"}</span
                                            >
                                            <span class="move-pp"
                                                >PP {move.pp}/{move.pp}</span
                                            >
                                        </div>
                                    </div>
                                {/if}
                            {/each}

                            {#if selectedCreature.moves.length === 0}
                                <p class="no-moves">No moves learned yet.</p>
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Party Indicator -->
            <div class="party-indicator">
                {#each party as creature, i}
                    <button
                        class="party-dot"
                        class:active={i === selectedIndex}
                        class:fainted={creature.isFainted}
                        on:click={() => (selectedIndex = i)}
                        title={creature.nickname ||
                            getSpecies(creature.speciesId)?.name}
                    >
                        <img
                            src={creature.sprite.front}
                            alt=""
                            class="party-dot-sprite"
                        />
                    </button>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .party-menu-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
    }

    .party-menu {
        width: 90%;
        max-width: 900px;
        height: 80%;
        max-height: 600px;
        background: linear-gradient(135deg, #1a3a5c 0%, #0d2137 100%);
        border-radius: 12px;
        border: 3px solid #3498db;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 0 30px rgba(52, 152, 219, 0.3);
    }

    .menu-header {
        display: flex;
        align-items: center;
        padding: 15px 20px;
        background: rgba(0, 0, 0, 0.4);
        border-bottom: 2px solid #2980b9;
        gap: 20px;
    }

    .creature-name {
        margin: 0;
        font-size: 1.4rem;
        color: white;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        min-width: 120px;
    }

    .tabs {
        display: flex;
        gap: 5px;
    }

    .tab {
        padding: 8px 20px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #bbb;
        cursor: pointer;
        font-weight: bold;
        font-size: 0.85rem;
        transition: all 0.2s;
    }

    .tab:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .tab.active {
        background: linear-gradient(135deg, #f39c12, #e67e22);
        color: white;
        box-shadow: 0 2px 10px rgba(243, 156, 18, 0.4);
    }

    .nav-buttons {
        margin-left: auto;
        display: flex;
        gap: 10px;
    }

    .nav-btn,
    .close-btn {
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .nav-btn:hover,
    .close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: white;
    }

    .close-btn {
        background: rgba(231, 76, 60, 0.3);
        border-color: #e74c3c;
    }

    .close-btn:hover {
        background: #e74c3c;
    }

    .menu-content {
        flex: 1;
        display: flex;
        overflow: hidden;
    }

    .sprite-panel {
        width: 35%;
        min-width: 200px;
        background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.2) 0%,
            rgba(0, 0, 0, 0.4) 100%
        );
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        border-right: 2px solid rgba(255, 255, 255, 0.1);
    }

    .sprite-container {
        width: 180px;
        height: 180px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: radial-gradient(
            circle,
            rgba(52, 152, 219, 0.2) 0%,
            transparent 70%
        );
    }

    .creature-sprite {
        width: 160px;
        height: 160px;
        image-rendering: pixelated;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
    }

    .ability-box {
        margin-top: 20px;
        padding: 10px 20px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid #555;
        font-size: 0.85rem;
        color: #ccc;
    }

    .level-badge {
        margin-top: 15px;
        padding: 8px 20px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        font-weight: bold;
        display: flex;
        gap: 15px;
    }

    .species-name {
        color: #f39c12;
    }

    .info-panel {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
    }

    .info-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .info-row {
        display: flex;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .info-label {
        width: 140px;
        color: #f39c12;
        font-weight: bold;
        font-size: 0.9rem;
    }

    .info-value {
        flex: 1;
        color: white;
    }

    .info-value.types {
        display: flex;
        gap: 8px;
    }

    .type-badge {
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }

    .exp-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .exp-bar {
        height: 12px;
        background: #333;
        border-radius: 6px;
        overflow: hidden;
    }

    .exp-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
        transition: width 0.3s;
    }

    .exp-text {
        font-size: 0.8rem;
        color: #aaa;
        text-align: right;
    }

    .description {
        margin-top: 20px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        color: #ccc;
        font-size: 0.9rem;
        line-height: 1.5;
        font-style: italic;
    }

    /* Stats Tab */
    .stats-table {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .stats-header {
        display: grid;
        grid-template-columns: 80px 100px 1fr;
        padding: 10px;
        color: #888;
        font-size: 0.8rem;
        font-weight: bold;
    }

    .stat-row {
        display: grid;
        grid-template-columns: 80px 100px 1fr;
        align-items: center;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
    }

    .stat-label {
        font-weight: bold;
        font-size: 0.85rem;
    }

    .stat-value {
        color: white;
        font-weight: bold;
    }

    .stat-bar-container {
        height: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 5px;
        overflow: hidden;
    }

    .stat-bar {
        height: 100%;
        border-radius: 5px;
        transition: width 0.3s;
    }

    /* Moves Tab */
    .moves-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .move-card {
        display: grid;
        grid-template-columns: 80px 1fr auto;
        gap: 15px;
        padding: 12px 15px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        align-items: center;
    }

    .move-type-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: bold;
        color: white;
        text-align: center;
    }

    .move-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .move-name {
        color: white;
        font-weight: bold;
        font-size: 0.95rem;
        text-transform: uppercase;
    }

    .move-category {
        color: #888;
        font-size: 0.8rem;
    }

    .move-stats {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
    }

    .move-power {
        color: white;
        font-weight: bold;
    }

    .move-pp {
        color: #888;
        font-size: 0.85rem;
    }

    .no-moves {
        text-align: center;
        color: #888;
        padding: 40px;
        font-style: italic;
    }

    /* Party Indicator */
    .party-indicator {
        display: flex;
        justify-content: center;
        gap: 10px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.4);
        border-top: 2px solid rgba(255, 255, 255, 0.1);
    }

    .party-dot {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: all 0.2s;
        overflow: hidden;
        padding: 0;
    }

    .party-dot:hover {
        border-color: white;
        transform: scale(1.1);
    }

    .party-dot.active {
        border-color: #f39c12;
        box-shadow: 0 0 15px rgba(243, 156, 18, 0.5);
    }

    .party-dot.fainted {
        opacity: 0.4;
        filter: grayscale(1);
    }

    .party-dot-sprite {
        width: 100%;
        height: 100%;
        object-fit: contain;
        image-rendering: pixelated;
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
        .party-menu {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            border-radius: 0;
            border: none;
        }

        .menu-header {
            padding: 10px 15px;
            gap: 10px;
            flex-wrap: wrap;
        }

        .creature-name {
            font-size: 1.1rem;
            min-width: auto;
            order: 1;
            flex: 1;
        }

        .tabs {
            order: 3;
            width: 100%;
            justify-content: center;
            margin-top: 5px;
        }

        .tab {
            padding: 8px 15px;
            font-size: 0.75rem;
            min-height: 36px;
        }

        .nav-buttons {
            order: 2;
            margin-left: auto;
            gap: 8px;
        }

        .nav-btn,
        .close-btn {
            width: 36px;
            height: 36px;
            font-size: 1rem;
        }

        .menu-content {
            flex-direction: column;
        }

        .sprite-panel {
            width: 100%;
            min-width: unset;
            padding: 15px;
            border-right: none;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            flex-direction: row;
            justify-content: space-around;
            align-items: center;
        }

        .sprite-container {
            width: 120px;
            height: 120px;
        }

        .creature-sprite {
            width: 100px;
            height: 100px;
        }

        .ability-box {
            margin-top: 0;
            padding: 8px 12px;
            font-size: 0.75rem;
        }

        .level-badge {
            margin-top: 0;
            padding: 6px 12px;
            font-size: 0.9rem;
        }

        .info-panel {
            padding: 15px;
        }

        .info-row {
            padding: 6px 0;
        }

        .info-label {
            width: 100px;
            font-size: 0.8rem;
        }

        .info-value {
            font-size: 0.9rem;
        }

        /* Stats table adjustments */
        .stats-header {
            grid-template-columns: 70px 80px 1fr;
            padding: 8px;
            font-size: 0.7rem;
        }

        .stat-row {
            grid-template-columns: 70px 80px 1fr;
            padding: 8px;
        }

        .stat-label {
            font-size: 0.75rem;
        }

        .stat-value {
            font-size: 0.9rem;
        }

        .stat-bar-container {
            height: 8px;
        }

        /* Moves list adjustments */
        .move-card {
            grid-template-columns: 65px 1fr auto;
            gap: 10px;
            padding: 10px 12px;
        }

        .move-type-badge {
            padding: 3px 6px;
            font-size: 0.6rem;
        }

        .move-name {
            font-size: 0.85rem;
        }

        .move-category {
            font-size: 0.7rem;
        }

        .move-power,
        .move-pp {
            font-size: 0.75rem;
        }

        /* Party indicator */
        .party-indicator {
            padding: 10px;
            gap: 8px;
        }

        .party-dot {
            width: 44px;
            height: 44px;
        }
    }

    @media (max-width: 480px) {
        .menu-header {
            padding: 8px 12px;
        }

        .creature-name {
            font-size: 1rem;
        }

        .tabs {
            gap: 3px;
        }

        .tab {
            padding: 6px 12px;
            font-size: 0.7rem;
        }

        .sprite-panel {
            padding: 10px;
            flex-wrap: wrap;
        }

        .sprite-container {
            width: 100px;
            height: 100px;
        }

        .creature-sprite {
            width: 80px;
            height: 80px;
        }

        .ability-box {
            display: none; /* Hide on very small screens */
        }

        .info-panel {
            padding: 10px;
        }

        .info-label {
            width: 80px;
            font-size: 0.75rem;
        }

        .info-value {
            font-size: 0.85rem;
        }

        .type-badge {
            padding: 3px 8px;
            font-size: 0.65rem;
        }

        .exp-bar {
            height: 8px;
        }

        .exp-text {
            font-size: 0.7rem;
        }

        .description {
            padding: 10px;
            font-size: 0.8rem;
        }

        .party-dot {
            width: 38px;
            height: 38px;
        }
    }
</style>
