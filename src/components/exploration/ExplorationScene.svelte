<script lang="ts">
    import { onMount } from "svelte";
    import { playerStore } from "../../lib/stores/playerStore";
    import { trainerStore } from "../../lib/stores/trainerStore";
    import { gameState } from "../../lib/stores/gameState";
    import { STARTER_MAP, getTileInfo } from "../../lib/data/maps";
    import VirtualJoystick from "../ui/VirtualJoystick.svelte";
    import SaveLoadMenu from "../ui/SaveLoadMenu.svelte";
    import type { MapData, Direction } from "../../lib/types";
    import Pokedex from "../ui/Pokedex.svelte";
    import PartyMenu from "../ui/PartyMenu.svelte";
    import { pokedex } from "../../lib/data/pokedex";

    import playerSprite from "../../assets/sprites/trainers/walking/ethan.png";

    // Menu state
    let showPauseMenu = false;
    let showSaveMenu = false;
    let showLoadMenu = false;
    let showPokedex = false;
    let showPartyMenu = false;

    let currentMap: MapData = STARTER_MAP;
    let isMobile = false;

    // Floating joystick state
    let joystickVisible = false;
    let joystickX = 0;
    let joystickY = 0;
    let joystick: any;

    // Animation state
    let walkingFrame = 0;
    let walkInterval: any;
    let stopTimeout: any;

    $: if ($playerStore.isMoving) {
        if (stopTimeout) {
            clearTimeout(stopTimeout);
            stopTimeout = null;
        }
        if (!walkInterval) {
            walkInterval = setInterval(() => {
                walkingFrame = (walkingFrame + 1) % 4;
            }, 150);
        }
    } else {
        if (walkInterval && !stopTimeout) {
            stopTimeout = setTimeout(() => {
                clearInterval(walkInterval);
                walkInterval = null;
                walkingFrame = 0;
                stopTimeout = null;
            }, 100);
        }
    }

    function getBackgroundPosition(direction: Direction, frame: number) {
        const dirRow =
            {
                down: 0,
                left: 1,
                right: 2,
                up: 3,
            }[direction] || 0;

        // 4x4 grid.
        // X: frame * 33.33% (0, 33.33, 66.66, 100)
        // Y: row * 33.33%
        const x = frame * 33.333;
        const y = dirRow * 33.333;
        return `${x}% ${y}%`;
    }

    // Initialize player position (only for new games)
    onMount(() => {
        // ... existing onMount code ...
        // Only reset position for new games, not loaded saves
        if (!$gameState.isLoadedGame) {
            playerStore.setPosition(
                currentMap.playerStart.x,
                currentMap.playerStart.y,
            );
            // Trainer is already initialized in TitleScreen with starter
        } else {
            // Clear the loaded game flag after position is preserved
            gameState.setLoadedGame(false);
        }

        // Check if mobile
        isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

        // Keyboard controls
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (walkInterval) clearInterval(walkInterval);
        };
    });

    function handleKeyDown(e: KeyboardEvent): void {
        // Skip movement if menu is open
        if (
            showPauseMenu ||
            showPartyMenu ||
            showPokedex ||
            showSaveMenu ||
            showLoadMenu
        ) {
            if (e.key === "Escape") {
                showPauseMenu = false;
                showPartyMenu = false;
                showPokedex = false;
                showSaveMenu = false;
                showLoadMenu = false;
            }
            return;
        }

        // Party menu shortcut
        if (e.key === "p" || e.key === "P") {
            showPartyMenu = true;
            return;
        }

        let direction: Direction | null = null;

        switch (e.key) {
            case "ArrowUp":
            case "w":
            case "W":
                direction = "up";
                break;
            case "ArrowDown":
            case "s":
            case "S":
                direction = "down";
                break;
            case "ArrowLeft":
            case "a":
            case "A":
                direction = "left";
                break;
            case "ArrowRight":
            case "d":
            case "D":
                direction = "right";
                break;
        }

        if (direction) {
            e.preventDefault();
            playerStore.move(direction, currentMap);
        }
    }

    function handleJoystickMove(
        event: CustomEvent<{ direction: Direction }>,
    ): void {
        const { direction } = event.detail;
        playerStore.move(direction, currentMap);
    }

    function handleJoystickEnd(): void {
        joystickVisible = false;
    }

    // Touch handlers for floating joystick
    function handleTouchStart(e: TouchEvent): void {
        if (!isMobile) return;

        const touch = e.touches[0];
        joystickX = touch.clientX;
        joystickY = touch.clientY;
        joystickVisible = true;

        if (joystick) {
            joystick.handleStart(touch.clientX, touch.clientY);
        }
    }

    function handleTouchMove(e: TouchEvent): void {
        if (!joystickVisible || !joystick) return;
        if (!joystickVisible || !joystick) return;

        const touch = e.touches[0];
        joystick.handleMove(touch.clientX, touch.clientY);
    }

    function handleTouchEnd(): void {
        if (joystick) {
            joystickX = joystick.deltaX();
            joystickY = joystick.deltaY();
            joystickVisible = false; // Corrected typo from 'e = false;'
        }
        // The original code had joystickVisible = false; outside the if,
        // but the provided snippet implies it should be inside.
        // Keeping it inside as per the snippet's structure.
    }

    // Get player sprite based on direction

    // Calculate viewport offset to center player
    $: viewportX = $playerStore.x;
    $: viewportY = $playerStore.y;
