---
description: How to use the admin panel
---

# Admin Panel Usage

Access at: `http://localhost:5173/realm-shards/admin`

## Authentication

- Google Sign-In required
- Only `hktmika@gmail.com` has access

## Features

### 1. Pokemon List (Left Sidebar)
- Search by name or ID
- ⭐ indicates a starter Pokemon
- Click to select for editing

### 2. Stats Tab
- Edit base stats (1-255)
- Visual bars show relative values
- Auto-saves to localStorage

### 3. Types Tab
- Change primary type
- Add/remove secondary type

### 4. Moves Tab
- Shows ALL moves (not just level-up)
- Display: Power ⚔️, Accuracy 🎯, Category
- **Assign Slot**: Pick branch + slot number
- Conflicts show confirmation dialog

### 5. Starter Toggle
- Button in header: "☆ Set Starter"
- Maximum 3 starters allowed
- Shows count: (1/3), (2/3), (3/3)

### 6. Export
- Click "Export JSON" button
- Downloads `pokedex.json`
- Replace `src/assets/data/pokedex.json`
- Restart dev server

## Data Persistence

- Edits save to `localStorage` immediately
- Export merges edits with original data
- Clear button removes all localStorage edits
