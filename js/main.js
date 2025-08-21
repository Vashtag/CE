// Crosscrawl v1 — Room Demo (Focus, Red Pencil, Fog of Clue)
// Vanilla JS, no deps

(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // Elements
  const gridEl = $('#grid');
  const acrossList = $('#across-clues');
  const downList = $('#down-clues');
  const puzzleTitle = $('#puzzle-title');
  const focusBar = $('#focus-bar');
  const checksLeftEl = $('#checks-left');
  const revealsLeftEl = $('#reveals-left');
  const scoreEl = $('#score');
  const dirLabel = $('#dir-label');

  const btnStart = $('#btn-start');
  const btnCheck = $('#btn-check-letter');
  const btnReveal = $('#btn-reveal-letter');
  const btnToggleDir = $('#btn-toggle-dir');
  const toggleFog = $('#toggle-fog');
  const toggleRed = $('#toggle-red-pencil');

  const overlay = $('#overlay');
  const overlayBody = $('#overlay-body');
  const overlayClose = $('#overlay-close');
  const linkReadme = $('#link-readme');

  // Game Config (tweakable)
  const START_FOCUS = 10;
  const START_CHECKS = 3;
  const START_REVEALS = 1;
  const LETTER_SCORE = 10;
  const REMAINING_FOCUS_BONUS = 20;
  const REVEAL_PENALTY = 10; // subtract from score per reveal used
  const REVEAL_FOCUS_COST = 1; // Focus cost for each reveal

  // State
  let state = {
    puzzle: null, // current puzzle data
    size: 0,
    grid: [], // 2D array of cells {answer, entryAcross, entryDown, char, blocked}
    entriesAcross: [], // {num, cells:[{r,c}], answer, clue, revealed, fogHidden}
    entriesDown: [],
    cellIndex: {r:0, c:0},
    direction: 'across', // 'across' | 'down'
    focus: START_FOCUS,
    checks: START_CHECKS,
    reveals: START_REVEALS,
    redPencilActive: true, // if toggle on, available for this room
    redPencilUnusedThisRoom: true,
    fogActive: true,
    score: 0,
    wrongOnce: new Set(), // "r,c" keys; to avoid double damage on same cell
    revealsUsed: 0,
    completed: false,
  };

  function resetStateWithPuzzle(pz){
    state.puzzle = pz;
    state.size = pz.size;
    state.grid = [];
    state.entriesAcross = [];
    state.entriesDown = [];
    state.cellIndex = {r:0,c:0};
    state.direction = 'across';
    state.focus = START_FOCUS;
    state.checks = START_CHECKS;
    state.reveals = START_REVEALS;
    state.redPencilActive = toggleRed.checked;
    state.redPencilUnusedThisRoom = state.redPencilActive;
    state.fogActive = toggleFog.checked;
    state.score = 0;
    state.wrongOnce = new Set();
    state.revealsUsed = 0;
    state.completed = false;
  }

  function startRoom(){
    // For v1 we always load the first puzzle
    const pz = window.CROSSCRAWL_PUZZLES[0];
    resetStateWithPuzzle(pz);
    puzzleTitle.textContent = pz.title;
    buildGridFromPuzzle();
    computeEntries();
    drawGrid();
    drawClues();
    updateUI();
    setSelection({r:0,c:0});
    gridEl.focus();
  }

  function buildGridFromPuzzle(){
    const sz = state.size;
    state.grid = [];
    for(let r=0; r<sz; r++){
      const rowStr = state.puzzle.grid[r];
      const row = [];
      for(let c=0; c<sz; c++){
        const ch = rowStr[c];
        const blocked = ch === '#';
        row.push({
          r, c,
          answer: blocked ? null : ch.toUpperCase(),
          char: '', // player's entry
          blocked,
          correct: false,
          revealed: false,
        });
      }
      state.grid.push(row);
    }
  }

  function computeEntries(){
    const sz = state.size;
    // Across
    let acrossNum = 1;
    for(let r=0; r<sz; r++){
      let c=0;
      while(c<sz){
        if(!state.grid[r][c].blocked && (c===0 || state.grid[r][c-1].blocked)){
          // start of across
          const cells = [];
          let cc = c;
          while(cc<sz && !state.grid[r][cc].blocked){
            cells.push(state.grid[r][cc]);
            cc++;
          }
          const answer = cells.map(cell => cell.answer).join('');
          const clueText = state.puzzle.acrossClues[ state.entriesAcross.length ] || '(clue)';
          state.entriesAcross.push({ num: acrossNum, cells, answer, clue: clueText, revealed:false, fogHidden:true });
          // link cells to this across entry
          cells.forEach(cell => cell.entryAcross = state.entriesAcross[state.entriesAcross.length-1]);
          acrossNum++;
          c = cc;
        }else{
          c++;
        }
      }
    }
    // Down
    let downNum = 1;
    for(let c=0; c<sz; c++){
      let r=0;
      while(r<sz){
        if(!state.grid[r][c].blocked && (r===0 || state.grid[r-1][c].blocked)){
          // start of down
          const cells = [];
          let rr = r;
          while(rr<sz && !state.grid[rr][c].blocked){
            cells.push(state.grid[rr][c]);
            rr++;
          }
          const answer = cells.map(cell => cell.answer).join('');
          const clueText = state.puzzle.downClues[ state.entriesDown.length ] || '(clue)';
          state.entriesDown.push({ num: downNum, cells, answer, clue: clueText, revealed:false, fogHidden:true });
          cells.forEach(cell => cell.entryDown = state.entriesDown[state.entriesDown.length-1]);
          downNum++;
          r = rr;
        }else{
          r++;
        }
      }
    }
  }

  function drawGrid(){
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    gridEl.setAttribute('role','grid');
    gridEl.setAttribute('aria-rowcount', String(state.size));
    for(let r=0; r<state.size; r++){
      for(let c=0; c<state.size; c++){
        const cell = state.grid[r][c];
        const div = document.createElement('div');
        div.className = 'cell';
        div.setAttribute('role','gridcell');
        div.setAttribute('data-r', r);
        div.setAttribute('data-c', c);
        div.setAttribute('data-blocked', cell.blocked ? 'true' : 'false');
        div.setAttribute('aria-label', `Row ${r+1} Column ${c+1}`);
        if(cell.blocked){
          div.textContent = '';
        }else{
          const numSpan = document.createElement('span');
          numSpan.className = 'num';
          const num = cellNumberLabel(cell);
          if(num) numSpan.textContent = num;
          div.appendChild(numSpan);

          const letterSpan = document.createElement('span');
          letterSpan.className = 'glyph';
          letterSpan.textContent = cell.char || '';
          div.appendChild(letterSpan);
        }
        gridEl.appendChild(div);
      }
    }
  }

  function cellNumberLabel(cell){
    // Show across or down number if this cell starts an entry; across has priority in label
    let label = '';
    const {r,c} = cell;
    const leftBlocked = (c===0) || state.grid[r][c-1].blocked;
    const upBlocked = (r===0) || state.grid[r-1][c].blocked;
    if(!cell.blocked && leftBlocked){
      // find across entry num
      label = cell.entryAcross?.num || '';
    }else if(!cell.blocked && upBlocked){
      label = cell.entryDown?.num || '';
    }
    return label;
  }

  function drawClues(){
    // across
    acrossList.innerHTML = '';
    for(const entry of state.entriesAcross){
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'clue';
      span.textContent = entry.clue;
      if(state.fogActive && entry.cells.every(c => !c.char)){
        span.classList.add('fog');
      }
      li.textContent = `${entry.num}. `;
      li.appendChild(span);
      li.addEventListener('click', () => {
        // jump to first empty cell of this entry
        const target = entry.cells.find(c => !c.char) || entry.cells[0];
        setSelection({r:target.r, c:target.c}, 'across');
      });
      acrossList.appendChild(li);
    }
    // down
    downList.innerHTML = '';
    for(const entry of state.entriesDown){
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'clue';
      span.textContent = entry.clue;
      if(state.fogActive && entry.cells.every(c => !c.char)){
        span.classList.add('fog');
      }
      li.textContent = `${entry.num}. `;
      li.appendChild(span);
      li.addEventListener('click', () => {
        const target = entry.cells.find(c => !c.char) || entry.cells[0];
        setSelection({r:target.r, c:target.c}, 'down');
      });
      downList.appendChild(li);
    }
  }

  function updateClueFogForEntry(entry){
    // Reveal clue if any letter placed in the entry
    const anyLetter = entry.cells.some(c => !!c.char);
    entry.fogHidden = !(anyLetter);
  }

  function setSelection(pos, dir){
    if(typeof dir === 'string') state.direction = dir;
    state.cellIndex = clampToValidCell(pos, state.direction);
    dirLabel.textContent = state.direction[0].toUpperCase() + state.direction.slice(1);
    refreshGridSelection();
  }

  function clampToValidCell(pos, dir){
    let {r,c} = pos;
    r = Math.max(0, Math.min(state.size-1, r));
    c = Math.max(0, Math.min(state.size-1, c));
    let cell = state.grid[r][c];
    // If blocked, nudge in dir until non-blocked
    if(cell.blocked){
      if(dir === 'across'){
        // search row for nearest non-blocked
        for(let cc=0; cc<state.size; cc++){
          if(!state.grid[r][cc].blocked){ c = cc; break; }
        }
      }else{
        for(let rr=0; rr<state.size; rr++){
          if(!state.grid[rr][c].blocked){ r = rr; break; }
        }
      }
      cell = state.grid[r][c];
    }
    return {r,c};
  }

  function refreshGridSelection(){
    // Update letters and selection classes
    const cells = $$('.cell', gridEl);
    for(const div of cells){
      const r = +div.getAttribute('data-r');
      const c = +div.getAttribute('data-c');
      const cell = state.grid[r][c];
      const glyph = $('.glyph', div);
      if(glyph) glyph.textContent = cell.char || '';
      div.setAttribute('data-correct', cell.correct ? 'true' : 'false');
      div.setAttribute('data-revealed', cell.revealed ? 'true' : 'false');
      div.classList.toggle('selected', r === state.cellIndex.r && c === state.cellIndex.c);
    }
    // Update clues fog visuals
    drawClues();
    updateUI();
  }

  function moveSelection(step){
    // step: +1 or -1 within current entry
    const entry = currentEntry();
    if(!entry) return;
    const cells = entry.cells;
    let idx = cells.findIndex(c => c.r === state.cellIndex.r && c.c === state.cellIndex.c);
    idx = (idx + step + cells.length) % cells.length;
    setSelection({r: cells[idx].r, c: cells[idx].c});
  }

  function jumpToNextEntry(){
    const list = state.direction === 'across' ? state.entriesAcross : state.entriesDown;
    // current entry index
    const current = currentEntry();
    let i = list.indexOf(current);
    i = (i + 1) % list.length;
    const target = list[i].cells.find(c => !c.char) || list[i].cells[0];
    setSelection({r:target.r, c:target.c});
  }

  function currentCell(){
    return state.grid[state.cellIndex.r][state.cellIndex.c];
  }
  function currentEntry(){
    const cell = currentCell();
    return state.direction === 'across' ? cell.entryAcross : cell.entryDown;
  }

  function placeLetter(letter){
    if(state.completed) return;
    letter = letter.toUpperCase();
    const cell = currentCell();
    if(cell.blocked) return;

    const key = `${cell.r},${cell.c}`;
    const correctChar = cell.answer;
    if(letter === correctChar){
      cell.char = letter;
      cell.correct = true;
      // score positive for first-time correct placement
      // only score when cell was empty
      state.score += LETTER_SCORE;
      // auto move to next empty cell in entry
      const entry = currentEntry();
      updateClueFogForEntry(entry);
      refreshGridSelection();
      if(checkRoomComplete()){
        onRoomComplete();
      }else{
        const next = entry.cells.find(c => !c.char);
        if(next){
          setSelection({r:next.r, c:next.c});
        }else{
          // entry done; jump to next entry
          jumpToNextEntry();
        }
      }
    }else{
      // wrong letter — apply damage once per cell (unless red pencil saves it)
      // put the letter in temporarily (classic crosswords often allow this); here we do NOT keep wrong letters
      // We simply pulse error and keep cell empty
      const div = cellDiv(cell.r, cell.c);
      if(div){
        div.classList.remove('error-pulse');
        // force reflow to retrigger animation
        void div.offsetWidth;
        div.classList.add('error-pulse');
      }
      if(!state.wrongOnce.has(key)){
        let dmg = 1;
        if(state.redPencilActive && state.redPencilUnusedThisRoom){
          dmg = 0;
          state.redPencilUnusedThisRoom = false;
          toast('✏️ Red Pencil saved you from damage!');
        }
        if(dmg > 0){
          applyDamage(dmg);
        }
        state.wrongOnce.add(key);
      }
    }
  }

  function applyDamage(amount){
    state.focus = Math.max(0, state.focus - amount);
    updateUI();
    if(state.focus <= 0){
      onRoomFailed();
    }
  }

  function checkLetterAction(){
    if(state.completed) return;
    if(state.checks <= 0){ toast('No checks left.'); return; }
    const cell = currentCell();
    if(cell.blocked){ toast('Blocked cell.'); return; }
    state.checks -= 1;
    const div = cellDiv(cell.r, cell.c);
    if(cell.char && cell.char === cell.answer){
      // flash good
      flash(div, 'good');
    }else{
      flash(div, 'bad');
    }
    updateUI();
  }

  function revealLetterAction(){
    if(state.completed) return;
    if(state.reveals <= 0){ toast('No reveals left.'); return; }
    const cell = currentCell();
    if(cell.blocked){ toast('Blocked cell.'); return; }
    state.reveals -= 1;
    state.revealsUsed += 1;
    if(REVEAL_FOCUS_COST > 0){
      applyDamage(REVEAL_FOCUS_COST);
      if(state.focus <= 0) return; // already failed
    }
    cell.char = cell.answer;
    cell.correct = true;
    cell.revealed = true;
    const entry = currentEntry();
    updateClueFogForEntry(entry);
    refreshGridSelection();
    if(checkRoomComplete()){
      onRoomComplete();
    }
    updateUI();
  }

  function flash(div, kind){
    if(!div) return;
    div.style.transition = 'box-shadow .2s ease';
    const color = kind === 'good' ? 'rgba(107,255,147,.7)' : 'rgba(255,107,107,.7)';
    div.style.boxShadow = `0 0 0 6px ${color}`;
    setTimeout(() => div.style.boxShadow = '', 200);
  }

  function cellDiv(r, c){
    return $(`.cell[data-r="${r}"][data-c="${c}"]`, gridEl);
  }

  function updateUI(){
    // Focus bar
    focusBar.innerHTML = '';
    const hearts = '❤'.repeat(state.focus) + '<span class="muted">' + '♡'.repeat(Math.max(0, START_FOCUS - state.focus)) + '</span>';
    focusBar.innerHTML = hearts;
    // Checks/Reveals/Score
    checksLeftEl.textContent = state.checks;
    revealsLeftEl.textContent = state.reveals;
    scoreEl.textContent = state.score;
  }

  function onRoomComplete(){
    state.completed = true;
    const totalLetters = totalFillableCells();
    const bonus = state.focus * REMAINING_FOCUS_BONUS - state.revealsUsed * REVEAL_PENALTY;
    const total = state.score + bonus;
    overlayBody.innerHTML = `
      <p><strong>Clear!</strong></p>
      <p>Letters placed: ${totalLetters} × ${LETTER_SCORE} = ${totalLetters * LETTER_SCORE}</p>
      <p>Remaining Focus bonus: ${state.focus} × ${REMAINING_FOCUS_BONUS} = ${state.focus * REMAINING_FOCUS_BONUS}</p>
      <p>Reveal penalty: ${state.revealsUsed} × ${REVEAL_PENALTY} = ${state.revealsUsed * REVEAL_PENALTY}</p>
      <p><strong>Total Score: ${total}</strong></p>
    `;
    overlay.hidden = false;
  }

  function onRoomFailed(){
    state.completed = true;
    overlayBody.innerHTML = `
      <p><strong>You ran out of Focus.</strong></p>
      <p>Try again with fewer guesses or spend checks/reveals wisely.</p>
    `;
    $('#overlay-title').textContent = 'Run Over';
    overlay.hidden = false;
  }

  function totalFillableCells(){
    let n=0;
    for(let r=0;r<state.size;r++){
      for(let c=0;c<state.size;c++){
        if(!state.grid[r][c].blocked) n++;
      }
    }
    return n;
  }

  function checkRoomComplete(){
    for(let r=0;r<state.size;r++){
      for(let c=0;c<state.size;c++){
        const cell = state.grid[r][c];
        if(cell.blocked) continue;
        if(cell.char !== cell.answer) return false;
      }
    }
    return true;
  }

  function toast(msg){
    // Simple non-intrusive alert
    console.log(msg);
  }

  // Event handlers
  btnStart.addEventListener('click', startRoom);
  btnCheck.addEventListener('click', checkLetterAction);
  btnReveal.addEventListener('click', revealLetterAction);
  btnToggleDir.addEventListener('click', () => {
    state.direction = state.direction === 'across' ? 'down' : 'across';
    dirLabel.textContent = state.direction[0].toUpperCase() + state.direction.slice(1);
    refreshGridSelection();
  });
  overlayClose.addEventListener('click', () => overlay.hidden = true);
  linkReadme.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Open README.md in the repo for instructions.');
  });

  // Keyboard input
  document.addEventListener('keydown', (e) => {
    if(!state.puzzle) return;
    if(state.completed && e.key !== 'Escape') return;
    const key = e.key;
    if(key.length === 1 && /[a-zA-Z]/.test(key)){
      placeLetter(key);
      e.preventDefault();
      return;
    }
    switch(key){
      case 'Backspace': {
        const cell = currentCell();
        if(!cell.blocked){
          cell.char = '';
          cell.correct = false;
          refreshGridSelection();
        }
        e.preventDefault();
        break;
      }
      case 'ArrowRight':
        if(state.direction === 'across') moveSelection(+1);
        else setSelection({r: state.cellIndex.r, c: Math.min(state.size-1, state.cellIndex.c+1)});
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if(state.direction === 'across') moveSelection(-1);
        else setSelection({r: state.cellIndex.r, c: Math.max(0, state.cellIndex.c-1)});
        e.preventDefault();
        break;
      case 'ArrowDown':
        if(state.direction === 'down') moveSelection(+1);
        else setSelection({r: Math.min(state.size-1, state.cellIndex.r+1), c: state.cellIndex.c});
        e.preventDefault();
        break;
      case 'ArrowUp':
        if(state.direction === 'down') moveSelection(-1);
        else setSelection({r: Math.max(0, state.cellIndex.r-1), c: state.cellIndex.c});
        e.preventDefault();
        break;
      case 'Tab':
        jumpToNextEntry();
        e.preventDefault();
        break;
      case ' ':
        state.direction = state.direction === 'across' ? 'down' : 'across';
        dirLabel.textContent = state.direction[0].toUpperCase() + state.direction.slice(1);
        refreshGridSelection();
        e.preventDefault();
        break;
      case 'Escape':
        overlay.hidden = true;
        break;
    }
  });

  // Initialize with a placeholder grid so layout renders before Start
  function placeholder(){
    const sz = 4;
    gridEl.style.gridTemplateColumns = `repeat(${sz}, 1fr)`;
    for(let i=0;i<sz*sz;i++){
      const d = document.createElement('div');
      d.className = 'cell';
      gridEl.appendChild(d);
    }
  }
  placeholder();
})();
