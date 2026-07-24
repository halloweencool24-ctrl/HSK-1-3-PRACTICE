// ============================================================
// app.js - Web Học Tiếng Trung HSK - Application Logic
// ============================================================

// ── State ──────────────────────────────────────────────────
const STATE = {
  level: 'hsk1',
  mode: 'vocab',       // vocab | flashcard | quiz | fillblank | listening | arrangement
  cardIndex: 0,
  cardFlipped: false,
  quizIndex: 0,
  fillIndex: 0,
  listenIndex: 0,
  arrangeIndex: 0,
  score: 0,
  total: 0,
  quizAnswered: false,
  fillAnswered: false,
  listenAnswered: false,
  arrangedWords: [],
  vocabFilter: 'all',
  vocabSearch: '',
  progress: {},   // loaded from localStorage
};

// ── Load / Save Progress ────────────────────────────────────
function loadProgress() {
  try {
    const saved = localStorage.getItem('hsk-progress');
    if (saved) STATE.progress = JSON.parse(saved);
  } catch(e) {}
}

function saveProgress() {
  try {
    localStorage.setItem('hsk-progress', JSON.stringify(STATE.progress));
  } catch(e) {}
}

function updateLevelScore(level, mode, correct, total) {
  if (!STATE.progress[level]) STATE.progress[level] = {};
  if (!STATE.progress[level][mode]) STATE.progress[level][mode] = { correct: 0, total: 0, attempts: 0 };
  STATE.progress[level][mode].correct  += correct;
  STATE.progress[level][mode].total    += total;
  STATE.progress[level][mode].attempts += 1;
  saveProgress();
  renderSidebarProgress();
}

function getLevelScore(level) {
  const p = STATE.progress[level];
  if (!p) return 0;
  let correct = 0, total = 0;
  Object.values(p).forEach(m => { correct += m.correct; total += m.total; });
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

// ── DOM Helpers ─────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function setActive(selector, activeEl) {
  $$(selector).forEach(el => el.classList.remove('active'));
  if (activeEl) activeEl.classList.add('active');
}

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadProgress();
  buildSidebar();
  renderSidebarProgress();
  setMode('vocab');
  updateHeaderStats();
});

// ── Build Sidebar ────────────────────────────────────────────
function buildSidebar() {
  // Level buttons
  const levelsEl = $('sidebar-levels');
  Object.keys(HSK_DATA).forEach(key => {
    const lvl = HSK_DATA[key];
    const score = getLevelScore(key);
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (key === STATE.level ? ' active' : '');
    btn.id = `lvl-btn-${key}`;
    btn.innerHTML = `
      <span class="level-dot" style="background:${lvl.color}"></span>
      <span>
        <div class="level-name">${lvl.name}</div>
        <div class="level-words">${lvl.description} · ${score}%</div>
      </span>
    `;
    btn.addEventListener('click', () => setLevel(key));
    levelsEl.appendChild(btn);
  });

  // Mode buttons
  const modes = [
    { id: 'vocab',       icon: '📚', label: 'Từ vựng' },
    { id: 'flashcard',   icon: '🃏', label: 'Flashcard' },
    { id: 'quiz',        icon: '📝', label: 'Trắc nghiệm' },
    { id: 'fillblank',   icon: '✏️', label: 'Điền chỗ trống' },
    { id: 'listening',   icon: '🎧', label: 'Luyện nghe' },
    { id: 'arrangement', icon: '🔀', label: 'Sắp xếp câu', hsk3only: true },
  ];
  const modesEl = $('sidebar-modes');
  modes.forEach(m => {
    if (m.hsk3only && STATE.level !== 'hsk3') return;
    const btn = document.createElement('button');
    btn.className = 'mode-btn' + (m.id === STATE.mode ? ' active' : '');
    btn.id = `mode-btn-${m.id}`;
    btn.innerHTML = `<span class="mode-icon">${m.icon}</span> ${m.label}`;
    btn.addEventListener('click', () => setMode(m.id));
    modesEl.appendChild(btn);
  });
}

function rebuildModeSidebar() {
  const modesEl = $('sidebar-modes');
  modesEl.innerHTML = '';
  const modes = [
    { id: 'vocab',       icon: '📚', label: 'Từ vựng' },
    { id: 'flashcard',   icon: '🃏', label: 'Flashcard' },
    { id: 'quiz',        icon: '📝', label: 'Trắc nghiệm' },
    { id: 'fillblank',   icon: '✏️', label: 'Điền chỗ trống' },
    { id: 'listening',   icon: '🎧', label: 'Luyện nghe' },
    { id: 'arrangement', icon: '🔀', label: 'Sắp xếp câu', hsk3only: true },
  ];
  modes.forEach(m => {
    if (m.hsk3only && STATE.level !== 'hsk3') return;
    const btn = document.createElement('button');
    btn.className = 'mode-btn' + (m.id === STATE.mode ? ' active' : '');
    btn.id = `mode-btn-${m.id}`;
    btn.innerHTML = `<span class="mode-icon">${m.icon}</span> ${m.label}`;
    btn.addEventListener('click', () => setMode(m.id));
    modesEl.appendChild(btn);
  });
}

