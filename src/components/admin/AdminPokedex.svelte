<script lang="ts">
    import { onMount } from "svelte";
    import { authStore } from "../../lib/stores/authStore";
    import {
        adminDataStore,
        type MoveEdit,
    } from "../../lib/stores/adminDataStore";
    import { pokedex } from "../../lib/data/pokedex";
    import { getMove } from "../../lib/data/moves";

    // State
    let searchQuery = "";
    let selectedPokemonId: number | null = null;
    let editTab: "stats" | "types" | "moves" = "stats";
    let googleButtonRef: HTMLDivElement;
    let refreshKey = 0; // Used to force reactivity

    // Get all Pokemon
    $: allPokemon = pokedex.getAllPokemon();
    $: filteredPokemon = searchQuery
        ? allPokemon.filter(
              (p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.id.toString().includes(searchQuery),
          )
        : allPokemon;

    // Get selected Pokemon data (with edits applied) - refreshKey forces re-evaluation
    $: selectedPokemon = (refreshKey, selectedPokemonId)
        ? adminDataStore.getEditedPokemon(selectedPokemonId!)
        : null;

    // Initialize on mount
    onMount(async () => {
        await authStore.init();
        adminDataStore.init();

        // Render Google Sign-In button when needed
        const unsubscribe = authStore.subscribe((state) => {
            if (state.isInitialized && !state.isLoggedIn && googleButtonRef) {
                setTimeout(() => {
                    authStore.renderButton(googleButtonRef);
                }, 100);
            }
        });

        return unsubscribe;
    });

    // Type colors for badges
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

    // Stat change handler
    function handleStatChange(statKey: string, value: number) {
        if (!selectedPokemonId) return;
        adminDataStore.updatePokemon(selectedPokemonId, {
            stats: { [statKey]: value },
        });
        // Force reactivity
        selectedPokemonId = selectedPokemonId;
    }

    // Type change handler
    function handleTypeChange(index: number, newType: string) {
        if (!selectedPokemon) return;
        const newTypes = [...selectedPokemon.types];
        newTypes[index] = newType;
        adminDataStore.updatePokemon(selectedPokemonId!, { types: newTypes });
        selectedPokemonId = selectedPokemonId;
    }

    // Add type
    function addType() {
        if (!selectedPokemon || selectedPokemon.types.length >= 2) return;
        const newTypes = [...selectedPokemon.types, "normal"];
        adminDataStore.updatePokemon(selectedPokemonId!, { types: newTypes });
        selectedPokemonId = selectedPokemonId;
    }

    // Remove type
    function removeType(index: number) {
        if (!selectedPokemon || selectedPokemon.types.length <= 1) return;
        const newTypes = selectedPokemon.types.filter(
            (_: string, i: number) => i !== index,
        );
        adminDataStore.updatePokemon(selectedPokemonId!, { types: newTypes });
        selectedPokemonId = selectedPokemonId;
    }

    // Toggle treeSkill on a move
    function toggleTreeSkill(moveName: string) {
        if (!selectedPokemonId) return;
        const move = selectedPokemon.moves.find(
            (m: MoveEdit) => m.name === moveName,
        );
        if (move) {
            adminDataStore.updateMove(selectedPokemonId, moveName, {
                treeSkill: !move.treeSkill,
            });
            refreshKey++;
        }
    }

    // Branch options for skill tree assignment
    const branches = ["hp", "atk", "def", "spAtk", "spDef", "speed"] as const;

    // Computed: Get all used slots for current Pokemon
    $: usedSlots =
        selectedPokemon?.moves?.reduce(
            (map: Map<string, string>, move: MoveEdit) => {
                if (move.skillTreeSlot) {
                    const key = `${move.skillTreeSlot.branch}-${move.skillTreeSlot.slotIndex}`;
                    map.set(key, move.name);
                }
                return map;
            },
            new Map<string, string>(),
        ) || new Map<string, string>();

    // Set skill tree slot for a move with conflict check
    function setTreeSlot(moveName: string, branch: string, slotIndex: number) {
        if (!selectedPokemonId) return;

        const slotKey = `${branch}-${slotIndex}`;
        const existingMove = usedSlots.get(slotKey);

        if (existingMove && existingMove !== moveName) {
            if (
                !confirm(
                    `Slot "${branch} #${slotIndex}" is already assigned to "${existingMove}". Override?`,
                )
            ) {
                return;
            }
            // Clear the slot from the existing move
            adminDataStore.updateMove(selectedPokemonId, existingMove, {
                skillTreeSlot: undefined,
            });
        }

        adminDataStore.updateMove(selectedPokemonId, moveName, {
            skillTreeSlot: {
                branch: branch as MoveEdit["skillTreeSlot"]["branch"],
                slotIndex,
            },
        });
        refreshKey++;
    }

    // Clear skill tree slot
    function clearTreeSlot(moveName: string) {
        if (!selectedPokemonId) return;
        adminDataStore.updateMove(selectedPokemonId, moveName, {
            skillTreeSlot: undefined,
        });
        refreshKey++;
    }

    // Get category color
    function getCategoryColor(category: string): string {
        switch (category?.toLowerCase()) {
            case "physical":
                return "#e74c3c";
            case "special":
                return "#9b59b6";
            case "status":
                return "#7f8c8d";
            default:
                return "#555";
        }
    }

    // Get category icon
    function getCategoryIcon(category: string): string {
        switch (category?.toLowerCase()) {
            case "physical":
                return "💥";
            case "special":
                return "✨";
            case "status":
                return "📊";
            default:
                return "❓";
        }
    }

    // Compute starter count
    $: starterCount =
        (refreshKey,
        allPokemon.filter((p) => {
            const edited = adminDataStore.getEditedPokemon(p.id);
            return edited?.starter === true;
        }).length);

    // Get starters list
    $: starters =
        (refreshKey,
        allPokemon
            .filter((p) => {
                const edited = adminDataStore.getEditedPokemon(p.id);
                return edited?.starter === true;
            })
            .map((p) => p.name));

    // Toggle starter status
    function toggleStarter() {
        if (!selectedPokemonId || !selectedPokemon) return;

        const currentValue = selectedPokemon.starter === true;

        // If trying to add and already at max 3
        if (!currentValue && starterCount >= 3) {
            alert(
                `Maximum 3 starters allowed! Current starters: ${starters.join(", ")}`,
            );
            return;
        }

        adminDataStore.updatePokemon(selectedPokemonId, {
            starter: !currentValue,
        });
        refreshKey++;
    }

    // All types for dropdown
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
</script>

<div class="admin-container">
    {#if !$authStore.isInitialized}
        <div class="loading">
            <h2>Loading...</h2>
        </div>
    {:else if !$authStore.isLoggedIn}
        <div class="login-screen">
            <h1>🔒 Admin Panel</h1>
            <p>Sign in with Google to access the Pokedex editor</p>
            <div class="google-btn-container" bind:this={googleButtonRef}></div>
        </div>
    {:else if !$authStore.isAdmin}
        <div class="access-denied">
            <h1>⛔ Access Denied</h1>
            <p>You are logged in as {$authStore.user?.email}</p>
            <p>This admin panel is restricted to authorized users only.</p>
            <button on:click={() => authStore.signOut()}>Sign Out</button>
        </div>
    {:else}
        <!-- Admin Panel -->
        <header class="admin-header">
            <h1>🎮 Pokedex Admin</h1>
            <div class="header-actions">
                <span class="edit-count">
                    {adminDataStore.getEditCount()} Pokémon modified
                </span>
                <button
                    class="export-btn"
                    on:click={() => adminDataStore.downloadJson()}
                >
                    📥 Export JSON
                </button>
                <button
                    class="clear-btn"
                    on:click={() => {
                        if (confirm("Clear all edits?"))
                            adminDataStore.clearEdits();
                    }}
                >
                    🗑️ Clear
                </button>
                <div class="user-info">
                    <img src={$authStore.user?.picture} alt="" class="avatar" />
                    <button on:click={() => authStore.signOut()}
                        >Sign Out</button
                    >
                </div>
            </div>
        </header>

        <div class="admin-content">
            <!-- Pokemon List -->
            <aside class="pokemon-list">
                <input
                    type="text"
                    placeholder="Search Pokémon..."
                    bind:value={searchQuery}
                    class="search-input"
                />
                <div class="list-scroll">
                    {#each filteredPokemon as pokemon}
                        {@const pokemonData = adminDataStore.getEditedPokemon(
                            pokemon.id,
                        )}
                        <button
                            class="pokemon-item"
                            class:selected={selectedPokemonId === pokemon.id}
                            class:is-starter={pokemonData?.starter === true}
                            on:click={() => (selectedPokemonId = pokemon.id)}
                        >
                            {#if pokemonData?.starter}
                                <span class="starter-star">⭐</span>
                            {/if}
                            <img
                                src={pokedex.getSprite(pokemon.id, "front")}
                                alt={pokemon.name}
                                class="pokemon-sprite"
                            />
                            <span class="pokemon-name">
                                #{pokemon.id.toString().padStart(3, "0")}
                                {pokemon.name}
                            </span>
                            <div class="pokemon-types">
                                {#each pokemon.types as type}
                                    <span
                                        class="type-badge"
                                        style="background: {getTypeColor(type)}"
                                        >{type}</span
                                    >
                                {/each}
                            </div>
                        </button>
                    {/each}
                </div>
            </aside>

            <!-- Pokemon Editor -->
            {#if selectedPokemon}
                <main class="pokemon-editor">
                    <div class="editor-header">
                        <img
                            src={pokedex.getSprite(selectedPokemon.id, "front")}
                            alt={selectedPokemon.name}
                            class="editor-sprite"
                        />
                        <div class="editor-title">
                            <h2>{selectedPokemon.name}</h2>
                            <span class="pokemon-id"
                                >#{selectedPokemon.id
                                    .toString()
                                    .padStart(3, "0")}</span
                            >
                        </div>
                        <button
                            class="starter-toggle"
                            class:active={selectedPokemon.starter === true}
                            on:click={toggleStarter}
                            title={starterCount >= 3 && !selectedPokemon.starter
                                ? `Max 3 starters (${starters.join(", ")})`
                                : "Toggle as game starter"}
                        >
                            {#if selectedPokemon.starter}
                                ⭐ STARTER
                            {:else}
                                ☆ Set Starter ({starterCount}/3)
                            {/if}
                        </button>
                    </div>

                    <nav class="editor-tabs">
                        <button
                            class:active={editTab === "stats"}
                            on:click={() => (editTab = "stats")}>Stats</button
                        >
                        <button
                            class:active={editTab === "types"}
                            on:click={() => (editTab = "types")}>Types</button
                        >
                        <button
                            class:active={editTab === "moves"}
                            on:click={() => (editTab = "moves")}
                            >Moves ({selectedPokemon.moves?.length ||
                                0})</button
                        >
                    </nav>

                    <div class="editor-content">
                        {#if editTab === "stats"}
                            <div class="stats-editor">
                                {#each [{ key: "hp", label: "HP", color: "#ef4444" }, { key: "attack", label: "Attack", color: "#f97316" }, { key: "defense", label: "Defense", color: "#eab308" }, { key: "specialAttack", label: "Sp. Atk", color: "#3b82f6" }, { key: "specialDefense", label: "Sp. Def", color: "#22c55e" }, { key: "speed", label: "Speed", color: "#ec4899" }] as stat}
                                    <div class="stat-row">
                                        <label style="color: {stat.color}"
                                            >{stat.label}</label
                                        >
                                        <input
                                            type="number"
                                            min="1"
                                            max="255"
                                            value={selectedPokemon.stats[
                                                stat.key
                                            ]}
                                            on:change={(e) =>
                                                handleStatChange(
                                                    stat.key,
                                                    parseInt(
                                                        e.currentTarget.value,
                                                    ),
                                                )}
                                        />
                                        <div class="stat-bar">
                                            <div
                                                class="stat-fill"
                                                style="width: {Math.min(
                                                    100,
                                                    selectedPokemon.stats[
                                                        stat.key
                                                    ] / 2.55,
                                                )}%; background: {stat.color}"
                                            ></div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else if editTab === "types"}
                            <div class="types-editor">
                                {#each selectedPokemon.types as type, index}
                                    <div class="type-row">
                                        <select
                                            value={type}
                                            on:change={(e) =>
                                                handleTypeChange(
                                                    index,
                                                    e.currentTarget.value,
                                                )}
                                        >
                                            {#each allTypes as t}
                                                <option value={t}
                                                    >{t
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        t.slice(1)}</option
                                                >
                                            {/each}
                                        </select>
                                        <span
                                            class="type-preview"
                                            style="background: {getTypeColor(
                                                type,
                                            )}">{type.toUpperCase()}</span
                                        >
                                        {#if selectedPokemon.types.length > 1}
                                            <button
                                                class="remove-type-btn"
                                                on:click={() =>
                                                    removeType(index)}>✕</button
                                            >
                                        {/if}
                                    </div>
                                {/each}
                                {#if selectedPokemon.types.length < 2}
                                    <button
                                        class="add-type-btn"
                                        on:click={addType}
                                        >+ Add Second Type</button
                                    >
                                {/if}
                            </div>
                        {:else if editTab === "moves"}
                            <div class="moves-editor">
                                <!-- Show assigned slots summary -->
                                {#if usedSlots.size > 0}
                                    <div class="assigned-slots-summary">
                                        <h4>
                                            🌳 Assigned Tree Slots ({usedSlots.size})
                                        </h4>
                                        <div class="slot-chips">
                                            {#each Array.from(usedSlots.entries()) as [slot, moveName]}
                                                <span class="slot-chip">
                                                    <strong>{slot}</strong>: {moveName}
                                                </span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}

                                {#each selectedPokemon.moves || [] as move}
                                    {@const moveData = getMove(
                                        move.name
                                            .toLowerCase()
                                            .replace(/-/g, "_"),
                                    )}
                                    <div
                                        class="move-row"
                                        class:tree-skill={move.treeSkill}
                                        class:has-slot={move.skillTreeSlot}
                                    >
                                        <div class="move-info">
                                            <div class="move-name-row">
                                                <span class="move-name"
                                                    >{move.name}</span
                                                >
                                                {#if moveData}
                                                    <span
                                                        class="move-category"
                                                        style="background: {getCategoryColor(
                                                            moveData.category,
                                                        )}"
                                                        title={moveData.category}
                                                        >{getCategoryIcon(
                                                            moveData.category,
                                                        )}
                                                        {moveData.category}</span
                                                    >
                                                {/if}
                                            </div>
                                            <div class="move-details">
                                                <span class="move-level"
                                                    >Lv.{move.level}</span
                                                >
                                                {#if moveData}
                                                    <span
                                                        class="move-type"
                                                        style="background: {getTypeColor(
                                                            moveData.type,
                                                        )}"
                                                        >{moveData.type}</span
                                                    >
                                                    <span class="move-power">
                                                        {moveData.power
                                                            ? `⚔️ ${moveData.power}`
                                                            : "—"}
                                                    </span>
                                                    <span class="move-accuracy">
                                                        {moveData.accuracy
                                                            ? `🎯 ${moveData.accuracy}%`
                                                            : "—"}
                                                    </span>
                                                {/if}
                                            </div>
                                            {#if moveData?.description}
                                                <div
                                                    class="move-description"
                                                    title={moveData.description}
                                                >
                                                    {moveData.description.slice(
                                                        0,
                                                        80,
                                                    )}{moveData.description
                                                        .length > 80
                                                        ? "..."
                                                        : ""}
                                                </div>
                                            {/if}
                                        </div>
                                        <div class="move-actions">
                                            <label class="tree-skill-toggle">
                                                <input
                                                    type="checkbox"
                                                    checked={move.treeSkill ||
                                                        false}
                                                    on:change={() =>
                                                        toggleTreeSkill(
                                                            move.name,
                                                        )}
                                                />
                                                ⭐ Priority
                                            </label>
                                            <div class="tree-slot">
                                                {#if move.skillTreeSlot}
                                                    <span
                                                        class="slot-badge assigned"
                                                    >
                                                        📍 {move.skillTreeSlot
                                                            .branch} #{move
                                                            .skillTreeSlot
                                                            .slotIndex}
                                                    </span>
                                                    <button
                                                        class="clear-slot"
                                                        on:click={() =>
                                                            clearTreeSlot(
                                                                move.name,
                                                            )}>✕</button
                                                    >
                                                {:else}
                                                    <select
                                                        on:change={(e) => {
                                                            const [
                                                                branch,
                                                                slot,
                                                            ] =
                                                                e.currentTarget.value.split(
                                                                    "-",
                                                                );
                                                            if (branch)
                                                                setTreeSlot(
                                                                    move.name,
                                                                    branch,
                                                                    parseInt(
                                                                        slot,
                                                                    ),
                                                                );
                                                        }}
                                                    >
                                                        <option value=""
                                                            >📍 Assign slot...</option
                                                        >
                                                        {#each branches as branch}
                                                            <optgroup
                                                                label={branch.toUpperCase()}
                                                            >
                                                                {#each [0, 1, 2] as slot}
                                                                    {@const slotKey = `${branch}-${slot}`}
                                                                    {@const isUsed =
                                                                        usedSlots.has(
                                                                            slotKey,
                                                                        )}
                                                                    <option
                                                                        value="{branch}-{slot}"
                                                                        class:used={isUsed}
                                                                    >
                                                                        {branch}
                                                                        #{slot}
                                                                        {isUsed
                                                                            ? `(${usedSlots.get(slotKey)})`
                                                                            : ""}
                                                                    </option>
                                                                {/each}
                                                            </optgroup>
                                                        {/each}
                                                    </select>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                                {#if !selectedPokemon.moves?.length}
                                    <p class="no-moves">
                                        No moves defined for this Pokémon
                                    </p>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </main>
            {:else}
                <div class="no-selection">
                    <h2>Select a Pokémon</h2>
                    <p>Choose a Pokémon from the list to edit its data</p>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .admin-container {
        width: 100vw;
        height: 100vh;
        background: #1a1a2e;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        display: flex;
        flex-direction: column;
    }

    /* Loading & Login Screens */
    .loading,
    .login-screen,
    .access-denied {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 20px;
    }

    .login-screen h1,
    .access-denied h1 {
        font-size: 2.5rem;
        margin: 0;
    }

    .login-screen p,
    .access-denied p {
        color: #888;
        margin: 0;
    }

    .google-btn-container {
        margin-top: 20px;
    }

    .access-denied button {
        padding: 10px 30px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
    }

    /* Header */
    .admin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 25px;
        background: #16213e;
        border-bottom: 2px solid #0f3460;
    }

    .admin-header h1 {
        margin: 0;
        font-size: 1.5rem;
    }

    .header-actions {
        display: flex;
        gap: 15px;
        align-items: center;
    }

    .edit-count {
        color: #f39c12;
        font-weight: bold;
    }

    .export-btn {
        padding: 8px 16px;
        background: #27ae60;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
    }

    .clear-btn {
        padding: 8px 16px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
    }

    .user-info button {
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        cursor: pointer;
    }

    /* Content Layout */
    .admin-content {
        flex: 1;
        display: flex;
        overflow: hidden;
    }

    /* Pokemon List */
    .pokemon-list {
        width: 320px;
        background: #0f3460;
        display: flex;
        flex-direction: column;
        border-right: 2px solid #1a1a2e;
    }

    .search-input {
        padding: 12px 15px;
        background: #16213e;
        border: none;
        border-bottom: 1px solid #1a1a2e;
        color: white;
        font-size: 1rem;
    }

    .search-input::placeholder {
        color: #666;
    }

    .list-scroll {
        flex: 1;
        overflow-y: auto;
    }

    .pokemon-item {
        width: 100%;
        padding: 10px 15px;
        background: transparent;
        border: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        color: white;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        text-align: left;
        position: relative;
    }

    .pokemon-item:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .pokemon-item.selected {
        background: #3498db;
    }

    .pokemon-sprite {
        width: 40px;
        height: 40px;
        image-rendering: pixelated;
    }

    .pokemon-name {
        flex: 1;
        font-weight: 500;
    }

    .pokemon-types {
        display: flex;
        gap: 4px;
    }

    .type-badge {
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.65rem;
        font-weight: bold;
        text-transform: uppercase;
    }

    .pokemon-item.is-starter {
        border-left: 3px solid #f39c12;
        background: rgba(243, 156, 18, 0.1);
    }

    .starter-star {
        position: absolute;
        top: 4px;
        right: 8px;
        font-size: 0.9rem;
    }

    /* Editor */
    .pokemon-editor {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #16213e;
    }

    .editor-header {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 20px;
        background: #1a1a2e;
        border-bottom: 2px solid #0f3460;
    }

    .editor-sprite {
        width: 96px;
        height: 96px;
        image-rendering: pixelated;
    }

    .editor-title h2 {
        margin: 0;
        font-size: 1.8rem;
        text-transform: capitalize;
    }

    .pokemon-id {
        color: #888;
        font-size: 1rem;
    }

    .starter-toggle {
        padding: 8px 16px;
        background: #1a1a2e;
        border: 2px solid #444;
        border-radius: 6px;
        color: #888;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        margin-left: auto;
    }

    .starter-toggle:hover {
        border-color: #f39c12;
        color: #f39c12;
    }

    .starter-toggle.active {
        background: rgba(243, 156, 18, 0.2);
        border-color: #f39c12;
        color: #f39c12;
    }

    .editor-tabs {
        display: flex;
        background: #0f3460;
    }

    .editor-tabs button {
        flex: 1;
        padding: 12px;
        background: transparent;
        border: none;
        color: #888;
        font-weight: bold;
        cursor: pointer;
        border-bottom: 3px solid transparent;
    }

    .editor-tabs button.active {
        color: white;
        border-bottom-color: #3498db;
    }

    .editor-content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
    }

    /* Stats Editor */
    .stats-editor {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .stat-row {
        display: grid;
        grid-template-columns: 100px 80px 1fr;
        align-items: center;
        gap: 15px;
    }

    .stat-row label {
        font-weight: bold;
    }

    .stat-row input {
        padding: 8px;
        background: #1a1a2e;
        border: 1px solid #0f3460;
        border-radius: 4px;
        color: white;
        text-align: center;
        font-size: 1rem;
    }

    .stat-bar {
        height: 20px;
        background: #1a1a2e;
        border-radius: 4px;
        overflow: hidden;
    }

    .stat-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s;
    }

    /* Types Editor */
    .types-editor {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .type-row {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .type-row select {
        padding: 10px;
        background: #1a1a2e;
        border: 1px solid #0f3460;
        border-radius: 4px;
        color: white;
        font-size: 1rem;
    }

    .type-preview {
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 0.8rem;
    }

    .remove-type-btn {
        padding: 5px 10px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .add-type-btn {
        padding: 10px 20px;
        background: #27ae60;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        align-self: flex-start;
    }

    /* Moves Editor */
    .moves-editor {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .assigned-slots-summary {
        background: rgba(52, 152, 219, 0.1);
        border: 1px solid rgba(52, 152, 219, 0.3);
        border-radius: 8px;
        padding: 12px 15px;
        margin-bottom: 10px;
    }

    .assigned-slots-summary h4 {
        margin: 0 0 10px 0;
        color: #3498db;
        font-size: 0.9rem;
    }

    .slot-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .slot-chip {
        padding: 4px 10px;
        background: #3498db;
        border-radius: 4px;
        font-size: 0.75rem;
    }

    .move-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 12px 15px;
        background: #1a1a2e;
        border-radius: 6px;
        border: 1px solid #0f3460;
        gap: 15px;
    }

    .move-row.tree-skill {
        border-color: #f39c12;
        background: rgba(243, 156, 18, 0.1);
    }

    .move-row.has-slot {
        border-left: 4px solid #3498db;
    }

    .move-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
    }

    .move-name-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .move-name {
        font-weight: bold;
        text-transform: capitalize;
        font-size: 1rem;
    }

    .move-category {
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 0.7rem;
        font-weight: bold;
        color: white;
    }

    .move-details {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .move-level {
        color: #888;
        font-size: 0.85rem;
    }

    .move-type {
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 0.7rem;
        font-weight: bold;
        text-transform: uppercase;
    }

    .move-power,
    .move-accuracy {
        color: #aaa;
        font-size: 0.8rem;
    }

    .move-description {
        color: #666;
        font-size: 0.75rem;
        font-style: italic;
        line-height: 1.3;
        max-width: 400px;
    }

    .move-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
    }

    .tree-skill-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        color: #f39c12;
    }

    .tree-slot {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .tree-slot select {
        padding: 5px 8px;
        background: #0f3460;
        border: 1px solid #16213e;
        border-radius: 4px;
        color: white;
        font-size: 0.8rem;
    }

    .tree-slot select option.used {
        color: #f39c12;
    }

    .tree-slot select optgroup {
        color: #888;
    }

    .slot-badge {
        padding: 4px 10px;
        background: #3498db;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: bold;
    }

    .slot-badge.assigned {
        background: #27ae60;
    }

    .clear-slot {
        padding: 3px 6px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.8rem;
    }

    .no-moves {
        color: #888;
        text-align: center;
        padding: 40px;
    }

    /* No Selection */
    .no-selection {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: #666;
    }

    .no-selection h2 {
        margin: 0;
        color: #888;
    }
</style>
