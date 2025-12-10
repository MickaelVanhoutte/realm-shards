<script lang="ts">
    import { onMount, afterUpdate } from 'svelte';
    import { adminMapStore, type SpriteTile } from '../../lib/stores/adminMapStore';
    import type { MapData, TileType } from '../../lib/types';

    // Tool modes
    type EditorTool = 'tile' | 'collision' | 'encounter' | 'npc' | 'item' | 'warp' | 'spritetile';

    // State
    let selectedMapId: string | null = null;
    let activeTool: EditorTool = 'tile';
    let zoom = 1;
    let showGrid = true;
    let showCollisions = true;
    let showEntities = true;
    let refreshKey = 0; // Force reactivity

    // Selected tile type for basic tiles
    let selectedTileType: TileType = 'ground';

    // Create map dialog
    let showCreateDialog = false;
    let newMapName = '';
    let newMapWidth = 20;
    let newMapHeight = 15;

    // Spritesheet tile picker
    let selectedSheet: 'buildings' | 'nature' | 'urban' = 'nature';
    let selectedSpriteTileX = 0;
    let selectedSpriteTileY = 0;
    let sheetImages: Record<string, HTMLImageElement> = {};
    let sheetLoaded: Record<string, boolean> = { buildings: false, nature: false, urban: false };
    let TILE_SIZE = 16; // Adjustable tile size for picking

    // Spritesheet info - use base path from vite config
    const SPRITESHEETS = {
        buildings: { path: '/realm-shards/sprites/world/BuildingsRMXP.png', name: 'Buildings' },
        nature: { path: '/realm-shards/sprites/world/NatureRMXP.png', name: 'Nature' },
        urban: { path: '/realm-shards/sprites/world/UrbanRMXP.png', name: 'Urban' },
    };

    let canvasContainer: HTMLDivElement;
    let mainCanvas: HTMLCanvasElement;
    let tilePickerCanvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;

    // Background image cache
    let backgroundImages: Record<string, HTMLImageElement> = {};

    // Get maps reactively - use refreshKey to force updates
    $: allMaps = (refreshKey, adminMapStore.getAllMaps());
    $: selectedMap = (refreshKey, selectedMapId) ? adminMapStore.getEditedMap(selectedMapId!) : null;

    // Initialize
    onMount(() => {
        adminMapStore.init();
        loadSpritesheets();
    });

    // After every DOM update, check if tile picker needs drawing
    afterUpdate(() => {
        if (activeTool === 'spritetile' && tilePickerCanvas && sheetLoaded[selectedSheet]) {
            drawTilePicker();
        }
    });

    function loadSpritesheets() {
        for (const [key, info] of Object.entries(SPRITESHEETS)) {
            const img = new Image();
            img.onload = () => {
                sheetImages[key] = img;
                sheetLoaded[key] = true;
                sheetLoaded = { ...sheetLoaded }; // Trigger reactivity
                console.log(`Loaded spritesheet: ${key}, size: ${img.width}x${img.height}`);
            };
            img.onerror = () => {
                console.error(`Failed to load spritesheet: ${info.path}`);
            };
            img.src = info.path;
        }
    }

    // Redraw when map selection changes
    $: if (selectedMap && mainCanvas) {
        setTimeout(() => drawCanvas(), 0);
    }

    function drawCanvas() {
        if (!mainCanvas || !selectedMap) return;
        ctx = mainCanvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = selectedMap;
        mainCanvas.width = width * TILE_SIZE * zoom;
        mainCanvas.height = height * TILE_SIZE * zoom;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);

        // Draw background image if available
        if (selectedMap.background) {
            const bgPath = '/realm-shards/' + selectedMap.background;
            if (backgroundImages[bgPath]) {
                ctx.drawImage(backgroundImages[bgPath], 0, 0, mainCanvas.width, mainCanvas.height);
            } else {
                // Load background image
                const bgImg = new Image();
                bgImg.onload = () => {
                    backgroundImages[bgPath] = bgImg;
                    drawCanvas(); // Redraw once loaded
                };
                bgImg.src = bgPath;
            }
        }

        // Draw tiles (only if no background or as overlay)
        if (!selectedMap.background || selectedMap.tiles?.length) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const tileType = selectedMap.tiles?.[y * width + x] as TileType | undefined;
                    if (tileType) {
                        ctx.fillStyle = getTileColor(tileType);
                        ctx.fillRect(x * TILE_SIZE * zoom, y * TILE_SIZE * zoom, TILE_SIZE * zoom, TILE_SIZE * zoom);
                    }
                }
            }
        }

        // Draw sprite tiles from spritesheets
        const spriteTiles = (selectedMap as any).spriteTiles;
        if (spriteTiles && Array.isArray(spriteTiles)) {
            for (let y = 0; y < spriteTiles.length; y++) {
                const row = spriteTiles[y];
                if (!row) continue;
                for (let x = 0; x < row.length; x++) {
                    const spriteTile = row[x];
                    if (spriteTile && spriteTile.sheet) {
                        const sheetPath = SPRITESHEETS[spriteTile.sheet as keyof typeof SPRITESHEETS]?.path;
                        const sheetImg = sheetImages[spriteTile.sheet];
                        if (sheetImg) {
                            // Draw the tile from the spritesheet
                            ctx.drawImage(
                                sheetImg,
                                spriteTile.x * TILE_SIZE, // source X
                                spriteTile.y * TILE_SIZE, // source Y
                                TILE_SIZE, // source width
                                TILE_SIZE, // source height
                                x * TILE_SIZE * zoom, // dest X
                                y * TILE_SIZE * zoom, // dest Y
                                TILE_SIZE * zoom, // dest width
                                TILE_SIZE * zoom // dest height
                            );
                        }
                    }
                }
            }
        }

        // Draw collision overlay
        if (showCollisions && selectedMap.collisions) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (selectedMap.collisions[y * width + x] === 1) {
                        ctx.fillRect(x * TILE_SIZE * zoom, y * TILE_SIZE * zoom, TILE_SIZE * zoom, TILE_SIZE * zoom);
                    }
                }
            }
        }

        // Draw encounter zones
        if (showEntities && selectedMap.encounterZones) {
            for (const zone of selectedMap.encounterZones) {
                ctx.fillStyle =
                    zone.type === 'grass'
                        ? 'rgba(0, 255, 0, 0.2)'
                        : zone.type === 'water'
                          ? 'rgba(0, 100, 255, 0.2)'
                          : 'rgba(100, 100, 100, 0.2)';
                ctx.fillRect(
                    zone.rect.x * TILE_SIZE * zoom,
                    zone.rect.y * TILE_SIZE * zoom,
                    zone.rect.w * TILE_SIZE * zoom,
                    zone.rect.h * TILE_SIZE * zoom
                );
                ctx.strokeStyle = zone.type === 'grass' ? '#0f0' : zone.type === 'water' ? '#00f' : '#888';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    zone.rect.x * TILE_SIZE * zoom,
                    zone.rect.y * TILE_SIZE * zoom,
                    zone.rect.w * TILE_SIZE * zoom,
                    zone.rect.h * TILE_SIZE * zoom
                );
            }
        }

        // Draw entities
        if (showEntities) {
            for (const npc of selectedMap.npcs || []) {
                ctx.fillStyle = '#ff9900';
                ctx.beginPath();
                ctx.arc(
                    (npc.x + 0.5) * TILE_SIZE * zoom,
                    (npc.y + 0.5) * TILE_SIZE * zoom,
                    TILE_SIZE * zoom * 0.4,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = `${10 * zoom}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('NPC', (npc.x + 0.5) * TILE_SIZE * zoom, (npc.y + 0.5) * TILE_SIZE * zoom + 4);
            }
            for (const item of selectedMap.items || []) {
                ctx.fillStyle = item.visible ? '#00ff00' : '#888';
                ctx.beginPath();
                ctx.arc(
                    (item.x + 0.5) * TILE_SIZE * zoom,
                    (item.y + 0.5) * TILE_SIZE * zoom,
                    TILE_SIZE * zoom * 0.3,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
            for (const warp of selectedMap.warps || []) {
                ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
                ctx.fillRect(warp.x * TILE_SIZE * zoom, warp.y * TILE_SIZE * zoom, TILE_SIZE * zoom, TILE_SIZE * zoom);
            }
        }

        // Draw grid
        if (showGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            for (let x = 0; x <= width; x++) {
                ctx.beginPath();
                ctx.moveTo(x * TILE_SIZE * zoom, 0);
                ctx.lineTo(x * TILE_SIZE * zoom, height * TILE_SIZE * zoom);
                ctx.stroke();
            }
            for (let y = 0; y <= height; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * TILE_SIZE * zoom);
                ctx.lineTo(width * TILE_SIZE * zoom, y * TILE_SIZE * zoom);
                ctx.stroke();
            }
        }

        // Draw player start
        if (selectedMap.playerStart) {
            ctx.fillStyle = '#00d9ff';
            ctx.beginPath();
            ctx.arc(
                (selectedMap.playerStart.x + 0.5) * TILE_SIZE * zoom,
                (selectedMap.playerStart.y + 0.5) * TILE_SIZE * zoom,
                TILE_SIZE * zoom * 0.4,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = `bold ${12 * zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(
                'P',
                (selectedMap.playerStart.x + 0.5) * TILE_SIZE * zoom,
                (selectedMap.playerStart.y + 0.5) * TILE_SIZE * zoom + 4
            );
        }
    }

    function drawTilePicker() {
        if (!tilePickerCanvas || !sheetImages[selectedSheet]) return;
        const pickerCtx = tilePickerCanvas.getContext('2d');
        if (!pickerCtx) return;

        const img = sheetImages[selectedSheet];
        const tilesX = Math.floor(img.width / TILE_SIZE);
        const tilesY = Math.floor(img.height / TILE_SIZE);

        tilePickerCanvas.width = tilesX * TILE_SIZE;
        tilePickerCanvas.height = tilesY * TILE_SIZE;

        pickerCtx.drawImage(img, 0, 0);

        // Draw selection highlight
        pickerCtx.strokeStyle = '#00d9ff';
        pickerCtx.lineWidth = 3;
        pickerCtx.strokeRect(selectedSpriteTileX * TILE_SIZE, selectedSpriteTileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    function getTileColor(type: TileType): string {
        switch (type) {
            case 'ground':
                return '#3d2914';
            case 'grass':
                return '#2d5016';
            case 'wall':
                return '#555555';
            case 'water':
                return '#1a5f7a';
            case 'path':
                return '#8b7355';
            case 'tree':
                return '#1a3a1a';
            default:
                return '#333';
        }
    }

    function handleCanvasClick(event: MouseEvent) {
        if (!selectedMap || !mainCanvas || !selectedMapId) return;

        const rect = mainCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / (TILE_SIZE * zoom));
        const y = Math.floor((event.clientY - rect.top) / (TILE_SIZE * zoom));

        if (x < 0 || x >= selectedMap.width || y < 0 || y >= selectedMap.height) return;

        console.log(`Canvas click at (${x}, ${y}), tool: ${activeTool}, mapId: ${selectedMapId}`);

        switch (activeTool) {
            case 'tile':
                adminMapStore.setTile(selectedMapId, x, y, selectedTileType);
                refreshKey++; // Force reactivity
                break;
            case 'collision':
                const isBlocked = selectedMap.collisions?.[y * selectedMap.width + x] === 1;
                adminMapStore.setCollision(selectedMapId, x, y, !isBlocked);
                refreshKey++;
                break;
            case 'spritetile':
                const spriteTile: SpriteTile = {
                    sheet: selectedSheet,
                    x: selectedSpriteTileX,
                    y: selectedSpriteTileY,
                };
                console.log('Placing sprite tile:', spriteTile, 'at', x, y);
                adminMapStore.setSpriteTile(selectedMapId, x, y, spriteTile);
                refreshKey++;
                break;
        }
    }

    function handleTilePickerClick(event: MouseEvent) {
        if (!tilePickerCanvas) return;
        const rect = tilePickerCanvas.getBoundingClientRect();
        selectedSpriteTileX = Math.floor((event.clientX - rect.left) / TILE_SIZE);
        selectedSpriteTileY = Math.floor((event.clientY - rect.top) / TILE_SIZE);
        drawTilePicker();
    }

    function selectTileType(type: TileType) {
        selectedTileType = type;
    }

    function createNewMap() {
        if (!newMapName.trim()) return;
        const id = adminMapStore.createMap(newMapName.trim(), newMapWidth, newMapHeight);
        selectedMapId = id;
        showCreateDialog = false;
        newMapName = '';
        refreshKey++;
    }

    function handleZoom(delta: number) {
        zoom = Math.max(0.25, Math.min(2, zoom + delta));
        setTimeout(() => drawCanvas(), 0);
    }
</script>

<div class="map-editor">
    <!-- Left Sidebar: Map List -->
    <aside class="map-list">
        <div class="list-header">
            <h3>Maps</h3>
            <button class="create-btn" on:click={() => (showCreateDialog = true)}>+ New</button>
        </div>
        <div class="list-scroll">
            {#each allMaps as map}
                <button
                    class="map-item"
                    class:selected={selectedMapId === map.id}
                    on:click={() => {
                        selectedMapId = map.id;
                        refreshKey++;
                    }}
                >
                    <span class="map-name">{map.name}</span>
                    <span class="map-size">{map.width}×{map.height}</span>
                </button>
            {/each}
            {#if allMaps.length === 0}
                <p class="no-maps">No maps yet. Create one!</p>
            {/if}
        </div>
    </aside>

    <!-- Center: Canvas Area -->
    <main class="canvas-area">
        {#if selectedMap}
            <div class="canvas-toolbar">
                <div class="tool-group">
                    <button
                        class:active={activeTool === 'tile'}
                        on:click={() => (activeTool = 'tile')}
                        title="Paint Basic Tiles">🎨 Tiles</button
                    >
                    <button
                        class:active={activeTool === 'spritetile'}
                        on:click={() => (activeTool = 'spritetile')}
                        title="Paint Sprite Tiles">🖼️ Sprites</button
                    >
                    <button
                        class:active={activeTool === 'collision'}
                        on:click={() => (activeTool = 'collision')}
                        title="Edit Collisions">🚧 Collision</button
                    >
                    <button
                        class:active={activeTool === 'encounter'}
                        on:click={() => (activeTool = 'encounter')}
                        title="Encounter Zones">🌿 Encounters</button
                    >
                    <button class:active={activeTool === 'npc'} on:click={() => (activeTool = 'npc')} title="Place NPCs"
                        >👤 NPCs</button
                    >
                    <button
                        class:active={activeTool === 'item'}
                        on:click={() => (activeTool = 'item')}
                        title="Place Items">📦 Items</button
                    >
                    <button
                        class:active={activeTool === 'warp'}
                        on:click={() => (activeTool = 'warp')}
                        title="Place Warps">🚪 Warps</button
                    >
                </div>
                <div class="view-group">
                    <label
                        ><input
                            type="checkbox"
                            bind:checked={showGrid}
                            on:change={() => {
                                refreshKey++;
                            }}
                        /> Grid</label
                    >
                    <label
                        ><input
                            type="checkbox"
                            bind:checked={showCollisions}
                            on:change={() => {
                                refreshKey++;
                            }}
                        /> Collisions</label
                    >
                    <label
                        ><input
                            type="checkbox"
                            bind:checked={showEntities}
                            on:change={() => {
                                refreshKey++;
                            }}
                        /> Entities</label
                    >
                    <button on:click={() => handleZoom(-0.25)}>−</button>
                    <span class="zoom-label">{Math.round(zoom * 100)}%</span>
                    <button on:click={() => handleZoom(0.25)}>+</button>
                </div>
            </div>
            <div class="canvas-container" bind:this={canvasContainer}>
                <canvas bind:this={mainCanvas} on:click={handleCanvasClick}></canvas>
            </div>
        {:else}
            <div class="no-selection">
                <h2>🗺️ Map Editor</h2>
                <p>Select a map from the list or create a new one</p>
            </div>
        {/if}
    </main>

    <!-- Right Panel: Properties / Tile Picker -->
    <aside class="properties-panel">
        {#if selectedMap}
            <h3>{selectedMap.name}</h3>
            <div class="prop-section">
                <h4>Map Info</h4>
                <p>Size: {selectedMap.width} × {selectedMap.height}</p>
                <p>NPCs: {selectedMap.npcs?.length || 0}</p>
                <p>Items: {selectedMap.items?.length || 0}</p>
            </div>

            {#if activeTool === 'tile'}
                <div class="prop-section">
                    <h4>Tile Palette</h4>
                    <div class="tile-palette">
                        {#each ['ground', 'grass', 'wall', 'water', 'path', 'tree'] as tile}
                            <button
                                class="tile-btn"
                                class:selected={selectedTileType === tile}
                                style="background: {getTileColor(tile)}"
                                title={tile}
                                on:click={() => selectTileType(tile)}
                            >
                                {tile.charAt(0).toUpperCase()}
                            </button>
                        {/each}
                    </div>
                    <p class="help-text">Click tile to select, then click on map</p>
                </div>
            {/if}

            {#if activeTool === 'spritetile'}
                <div class="prop-section">
                    <h4>Spritesheet</h4>
                    <div class="sheet-tabs">
                        {#each Object.entries(SPRITESHEETS) as [key, info]}
                            <button
                                class="sheet-tab"
                                class:active={selectedSheet === key}
                                on:click={() => {
                                    selectedSheet = key;
                                    setTimeout(() => drawTilePicker(), 0);
                                }}
                            >
                                {info.name}
                            </button>
                        {/each}
                    </div>
                    <div class="tile-size-control">
                        <label>Tile Size: {TILE_SIZE}px</label>
                        <input
                            type="range"
                            min="8"
                            max="64"
                            step="8"
                            bind:value={TILE_SIZE}
                            on:input={() => {
                                refreshKey++;
                            }}
                        />
                    </div>
                    <div class="tile-picker-container">
                        {#if sheetLoaded[selectedSheet]}
                            <canvas bind:this={tilePickerCanvas} on:click={handleTilePickerClick}></canvas>
                        {:else}
                            <p>Loading...</p>
                        {/if}
                    </div>
                    <p class="help-text">Selected: ({selectedSpriteTileX}, {selectedSpriteTileY})</p>
                </div>
            {/if}

            {#if activeTool === 'collision'}
                <div class="prop-section">
                    <h4>Collision Mode</h4>
                    <p class="help-text">Click on map tiles to toggle collision (red = blocked)</p>
                </div>
            {/if}

            <div class="prop-section">
                <h4>Actions</h4>
                <button class="action-btn" on:click={() => adminMapStore.downloadJson()}>📥 Export All Maps</button>
            </div>
        {:else}
            <div class="no-selection-props">
                <p>Select a map to edit</p>
            </div>
        {/if}
    </aside>
</div>

<!-- Create Map Dialog -->
{#if showCreateDialog}
    <div class="dialog-overlay" on:click={() => (showCreateDialog = false)}>
        <div class="dialog" on:click|stopPropagation>
            <h2>Create New Map</h2>
            <div class="dialog-field">
                <label for="map-name">Name</label>
                <input id="map-name" type="text" bind:value={newMapName} placeholder="My Map" />
            </div>
            <div class="dialog-field">
                <label for="map-width">Width (tiles)</label>
                <input id="map-width" type="number" min="5" max="200" bind:value={newMapWidth} />
            </div>
            <div class="dialog-field">
                <label for="map-height">Height (tiles)</label>
                <input id="map-height" type="number" min="5" max="200" bind:value={newMapHeight} />
            </div>
            <div class="dialog-actions">
                <button class="cancel-btn" on:click={() => (showCreateDialog = false)}>Cancel</button>
                <button class="confirm-btn" on:click={createNewMap}>Create</button>
            </div>
        </div>
    </div>
{/if}

<style>
    .map-editor {
        display: flex;
        height: 100%;
        background: #1a1a2e;
        color: #eee;
    }

    .map-list {
        width: 200px;
        border-right: 1px solid #333;
        display: flex;
        flex-direction: column;
        background: #16213e;
    }

    .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #333;
    }

    .list-header h3 {
        margin: 0;
        font-size: 1rem;
    }

    .create-btn {
        padding: 0.3rem 0.6rem;
        background: #27ae60;
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 4px;
        font-size: 0.8rem;
    }

    .list-scroll {
        flex: 1;
        overflow-y: auto;
    }

    .map-item {
        display: flex;
        justify-content: space-between;
        width: 100%;
        padding: 0.8rem 1rem;
        background: transparent;
        border: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        color: #ccc;
        cursor: pointer;
        text-align: left;
    }

    .map-item:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    .map-item.selected {
        background: #3498db;
        color: white;
    }
    .map-size {
        font-size: 0.75rem;
        color: #888;
    }
    .map-item.selected .map-size {
        color: rgba(255, 255, 255, 0.7);
    }
    .no-maps {
        padding: 1rem;
        text-align: center;
        color: #666;
        font-size: 0.9rem;
    }

    .canvas-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .canvas-toolbar {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 1rem;
        background: #0f3460;
        border-bottom: 1px solid #333;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .tool-group,
    .view-group {
        display: flex;
        gap: 0.25rem;
        align-items: center;
    }

    .tool-group button,
    .view-group button {
        padding: 0.4rem 0.6rem;
        background: #333;
        border: 1px solid #444;
        color: #ccc;
        cursor: pointer;
        font-size: 0.8rem;
        border-radius: 4px;
    }

    .tool-group button:hover,
    .view-group button:hover {
        background: #444;
    }
    .tool-group button.active {
        background: #3498db;
        border-color: #3498db;
        color: white;
    }

    .view-group label {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.8rem;
        color: #aaa;
    }

    .zoom-label {
        font-size: 0.8rem;
        color: #ccc;
        min-width: 40px;
        text-align: center;
    }

    .canvas-container {
        flex: 1;
        overflow: auto;
        padding: 1rem;
        background: #111;
    }

    canvas {
        cursor: crosshair;
        image-rendering: pixelated;
    }

    .no-selection {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #666;
    }

    .no-selection h2 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }

    .properties-panel {
        width: 400px;
        border-left: 1px solid #333;
        padding: 1rem;
        background: #16213e;
        overflow-y: auto;
    }

    .properties-panel h3 {
        margin: 0 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #333;
    }

    .prop-section {
        margin-bottom: 1.5rem;
    }
    .prop-section h4 {
        margin: 0 0 0.5rem 0;
        font-size: 0.85rem;
        color: #888;
        text-transform: uppercase;
    }
    .prop-section p {
        margin: 0.25rem 0;
        font-size: 0.9rem;
    }

    .tile-palette {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.25rem;
    }

    .tile-btn {
        aspect-ratio: 1;
        border: 2px solid #444;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        cursor: pointer;
    }

    .tile-btn:hover {
        border-color: #888;
    }
    .tile-btn.selected {
        border-color: #00d9ff;
        box-shadow: 0 0 8px #00d9ff;
    }

    .help-text {
        font-size: 0.75rem;
        color: #666;
        margin-top: 0.5rem;
    }

    .tile-size-control {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-bottom: 0.5rem;
        padding: 0.5rem;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
    }

    .tile-size-control label {
        font-size: 0.75rem;
        color: #aaa;
    }

    .tile-size-control input[type='range'] {
        width: 100%;
    }

    .sheet-tabs {
        display: flex;
        gap: 0.25rem;
        margin-bottom: 0.5rem;
    }

    .sheet-tab {
        flex: 1;
        padding: 0.3rem;
        background: #333;
        border: 1px solid #444;
        color: #ccc;
        cursor: pointer;
        font-size: 0.7rem;
        border-radius: 3px;
    }

    .sheet-tab:hover {
        background: #444;
    }
    .sheet-tab.active {
        background: #3498db;
        border-color: #3498db;
        color: white;
    }

    .tile-picker-container {
        max-height: 500px;
        overflow: auto;
        background: #111;
        border: 1px solid #333;
        border-radius: 4px;
    }

    .tile-picker-container canvas {
        display: block;
        cursor: pointer;
    }

    .action-btn {
        width: 100%;
        padding: 0.6rem;
        background: #27ae60;
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 4px;
        font-size: 0.9rem;
    }

    .action-btn:hover {
        background: #2ecc71;
    }
    .no-selection-props {
        color: #666;
        text-align: center;
        padding: 2rem 0;
    }

    .dialog-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .dialog {
        background: #1a1a2e;
        padding: 1.5rem;
        border-radius: 8px;
        width: 300px;
        border: 1px solid #333;
    }

    .dialog h2 {
        margin: 0 0 1rem 0;
    }
    .dialog-field {
        margin-bottom: 1rem;
    }
    .dialog-field label {
        display: block;
        font-size: 0.85rem;
        color: #888;
        margin-bottom: 0.25rem;
    }
    .dialog-field input {
        width: 100%;
        padding: 0.5rem;
        background: #16213e;
        border: 1px solid #333;
        color: #eee;
        border-radius: 4px;
    }

    .dialog-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
    }
    .cancel-btn {
        padding: 0.5rem 1rem;
        background: #333;
        border: 1px solid #444;
        color: #ccc;
        cursor: pointer;
        border-radius: 4px;
    }
    .confirm-btn {
        padding: 0.5rem 1rem;
        background: #3498db;
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 4px;
    }
    .confirm-btn:hover {
        background: #2980b9;
    }
</style>
