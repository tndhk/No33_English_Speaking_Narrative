/**
 * Review Session Module - Manages review sessions and user interactions
 * Handles loading journal entries, tracking progress, and recording ratings
 */

const reviewSession = {
  narratives: [],
  currentIndex: 0,
  showAnswer: false,
  startTime: null,
  sessionStats: {
    started: 0,
    completed: 0,
    ratings: []
  }
};

/**
 * Initialize a review session with due narratives
 * @param {Object} options - Session options {order, limit}
 * @returns {Promise<boolean>} Success status
 */
async function initReviewSession(options = {}) {
  try {
    const { order = 'oldest_first', limit = null } = options;

    // Get due narratives
    const dueNarratives = (await window.storage?.getNarrativesDueToday()) || [];

    if (dueNarratives.length === 0) {
      return false; // No narratives to review
    }

    // Apply order
    let ordered = dueNarratives;
    if (order === 'oldest_first') {
      ordered = window.srs?.getOptimalReviewOrder(dueNarratives) || dueNarratives;
    } else if (order === 'random') {
      ordered = window.srs?.getRandomReviewOrder(dueNarratives) || dueNarratives;
    }

    // Apply limit if specified
    if (limit && limit > 0) {
      ordered = ordered.slice(0, limit);
    }

    reviewSession.narratives = ordered;
    reviewSession.currentIndex = 0;
    reviewSession.showAnswer = false;
    reviewSession.startTime = new Date();
    reviewSession.sessionStats = {
      started: ordered.length,
      completed: 0,
      ratings: []
    };

    return true;
  } catch (error) {
    console.error('Error initializing review session:', error);
    return false;
  }
}

/**
 * Get current narrative in session
 * @returns {Object|null} Current narrative or null if session empty
 */
function getCurrentNarrative() {
  if (reviewSession.narratives.length === 0) return null;
  return reviewSession.narratives[reviewSession.currentIndex] || null;
}

/**
 * Check if there are more narratives in session
 * @returns {boolean}
 */
function hasNextNarrative() {
  return reviewSession.currentIndex < reviewSession.narratives.length - 1;
}

/**
 * Move to next narrative in session
 * @returns {Object|null} Next narrative or null if session complete
 */
function moveToNextNarrative() {
  if (hasNextNarrative()) {
    reviewSession.currentIndex++;
    reviewSession.showAnswer = false;
    return getCurrentNarrative();
  }
  return null;
}

/**
 * Toggle answer visibility
 * @returns {boolean} New visibility state
 */
function toggleAnswerVisibility() {
  reviewSession.showAnswer = !reviewSession.showAnswer;
  return reviewSession.showAnswer;
}

/**
 * Record review rating for current narrative
 * @param {number} quality - Quality rating (0-3)
 * @returns {Promise<Object>} Updated narrative
 */
async function recordCurrentReview(quality) {
  try {
    const narrative = getCurrentNarrative();
    if (!narrative) throw new Error('No narrative in session');

    // Record review
    const updated = await window.srs?.recordReview(narrative.id, quality);
    if (!updated) throw new Error('Failed to record review');

    // Update session stats
    reviewSession.sessionStats.completed++;
    reviewSession.sessionStats.ratings.push({
      narrative_id: narrative.id,
      quality,
      timestamp: new Date().toISOString()
    });

    return updated;
  } catch (error) {
    console.error('Error recording review:', error);
    throw error;
  }
}

/**
 * Get session progress
 * @returns {Object} Progress info {current, total, percentage}
 */
function getSessionProgress() {
  return {
    current: reviewSession.currentIndex + 1,
    total: reviewSession.narratives.length,
    percentage: (reviewSession.currentIndex + 1) / reviewSession.narratives.length * 100,
    remaining: reviewSession.narratives.length - reviewSession.currentIndex - 1
  };
}

/**
 * Get session summary (call when session complete)
 * @returns {Object} Session summary
 */
