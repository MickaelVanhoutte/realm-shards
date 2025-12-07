/// <reference types="svelte" />
/// <reference types="vite/client" />

// Svelte component declarations
declare module '*.svelte' {
    import type { ComponentType, SvelteComponent } from 'svelte';
    const component: ComponentType<SvelteComponent>;
    export default component;
}
