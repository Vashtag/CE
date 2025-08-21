// CROSSCRAWL v1 main
import { PUZZLES } from './puzzles.js';

const q = (sel, el=document) => el.querySelector(sel);
const qa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

// Game constants
const ROOMS_PER_RUN = 3;
const START_FOCUS = 10;
const START_CHECKS = 3;
const START_REVEALS = 1;
const ROOM_PAR_SECONDS = 120; // 2 minutes

// Relic/Curses (fixed for v1)
const RELIC = { id: 'red-pencil', name: 'Red Pencil', desc: 'First wrong letter in a room deals 0 damage.' };
const CURSE = { id: 'fog-of-clue', name: 'Fog of Clue', desc: 'Clues hidden unless you Peek (cost 1 Focus).' };

// State
const state = {
  runActive: false,
  roomIndex: 0,
  focus: START_FOCUS,
  wrongs: 0,
  checks: START_CHECKS,
  reveals: START_REVEALS,
  redPencilAvailable: true,
  curseActive: true, // Fog of Clue always on in v1
  timer: null,
  secondsLeft: ROOM_PAR_SECONDS,
  puzzlesOrder: [],
  currentPuzzle: null,
  grid: [], // [{r,c,solution,entryId, value, correct, block}]
  entries: [], // from puzzle.across augmented with id, cells list
  currentEntryId: null,
  selectedCell: null,
  roomScore: 0,
  totalScore: 0,
};

// UI refs
const elGrid = q('#grid');
const elCluesAcross = q('#clues-across');
const elHudRoom = q('#hud-room');
const elHudFocus = q('#hud-focus');
const elHudTimer = q('#hud-timer');
const elHudWrongs = q('#hud-wrongs');
const elHudChecks = q('#hud-checks');
const elHudReveals = q('#hud-reveals');
const elHudRelic = q('#hud-relic');
const elHudCurse = q('#hud-curse');

const btnNewRun = q('#btn-new-run');
const btnHow = q('#btn-how');
const btnCheck = q('#btn-check-letter');
const btnReveal = q('#btn-reveal-letter');
const btnPeek = q('#btn-peek-clue');
const toggleContrast = q('#toggle-contrast');

const dlgHow = q('#modal-how');
const btnCloseHow = q('#btn-close-how');
const dlgRoomEnd = q('#modal-room-end');
const dlgRunEnd = q('#modal-run-end');
const btnContinue = q('#btn-continue');
const btnEndRun = q('#btn-end-run');
const btnNewRun2 = q('#btn-new-run-2');
const btnCloseSummary = q('#btn-close-summary');
const elRoomEndTitle = q('#room-end-title');
const elRoomEndBody = q('#room-end-body');
const elRunSummary = q('#run-summary');

// Helpers
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function timeFmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2,'0');
  const ss = (s % 60).toString().padStart(2,'0');
  return `${m}:${ss}`;
}

// Grid & entries
function buildGrid(puzzle) {
  state.grid = [];
  const size = puzzle.size;
  elGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  elGrid.innerHTML = '';
  for (let r=0; r<size; r++) {
    for (let c=0; c<size; c++) {
      const ch = puzzle.rows[r][c];
      const block = ch === '#';
      const cell = {
        r, c,
        solution: block ? '' : ch.toUpperCase(),
        value: '',
        correct: false,
        block,
        entryId: null
      };
      state.grid.push(cell);
    }
  }

  // Map across entries
  state.entries = puzzle.across.map((a, idx) => {
    const id = `A${a.no}`;
    const cells = [];
    for (let i = 0; i < a.len; i++) {
      const cell = getCell(a.row, a.col + i);
      cell.entryId = id;
      cells.push(cell);
    }
    return { id, ...a, cells, solved: false, revealed: !state.curseActive, hidden: state.curseActive };
  });

  // Build UI cells
  for (let r=0; r<size; r++) {
    for (let c=0; c<size; c++) {
      const cell = getCell(r,c);
      const div = document.createElement('div');
      div.className = 'cell' + (cell.block ? ' block' : '');
      div.setAttribute('role','gridcell');
      div.setAttribute('data-r', r);
      div.setAttribute('data-c', c);
      div.setAttribute('aria-selected','false');
      if (!cell.block) {
        div.tabIndex = 0;
        div.addEventListener('click', () => selectCell(r,c));
      }
      elGrid.appendChild(div);
    }
  }

  // Build clues
  elCluesAcross.innerHTML = '';
  for (const e of state.entries) {
    const li = document.createElement('li');
    li.className = 'clue' + (e.hidden ? ' hidden' : '');
    li.dataset.entryId = e.id;
    li.textContent = e.hidden ? `${e.no}. ???` : `${e.no}. ${e.clue}`;
    li.addEventListener('click', () => focusEntry(e.id));
    elCluesAcross.appendChild(li);
  }
}

