import { PUZZLES } from './puzzles.js';

const FOCUS_START = 10;
const CHECKS_START = 3;
const REVEALS_START = 2;
const TIME_PAR = 120; // seconds per room

let state = {};

// ── Run init ─────────────────────────────────────────────────────────────────

function initRun() {
  const shuffled = [...PUZZLES].sort(() => Math.random() - 0.5);
  state = {
    rooms: shuffled.slice(0, 3),
    room: 0,
    focus: FOCUS_START,
    checks: CHECKS_START,
    reveals: REVEALS_START,
    score: 0,
    grid: {},
    correct: new Set(),
    peekedEntries: new Set(),
    redPencilUsed: false,
    wrongAttempts: 0,
    selectedEntry: null,
    selectedCell: null,
    roomStartTime: Date.now(),
  };
  loadRoom(0);
}

function loadRoom(idx) {
  state.room = idx;
  state.grid = {};
  state.correct = new Set();
  state.peekedEntries = new Set();
  state.redPencilUsed = false;
  state.wrongAttempts = 0;
  state.selectedEntry = null;
  state.selectedCell = null;
  state.roomStartTime = Date.now();
  state.roomDone = false;
  renderAll();
  selectEntry(currentPuzzle().across[0].no);
}

function currentPuzzle() {
  return state.rooms[state.room];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function key(r, c) { return `${r},${c}`; }

function isBlock(puzzle, r, c) {
  return puzzle.rows[r][c] === '#';
}

function entryAt(puzzle, r, c) {
  return puzzle.across.find(e => e.row === r && c >= e.col && c < e.col + e.len) ?? null;
}

function correctLetter(puzzle, r, c) {
  const e = entryAt(puzzle, r, c);
  return e ? e.answer[c - e.col] : null;
}

function getCellDiv(r, c) {
  return document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderAll() {
  renderGrid();
  renderClues();
  renderHUD();
}

function renderGrid() {
  const puzzle = currentPuzzle();
  const container = document.getElementById('grid-container');
  container.style.gridTemplateColumns = `repeat(${puzzle.size}, 48px)`;
  container.innerHTML = '';

  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.r = r;
      div.dataset.c = c;
      div.tabIndex = -1;

      if (isBlock(puzzle, r, c)) {
        div.classList.add('block');
      } else {
        const k = key(r, c);
        if (state.correct.has(k)) div.classList.add('correct');

        const numEntry = puzzle.across.find(e => e.row === r && e.col === c);
        if (numEntry) {
          const span = document.createElement('span');
          span.className = 'cell-num';
          span.textContent = numEntry.no;
          div.appendChild(span);
        }

        const letterSpan = document.createElement('span');
        letterSpan.className = 'cell-letter';
        letterSpan.textContent = state.grid[k] || '';
        div.appendChild(letterSpan);

        div.addEventListener('click', () => handleCellClick(r, c));
      }
      container.appendChild(div);
    }
  }

  highlightSelection();
}

function highlightSelection() {
  document.querySelectorAll('.cell:not(.block)').forEach(div => {
    div.removeAttribute('aria-selected');
    div.style.background = '';
  });

  if (!state.selectedEntry) return;
  const e = state.selectedEntry;
  for (let i = 0; i < e.len; i++) {
    const div = getCellDiv(e.row, e.col + i);
    if (div) div.style.background = 'rgba(119,211,255,.15)';
  }
  if (state.selectedCell) {
    const div = getCellDiv(state.selectedCell.r, state.selectedCell.c);
    if (div) {
      div.setAttribute('aria-selected', 'true');
      div.focus({ preventScroll: true });
    }
  }
}

function renderClues() {
  const puzzle = currentPuzzle();
  const list = document.getElementById('clue-list');
  list.innerHTML = '';

  for (const entry of puzzle.across) {
    const li = document.createElement('li');
    li.className = 'clue';
    li.dataset.no = entry.no;

    const selected = state.selectedEntry?.no === entry.no;
    const peeked = state.peekedEntries.has(entry.no);

    if (selected) li.classList.add('current');

    if (!peeked) {
      li.classList.add('hidden');
      li.textContent = `${entry.no}. ???`;
    } else {
      li.textContent = `${entry.no}. ${entry.clue}`;
    }

    li.addEventListener('click', () => selectEntry(entry.no));
    list.appendChild(li);
  }
}

function renderHUD() {
  document.getElementById('room-num').textContent = state.room + 1;
  document.getElementById('focus-val').textContent = state.focus;
  document.getElementById('focus-fill').style.width = `${(state.focus / FOCUS_START) * 100}%`;
  document.getElementById('checks-val').textContent = state.checks;
  document.getElementById('reveals-val').textContent = state.reveals;
  document.getElementById('score-val').textContent = state.score;
  document.getElementById('best-val').textContent = localStorage.getItem('cc_best') || 0;
}

