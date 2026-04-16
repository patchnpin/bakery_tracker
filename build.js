/**
 * build.js — CSV → data.js converter
 *
 * Usage:
 *   node build.js
 *
 * Reads:
 *   ovens.csv    — columns: Oven Name, Total Quantity
 *   recipes.csv  — columns: Oven, Name, Cost, Revenue, Quantity, Hours to Cook,
 *                           Unlocked?, Completed?, Primary Color, Holiday,
 *                           Season, Type, Other Tags
 *
 * Writes:
 *   data.js      — OVENS and RECIPES arrays ready for index.html
 *
 * Calculated automatically (do NOT include in CSV):
 *   ovenCount    — Total Quantity from ovens.csv matched by oven name
 *   revenuePerUnit      — Revenue / Quantity
 *   profit       — revenue - cost
 *   profitPerHour — profit / Hours to Cook  (rounded to nearest integer)
 */

const fs = require('fs');
const path = require('path');

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// Handles quoted fields with commas inside them
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
  // Escape backslashes and double-quotes for a JS string value
  return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ── Load CSVs ─────────────────────────────────────────────────────────────────

const ovensCSV   = parseCSV(path.join(__dirname, 'ovens.csv'));
const recipesCSV = parseCSV(path.join(__dirname, 'recipes.csv'));

// ── Build oven count lookup  {ovenName → totalOvens} ─────────────────────────

const ovenCountMap = {};
ovensCSV.forEach(row => {
  const name = row['Oven Name'];
  const qty  = parseInt(row['Total Quantity'], 10) || 0;
  if (name) ovenCountMap[name] = qty;
});

// ── Build OVENS array ─────────────────────────────────────────────────────────
// Derive recipesCompleted and recipesTotal from the recipes CSV

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
  const oven       = row['Oven']          || '';
  const name       = row['Name']          || '';
  const cost       = parseInt(row['Cost'], 10)     || 0;
  const revenue = parseInt(row['Revenue'], 10) || 0;
  const qty        = parseInt(row['Quantity'], 10)  || 0;
  const hours      = row['Hours to Cook'] || '';
  const hoursNum   = parseFloat(hours)    || 0;
  const unlocked   = bool(row['Unlocked?']);
  const completed  = bool(row['Completed?']);
  const color      = row['Primary Color'] || '';
  const holiday    = row['Holiday']       || '';
  const season     = row['Season']        || '';
  const type       = row['Type']          || '';
  const otherTags  = row['Other Tags']    || '';

  // Calculated fields
  const ovenCount    = ovenCountMap[oven] ?? 0;
  const revenuePerUnit = revenue / qty;
  const profit       = revenue - cost;
  const profitPerHour = hoursNum > 0 ? Math.round(profit / hoursNum) : 0;

  return {
    oven, name,
    cost:         String(cost),
    revenue:      String(revenue),
    hours,
    hoursNum,
    hoursLabel:   hoursLabel(hours),
    ovenCount,
    unlocked,
    completed,
    color,
    holiday,
    season,
    type,
    otherTags,
    profitPerHour: String(profitPerHour),
    revenuePerUnit: String(revenuePerUnit)
  };
});

// ── Serialize to JS ───────────────────────────────────────────────────────────

function serializeValue(v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number')  return String(v);
  return `"${jsStr(String(v))}"`;
}

function serializeObject(obj) {
  const pairs = Object.entries(obj).map(([k, v]) => `"${k}":${serializeValue(v)}`);
  return `{${pairs.join(', ')}}`;
}

const ovensJS   = ovens.map(o => '    ' + serializeObject(o)).join(',\n');
const recipesJS = recipes.map(r => '   ' + serializeObject(r)).join(',\n');

const output = `const OVENS = [\n${ovensJS}\n]\nconst RECIPES = [\n${recipesJS}\n]\n`;

fs.writeFileSync(path.join(__dirname, 'data.js'), output, 'utf8');
console.log(`✅ data.js written — ${ovens.length} ovens, ${recipes.length} recipes`);
