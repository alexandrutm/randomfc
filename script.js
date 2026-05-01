/**
 * RandomFC – script.js
 *
 * Responsibilities:
 *  - Read comma-separated player names from 5 pot textareas.
 *  - Save / restore pot inputs from localStorage so they persist on refresh.
 *  - Generate 3 balanced teams by shuffling each pot and distributing
 *    players round-robin across Team A / B / C.
 *  - Render results dynamically (no page reload).
 *  - Support "Shuffle Again" and "Reset" actions.
 */

'use strict';

/* ─── Constants ───────────────────────────────────────────────────────── */
const NUM_POTS  = 5;
const NUM_TEAMS = 3;
const LS_KEY    = 'randomfc_pots';   // localStorage key

/* ─── DOM references ──────────────────────────────────────────────────── */
const generateBtn  = document.getElementById('generate-btn');
const shuffleBtn   = document.getElementById('shuffle-btn');
const resetBtn     = document.getElementById('reset-btn');
const errorMsg     = document.getElementById('error-msg');
const teamsSection = document.getElementById('teams-section');

const potInputs = Array.from(
  { length: NUM_POTS },
  (_, i) => document.getElementById(`pot-${i + 1}`)
);

const teamLists = [
  document.getElementById('team-a'),
  document.getElementById('team-b'),
  document.getElementById('team-c'),
];

const teamCounts = [
  document.getElementById('count-a'),
  document.getElementById('count-b'),
  document.getElementById('count-c'),
];

/* ─── localStorage helpers ────────────────────────────────────────────── */

/** Save all pot textarea values to localStorage. */
function savePots() {
  const values = potInputs.map(el => el.value);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(values));
  } catch (_) {
    // localStorage might be unavailable (private mode / quota exceeded)
  }
}

/** Restore pot textarea values from localStorage. */
function restorePots() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (!stored) return;
    const values = JSON.parse(stored);
    potInputs.forEach((el, i) => {
      if (typeof values[i] === 'string') el.value = values[i];
    });
  } catch (_) {
    // Ignore parse errors
  }
}

/* ─── Input parsing ───────────────────────────────────────────────────── */

/**
 * Parse a textarea value into a de-duplicated array of trimmed player names.
 *
 * Accepts comma-separated names: "Messi, Ronaldo, Neymar"
 * Also tolerates newline-separated entries.
 *
 * @param {string} raw  - Raw textarea value
 * @returns {string[]}
 */
function parseNames(raw) {
  return raw
    .split(/[\n,]+/)          // split on commas or newlines
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Read all pots and return an array of 5 player-name arrays.
 * Duplicate names across pots are removed (first occurrence wins).
 *
 * @returns {{ pot: number, name: string }[]}
 */
function readAllPlayers() {
  const seen    = new Set();
  const players = [];

  potInputs.forEach((el, i) => {
    const pot   = i + 1;
    const names = parseNames(el.value);
    names.forEach(name => {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        players.push({ pot, name });
      }
    });
  });

  return players;
}

/* ─── Team generation ─────────────────────────────────────────────────── */

/**
 * Fisher-Yates shuffle (in-place, returns array for chaining).
 *
 * @param {any[]} arr
 * @returns {any[]}
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build 3 balanced teams from a flat list of players.
 *
 * Algorithm:
 *  For each pot (1-5), shuffle the players in that pot, then assign
 *  them round-robin to Teams A, B, C.  This guarantees that each team
 *  receives an equal (or near-equal) share of players from every skill tier.
 *
 * @param {{ pot: number, name: string }[]} players
 * @returns {Array[]}  Array of NUM_TEAMS arrays (one per team)
 */
function generateTeams(players) {
  const teams = Array.from({ length: NUM_TEAMS }, () => []);

  for (let pot = 1; pot <= NUM_POTS; pot++) {
    const group = shuffle(players.filter(p => p.pot === pot));
    group.forEach((player, idx) => {
      teams[idx % NUM_TEAMS].push(player);
    });
  }

  return teams;
}

/* ─── Rendering ───────────────────────────────────────────────────────── */

/**
 * Render the teams into the DOM.
 *
 * @param {Array[]} teams
 */
function renderTeams(teams) {
  teams.forEach((team, ti) => {
    const ul = teamLists[ti];
    ul.innerHTML = '';

    // Sort by pot within each team so highest-skill players appear first
    const sorted = team.slice().sort((a, b) => a.pot - b.pot);

    sorted.forEach(player => {
      const li  = document.createElement('li');

      const dot = document.createElement('span');
      dot.className = `pot-dot dot-${player.pot}`;
      dot.title     = `Pot ${player.pot}`;

      const name = document.createTextNode(player.name);

      li.appendChild(dot);
      li.appendChild(name);
      ul.appendChild(li);
    });

    teamCounts[ti].textContent = `${team.length} player${team.length !== 1 ? 's' : ''}`;
  });

  teamsSection.hidden = false;
  shuffleBtn.hidden   = false;
  teamsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Show / hide error ───────────────────────────────────────────────── */

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden      = false;
}

function hideError() {
  errorMsg.hidden = true;
}

/* ─── Main action: generate / shuffle ────────────────────────────────── */

function onGenerate() {
  hideError();
  savePots();

  const players = readAllPlayers();

  if (players.length < NUM_TEAMS) {
    showError(`Please add at least ${NUM_TEAMS} players across the pots before generating teams.`);
    return;
  }

  const teams = generateTeams(players);
  renderTeams(teams);
}

/* ─── Reset ───────────────────────────────────────────────────────────── */

function onReset() {
  if (!confirm('Clear all players and reset?')) return;

  potInputs.forEach(el => (el.value = ''));
  teamsSection.hidden = true;
  shuffleBtn.hidden   = true;
  hideError();

  try {
    localStorage.removeItem(LS_KEY);
  } catch (_) {}

  // Return focus to first pot
  potInputs[0].focus();
}

/* ─── Auto-save on input ──────────────────────────────────────────────── */

potInputs.forEach(el => el.addEventListener('input', savePots));

/* ─── Event listeners ─────────────────────────────────────────────────── */

generateBtn.addEventListener('click', onGenerate);
shuffleBtn.addEventListener('click',  onGenerate);   // re-runs the same logic
resetBtn.addEventListener('click',    onReset);

/* ─── Bootstrap ───────────────────────────────────────────────────────── */

restorePots();   // reload previously entered names
