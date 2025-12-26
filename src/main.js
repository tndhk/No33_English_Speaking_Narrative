window.state = {
    step: 0,
    category: null,
    answers: [],
    settings: {
        length: 'Normal',
        tone: 'Business',
        voice: null,
        rate: 1.0
    },
    narrative: null,
    voices: [],
    currentView: 'generate' // 'generate' | 'review' | 'history' | 'stats' | 'export'
};
const state = window.state;

const categories = [
    { id: 'today', label: '今日の出来事', description: '今日あった出来事や会話を日記（ジャーナル）にします。' },
    { id: 'thoughts', label: '考え・気持ち', description: '頭の中にある抽象的なアイデアを日記として言語化します。' },
    { id: 'omakase', label: 'おまかせ', description: '自由にトピックを入力して日記を書きましょう。' }
];

const questions = {
    today: ['それはいつ、どこでの出来事ですか？', '登場人物は誰ですか？', '一言でいうと、何が起こりましたか？'],
    thoughts: ['最近よく考えていることは何ですか？', 'それについて、どう感じていますか？', '最終的に、何を伝えたいですか？'],
    omakase: ['何を英語にしたいですか？', '特に強調したいニュアンスはありますか？']
};

async function init() {
    // Initialize authentication first
    await window.auth.initAuth();

    // Render auth UI
    const authContainer = document.getElementById('auth-ui-container');
    window.auth.renderAuthUI(authContainer);

    // Set up auth state change listener
    window.addEventListener('authStateChanged', (event) => {
        const { user } = event.detail;

        // Update UI visibility based on auth state
        const appContent = document.getElementById('app-content');
        const authRequired = document.getElementById('auth-required');

        if (user) {
            // User is authenticated - show app
            appContent.style.display = 'block';
            authRequired.style.display = 'none';

            // Initialize app components
            if (!window.appInitialized) {
                initializeApp();
                window.appInitialized = true;
            }

            // Refresh content for the current view
            if (window.refreshCurrentView) {
                window.refreshCurrentView();
            }
        } else {
            // User is not authenticated - show login
            appContent.style.display = 'none';
            authRequired.style.display = 'block';
        }
    });

    // If already authenticated, show app immediately
    if (window.auth.isAuthenticated()) {
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('auth-required').style.display = 'none';
        initializeApp();
        window.appInitialized = true;
    } else {
        document.getElementById('auth-required').style.display = 'block';
    }
}

function initializeApp() {
    renderStep();

    document.getElementById('next-btn').addEventListener('click', handleNext);
    document.getElementById('prev-btn').addEventListener('click', handlePrev);

    // Show navigation and update
    window.showNavigation();
    window.updateNavigation();
}

// Helper to get narratives created today
async function getTodayCount() {
    const narratives = (await window.storage?.getAllNarratives()) || [];
    const todayStr = new Date().toLocaleDateString('ja-JP').split('/').join('-'); // YYYY-MM-DD
    // Note: dates in DB are ISO strings (YYYY-MM-DD...)
    // Simple check: create a date string for today and check start of created_at
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `${y}-${m}-${d}`;

    return narratives.filter(n => n.created_at.startsWith(prefix)).length;
}

// Helper to format category for display
function formatCategory(cat) {
    const map = {
        'today': '📝 日々の記録',
        'thoughts': '💭 思考メモ',
        'omakase': '✨ 自由記述'
    };
    return map[cat] || cat;
}

