# 🧁 Bakery Story Recipe Tracker

A personal recipe tracker and finder for Bakery Story, built from your spreadsheet data.

## Features
- **Recipe Finder** — filter by color, holiday, season, food type, cook time, and status
- **Oven view** — see all your ovens with recipe completion progress bars
- **Status tracking** — mark recipes as Completed (4★), Unlocked, or Locked
- **Favorites** — tag recipes as ❤️ or 😬 Ooglay
- **Persistent** — changes saved in your browser's localStorage

## Usage
Open `index.html` in any browser. No server needed — it runs fully offline.

## Updating recipe data
When you add new recipes, edit `data.js` and update the `RECIPES` array.
A scraper script (`scraper.py`) will be added later to automate this from Gamerologizm.

## Files
- `index.html` — the full app
- `data.js` — all recipe and oven data from your spreadsheet
