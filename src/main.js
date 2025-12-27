import {
  VIEW,
  SETTINGS_DEFAULTS,
  CATEGORIES,
  CATEGORY_LABELS,
  QUESTIONS,
  DAILY_LIMIT,
  DATE_OPTIONS_EN,
} from './constants.js';

// Global State
window.state = {
  step: 0,
  category: null,
  answers: [],
  settings: {
    length: SETTINGS_DEFAULTS.LENGTH,
    tone: SETTINGS_DEFAULTS.TONE,
    difficulty: SETTINGS_DEFAULTS.DIFFICULTY,
    voice: SETTINGS_DEFAULTS.VOICE,
    rate: SETTINGS_DEFAULTS.RATE,
  },
  narrative: null,
  voices: [],
  currentView: VIEW.GENERATE,
};
const state = window.state;

// Branding Subtitles
const SUBTITLES = [
  'Record your days, master your English.',
  'Every day is a story worth telling.',
  'Small steps lead to big changes.',
  'Your life, your words.',
  'Writing is thinking.',
  'Today is a new page.',
  'The sky is the limit.',
  'Every day is Day One.',
];

function setRandomSubtitle() {
  const subtitleEl = document.getElementById('daily-subtitle');
  if (subtitleEl) {
    const random = SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)];
    subtitleEl.textContent = random;
  }
}

/**
 * Initialize the application
 */
async function init() {
  setRandomSubtitle();
  await window.auth.initAuth();

  const authContainer = document.getElementById('auth-ui-container');
  window.auth.renderAuthUI(authContainer);

  window.addEventListener('authStateChanged', handleAuthStateChange);

  if (window.auth.isAuthenticated()) {
    showApp();
  } else {
    showLogin();
  }
}

/**
 * Handle authentication state changes
 * @param {CustomEvent} event
 */
function handleAuthStateChange(event) {
  const { user } = event.detail;
  if (user) {
    showApp();
  } else {
    showLogin();
  }
}

/**
 * Display the main application interface
 */
function showApp() {
  document.getElementById('app-content').style.display = 'block';
  document.getElementById('auth-required').style.display = 'none';

  if (!window.appInitialized) {
    initializeApp();
    window.appInitialized = true;
  }

  if (window.refreshCurrentView) {
    window.refreshCurrentView();
  }
}

/**
 * Display the login requirement screen
 */
function showLogin() {
  document.getElementById('app-content').style.display = 'none';
  document.getElementById('auth-required').style.display = 'block';
}

/**
 * Initialize application event listeners and initial view
 */
function initializeApp() {
  renderStep();

  document.getElementById('next-btn').addEventListener('click', handleNext);
  document.getElementById('prev-btn').addEventListener('click', handlePrev);

  window.showNavigation();
  window.updateNavigation();
}

/**
 * Get the number of narratives created today
 * @returns {Promise<number>}
 */
async function getTodayCount() {
  const narratives = (await window.storage?.getAllNarratives()) || [];
  const now = new Date();
  // YYYY-MM-DD format for local time comparison
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const prefix = `${y}-${m}-${d}`;

  return narratives.filter((n) => n.created_at.startsWith(prefix)).length;
}

/**
 * Helper to format category for display
 * @param {string} cat
 * @returns {string}
 */
function formatCategory(cat) {
  return CATEGORY_LABELS[cat] || cat;
}

/**
 * Render the current step in the wizard
 */
async function renderStep() {
  const container = document.getElementById('step-content');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  container.innerHTML = '';

  // Step 0: Daily Limit Check
  if (state.step === 0) {
    const count = await getTodayCount();
    if (count >= DAILY_LIMIT) {
      renderDailyLimitReached(container);
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      return;
    }
  }

  updateNavigationButtons(prevBtn, nextBtn);
  applyAnimation(container);

  switch (state.step) {
    case 0:
      renderCategorySelect(container);
      break;
    case 1:
      renderQuestionForm(container);
      break;
    case 2:
      renderOutputSettings(container);
      break;
  }
}

/**
 * Update visibility and styling of navigation buttons
 * @param {HTMLElement} prevBtn
 * @param {HTMLElement} nextBtn
 */
function updateNavigationButtons(prevBtn, nextBtn) {
  prevBtn.style.display = state.step > 0 ? 'inline-block' : 'none';
  nextBtn.style.display = state.step === 0 ? 'none' : 'inline-block';

  const stepActions = document.getElementById('step-actions');
  if (state.step > 0) {
    stepActions.classList.add('sticky-actions');
  } else {
    stepActions.classList.remove('sticky-actions');
  }
}

