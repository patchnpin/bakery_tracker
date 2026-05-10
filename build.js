/**
 * build.js — CSV → data.js converter
 *
 * Usage:
 *   node build.js
 *
 * Reads:
 *   ovens.csv         — columns: Oven Name, Total Quantity
 *   recipes.csv       — columns: Oven, Name, Cost, Revenue, Quantity, Hours to Cook,
 *                                Unlocked?, Completed?, Primary Color, Holiday,
 *                                Season, Type, Other Tags
 *   images/recipes/   — scanned for existing photo files (png)
 *
 * Writes:
 *   data.js           — OVENS, RECIPES, and IMAGE_SET arrays ready for index.html
 *
 * Calculated automatically (do NOT include in CSV):
 *   ovenCount     — Total Quantity from ovens.csv matched by oven name
 *   profit        — revenue - cost
 *   profitPerHour — profit / Hours to Cook (rounded to nearest integer)
 *
 * IMAGE_SET is a flat array of filenames (e.g. "3_Bears_Oven_Bear_Buns.png").
 * index.html uses it to instantly know which recipes have photos — no failed
 * network requests, no slow image probing.
 */

const fs = require('fs');
const path = require('path');

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseCSV(filepath) {
  const raw = fs.readFileSync(filepath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim(); });
    return obj;
  });
}

function splitCSVLine(line) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function bool(val) {
  return val.toUpperCase() === 'TRUE';
}

function hoursLabel(h) {
  const n = parseFloat(h);
  if (isNaN(n)) return '';
  if (n < 1) return `${Math.round(n * 60)}m`;
  if (n === Math.floor(n)) return `${n}h`;
  return `${n}h`;
}

function jsStr(val) {
  return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function serializeValue(v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number')  return String(v);
  return `"${jsStr(String(v))}"`;
}

function serializeObject(obj) {
  const pairs = Object.entries(obj).map(([k, v]) => `"${k}":${serializeValue(v)}`);
  return `{${pairs.join(', ')}}`;
}

// ── Load CSVs ─────────────────────────────────────────────────────────────────

const ovensCSV   = parseCSV(path.join(__dirname, 'ovens.csv'));
const recipesCSV = parseCSV(path.join(__dirname, 'recipes.csv'));

// ── Build oven count lookup  {ovenName → totalOvens} ──────────────────────────

const ovenCountMap = {};
ovensCSV.forEach(row => {
  const name = row['Oven Name'];
  const qty  = parseInt(row['Total Quantity'], 10) || 0;
  if (name) ovenCountMap[name] = qty;
});

// ── Build OVENS array ─────────────────────────────────────────────────────────

const recipesByOven = {};
recipesCSV.forEach(row => {
  const oven = row['Oven'];
  if (!oven) return;
  if (!recipesByOven[oven]) recipesByOven[oven] = { total: 0, completed: 0 };
  recipesByOven[oven].total++;
  if (bool(row['Completed?'])) recipesByOven[oven].completed++;
});

const ovens = Object.keys(ovenCountMap).map(name => {
  const stats = recipesByOven[name] || { total: 0, completed: 0 };
  return {
    name,
    totalOvens:       ovenCountMap[name],
    recipesCompleted: stats.completed,
    recipesTotal:     stats.total,
  };
});

// ── Build RECIPES array ───────────────────────────────────────────────────────

const recipes = recipesCSV.map(row => {
  const oven      = row['Oven']          || '';
  const name      = row['Name']          || '';
  const cost      = parseInt(row['Cost'], 10)      || 0;
  const revenue   = parseInt(row['Revenue'], 10)   || 0;
  const qty       = parseInt(row['Quantity'], 10)  || 0;
  const hours     = row['Hours to Cook'] || '';
  const hoursNum  = parseFloat(hours)    || 0;
  const unlocked  = bool(row['Unlocked?']);
  const completed = bool(row['Completed?']);
  const color     = row['Primary Color'] || '';
  const holiday   = row['Holiday']       || '';
  const season    = row['Season']        || '';
  const type      = row['Type']          || '';
  const otherTags = row['Other Tags']    || '';

  const ovenCount     = ovenCountMap[oven] ?? 0;
  const profit        = revenue - cost;
  const profitPerHour = hoursNum > 0 ? Math.round(profit / hoursNum) : 0;

  return {
    oven, name,
    cost:          String(cost),
    revenue:       String(revenue),
    hours,
    hoursNum,
    hoursLabel:    hoursLabel(hours),
    ovenCount,
    unlocked,
    completed,
    color,
    holiday,
    season,
    type,
    otherTags,
    profitPerHour: String(profitPerHour),
  };
});

// ── Scan images/recipes for existing photos ───────────────────────────────────

const imgDir = path.join(__dirname, 'images', 'recipes');
let imageFiles = [];
try {
  imageFiles = fs.readdirSync(imgDir)
    .filter(f => /\.png$/i.test(f));
  console.log(`📷 Found ${imageFiles.length} images in images/recipes/`);
} catch(e) {
  console.warn(`⚠️  Could not read ${imgDir} — IMAGE_SET will be empty. Make sure the folder exists.`);
}

// ── Write data.js ─────────────────────────────────────────────────────────────

const ovensJS   = ovens.map(o => '    ' + serializeObject(o)).join(',\n');
const recipesJS = recipes.map(r => '   ' + serializeObject(r)).join(',\n');
const imageSetJS = JSON.stringify(imageFiles);

const output = [
  `const OVENS = [\n${ovensJS}\n]`,
  `const RECIPES = [\n${recipesJS}\n]`,
  `const IMAGE_SET = ${imageSetJS}`,
  '',
].join('\n');

fs.writeFileSync(path.join(__dirname, 'data.js'), output, 'utf8');
console.log(`✅ data.js written — ${ovens.length} ovens, ${recipes.length} recipes, ${imageFiles.length} images indexed`);