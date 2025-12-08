import pokedexData from '../../assets/data/pokedex.json';
import abilitiesData from '../../assets/data/abilities.json';
import xpChartData from '../../assets/data/xp-chart.json';
import type { PokedexEntryJSON } from '../types';

// Local interfaces for abilities and XP (not in central types)
export interface AbilityJSON {
    id: number;
    names: string;
    description?: string;
}

export interface ExperienceDataJSON {
    growth_rate_id: number;
    level: number;
    experience: number;
}

// Re-export for convenience
export type { PokedexEntryJSON };

// Helper class to access data
export class Pokedex {
    private static instance: Pokedex;
    private entries: Map<number, PokedexEntryJSON> = new Map();
    private abilities: Map<string, AbilityJSON> = new Map();
    private xpChart: Map<number, Map<number, number>> = new Map(); // growthRateId -> level -> exp

    private seen: Set<number> = new Set();
    private caught: Set<number> = new Set();

    private constructor() {
        this.loadData();
        this.loadState();
    }

    public static getInstance(): Pokedex {
        if (!Pokedex.instance) {
            Pokedex.instance = new Pokedex();
        }
        return Pokedex.instance;
    }

    private loadData() {
        // Load Pokedex
        (pokedexData as PokedexEntryJSON[]).forEach(entry => {
            this.entries.set(entry.id, entry);
        });

        // Load Abilities
        (abilitiesData as AbilityJSON[]).forEach(ability => {
            this.abilities.set(ability.names, ability);
        });

        // Load XP Chart
        (xpChartData as ExperienceDataJSON[]).forEach(data => {
            if (!this.xpChart.has(data.growth_rate_id)) {
                this.xpChart.set(data.growth_rate_id, new Map());
            }
            this.xpChart.get(data.growth_rate_id)?.set(data.level, data.experience);
        });
    }

    private loadState() {
        try {
            const saved = localStorage.getItem('pokedex_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.seen = new Set(state.seen);
                this.caught = new Set(state.caught);
            }
        } catch (e) {
            console.error('Failed to load Pokedex state', e);
        }
    }

    public saveState() {
        try {
            const state = {
                seen: Array.from(this.seen),
                caught: Array.from(this.caught)
            };
            localStorage.setItem('pokedex_state', JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save Pokedex state', e);
        }
    }

    public markSeen(id: number) {
        if (!this.seen.has(id)) {
            this.seen.add(id);
            this.saveState();
        }
    }

    public markCaught(id: number) {
        this.markSeen(id);
        if (!this.caught.has(id)) {
            this.caught.add(id);
            this.saveState();
        }
    }

    public isSeen(id: number): boolean {
        return this.seen.has(id);
    }

    public isCaught(id: number): boolean {
        return this.caught.has(id);
    }

    public getSprite(id: number, type: 'front' | 'back' = 'front', shiny: boolean = false): string {
        const entry = this.entries.get(id);
        if (!entry) return '';

        const name = entry.name.toLowerCase()
            .replace('♀', 'f')
            .replace('♂', 'm')
            .replace(/[^a-z0-9-]/g, ''); // Remove any other special characters like . ' : space

        const folder = type === 'front' ? 'sprites' : 'sprites-back';
        // Shiny logic could be added here if we have shiny assets
        // For now assuming standard assets
        return `${import.meta.env.BASE_URL}sprites/monsters/static/${folder}/${name}.png`;
    }

    public getPokemon(id: number): PokedexEntryJSON | undefined {
        return this.entries.get(id);
    }

    public getPokemonByName(name: string): PokedexEntryJSON | undefined {
        // Case insensitive search
        const lowerName = name.toLowerCase();
        for (const entry of this.entries.values()) {
            if (entry.name.toLowerCase() === lowerName) {
                return entry;
            }
        }
        return undefined;
    }

    public getAllPokemon(): PokedexEntryJSON[] {
        return Array.from(this.entries.values());
    }

    public getAbility(name: string): AbilityJSON | undefined {
        return this.abilities.get(name);
    }

    public getExperience(growthRateId: number, level: number): number {
        return this.xpChart.get(growthRateId)?.get(level) || 0;
    }

    public getLevelFromExp(growthRateId: number, exp: number): number {
        const rateMap = this.xpChart.get(growthRateId);
        if (!rateMap) return 1;

        let level = 1;
        // Iterate through levels to find the highest level for the given exp
        // Since map keys are not guaranteed sorted, we should probably sort or assume 1-100
        for (let l = 1; l <= 100; l++) {
            const reqExp = rateMap.get(l) || 0;
            if (exp >= reqExp) {
                level = l;
            } else {
                break;
            }
        }
        return level;
    }
}

export const pokedex = Pokedex.getInstance();
