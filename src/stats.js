/**
 * Stats Module - Statistics, streaks, and analytics
 * Tracks learning progress and provides visualization data
 */

/**
 * Render review dashboard (main review entry point)
 */
/**
 * Render review dashboard (main review entry point)
 */
// Helper to format category for display (Duplicate from main.js for now, better to move to utility)
function formatCategory(cat) {
  const map = {
    'today': '📝 日々の記録',
    'thoughts': '💭 思考メモ',
    'omakase': '✨ 自由記述'
  };
  return map[cat] || cat;
}

/**
 * Render review dashboard (main review entry point)
 */
async function renderReviewDashboard() {
  const container = document.getElementById('result-container');
  if (!container) return;

  // Trigger animation
  container.classList.remove('view-enter');
  void container.offsetWidth;
  container.classList.add('view-enter');

  const dueToday = (await window.storage?.getNarrativesDueToday()) || [];
  const stats = (await window.storage?.getSRSStats()) || {};
  const narratives = (await window.storage?.getAllNarratives()) || [];

  // Pick a "Featured Memory" (e.g., from exactly 1 year ago, or just random)
  let featuredTitle = "";
  let featuredNarrative = null;

  if (narratives.length > 0) {
    if (dueToday.length > 0) {
      // If there are reviews due, pick the first one
      featuredNarrative = dueToday[0];
      featuredTitle = "覚えていますか？";
    } else {
      // Random memory
      const idx = Math.floor(Math.random() * narratives.length);
      featuredNarrative = narratives[idx];
      featuredTitle = "思い出の1ページ";
    }
  }

  let html = `
    <div style="margin-bottom: 2rem;">

  `;

  // Featured Memory Card
  if (featuredNarrative) {
    const dateStr = new Date(featuredNarrative.created_at).toLocaleDateString('ja-JP');
    html += `
        <div class="narrative-card" style="position: relative; background: #1e293b; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="position: absolute; top: -12px; left: 24px; background: var(--accent-color); color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ${featuredTitle}
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.5rem; margin-top: 0.5rem;">
                <span style="font-size: 1.1rem; font-weight: bold; color: var(--text-primary);">${dateStr}</span>
                <span style="font-size: 0.9rem; color: var(--text-secondary); text-transform: capitalize; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px;">
                    ${formatCategory(featuredNarrative.category)}
                </span>
            </div>
            
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; line-height: 1.8; color: var(--text-primary); margin-bottom: 1rem; font-style: italic;">
                "${featuredNarrative.narrative_en.substring(0, 120)}${featuredNarrative.narrative_en.length > 120 ? '...' : ''}"
            </div>
        </div>
      `;
  } else {
    html += `
        <div style="padding: 3rem 2rem; text-align: center; border: 2px dashed var(--border-color); border-radius: 1rem; margin-bottom: 2rem;">
            <p style="margin-bottom: 1.5rem; font-size: 1.1rem;">まだ日記がありません。<br>今日から思い出を記録し始めましょう。</p>
            <button class="primary" onclick="window.goToGenerate()">最初の1ページを書く</button>
        </div>
      `;
  }

  // Action Button (Review)
  if (dueToday.length > 0) {
    html += `
      <div style="text-align: center;">
          <button class="primary" onclick="window.startReview()" style="width: 100%; padding: 1.25rem; font-size: 1.1rem; margin-bottom: 1rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            ✨ この日記を読み返す (${dueToday.length}件)
          </button>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 2rem;">
            当時の気持ちや表現を、もう一度味わってみましょう。
          </p>
      </div>
    `;
  } else {
    if (featuredNarrative) {
      html += `
          <div style="text-align: center; margin-bottom: 2rem; color: var(--text-secondary);">
            <p>🎉 今日の振り返りは完了しています</p>
            <button class="secondary" onclick="window.startReview()" style="margin-top:0.5rem;">自由に読み返す</button>
          </div>
        `;
    }
  }

  html += '</div>'; // End Hero Section

  // Simple Stats (Bottom, subtle)
  html += `
    <div style="border-top: 1px solid var(--border-color); padding-top: 2rem; margin-bottom: 1rem;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
            <div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--text-primary);">${stats.current_streak || 0}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">続けた日数</div>
            </div>
            <div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--text-primary);">${narratives.length}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">思い出の数</div>
            </div>
            <div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--text-primary);">${stats.total_reviews || 0}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">読んだ回数</div>
            </div>
        </div>
    </div>
  `;


  container.innerHTML = html;
}

