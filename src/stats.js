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
        date: window.srs?.estimateMasteryDate(n.id),
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
async function renderHistoryPage() {
  const container = document.getElementById('result-container');
  if (!container) return;

  // Trigger animation
  container.classList.remove('view-enter');
  void container.offsetWidth;
  container.classList.add('view-enter');

  // Reset filters when rendering the page
  window.historyFilters = {
    searchQuery: '',
    status: 'all',
    category: 'all'
  };

  const narratives = (await window.storage?.getAllNarratives()) || [];

  let html = `
    <h2>📋 ナラティブ履歴</h2>

    <div style="margin-bottom: 1.5rem;">
      <input type="text" id="search-query" placeholder="検索（英文、日本語、カテゴリ）..."
             onchange="window.filterHistory(this.value)"
             onkeyup="window.filterHistory(this.value)"
             style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; background: #0f172a; color: #fff;">
    </div>

    <div style="margin-bottom: 1rem;">
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">ステータス:</div>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button class="secondary" data-filter-type="status" data-filter-value="all" onclick="window.filterByStatus('all')" style="padding: 0.5rem 1rem; font-size: 0.9rem; background: var(--accent-color); color: white;">すべて</button>
        <button class="secondary" data-filter-type="status" data-filter-value="new" onclick="window.filterByStatus('new')" style="padding: 0.5rem 1rem; font-size: 0.9rem;">新規</button>
        <button class="secondary" data-filter-type="status" data-filter-value="learning" onclick="window.filterByStatus('learning')" style="padding: 0.5rem 1rem; font-size: 0.9rem;">学習中</button>
        <button class="secondary" data-filter-type="status" data-filter-value="mastered" onclick="window.filterByStatus('mastered')" style="padding: 0.5rem 1rem; font-size: 0.9rem;">修得済</button>
      </div>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">カテゴリ:</div>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button class="secondary" data-filter-type="category" data-filter-value="all" onclick="window.filterByCategory('all')" style="padding: 0.5rem 1rem; font-size: 0.9rem; background: var(--accent-color); color: white;">すべて</button>
        <button class="secondary" data-filter-type="category" data-filter-value="today" onclick="window.filterByCategory('today')" style="padding: 0.5rem 1rem; font-size: 0.9rem;">今日の出来事</button>
        <button class="secondary" data-filter-type="category" data-filter-value="thoughts" onclick="window.filterByCategory('thoughts')" style="padding: 0.5rem 1rem; font-size: 0.9rem;">考え・気持ち</button>
        <button class="secondary" data-filter-type="category" data-filter-value="omakase" onclick="window.filterByCategory('omakase')" style="padding: 0.5rem 1rem; font-size: 0.9rem;">おまかせ</button>
      </div>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <button class="secondary" onclick="window.openExportUI()" style="padding: 0.5rem 1rem; font-size: 0.9rem;">📤 エクスポート</button>
    </div>
  `;

  if (narratives.length === 0) {
    html += `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
        <p style="font-size: 1.2rem;">📚 ナラティブはまだありません</p>
        <p>新しいナラティブを作成してみましょう</p>
      </div>
    `;
  } else {
    html += '<div id="history-list" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">';

    narratives.forEach((n, idx) => {
      const statusColor = {
        'new': '#60a5fa',
        'learning': '#fbbf24',
        'mastered': '#4ade80'
      }[n.srs?.status] || '#666';

      // Using ID instead of index for operations
      html += `
        <div style="background: #0f172a; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid ${statusColor};">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
            <div>
              <div style="font-weight: 600; margin-bottom: 0.25rem;">${n.category?.toUpperCase()}</div>
              <div style="font-size: 0.9rem; color: var(--text-secondary);">${n.created_at?.split('T')[0]}</div>
            </div>
            <div style="text-align: right; font-size: 0.85rem;">
              <div style="color: ${statusColor}; font-weight: 600; margin-bottom: 0.25rem;">${n.srs?.status}</div>
              <div style="color: var(--text-secondary);">復習: ${n.srs?.review_count || 0}回</div>
            </div>
          </div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
            ${n.narrative_en.substring(0, 100)}${n.narrative_en.length > 100 ? '...' : ''}
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="secondary" onclick="window.viewNarrativeDetails('${n.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem;">詳細</button>
            <button class="secondary" onclick="window.deleteNarrative('${n.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem;">削除</button>
          </div>
        </div>
      `;
    });

    html += '</div>';
  }

  html += `
    <div style="display: flex; gap: 1rem;">
      <button class="secondary" onclick="window.goToReviewDashboard()" style="flex: 1;">← 復習</button>
      <button class="secondary" onclick="window.goToGenerate()" style="flex: 1;">✍️ 新規作成</button>
    </div>
  `;

  container.innerHTML = html;
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
 * Render filtered history list
 */
async function renderFilteredHistory(narratives) {
  const container = document.getElementById('history-list');
  if (!container) return;

  if (narratives.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
        <p style="font-size: 1.2rem;">📚 該当するナラティブが見つかりません</p>
        <p>検索条件を変更してみてください</p>
      </div>
    `;
    return;
  }

  let html = '';
  narratives.forEach((n) => {
    const statusColor = {
      'new': '#60a5fa',
      'learning': '#fbbf24',
      'mastered': '#4ade80'
    }[n.srs?.status] || '#666';

    html += `
      <div style="background: #0f172a; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid ${statusColor};">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <div>
            <div style="font-weight: 600; margin-bottom: 0.25rem;">${n.category?.toUpperCase()}</div>
            <div style="font-size: 0.9rem; color: var(--text-secondary);">${n.created_at?.split('T')[0]}</div>
          </div>
          <div style="text-align: right; font-size: 0.85rem;">
            <div style="color: ${statusColor}; font-weight: 600; margin-bottom: 0.25rem;">${n.srs?.status}</div>
            <div style="color: var(--text-secondary);">復習: ${n.srs?.review_count || 0}回</div>
          </div>
        </div>
        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
          ${n.narrative_en.substring(0, 100)}${n.narrative_en.length > 100 ? '...' : ''}
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="secondary" onclick="window.viewNarrativeDetails('${n.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem;">詳細</button>
          <button class="secondary" onclick="window.deleteNarrative('${n.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem;">削除</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

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
