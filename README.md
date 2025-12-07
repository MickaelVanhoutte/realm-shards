# Realm Shards

A pixel art turn-based RPG built with Svelte, inspired by Final Fantasy and Pokemon.

## 🎮 Features

- **Turn-based Combat**: Classic FF-style battle system with party vs enemies
- **Party System**: 3-character party (Warrior, Mage, Healer)
- **Abilities**: Physical attacks, magic spells, and healing
- **Pixel Art Aesthetic**: Retro-inspired visuals with modern polish

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deployment

This project is configured for GitHub Pages. Push to `main` branch to trigger automatic deployment via GitHub Actions.

### Manual Deployment

1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting

## 📁 Project Structure

```
realm-shards/
├── src/
│   ├── lib/
│   │   ├── stores/      # Svelte stores (game state, party, battle)
│   │   ├── engine/      # Combat logic
│   │   └── data/        # Characters, enemies, abilities
│   └── components/
│       ├── battle/      # Battle UI components
│       └── ui/          # General UI components
└── .github/workflows/   # CI/CD
```

## 🎯 Roadmap

- [ ] Exploration mode (top-down world map)
- [ ] Equipment system
- [ ] Save/Load functionality
- [ ] More enemies and encounters
- [ ] Creature catching system

## 📜 License

MIT