function updateCellDisplay(r, c) {
  const div = getCellDiv(r, c);
  if (!div) return;
  const k = key(r, c);
  const letterSpan = div.querySelector('.cell-letter');
  if (letterSpan) letterSpan.textContent = state.grid[k] || '';
  div.classList.toggle('correct', state.correct.has(k));
}

function triggerWrongAnim(r, c) {
  const div = getCellDiv(r, c);
  if (!div) return;
  div.classList.remove('wrong-anim');
  void div.offsetWidth;
  div.classList.add('wrong-anim');
  setTimeout(() => div.classList.remove('wrong-anim'), 250);
}

function setStatus(msg) {
  document.getElementById('status-msg').textContent = msg;
}

// ── Selection ─────────────────────────────────────────────────────────────────

function selectEntry(no) {
  const puzzle = currentPuzzle();
  const entry = puzzle.across.find(e => e.no === no);
  if (!entry) return;

  state.selectedEntry = entry;

  // Move cursor to first empty cell, or first cell
  let col = entry.col;
  for (let i = 0; i < entry.len; i++) {
    if (!state.grid[key(entry.row, entry.col + i)]) {
      col = entry.col + i;
      break;
    }
  }
  state.selectedCell = { r: entry.row, c: col };

  renderClues();
  highlightSelection();
}

function selectCell(r, c) {
  const puzzle = currentPuzzle();
  if (isBlock(puzzle, r, c)) return;
  const entry = entryAt(puzzle, r, c);
  if (!entry) return;

  if (state.selectedEntry?.no !== entry.no) {
    state.selectedEntry = entry;
    renderClues();
  }
  state.selectedCell = { r, c };
  highlightSelection();
}

function handleCellClick(r, c) {
  selectCell(r, c);
}

function advanceCursor() {
  if (!state.selectedEntry || !state.selectedCell) return;
  const e = state.selectedEntry;
  const next = state.selectedCell.c + 1;
  if (next < e.col + e.len) {
    state.selectedCell = { r: e.row, c: next };
    highlightSelection();
  }
}

function retreatCursor() {
  if (!state.selectedEntry || !state.selectedCell) return;
  const e = state.selectedEntry;
  const prev = state.selectedCell.c - 1;
  if (prev >= e.col) {
    state.selectedCell = { r: e.row, c: prev };
    highlightSelection();
  }
}

function cycleEntry(dir) {
  const entries = currentPuzzle().across;
  const idx = state.selectedEntry
    ? entries.findIndex(e => e.no === state.selectedEntry.no)
    : -1;
  selectEntry(entries[(idx + dir + entries.length) % entries.length].no);
}

// ── Input ─────────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (!state.selectedCell) return;

  if (e.key === ' ') { e.preventDefault(); peekClue(); return; }
  if (e.key === 'Tab') { e.preventDefault(); cycleEntry(e.shiftKey ? -1 : 1); return; }
  if (e.key === 'ArrowRight') { e.preventDefault(); advanceCursor(); return; }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); retreatCursor();  return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); return; }

  if (e.key === 'Backspace') {
    e.preventDefault();
    const { r, c } = state.selectedCell;
    const k = key(r, c);
    if (state.grid[k] && !state.correct.has(k)) {
      state.grid[k] = '';
      updateCellDisplay(r, c);
    } else {
      retreatCursor();
      const k2 = key(state.selectedCell.r, state.selectedCell.c);
      if (!state.correct.has(k2)) {
        state.grid[k2] = '';
        updateCellDisplay(state.selectedCell.r, state.selectedCell.c);
      }
    }
    return;
  }

  if (/^[a-zA-Z]$/.test(e.key)) {
    e.preventDefault();
    placeLetter(state.selectedCell.r, state.selectedCell.c, e.key.toUpperCase());
  }
});

// ── Letter placement ──────────────────────────────────────────────────────────

function placeLetter(r, c, letter) {
  const puzzle = currentPuzzle();
  const k = key(r, c);
  if (state.correct.has(k)) { advanceCursor(); return; }

  const expected = correctLetter(puzzle, r, c);
  state.grid[k] = letter;

  if (letter === expected) {
    state.correct.add(k);
    updateCellDisplay(r, c);
    advanceCursor();
    checkRoomComplete();
  } else {
    updateCellDisplay(r, c);
    triggerWrongAnim(r, c);

    if (!state.redPencilUsed) {
      state.redPencilUsed = true;
      setStatus('Red Pencil absorbed the first mistake!');
    } else {
      state.focus = Math.max(0, state.focus - 1);
      state.wrongAttempts++;
      renderHUD();
      setStatus(`Wrong! Focus: ${state.focus}`);
      if (state.focus <= 0) { setTimeout(gameOver, 300); }
    }
  }
}

// ── Consumables ───────────────────────────────────────────────────────────────