/**
 * Render detailed statistics screen
 */
/**
 * Render detailed statistics screen
 */
async function renderProfilePage() {
  const container = document.getElementById('result-container');
  if (!container) return;

  // Trigger animation
  container.classList.remove('view-enter');
  void container.offsetWidth;
  container.classList.add('view-enter');

  const narratives = (await window.storage?.getAllNarratives()) || [];
  const stats = (await window.storage?.getSRSStats()) || {};
  const srsStats = window.srs?.getReviewStatistics(narratives) || {};

  // Get current user info safely
  const user = window.auth?.getCurrentUser() || {};
  const email = user?.email || 'Guest User';

  // Calculate stats by category
  const byCategory = {};
  narratives.forEach(n => {
    const cat = n.category || 'other';
    if (!byCategory[cat]) {
      byCategory[cat] = { new: 0, learning: 0, mastered: 0, total: 0 };
    }
    byCategory[cat].total++;
    if (n.srs?.status === 'new') byCategory[cat].new++;
    else if (n.srs?.status === 'learning') byCategory[cat].learning++;
    else if (n.srs?.status === 'mastered') byCategory[cat].mastered++;
  });

  let html = `
    <!-- User Profile Card -->
    <div style="background: rgba(255, 255, 255, 0.05); padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--accent-color); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                👤
            </div>
            <div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">Logged in as</div>
                <div style="font-weight: bold; font-size: 1.1rem;">${email}</div>
            </div>
        </div>
        <button class="secondary" onclick="window.auth.signOut()" style="margin: 0; padding: 0.5rem 1rem; font-size: 0.9rem;">
            Logout
        </button>
    </div>

    <!-- Stats Cards -->
    <div style="background: #0f172a; padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem;">
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
        <div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">書いた日記</div>
          <div style="font-size: 2rem; font-weight: bold;">${srsStats.total}</div>
        </div>
        <div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">振り返り回数</div>
          <div style="font-size: 2rem; font-weight: bold;">${stats.total_reviews || 0}</div>
        </div>
        <div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">続けた日数</div>
          <div style="font-size: 2rem; font-weight: bold;">${stats.longest_streak || 0} 日</div>
        </div>
    </div>
  `;

  // Mastery timeline
  if (narratives.length > 0) {
    html += `
      <h3>次の振り返り予定</h3>
      <div style="background: #0f172a; padding: 1rem; border-radius: 1rem; margin-bottom: 2rem;">
    `;

    const estimates = narratives
      .filter(n => n.srs?.status !== 'mastered')
      .map(n => ({
        date: window.srs?.estimateMasteryDate(n),
        category: n.category
      }))
      .filter(e => e.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10);

    if (estimates.length > 0) {
      estimates.forEach(e => {
        const date = new Date(e.date);
        const daysAway = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
        const displayCat = formatCategory(e.category);

        html += `
          <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
            <span>${displayCat}</span>
            <span style="color: ${daysAway <= 7 ? '#fbbf24' : '#60a5fa'};">${date.toLocaleDateString('ja-JP')} (${daysAway}日後)</span>
          </div>
        `;
      });
    } else {
      html += '<p style="color: var(--text-secondary); margin: 0;">次の振り返り予定はありません</p>';
    }

    html += '</div>';
  }

  container.innerHTML = html;
}

/**
 * Render history/library view
 */
// Calendar State
window.calendarState = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(), // 0-indexed
  selectedDate: null
};

/**
 * Render history/library view (Calendar Mode)
 */
