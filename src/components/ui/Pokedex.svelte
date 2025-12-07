<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { pokedex } from "../../lib/data/pokedex";
    import type { PokedexEntryJSON } from "../../lib/data/pokedex";
    import { getMove } from "../../lib/data/moves";

    const dispatch = createEventDispatcher();

    let searchQuery = "";
    let selectedType = "";
    let selectedPokemon: PokedexEntryJSON | null = null;
    let activeTab: "stats" | "more" | "moves" = "stats";

    // Get all pokemon
    const allPokemon = pokedex.getAllPokemon();

    // All available types
    const allTypes = [
        "normal",
        "fire",
        "water",
        "grass",
        "electric",
        "ice",
        "fighting",
        "poison",
        "ground",
        "flying",
        "psychic",
        "bug",
        "rock",
        "ghost",
        "dragon",
        "dark",
        "steel",
        "fairy",
    ];

    $: filteredPokemon = allPokemon.filter((p) => {
        const matchesSearch = p.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesType = !selectedType || p.types.includes(selectedType);
        return matchesSearch && matchesType;
    });

    function selectPokemon(pokemon: PokedexEntryJSON) {
        selectedPokemon = pokemon;
        activeTab = "stats";
    }

    function prevPokemon() {
        if (!selectedPokemon) return;
        const idx = filteredPokemon.findIndex(
            (p) => p.id === selectedPokemon!.id,
        );
        if (idx > 0) selectedPokemon = filteredPokemon[idx - 1];
    }

    function nextPokemon() {
        if (!selectedPokemon) return;
        const idx = filteredPokemon.findIndex(
            (p) => p.id === selectedPokemon!.id,
        );
        if (idx < filteredPokemon.length - 1)
            selectedPokemon = filteredPokemon[idx + 1];
    }

    function close() {
        dispatch("close");
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

    // Type effectiveness calculation
    function getTypeWeaknesses(types: string[]): Record<string, number> {
        const chart: Record<string, Record<string, number>> = {
            normal: { fighting: 2, ghost: 0 },
            fire: {
                water: 2,
                ground: 2,
                rock: 2,
                fire: 0.5,
                grass: 0.5,
                ice: 0.5,
                bug: 0.5,
                steel: 0.5,
                fairy: 0.5,
            },
            water: {
                electric: 2,
                grass: 2,
                water: 0.5,
                fire: 0.5,
                ice: 0.5,
                steel: 0.5,
            },
            grass: {
                fire: 2,
                ice: 2,
                poison: 2,
                flying: 2,
                bug: 2,
                water: 0.5,
                electric: 0.5,
                grass: 0.5,
                ground: 0.5,
            },
            electric: { ground: 2, electric: 0.5, flying: 0.5, steel: 0.5 },
            ice: { fire: 2, fighting: 2, rock: 2, steel: 2, ice: 0.5 },
            fighting: {
                flying: 2,
                psychic: 2,
                fairy: 2,
                bug: 0.5,
                rock: 0.5,
                dark: 0.5,
            },
            poison: {
                ground: 2,
                psychic: 2,
                grass: 0.5,
                fighting: 0.5,
                poison: 0.5,
                bug: 0.5,
                fairy: 0.5,
            },
            ground: {
                water: 2,
                grass: 2,
                ice: 2,
                electric: 0,
                poison: 0.5,
                rock: 0.5,
            },
            flying: {
                electric: 2,
                ice: 2,
                rock: 2,
                ground: 0,
                grass: 0.5,
                fighting: 0.5,
                bug: 0.5,
            },
            psychic: { bug: 2, ghost: 2, dark: 2, fighting: 0.5, psychic: 0.5 },
            bug: {
                fire: 2,
                flying: 2,
                rock: 2,
                grass: 0.5,
                fighting: 0.5,
                ground: 0.5,
            },
            rock: {
                water: 2,
                grass: 2,
                fighting: 2,
                ground: 2,
                steel: 2,
                normal: 0.5,
                fire: 0.5,
                poison: 0.5,
                flying: 0.5,
            },
            ghost: {
                ghost: 2,
                dark: 2,
                normal: 0,
                fighting: 0,
                poison: 0.5,
                bug: 0.5,
            },
            dragon: {
                ice: 2,
                dragon: 2,
                fairy: 2,
                fire: 0.5,
                water: 0.5,
                electric: 0.5,
                grass: 0.5,
            },
            dark: {
                fighting: 2,
                bug: 2,
                fairy: 2,
                psychic: 0,
                ghost: 0.5,
                dark: 0.5,
            },
            steel: {
                fire: 2,
                fighting: 2,
                ground: 2,
                normal: 0.5,
                grass: 0.5,
                ice: 0.5,
                flying: 0.5,
                psychic: 0.5,
                bug: 0.5,
                rock: 0.5,
                dragon: 0.5,
                steel: 0.5,
                fairy: 0.5,
                poison: 0,
            },
            fairy: {
                poison: 2,
                steel: 2,
                fighting: 0.5,
                bug: 0.5,
                dark: 0.5,
                dragon: 0,
            },
        };

        const effectiveness: Record<string, number> = {};

        for (const attackType of allTypes) {
            let multiplier = 1;
            for (const defType of types) {
                const defChart = chart[defType.toLowerCase()];
                if (defChart && defChart[attackType] !== undefined) {
                    multiplier *= defChart[attackType];
                }
            }
            effectiveness[attackType] = multiplier;
        }

        return effectiveness;
    }

    // Get moves for selected Pokemon
    $: levelUpMoves =
        selectedPokemon?.moves
            .filter((m) => m.method === 1)
            .sort((a, b) => a.level - b.level)
            .map((m) => ({
                level: m.level,
                name: m.name,
                move: getMove(m.name.toLowerCase().replace(/[-\s]+/g, "_")),
            }))
            .filter((m) => m.move) || [];

    // Compute type effectiveness reactively
    $: typeEffectiveness = selectedPokemon
        ? getTypeWeaknesses(selectedPokemon.types)
        : {};
    $: effectivenessGroups = [
        {
            multiplier: 0,
            types: allTypes.filter((t) => typeEffectiveness[t] === 0),
        },
        {
            multiplier: 0.25,
            types: allTypes.filter((t) => typeEffectiveness[t] === 0.25),
        },
        {
            multiplier: 0.5,
            types: allTypes.filter((t) => typeEffectiveness[t] === 0.5),
        },
        {
            multiplier: 2,
            types: allTypes.filter((t) => typeEffectiveness[t] === 2),
        },
        {
            multiplier: 4,
            types: allTypes.filter((t) => typeEffectiveness[t] === 4),
        },
    ].filter((g) => g.types.length > 0);

    // Stats with labels
    const statLabels = [
        { key: "hp", label: "HP", color: "#ef4444" },
        { key: "attack", label: "Atk", color: "#f97316" },
        { key: "defense", label: "Def", color: "#eab308" },
        { key: "specialAttack", label: "Sp.A", color: "#3b82f6" },
        { key: "specialDefense", label: "Sp.D", color: "#22c55e" },
        { key: "speed", label: "Speed", color: "#ec4899" },
    ];

    // Helper for type-safe stat access
    function getStat(pokemon: PokedexEntryJSON, key: string): number {
        const stats = pokemon.stats as unknown as Record<string, number>;
        return stats[key] ?? 0;
    }
</script>

{#if selectedPokemon}
    <!-- Detail View -->
    <div class="pokedex-overlay">
        <div class="pokedex-detail">
            <!-- Header -->
            <div class="detail-header">
                <button
                    class="close-btn"
                    on:click={() => (selectedPokemon = null)}
                    title="Back">✕</button
                >
                <h2 class="pokemon-name">
                    {selectedPokemon.name.toUpperCase()}
                </h2>
                <div class="nav-arrows">
                    <button class="nav-btn" on:click={prevPokemon}>▲</button>
                    <button class="nav-btn" on:click={nextPokemon}>▼</button>
                </div>
            </div>

            <!-- Content Area -->
            <div class="detail-content">
                {#if activeTab === "stats"}
                    <!-- STATS Tab -->
                    <div class="stats-layout">
                        <!-- Left: Info -->
                        <div class="info-column">
                            <div class="info-row">
                                <span class="info-label">ID</span>
                                <span class="info-value"
                                    >#{String(selectedPokemon.id).padStart(
                                        3,
                                        "0",
                                    )}</span
                                >
                            </div>
                            <div class="info-row">
                                <span class="info-label">Height</span>
                                <span class="info-value"
                                    >{(selectedPokemon.height / 10).toFixed(
                                        1,
                                    )}m</span
                                >
                            </div>
                            <div class="info-row">
                                <span class="info-label">Weight</span>
                                <span class="info-value"
                                    >{(selectedPokemon.weight / 10).toFixed(
                                        1,
                                    )}kg</span
                                >
                            </div>
                            <div class="info-row">
                                <span class="info-label">Abilities</span>
                                <div class="abilities">
                                    {#each selectedPokemon.abilities as ability}
                                        <span class="ability-badge"
                                            >{ability}</span
                                        >
                                    {/each}
                                </div>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Type</span>
                                <div class="types">
                                    {#each selectedPokemon.types as type}
                                        <span
                                            class="type-badge"
                                            style="background: {getTypeColor(
                                                type,
                                            )}"
                                        >
                                            {type.toUpperCase()}
                                        </span>
                                    {/each}
                                </div>
                            </div>
                        </div>

                        <!-- Center: Sprite -->
                        <div class="sprite-column">
                            <img
                                src={pokedex.getSprite(selectedPokemon.id)}
                                alt={selectedPokemon.name}
                                class="pokemon-sprite"
                            />
                        </div>

                        <!-- Right: Stats -->
                        <div class="stats-column">
                            {#each statLabels as stat}
                                {@const value = getStat(
                                    selectedPokemon,
                                    stat.key,
                                )}
                                {@const barWidth = Math.min(
                                    100,
                                    (value / 255) * 100,
                                )}
                                <div class="stat-row">
                                    <div class="stat-bar-container">
                                        <div
                                            class="stat-bar"
                                            style="width: {barWidth}%; background: {stat.color}"
                                        ></div>
                                    </div>
                                    <span class="stat-value">{value}</span>
                                    <span class="stat-label">{stat.label}</span>
                                </div>
                            {/each}
                            <div class="stat-row total">
                                <div class="stat-bar-container">
                                    <div
                                        class="stat-bar total-bar"
                                        style="width: {Math.min(
                                            100,
                                            (selectedPokemon.stats.total /
                                                720) *
                                                100,
                                        )}%"
                                    ></div>
                                </div>
                                <span class="stat-value"
                                    >{selectedPokemon.stats.total}</span
                                >
                                <span class="stat-label">Total</span>
                            </div>
                        </div>
                    </div>
                {:else if activeTab === "more"}
                    <!-- MORE Tab -->
                    <div class="more-layout">
                        <!-- Weaknesses & Resistances -->
                        <div class="weakness-section">
                            <h3>Weaknesses & Resistances</h3>

                            {#each effectivenessGroups as group}
                                <div class="effectiveness-row">
                                    <span class="multiplier"
                                        >{group.multiplier}x</span
                                    >
                                    <div class="type-list">
                                        {#each group.types as type}
                                            <span
                                                class="type-icon"
                                                style="background: {getTypeColor(
                                                    type,
                                                )}"
                                                title={type}
                                            >
                                                {type.charAt(0).toUpperCase()}
                                            </span>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <!-- Evolutions -->
                        <div class="evolution-section">
                            <h3>Evolutions</h3>
                            {#if selectedPokemon.evolution && selectedPokemon.evolution.length > 0}
                                <div class="evolution-chain">
                                    <div class="evo-pokemon">
                                        <img
                                            src={pokedex.getSprite(
                                                selectedPokemon.id,
                                            )}
                                            alt={selectedPokemon.name}
                                            class="evo-sprite"
                                        />
                                        <span class="evo-name"
                                            >{selectedPokemon.name}</span
                                        >
                                    </div>
                                    {#each selectedPokemon.evolution as evo}
                                        {@const evoPokemon = pokedex.getPokemon(
                                            evo.pokemon,
                                        )}
                                        {#if evoPokemon}
                                            <div class="evo-arrow">
                                                <span class="evo-level"
                                                    >level {evo.level}</span
                                                >
                                                <span>→</span>
                                            </div>
                                            <div class="evo-pokemon">
                                                <img
                                                    src={pokedex.getSprite(
                                                        evo.pokemon,
                                                    )}
                                                    alt={evoPokemon.name}
                                                    class="evo-sprite"
                                                />
                                                <span class="evo-name"
                                                    >{evoPokemon.name}</span
                                                >
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                            {:else}
                                <p class="no-evo">
                                    This Pokémon does not evolve.
                                </p>
                            {/if}
                        </div>
                    </div>
                {:else if activeTab === "moves"}
                    <!-- MOVES Tab -->
                    <div class="moves-layout">
                        <div class="moves-table">
                            <div class="moves-header">
                                <span>Lvl</span>
                                <span>Name</span>
                                <span>Type</span>
                                <span>Cat.</span>
                                <span>Power</span>
                                <span>Acc.</span>
                                <span>PP</span>
                            </div>
                            <div class="moves-body">
                                {#each levelUpMoves as moveData}
                                    <div class="move-row">
                                        <span class="move-level"
                                            >{moveData.level}</span
                                        >
                                        <span class="move-name"
                                            >{moveData.name}</span
                                        >
                                        <span class="move-type">
                                            {#if moveData.move}
                                                <span
                                                    class="type-icon small"
                                                    style="background: {getTypeColor(
                                                        moveData.move.type,
                                                    )}"
                                                >
                                                    {moveData.move.type
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                            {/if}
                                        </span>
                                        <span class="move-category"
                                            >{moveData.move?.category ||
                                                "-"}</span
                                        >
                                        <span class="move-power"
                                            >{moveData.move?.power || "-"}</span
                                        >
                                        <span class="move-accuracy"
                                            >{moveData.move?.accuracy ||
                                                "-"}</span
                                        >
                                        <span class="move-pp"
                                            >{moveData.move?.pp || "-"}</span
                                        >
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Tab Bar -->
            <div class="tab-bar">
                <button
                    class="tab"
                    class:active={activeTab === "stats"}
                    on:click={() => (activeTab = "stats")}>STATS</button
                >
                <button
                    class="tab"
                    class:active={activeTab === "more"}
                    on:click={() => (activeTab = "more")}>MORE</button
                >
                <button
                    class="tab"
                    class:active={activeTab === "moves"}
                    on:click={() => (activeTab = "moves")}>MOVES</button
                >
            </div>
        </div>
    </div>
{:else}
    <!-- List View -->
    <div class="pokedex-overlay">
        <div class="pokedex-list">
            <button class="close-btn list-close" on:click={close}>✕</button>

            <!-- Filter Bar -->
            <div class="filter-bar">
                <select bind:value={selectedType} class="type-filter">
                    <option value="">Type</option>
                    {#each allTypes as type}
                        <option value={type}
                            >{type.charAt(0).toUpperCase() +
                                type.slice(1)}</option
                        >
                    {/each}
                </select>
                <input
                    type="text"
                    placeholder="Search"
                    bind:value={searchQuery}
                    class="search-input"
                />
            </div>

            <div class="list-content">
                <!-- Preview -->
                <div class="preview-panel">
                    {#if filteredPokemon.length > 0}
                        {@const previewPokemon = filteredPokemon[0]}
                        <img
                            src={pokedex.getSprite(previewPokemon.id)}
                            alt={previewPokemon.name}
                            class="preview-sprite"
                        />
                        <span class="preview-name"
                            >#{String(previewPokemon.id).padStart(3, "0")} – {previewPokemon.name}</span
                        >
                    {/if}
                </div>

                <!-- Pokemon List -->
                <div class="pokemon-list">
                    {#each filteredPokemon as pokemon}
                        {@const isSeen = pokedex.isSeen(pokemon.id)}
                        <button
                            class="pokemon-row"
                            class:unseen={!isSeen}
                            on:click={() => selectPokemon(pokemon)}
                        >
                            <span class="row-name"
                                >#{String(pokemon.id).padStart(3, "0")} – {isSeen
                                    ? pokemon.name
                                    : "???"}</span
                            >
                            <span class="row-arrow">▶</span>
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .pokedex-overlay {
        position: fixed;
        inset: 0;
        background: linear-gradient(
            135deg,
            #1a5276 0%,
            #2980b9 50%,
            #5dade2 100%
        );
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    /* ===== LIST VIEW ===== */
    .pokedex-list {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 20px;
        position: relative;
    }

    .list-close {
        position: absolute;
        top: 15px;
        left: 15px;
    }

    .close-btn {
        width: 40px;
        height: 40px;
        background: transparent;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.2s;
    }

    .close-btn:hover {
        opacity: 1;
    }

    .filter-bar {
        display: flex;
        justify-content: center;
        gap: 15px;
        padding: 10px 60px;
    }

    .type-filter {
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 5px;
        font-size: 1rem;
        cursor: pointer;
        min-width: 120px;
    }

    .search-input {
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 5px;
        font-size: 1rem;
        min-width: 200px;
    }

    .list-content {
        flex: 1;
        display: flex;
        margin-top: 20px;
        overflow: hidden;
    }

    .preview-panel {
        width: 40%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .preview-sprite {
        width: 250px;
        height: 250px;
        image-rendering: pixelated;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }

    .preview-name {
        margin-top: 20px;
        color: white;
        font-size: 1.2rem;
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
    }

    .pokemon-list {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        padding-right: 10px;
    }

    .pokemon-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.7),
            rgba(255, 255, 255, 0.9)
        );
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
    }

    .pokemon-row:hover {
        transform: translateX(-5px);
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.9),
            rgba(255, 255, 255, 1)
        );
    }

    .pokemon-row.unseen {
        opacity: 0.6;
    }

    .row-name {
        font-size: 1rem;
        font-weight: 500;
        color: #2c3e50;
    }

    .row-arrow {
        color: #3498db;
        font-size: 0.9rem;
    }

    /* ===== DETAIL VIEW ===== */
    .pokedex-detail {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .detail-header {
        display: flex;
        align-items: center;
        padding: 15px 20px;
    }

    .pokemon-name {
        flex: 1;
        text-align: center;
        color: white;
        font-size: 1.5rem;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        margin: 0;
    }

    .nav-arrows {
        display: flex;
        gap: 10px;
    }

    .nav-btn {
        width: 35px;
        height: 35px;
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.5);
        color: white;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .nav-btn:hover {
        background: rgba(255, 255, 255, 0.3);
    }

    .detail-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
    }

    /* STATS Layout */
    .stats-layout {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 30px;
        height: 100%;
        align-items: center;
    }

    .info-column {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .info-row {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .info-label {
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.9rem;
        font-weight: bold;
    }

    .info-value {
        color: white;
        font-size: 1.1rem;
    }

    .abilities {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .ability-badge {
        background: rgba(0, 0, 0, 0.4);
        color: white;
        padding: 5px 12px;
        border-radius: 4px;
        font-size: 0.85rem;
    }

    .types {
        display: flex;
        gap: 8px;
    }

    .type-badge {
        padding: 5px 12px;
        border-radius: 4px;
        color: white;
        font-size: 0.85rem;
        font-weight: bold;
    }

    .sprite-column {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .pokemon-sprite {
        width: 200px;
        height: 200px;
        image-rendering: pixelated;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }

    .stats-column {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .stat-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .stat-bar-container {
        flex: 1;
        height: 18px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
        overflow: hidden;
    }

    .stat-bar {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s;
    }

    .total-bar {
        background: linear-gradient(90deg, #1a5276, #5dade2);
    }

    .stat-value {
        width: 40px;
        color: white;
        font-weight: bold;
        text-align: right;
    }

    .stat-label {
        width: 60px;
        color: white;
        font-weight: bold;
        text-align: right;
    }

    /* MORE Layout */
    .more-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        height: 100%;
    }

    .weakness-section h3,
    .evolution-section h3 {
        color: white;
        margin-bottom: 20px;
        font-size: 1.2rem;
    }

    .effectiveness-row {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    .multiplier {
        width: 50px;
        color: white;
        font-weight: bold;
    }

    .type-list {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .type-icon {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-weight: bold;
        font-size: 0.9rem;
    }

    .type-icon.small {
        width: 24px;
        height: 24px;
        font-size: 0.75rem;
    }

    .evolution-section {
        display: flex;
        flex-direction: column;
    }

    .evolution-chain {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
    }

    .evo-pokemon {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }

    .evo-sprite {
        width: 120px;
        height: 120px;
        image-rendering: pixelated;
    }

    .evo-name {
        color: white;
        font-size: 0.9rem;
    }

    .evo-arrow {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: white;
        font-size: 1.5rem;
    }

    .evo-level {
        font-size: 0.75rem;
        opacity: 0.8;
    }

    .no-evo {
        color: rgba(255, 255, 255, 0.7);
        font-style: italic;
    }

    /* MOVES Layout */
    .moves-layout {
        height: 100%;
        overflow: hidden;
    }

    .moves-table {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        overflow: hidden;
    }

    .moves-header {
        display: grid;
        grid-template-columns: 50px 1fr 80px 120px 120px 90px 50px;
        padding: 15px 20px;
        background: rgba(0, 0, 0, 0.3);
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.85rem;
        font-weight: bold;
    }

    .moves-body {
        max-height: 400px;
        overflow-y: auto;
    }

    .move-row {
        display: grid;
        grid-template-columns: 50px 1fr 80px 120px 120px 90px 50px;
        padding: 12px 20px;
        color: white;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .move-row:nth-child(odd) {
        background: rgba(0, 0, 0, 0.15);
    }

    .move-level {
        color: rgba(255, 255, 255, 0.7);
    }

    .move-name {
        font-weight: 500;
    }

    /* Tab Bar */
    .tab-bar {
        display: flex;
        justify-content: center;
        gap: 10px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.2);
    }

    .tab {
        padding: 10px 30px;
        background: transparent;
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: rgba(255, 255, 255, 0.7);
        border-radius: 20px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s;
    }

    .tab:hover {
        border-color: rgba(255, 255, 255, 0.5);
        color: white;
    }

    .tab.active {
        background: linear-gradient(135deg, #f39c12, #e67e22);
        border-color: transparent;
        color: white;
        box-shadow: 0 2px 10px rgba(243, 156, 18, 0.4);
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
        /* List View */
        .pokedex-list {
            padding: 15px;
        }

        .list-close {
            top: 10px;
            left: 10px;
        }

        .close-btn {
            width: 36px;
            height: 36px;
            font-size: 1.2rem;
        }

        .filter-bar {
            flex-direction: column;
            padding: 10px;
            gap: 10px;
        }

        .type-filter,
        .search-input {
            width: 100%;
            min-width: unset;
        }

        .list-content {
            flex-direction: column;
            margin-top: 10px;
        }

        .preview-panel {
            display: none; /* Hide preview on mobile */
        }

        .pokemon-list {
            flex: 1;
            padding-right: 0;
        }

        .pokemon-row {
            padding: 12px 15px;
        }

        .row-name {
            font-size: 0.9rem;
        }

        /* Detail View */
        .detail-header {
            padding: 10px 15px;
        }

        .pokemon-name {
            font-size: 1.2rem;
        }

        .nav-btn {
            width: 32px;
            height: 32px;
            font-size: 0.9rem;
        }

        .detail-content {
            padding: 15px;
        }

        /* Stats Layout - Single Column */
        .stats-layout {
            grid-template-columns: 1fr;
            gap: 20px;
        }

        .info-column {
            order: 2;
            gap: 12px;
        }

        .sprite-column {
            order: 1;
        }

        .pokemon-sprite {
            width: 150px;
            height: 150px;
        }

        .stats-column {
            order: 3;
            gap: 8px;
        }

        .stat-bar-container {
            height: 14px;
        }

        .stat-value {
            width: 35px;
            font-size: 0.9rem;
        }

        .stat-label {
            width: 50px;
            font-size: 0.85rem;
        }

        /* More Layout */
        .more-layout {
            grid-template-columns: 1fr;
            gap: 25px;
        }

        .weakness-section h3,
        .evolution-section h3 {
            font-size: 1rem;
            margin-bottom: 12px;
        }

        .type-icon {
            width: 26px;
            height: 26px;
            font-size: 0.8rem;
        }

        .evo-sprite {
            width: 80px;
            height: 80px;
        }

        .evo-name {
            font-size: 0.8rem;
        }

        .evo-arrow {
            font-size: 1.2rem;
        }

        /* Moves Layout */
        .moves-table {
            overflow-x: auto;
        }

        .moves-header {
            grid-template-columns: 40px 1fr 50px 50px 50px 50px 40px;
            padding: 10px 12px;
            font-size: 0.7rem;
            min-width: 380px;
        }

        .move-row {
            grid-template-columns: 40px 1fr 50px 50px 50px 50px 40px;
            padding: 10px 12px;
            font-size: 0.8rem;
            min-width: 380px;
        }

        /* Tab Bar */
        .tab-bar {
            padding: 12px;
            gap: 8px;
        }

        .tab {
            padding: 10px 20px;
            font-size: 0.85rem;
            min-height: 44px;
        }
    }

    @media (max-width: 480px) {
        .pokedex-list {
            padding: 10px;
        }

        .list-close {
            top: 8px;
            left: 8px;
        }

        .close-btn {
            width: 32px;
            height: 32px;
            font-size: 1rem;
        }

        .filter-bar {
            padding: 8px;
        }

        .type-filter,
        .search-input {
            padding: 8px 12px;
            font-size: 0.9rem;
        }

        .pokemon-row {
            padding: 10px 12px;
        }

        .row-name {
            font-size: 0.85rem;
        }

        .detail-header {
            padding: 8px 12px;
        }

        .pokemon-name {
            font-size: 1rem;
        }

        .detail-content {
            padding: 10px;
        }

        .pokemon-sprite {
            width: 120px;
            height: 120px;
        }

        .info-row {
            gap: 3px;
        }

        .info-label {
            font-size: 0.8rem;
        }

        .info-value {
            font-size: 0.95rem;
        }

        .ability-badge {
            padding: 4px 8px;
            font-size: 0.75rem;
        }

        .type-badge {
            padding: 4px 8px;
            font-size: 0.75rem;
        }

        .stat-bar-container {
            height: 12px;
        }

        .stat-value {
            width: 30px;
            font-size: 0.8rem;
        }

        .stat-label {
            width: 45px;
            font-size: 0.75rem;
        }

        .type-icon {
            width: 22px;
            height: 22px;
            font-size: 0.7rem;
        }

        .evo-sprite {
            width: 60px;
            height: 60px;
        }

        .tab-bar {
            padding: 10px;
            gap: 5px;
        }

        .tab {
            padding: 8px 15px;
            font-size: 0.75rem;
        }
    }
</style>