function getSessionSummary() {
  const elapsed = (new Date() - reviewSession.startTime) / 1000; // seconds
  const ratings = reviewSession.sessionStats.ratings;

  const summary = {
    total_reviews: reviewSession.sessionStats.completed,
    duration_seconds: Math.round(elapsed),
    duration_minutes: (elapsed / 60).toFixed(1),
    ratings_breakdown: {
      forgot: ratings.filter(r => r.quality === 0).length,
      hard: ratings.filter(r => r.quality === 1).length,
      good: ratings.filter(r => r.quality === 2).length,
      easy: ratings.filter(r => r.quality === 3).length
    },
    average_quality: ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.quality, 0) / ratings.length).toFixed(2)
      : 0,
    timestamps: {
      session_start: reviewSession.startTime.toISOString(),
      session_end: new Date().toISOString()
    }
  };

  return summary;
}

/**
 * End session and reset
 */
function endReviewSession() {
  reviewSession.narratives = [];
  reviewSession.currentIndex = 0;
  reviewSession.showAnswer = false;
  reviewSession.startTime = null;
  reviewSession.sessionStats = {
    started: 0,
    completed: 0,
    ratings: []
  };
}

/**
 * Get narratives due in N days
 * @param {number} days - Days ahead to check
 * @returns {Promise<Array>} Array of narratives
 */
async function getNarrativesUpcoming(days = 7) {
  return (await window.storage?.getNarrativesUpcoming(days)) || [];
}

/**
 * Render review session UI (main review screen)
 * Call this from main.js to display the review interface
 */