</script>

<div
    class="exploration-scene"
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}
    on:touchcancel={handleTouchEnd}
>
    <!-- Map viewport -->
    <div class="map-viewport">
        <div
            class="map-container"
            style="
                --player-x: {$playerStore.x};
                --player-y: {$playerStore.y};
                --map-width: {currentMap.width};
                --map-height: {currentMap.height};
            "
        >
            <!-- Tile grid -->
            <div class="tile-grid">
                {#each currentMap.tiles as tileType, index}
                    {@const x = index % currentMap.width}
                    {@const y = Math.floor(index / currentMap.width)}
                    {@const tileInfo = getTileInfo(tileType)}
                    <div
                        class="tile"
                        class:grass={tileType === "grass"}
                        style="
                            --tile-x: {x};
                            --tile-y: {y};
                            background-color: {tileInfo.color};
                        "
                    >
                        {#if tileType === "tree"}
                            <span class="tile-sprite tree">🌲</span>
                        {:else if tileType === "water"}
                            <span class="tile-sprite water">💧</span>
                        {:else if tileType === "grass"}
                            <span class="tile-sprite grass">🌿</span>
                        {/if}
                    </div>
                {/each}
            </div>

            <!-- Player -->
            <div
                class="player"
                class:moving={$playerStore.isMoving}
                style="
                    --player-x: {$playerStore.x};
                    --player-y: {$playerStore.y};
                "
            >
                <div
                    class="player-sprite-sheet"
                    style="
                        background-image: url({playerSprite});
                        background-position: {getBackgroundPosition(
                        $playerStore.direction,
                        walkingFrame,
                    )};
                    "
                ></div>
                <div class="player-shadow"></div>
            </div>
        </div>
    </div>

    <!-- Menu Button (separate for proper click handling) -->
    <button
        class="menu-btn"
        on:click={() => (showPauseMenu = true)}
        type="button"
    >
        ☰
    </button>

    <!-- UI Overlay -->
    <div class="ui-overlay">
        <!-- Location name -->
        <div class="location-badge">
            <span class="location-icon">📍</span>
            <span class="location-name">{currentMap.name}</span>
        </div>

        <!-- Party HP display -->
        <div class="party-mini">
            {#if $trainerStore.trainer}
                {#each $trainerStore.trainer.party.slice(0, 3) as creature}
                    <div
                        class="member-mini"
                        class:low-hp={creature.currentHp / creature.maxHp < 0.3}
                        class:fainted={creature.isFainted}
                    >
                        <img
                            src={creature.sprite.front}
                            alt="sprite"
                            class="member-sprite"
                        />
                        <div class="hp-mini">
                            <div
                                class="hp-fill"
                                style="width: {(creature.currentHp /
                                    creature.maxHp) *
                                    100}%"
                            ></div>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>

    <!-- Pause Menu -->
    {#if showPauseMenu}
        <div
            class="pause-overlay"
            on:click|self={() => (showPauseMenu = false)}
        >
            <div class="pause-menu">
                <h2>⏸️ Paused</h2>
                <button
                    class="pause-btn"
                    on:click={() => {
                        showPauseMenu = false;
                        pokedex.saveState();
                        showSaveMenu = true;
                    }}
                >
                    💾 Save Game
                </button>
                <button
                    class="pause-btn"
                    on:click={() => {
                        showPauseMenu = false;
                        showPokedex = true;
                    }}
                >
                    📖 Pokédex
                </button>
                <button
                    class="pause-btn"
                    on:click={() => {
                        showPauseMenu = false;
                        showPartyMenu = true;
                    }}
                >
                    🐾 Party
                </button>
                <button
                    class="pause-btn"
                    on:click={() => {
                        showPauseMenu = false;
                        showLoadMenu = true;
                    }}
                >
                    📂 Load Game
                </button>
                <button
                    class="pause-btn"
                    on:click={() => (showPauseMenu = false)}
                >
                    ▶️ Resume
                </button>
                <button
                    class="pause-btn danger"
                    on:click={() => gameState.setScreen("title")}
                >
                    🏠 Title Screen
                </button>
            </div>
        </div>
    {/if}

    <!-- Save/Load Menus -->
    {#if showSaveMenu}
        <SaveLoadMenu mode="save" on:close={() => (showSaveMenu = false)} />
    {/if}
    {#if showLoadMenu}
        <SaveLoadMenu mode="load" on:close={() => (showLoadMenu = false)} />
    {/if}
    {#if showPokedex}
        <Pokedex on:close={() => (showPokedex = false)} />
    {/if}
    {#if showPartyMenu}
        <PartyMenu
            isOpen={showPartyMenu}
            on:close={() => (showPartyMenu = false)}
        />
    {/if}

    <!-- Floating Joystick -->
    <VirtualJoystick
        bind:this={joystick}
        visible={joystickVisible}
        posX={joystickX}
        posY={joystickY}
        on:move={handleJoystickMove}
        on:end={handleJoystickEnd}
    />

    <!-- Controls -->
    {#if isMobile}
        <!-- Mobile Controls -->
    {:else}
        <div class="controls-overlay">
            <div class="keyboard-hint">
                <span>Use Arrow Keys to Move</span>
            </div>
        </div>
    {/if}

    <!-- Grass encounter hint -->
    {#if getTileInfo(currentMap.tiles[$playerStore.y * currentMap.width + $playerStore.x])?.encounter}
        <div class="encounter-warning">
            <span class="warning-pulse">⚠️ Wild area - Enemies may appear!</span
            >
        </div>
    {/if}
</div>

<style>
    .exploration-scene {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        background: #0d1117;
    }

    .map-viewport {
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .map-container {
        --tile-size: clamp(32px, 8vw, 48px);
        position: relative;
        width: calc(var(--tile-size) * var(--map-width));
        height: calc(var(--tile-size) * var(--map-height));
        transform: translate(
            calc(50% - (var(--player-x) + 0.5) * var(--tile-size)),
            calc(50% - (var(--player-y) + 0.5) * var(--tile-size))
        );
        transition: transform 0.15s ease-out;
    }

    .tile-grid {
        display: grid;
        grid-template-columns: repeat(var(--map-width), var(--tile-size));
        grid-template-rows: repeat(var(--map-height), var(--tile-size));
        position: absolute;
        top: 0;
        left: 0;
    }

    .tile {
        width: var(--tile-size);
        height: var(--tile-size);
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
    }

    .tile.grass {
        animation: grassSway 3s ease-in-out infinite;
        animation-delay: calc(var(--tile-x) * 0.1s + var(--tile-y) * 0.15s);
    }

    .tile-sprite {
        font-size: calc(var(--tile-size) * 0.6);
        opacity: 0.9;
    }

    .tile-sprite.tree {
        font-size: calc(var(--tile-size) * 0.8);
    }

    .tile-sprite.water {
        animation: waterRipple 2s ease-in-out infinite;
    }

    .player {
        position: absolute;
        width: var(--tile-size);
        height: var(--tile-size);
        left: calc(var(--player-x) * var(--tile-size));
        top: calc(var(--player-y) * var(--tile-size));
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10;
        transition:
            left 0.15s ease-out,
            top 0.15s ease-out;
    }

    .player-sprite-sheet {
        width: 100%;
        height: 100%;
        background-size: 400% 400%;
        image-rendering: pixelated;
        z-index: 2;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    .player-shadow {
        position: absolute;
        bottom: 2px;
        width: 60%;
        height: 20%;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 50%;
        z-index: 1;
    }

    /* UI Overlay */
    .ui-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: var(--space-sm);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        pointer-events: none;
        z-index: 20;
    }

    .location-badge {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        background: rgba(0, 0, 0, 0.7);
        padding: var(--space-xs) var(--space-sm);
        border: 1px solid var(--bg-light);
        font-size: var(--font-size-sm);
    }

    .party-mini {
        display: flex;
        gap: var(--space-xs);
    }

    .member-mini {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        background: rgba(0, 0, 0, 0.7);
        padding: var(--space-xs);
        border: 1px solid var(--bg-light);
    }

    .member-mini.low-hp {
        border-color: var(--danger);
        animation: pulse 1s ease-in-out infinite;
    }

    .member-sprite {
        font-size: var(--font-size-lg);
    }

    .hp-mini {
        width: 30px;
        height: 4px;
        background: var(--bg-dark);
        border: 1px solid var(--bg-light);
    }

    .hp-fill {
        height: 100%;
        background: var(--hp-bar);
        transition: width 0.3s;
    }

    .member-mini.low-hp .hp-fill {
        background: var(--danger);
    }

    /* Controls */
    .controls-overlay {
        position: absolute;
        bottom: var(--space-md);
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        z-index: 20;
    }

    .keyboard-hint {
        background: rgba(0, 0, 0, 0.6);
        padding: var(--space-xs) var(--space-sm);
        border: 1px solid var(--bg-light);
        font-size: var(--font-size-sm);
        color: var(--text-muted);
    }

    /* Encounter warning */
    .encounter-warning {
        position: absolute;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        padding: var(--space-xs) var(--space-sm);
        border: 1px solid var(--warning);
        font-size: var(--font-size-sm);
        color: var(--warning);
        z-index: 20;
    }

    .warning-pulse {
        animation: pulse 1.5s ease-in-out infinite;
    }

    /* Animations */
    @keyframes grassSway {
        0%,
        100% {
            transform: rotate(0deg);
        }
        50% {
            transform: rotate(2deg);
        }
    }

    @keyframes waterRipple {
        0%,
        100% {
            transform: scale(1);
            opacity: 0.9;
        }
        50% {
            transform: scale(1.1);
            opacity: 1;
        }
    }

    @keyframes playerBob {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-3px);
        }
    }

    /* Mobile adjustments */
    @media (max-width: 600px) {
        .controls-overlay {
            bottom: var(--space-sm);
        }

        .encounter-warning {
            bottom: 130px;
        }
    }

    /* Menu button */
    .menu-btn {
        position: fixed;
        top: var(--space-md);
        left: var(--space-md);
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid var(--primary);
        color: var(--text-primary);
        width: 44px;
        height: 44px;
        font-size: 20px;
        cursor: pointer;
        transition: all 0.2s;
        z-index: 50;
        pointer-events: auto;
    }

    .menu-btn:hover {
        background: var(--primary);
        border-color: var(--primary);
    }

    /* Pause overlay */
    .pause-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;
    }

    .pause-menu {
        background: var(--bg-dark);
        border: 3px solid var(--primary);
        padding: var(--space-lg);
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        min-width: 250px;
    }

    .pause-menu h2 {
        text-align: center;
        color: var(--primary);
        margin: 0 0 var(--space-sm) 0;
        font-size: var(--font-size-lg);
    }

    .pause-btn {
        background: var(--bg-medium);
        border: 2px solid var(--bg-light);
        color: var(--text-primary);
        padding: var(--space-sm) var(--space-md);
        font-family: var(--font-pixel);
        font-size: var(--font-size-sm);
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }

    .pause-btn:hover {
        background: var(--primary);
        border-color: var(--primary);
        transform: translateX(4px);
    }

    .pause-btn.danger:hover {
        background: var(--danger);
        border-color: var(--danger);
    }
</style>
