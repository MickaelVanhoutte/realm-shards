<script lang="ts">
    import { gameState } from "../../lib/stores/gameState";
    import { trainerStore } from "../../lib/stores/trainerStore";
    import { saveStore } from "../../lib/stores/saveStore";
    import { CREATURE_SPECIES, createCreature } from "../../lib/data/creatures";
    import SaveLoadMenu from "./SaveLoadMenu.svelte";

    let showLoadMenu = false;
    let showStarterSelect = false;
    let playerName = "Trainer";

    // Get starters from species with isStarter flag, fallback to defaults if none defined
    const DEFAULT_STARTERS = ["helioptile", "jynx", "gastly"];
    $: STARTERS = Object.values(CREATURE_SPECIES)
        .filter((s) => s.isStarter)
        .map((s) => s.id);
    $: activeStarters = STARTERS.length >= 3 ? STARTERS : DEFAULT_STARTERS;

    $: hasSaves = $saveStore.some((s) => !s.isEmpty);

    function showNewGame() {
        showStarterSelect = true;
    }

    function selectStarter(speciesId: string) {
        trainerStore.initTrainer(playerName, speciesId);
        gameState.setScreen("exploration");
    }

    function handleLoad() {
        showLoadMenu = false;
    }
</script>

<div class="title-screen">
    <div class="title-content">
        <div class="logo">
            <span class="shard">◆</span>
        </div>
        <h1 class="title">Realm Shards</h1>
        <p class="subtitle">A Tale of Crystals and Creatures</p>

        {#if !showStarterSelect}
            <div class="menu">
                <button class="menu-button" on:click={showNewGame}>
                    New Game
                </button>
                <button
                    class="menu-button"
                    disabled={!hasSaves}
                    on:click={() => (showLoadMenu = true)}
                >
                    Continue
                </button>
                <button class="menu-button" disabled> Options </button>
            </div>
        {:else}
            <div class="starter-select">
                <h2>Choose your first creature!</h2>
                <div class="starter-grid">
                    {#each activeStarters as speciesId}
                        {@const species = CREATURE_SPECIES[speciesId]}
                        {#if species}
                            <button
                                class="starter-btn"
                                on:click={() => selectStarter(speciesId)}
                            >
                                <img
                                    src={species.sprite.front}
                                    alt={species.name}
                                    class="starter-sprite"
                                />
                                <span class="starter-name">{species.name}</span>
                                <span class="starter-type"
                                    >{species.types.join("/")}</span
                                >
                            </button>
                        {/if}
                    {/each}
                </div>
                <button
                    class="back-btn"
                    on:click={() => (showStarterSelect = false)}
                >
                    ← Back
                </button>
            </div>
        {/if}

        <p class="version">v0.4.0 - Creature Battle System</p>
    </div>

    <div class="particles">
        {#each Array(20) as _, i}
            <span
                class="particle"
                style="
          --delay: {Math.random() * 5}s;
          --x: {Math.random() * 100}%;
          --duration: {3 + Math.random() * 4}s;
        ">◇</span
            >
        {/each}
    </div>
</div>

{#if showLoadMenu}
    <SaveLoadMenu
        mode="load"
        on:close={() => (showLoadMenu = false)}
        on:load={handleLoad}
    />
{/if}

<style>
    .starter-select {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-md);
    }

    .starter-select h2 {
        color: var(--primary);
        margin: 0;
    }

    .starter-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-md);
    }

    .starter-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-xs);
        padding: var(--space-md);
        background: var(--bg-medium);
        border: 2px solid var(--bg-light);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
    }

    .starter-btn:hover {
        background: var(--primary);
        border-color: var(--primary);
        transform: translateY(-4px);
    }

    .starter-sprite {
        width: 64px;
        height: 64px;
        object-fit: contain;
        image-rendering: pixelated;
    }

    .starter-name {
        color: var(--text-primary);
        font-weight: bold;
        font-family: var(--font-pixel);
    }

    .starter-type {
        color: var(--text-muted);
        font-size: var(--font-size-xs);
        text-transform: capitalize;
    }

    .back-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: var(--space-sm);
    }

    .back-btn:hover {
        color: var(--text-primary);
    }

    .title-screen {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: linear-gradient(
            180deg,
            #0d1117 0%,
            #161b22 50%,
            #1a1f2e 100%
        );
        position: relative;
        overflow: hidden;
        padding: var(--space-lg);
    }

    .title-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-md);
        z-index: 10;
        text-align: center;
    }

    .logo {
        font-size: clamp(48px, 15vw, 64px);
        animation: float 3s ease-in-out infinite;
    }

    .shard {
        color: var(--primary);
        text-shadow:
            0 0 20px var(--primary),
            0 0 40px var(--primary),
            0 0 60px var(--accent);
        display: inline-block;
    }

    .title {
        font-size: var(--font-size-title);
        color: var(--text-primary);
        text-shadow:
            3px 3px 0 var(--bg-dark),
            0 0 30px rgba(233, 69, 96, 0.5);
        letter-spacing: clamp(1px, 0.5vw, 4px);
        text-transform: uppercase;
    }

    .subtitle {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        letter-spacing: 1px;
    }

    .menu {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        margin-top: var(--space-lg);
        width: 100%;
        max-width: 280px;
    }

    .menu-button {
        font-family: var(--font-pixel);
        font-size: var(--font-size-base);
        padding: var(--space-md) var(--space-lg);
        min-height: var(--touch-min);
        width: 100%;
        background: var(--bg-panel);
        color: var(--text-primary);
        border: 2px solid var(--primary);
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
    }

    .menu-button::before {
        content: "▶";
        position: absolute;
        left: var(--space-sm);
        opacity: 0;
        transition: opacity 0.2s;
    }

    .menu-button:hover:not(:disabled),
    .menu-button:active:not(:disabled) {
        background: var(--primary);
        transform: scale(1.02);
        box-shadow: 0 0 20px rgba(233, 69, 96, 0.5);
    }

    .menu-button:hover:not(:disabled)::before,
    .menu-button:active:not(:disabled)::before {
        opacity: 1;
    }

    .menu-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        border-color: var(--text-muted);
    }

    .version {
        position: absolute;
        bottom: var(--space-sm);
        right: var(--space-sm);
        font-size: var(--font-size-sm);
        color: var(--text-muted);
    }

    .particles {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
    }

    .particle {
        position: absolute;
        bottom: -20px;
        left: var(--x);
        color: var(--primary);
        opacity: 0.3;
        font-size: 16px;
        animation: rise var(--duration) ease-in-out var(--delay) infinite;
    }

    @keyframes rise {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
        }
        10% {
            opacity: 0.4;
        }
        90% {
            opacity: 0.4;
        }
        100% {
            transform: translateY(-700px) rotate(360deg);
            opacity: 0;
        }
    }

    @keyframes float {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-10px);
        }
    }

    /* Mobile-specific adjustments */
    @media (max-height: 500px) {
        .logo {
            font-size: 40px;
        }

        .menu {
            gap: var(--space-xs);
        }

        .menu-button {
            min-height: 36px;
            padding: var(--space-sm) var(--space-md);
        }
    }
</style>
