<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type {
        Creature,
        PokemonSkillNode,
        SkillTreeBranch,
    } from "../../lib/types";
    import { getSpecies } from "../../lib/data/creatures";
    import { getMove } from "../../lib/data/moves";
    import {
        UNIVERSAL_SKILL_TREE,
        getAllNodes,
        getNode,
        BRANCH_COLORS,
        MOVE_NODE_COLOR,
        CENTER_X,
        CENTER_Y,
        EMPTY_MOVE_STAT_VALUE,
    } from "../../lib/data/pokemonSkillTree";
    import {
        canUnlockNode,
        isNodeUnlocked,
        unlockNode,
        resetSkillTree,
        getMoveForSlot,
    } from "../../lib/data/pokemonSkillUtils";
    import { trainerStore } from "../../lib/stores/trainerStore";

    export let creature: Creature;
    export let onClose: () => void;

    const dispatch = createEventDispatcher();

    // Reactive state
    $: species = getSpecies(creature.speciesId);
    $: nodes = getAllNodes();
    $: unlockedNodes = new Set(creature.unlockedSkillNodes);
    $: skillPoints = creature.skillPoints;

    // View state - centered on start
    let viewBox = { x: 0, y: 0, width: 1000, height: 1000 };
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let scale = 1;

    // Selected node for tooltip
    let selectedNode: PokemonSkillNode | null = null;

    // Handle node click
    function handleNodeClick(node: PokemonSkillNode) {
        if (isNodeUnlocked(creature, node.id)) {
            selectedNode = node;
        } else if (canUnlockNode(creature, node.id)) {
            const success = unlockNode(creature, node.id);
            if (success) {
                trainerStore.updateCreature(creature);
                unlockedNodes = new Set(creature.unlockedSkillNodes);
                skillPoints = creature.skillPoints;
            }
        } else {
            selectedNode = node;
        }
    }

    // Handle reset
    function handleReset() {
        if (confirm("Reset all skill nodes? You will get all points back.")) {
            resetSkillTree(creature);
            trainerStore.updateCreature(creature);
            unlockedNodes = new Set(creature.unlockedSkillNodes);
            skillPoints = creature.skillPoints;
        }
    }

    // Get node status
    function getNodeStatus(
        node: PokemonSkillNode,
    ): "unlocked" | "available" | "locked" {
        if (unlockedNodes.has(node.id)) return "unlocked";
        if (canUnlockNode(creature, node.id)) return "available";
        return "locked";
    }

    // Get node color
    function getNodeColor(node: PokemonSkillNode): string {
        if (node.type === "move") return MOVE_NODE_COLOR;
        return BRANCH_COLORS[node.branch] || "#888";
    }

    // Get node label
    function getNodeLabel(node: PokemonSkillNode): string {
        if (node.id === "start") return "★";
        if (node.type === "stat" && node.value) {
            return `+${node.value}`;
        }
        if (node.type === "move") {
            const moveData = getMoveForSlot(
                creature.speciesId,
                node.branch,
                node.moveSlot!,
            );
            if (moveData) {
                const move = getMove(moveData.moveId);
                return move?.name?.slice(0, 4) || "?";
            }
            // Empty move slot shows stat boost
            return `+${EMPTY_MOVE_STAT_VALUE}`;
        }
        return "";
    }

    // Check if node is an empty move slot
    function isEmptyMoveSlot(node: PokemonSkillNode): boolean {
        if (node.type !== "move" || node.moveSlot === undefined) return false;
        return (
            getMoveForSlot(creature.speciesId, node.branch, node.moveSlot) ===
            null
        );
    }

    // Pan handlers
    function handlePanStart(e: MouseEvent | TouchEvent) {
        isPanning = true;
        const point = "touches" in e ? e.touches[0] : e;
        panStart = { x: point.clientX, y: point.clientY };
    }

    function handlePanMove(e: MouseEvent | TouchEvent) {
        if (!isPanning) return;
        const point = "touches" in e ? e.touches[0] : e;
        const dx = (point.clientX - panStart.x) * (viewBox.width / 800);
        const dy = (point.clientY - panStart.y) * (viewBox.height / 800);
        viewBox = {
            ...viewBox,
            x: viewBox.x - dx,
            y: viewBox.y - dy,
        };
        panStart = { x: point.clientX, y: point.clientY };
    }

    function handlePanEnd() {
        isPanning = false;
    }

    // Zoom handlers
    function handleZoom(e: WheelEvent) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        const newWidth = Math.min(
            2000,
            Math.max(500, viewBox.width * zoomFactor),
        );
        const newHeight = Math.min(
            2000,
            Math.max(500, viewBox.height * zoomFactor),
        );

        // Zoom towards center
        const dw = newWidth - viewBox.width;
        const dh = newHeight - viewBox.height;

        viewBox = {
            x: viewBox.x - dw / 2,
            y: viewBox.y - dh / 2,
            width: newWidth,
            height: newHeight,
        };
    }

    // Get tooltip content
    function getTooltipContent(node: PokemonSkillNode): {
        title: string;
        desc: string;
    } {
        if (node.id === "start") {
            return {
                title: "Starting Point",
                desc: "Your journey begins here",
            };
        }
        if (node.type === "stat") {
            const statNames: Record<string, string> = {
                hp: "HP",
                atk: "Attack",
                def: "Defense",
                spAtk: "Sp. Atk",
                spDef: "Sp. Def",
                speed: "Speed",
            };
            return {
                title: `${statNames[node.stat || ""]} +${node.value}`,
                desc: `Increases ${statNames[node.stat || ""]} by ${node.value}`,
            };
        }
        if (node.type === "move") {
            const moveData = getMoveForSlot(
                creature.speciesId,
                node.branch,
                node.moveSlot!,
            );
            if (moveData) {
                const move = getMove(moveData.moveId);
                return {
                    title: move?.name || "Unknown Move",
                    desc: `Learn this move (${move?.type || "unknown"} type)`,
                };
            }
            // Empty move slot shows stat boost
            const statNames: Record<string, string> = {
                hp: "HP",
                atk: "Attack",
                def: "Defense",
                spAtk: "Sp. Atk",
                spDef: "Sp. Def",
                speed: "Speed",
            };
            return {
                title: `${statNames[node.branch]} +${EMPTY_MOVE_STAT_VALUE}`,
                desc: `Major stat boost (no move available)`,
            };
        }
        return { title: "Node", desc: "" };
    }

    // Branch labels
    const branchLabels: Record<
        SkillTreeBranch,
        { name: string; angle: number }
    > = {
        speed: { name: "SPEED", angle: -90 },
        spDef: { name: "SP.DEF", angle: -30 },
        def: { name: "DEFENSE", angle: 30 },
        hp: { name: "HP", angle: 90 },
        spAtk: { name: "SP.ATK", angle: 150 },
        atk: { name: "ATTACK", angle: -150 },
    };