function getCell(r,c) {
  return state.grid[r * state.currentPuzzle.size + c];
}

function renderGrid() {
  const cells = qa('.cell', elGrid);
  for (const div of cells) {
    const r = +div.dataset.r, c = +div.dataset.c;
    const cell = getCell(r,c);
    if (cell.block) continue;
    div.textContent = cell.value || '';
    div.classList.toggle('correct', cell.correct);
  }
  // Clues
  qa('.clue', elCluesAcross).forEach(li => {
    const e = state.entries.find(x => x.id === li.dataset.entryId);
    li.classList.toggle('current', e && e.id === state.currentEntryId);
    li.classList.toggle('hidden', e && e.hidden);
    if (e) li.textContent = (e.hidden ? `${e.no}. ???` : `${e.no}. ${e.clue}`);
  });
  // HUD
  elHudRoom.textContent = `${state.roomIndex+1}/${ROOMS_PER_RUN}`;
  elHudFocus.textContent = state.focus;
  elHudTimer.textContent = timeFmt(state.secondsLeft);
  elHudWrongs.textContent = state.wrongs;
  elHudChecks.textContent = state.checks;
  elHudReveals.textContent = state.reveals;
  elHudRelic.textContent = RELIC.name;
  elHudCurse.textContent = state.curseActive ? CURSE.name : '—';
}

function focusEntry(id) {
  state.currentEntryId = id;
  const entry = state.entries.find(e=>e.id===id);
  if (!entry) return;
  // Select first empty cell in entry
  const target = entry.cells.find(c => !c.value) || entry.cells[0];
  selectCell(target.r, target.c);
}

function selectCell(r,c) {
  const cell = getCell(r,c);
  if (cell.block) return;
  state.selectedCell = cell;
  // Ensure current entry matches
  const entry = state.entries.find(e=>e.cells.some(cc => cc === cell));
  if (entry) state.currentEntryId = entry.id;
  // Update selection visuals
  qa('.cell', elGrid).forEach(div => {
    const rr = +div.dataset.r, cc = +div.dataset.c;
    const inEntry = entry && entry.cells.some(x => x.r===rr && x.c===cc);
    div.setAttribute('aria-selected', (rr===r && cc===c) ? 'true' : 'false');
    div.style.outline = inEntry ? '1px solid #3a3f66' : 'none';
  });
  renderGrid();
}

// Input handling
document.addEventListener('keydown', (e) => {
  if (!state.runActive || !state.selectedCell) return;
  const cell = state.selectedCell;
  if (e.key === 'ArrowLeft') { moveSel(0,-1); e.preventDefault(); return; }
  if (e.key === 'ArrowRight') { moveSel(0,1); e.preventDefault(); return; }
  if (e.key === 'ArrowUp') { moveSel(-1,0); e.preventDefault(); return; }
  if (e.key === 'ArrowDown') { moveSel(1,0); e.preventDefault(); return; }
  if (e.key === 'Backspace') { setCellValue(cell, ''); e.preventDefault(); return; }
  if (e.key === 'Tab') {
    cycleEntry(!e.shiftKey); e.preventDefault(); return;
  }
  if (e.key === ' ') {
    // Jump to next empty cell in entry
    const entry = state.entries.find(e=>e.id===state.currentEntryId);
    if (entry) {
      const next = entry.cells.find(c=>!c.value);
      if (next) selectCell(next.r, next.c);
    }
    e.preventDefault(); return;
  }
  if (e.key.toLowerCase() === 'c') { doCheck(); e.preventDefault(); return; }
  if (e.key.toLowerCase() === 'r') { doReveal(); e.preventDefault(); return; }

  // Letters
  if (/^[a-zA-Z]$/.test(e.key)) {
    placeLetter(cell, e.key.toUpperCase());
    e.preventDefault();
  }
});

