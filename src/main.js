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
    { id: 'today', label: '📝 今日の出来事', description: '日々のできごとを英語で記録。今日あった会話やイベントを振り返りながら、自然なジャーナルを作成しましょう。' },
    { id: 'thoughts', label: '💭 思考・アイデア', description: '頭の中にある考えや感情を言葉に。抽象的なアイデアを英語で整理し、表現力を磨きましょう。' },
    { id: 'omakase', label: '✨ フリースタイル', description: '好きなテーマで自由に書く。学習したい表現や伝えたいトピックを、あなたのペースで英語に。' }
];

const questions = {
    today: ['いつ、どこでの出来事ですか？', '誰が関わっていましたか？', 'ひと言で言うと、何があったのでしょう？'],
    thoughts: ['最近、頭に浮かぶことは何ですか？', 'そのことについて、どう感じていますか？', '最終的に、何を伝えたいですか？'],
    omakase: ['何を英語にしたいですか？', '特に意識したいニュアンスや表現はありますか？']
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

    // Hide Next button on step 0 (auto-advance), show for other steps
    nextBtn.style.display = state.step === 0 ? 'none' : 'inline-block';

    // Apply sticky positioning for step actions on steps 1 and 2
    const stepActions = document.getElementById('step-actions');
    if (state.step > 0) {
        stepActions.classList.add('sticky-actions');
    } else {
        stepActions.classList.remove('sticky-actions');
    }

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
    container.innerHTML = ''; // Clear container
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
            // Auto-advance after a short delay for visual feedback
            setTimeout(() => {
                state.step = 1;
                renderStep();
            }, 200);
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

/**
 * Render the generation result with a premium learning interface
 */
function renderResult() {
    const wizard = document.getElementById('wizard-container');
    const result = document.getElementById('result-container');
    const data = state.narrative;

    // Ensure category is preserved in state.narrative if missing from API
    if (!data.category) data.category = state.category;

    wizard.style.display = 'none';
    result.style.display = 'block';

    // Trigger animation
    result.classList.remove('view-enter');
    void result.offsetWidth;
    result.classList.add('view-enter');

    // Format category and date nicely
    const displayCategory = formatCategory(data.category);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = new Date().toLocaleDateString('en-US', dateOptions);

    // Split narrative into sentences for interactive viewing
    const sentences = data.narrative_en.split(/(?<=[.!?])\s+/);

    const html = `
        <div class="result-header" style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                <h2 style="margin: 0; font-family: 'Outfit', sans-serif;">${displayCategory}</h2>
                <span style="font-size: 0.9rem; color: var(--text-secondary);">${formattedDate}</span>
            </div>
            <div style="height: 2px; background: linear-gradient(90deg, var(--accent-color), transparent); width: 100px;"></div>
        </div>
        
        <div class="result-grid" style="display: flex; flex-direction: column; gap: 2rem;">
            <!-- Narrative (Main) -->
            <section class="card" style="background: rgba(30, 41, 59, 0.5); padding: 2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.2rem;">📖</span> English Journal
                    </h3>
                    <div style="display:flex; gap:0.75rem;">
                        <button class="btn btn-secondary" style="width: auto; padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="window.speak()">🔊 Full Play</button>
                    </div>
                </div>
                
                <!-- Interactive Reading Mode -->
                <div class="narrative-display" style="line-height: 2; font-size: 1.15rem; margin-bottom: 1.5rem;">
                    ${sentences.map((s, i) => `
                        <span class="sentence-text" 
                              data-index="${i}" 
                              style="cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: all 0.2s;"
                              onclick="window.speak('${s.replace(/'/g, "\\'")}', ${i})">${s}</span> 
                    `).join('')}
                </div>

                <!-- Hidden Editable Textarea for background state management -->
                <textarea class="editable-narrative" style="display:none;">${data.narrative_en}</textarea>
                
                <p style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                    Tips: Click each sentence to listen separately.
                </p>
            </section>

            <!-- Key Phrases -->
            <section>
                <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">🔑</span> Key Phrases
                </h3>
                <div style="display: grid; gap: 1rem;">
                    ${data.key_phrases.map(p => `
                        <div class="card" style="background: rgba(255, 255, 255, 0.03); padding: 1.25rem; border: 1px solid var(--border-color); border-left: 4px solid var(--accent-color);">
                            <div style="font-weight:700; color:var(--text-primary); margin-bottom:0.25rem;">${p.phrase_en}</div>
                            <div style="font-size:0.95rem; color: var(--accent-color); margin-bottom:0.5rem;">${p.meaning_ja}</div>
                            <div style="font-size:0.85rem; color:var(--text-secondary); line-height: 1.4;">${p.usage_hint_ja}</div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <!-- Recall Test -->
            <section class="card" style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.05), rgba(129, 140, 248, 0.05)); border: 1px solid var(--border-color);">
                <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">🧠</span> Recall Test
                </h3>
                <p style="color:var(--text-secondary); margin-bottom: 1.25rem; font-size: 0.95rem;">ポイントを意識して英語で言ってみましょう：</p>
                <div style="background: rgba(15, 23, 42, 0.5); padding: 1.5rem; border-radius: 0.75rem; border: 1px dashed var(--border-color); line-height: 1.6;">
                    ${data.recall_test.prompt_ja}
                </div>
            </section>
        </div>

        <!-- Main Actions -->
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1rem; margin-top:3rem; margin-bottom:1.5rem;">
            <button class="btn btn-primary" style="padding: 1.25rem;" onclick="window.saveNarrativeForReview()">💾 Save to Journal</button>
            <button class="btn btn-secondary" style="padding: 1.25rem;" onclick="window.copy()">📋 Copy</button>
        </div>

        <!-- Secondary Actions -->
        <div style="display:flex; gap:1rem;">
            <button class="btn btn-secondary" style="flex:1; opacity: 0.7;" onclick="window.newNarrative()">✨ New Entry</button>
            <button class="btn btn-secondary" style="flex:1; opacity: 0.7;" onclick="window.switchView('review')">📚 Dashboard</button>
        </div>
    `;
    result.innerHTML = html;

    // Sync content if editing was implemented (currently read-only interactive mode)
    const textarea = result.querySelector('.editable-narrative');
    if (textarea) {
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
    // Desktop Nav
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        if (tab.dataset.view === state.currentView) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Mobile Bottom Nav
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        if (item.dataset.view === state.currentView) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update due badge
    const dueNarratives = (await window.storage?.getNarrativesDueToday()) || [];
    const count = dueNarratives.length;

    // Desktop Badge
    const badgeDesktop = document.getElementById('due-badge-desktop');
    if (badgeDesktop) {
        if (count > 0) {
            badgeDesktop.style.display = 'inline-block';
            badgeDesktop.textContent = count;
        } else {
            badgeDesktop.style.display = 'none';
        }
    }

    // Mobile Badge (Red dot only)
    const badgeMobile = document.getElementById('due-badge-mobile');
    if (badgeMobile) {
        if (count > 0) {
            badgeMobile.style.display = 'block';
        } else {
            badgeMobile.style.display = 'none';
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
