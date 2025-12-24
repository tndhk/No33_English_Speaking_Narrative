const state = {
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
    voices: []
};

const categories = [
    { id: 'today', label: '今日の出来事', description: '今日あった出来事や会話をナラティブにします。' },
    { id: 'thoughts', label: '考え・気持ち', description: '頭の中にある抽象的なアイデアを明確に言語化します。' },
    { id: 'omakase', label: 'おまかせ', description: '自由にトピックを入力してください。' }
];

const questions = {
    today: ['それはいつ、どこでの出来事ですか？', '登場人物は誰ですか？', '一言でいうと、何が起こりましたか？'],
    thoughts: ['最近よく考えていることは何ですか？', 'それについて、どう感じていますか？', '最終的に、何を伝えたいですか？'],
    omakase: ['何を英語にしたいですか？', '特に強調したいニュアンスはありますか？']
};

function init() {
    renderStep();

    document.getElementById('next-btn').addEventListener('click', handleNext);
    document.getElementById('prev-btn').addEventListener('click', handlePrev);
}

function renderStep() {
    const container = document.getElementById('step-content');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    container.innerHTML = '';
    prevBtn.style.display = state.step > 0 ? 'inline-block' : 'none';

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
        group.innerHTML = `<label style="display:block; margin-bottom:0.5rem; color:var(--text-secondary)">${q}</label>
                           <textarea data-index="${i}" style="width:100%; padding:0.75rem; border-radius:0.5rem; background:#0f172a; border:1px solid var(--border-color); color:#fff; min-height:80px;">${state.answers[i] || ''}</textarea>`;
        container.appendChild(group);
    });
}

function renderOutputSettings(container) {
    container.innerHTML = '<h2>出力の設定</h2>';

    const settingsHtml = `
        <div style="margin-bottom:1.5rem">
            <label style="display:block; margin-bottom:0.5rem">長さ</label>
            <div class="option-list">
                ${['Short', 'Normal', 'Long'].map(l => `<div class="option-item ${state.settings.length === l ? 'selected' : ''}" onclick="window.updateSetting('length', '${l}')">${l}</div>`).join('')}
            </div>
        </div>
        <div style="margin-bottom:1.5rem">
            <label style="display:block; margin-bottom:0.5rem">トーン</label>
            <div class="option-list">
                ${['Casual', 'Business', 'Formal'].map(t => `<div class="option-item ${state.settings.tone === t ? 'selected' : ''}" onclick="window.updateSetting('tone', '${t}')">${t}</div>`).join('')}
            </div>
        </div>
        <div style="margin-bottom:1.5rem">
            <label style="display:block; margin-bottom:0.5rem">読み上げ速度: ${state.settings.rate}</label>
            <input type="range" min="0.5" max="1.5" step="0.1" value="${state.settings.rate}" 
                   onchange="window.updateSetting('rate', parseFloat(this.value))" style="width:100%">
        </div>
    `;
    container.innerHTML += settingsHtml;
}

window.updateSetting = (key, val) => {
    state.settings[key] = val;
    renderStep();
};

async function handleNext() {
    if (state.step === 0 && !state.category) {
        alert('カテゴリを選択してください');
        return;
    }

    if (state.step === 1) {
        const textareas = document.querySelectorAll('textarea');
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

async function generateNarrative() {
    const loader = document.getElementById('loading-overlay');
    loader.style.display = 'flex';

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        loader.style.display = 'none';
    }
}

function renderResult() {
    const wizard = document.getElementById('wizard-container');
    const result = document.getElementById('result-container');
    const data = state.narrative;

    wizard.style.display = 'none';
    result.style.display = 'block';

    result.innerHTML = `
        <h2>Your English Narrative</h2>
        <div id="narrative-sentences" class="narrative-box" style="background:#0f172a; padding:1.5rem; border-radius:1rem; margin-bottom:1.5rem; font-size:1.1rem; line-height:1.8;">
            ${data.narrative_en.split(/(?<=[.!?])\s+/).map((s, i) => `<span class="sentence" onclick="window.speak('${s.replace(/'/g, "\\'")}')" style="cursor:pointer; display:inline-block; margin-right:4px;">${s}</span>`).join('')}
        </div>
        
        <div class="actions" style="display:flex; gap:1rem; margin-bottom:2rem;">
            <button class="primary" onclick="window.speak()">Play Full</button>
            <button class="secondary" onclick="window.copy()">Copy</button>
            <button class="secondary" onclick="window.download()">JSON</button>
        </div>

        <h3>Key Phrases</h3>
        <ul style="list-style:none; padding:0; margin-bottom:2rem;">
            ${data.key_phrases.map(p => `
                <li style="margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid var(--border-color)">
                    <div style="font-weight:600; color:var(--accent-color)">${p.phrase_en}</div>
                    <div style="font-size:0.9rem">${p.meaning_ja}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary)">${p.usage_hint_ja}</div>
                </li>
            `).join('')}
        </ul>

        <h3>Recall Test</h3>
        <p style="color:var(--text-secondary); margin-bottom:1rem;">次の要点を英語で言ってみましょう：</p>
        <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:0.5rem; margin-bottom:1.5rem;">
            ${data.recall_test.prompt_ja}
        </div>
        
        <button class="secondary" onclick="location.reload()">New Narrative</button>
    `;
}

window.speak = (text) => {
    const target = text || state.narrative.narrative_en;
    const msg = new SpeechSynthesisUtterance(target);
    const voices = window.speechSynthesis.getVoices();
    // Default to a natural sounding English voice
    msg.voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google') && v.name.includes('Male')) ||
        voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
        voices.find(v => v.lang === 'en-US' && v.name.includes('Male')) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en'));
    msg.rate = state.settings.rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
};

window.copy = () => {
    const text = `【Narrative】\n${state.narrative.narrative_en}\n\n【Recall Test】\n${state.narrative.recall_test?.prompt_ja || ''}`;

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
    a.download = `narrative_${new Date().toISOString().split('T')[0]}.json`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

init();
