<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { saveStore } from "../../lib/stores/saveStore";
    import SaveSlotCard from "./SaveSlotCard.svelte";

    const dispatch = createEventDispatcher<{
        close: void;
        load: { slot: number };
    }>();

    export let mode: "save" | "load" = "load";
    export let showClose: boolean = true;

    let message: { text: string; type: "success" | "error" } | null = null;

    $: slots = $saveStore;

    function handleSave(event: CustomEvent<{ slot: number }>) {
        const success = saveStore.saveGame(event.detail.slot);
        if (success) {
            message = { text: "Game saved!", type: "success" };
            setTimeout(() => (message = null), 2000);
        } else {
            message = { text: "Failed to save!", type: "error" };
        }
    }

    function handleLoad(event: CustomEvent<{ slot: number }>) {
        const success = saveStore.loadGame(event.detail.slot);
        if (success) {
            dispatch("load", { slot: event.detail.slot });
            dispatch("close");
        } else {
            message = { text: "Failed to load save!", type: "error" };
        }
    }

    function handleDelete(event: CustomEvent<{ slot: number }>) {
        saveStore.deleteSave(event.detail.slot);
        message = { text: "Save deleted", type: "success" };
        setTimeout(() => (message = null), 2000);
    }

    function close() {
        dispatch("close");
    }
</script>

<div class="save-menu-overlay" on:click|self={close}>
    <div class="save-menu">
        <header class="menu-header">
            <h2>{mode === "save" ? "💾 Save Game" : "📂 Load Game"}</h2>
            {#if showClose}
                <button class="close-btn" on:click={close}>✕</button>
            {/if}
        </header>

        {#if message}
            <div
                class="message"
                class:success={message.type === "success"}
                class:error={message.type === "error"}
            >
                {message.text}
            </div>
        {/if}

        <div class="slots-grid">
            {#each slots as slot (slot.slot)}
                <SaveSlotCard
                    {slot}
                    {mode}
                    on:save={handleSave}
                    on:load={handleLoad}
                    on:delete={handleDelete}
                />
            {/each}
        </div>

        <footer class="menu-footer">
            <p class="hint">
                {#if mode === "save"}
                    Select a slot to save your progress
                {:else}
                    Select a save to continue your adventure
                {/if}
            </p>
        </footer>
    </div>
</div>

<style>
    .save-menu-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;
        padding: var(--space-md);
    }

    .save-menu {
        background: var(--bg-dark);
        border: 3px solid var(--primary);
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .menu-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-md);
        border-bottom: 2px solid var(--bg-light);
        background: var(--bg-medium);
    }

    .menu-header h2 {
        margin: 0;
        font-size: var(--font-size-lg);
        color: var(--primary);
    }

    .close-btn {
        background: none;
        border: 1px solid var(--bg-light);
        color: var(--text-muted);
        width: 32px;
        height: 32px;
        cursor: pointer;
        font-size: var(--font-size-base);
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: var(--danger);
        border-color: var(--danger);
        color: white;
    }

    .message {
        padding: var(--space-sm) var(--space-md);
        text-align: center;
        font-size: var(--font-size-sm);
        animation: slideIn 0.2s ease-out;
    }

    .message.success {
        background: rgba(46, 204, 113, 0.2);
        color: #2ecc71;
        border-bottom: 1px solid #2ecc71;
    }

    .message.error {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
        border-bottom: 1px solid #e74c3c;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .slots-grid {
        padding: var(--space-md);
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }

    .menu-footer {
        padding: var(--space-md);
        border-top: 2px solid var(--bg-light);
        text-align: center;
    }

    .hint {
        color: var(--text-muted);
        font-size: var(--font-size-xs);
        margin: 0;
    }

    /* Mobile adjustments */
    @media (max-width: 480px) {
        .save-menu {
            max-height: 100vh;
            height: 100%;
            border: none;
        }

        .save-menu-overlay {
            padding: 0;
        }
    }
</style>
