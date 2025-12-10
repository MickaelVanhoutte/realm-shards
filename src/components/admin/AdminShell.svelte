<script lang="ts">
    import { onMount } from 'svelte';
    import { authStore } from '../../lib/stores/authStore';
    import AdminPokedex from './AdminPokedex.svelte';
    import AdminMaps from './AdminMaps.svelte';

    let activeTab: 'pokedex' | 'maps' = 'pokedex';
    let googleButtonRef: HTMLDivElement;

    onMount(async () => {
        await authStore.init();

        // Render Google Sign-In button when needed
        const unsubscribe = authStore.subscribe(state => {
            if (state.isInitialized && !state.isLoggedIn && googleButtonRef) {
                setTimeout(() => {
                    authStore.renderButton(googleButtonRef);
                }, 100);
            }
        });

        return unsubscribe;
    });
</script>

<div class="admin-shell">
    {#if !$authStore.isInitialized}
        <div class="loading">
            <h2>Loading...</h2>
        </div>
    {:else if !$authStore.isLoggedIn}
        <div class="login-screen">
            <h1>🔒 Admin Panel</h1>
            <p>Sign in with Google to access the admin panel.</p>
            <div class="google-btn-container" bind:this={googleButtonRef}></div>
        </div>
    {:else if !$authStore.isAdmin}
        <div class="unauthorized">
            <h2>⛔ Access Denied</h2>
            <p>You are logged in as {$authStore.user?.email}</p>
            <p>This admin panel is restricted to authorized users only.</p>
            <button on:click={() => authStore.signOut()}>Sign Out</button>
        </div>
    {:else}
        <!-- Tab Navigation -->
        <nav class="tab-nav">
            <button class="tab-btn" class:active={activeTab === 'pokedex'} on:click={() => (activeTab = 'pokedex')}>
                📖 Pokédex
            </button>
            <button class="tab-btn" class:active={activeTab === 'maps'} on:click={() => (activeTab = 'maps')}>
                🗺️ Maps
            </button>
            <div class="tab-spacer"></div>
            <div class="user-info">
                <span>{$authStore.user?.email}</span>
                <button class="signout-btn" on:click={() => authStore.signOut()}> Sign Out </button>
            </div>
        </nav>

        <!-- Tab Content -->
        <div class="tab-content">
            {#if activeTab === 'pokedex'}
                <AdminPokedex embedded={true} />
            {:else if activeTab === 'maps'}
                <AdminMaps />
            {/if}
        </div>
    {/if}
</div>

<style>
    .admin-shell {
        width: 100%;
        height: 100vh;
        background: #1a1a2e;
        color: #eee;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .loading,
    .login-screen,
    .unauthorized {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 1rem;
    }

    .login-screen h1,
    .unauthorized h2 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }

    .login-screen p,
    .unauthorized p {
        color: #aaa;
    }

    .google-btn-container {
        margin-top: 1rem;
    }

    .unauthorized button {
        padding: 0.5rem 1rem;
        background: #e74c3c;
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 4px;
    }

    .tab-nav {
        display: flex;
        align-items: center;
        background: #16213e;
        padding: 0;
        border-bottom: 2px solid #0f3460;
        flex-shrink: 0;
    }

    .tab-btn {
        padding: 1rem 1.5rem;
        background: transparent;
        border: none;
        color: #888;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
        border-bottom: 3px solid transparent;
        margin-bottom: -2px;
    }

    .tab-btn:hover {
        color: #ccc;
        background: rgba(255, 255, 255, 0.05);
    }

    .tab-btn.active {
        color: #00d9ff;
        border-bottom-color: #00d9ff;
        background: rgba(0, 217, 255, 0.1);
    }

    .tab-spacer {
        flex: 1;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0 1rem;
        font-size: 0.9rem;
        color: #888;
    }

    .signout-btn {
        padding: 0.4rem 0.8rem;
        background: #333;
        border: 1px solid #555;
        color: #ccc;
        cursor: pointer;
        border-radius: 4px;
        font-size: 0.8rem;
    }

    .signout-btn:hover {
        background: #444;
    }

    .tab-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
</style>