/**
 * Apply enter animation to a container
 * @param {HTMLElement} container
 */
function applyAnimation(container) {
  container.classList.remove('view-enter');
  void container.offsetWidth; // Force reflow
  container.classList.add('view-enter');
}

/**
 * Render the daily limit reached message
 * @param {HTMLElement} container
 */
function renderDailyLimitReached(container) {
  applyAnimation(container);
  container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
            <h2>今日の記録は完了しました</h2>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                日記は1日1回までです。<br>また明日、新しい思い出を記録しましょう。
            </p>
            <button class="secondary" onclick="window.switchView('${VIEW.REVIEW}')">日記を振り返る</button>
        </div>
    `;
}

/**
 * Render Category Selection (Step 0)
 * @param {HTMLElement} container
 */
function renderCategorySelect(container) {
  const list = document.createElement('div');
  list.className = 'option-list';

  CATEGORIES.forEach((cat) => {
    const item = document.createElement('div');
    item.className = `option-item ${state.category === cat.id ? 'selected' : ''}`;
    item.innerHTML = `<strong>${cat.label}</strong><p>${cat.description}</p>`;

    item.onclick = () => handleCategorySelection(item, cat.id);

    list.appendChild(item);
  });
  container.appendChild(list);
}

/**
 * Handle category selection logic
 * @param {HTMLElement} itemElement
 * @param {string} categoryId
 */
function handleCategorySelection(itemElement, categoryId) {
  state.category = categoryId;
  document
    .querySelectorAll('.option-item')
    .forEach((el) => el.classList.remove('selected'));
  itemElement.classList.add('selected');

  // Auto-advance
  setTimeout(() => {
    state.step = 1;
    renderStep();
  }, 200);
}

/**
 * Render Question Form (Step 1)
 * @param {HTMLElement} container
 */
function renderQuestionForm(container) {
  const qList = QUESTIONS[state.category];
  container.innerHTML = '<h2>日本語で教えてください</h2>';

  qList.forEach((q, i) => {
    const group = document.createElement('div');
    group.style.marginBottom = '1.5rem';

    const label = document.createElement('label');
    Object.assign(label.style, {
      display: 'block',
      marginBottom: '0.5rem',
      color: 'var(--text-secondary)',
    });
    label.textContent = q;

    const textarea = document.createElement('textarea');
    textarea.dataset.index = i;
    Object.assign(textarea.style, {
      width: '100%',
      padding: '0.75rem',
      borderRadius: '0.5rem',
      background: '#0f172a',
      border: '1px solid var(--border-color)',
      color: 'white',
      resize: 'vertical',
      minHeight: '80px',
    });
    textarea.value = state.answers[i] || '';

    group.appendChild(label);
    group.appendChild(textarea);
    container.appendChild(group);
  });
}

/**
 * Render Output Settings (Step 2)
 * @param {HTMLElement} container
 */
function renderOutputSettings(container) {
  container.innerHTML = '<h2>出力設定</h2>';
  renderSettingOption(container, '長さ', 'length', ['Short', 'Normal', 'Long']);
  renderSettingOption(container, '難易度', 'difficulty', [
    'Easy',
    'Normal',
    'Hard',
  ]);
  renderSettingOption(container, 'トーン', 'tone', [
    'Casual',
    'Business',
    'Academic',
  ]);
}

/**
 * Helper to render a setting option group
 * @param {HTMLElement} container
 * @param {string} labelText
 * @param {string} settingKey
 * @param {string[]} options
 */
function renderSettingOption(container, labelText, settingKey, options) {
  const group = document.createElement('div');
  group.style.marginBottom = '1.5rem';

  const optionsHtml = options
    .map(
      (opt) => `
        <div class="option-item ${state.settings[settingKey] === opt ? 'selected' : ''}" 
             onclick="selectSetting(this, '${settingKey}', '${opt}')"
             style="text-align:center; padding: 0.75rem;">
            ${opt}
        </div>
    `
    )
    .join('');

  group.innerHTML = `
        <label style="display:block; margin-bottom:0.5rem;">${labelText}</label>
        <div class="option-list" style="grid-template-columns: repeat(3, 1fr);">
            ${optionsHtml}
        </div>
    `;
  container.appendChild(group);
}

window.selectSetting = (el, type, value) => {
  state.settings[type] = value;
  el.parentElement
    .querySelectorAll('.option-item')
    .forEach((e) => e.classList.remove('selected'));
  el.classList.add('selected');
};

/**
 * Handle Next Button Click
 */
async function handleNext() {
  if (state.step === 0 && !state.category) {
    alert('カテゴリを選択してください');
    return;
  }

  if (state.step === 1) {
    const textareas = document
      .getElementById('step-content')
      .querySelectorAll('textarea');
    state.answers = Array.from(textareas).map((ta) => ta.value);
    if (state.answers.some((a) => !a.trim())) {
      alert('すべての質問に答えてください（短くてもOKです）');
      return;
    }
  }

  if (state.step === 2) {
    await generateNarrative();
    return;
  }

  state.step++;
  renderStep();
}

/**
 * Handle Previous Button Click
 */
function handlePrev() {
  state.step--;
  renderStep();
}

// Loading State Helpers
window.showLoading = (message = 'Processing...') => {
  const loader = document.getElementById('loading-overlay');
  const text = document.getElementById('loading-text');
  if (text) text.textContent = message;
  if (loader) loader.style.display = 'flex';
};

window.hideLoading = () => {
  const loader = document.getElementById('loading-overlay');
  if (loader) loader.style.display = 'none';
};

/**
 * Generate Narrative via API
 */
async function generateNarrative() {
  window.showLoading('Writing your journal entry...');

  try {
    const session = window.auth.getCurrentSession();
    if (!session) throw new Error('User not authenticated');

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        category: state.category,
        answers: state.answers,
        settings: state.settings,
      }),
    });

    if (!response.ok) throw new Error('Generation failed');

    state.narrative = await response.json();
    renderResult();
  } catch (error) {
    alert('生成に失敗しました: ' + error.message);
  } finally {
    window.hideLoading();
  }
}

/**
 * Render the generation result
 */
function renderResult() {
  const wizard = document.getElementById('wizard-container');
  const result = document.getElementById('result-container');
  const data = state.narrative;

  // Ensure category is preserved
  if (!data.category) data.category = state.category;

  wizard.style.display = 'none';
  result.style.display = 'block';
  applyAnimation(result);

  const displayCategory = formatCategory(data.category);
  const formattedDate = new Date().toLocaleDateString('en-US', DATE_OPTIONS_EN);
  const sentences = data.narrative_en.split(/(?<=[.!?])\s+/);

  result.innerHTML = `
        ${renderResultHeader(displayCategory, formattedDate)}
        <div class="result-grid" style="display: flex; flex-direction: column; gap: 2rem;">
            ${renderNarrativeSection(sentences, data)}
            ${renderKeyPhrases(data.key_phrases)}
            ${renderAlternatives(data.alternatives)}
            ${renderRecallTest(data.recall_test)}
        </div>
        ${renderResultActions()}
    `;

  // Event listener for implicit editing if we ever enable it
  const textarea = result.querySelector('.editable-narrative');
  if (textarea) {
    textarea.addEventListener('input', (e) => {
      state.narrative.narrative_en = e.target.value;
    });
  }
}

function renderResultHeader(category, date) {
  return `
        <div class="result-header" style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                <h2 style="margin: 0; font-family: 'Outfit', sans-serif;">${category}</h2>
                <span style="font-size: 0.9rem; color: var(--text-secondary);">${date}</span>
            </div>
            <div style="height: 2px; background: linear-gradient(90deg, var(--accent-color), transparent); width: 100px;"></div>
        </div>
    `;
}

function renderNarrativeSection(sentences, data) {
  return `
        <section class="card" style="background: rgba(30, 41, 59, 0.5); padding: 2rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">📖</span> kaku
                </h3>
                <div style="display:flex; gap:0.75rem;">
                    <button class="btn btn-secondary" style="width: auto; padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="window.speak()">🔊 Full Play</button>
                </div>
            </div>
            
            <div class="narrative-display" style="line-height: 2; font-size: 1.15rem; margin-bottom: 1.5rem;">
                ${sentences
                  .map(
                    (s, i) => `
                    <span class="sentence-text" 
                            data-index="${i}" 
                            style="cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: all 0.2s;"
                            onclick="window.speak('${s.replace(/'/g, "\\'")}', ${i})">${s}</span> 
                `
                  )
                  .join('')}
            </div>

            <textarea class="editable-narrative" style="display:none;">${data.narrative_en}</textarea>
            
            <p style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                Tips: Click each sentence to listen separately.
            </p>
        </section>
    `;
}

function renderKeyPhrases(phrases) {
  return `
        <section>
            <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">🔑</span> Key Phrases
            </h3>
            <div style="display: grid; gap: 1rem;">
                ${phrases
                  .map(
                    (p) => `
                    <div class="card" style="background: rgba(255, 255, 255, 0.03); padding: 1.25rem; border: 1px solid var(--border-color); border-left: 4px solid var(--accent-color);">
                        <div style="font-weight:700; color:var(--text-primary); margin-bottom:0.25rem;">${p.phrase_en}</div>
                        <div style="font-size:0.95rem; color: var(--accent-color); margin-bottom:0.5rem;">${p.meaning_ja}</div>
                        <div style="font-size:0.85rem; color:var(--text-secondary); line-height: 1.4;">${p.usage_hint_ja}</div>
                    </div>
                `
                  )
                  .join('')}
            </div>
        </section>
    `;
}

function renderAlternatives(alternatives) {
  if (!alternatives || alternatives.length === 0) return '';
  return `
        <section>
            <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">🔄</span> Alternative Expressions
            </h3>
            <div style="display: grid; gap: 1rem;">
                ${alternatives
                  .map(
                    (alt) => `
                    <div class="card" style="background: rgba(255, 255, 255, 0.03); padding: 1.25rem; border: 1px solid var(--border-color); border-left: 4px solid #f59e0b;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="color: var(--text-secondary); font-size: 0.9rem;">${alt.original_en}</span>
                            <span style="color: var(--text-tertiary);">→</span>
                            <span style="color: #f59e0b; font-weight: 600;">${alt.alternative_en}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${alt.nuance_ja}</div>
                    </div>
                `
                  )
                  .join('')}
            </div>
        </section>
    `;
}

function renderRecallTest(test) {
  return `
        <section class="card" style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.05), rgba(129, 140, 248, 0.05)); border: 1px solid var(--border-color);">
            <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">🧠</span> Recall Test
            </h3>
            <p style="color:var(--text-secondary); margin-bottom: 1.25rem; font-size: 0.95rem;">ポイントを意識して英語で言ってみましょう：</p>
            <div style="background: rgba(15, 23, 42, 0.5); padding: 1.5rem; border-radius: 0.75rem; border: 1px dashed var(--border-color); line-height: 1.6;">
                ${test.prompt_ja}
            </div>
        </section>
    `;
}

function renderResultActions() {
  return `
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1rem; margin-top:3rem; margin-bottom:1.5rem;">
            <button class="btn btn-primary" style="padding: 1.25rem;" onclick="window.saveNarrativeForReview()">💾 Save to Journal</button>
            <button class="btn btn-secondary" style="padding: 1.25rem;" onclick="window.copy()">📋 Copy</button>
        </div>

        <div style="display:flex; gap:1rem;">
            <button class="btn btn-secondary" style="flex:1; opacity: 0.7;" onclick="window.newNarrative()">✨ New Entry</button>
            <button class="btn btn-secondary" style="flex:1; opacity: 0.7;" onclick="window.switchView('${VIEW.REVIEW}')">📚 Dashboard</button>
        </div>
    `;
}

// Speech Synthesis Logic
window.speak = (text, index, fullTextOverride) => {
  window.speechSynthesis.cancel();
  clearHighlights();

  const narrativeText =
    fullTextOverride || (state.narrative ? state.narrative.narrative_en : '');
  if (!narrativeText && !text) return;

  if (text) {
    speakSentence(text, index);
  } else {
    speakAll(narrativeText);
  }
};

function clearHighlights() {
  document
    .querySelectorAll('.sentence-text')
    .forEach((el) => el.classList.remove('playing'));
}

function highlightSentence(idx) {
  clearHighlights();
  const span = document.querySelector(`.sentence-text[data-index="${idx}"]`);
  if (span) span.classList.add('playing');
}

function createUtterance(text) {
  const msg = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  // Improved voice selection strategy
  msg.voice =
    voices.find(
      (v) =>
        v.lang === 'en-US' &&
        v.name.includes('Google') &&
        v.name.includes('Male')
    ) ||
    voices.find((v) => v.lang === 'en-US' && v.name.includes('Google')) ||
    voices.find((v) => v.lang === 'en-US' && v.name.includes('Male')) ||
    voices.find((v) => v.lang === 'en-US') ||
    voices.find((v) => v.lang.startsWith('en'));
  msg.rate = state.settings.rate;
  return msg;
}

function speakSentence(text, index) {
  const msg = createUtterance(text);
  msg.onstart = () => highlightSentence(index);
  msg.onend = () => clearHighlights();
  msg.onerror = () => clearHighlights();
  window.speechSynthesis.speak(msg);
}

function speakAll(text) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = 0;

  const playNext = () => {
    if (current >= sentences.length) {
      clearHighlights();
      return;
    }

    const msg = createUtterance(sentences[current]);
    const currentIndex = current;

    msg.onstart = () => highlightSentence(currentIndex);
    msg.onend = () => {
      current++;
      playNext();
    };
    msg.onerror = () => clearHighlights();

    window.speechSynthesis.speak(msg);
  };

  playNext();
}

// Copy & Download
window.copy = () => {
  const text = `【Journal Entry】\n${state.narrative.narrative_en}\n\n【Recall Test】\n${state.narrative.recall_test?.prompt_ja || ''}`;

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => alert('Copied!'));
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Copied!');
  }
};

window.download = () => {
  const jsonStr = JSON.stringify(state.narrative, null, 2);
  const dataUri =
    'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
  const a = document.createElement('a');
  a.href = dataUri;
  a.download = `journal_${new Date().toISOString().split('T')[0]}.json`;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// Save to Journal
window.saveNarrativeForReview = async () => {
  try {
    if (!state.narrative) {
      alert('No narrative to save');
      return;
    }

    const metadata = {
      category: state.category,
      answers: state.answers,
      settings: state.settings,
    };

    window.showLoading('Saving narrative...');
    const saved = await window.storage?.saveNarrative(
      state.narrative,
      metadata
    );

    if (saved) {
      alert('✅ 日記を保存しました！振り返り準備完了！');
      setTimeout(() => window.switchView(VIEW.REVIEW), 500);
    } else {
      alert('Failed to save narrative');
    }
  } catch (error) {
    console.error('Save error:', error);
    alert('Save failed: ' + error.message);
  } finally {
    window.hideLoading();
  }
};

// View Management
window.switchView = async (view) => {
  state.currentView = view;
  window.showLoading('Loading...');

  try {
    await window.updateNavigation();

    const wizard = document.getElementById('wizard-container');
    const result = document.getElementById('result-container');

    // Reset animations
    [wizard, result].forEach((el) => applyAnimation(el));

    handleViewSwitch(view, wizard, result);
  } finally {
    window.hideLoading();
  }
};

async function handleViewSwitch(view, wizard, result) {
  if (view === VIEW.GENERATE) {
    wizard.style.display = 'block';
    result.style.display = 'none';
    window.renderStep();
  } else {
    wizard.style.display = 'none';
    result.style.display = 'block';

    if (view === VIEW.REVIEW && window.renderReviewDashboard)
      await window.renderReviewDashboard();
    if (view === VIEW.HISTORY && window.renderHistoryPage)
      await window.renderHistoryPage();
  }
}

// Navigation & Tabs
window.updateNavigation = async () => {
  updateTabActiveState('.nav-tab');
  updateTabActiveState('.bottom-nav-item');
  updateDueBadge();
};

function updateTabActiveState(selector) {
  document.querySelectorAll(selector).forEach((tab) => {
    if (tab.dataset.view === state.currentView) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

async function updateDueBadge() {
  const dueNarratives = (await window.storage?.getNarrativesDueToday()) || [];
  const count = dueNarratives.length;

  const badgeDesktop = document.getElementById('due-badge-desktop');
  if (badgeDesktop) {
    badgeDesktop.style.display = count > 0 ? 'inline-block' : 'none';
    badgeDesktop.textContent = count;
  }

  const badgeMobile = document.getElementById('due-badge-mobile');
  if (badgeMobile) {
    badgeMobile.style.display = count > 0 ? 'block' : 'none';
  }
}

window.showNavigation = () => {
  const navTabs = document.getElementById('navigation-tabs');
  if (navTabs) navTabs.style.display = 'flex';
};

window.hideNavigation = () => {
  const navTabs = document.getElementById('navigation-tabs');
  if (navTabs) navTabs.style.display = 'none';
};

/**
 * Reset steps for a new narrative
 */
window.newNarrative = () => {
  state.step = 0;
  state.category = null;
  state.answers = [];
  state.narrative = null;
  state.currentView = VIEW.GENERATE;
  window.updateNavigation();
  window.renderStep();
};

// Expose internal functions
Object.assign(window, {
  renderStep,
  renderCategorySelect,
  renderQuestionForm,
  renderOutputSettings,
  handleNext,
  handlePrev,
  generateNarrative,
  renderResult,
  init,
});

// Start the app
init();