async function renderStep() {
    const container = document.getElementById('step-content');
    const wizard = document.getElementById('wizard-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    container.innerHTML = '';

    // Check daily limit at step 0
    if (state.step === 0) {
        const count = await getTodayCount();
        const DAILY_LIMIT = 1;

        if (count >= DAILY_LIMIT) {
            container.classList.remove('view-enter');
            void container.offsetWidth;
            container.classList.add('view-enter');

            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
                    <h2>今日の記録は完了しました</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                        日記は1日1回までです。<br>また明日、新しい思い出を記録しましょう。
                    </p>
                    <button class="secondary" onclick="window.switchView('review')">振り返りを行う</button>
                </div>
             `;
            nextBtn.style.display = 'none';
            prevBtn.style.display = 'none';
            return;
        }
    }

    prevBtn.style.display = state.step > 0 ? 'inline-block' : 'none';
    nextBtn.style.display = 'inline-block'; // Ensure next button is shown otherwise

    // Trigger animation for new step content
    container.classList.remove('view-enter');
    void container.offsetWidth;
    container.classList.add('view-enter');

    if (state.step === 0) {
        renderCategorySelect(container);
    } else if (state.step === 1) {
        renderQuestionForm(container);
    } else if (state.step === 2) {
        renderOutputSettings(container);
    }
}

function renderCategorySelect(container) {
    container.innerHTML = '<h2>興味のあるカテゴリを選んでください</h2>';
    const list = document.createElement('div');
    list.className = 'option-list';

    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = `option-item ${state.category === cat.id ? 'selected' : ''}`;
        item.innerHTML = `<strong>${cat.label}</strong><p>${cat.description}</p>`;
        item.onclick = () => {
            state.category = cat.id;
            document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
        };
        list.appendChild(item);
    });
    container.appendChild(list);
}

function renderQuestionForm(container) {
    const qList = questions[state.category];
    container.innerHTML = '<h2>詳細を教えてください（日本語でOK）</h2>';

    qList.forEach((q, i) => {
        const group = document.createElement('div');
        group.style.marginBottom = '1.5rem';

        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.marginBottom = '0.5rem';
        label.style.color = 'var(--text-secondary)';
        label.textContent = q;

        const textarea = document.createElement('textarea');
        textarea.dataset.index = i;
        textarea.style.width = '100%';
        textarea.style.padding = '0.75rem';
        textarea.style.borderRadius = '0.5rem';
        textarea.style.background = '#0f172a';
        textarea.style.border = '1px solid var(--border-color)';
        textarea.style.color = 'white';
        textarea.style.resize = 'vertical';
        textarea.style.minHeight = '80px';
        textarea.value = state.answers[i] || ''; // Restore answer if available

        group.appendChild(label);
        group.appendChild(textarea);
        container.appendChild(group);
    });
}

function renderOutputSettings(container) {
    container.innerHTML = '<h2>出力設定</h2>';

    // Length setting
    const lengthGroup = document.createElement('div');
    lengthGroup.style.marginBottom = '1.5rem';
    lengthGroup.innerHTML = `
        <label style="display:block; margin-bottom:0.5rem;">長さ</label>
        <div class="option-list" style="grid-template-columns: repeat(3, 1fr);">
            ${['Short', 'Normal', 'Long'].map(l => `
                <div class="option-item ${state.settings.length === l ? 'selected' : ''}" 
                     onclick="selectSetting(this, 'length', '${l}')"
                     style="text-align:center; padding: 0.75rem;">
                    ${l}
                </div>
            `).join('')}
        </div>
    `;
    container.appendChild(lengthGroup);

    // Tone setting
    const toneGroup = document.createElement('div');
    toneGroup.style.marginBottom = '1.5rem';
    toneGroup.innerHTML = `
        <label style="display:block; margin-bottom:0.5rem;">トーン</label>
        <div class="option-list" style="grid-template-columns: repeat(3, 1fr);">
            ${['Casual', 'Business', 'Academic'].map(t => `
                <div class="option-item ${state.settings.tone === t ? 'selected' : ''}" 
                     onclick="selectSetting(this, 'tone', '${t}')"
                     style="text-align:center; padding: 0.75rem;">
                    ${t}
                </div>
            `).join('')}
        </div>
    `;
    container.appendChild(toneGroup);
}

window.updateSetting = (key, val) => {
    state.settings[key] = val;
    renderStep();
};

window.selectSetting = (el, type, value) => {
    state.settings[type] = value;
    el.parentElement.querySelectorAll('.option-item').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
};

async function handleNext() {
    if (state.step === 0) {
        if (!state.category) {
            alert('カテゴリを選択してください');
            return;
        }
    } else if (state.step === 1) {
        const textareas = document.getElementById('step-content').querySelectorAll('textarea');
        state.answers = Array.from(textareas).map(ta => ta.value);
        if (state.answers.some(a => !a.trim())) {
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

function handlePrev() {
    state.step--;
    renderStep();
}


// Helper for loading state
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

async function generateNarrative() {
    window.showLoading('Writing your journal entry...');

    try {
        const session = window.auth.getCurrentSession();
        if (!session) {
            throw new Error('User not authenticated');
        }

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                category: state.category,
                answers: state.answers,
                settings: state.settings
            })
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

function renderResult() {
    const wizard = document.getElementById('wizard-container');
    const result = document.getElementById('result-container');
    const data = state.narrative;

    wizard.style.display = 'none';
    result.style.display = 'block';

    // Trigger animation
    result.classList.remove('view-enter');
    void result.offsetWidth;
    result.classList.add('view-enter');

    // Format category nicely
    const displayCategory = formatCategory(data.category);

    const html = `
        <h2 style="margin-bottom: 0.5rem;">${displayCategory}</h2>
        <div style="color: var(--text-secondary); margin-bottom: 2rem;">${new Date().toLocaleDateString('ja-JP')}</div>
        
        <div class="result-grid">
            <!-- Narrative (Main) -->
            <div class="card" style="background: #1e293b; border: 1px solid var(--border-color); margin-bottom: 2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3>📖 Generated Narrative</h3>
                     <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-secondary" style="width: auto; padding: 0.5rem 1rem;" onclick="window.speak(document.querySelector('.editable-narrative').value)">🔊 Play</button>
                    </div>
                </div>
                <textarea class="editable-narrative" style="width:100%; min-height:200px; background:transparent; border:none; color:inherit; font-size:1.1rem; line-height:1.6; resize:vertical; padding:0.5rem;"></textarea>
            </div>

            <!-- Key Phrases -->
            <div class="card" style="background: #1e293b; border: 1px solid var(--border-color); margin-bottom: 2rem;">
                <h3>🔑 Key Phrases</h3>
                <ul style="list-style:none; padding:0; margin-top:1rem;">
                    ${data.key_phrases.map(p => `
                        <li style="margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid var(--border-color)">
                            <div style="font-weight:600; color:var(--accent-color); margin-bottom:0.25rem;">${p.phrase_en}</div>
                            <div style="font-size:0.9rem; margin-bottom:0.25rem;">${p.meaning_ja}</div>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">${p.usage_hint_ja}</div>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <!-- Recall Test -->
            <div class="card" style="background: #1e293b; border: 1px solid var(--border-color); margin-bottom: 2rem;">
                <h3>🧠 Recall Test</h3>
                <p style="color:var(--text-secondary); margin-bottom:1rem;">次の要点を英語で言ってみましょう：</p>
                <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:0.5rem;">
                    ${data.recall_test.prompt_ja}
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div style="display:flex; gap:1rem; margin-top:2rem; margin-bottom:1.5rem; flex-wrap:wrap;">
            <button class="btn btn-primary" style="flex:2;" onclick="window.saveNarrativeForReview()">💾 Save to Journal</button>
            <button class="btn btn-secondary" style="flex:1;" onclick="window.copy()">📋 Copy</button>
            <button class="btn btn-secondary" style="flex:1;" onclick="window.download()">⬇️ JSON</button>
        </div>

        <!-- Bottom Actions -->
        <div style="display:flex; gap:1rem;">
            <button class="btn btn-secondary" style="flex:1;" onclick="window.newNarrative()">✨ New Entry</button>
            <button class="btn btn-secondary" style="flex:1;" onclick="window.switchView('review')">📚 Review Dashboard</button>
        </div>
    `;
    result.innerHTML = html;

    // Populate textarea after innerHTML is set
    const textarea = result.querySelector('.editable-narrative');
    if (textarea) {
        textarea.value = data.narrative_en;

        // Update state on change
        textarea.addEventListener('input', (e) => {
            state.narrative.narrative_en = e.target.value;
        });
    }
}

window.speak = (text, index, fullTextOverride) => {
    window.speechSynthesis.cancel();

    const clearHighlights = () => {
        document.querySelectorAll('.sentence-text').forEach(el => el.classList.remove('playing'));
    };

    clearHighlights();

    const narrativeText = fullTextOverride || (state.narrative ? state.narrative.narrative_en : '');
    if (!narrativeText && !text) return;

    const sentences = narrativeText.split(/(?<=[.!?])\s+/);

    const setVoiceAndRate = (msg) => {
        const voices = window.speechSynthesis.getVoices();
        msg.voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google') && v.name.includes('Male')) ||
            voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
            voices.find(v => v.lang === 'en-US' && v.name.includes('Male')) ||
            voices.find(v => v.lang === 'en-US') ||
            voices.find(v => v.lang.startsWith('en'));
        msg.rate = state.settings.rate;
    };

    const highlightSentence = (idx) => {
        clearHighlights();
        const span = document.querySelector(`.sentence-text[data-index="${idx}"]`);
        if (span) span.classList.add('playing');
    };

    if (text) {
        // Play single sentence
        const msg = new SpeechSynthesisUtterance(text);
        setVoiceAndRate(msg);
        msg.onstart = () => highlightSentence(index);
        msg.onend = () => clearHighlights();
        msg.onerror = () => clearHighlights();
        window.speechSynthesis.speak(msg);
    } else {
        // Play all sentences in sequence
        let current = 0;
        const playNext = () => {
            if (current < sentences.length) {
                const msg = new SpeechSynthesisUtterance(sentences[current]);
                setVoiceAndRate(msg);
                const currentIndex = current;
                msg.onstart = () => highlightSentence(currentIndex);
                msg.onend = () => {
                    current++;
                    playNext();
                };
                msg.onerror = () => clearHighlights();
                window.speechSynthesis.speak(msg);
            } else {
                clearHighlights();
            }
        };
        playNext();
    }
};

window.copy = () => {
    const text = `【Journal Entry】\n${state.narrative.narrative_en}\n\n【Recall Test】\n${state.narrative.recall_test?.prompt_ja || ''}`;

    // Fallback for HTTP (local development)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => alert('Copied!'));
    } else {
        // Fallback using textarea
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
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);

    const a = document.createElement('a');
    a.href = dataUri;
    a.download = `journal_${new Date().toISOString().split('T')[0]}.json`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// ========== SRS Integration Functions ==========

/**
 * Save narrative to localStorage and schedule for review
 */
/**
 * Save narrative to localStorage and schedule for review
 */
window.saveNarrativeForReview = async () => {
    try {
        if (!state.narrative) {
            alert('No narrative to save');
            return;
        }

        const metadata = {
            category: state.category,
            answers: state.answers,
            settings: state.settings
        };

        window.showLoading('Saving narrative...');
        const saved = await window.storage?.saveNarrative(state.narrative, metadata);

        if (saved) {
            alert('✅ Journal entry saved! Ready for review.');
            // Optionally navigate to review dashboard
            setTimeout(() => window.goToReviewDashboard(), 500);
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

/**
 * Switch between views
 */
window.switchView = async (view) => {
    state.currentView = view;
    // updateNavigation is async now but we don't necessarily block UI for it, wait, badge might need it.

    window.showLoading('Loading...');

    try {
        await window.updateNavigation();

        const wizard = document.getElementById('wizard-container');
        const result = document.getElementById('result-container');

        // Reset animations
        [wizard, result].forEach(el => {
            el.classList.remove('view-enter');
            void el.offsetWidth; // Force reflow
            el.classList.add('view-enter');
        });

        switch (view) {
            case 'generate':
                wizard.style.display = 'block';
                result.style.display = 'none';
                window.renderStep();
                break;
            case 'review':
                wizard.style.display = 'none';
                result.style.display = 'block';
                if (window.renderReviewDashboard) await window.renderReviewDashboard();
                break;
            case 'history':
                wizard.style.display = 'none';
                result.style.display = 'block';
                if (window.renderHistoryPage) await window.renderHistoryPage();
                break;
            case 'stats':
                wizard.style.display = 'none';
                result.style.display = 'block';
                if (window.renderStatsPage) await window.renderStatsPage();
                break;
        }
    } finally {
        window.hideLoading();
    }
};

/**
 * Update navigation tabs to show active state
 */
/**
 * Update navigation tabs to show active state
 */
window.updateNavigation = async () => {
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        if (tab.dataset.view === state.currentView) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update due badge
    const dueNarratives = (await window.storage?.getNarrativesDueToday()) || [];
    const badge = document.getElementById('due-badge');
    if (badge) {
        if (dueNarratives.length > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = dueNarratives.length;
        } else {
            badge.style.display = 'none';
        }
    }
};

/**
 * Show navigation tabs
 */
window.showNavigation = () => {
    const navTabs = document.getElementById('navigation-tabs');
    if (navTabs) {
        navTabs.style.display = 'flex';
    }
};

/**
 * Hide navigation tabs
 */
window.hideNavigation = () => {
    const navTabs = document.getElementById('navigation-tabs');
    if (navTabs) {
        navTabs.style.display = 'none';
    }
};

/**
 * New narrative (reset form)
 */
window.newNarrative = () => {
    state.step = 0;
    state.category = null;
    state.answers = [];
    state.narrative = null;
    state.currentView = 'generate';
    window.updateNavigation();
    window.renderStep();
};

// Expose internal functions to window for global access in modules and HTML onclicks
Object.assign(window, {
    renderStep,
    renderCategorySelect,
    renderQuestionForm,
    renderOutputSettings,
    handleNext,
    handlePrev,
    generateNarrative,
    renderResult,
    init
});

// Initialize the application
init();