function checkLetter() {
  if (state.checks <= 0) { setStatus('No checks remaining!'); return; }
  if (!state.selectedCell) { setStatus('Select a cell first.'); return; }
  const { r, c } = state.selectedCell;
  const k = key(r, c);
  if (!state.grid[k]) { setStatus('Type a letter to check.'); return; }

  state.checks--;
  renderHUD();

  const expected = correctLetter(currentPuzzle(), r, c);
  if (state.grid[k] === expected) {
    state.correct.add(k);
    updateCellDisplay(r, c);
    setStatus('✓ Correct!');
    checkRoomComplete();
  } else {
    setStatus('✗ Wrong letter.');
  }
}

function revealLetter() {
  if (state.reveals <= 0) { setStatus('No reveals remaining!'); return; }
  if (!state.selectedCell) { setStatus('Select a cell first.'); return; }
  const { r, c } = state.selectedCell;
  const k = key(r, c);

  state.reveals--;
  state.grid[k] = correctLetter(currentPuzzle(), r, c);
  state.correct.add(k);
  updateCellDisplay(r, c);
  renderHUD();
  setStatus(`Revealed!`);
  advanceCursor();
  checkRoomComplete();
}

function peekClue() {
  if (!state.selectedEntry) { setStatus('Select a clue first.'); return; }
  if (state.peekedEntries.has(state.selectedEntry.no)) return;
  if (state.focus <= 0) { setStatus('No Focus left to peek!'); return; }

  state.focus--;
  state.peekedEntries.add(state.selectedEntry.no);
  renderHUD();
  renderClues();
  setStatus('Clue revealed!');
}

// ── Room complete ─────────────────────────────────────────────────────────────

function checkRoomComplete() {
  if (state.roomDone) return;
  const puzzle = currentPuzzle();
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (!isBlock(puzzle, r, c) && !state.correct.has(key(r, c))) return;
    }
  }
  state.roomDone = true;
  const roomScore = calcRoomScore();
  state.score += roomScore;
  renderHUD();
  setTimeout(() => showRoomComplete(roomScore), 300);
}

function calcRoomScore() {
  const puzzle = currentPuzzle();
  let correct = 0;
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (!isBlock(puzzle, r, c) && state.correct.has(key(r, c))) correct++;
    }
  }
  const elapsed = Math.floor((Date.now() - state.roomStartTime) / 1000);
  const timeBonus = Math.max(0, TIME_PAR - elapsed);
  return correct - state.wrongAttempts + timeBonus;
}

function showRoomComplete(roomScore) {
  const last = state.room >= 2;
  document.getElementById('dlg-room-title').textContent =
    last ? 'Run Complete! 🏆' : `Room ${state.room + 1} Clear!`;
  document.getElementById('dlg-room-msg').textContent =
    `Room score: +${roomScore}. Total so far: ${state.score}. Focus remaining: ${state.focus}.`;
  document.getElementById('btn-next-room').textContent =
    last ? 'See Final Score →' : 'Next Room →';
  document.getElementById('dialog-room').showModal();
}

document.getElementById('btn-next-room').addEventListener('click', () => {
  document.getElementById('dialog-room').close();
  if (state.room >= 2) { win(); } else { loadRoom(state.room + 1); }
});

// ── End states ────────────────────────────────────────────────────────────────

function gameOver() {
  document.getElementById('dlg-over-msg').textContent =
    `You ran out of Focus on Room ${state.room + 1}. Score: ${state.score}.`;
  document.getElementById('dialog-over').showModal();
}

document.getElementById('btn-restart').addEventListener('click', () => {
  document.getElementById('dialog-over').close();
  initRun();
});

function win() {
  const prev = parseInt(localStorage.getItem('cc_best') || '0');
  const isNew = state.score > prev;
  if (isNew) localStorage.setItem('cc_best', state.score);
  const best = Math.max(prev, state.score);

  document.getElementById('dlg-win-msg').textContent =
    `Final score: ${state.score}${isNew ? ' — New best! 🏆' : `. Best: ${best}.`}`;
  document.getElementById('dialog-win').showModal();
}

document.getElementById('btn-play-again').addEventListener('click', () => {
  document.getElementById('dialog-win').close();
  initRun();
});

// ── Buttons ───────────────────────────────────────────────────────────────────

document.getElementById('btn-check').addEventListener('click', checkLetter);
document.getElementById('btn-reveal').addEventListener('click', revealLetter);
document.getElementById('btn-peek').addEventListener('click', peekClue);
document.getElementById('btn-hc').addEventListener('click', () => {
  document.body.classList.toggle('high-contrast');
});

// ── Timer ─────────────────────────────────────────────────────────────────────

setInterval(() => {
  if (!state.roomStartTime) return;
  const s = Math.floor((Date.now() - state.roomStartTime) / 1000);
  document.getElementById('timer-display').textContent =
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}, 500);

// ── Boot ──────────────────────────────────────────────────────────────────────

initRun();