async function renderHistoryPage() {
  const container = document.getElementById('result-container');
  if (!container) return;

  // Trigger animation
  container.classList.remove('view-enter');
  void container.offsetWidth;
  container.classList.add('view-enter');

  // Fetch all narratives
  const narratives = (await window.storage?.getAllNarratives()) || [];
  window.allNarratives = narratives; // Cache for calendar rendering

  let html = `
    <!-- Calendar Controls -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background: rgba(15, 23, 42, 0.4); padding: 0.75rem 1rem; border-radius: 1rem; border: 1px solid var(--border-color);">
        <button class="calendar-nav-btn" onclick="window.changeMonth(-1)" aria-label="Previous Month">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div style="font-size: 1.1rem; font-weight: 600; letter-spacing: 0.02em; font-family: 'Outfit', sans-serif;">
            <span id="calendar-month-label"></span>
        </div>
        <button class="calendar-nav-btn" onclick="window.changeMonth(1)" aria-label="Next Month">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
    </div>

    <!-- Calendar Grid -->
    <div id="calendar-grid" class="calendar-grid">
        <!-- Injected by renderCalendar -->
    </div>

    <!-- Selected Date Entries -->
    <div id="selected-date-container" style="margin-top: 2rem;">
        <h3 id="selected-date-label">Select a date</h3>
        <div id="selected-date-entries"></div>
    </div>
  `;


  container.innerHTML = html;
  window.renderCalendar();
}

/**
 * Render the Calendar Grid
 */
window.renderCalendar = () => {
  const year = window.calendarState.currentYear;
  const month = window.calendarState.currentMonth;

  // Update Label
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  document.getElementById('calendar-month-label').textContent = `${monthNames[month]} ${year}`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  // Day headers
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  days.forEach(d => {
    const div = document.createElement('div');
    div.className = 'calendar-header';
    div.textContent = d;
    grid.appendChild(div);
  });

  // Calendar logic
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const div = document.createElement('div');
    div.className = 'calendar-day empty';
    grid.appendChild(div);
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const div = document.createElement('div');
    div.className = 'calendar-day';

    // Check for entries
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entries = window.allNarratives.filter(n => n.created_at.startsWith(dateStr));

    if (entries.length > 0) {
      div.classList.add('has-entry');
      const dot = document.createElement('div');
      dot.className = 'entry-dot';
      div.appendChild(dot);
    }

    // Check if selected
    if (window.calendarState.selectedDate === dateStr) {
      div.classList.add('selected');
    }

    div.onclick = () => window.selectDate(dateStr);

    const number = document.createElement('span');
    number.textContent = d;
    div.appendChild(number);

    grid.appendChild(div);
  }
};

window.changeMonth = (delta) => {
  let { currentMonth, currentYear } = window.calendarState;
  currentMonth += delta;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  } else if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  window.calendarState.currentMonth = currentMonth;
  window.calendarState.currentYear = currentYear;
  window.renderCalendar();
};

