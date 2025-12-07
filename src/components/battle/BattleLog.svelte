<script lang="ts">
    import { afterUpdate } from "svelte";

    export let messages: string[] = [];

    let logContainer: HTMLDivElement;

    afterUpdate(() => {
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    });
</script>

<div class="battle-log" bind:this={logContainer}>
    {#each messages as message, i}
        <p class="log-entry" class:latest={i === messages.length - 1}>
            {message}
        </p>
    {/each}
</div>

<style>
    .battle-log {
        height: 100%;
        overflow-y: auto;
        padding: var(--space-sm);
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .log-entry {
        font-size: 9px;
        color: var(--text-secondary);
        padding: 2px var(--space-xs);
        border-left: 2px solid transparent;
        transition: all 0.3s;
    }

    .log-entry.latest {
        color: var(--text-primary);
        border-left-color: var(--primary);
        background: rgba(233, 69, 96, 0.1);
    }

    .battle-log::-webkit-scrollbar {
        width: 4px;
    }

    .battle-log::-webkit-scrollbar-track {
        background: var(--bg-dark);
    }

    .battle-log::-webkit-scrollbar-thumb {
        background: var(--bg-light);
    }
</style>
