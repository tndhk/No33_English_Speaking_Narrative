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
    const { order = 'oldest_first', limit = null, all = false } = options;

    let targetNarratives = [];
    if (all) {
      targetNarratives = (await window.storage?.getAllNarratives()) || [];
    } else {
      targetNarratives = (await window.storage?.getNarrativesDueToday()) || [];
    }

    if (targetNarratives.length === 0) {
      return false; // No narratives to review
    }

    // Apply order
    let ordered = targetNarratives;
    if (order === 'oldest_first') {
      ordered = window.srs?.getOptimalReviewOrder(targetNarratives) || targetNarratives;
    } else if (order === 'random') {
      ordered = window.srs?.getRandomReviewOrder(targetNarratives) || targetNarratives;
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

  // Reset container style
  const container = document.getElementById('result-container');
  if (container) container.style.paddingBottom = '';
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

  // Header Section (Simplified)
  const headerDiv = document.createElement('div');
  headerDiv.style.marginBottom = '1.5rem';

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

  const title = document.createElement('h2');
  title.style.margin = '0';
  title.style.fontSize = '1.25rem';
  title.textContent = 'Day ' + (reviewSession.currentIndex + 1);

  titleRow.append(title);
  headerDiv.append(titleRow);
  container.appendChild(headerDiv);

  // Add padding to container to prevent content from being hidden behind sticky footer
  container.style.paddingBottom = '110px';

  // Journal Entry Card (Combined View)
  const card = document.createElement('div');
  card.style.cssText = `
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid var(--border-color);
    border-radius: 1rem;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  `;

  // 1. Context (Top) - Prioritize User Answers
  const jpContext = document.createElement('div');
  jpContext.style.cssText = 'margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px dashed rgba(255,255,255,0.1);';

  const jpLabel = document.createElement('div');
  jpLabel.style.cssText = 'font-size: 0.85rem; color: var(--accent-color); margin-bottom: 0.5rem; font-weight: bold; letter-spacing: 0.05em;';
  jpLabel.textContent = '📅 CONTEXT';
  jpContext.appendChild(jpLabel);

  let contextText = '';
  if (narrative.user_answers && narrative.user_answers.length > 0 && narrative.user_answers.some(a => a.trim())) {
    // Join user provided answers
    contextText = narrative.user_answers.filter(a => a && a.trim()).join('\n');
  } else {
    // Fallback to recall prompt, cleaning up instructional suffix
    contextText = narrative.recall_test.prompt_ja
      .replace(/について教えてください[。？]?/g, '')
      .replace(/書いてみましょう[。？]?/g, '')
      .replace(/書いてみよう[。？]?/g, '')
      .replace(/教えて[。？]?/g, '')
      .trim();
  }

  const contextLines = contextText.split('\n');
  contextLines.forEach(line => {
    if (line.trim()) {
      const p = document.createElement('p');
      p.style.cssText = 'margin-bottom: 0.5rem; line-height: 1.6; color: var(--text-secondary); font-size: 0.95rem;';
      p.textContent = line;
      jpContext.appendChild(p);
    }
  });
  card.appendChild(jpContext);

  // 2. English Narrative (Middle/Main)
  const enContent = document.createElement('div');
  enContent.style.cssText = 'margin-bottom: 2rem;';

  const narrativeText = document.createElement('div');
  narrativeText.className = 'narrative-text-container';
  narrativeText.style.cssText = 'font-size: 1.15rem; line-height: 1.8; font-family: "Outfit", sans-serif;';

  const sentences = narrative.narrative_en.split(/(?<=[.!?])\s+/);
  sentences.forEach((s, index) => {
    const span = document.createElement('span');
    span.className = 'sentence-text';
    span.dataset.index = index;
    span.textContent = s + ' '; // Add space for natural text flow

    // Tap to play
    span.onclick = (e) => {
      e.stopPropagation();
      window.speak(s, index, narrative.narrative_en);
    };

    narrativeText.appendChild(span);
  });
  enContent.appendChild(narrativeText);
  card.appendChild(enContent);

  // 3. Key Phrases (Bottom)
  if (narrative.key_phrases && narrative.key_phrases.length > 0) {
    const kpDetails = document.createElement('details');
    kpDetails.className = 'key-phrases-details';
    kpDetails.style.cssText = 'background: rgba(255,255,255,0.03); border-radius: 0.75rem; overflow: hidden;';

    const kpSummary = document.createElement('summary');
    kpSummary.style.cssText = 'padding: 1rem; cursor: pointer; font-size: 0.8rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; outline: none; list-style: none;';
    kpSummary.textContent = '▶ Key Phrases'; // Unicode arrow for custom styling if needed
    kpDetails.appendChild(kpSummary);

    const kpContent = document.createElement('div');
    kpContent.style.cssText = 'padding: 0 1rem 1rem 1rem;';

    narrative.key_phrases.slice(0, 3).forEach(p => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; flex-direction: column; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05);';
      if (p === narrative.key_phrases[narrative.key_phrases.length - 1]) row.style.borderBottom = 'none';

      const en = document.createElement('div');
      en.style.cssText = 'color: var(--accent-color); font-weight: 500; font-size: 0.95rem; margin-bottom: 0.2rem;';
      en.textContent = p.phrase_en;

      const ja = document.createElement('div');
      ja.style.cssText = 'color: var(--text-secondary); font-size: 0.85rem;';
      ja.textContent = p.meaning_ja;

      row.append(en, ja);
      kpContent.appendChild(row);
    });
    kpDetails.appendChild(kpContent);
    card.appendChild(kpDetails);
  }

  container.appendChild(card);

  // Rating Buttons (Sticky Footer) - Single Action
  const ratingDiv = document.createElement('div');
  ratingDiv.className = 'review-footer';

  const ratingInner = document.createElement('div');
  ratingInner.style.cssText = 'max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem;';

  const finishBtn = document.createElement('button');
  finishBtn.className = 'primary';
  finishBtn.style.cssText = 'width: 100%; padding: 1rem; font-size: 1.1rem; font-weight: bold; border-radius: 0.75rem; background: var(--accent-color); color: white; border: none; box-shadow: 0 4px 10px rgba(56, 189, 248, 0.3);';
  finishBtn.textContent = '読み終わった';

  finishBtn.onclick = () => window.rateReview(2); // Record as "Good" (standard)

  ratingInner.appendChild(finishBtn);
  ratingDiv.appendChild(ratingInner);
  container.appendChild(ratingDiv);
}

/**
 * Render review session complete screen
 */
async function renderSessionComplete() {
  const container = document.getElementById('result-container');
  if (!container) return;

  // Clear container
  container.innerHTML = '';
  container.style.paddingBottom = '';

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
  h2.textContent = '💪 今日の振り返り完了！';
  wrapper.appendChild(h2);

  wrapper.appendChild(h2);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 1rem;';

  const restartBtn = document.createElement('button');
  restartBtn.className = 'primary';
  restartBtn.style.flex = '1';
  restartBtn.textContent = '振り返りを続ける';
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
  if (confirm('振り返りを終了しますか？')) {
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

    【この日記のポイント】
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