function renderReviewSession() {
  const container = document.getElementById('result-container');
  if (!container) return;

  // Clear container
  container.innerHTML = '';

  // Trigger animation
  container.classList.remove('view-enter');
  void container.offsetWidth;
  container.classList.add('view-enter');

  const narrative = getCurrentNarrative();
  if (!narrative) return;

  const progress = getSessionProgress();
  const questionsLines = narrative.recall_test.prompt_ja.split('\n');

  // Header Section
  const headerDiv = document.createElement('div');
  headerDiv.style.marginBottom = '2rem';

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;';

  const title = document.createElement('h2');
  title.style.margin = '0';
  title.textContent = '復習';

  const endBtn = document.createElement('button');
  endBtn.className = 'secondary';
  endBtn.style.padding = '0.5rem 1rem';
  endBtn.textContent = '終了';
  endBtn.onclick = () => window.endReviewClick();

  titleRow.append(title, endBtn);

  // Progress Bar
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = 'background: #0f172a; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;';

  const progressTextRow = document.createElement('div');
  progressTextRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;';

  const progressLabel = document.createElement('span');
  progressLabel.textContent = '進捗';

  const progressValue = document.createElement('span');
  progressValue.style.fontWeight = 'bold';
  progressValue.textContent = `${progress.current} / ${progress.total}`;

  progressTextRow.append(progressLabel, progressValue);

  const progressBarBg = document.createElement('div');
  progressBarBg.style.cssText = 'width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;';

  const progressBarFill = document.createElement('div');
  progressBarFill.style.cssText = `width: ${progress.percentage}%; height: 100%; background: var(--accent-color); transition: width 0.3s;`;

  progressBarBg.appendChild(progressBarFill);
  progressContainer.append(progressTextRow, progressBarBg);

  headerDiv.append(titleRow, progressContainer);
  container.appendChild(headerDiv);

  // Flip Card Container
  const flipCardContainer = document.createElement('div');
  flipCardContainer.id = 'flip-card-container';
  flipCardContainer.style.cssText = 'perspective: 1000px; margin-bottom: 2rem;';

  const card = document.createElement('div');
  card.style.cssText = `
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid var(--accent-color);
    border-radius: 1rem;
    padding: 2rem;
    min-height: 250px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.3s;
    text-align: center;
  `;
  card.onclick = () => window.toggleAnswer();

  if (!reviewSession.showAnswer) {
    // Front: Japanese prompt
    const frontContent = document.createElement('div');
    frontContent.style.cssText = 'font-size: 1.1rem; color: var(--text-secondary); width: 100%;';

    const label = document.createElement('p');
    label.style.cssText = 'margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-tertiary);';
    label.textContent = '【問題】';
    frontContent.appendChild(label);

    questionsLines.forEach(line => {
      if (line.trim()) {
        const p = document.createElement('p');
        p.style.cssText = 'margin-bottom: 0.5rem; line-height: 1.6;';
        p.textContent = line;
        frontContent.appendChild(p);
      }
    });

    const hint = document.createElement('p');
    hint.style.cssText = 'margin-top: 1.5rem; font-size: 0.8rem; color: var(--text-tertiary); cursor: pointer;';
    hint.textContent = 'クリックで答えを表示';
    frontContent.appendChild(hint);

    card.appendChild(frontContent);
  } else {
    // Back: English narrative + key phrases
    const backContent = document.createElement('div');
    backContent.style.cssText = 'text-align: left; width: 100%;';

    const label = document.createElement('p');
    label.style.cssText = 'margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-tertiary);';
    label.textContent = '【正解】';
    backContent.appendChild(label);

    const contentBox = document.createElement('div');
    contentBox.style.cssText = 'background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem;';

    const narrativeText = document.createElement('div');
    narrativeText.style.cssText = 'font-size: 1rem; line-height: 1.8; margin-bottom: 1.5rem;';

    const sentences = narrative.narrative_en.split(/(?<=[.!?])\s+/);
    sentences.forEach((s, index) => {
      const item = document.createElement('div');
      item.className = 'sentence-item';
      item.style.marginBottom = '0.5rem';

      const playBtn = document.createElement('button');
      playBtn.className = 'play-sentence-btn';
      playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';

      const span = document.createElement('span');
      span.className = 'sentence-text';
      span.dataset.index = index;
      span.textContent = s;

      const playHandler = (e) => {
        if (e) e.stopPropagation();
        window.speak(s, index, narrative.narrative_en);
      };

      playBtn.onclick = playHandler;
      span.onclick = playHandler;

      item.append(playBtn, span);
      narrativeText.appendChild(item);
    });
    contentBox.appendChild(narrativeText);

    const keyPhrasesBox = document.createElement('div');
    keyPhrasesBox.style.cssText = 'border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;';

    const kpLabel = document.createElement('p');
    kpLabel.style.cssText = 'font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: bold;';
    kpLabel.textContent = 'キーフレーズ:';
    keyPhrasesBox.appendChild(kpLabel);

    narrative.key_phrases.slice(0, 2).forEach(p => {
      const div = document.createElement('div');
      div.style.cssText = 'font-size: 0.85rem; margin-bottom: 0.5rem; color: var(--accent-color);';
      div.textContent = p.phrase_en;
      keyPhrasesBox.appendChild(div);
    });

    contentBox.appendChild(keyPhrasesBox);
    backContent.appendChild(contentBox);

    const backHint = document.createElement('p');
    backHint.style.cssText = 'font-size: 0.8rem; color: var(--text-tertiary); cursor: pointer;';
    backHint.textContent = 'クリックで問題に戻る';
    backContent.appendChild(backHint);

    card.appendChild(backContent);
  }

  flipCardContainer.appendChild(card);
  container.appendChild(flipCardContainer);

  // Rating Buttons
  const ratingDiv = document.createElement('div');
  ratingDiv.style.marginBottom = '2rem';

  const ratingLabel = document.createElement('p');
  ratingLabel.style.cssText = 'text-align: center; margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-secondary);';
  ratingLabel.textContent = 'どうでしたか？';
  ratingDiv.appendChild(ratingLabel);

  const buttonsGrid = document.createElement('div');
  buttonsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;';

  const ratings = [
    { q: 0, icon: '❌', label: '忘れた', bg: '#7f1d1d', border: '#dc2626' },
    { q: 1, icon: '😰', label: '難しい', bg: '#713f12', border: '#ea580c' },
    { q: 2, icon: '👍', label: '良好', bg: '#1e3a8a', border: '#3b82f6' },
    { q: 3, icon: '🎉', label: '簡単', bg: '#15803d', border: '#22c55e' }
  ];

  ratings.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'review-quality';
    btn.dataset.quality = r.q;
    btn.style.cssText = `background: ${r.bg}; border: 2px solid ${r.border};`;
    btn.onclick = () => window.rateReview(r.q);

    const iconDiv = document.createElement('div');
    iconDiv.style.fontSize = '1.5rem';
    iconDiv.textContent = r.icon;

    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = 'font-size: 0.75rem; margin-top: 0.5rem;';
    labelDiv.textContent = r.label;

    btn.append(iconDiv, labelDiv);
    buttonsGrid.appendChild(btn);
  });

  ratingDiv.appendChild(buttonsGrid);
  container.appendChild(ratingDiv);

  // Bottom Actions
  const bottomActions = document.createElement('div');
  bottomActions.style.cssText = 'display: flex; gap: 1rem;';

  const speakBtn = document.createElement('button');
  speakBtn.className = 'secondary';
  speakBtn.style.flex = '1';
  speakBtn.textContent = '📢 再生';
  speakBtn.onclick = () => window.speak(null, null, narrative.narrative_en);

  const detailBtn = document.createElement('button');
  detailBtn.className = 'secondary';
  detailBtn.style.flex = '1';
  detailBtn.textContent = '詳細';
  detailBtn.onclick = () => window.showNarrativeDetails();

  bottomActions.append(speakBtn, detailBtn);
  container.appendChild(bottomActions);
}

