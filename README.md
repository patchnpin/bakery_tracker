# 🧁 Bakery Story Recipe Tracker

A personal recipe tracker and finder for Bakery Story, built from spreadsheet data.

## Features
- **Recipe Finder** — filter by color, holiday, season, food type, cook time, and status
- **Oven view** — see all your ovens with recipe completion progress bars (TBA: pictures of each oven?)
- **Status tracking** — mark recipes as Completed (4★), Unlocked, or Locked

## Usage
Open `index.html` in any browser. No server needed — it runs fully offline.

## Updating recipe data
When you add new recipes, edit `recipes.csv` and `ovens.csv`. Then run `node build.js` in terminal. That will automatically update data.js and upload the new recipes/ovens.

## Files
- `index.html` — the full app
- `data.js` — recipe and oven data converted into json objects with additional calculated fields
- `ovens.csv` - spreadsheet containing essential oven data
- `recipes.csv` - spreadsheet containing essential recipe data
- `build.js`- updates `data.js` based on content in `ovens.csv` and `recipes.csv`
- `data-truncated.js`, `ovens-truncated.csv`, `recipes-truncated.csv` - truncated copies of the each file for testing changes to the builder