function moveSel(dr, dc) {
  let r = state.selectedCell.r + dr, c = state.selectedCell.c + dc;
  const size = state.currentPuzzle.size;
  while (r>=0 && r<size && c>=0 && c<size) {
    const candidate = getCell(r,c);
    if (!candidate.block) { selectCell(r,c); return; }
    r += dr; c += dc;
  }
}

function cycleEntry(forward=true) {
  const idx = state.entries.findIndex(e=>e.id===state.currentEntryId);
  if (idx===-1) return;
  const nextIdx = (idx + (forward?1:-1) + state.entries.length) % state.entries.length;
  const next = state.entries[nextIdx];
  focusEntry(next.id);
}

function setCellValue(cell, val) {
  cell.value = val;
  cell.correct = val && (val.toUpperCase() === cell.solution);
  renderGrid();
  checkEntrySolved(cell.entryId);
}

function placeLetter(cell, letter) {
  const wrongBefore = state.wrongs;
  const wasEmpty = !cell.value;
  setCellValue(cell, letter);
  if (letter !== cell.solution) {
    // Wrong placement: damage Focus
    animateWrong(cell.r, cell.c);
    if (state.redPencilAvailable) {
      state.redPencilAvailable = false; // absorb first wrong
    } else {
      state.focus -= 1;
      state.wrongs += 1;
      if (state.focus <= 0) {
        // End run immediately
        renderGrid();
        endRoom(false, true);
        return;
      }
    }
  }
  // Advance to next cell in current entry
  const entry = state.entries.find(e=>e.id===cell.entryId);
  if (!entry) return;
  const i = entry.cells.findIndex(c => c === cell);
  const next = entry.cells.slice(i+1).find(c => !c.block) || entry.cells[0];
  selectCell(next.r, next.c);
}

function animateWrong(r,c) {
  const cellDiv = qa('.cell', elGrid).find(d => +d.dataset.r===r && +d.dataset.c===c);
  if (!cellDiv) return;
  cellDiv.classList.add('wrong-anim');
  setTimeout(()=>cellDiv.classList.remove('wrong-anim'), 240);
}

function checkEntrySolved(entryId) {
  const entry = state.entries.find(e=>e.id===entryId);
  if (!entry) return;
  entry.solved = entry.cells.every(c => c.value && c.value.toUpperCase() === c.solution);
  if (entry.solved) {
    // reveal clue if fogged
    entry.hidden = false;
    renderGrid();
    // check all solved
    const allSolved = state.entries.every(e=>e.solved);
    if (allSolved) {
      endRoom(true, false);
    }
  }
}

// Actions
function doCheck() {
  if (state.checks <= 0) return;
  const cell = state.selectedCell;
  if (!cell || cell.block) return;
  state.checks -= 1;
  if (!cell.value) {
    // nothing typed; nudge
    animateWrong(cell.r, cell.c);
  } else {
    if (cell.value.toUpperCase() === cell.solution) {
      // give a tiny positive feedback
      const div = qa('.cell', elGrid).find(d => +d.dataset.r===cell.r && +d.dataset.c===cell.c);
      if (div) {
        div.style.boxShadow = '0 0 0 2px var(--good) inset';
        setTimeout(()=>div.style.boxShadow='none', 300);
      }
    } else {
      // show as wrong but no damage
      animateWrong(cell.r, cell.c);
    }
  }
  renderGrid();
}

function doReveal() {
  if (state.reveals <= 0) return;
  const cell = state.selectedCell;
  if (!cell || cell.block) return;
  state.reveals -= 1;
  setCellValue(cell, cell.solution);
  renderGrid();
}

function doPeek() {
  const entry = state.entries.find(e=>e.id===state.currentEntryId);
  if (!entry || !state.curseActive || !entry.hidden) return;
  if (state.focus <= 1) return; // keep at least 1
  entry.hidden = false;
  state.focus -= 1; // cost
  renderGrid();
}

// Room lifecycle
function startRun() {
  Object.assign(state, {
    runActive: true,
    roomIndex: 0,
    focus: START_FOCUS,
    wrongs: 0,
    checks: START_CHECKS,
    reveals: START_REVEALS,
    redPencilAvailable: true,
    curseActive: true,
    timer: null,
    secondsLeft: ROOM_PAR_SECONDS,
    puzzlesOrder: shuffle(PUZZLES).slice(0, ROOMS_PER_RUN),
    totalScore: 0,
    roomScore: 0,
  });
  startRoom();
}