/**
 * Render review session complete screen
 */
async function renderSessionComplete() {
  const container = document.getElementById('result-container');
  if (!container) return;

  // Clear container
  container.innerHTML = '';

  // Trigger animation
  container.classList.remove('view-enter');
  void container.offsetWidth;
  container.classList.add('view-enter');

  const summary = getSessionSummary();
  const stats = (await window.storage?.getSRSStats()) || {};

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'text-align: center; padding: 2rem 0;';

  const h2 = document.createElement('h2');
  h2.style.marginBottom = '1.5rem';
  h2.textContent = '💪 今日の復習完了！';
  wrapper.appendChild(h2);

  const statsBox = document.createElement('div');
  statsBox.style.cssText = 'background: #0f172a; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem;';

  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2rem;';

  const timeStat = document.createElement('div');
  timeStat.innerHTML = `
    <div style="font-size: 2rem; color: var(--accent-color); margin-bottom: 0.5rem;">⏱️</div>
    <div style="font-size: 0.9rem; color: var(--text-secondary);">所要時間</div>
    <div style="font-size: 1.3rem; margin-top: 0.5rem;">${summary.duration_minutes}分</div>
  `;
  // Using innerHTML here for static structure is okay, but let's be safe and consistent with textContent for values
  // Refactoring innerHTML above to be safe:
  timeStat.innerHTML = '';
  const tsIcon = document.createElement('div'); tsIcon.style.cssText = 'font-size: 2rem; color: var(--accent-color); margin-bottom: 0.5rem;'; tsIcon.textContent = '⏱️';
  const tsLabel = document.createElement('div'); tsLabel.style.cssText = 'font-size: 0.9rem; color: var(--text-secondary);'; tsLabel.textContent = '所要時間';
  const tsValue = document.createElement('div'); tsValue.style.cssText = 'font-size: 1.3rem; margin-top: 0.5rem;'; tsValue.textContent = `${summary.duration_minutes}分`;
  timeStat.append(tsIcon, tsLabel, tsValue);

  const countStat = document.createElement('div');
  const csIcon = document.createElement('div'); csIcon.style.cssText = 'font-size: 2rem; color: var(--accent-color); margin-bottom: 0.5rem;'; csIcon.textContent = '📊';
  const csLabel = document.createElement('div'); csLabel.style.cssText = 'font-size: 0.9rem; color: var(--text-secondary);'; csLabel.textContent = '復習数';
  const csValue = document.createElement('div'); csValue.style.cssText = 'font-size: 1.3rem; margin-top: 0.5rem;'; csValue.textContent = summary.total_reviews;
  countStat.append(csIcon, csLabel, csValue);

  grid.append(timeStat, countStat);
  statsBox.appendChild(grid);

  const breakdownDiv = document.createElement('div');
  breakdownDiv.style.cssText = 'border-top: 1px solid var(--border-color); padding-top: 1.5rem;';

  const bdLabel = document.createElement('p');
  bdLabel.style.cssText = 'margin-bottom: 1rem; color: var(--text-secondary);';
  bdLabel.textContent = '成績内訳';
  breakdownDiv.appendChild(bdLabel);

  const bdGrid = document.createElement('div');
  bdGrid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;';

  const bdItems = [
    { icon: '❌', val: summary.ratings_breakdown.forgot },
    { icon: '😰', val: summary.ratings_breakdown.hard },
    { icon: '👍', val: summary.ratings_breakdown.good },
    { icon: '🎉', val: summary.ratings_breakdown.easy }
  ];

  bdItems.forEach(item => {
    const div = document.createElement('div');
    const icon = document.createElement('div'); icon.style.fontSize = '1.8rem'; icon.textContent = item.icon;
    const val = document.createElement('div'); val.style.cssText = 'font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;'; val.textContent = item.val;
    div.append(icon, val);
    bdGrid.appendChild(div);
  });

  breakdownDiv.appendChild(bdGrid);
  statsBox.appendChild(breakdownDiv);
  wrapper.appendChild(statsBox);

  const streakBox = document.createElement('div');
  streakBox.style.cssText = 'background: rgba(34, 197, 94, 0.1); padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem; border: 1px solid rgba(34, 197, 94, 0.3);';
  const streakP = document.createElement('p');
  streakP.style.cssText = 'color: #22c55e; margin: 0;';

  // "🔥 連続復習 <strong>${stats.current_streak || 0}</strong> 日目"
  const fireText = document.createTextNode('🔥 連続復習 ');
  const strong = document.createElement('strong');
  strong.textContent = stats.current_streak || 0;
  const dayText = document.createTextNode(' 日目');

  streakP.append(fireText, strong, dayText);
  streakBox.appendChild(streakP);
  wrapper.appendChild(streakBox);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 1rem;';

  const restartBtn = document.createElement('button');
  restartBtn.className = 'primary';
  restartBtn.style.flex = '1';
  restartBtn.textContent = '復習を再開';
  restartBtn.onclick = () => window.goToReviewDashboard();

  const newBtn = document.createElement('button');
  newBtn.className = 'secondary';
  newBtn.style.flex = '1';
  newBtn.textContent = '新規作成';
  newBtn.onclick = () => window.goToGenerate();

  btnRow.append(restartBtn, newBtn);
  wrapper.appendChild(btnRow);

  container.appendChild(wrapper);
}