</script>

<div class="skill-tree-overlay" role="dialog" aria-modal="true">
    <div class="skill-tree-container">
        <!-- Header -->
        <div class="header">
            <div class="creature-info">
                <img
                    src={species?.sprite.front}
                    alt={species?.name}
                    class="sprite"
                />
                <div class="name-level">
                    <h2>{creature.nickname || species?.name}</h2>
                    <span class="level">Lv. {creature.level}</span>
                </div>
            </div>
            <div class="points-display">
                <span class="points-icon">⭐</span>
                <span class="points-value">{skillPoints}</span>
                <span class="points-label">Skill Points</span>
            </div>
            <div class="header-actions">
                <button class="reset-btn" on:click={handleReset}>
                    <span>↺</span> Reset
                </button>
                <button class="close-btn" on:click={onClose}>✕</button>
            </div>
        </div>

        <!-- Skill Tree SVG -->
        <svg
            class="skill-tree-svg"
            viewBox="{viewBox.x} {viewBox.y} {viewBox.width} {viewBox.height}"
            on:mousedown={handlePanStart}
            on:mousemove={handlePanMove}
            on:mouseup={handlePanEnd}
            on:mouseleave={handlePanEnd}
            on:touchstart={handlePanStart}
            on:touchmove={handlePanMove}
            on:touchend={handlePanEnd}
            on:wheel={handleZoom}
        >
            <!-- Background -->
            <defs>
                <radialGradient id="bgGradient" cx="50%" cy="50%" r="70%">
                    <stop offset="0%" stop-color="#1e293b" />
                    <stop offset="100%" stop-color="#0f172a" />
                </radialGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="shadow">
                    <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="2"
                        flood-opacity="0.5"
                    />
                </filter>
            </defs>

            <rect
                x="-500"
                y="-500"
                width="2000"
                height="2000"
                fill="url(#bgGradient)"
            />

            <!-- Branch direction lines (subtle guides) -->
            {#each Object.entries(branchLabels) as [branch, info]}
                {@const angleRad = (info.angle * Math.PI) / 180}
                {@const endX = CENTER_X + Math.cos(angleRad) * 1100}
                {@const endY = CENTER_Y + Math.sin(angleRad) * 1100}
                {@const labelX = CENTER_X + Math.cos(angleRad) * 1050}
                {@const labelY = CENTER_Y + Math.sin(angleRad) * 1050}
                <line
                    x1={CENTER_X}
                    y1={CENTER_Y}
                    x2={endX}
                    y2={endY}
                    stroke={BRANCH_COLORS[branch]}
                    stroke-width="1"
                    stroke-opacity="0.15"
                    stroke-dasharray="5,10"
                />
                <text
                    x={labelX}
                    y={labelY}
                    text-anchor="middle"
                    dominant-baseline="middle"
                    fill={BRANCH_COLORS[branch]}
                    font-size="14"
                    font-weight="bold"
                    opacity="0.6"
                >
                    {info.name}
                </text>
            {/each}

            <!-- Connection lines -->
            {#each nodes as node}
                {#each node.connections as connId}
                    {@const connNode = getNode(connId)}
                    {#if connNode}
                        {@const isUnlocked =
                            unlockedNodes.has(node.id) &&
                            unlockedNodes.has(connId)}
                        <line
                            x1={node.x}
                            y1={node.y}
                            x2={connNode.x}
                            y2={connNode.y}
                            stroke={isUnlocked ? getNodeColor(node) : "#374151"}
                            stroke-width={isUnlocked ? 4 : 2}
                            stroke-opacity={isUnlocked ? 0.8 : 0.4}
                            stroke-linecap="round"
                        />
                    {/if}
                {/each}
            {/each}

            <!-- Nodes -->
            {#each nodes as node}
                {@const status = getNodeStatus(node)}
                {@const color = getNodeColor(node)}
                {@const isStart = node.id === "start"}
                {@const nodeSize = isStart
                    ? 28
                    : node.type === "move"
                      ? 22
                      : 18}

                <g
                    class="node-group"
                    class:unlocked={status === "unlocked"}
                    class:available={status === "available"}
                    class:locked={status === "locked"}
                    on:click={() => handleNodeClick(node)}
                    on:keypress={(e) =>
                        e.key === "Enter" && handleNodeClick(node)}
                    role="button"
                    tabindex="0"
                    style="cursor: pointer"
                >
                    <!-- Outer glow for available nodes -->
                    {#if status === "available"}
                        <circle
                            cx={node.x}
                            cy={node.y}
                            r={nodeSize + 6}
                            fill="none"
                            stroke={color}
                            stroke-width="2"
                            opacity="0.5"
                            class="pulse-ring"
                        />
                    {/if}

                    <!-- Node circle -->
                    <circle
                        cx={node.x}
                        cy={node.y}
                        r={nodeSize}
                        fill={status === "unlocked" ? color : "#1f2937"}
                        stroke={color}
                        stroke-width={status === "unlocked" ? 3 : 2}
                        opacity={status === "locked" ? 0.5 : 1}
                        filter={status === "unlocked"
                            ? "url(#shadow)"
                            : undefined}
                    />

                    <!-- Inner highlight for unlocked -->
                    {#if status === "unlocked"}
                        <circle
                            cx={node.x}
                            cy={node.y - nodeSize * 0.3}
                            r={nodeSize * 0.4}
                            fill="white"
                            opacity="0.2"
                        />
                    {/if}

                    <!-- Node label -->
                    <text
                        x={node.x}
                        y={node.y}
                        dy="5"
                        text-anchor="middle"
                        fill={status === "unlocked"
                            ? "#fff"
                            : status === "available"
                              ? color
                              : "#6b7280"}
                        font-size={isStart
                            ? "16"
                            : node.type === "move"
                              ? "9"
                              : "11"}
                        font-weight="bold"
                        style="pointer-events: none"
                    >
                        {getNodeLabel(node)}
                    </text>
                </g>
            {/each}
        </svg>

        <!-- Tooltip -->
        {#if selectedNode}
            <div class="tooltip-overlay" on:click={() => (selectedNode = null)}>
                <div class="tooltip-card" on:click|stopPropagation>
                    <div
                        class="tooltip-header"
                        style="background: {getNodeColor(selectedNode)}"
                    >
                        <span class="tooltip-title"
                            >{getTooltipContent(selectedNode).title}</span
                        >
                    </div>
                    <div class="tooltip-body">
                        <p>{getTooltipContent(selectedNode).desc}</p>
                        <div class="tooltip-meta">
                            <span style="color: {getNodeColor(selectedNode)}"
                                >{selectedNode.branch.toUpperCase()}</span
                            >
                            <span>Tier {selectedNode.tier}</span>
                        </div>
                        {#if getNodeStatus(selectedNode) === "available"}
                            <button
                                class="unlock-btn"
                                on:click={() => {
                                    if (selectedNode)
                                        handleNodeClick(selectedNode);
                                }}
                            >
                                Unlock (1 Point)
                            </button>
                        {:else if getNodeStatus(selectedNode) === "unlocked"}
                            <span class="unlocked-badge">✓ Unlocked</span>
                        {:else}
                            <span class="locked-badge">🔒 Locked</span>
                        {/if}
                    </div>
                    <button
                        class="tooltip-close"
                        on:click={() => (selectedNode = null)}>Close</button
                    >
                </div>
            </div>
        {/if}

        <!-- Legend -->
        <div class="legend">
            <div class="legend-item">
                <span class="legend-dot unlocked"></span>
                <span>Unlocked</span>
            </div>
            <div class="legend-item">
                <span class="legend-dot available"></span>
                <span>Available</span>
            </div>
            <div class="legend-item">
                <span class="legend-dot locked"></span>
                <span>Locked</span>
            </div>
            <div class="legend-item">
                <span class="legend-dot move"></span>
                <span>Move</span>
            </div>
        </div>

        <!-- Controls hint -->
        <div class="controls-hint">Drag to pan • Scroll to zoom</div>
    </div>
</div>

<style>
    .skill-tree-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #0f172a;
        z-index: 1000;
        display: flex;
        flex-direction: column;
    }

    .skill-tree-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: rgba(0, 0, 0, 0.5);
        border-bottom: 1px solid #334155;
        gap: 15px;
        flex-wrap: wrap;
    }

    .creature-info {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .sprite {
        width: 48px;
        height: 48px;
        image-rendering: pixelated;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    .name-level h2 {
        margin: 0;
        font-size: 1.2rem;
        color: #f8fafc;
    }

    .level {
        font-size: 0.85rem;
        color: #94a3b8;
    }

    .points-display {
        display: flex;
        align-items: center;
        gap: 10px;
        background: linear-gradient(
            135deg,
            rgba(251, 191, 36, 0.2),
            rgba(245, 158, 11, 0.1)
        );
        padding: 10px 20px;
        border-radius: 25px;
        border: 2px solid rgba(251, 191, 36, 0.5);
    }

    .points-icon {
        font-size: 1.3rem;
    }

    .points-value {
        font-size: 1.6rem;
        font-weight: bold;
        color: #fbbf24;
    }

    .points-label {
        font-size: 0.8rem;
        color: #d4a213;
    }

    .header-actions {
        display: flex;
        gap: 10px;
    }

    .reset-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid rgba(239, 68, 68, 0.5);
        color: #fca5a5;
        padding: 10px 18px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: bold;
        transition: all 0.2s;
    }

    .reset-btn:hover {
        background: rgba(239, 68, 68, 0.4);
        border-color: #ef4444;
    }

    .close-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e2e8f0;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.3rem;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .skill-tree-svg {
        flex: 1;
        touch-action: none;
        cursor: grab;
        background: #0f172a;
    }

    .skill-tree-svg:active {
        cursor: grabbing;
    }

    .node-group {
        transition: filter 0.15s ease-out;
    }

    .node-group:hover {
        filter: brightness(1.3) drop-shadow(0 0 8px currentColor);
    }

    .pulse-ring {
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 0.5;
            r: 24;
        }
        50% {
            opacity: 0.2;
            r: 30;
        }
    }

    .tooltip-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
    }

    .tooltip-card {
        background: #1e293b;
        border-radius: 16px;
        overflow: hidden;
        min-width: 280px;
        max-width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .tooltip-header {
        padding: 16px 20px;
    }

    .tooltip-title {
        font-size: 1.3rem;
        font-weight: bold;
        color: white;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .tooltip-body {
        padding: 20px;
    }

    .tooltip-body p {
        color: #cbd5e1;
        margin: 0 0 15px 0;
        font-size: 0.95rem;
    }

    .tooltip-meta {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
        font-size: 0.85rem;
        color: #64748b;
    }

    .unlock-btn {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #a855f7, #7c3aed);
        border: none;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.2s;
    }

    .unlock-btn:hover {
        transform: scale(1.02);
    }

    .unlocked-badge {
        display: block;
        text-align: center;
        padding: 10px;
        background: rgba(34, 197, 94, 0.2);
        border-radius: 8px;
        color: #4ade80;
        font-weight: bold;
    }

    .locked-badge {
        display: block;
        text-align: center;
        padding: 10px;
        background: rgba(107, 114, 128, 0.2);
        border-radius: 8px;
        color: #9ca3af;
    }

    .tooltip-close {
        width: 100%;
        padding: 14px;
        background: #334155;
        border: none;
        color: #94a3b8;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background 0.2s;
    }

    .tooltip-close:hover {
        background: #475569;
    }

    .legend {
        position: absolute;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 20px;
        padding: 10px 20px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 25px;
        border: 1px solid #334155;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8rem;
        color: #94a3b8;
    }

    .legend-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
    }

    .legend-dot.unlocked {
        background: #22c55e;
        box-shadow: 0 0 6px #22c55e;
    }

    .legend-dot.available {
        background: #1f2937;
        border: 2px solid #fbbf24;
        box-shadow: 0 0 6px #fbbf24;
    }

    .legend-dot.locked {
        background: #374151;
        opacity: 0.5;
    }

    .legend-dot.move {
        background: #a855f7;
        box-shadow: 0 0 6px #a855f7;
    }

    .controls-hint {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.75rem;
        color: #64748b;
    }

    /* Mobile */
    @media (max-width: 768px) {
        .header {
            padding: 10px 15px;
        }

        .sprite {
            width: 40px;
            height: 40px;
        }

        .name-level h2 {
            font-size: 1rem;
        }

        .points-display {
            padding: 8px 14px;
        }

        .points-value {
            font-size: 1.3rem;
        }

        .legend {
            gap: 12px;
            padding: 8px 15px;
        }

        .legend-item {
            font-size: 0.7rem;
        }
    }
</style>
