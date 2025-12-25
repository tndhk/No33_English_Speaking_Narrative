/**
 * Stats Module - Statistics, streaks, and analytics
 * Tracks learning progress and provides visualization data
 */

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
  const upcoming = (await window.storage?.getNarrativesUpcoming(7)) || [];
  const stats = (await window.storage?.getSRSStats()) || {};

  // SRS Stats needs narratives to calculate review statistics
  // Or we can rely on what we have. window.srs.getReviewStatistics likely takes narratives or uses storage internally.
  // Assuming window.srs.getReviewStatistics is sync but expects narratives logic, let's see srs.js later.
  // For now, let's fetch all narratives to pass to srs helpers if needed or assuming they are stateless helpers.
  const narratives = (await window.storage?.getAllNarratives()) || [];
  const srsStats = window.srs?.getReviewStatistics(narratives) || {};

  let html = `
    <h2>📚 復習ダッシュボード</h2>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
  `;

  // Due today card
  html += `
    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 1.5rem; border-radius: 1rem; color: white;">
      <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">今日の復習</div>
      <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;">${dueToday.length}</div>
      <div style="font-size: 0.85rem; opacity: 0.8;">件</div>
    </div>
  `;

  // Streak card
  html += `
    <div style="background: linear-gradient(135deg, #22c55e 0%, #15803d 100%); padding: 1.5rem; border-radius: 1rem; color: white;">
      <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">連続日数</div>
      <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;">🔥 ${stats.current_streak || 0}</div>
      <div style="font-size: 0.85rem; opacity: 0.8;">最長: ${stats.longest_streak || 0} 日</div>
    </div>
  `;

  // Total reviews card
  html += `
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); padding: 1.5rem; border-radius: 1rem; color: white;">
      <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">累計復習数</div>
      <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;">${stats.total_reviews || 0}</div>
      <div style="font-size: 0.85rem; opacity: 0.8;">回</div>
    </div>
  `;

  // Accuracy card
  html += `
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #92400e 100%); padding: 1.5rem; border-radius: 1rem; color: white;">
      <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">正答率</div>
      <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;">${srsStats.accuracy_rate || '0'}%</div>
      <div style="font-size: 0.85rem; opacity: 0.8;">平均</div>
    </div>
  `;

  html += '</div>';

  // Status breakdown
  html += `
    <div style="background: #0f172a; padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem;">
      <h3 style="margin-top: 0;">ナラティブの状況</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
        <div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">新規</div>
          <div style="font-size: 1.8rem; color: #60a5fa;">${srsStats.new}</div>
        </div>
        <div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">学習中</div>
          <div style="font-size: 1.8rem; color: #fbbf24;">${srsStats.learning}</div>
        </div>
        <div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">修得済</div>
          <div style="font-size: 1.8rem; color: #4ade80;">${srsStats.mastered}</div>
        </div>
      </div>
    </div>
  `;

  // Start review button
  if (dueToday.length > 0) {
    html += `
      <button class="primary" onclick="window.startReview()" style="width: 100%; padding: 1.5rem; font-size: 1.1rem; margin-bottom: 1.5rem;">
        復習を開始（${dueToday.length}件）
      </button>
    `;
  } else {
    html += `
      <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); padding: 1.5rem; border-radius: 1rem; text-align: center; margin-bottom: 1.5rem;">
        <p style="margin: 0; color: #4ade80;">🎉 今日の復習はすべて完了です！</p>
      </div>
    `;
  }

  // Upcoming section
  if (upcoming.length > 0) {
    html += `
      <h3>今後の復習（7日以内）</h3>
      <div style="background: #0f172a; padding: 1rem; border-radius: 1rem; margin-bottom: 2rem;">
    `;

    upcoming.slice(0, 5).forEach(n => {
      const daysLeft = window.srs?.daysUntilReview(n.srs.next_review_date) || 0;
      const dateStr = new Date(n.srs.next_review_date).toLocaleDateString('ja-JP');

      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
          <div>
            <div style="font-size: 0.9rem; color: var(--text-secondary);">${n.category}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${n.narrative_en.substring(0, 50)}...</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.85rem; color: var(--accent-color);">${dateStr}</div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary);">${daysLeft + 1}日後</div>
          </div>
        </div>
      `;
    });

    if (upcoming.length > 5) {
      html += `<div style="padding: 0.75rem 0; color: var(--text-secondary);">他 ${upcoming.length - 5} 件</div>`;
    }

    html += '</div>';
  }

  // Navigation buttons
  html += `
    <div style="display: flex; gap: 1rem;">
      <button class="secondary" onclick="window.goToHistory()" style="flex: 1;">📋 履歴を見る</button>
      <button class="secondary" onclick="window.goToStats()" style="flex: 1;">📊 詳細統計</button>
      <button class="secondary" onclick="window.goToGenerate()" style="flex: 1;">✍️ 新規作成</button>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Render detailed statistics screen
 */
async function renderStatsPage() {
  const container = document.getElementById('result-container');
  if (!container) return;

  // Trigger animation
  container.classList.remove('view-enter');
  void container.offsetWidth;
  container.classList.add('view-enter');

  const narratives = (await window.storage?.getAllNarratives()) || [];
  const stats = (await window.storage?.getSRSStats()) || {};
  const srsStats = window.srs?.getReviewStatistics(narratives) || {};

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
    <h2>📊 学習統計</h2>

    <div style="background: #0f172a; padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem;">
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
        <div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">総ナラティブ数</div>
          <div style="font-size: 2rem; font-weight: bold;">${srsStats.total}</div>
        </div>
        <div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">累計復習回数</div>
          <div style="font-size: 2rem; font-weight: bold;">${stats.total_reviews || 0}</div>
        </div>
        <div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">最長連続日数</div>
          <div style="font-size: 2rem; font-weight: bold;">${stats.longest_streak || 0} 日</div>
        </div>
        <div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">平均正答率</div>
          <div style="font-size: 2rem; font-weight: bold;">${srsStats.accuracy_rate || '0'}%</div>
        </div>
      </div>
    </div>

    <h3>カテゴリ別進捗</h3>
    <div style="background: #0f172a; padding: 1rem; border-radius: 1rem; margin-bottom: 2rem;">
  `;

  Object.entries(byCategory).forEach(([cat, counts]) => {
    const total = counts.total;
    const masteredPct = (counts.mastered / total * 100).toFixed(0);

    html += `
      <div style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong>${cat}</strong>
          <span style="font-size: 0.9rem; color: var(--text-secondary);">${counts.total} 件</span>
        </div>
        <div style="display: flex; height: 24px; border-radius: 4px; overflow: hidden; background: rgba(255,255,255,0.05); margin-bottom: 0.5rem;">
          <div style="flex: ${counts.new}; background: #60a5fa;" title="新規: ${counts.new}"></div>
          <div style="flex: ${counts.learning}; background: #fbbf24;" title="学習中: ${counts.learning}"></div>
          <div style="flex: ${counts.mastered}; background: #4ade80;" title="修得済: ${counts.mastered}"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
          <span>新規: ${counts.new}</span>
          <span>学習中: ${counts.learning}</span>
          <span style="color: #4ade80;">修得済: ${counts.mastered} (${masteredPct}%)</span>
        </div>
      </div>
    `;
  });

  html += '</div>';

  // Mastery timeline
  if (narratives.length > 0) {
    html += `
      <h3>修得予定日</h3>
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

        html += `
          <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
            <span>${e.category}</span>
            <span style="color: ${daysAway <= 7 ? '#fbbf24' : '#60a5fa'};">${date.toLocaleDateString('ja-JP')} (${daysAway}日後)</span>
          </div>
        `;
      });
    } else {
      html += '<p style="color: var(--text-secondary); margin: 0;">修得予定のナラティブはありません</p>';
    }

    html += '</div>';
  }

  html += `
    <button class="secondary" onclick="window.goToReviewDashboard()" style="width: 100%;">← 戻る</button>
  `;

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
    <h2>📅 Journal Calendar</h2>
    
    <!-- Calendar Controls -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; background: #0f172a; padding: 1rem; border-radius: 0.5rem;">
        <button class="secondary" onclick="window.changeMonth(-1)">◀</button>
        <div style="font-size: 1.2rem; font-weight: bold;">
            <span id="calendar-month-label"></span>
        </div>
        <button class="secondary" onclick="window.changeMonth(1)">▶</button>
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
    
    <div style="margin-top: 2rem; display: flex; gap: 1rem;">
        <button class="secondary" onclick="window.goToReviewDashboard()" style="flex: 1;">← 復習</button>
        <button class="secondary" onclick="window.goToGenerate()" style="flex: 1;">✍️ 新規作成</button>
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
            <div style="font-weight: bold; margin-bottom: 0.5rem;">${n.category}</div>
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
window.renderStatsPage = renderStatsPage;
window.renderHistoryPage = renderHistoryPage;

window.goToReviewDashboard = async function () {
  window.state.currentView = 'review';
  await window.updateNavigation();
  await window.renderReviewDashboard();
};

window.goToStats = async function () {
  window.state.currentView = 'stats';
  await window.updateNavigation();
  await window.renderStatsPage();
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