/**
 * Global functions for UI integration
 */

window.rateReview = async function (quality) {
  window.showLoading('Updating...');
  try {
    await window.recordCurrentReview(quality);

    if (window.hasNextNarrative()) {
      window.moveToNextNarrative();
      window.renderReviewSession();
    } else {
      await window.renderSessionComplete();
    }
  } catch (error) {
    console.error('Error rating review:', error);
    alert('エラーが発生しました: ' + error.message);
  } finally {
    window.hideLoading();
  }
};

window.toggleAnswer = function () {
  const visible = window.toggleAnswerVisibility();
  window.renderReviewSession();
};

window.endReviewClick = function () {
  if (confirm('復習を終了しますか？')) {
    window.endReviewSession();
    window.goToReviewDashboard();
  }
};

window.showNarrativeDetails = function () {
  const narrative = window.getCurrentNarrative();
  if (!narrative) return;

  const details = `
    【英文】
    ${narrative.narrative_en}

    【キーフレーズ】
    ${narrative.key_phrases.map(p => `${p.phrase_en} - ${p.meaning_ja}`).join('\n')}

    【復習テスト】
    ${narrative.recall_test.prompt_ja}
    `;

  const textarea = document.createElement('textarea');
  textarea.value = details;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  alert('詳細をコピーしました！');
};

// Attach functions to window for global access
window.initReviewSession = initReviewSession;
window.getCurrentNarrative = getCurrentNarrative;
window.hasNextNarrative = hasNextNarrative;
window.moveToNextNarrative = moveToNextNarrative;
window.toggleAnswerVisibility = toggleAnswerVisibility;
window.recordCurrentReview = recordCurrentReview;
window.getSessionProgress = getSessionProgress;
window.getSessionSummary = getSessionSummary;
window.endReviewSession = endReviewSession;
window.getNarrativesUpcoming = getNarrativesUpcoming;
window.renderReviewSession = renderReviewSession;
window.renderSessionComplete = renderSessionComplete;