window.selectDate = (dateStr) => {
  window.calendarState.selectedDate = dateStr;
  window.renderCalendar(); // Re-render to update selected style

  // Render entries for the date
  const label = document.getElementById('selected-date-label');
  const container = document.getElementById('selected-date-entries');

  label.textContent = `Entries for ${dateStr}`;
  container.innerHTML = '';

  const entries = window.allNarratives.filter(n => n.created_at.startsWith(dateStr));

  if (entries.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary)">No entries for this day.</p>';
    return;
  }

  entries.forEach(n => {
    const el = document.createElement('div');
    el.style.cssText = 'background: #1e293b; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; border-left: 3px solid var(--accent-color);';
    el.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 0.5rem;">${formatCategory(n.category)}</div>
            <div style="margin-bottom: 0.5rem; white-space: pre-wrap;">${n.narrative_en}</div>
            <button class="secondary" style="font-size: 0.8rem; padding: 0.3rem 0.8rem;" onclick="window.viewNarrativeDetails('${n.id}')">Details</button>
        `;
    container.appendChild(el);
  });
};

/**
 * Render filtered history list (Legacy - kept for compatibility if needed, but unused in calendar view)
 */
async function renderFilteredHistory(narratives) {
  // No-op for now as we switched to calendar
}

// Global functions for UI navigation
window.renderReviewDashboard = renderReviewDashboard;
window.renderProfilePage = renderProfilePage;
window.renderHistoryPage = renderHistoryPage;

window.goToReviewDashboard = async function () {
  window.state.currentView = 'review';
  await window.updateNavigation();
  await window.renderReviewDashboard();
};

window.goToStats = async function () {
  window.state.currentView = 'profile';
  await window.updateNavigation();
  await window.renderProfilePage();
};

window.goToHistory = async function () {
  window.state.currentView = 'history';
  await window.updateNavigation();
  await window.renderHistoryPage();
};

window.goToGenerate = function () {
  window.state.currentView = 'generate';
  window.state.step = 0;
  window.updateNavigation();
  window.renderStep();
};

window.startReview = async function () {
  window.showLoading('Preparing review...');
  try {
    const success = await window.initReviewSession({ order: 'oldest_first' });
    if (!success) {
      alert('復習するナラティブがありません');
      return;
    }
    window.renderReviewSession();
  } finally {
    window.hideLoading();
  }
};

window.openExportUI = async function () {
  window.state.currentView = 'export';
  await window.renderExportUI();
};

// Filter state to maintain current filters
window.historyFilters = {
  searchQuery: '',
  status: 'all',
  category: 'all'
};

/**
 * Apply all filters and re-render history list
 */
async function applyHistoryFilters() {
  const filters = {};

  if (window.historyFilters.searchQuery) {
    filters.searchQuery = window.historyFilters.searchQuery;
  }

  if (window.historyFilters.status && window.historyFilters.status !== 'all') {
    filters.status = window.historyFilters.status;
  }

  if (window.historyFilters.category && window.historyFilters.category !== 'all') {
    filters.category = window.historyFilters.category;
  }

  const narratives = await window.storage?.filterNarratives(filters) || [];
  await renderFilteredHistory(narratives);

  // Update button states
  updateFilterButtonStates();
}

/**
 * Update visual state of filter buttons
 */
function updateFilterButtonStates() {
  // Update status buttons
  document.querySelectorAll('[data-filter-type="status"]').forEach(btn => {
    const status = btn.getAttribute('data-filter-value');
    if (status === window.historyFilters.status) {
      btn.style.background = 'var(--accent-color)';
      btn.style.color = 'white';
    } else {
      btn.style.background = '';
      btn.style.color = '';
    }
  });

  // Update category buttons
  document.querySelectorAll('[data-filter-type="category"]').forEach(btn => {
    const category = btn.getAttribute('data-filter-value');
    if (category === window.historyFilters.category) {
      btn.style.background = 'var(--accent-color)';
      btn.style.color = 'white';
    } else {
      btn.style.background = '';
      btn.style.color = '';
    }
  });
}

/**
 * Filter history by search query
 */
window.filterHistory = async function (query) {
  window.historyFilters.searchQuery = query;
  await applyHistoryFilters();
};

/**
 * Filter history by status
 */
window.filterByStatus = async function (status) {
  window.historyFilters.status = status;
  await applyHistoryFilters();
};

/**
 * Filter history by category
 */
window.filterByCategory = async function (category) {
  window.historyFilters.category = category;
  await applyHistoryFilters();
};

window.viewNarrativeDetails = async function (id) {
  const n = await window.storage?.getNarrativeById(id);
  if (!n) return;

  const details = `
【${n.category?.toUpperCase()}】${n.created_at?.split('T')[0]}

【英文】
${n.narrative_en}

【キーフレーズ】
${n.key_phrases.map(p => `• ${p.phrase_en} - ${p.meaning_ja}`).join('\n')}

【復習テスト】
${n.recall_test.prompt_ja}

【復習情報】
ステータス: ${n.srs?.status}
復習回数: ${n.srs?.review_count}
次の復習: ${n.srs?.next_review_date}
  `;

  const textarea = document.createElement('textarea');
  textarea.value = details;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  alert('詳細をコピーしました！');
};

window.deleteNarrative = async function (id) {
  if (!confirm('このナラティブを削除しますか？')) return;

  window.showLoading('Deleting...');
  try {
    await window.storage?.deleteNarrative(id);
    await window.renderHistoryPage();
  } finally {
    window.hideLoading();
  }
};
