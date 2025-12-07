<script lang="ts">
    import {
        saveStore,
        formatSaveDate,
        formatPlaytime,
        type SaveSlot,
    } from "../../lib/stores/saveStore";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher<{
        save: { slot: number };
        load: { slot: number };
        delete: { slot: number };
    }>();

    export let slot: SaveSlot;
    export let mode: "save" | "load" = "load";

    let confirmDelete = false;
    let showActions = false;

    function handleAction() {
        if (mode === "save") {
            dispatch("save", { slot: slot.slot });
        } else if (!slot.isEmpty) {
            dispatch("load", { slot: slot.slot });
        }
    }

    function handleDelete() {
        if (confirmDelete) {
            dispatch("delete", { slot: slot.slot });
            confirmDelete = false;
        } else {
            confirmDelete = true;
            setTimeout(() => (confirmDelete = false), 3000);
        }
    }
</script>

<div
    class="save-slot"
    class:empty={slot.isEmpty}
    class:confirm-delete={confirmDelete}
    on:mouseenter={() => (showActions = true)}
    on:mouseleave={() => {
        showActions = false;
        confirmDelete = false;
    }}
>
    {#if slot.isEmpty}
        <div class="slot-empty">
            <span class="slot-number">Slot {slot.slot + 1}</span>
            <span class="empty-label">— Empty —</span>
            {#if mode === "save"}
                <button class="action-btn save-btn" on:click={handleAction}>
                    💾 New Save
                </button>
            {/if}
        </div>
    {:else if slot.data}
        <div class="slot-content" on:click={handleAction}>
            <div class="slot-header">
                <span class="slot-name">{slot.data.name}</span>
                <span class="slot-number">#{slot.slot + 1}</span>
            </div>

            <div class="slot-preview">
                <div class="preview-party">
                    {#each slot.data.party.members.slice(0, 3) as member}
                        <span class="party-icon" title={member.name}>
                            {member.sprite?.idle || "👤"}
                        </span>
                    {/each}
                </div>
                <div class="preview-info">
                    <span class="level">Lv. {slot.data.preview.partyLevel}</span
                    >
                    <span class="location">📍 {slot.data.preview.location}</span
                    >
                </div>
            </div>

            <div class="slot-meta">
                <span class="gold">💰 {slot.data.party.gold}</span>
                <span class="playtime"
                    >⏱️ {formatPlaytime(slot.data.playtime)}</span
                >
                <span class="date">{formatSaveDate(slot.data.updated)}</span>
            </div>
        </div>

        {#if showActions}
            <div class="slot-actions">
                <button
                    class="action-btn"
                    class:primary={mode === "load"}
                    on:click={handleAction}
                >
                    {mode === "save" ? "💾 Overwrite" : "▶️ Load"}
                </button>
                <button
                    class="action-btn delete-btn"
                    class:confirm={confirmDelete}
                    on:click|stopPropagation={handleDelete}
                >
                    {confirmDelete ? "⚠️ Confirm?" : "🗑️"}
                </button>
            </div>
        {/if}
    {/if}
</div>

<style>
    .save-slot {
        background: var(--bg-medium);
        border: 2px solid var(--bg-light);
        padding: var(--space-md);
        position: relative;
        cursor: pointer;
        transition: all 0.2s;
        min-height: 120px;
        display: flex;
        flex-direction: column;
    }

    .save-slot:hover {
        border-color: var(--primary);
        transform: translateY(-2px);
    }

    .save-slot.empty {
        opacity: 0.7;
    }

    .save-slot.empty:hover {
        opacity: 1;
    }

    .save-slot.confirm-delete {
        border-color: var(--danger);
    }

    .slot-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-sm);
        flex: 1;
    }

    .empty-label {
        color: var(--text-muted);
        font-size: var(--font-size-sm);
    }

    .slot-content {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        flex: 1;
    }

    .slot-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .slot-name {
        color: var(--primary);
        font-size: var(--font-size-base);
    }

    .slot-number {
        color: var(--text-muted);
        font-size: var(--font-size-sm);
    }

    .slot-preview {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-xs) 0;
    }

    .preview-party {
        display: flex;
        gap: var(--space-xs);
    }

    .party-icon {
        font-size: 20px;
        background: var(--bg-dark);
        padding: 4px;
        border-radius: 4px;
    }

    .preview-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        font-size: var(--font-size-xs);
    }

    .level {
        color: var(--secondary);
    }

    .location {
        color: var(--text-secondary);
    }

    .slot-meta {
        display: flex;
        justify-content: space-between;
        font-size: var(--font-size-xs);
        color: var(--text-muted);
        border-top: 1px solid var(--bg-light);
        padding-top: var(--space-xs);
        margin-top: auto;
    }

    .gold {
        color: #f1c40f;
    }

    .slot-actions {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        gap: 2px;
        background: rgba(0, 0, 0, 0.9);
        padding: var(--space-xs);
    }

    .action-btn {
        flex: 1;
        padding: var(--space-xs) var(--space-sm);
        background: var(--bg-light);
        color: var(--text-primary);
        border: 1px solid var(--bg-light);
        font-family: var(--font-pixel);
        font-size: var(--font-size-xs);
        cursor: pointer;
        transition: all 0.2s;
    }

    .action-btn:hover {
        background: var(--primary);
        border-color: var(--primary);
    }

    .action-btn.primary {
        background: var(--primary);
        border-color: var(--primary);
    }

    .action-btn.delete-btn {
        flex: 0;
        padding: var(--space-xs);
    }

    .action-btn.delete-btn:hover,
    .action-btn.confirm {
        background: var(--danger);
        border-color: var(--danger);
    }

    .save-btn {
        margin-top: var(--space-sm);
    }
</style>