function renderSidebarProgress() {
  const wrap = $('sidebar-progress-items');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.keys(HSK_DATA).forEach(key => {
    const lvl = HSK_DATA[key];
    const score = getLevelScore(key);
    wrap.innerHTML += `
      <div class="progress-item">
        <div class="progress-label">
          <span>${lvl.name}</span>
          <span>${score}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${score}%;background:${lvl.color}"></div>
        </div>
      </div>
    `;
  });
}

// ── Level & Mode Switching ───────────────────────────────────
function setLevel(key) {
  STATE.level = key;
  STATE.cardIndex = 0;
  STATE.quizIndex = 0;
  STATE.fillIndex = 0;
  STATE.listenIndex = 0;
  STATE.arrangeIndex = 0;
  STATE.arrangedWords = [];

  // Update level buttons
  Object.keys(HSK_DATA).forEach(k => {
    const btn = $(`lvl-btn-${k}`);
    if (btn) {
      btn.classList.toggle('active', k === key);
      const score = getLevelScore(k);
      btn.querySelector('.level-words').textContent = `${HSK_DATA[k].description} · ${score}%`;
    }
  });

  // Rebuild modes (arrangement only for hsk3)
  rebuildModeSidebar();

  // Re-render current mode (fallback to vocab if arrangement not available)
  if (STATE.mode === 'arrangement' && key !== 'hsk3') {
    setMode('vocab');
  } else {
    setMode(STATE.mode);
  }
}

function setMode(mode) {
  STATE.mode = mode;
  STATE.score = 0;
  STATE.total = 0;
  STATE.quizIndex = 0;
  STATE.fillIndex = 0;
  STATE.listenIndex = 0;
  STATE.arrangeIndex = 0;
  STATE.cardIndex = 0;
  STATE.cardFlipped = false;
  STATE.quizAnswered = false;
  STATE.fillAnswered = false;
  STATE.listenAnswered = false;
  STATE.arrangedWords = [];

  // Update mode buttons
  $$('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `mode-btn-${mode}`);
  });
  $$('.mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // Render
  const content = $('main-content');
  content.className = 'content-area fade-in';

  switch(mode) {
    case 'vocab':       renderVocab(); break;
    case 'flashcard':   renderFlashcard(); break;
    case 'quiz':        renderQuiz(); break;
    case 'fillblank':   renderFillBlank(); break;
    case 'listening':   renderListening(); break;
    case 'arrangement': renderArrangement(); break;
  }
}

// ── Header Stats ─────────────────────────────────────────────
function updateHeaderStats() {
  let totalCorrect = 0, totalDone = 0;
  Object.values(STATE.progress).forEach(lvl => {
    Object.values(lvl).forEach(m => {
      totalCorrect += m.correct;
      totalDone    += m.total;
    });
  });
  const acc = totalDone === 0 ? 0 : Math.round(totalCorrect / totalDone * 100);
  const stat1 = $('header-stat-score');
  const stat2 = $('header-stat-done');
  if (stat1) stat1.textContent = acc + '%';
  if (stat2) stat2.textContent = totalDone;
}

