---
description: How to add tests for new features
---

# Testing Workflow

## Before Implementing a Feature

1. Understand what logic needs testing
2. Check existing tests in `src/lib/data/__tests__/`

## Adding Tests for New Features

### 1. Create or update test file

Test files follow the pattern `[module].test.ts`:
```
src/lib/data/__tests__/
├── creatures.test.ts      # Creature/species logic
├── effects.test.ts        # Status effects, stat modifiers
├── moves.test.ts          # Type effectiveness, move data
├── pokemonSkillUtils.test.ts  # Skill tree logic
└── trainer.test.ts        # Trainer skills, exp system
```

### 2. Write tests first (TDD) or alongside code

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myModule';

describe('myFunction', () => {
    it('does expected behavior', () => {
        expect(myFunction(input)).toBe(expectedOutput);
    });
});
```

### 3. Run tests

```bash
npm run test:watch  # Re-runs on file changes
```

### 4. Verify all tests pass before committing

```bash
npm run test
```

## Test Coverage Guidelines

- **Pure functions** in `src/lib/data/` should have tests
- **Type calculations** (effectiveness, damage) must be tested
- **Game logic** (exp gain, skill unlocks) must be tested
- UI components don't need unit tests (test manually)

## Mock Data Pattern

For tests that would need pokedex loading, use mock objects:

```typescript
const mockCreature: Creature = {
    id: 'test_creature',
    speciesId: 'test',
    level: 5,
    // ... minimal required fields
};
```

## Running Coverage Report

```bash
npm run test:coverage
```

Coverage HTML report is generated in `coverage/` folder.