function startRoom() {
  state.currentPuzzle = state.puzzlesOrder[state.roomIndex];
  state.redPencilAvailable = true;
  state.secondsLeft = ROOM_PAR_SECONDS;
  state.wrongs = 0;
  state.checks = START_CHECKS;
  state.reveals = START_REVEALS;
  state.roomScore = 0;

  buildGrid(state.currentPuzzle);
  renderGrid();

  // focus first entry
  if (state.entries.length) focusEntry(state.entries[0].id);

  // timer
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.secondsLeft -= 1;
    if (state.secondsLeft <= 0) {
      clearInterval(state.timer);
      endRoom(false, false, true); // time out
    }
    renderGrid();
  }, 1000);
}

function endRoom(solved, died=false, timedOut=false) {
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
  // Score: correct letters - wrongs + time bonus
  const totalLetters = state.grid.filter(c=>!c.block).length;
  const correctLetters = state.grid.filter(c=>c.value && c.value.toUpperCase()===c.solution).length;
  const base = correctLetters;
  const penalty = state.wrongs;
  const timeBonus = solved ? Math.max(0, state.secondsLeft) : 0;
  const roomScore = Math.max(0, base - penalty + Math.floor(timeBonus/5));
  state.roomScore = roomScore;
  state.totalScore += roomScore;

  // Dialog
  elRoomEndTitle.textContent = died ? 'You ran out of Focus!' : (solved ? 'Room Cleared!' : (timedOut ? 'Time's Up!' : 'Room Ended'));
  elRoomEndBody.innerHTML = `
    <p><strong>Puzzle:</strong> ${state.currentPuzzle.id}</p>
    <ul>
      <li><strong>Letters correct:</strong> ${correctLetters}/${totalLetters}</li>
      <li><strong>Wrongs:</strong> ${state.wrongs}</li>
      <li><strong>Time bonus:</strong> ${timeBonus}</li>
      <li><strong>Room score:</strong> ${roomScore}</li>
      <li><strong>Focus remaining:</strong> ${state.focus}</li>
    </ul>
  `;
  dlgRoomEnd.showModal();

  // If died or last room -> tweak buttons
  btnContinue.disabled = died;
  btnEndRun.textContent = (died || state.roomIndex >= ROOMS_PER_RUN-1) ? 'See Summary' : 'End Run';
}

function continueAfterRoom() {
  dlgRoomEnd.close();
  // Advance room
  if (state.roomIndex >= ROOMS_PER_RUN - 1) {
    // run end
    showRunSummary();
  } else {
    state.roomIndex += 1;
    startRoom();
  }
}

function showRunSummary() {
  const hi = Number(localStorage.getItem('crosscrawl_hi') || 0);
  if (state.totalScore > hi) localStorage.setItem('crosscrawl_hi', String(state.totalScore));
  const newHi = Math.max(hi, state.totalScore);

  elRunSummary.innerHTML = `
    <p><strong>Total Score:</strong> ${state.totalScore}</p>
    <p><strong>High Score (local):</strong> ${newHi}</p>
    <p>Thanks for playing this tiny prototype. You can add more puzzles in <code>js/puzzles.js</code>.</p>
  `;
  dlgRunEnd.showModal();
}

// Bind UI
btnNewRun.addEventListener('click', () => { dlgRunEnd.close(); dlgRoomEnd.close(); startRun(); });
btnNewRun2.addEventListener('click', () => { dlgRunEnd.close(); startRun(); });
btnHow.addEventListener('click', () => dlgHow.showModal());
btnCloseHow.addEventListener('click', () => dlgHow.close());
btnContinue.addEventListener('click', continueAfterRoom);
btnEndRun.addEventListener('click', () => { dlgRoomEnd.close(); showRunSummary(); });

btnCheck.addEventListener('click', doCheck);
btnReveal.addEventListener('click', doReveal);
btnPeek.addEventListener('click', doPeek);

toggleContrast.addEventListener('change', (e) => {
  document.body.classList.toggle('high-contrast', e.target.checked);
});

// On load
renderGrid();

  // Auto-start the room on load so it's immediately playable
  document.addEventListener('DOMContentLoaded', () => { startRoom(); });