// ════════════════════════════════════════════════════════════
// VOCAB BROWSER
// ════════════════════════════════════════════════════════════
function renderVocab() {
  const lvl = HSK_DATA[STATE.level];
  const vocab = lvl.vocabulary;
  const categories = ['all', ...new Set(vocab.map(v => v.category))];

  $('main-content').innerHTML = `
    <div class="page-header fade-in">
      <div class="page-title">📚 Từ vựng ${lvl.name}</div>
      <div class="page-subtitle">${vocab.length} từ · Nhấp vào thẻ để xem ví dụ</div>
    </div>
    <div class="search-wrap">
      <input id="vocab-search" class="search-input" type="text" placeholder="Tìm kiếm từ (Hán tự, Pinyin hoặc nghĩa)..." />
      <span class="search-icon">🔍</span>
    </div>
    <div class="cat-filter" id="cat-filter"></div>
    <div class="vocab-grid" id="vocab-grid"></div>
  `;

  // Category pills
  const catEl = $('cat-filter');
  categories.forEach(cat => {
    const pill = document.createElement('button');
    pill.className = 'cat-pill' + (STATE.vocabFilter === cat ? ' active' : '');
    pill.textContent = cat === 'all' ? 'Tất cả' : cat;
    pill.addEventListener('click', () => {
      STATE.vocabFilter = cat;
      $$('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderVocabGrid(vocab);
    });
    catEl.appendChild(pill);
  });

  // Search
  $('vocab-search').addEventListener('input', e => {
    STATE.vocabSearch = e.target.value.toLowerCase();
    renderVocabGrid(vocab);
  });

  renderVocabGrid(vocab);
}

function renderVocabGrid(vocab) {
  const grid = $('vocab-grid');
  const filtered = vocab.filter(v => {
    const matchCat = STATE.vocabFilter === 'all' || v.category === STATE.vocabFilter;
    const q = STATE.vocabSearch;
    const matchSearch = !q || v.hanzi.includes(q) || v.pinyin.toLowerCase().includes(q) || v.meaning.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🔎</div>
      <h3>Không tìm thấy từ nào</h3>
      <p>Hãy thử tìm kiếm khác</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map((v, i) => `
    <div class="vocab-card" onclick="showVocabDetail(${i})" title="${v.example}">
      <div class="vc-hanzi hanzi">${v.hanzi}</div>
      <div class="vc-pinyin">${v.pinyin}</div>
      <div class="vc-meaning">${v.meaning}</div>
      <div class="vc-cat">${v.category}</div>
    </div>
  `).join('');
}

function showVocabDetail(idx) {
  const lvl = HSK_DATA[STATE.level];
  const filtered = lvl.vocabulary.filter(v => {
    const matchCat = STATE.vocabFilter === 'all' || v.category === STATE.vocabFilter;
    const q = STATE.vocabSearch;
    const matchSearch = !q || v.hanzi.includes(q) || v.pinyin.toLowerCase().includes(q) || v.meaning.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
  const v = filtered[idx];
  if (!v) return;

  // Show a quick modal-style toast with example
  const existing = document.querySelector('.vocab-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'vocab-modal';
  modal.style.cssText = `
    position:fixed;bottom:32px;left:50%;transform:translateX(-50%);
    background:rgba(15,15,34,0.98);border:1px solid rgba(192,57,43,0.4);
    border-radius:16px;padding:24px 32px;max-width:480px;width:90%;
    box-shadow:0 20px 60px rgba(0,0,0,0.8);z-index:5000;
    animation:slideUp 0.3s ease;text-align:center;
  `;
  modal.innerHTML = `
    <div style="font-family:'Noto Sans SC';font-size:48px;font-weight:900;color:#f1c40f;margin-bottom:8px">${v.hanzi}</div>
    <div style="font-size:18px;color:#f39c12;margin-bottom:4px">${v.pinyin}</div>
    <div style="font-size:16px;color:#f0f0f5;font-weight:600;margin-bottom:16px">${v.meaning}</div>
    <div style="font-family:'Noto Sans SC';font-size:16px;color:#a0a0b8;margin-bottom:4px">📖 ${v.example}</div>
    <div style="font-size:13px;color:#606080;font-style:italic;margin-bottom:20px">${v.ex_vi}</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button onclick="speakText('${v.hanzi}')" style="padding:8px 16px;background:rgba(192,57,43,0.2);border:1px solid rgba(192,57,43,0.4);border-radius:8px;color:#e74c3c;font-size:13px;cursor:pointer;font-weight:600;">🔊 Nghe phát âm</button>
      <button onclick="this.closest('.vocab-modal').remove()" style="padding:8px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#a0a0b8;font-size:13px;cursor:pointer;">Đóng</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Auto close after 5s
  setTimeout(() => { if (modal.parentNode) modal.remove(); }, 6000);
}

// ════════════════════════════════════════════════════════════
// FLASHCARD
// ════════════════════════════════════════════════════════════
function renderFlashcard() {
  const lvl = HSK_DATA[STATE.level];
  const vocab = lvl.vocabulary;
  const v = vocab[STATE.cardIndex];

  $('main-content').innerHTML = `
    <div class="page-header fade-in">
      <div class="page-title">🃏 Flashcard · ${lvl.name}</div>
      <div class="page-subtitle">Nhấp vào thẻ để lật xem nghĩa</div>
    </div>

    <div class="flashcard-container">
      <div class="flashcard-meta">
        <span class="card-counter">Thẻ <strong>${STATE.cardIndex+1}</strong> / ${vocab.length}</span>
        <span class="card-category">${v.category}</span>
        <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px;" onclick="shuffleCards()">🔀 Xáo trộn</button>
      </div>

      <div class="card-scene" id="card-scene" onclick="flipCard()">
        <div class="card-3d" id="card-3d">
          <div class="card-face card-front">
            <div class="card-label">Chữ Hán</div>
            <div class="card-hanzi hanzi">${v.hanzi}</div>
            <div class="card-hint">Nhấp để xem nghĩa →</div>
          </div>
          <div class="card-face card-back">
            <div class="card-label">Nghĩa & Ví dụ</div>
            <div class="card-pinyin">${v.pinyin}</div>
            <div class="card-meaning">${v.meaning}</div>
            <div class="card-example hanzi">${v.example}</div>
            <div class="card-example-vi">${v.ex_vi}</div>
          </div>
        </div>
      </div>

      <div class="card-flip-hint" id="flip-hint">
        <span>👆</span> <span>Nhấp vào thẻ để lật</span>
      </div>

      <div class="rating-row" id="rating-row" style="display:none;width:100%;max-width:600px;">
        <button class="rating-btn rating-again" onclick="rateCard('again')">😅 Lại</button>
        <button class="rating-btn rating-hard"  onclick="rateCard('hard')">🤔 Khó</button>
        <button class="rating-btn rating-good"  onclick="rateCard('good')">😊 Tốt</button>
        <button class="rating-btn rating-easy"  onclick="rateCard('easy')">😎 Dễ</button>
      </div>

      <div class="flashcard-controls">
        <button class="btn btn-ghost btn-icon" onclick="prevCard()" ${STATE.cardIndex === 0 ? 'disabled' : ''}>←</button>
        <button class="btn btn-ghost" onclick="speakCard()">🔊 Nghe</button>
        <button class="btn btn-primary" onclick="nextCard()" ${STATE.cardIndex === vocab.length-1 ? 'disabled' : ''}>Tiếp theo →</button>
      </div>
    </div>
  `;
}

function flipCard() {
  STATE.cardFlipped = !STATE.cardFlipped;
  const card = $('card-3d');
  if (!card) return;
  card.classList.toggle('flipped', STATE.cardFlipped);

  if (STATE.cardFlipped) {
    $('flip-hint').style.display = 'none';
    $('rating-row').style.display = 'flex';
    speakCard();
  } else {
    $('flip-hint').style.display = 'flex';
    $('rating-row').style.display = 'none';
  }
}

function prevCard() {
  const vocab = HSK_DATA[STATE.level].vocabulary;
  if (STATE.cardIndex > 0) {
    STATE.cardIndex--;
    STATE.cardFlipped = false;
    renderFlashcard();
  }
}

function nextCard() {
  const vocab = HSK_DATA[STATE.level].vocabulary;
  if (STATE.cardIndex < vocab.length - 1) {
    STATE.cardIndex++;
    STATE.cardFlipped = false;
    renderFlashcard();
  } else {
    showToast('🎉 Bạn đã xem hết tất cả các thẻ!', 'success');
  }
}

function rateCard(rating) {
  const correct = (rating === 'good' || rating === 'easy') ? 1 : 0;
  STATE.score += correct;
  STATE.total += 1;
  updateLevelScore(STATE.level, 'flashcard', correct, 1);
  updateHeaderStats();
  nextCard();
}

function shuffleCards() {
  const vocab = HSK_DATA[STATE.level].vocabulary;
  for (let i = vocab.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [vocab[i], vocab[j]] = [vocab[j], vocab[i]];
  }
  STATE.cardIndex = 0;
  STATE.cardFlipped = false;
  renderFlashcard();
  showToast('🔀 Đã xáo trộn thẻ!', 'info');
}

function speakCard() {
  const vocab = HSK_DATA[STATE.level].vocabulary;
  speakText(vocab[STATE.cardIndex].hanzi);
}

// ════════════════════════════════════════════════════════════
// QUIZ
// ════════════════════════════════════════════════════════════
function renderQuiz() {
  const lvl = HSK_DATA[STATE.level];
  const questions = lvl.quiz;

  if (STATE.quizIndex >= questions.length) {
    renderResults('quiz');
    return;
  }

  const q = questions[STATE.quizIndex];
  const progress = ((STATE.quizIndex) / questions.length * 100).toFixed(0);

  $('main-content').innerHTML = `
    <div class="page-header fade-in">
      <div class="page-title">📝 Trắc nghiệm · ${lvl.name}</div>
      <div class="page-subtitle">Câu ${STATE.quizIndex+1}/${questions.length} · Điểm: <strong style="color:#f1c40f">${STATE.score}</strong></div>
    </div>

    <div class="quiz-container fade-in">
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${progress}%"></div>
      </div>

      <div class="quiz-question-card">
        <div class="quiz-q-number">Câu hỏi ${STATE.quizIndex+1}</div>
        <div class="quiz-q-text">${q.q}</div>
      </div>

      <div class="quiz-options" id="quiz-options">
        ${q.opts.map((opt, i) => `
          <button class="quiz-option" id="qopt-${i}" onclick="selectQuizAnswer(${i})">
            <span class="opt-label">${String.fromCharCode(65+i)}</span>
            <span class="hanzi">${opt}</span>
          </button>
        `).join('')}
      </div>

      <div id="quiz-feedback" style="display:none;margin-top:16px"></div>

      <div style="text-align:right;margin-top:20px">
        <button class="btn btn-primary" id="quiz-next-btn" onclick="nextQuiz()" style="display:none">
          ${STATE.quizIndex < questions.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả 🏆'}
        </button>
      </div>
    </div>
  `;

  STATE.quizAnswered = false;
}

function selectQuizAnswer(selectedIdx) {
  if (STATE.quizAnswered) return;
  STATE.quizAnswered = true;

  const lvl = HSK_DATA[STATE.level];
  const q = lvl.quiz[STATE.quizIndex];
  const isCorrect = selectedIdx === q.ans;

  if (isCorrect) STATE.score++;
  STATE.total++;

  // Highlight options
  q.opts.forEach((_, i) => {
    const btn = $(`qopt-${i}`);
    if (i === q.ans) btn.classList.add('correct');
    else if (i === selectedIdx && !isCorrect) btn.classList.add('wrong');
    btn.onclick = null;
  });

  // Feedback
  const fb = $('quiz-feedback');
  fb.style.display = 'block';
  if (isCorrect) {
    fb.className = 'quiz-feedback correct';
    fb.innerHTML = `✅ Chính xác! ${randomPraise()}`;
  } else {
    fb.className = 'quiz-feedback wrong';
    fb.innerHTML = `❌ Chưa đúng. Đáp án đúng là: <strong>${q.opts[q.ans]}</strong>`;
  }

  $('quiz-next-btn').style.display = 'inline-flex';

  updateLevelScore(STATE.level, 'quiz', isCorrect ? 1 : 0, 1);
  updateHeaderStats();
}

function nextQuiz() {
  STATE.quizIndex++;
  renderQuiz();
}

// ════════════════════════════════════════════════════════════
// FILL BLANK
// ════════════════════════════════════════════════════════════
function renderFillBlank() {
  const lvl = HSK_DATA[STATE.level];
  const items = lvl.fillBlank;

  if (STATE.fillIndex >= items.length) {
    renderResults('fillblank');
    return;
  }

  const item = items[STATE.fillIndex];
  const progress = (STATE.fillIndex / items.length * 100).toFixed(0);

  $('main-content').innerHTML = `
    <div class="page-header fade-in">
      <div class="page-title">✏️ Điền vào chỗ trống · ${lvl.name}</div>
      <div class="page-subtitle">Bài ${STATE.fillIndex+1}/${items.length} · Điểm: <strong style="color:#f1c40f">${STATE.score}</strong></div>
    </div>

    <div class="fillblank-container fade-in">
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${progress}%"></div>
      </div>

      <div class="fillblank-card">
        <div class="sentence-display hanzi">${item.sentence.replace('___', '<span class="blank-span">___</span>')}</div>
        <div class="sentence-vi">${item.context}</div>
        <div class="hint-text">Gợi ý Pinyin: <span>${item.hint}</span></div>

        <div class="fill-input-wrap">
          <input id="fill-input" class="fill-input" type="text" placeholder="Nhập đáp án..." autocomplete="off"
            onkeydown="if(event.key==='Enter') checkFillBlank()" />
          <button class="btn btn-primary" onclick="checkFillBlank()">Kiểm tra</button>
        </div>

        <div id="fill-feedback" style="display:none;margin-top:16px;text-align:center;font-size:15px;font-weight:600;padding:12px;border-radius:8px;"></div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center">
        <button class="btn btn-ghost" onclick="showFillHint()">💡 Xem gợi ý</button>
        <button class="btn btn-primary" id="fill-next-btn" onclick="nextFill()" style="display:none">
          ${STATE.fillIndex < items.length - 1 ? 'Tiếp theo →' : 'Xem kết quả 🏆'}
        </button>
      </div>
    </div>
  `;

  STATE.fillAnswered = false;
  setTimeout(() => { const inp = $('fill-input'); if(inp) inp.focus(); }, 100);
}

function checkFillBlank() {
  if (STATE.fillAnswered) return;
  const input = $('fill-input');
  if (!input) return;

  const lvl = HSK_DATA[STATE.level];
  const item = lvl.fillBlank[STATE.fillIndex];
  const answer = input.value.trim();

  if (!answer) { showToast('Hãy nhập đáp án!', 'error'); return; }

  // Accept partial match (any of the expected tokens)
  const expected = item.blank.toLowerCase();
  const userAns = answer.toLowerCase();
  const isCorrect = expected.split('...').some(part => userAns === part.trim()) ||
                    userAns === expected.replace(/\.\.\./g,'').trim() ||
                    userAns === item.blank;

  STATE.fillAnswered = true;
  if (isCorrect) STATE.score++;
  STATE.total++;

  const fb = $('fill-feedback');
  fb.style.display = 'block';
  input.classList.add(isCorrect ? 'correct' : 'wrong');
  input.readOnly = true;

  if (isCorrect) {
    fb.style.background = 'rgba(39,174,96,0.15)';
    fb.style.border = '1px solid rgba(39,174,96,0.3)';
    fb.style.color = '#2ecc71';
    fb.innerHTML = `✅ Chính xác! ${randomPraise()}`;
  } else {
    fb.style.background = 'rgba(192,57,43,0.15)';
    fb.style.border = '1px solid rgba(192,57,43,0.3)';
    fb.style.color = '#e74c3c';
    fb.innerHTML = `❌ Chưa đúng. Đáp án đúng: <strong class="hanzi">${item.blank}</strong>`;
  }

  $('fill-next-btn').style.display = 'inline-flex';
  updateLevelScore(STATE.level, 'fillblank', isCorrect ? 1 : 0, 1);
  updateHeaderStats();
}

function showFillHint() {
  const item = HSK_DATA[STATE.level].fillBlank[STATE.fillIndex];
  showToast(`💡 Gợi ý: ${item.blank} (${item.hint})`, 'info');
}

function nextFill() {
  STATE.fillIndex++;
  renderFillBlank();
}

// ════════════════════════════════════════════════════════════
// LISTENING
// ════════════════════════════════════════════════════════════
function renderListening() {
  const lvl = HSK_DATA[STATE.level];
  const items = lvl.listening;

  if (STATE.listenIndex >= items.length) {
    renderResults('listening');
    return;
  }

  const item = items[STATE.listenIndex];
  const progress = (STATE.listenIndex / items.length * 100).toFixed(0);

  $('main-content').innerHTML = `
    <div class="page-header fade-in">
      <div class="page-title">🎧 Luyện nghe · ${lvl.name}</div>
      <div class="page-subtitle">Bài ${STATE.listenIndex+1}/${items.length} · Điểm: <strong style="color:#f1c40f">${STATE.score}</strong></div>
    </div>

    <div class="listening-container fade-in">
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${progress}%"></div>
      </div>

      <div class="listen-card">
        <div class="listen-instruction">Nghe và chọn đáp án đúng</div>
        <button class="listen-play-btn" id="play-btn" onclick="playListening()">🔊</button>

        <div class="listen-waveform">
          ${Array(12).fill(0).map(() => `<div class="wave-bar"></div>`).join('')}
        </div>

        <div style="font-size:13px;color:#606080">Nhấn nút để nghe lại</div>
      </div>

      <div class="quiz-options" id="listen-options">
        ${item.opts.map((opt, i) => `
          <button class="quiz-option" id="lopt-${i}" onclick="selectListenAnswer(${i})">
            <span class="opt-label">${String.fromCharCode(65+i)}</span>
            <span>${opt}</span>
          </button>
        `).join('')}
      </div>

      <div id="listen-feedback" style="display:none;margin-top:16px"></div>

      <div style="text-align:right;margin-top:20px">
        <button class="btn btn-primary" id="listen-next-btn" onclick="nextListen()" style="display:none">
          ${STATE.listenIndex < items.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả 🏆'}
        </button>
      </div>
    </div>
  `;

  STATE.listenAnswered = false;
  // Auto-play
  setTimeout(() => playListening(), 600);
}

function playListening() {
  const item = HSK_DATA[STATE.level].listening[STATE.listenIndex];
  const btn = $('play-btn');
  if (btn) { btn.classList.add('playing'); btn.textContent = '⏸'; }

  $$('.wave-bar').forEach(b => b.classList.add('active'));

  speakText(item.text, () => {
    if (btn) { btn.classList.remove('playing'); btn.textContent = '🔊'; }
    $$('.wave-bar').forEach(b => b.classList.remove('active'));
  });
}

function selectListenAnswer(selectedIdx) {
  if (STATE.listenAnswered) return;
  STATE.listenAnswered = true;

  const lvl = HSK_DATA[STATE.level];
  const item = lvl.listening[STATE.listenIndex];
  const isCorrect = selectedIdx === item.ans;

  if (isCorrect) STATE.score++;
  STATE.total++;

  item.opts.forEach((_, i) => {
    const btn = $(`lopt-${i}`);
    if (i === item.ans) btn.classList.add('correct');
    else if (i === selectedIdx && !isCorrect) btn.classList.add('wrong');
    btn.onclick = null;
  });

  const fb = $('listen-feedback');
  fb.style.display = 'block';
  if (isCorrect) {
    fb.className = 'quiz-feedback correct';
    fb.innerHTML = `✅ Chính xác! ${randomPraise()}`;
  } else {
    fb.className = 'quiz-feedback wrong';
    const revealBtn = `<button onclick="playListening()" style="margin-left:10px;padding:4px 10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:white;cursor:pointer;font-size:12px;">🔊 Nghe lại</button>`;
    fb.innerHTML = `❌ Chưa đúng. Đáp án: <strong>${item.opts[item.ans]}</strong>${revealBtn}`;
  }

  $('listen-next-btn').style.display = 'inline-flex';
  updateLevelScore(STATE.level, 'listening', isCorrect ? 1 : 0, 1);
  updateHeaderStats();
}

function nextListen() {
  STATE.listenIndex++;
  renderListening();
}

// ════════════════════════════════════════════════════════════
// ARRANGEMENT (HSK3)
// ════════════════════════════════════════════════════════════
function renderArrangement() {
  const lvl = HSK_DATA[STATE.level];
  if (!lvl.arrangement) { setMode('vocab'); return; }
  const items = lvl.arrangement;

  if (STATE.arrangeIndex >= items.length) {
    renderResults('arrangement');
    return;
  }

  const item = items[STATE.arrangeIndex];
  STATE.arrangedWords = [];

  // Shuffle words for display
  const shuffled = [...item.words].sort(() => Math.random() - 0.5);

  $('main-content').innerHTML = `
    <div class="page-header fade-in">
      <div class="page-title">🔀 Sắp xếp câu · ${lvl.name}</div>
      <div class="page-subtitle">Bài ${STATE.arrangeIndex+1}/${items.length} · Điểm: <strong style="color:#f1c40f">${STATE.score}</strong></div>
    </div>

    <div class="arrangement-container fade-in">
      <div class="fillblank-card" style="margin-bottom:20px">
        <div style="font-size:13px;color:#a0a0b8;margin-bottom:8px;text-align:center">💡 Nghĩa: <em>${item.meaning}</em></div>
      </div>

      <div style="font-size:13px;color:#a0a0b8;margin-bottom:8px">Nhấp từ để thêm vào câu:</div>
      <div class="word-pool" id="word-pool">
        ${shuffled.map((w, i) => `
          <span class="word-chip hanzi" id="wchip-${i}" data-word="${w}" data-idx="${i}" onclick="addWord(this)">${w}</span>
        `).join('')}
      </div>

      <div style="font-size:13px;color:#a0a0b8;margin-bottom:8px">Câu của bạn (nhấp từ để xóa):</div>
      <div class="answer-zone" id="answer-zone">
        <span style="color:#606080;font-size:13px;font-style:italic">Nhấp vào từ bên trên để thêm vào đây...</span>
      </div>

      <div id="arrange-feedback" style="display:none;margin-bottom:16px;text-align:center;font-size:15px;font-weight:600;padding:12px;border-radius:8px;"></div>

      <div style="display:flex;gap:12px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="clearArrangement()">🗑️ Xóa tất cả</button>
        <button class="btn btn-primary" onclick="checkArrangement()">Kiểm tra ✓</button>
        <button class="btn btn-success" id="arrange-next-btn" onclick="nextArrangement()" style="display:none">
          ${STATE.arrangeIndex < items.length - 1 ? 'Tiếp theo →' : 'Xem kết quả 🏆'}
        </button>
      </div>
    </div>
  `;
}

function addWord(el) {
  if (el.classList.contains('placed')) return;
  el.classList.add('placed');
  STATE.arrangedWords.push({ word: el.dataset.word, chipId: el.id });
  renderAnswerZone();
}

function renderAnswerZone() {
  const zone = $('answer-zone');
  if (!zone) return;
  if (STATE.arrangedWords.length === 0) {
    zone.innerHTML = `<span style="color:#606080;font-size:13px;font-style:italic">Nhấp vào từ bên trên để thêm vào đây...</span>`;
    return;
  }
  zone.innerHTML = STATE.arrangedWords.map((w, i) =>
    `<span class="answer-chip hanzi" onclick="removeWord(${i})">${w.word}</span>`
  ).join('');
}

function removeWord(idx) {
  const removed = STATE.arrangedWords.splice(idx, 1)[0];
  const chip = $(removed.chipId);
  if (chip) chip.classList.remove('placed');
  renderAnswerZone();
}

function clearArrangement() {
  STATE.arrangedWords = [];
  $$('.word-chip').forEach(c => c.classList.remove('placed'));
  renderAnswerZone();
}

function checkArrangement() {
  const item = HSK_DATA[STATE.level].arrangement[STATE.arrangeIndex];
  const userSentence = STATE.arrangedWords.map(w => w.word).join('');
  const expected = item.answer.replace('。','');
  const isCorrect = userSentence === expected;

  const fb = $('arrange-feedback');
  fb.style.display = 'block';

  if (isCorrect) {
    STATE.score++;
    fb.style.background = 'rgba(39,174,96,0.15)';
    fb.style.border = '1px solid rgba(39,174,96,0.3)';
    fb.style.color = '#2ecc71';
    fb.innerHTML = `✅ Chính xác! Câu đúng: <strong class="hanzi">${item.answer}</strong>`;
    triggerConfetti();
  } else {
    fb.style.background = 'rgba(192,57,43,0.15)';
    fb.style.border = '1px solid rgba(192,57,43,0.3)';
    fb.style.color = '#e74c3c';
    fb.innerHTML = `❌ Chưa đúng. Đáp án: <strong class="hanzi">${item.answer}</strong>`;
  }

  STATE.total++;
  $('arrange-next-btn').style.display = 'inline-flex';
  updateLevelScore(STATE.level, 'arrangement', isCorrect ? 1 : 0, 1);
  updateHeaderStats();
}

function nextArrangement() {
  STATE.arrangeIndex++;
  renderArrangement();
}

// ════════════════════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════════════════════
function renderResults(mode) {
  const pct = STATE.total === 0 ? 0 : Math.round(STATE.score / STATE.total * 100);
  let badge = '', emoji = '', message = '', sub = '';

  if (pct >= 90) {
    badge = 'excellent'; emoji = '🏆';
    message = '出色！Xuất sắc!';
    sub = 'Bạn đã làm rất tốt! Tiếp tục phát huy nhé!';
    triggerConfetti();
  } else if (pct >= 70) {
    badge = 'good'; emoji = '⭐';
    message = '很好！Tốt lắm!';
    sub = 'Kết quả khá tốt. Hãy ôn lại những phần chưa chắc!';
  } else if (pct >= 50) {
    badge = 'ok'; emoji = '💪';
    message = '加油！Cố gắng lên!';
    sub = 'Hãy ôn tập thêm và thử lại nhé!';
  } else {
    badge = 'poor'; emoji = '📖';
    message = '继续努力！Tiếp tục học!';
    sub = 'Đừng nản lòng, hãy xem lại từ vựng và thử lại!';
  }

  const modeNames = { quiz:'trắc nghiệm', fillblank:'điền chỗ trống', listening:'luyện nghe', arrangement:'sắp xếp câu' };

  $('main-content').innerHTML = `
    <div class="results-container fade-in">
      <div class="result-badge ${badge}">
        <span>${emoji}</span>
      </div>
      <div class="result-score"><span class="score-num">${STATE.score}</span></div>
      <div class="result-total">/ ${STATE.total} câu đúng (${pct}%)</div>
      <div class="result-message">${message}</div>
      <div class="result-sub">${sub}</div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:24px;">
        <div style="font-size:13px;color:#a0a0b8;margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Chi tiết</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
          <div style="color:#a0a0b8">Bài tập</div><div style="color:#f1c40f;font-weight:700;">${modeNames[mode] || mode}</div>
          <div style="color:#a0a0b8">Cấp độ</div><div style="color:#f1c40f;font-weight:700;">${HSK_DATA[STATE.level].name}</div>
          <div style="color:#a0a0b8">Đúng</div><div style="color:#2ecc71;font-weight:700;">${STATE.score} câu</div>
          <div style="color:#a0a0b8">Sai</div><div style="color:#e74c3c;font-weight:700;">${STATE.total - STATE.score} câu</div>
        </div>
      </div>

      <div class="result-actions">
        <button class="btn btn-ghost" onclick="setMode('${mode}')">🔄 Làm lại</button>
        <button class="btn btn-ghost" onclick="setMode('vocab')">📚 Xem từ vựng</button>
        <button class="btn btn-primary" onclick="setMode('flashcard')">🃏 Flashcard</button>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════

// Text-to-speech
function speakText(text, onEnd) {
  if (!('speechSynthesis' in window)) {
    showToast('Trình duyệt không hỗ trợ TTS', 'error');
    return;
  }
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-CN';
  utt.rate = 0.85;
  utt.pitch = 1;

  // Try to find a Chinese voice
  const voices = speechSynthesis.getVoices();
  const zhVoice = voices.find(v => v.lang.startsWith('zh'));
  if (zhVoice) utt.voice = zhVoice;

  if (onEnd) utt.onend = onEnd;
  speechSynthesis.speak(utt);
}

// Ensure voices are loaded
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// Toast
function showToast(message, type = 'info') {
  const old = document.querySelector('.toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

// Confetti
function triggerConfetti() {
  const colors = ['#c0392b','#f1c40f','#27ae60','#2980b9','#8e44ad','#e74c3c','#f39c12'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.className = 'confetti-piece';
    c.style.cssText = `
      left: ${Math.random()*100}vw;
      top: -20px;
      background: ${colors[Math.floor(Math.random()*colors.length)]};
      width: ${Math.random()*10+6}px;
      height: ${Math.random()*10+6}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${Math.random()*2+2}s;
      animation-delay: ${Math.random()*1}s;
    `;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}

// Random praise
const praises = ['加油！', '太棒了！', '很好！', '做得好！', '继续努力！', '厉害！'];
function randomPraise() { return praises[Math.floor(Math.random() * praises.length)]; }
