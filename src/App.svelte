<script lang="ts">
  import { gameState } from "./lib/stores/gameState";
  import NewBattleScene from "./components/battle/NewBattleScene.svelte";
  import TitleScreen from "./components/ui/TitleScreen.svelte";
  import ExplorationScene from "./components/exploration/ExplorationScene.svelte";
</script>

<main class="game-container">
  {#if $gameState.screen === "title"}
    <TitleScreen />
  {:else if $gameState.screen === "battle"}
    <NewBattleScene />
  {:else if $gameState.screen === "exploration"}
    <ExplorationScene />
  {:else}
    <div class="placeholder">
      <h2>Unknown Screen</h2>
      <button on:click={() => gameState.setScreen("title")}>
        Return to Title
      </button>
    </div>
  {/if}
</main>

<style>
  .game-container {
    width: 100%;
    height: 100%;
    max-width: 960px;
    max-height: 640px;
    background: var(--bg-panel);
    border: var(--border-pixel);
    box-shadow: var(--shadow-glow);
    position: relative;
    overflow: hidden;
  }

  /* Full screen on mobile */
  @media (max-width: 768px) {
    .game-container {
      max-width: 100%;
      max-height: 100%;
      border: none;
      border-radius: 0;
    }
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: var(--space-lg);
    padding: var(--space-md);
  }

  .placeholder h2 {
    font-size: var(--font-size-lg);
    color: var(--primary);
    text-align: center;
  }

  .placeholder p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .placeholder button {
    font-family: var(--font-pixel);
    font-size: var(--font-size-base);
    padding: var(--space-md) var(--space-xl);
    min-height: var(--touch-min);
    background: var(--primary);
    color: var(--text-primary);
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .placeholder button:hover,
  .placeholder button:active {
    background: var(--primary-dark);
    transform: scale(1.05);
  }
</style>
