/**
 * Review Session Module - Manages review sessions and user interactions
 * Handles loading narratives, tracking progress, and recording ratings
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
 * @returns {boolean} Success status
 */
function initReviewSession(options = {}) {
  try {
    const { order = 'oldest_first', limit = null } = options;

    // Get due narratives
    const dueNarratives = window.storage?.getNarrativesDueToday() || [];

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
 * @returns {Object} Updated narrative
 */
function recordCurrentReview(quality) {
  try {
    const narrative = getCurrentNarrative();
    if (!narrative) throw new Error('No narrative in session');

    // Record review
    const updated = window.srs?.recordReview(narrative.id, quality);
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
 * @returns {Array} Array of narratives
 */
function getNarrativesUpcoming(days = 7) {
  return window.storage?.getNarrativesUpcoming(days) || [];
}

/**
 * Render review session UI (main review screen)
 * Call this from main.js to display the review interface
 */
function renderReviewSession() {
  const container = document.getElementById('result-container');
  if (!container) return;

  const narrative = getCurrentNarrative();
  if (!narrative) return;

  const progress = getSessionProgress();
  const questionsLines = narrative.recall_test.prompt_ja.split('\n');

  let html = `
    <div style="margin-bottom: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2 style="margin: 0;">復習</h2>
        <button class="secondary" onclick="window.endReviewClick()" style="padding: 0.5rem 1rem;">終了</button>
      </div>

      <div style="background: #0f172a; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span>進捗</span>
          <span style="font-weight: bold;">${progress.current} / ${progress.total}</span>
        </div>
        <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
          <div style="width: ${progress.percentage}%; height: 100%; background: var(--accent-color); transition: width 0.3s;"></div>
        </div>
      </div>
    </div>

    <div id="flip-card-container" style="perspective: 1000px; margin-bottom: 2rem;">
      <div style="
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
      " onclick="window.toggleAnswer()">
  `;

  if (!reviewSession.showAnswer) {
    // Front: Japanese prompt
    html += `
      <div style="font-size: 1.1rem; color: var(--text-secondary);">
        <p style="margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-tertiary);">【問題】</p>
    `;
    questionsLines.forEach((line, i) => {
      if (line.trim()) {
        html += `<p style="margin-bottom: 0.5rem; line-height: 1.6;">${line}</p>`;
      }
    });
    html += `
        <p style="margin-top: 1.5rem; font-size: 0.8rem; color: var(--text-tertiary); cursor: pointer;">クリックで答えを表示</p>
      </div>
    `;
  } else {
    // Back: English narrative + key phrases
    html += `
      <div style="text-align: left; width: 100%;">
        <p style="margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-tertiary);">【正解】</p>
        <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
          <div style="font-size: 1rem; line-height: 1.8; margin-bottom: 1.5rem;">
            ${narrative.narrative_en.split(/(?<=[.!?])\s+/).map(s =>
              `<span style="cursor: pointer; border-bottom: 1px dotted var(--accent-color);" onclick="event.stopPropagation(); window.speak('${s.replace(/'/g, "\\'")}')">${s}</span> `
            ).join('')}
          </div>

          <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;"><strong>キーフレーズ:</strong></p>
            ${narrative.key_phrases.slice(0, 2).map(p =>
              `<div style="font-size: 0.85rem; margin-bottom: 0.5rem; color: var(--accent-color);">${p.phrase_en}</div>`
            ).join('')}
          </div>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-tertiary); cursor: pointer;">クリックで問題に戻る</p>
      </div>
    `;
  }

  html += `
      </div>
    </div>

    <div style="margin-bottom: 2rem;">
      <p style="text-align: center; margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-secondary);">どうでしたか？</p>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;">
        <button class="review-quality" data-quality="0" onclick="window.rateReview(0)" style="background: #7f1d1d; border: 2px solid #dc2626;">
          <div style="font-size: 1.5rem;">❌</div>
          <div style="font-size: 0.75rem; margin-top: 0.5rem;">忘れた</div>
        </button>
        <button class="review-quality" data-quality="1" onclick="window.rateReview(1)" style="background: #713f12; border: 2px solid #ea580c;">
          <div style="font-size: 1.5rem;">😰</div>
          <div style="font-size: 0.75rem; margin-top: 0.5rem;">難しい</div>
        </button>
        <button class="review-quality" data-quality="2" onclick="window.rateReview(2)" style="background: #1e3a8a; border: 2px solid #3b82f6;">
          <div style="font-size: 1.5rem;">👍</div>
          <div style="font-size: 0.75rem; margin-top: 0.5rem;">良好</div>
        </button>
        <button class="review-quality" data-quality="3" onclick="window.rateReview(3)" style="background: #15803d; border: 2px solid #22c55e;">
          <div style="font-size: 1.5rem;">🎉</div>
          <div style="font-size: 0.75rem; margin-top: 0.5rem;">簡単</div>
        </button>
      </div>
    </div>

    <div style="display: flex; gap: 1rem;">
      <button class="secondary" onclick="window.speak()" style="flex: 1;">📢 再生</button>
      <button class="secondary" onclick="window.showNarrativeDetails()" style="flex: 1;">詳細</button>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Render review session complete screen
 */
function renderSessionComplete() {
  const container = document.getElementById('result-container');
  if (!container) return;

  const summary = getSessionSummary();
  const stats = window.storage?.getSRSStats() || {};

  let html = `
    <div style="text-align: center; padding: 2rem 0;">
      <h2 style="margin-bottom: 1.5rem;">💪 今日の復習完了！</h2>

      <div style="background: #0f172a; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
          <div>
            <div style="font-size: 2rem; color: var(--accent-color); margin-bottom: 0.5rem;">⏱️</div>
            <div style="font-size: 0.9rem; color: var(--text-secondary);">所要時間</div>
            <div style="font-size: 1.3rem; margin-top: 0.5rem;">${summary.duration_minutes}分</div>
          </div>
          <div>
            <div style="font-size: 2rem; color: var(--accent-color); margin-bottom: 0.5rem;">📊</div>
            <div style="font-size: 0.9rem; color: var(--text-secondary);">復習数</div>
            <div style="font-size: 1.3rem; margin-top: 0.5rem;">${summary.total_reviews}</div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">成績内訳</p>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;">
            <div>
              <div style="font-size: 1.8rem;">❌</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">${summary.ratings_breakdown.forgot}</div>
            </div>
            <div>
              <div style="font-size: 1.8rem;">😰</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">${summary.ratings_breakdown.hard}</div>
            </div>
            <div>
              <div style="font-size: 1.8rem;">👍</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">${summary.ratings_breakdown.good}</div>
            </div>
            <div>
              <div style="font-size: 1.8rem;">🎉</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">${summary.ratings_breakdown.easy}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="background: rgba(34, 197, 94, 0.1); padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem; border: 1px solid rgba(34, 197, 94, 0.3);">
        <p style="color: #22c55e; margin: 0;">
          🔥 連続復習 <strong>${stats.current_streak || 0}</strong> 日目
        </p>
      </div>

      <div style="display: flex; gap: 1rem;">
        <button class="primary" onclick="window.goToReviewDashboard()" style="flex: 1;">復習を再開</button>
        <button class="secondary" onclick="window.goToGenerate()" style="flex: 1;">新規作成</button>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Global functions for UI integration
 */

window.rateReview = function(quality) {
  try {
    window.recordCurrentReview(quality);

    if (window.hasNextNarrative()) {
      window.moveToNextNarrative();
      window.renderReviewSession();
    } else {
      window.renderSessionComplete();
    }
  } catch (error) {
    console.error('Error rating review:', error);
    alert('エラーが発生しました: ' + error.message);
  }
};

window.toggleAnswer = function() {
  const visible = window.toggleAnswerVisibility();
  window.renderReviewSession();
};

window.endReviewClick = function() {
  if (confirm('復習を終了しますか？')) {
    window.endReviewSession();
    window.goToReviewDashboard();
  }
};

window.showNarrativeDetails = function() {
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
