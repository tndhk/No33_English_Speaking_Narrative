/**
 * SRS Module - Spaced Repetition System algorithm
 * Implements SM-2 simplified algorithm with fixed intervals
 * Based on forgetting curve concept for optimal learning
 */

// Make SRS available globally via window.srs namespace
window.srs = window.srs || {};

// SRS intervals in days: Day 0 / 1 / 3 / 7 / 14 / 30
const SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

// Quality ratings for user feedback
const REVIEW_QUALITY = {
  FORGOT: 0,      // Incorrect - reset to interval 0
  HARD: 1,        // Difficult to recall - stay at current interval
  GOOD: 2,        // Correctly recalled - advance one interval
  EASY: 3         // Easily recalled - advance two intervals
};

const REVIEW_QUALITY_LABELS = {
  0: '忘れた',      // Forgot
  1: '難しい',      // Hard
  2: '良好',        // Good
  3: '簡単'         // Easy
};

/**
 * Calculate next review date based on current interval and quality
 * @param {number} currentIntervalIndex - Current position in SRS_INTERVALS array
 * @param {number} quality - Quality rating (0-3)
 * @returns {Object} {nextIntervalIndex, nextReviewDate, status}
 */
function calculateNextReview(currentIntervalIndex, quality) {
  let nextIntervalIndex = currentIntervalIndex;
  let status = 'learning';

  // Determine next interval based on quality
  switch (quality) {
    case REVIEW_QUALITY.FORGOT:
      // Reset to beginning
      nextIntervalIndex = 0;
      break;
    case REVIEW_QUALITY.HARD:
      // Stay at current interval (retry)
      nextIntervalIndex = currentIntervalIndex;
      break;
    case REVIEW_QUALITY.GOOD:
      // Advance one level
      nextIntervalIndex = Math.min(currentIntervalIndex + 1, SRS_INTERVALS.length - 1);
      break;
    case REVIEW_QUALITY.EASY:
      // Advance two levels
      nextIntervalIndex = Math.min(currentIntervalIndex + 2, SRS_INTERVALS.length - 1);
      break;
  }

  // Determine if mastered (reached final interval)
  if (nextIntervalIndex === SRS_INTERVALS.length - 1 && quality >= REVIEW_QUALITY.GOOD) {
    status = 'mastered';
  }

  // Calculate next review date
  const nextDate = new Date();
  const dayOffset = SRS_INTERVALS[nextIntervalIndex];
  nextDate.setDate(nextDate.getDate() + dayOffset);

  return {
    nextIntervalIndex,
    nextReviewDate: formatDate(nextDate),
    status,
    daysUntilReview: dayOffset
  };
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Record a review and update narrative SRS data
 * @param {string} narrativeId - ID of narrative being reviewed
 * @param {number} quality - Quality rating (0-3)
 * @returns {Promise<Object>} Updated narrative object
 */
async function recordReview(narrativeId, quality) {
  if (quality < 0 || quality > 3) {
    throw new Error('Quality must be between 0 and 3');
  }

  const narrative = await getNarrativeById(narrativeId);
  if (!narrative) throw new Error('Narrative not found');

  const { nextIntervalIndex, nextReviewDate, status } = calculateNextReview(
    narrative.srs.interval_index,
    quality
  );

  // Update quality history (keep last 10)
  const qualityHistory = [...narrative.srs.quality_history, quality].slice(-10);

  // Update SRS data
  const updatedSRS = {
    interval_index: nextIntervalIndex,
    next_review_date: nextReviewDate,
    last_reviewed: new Date().toISOString(),
    review_count: (narrative.srs.review_count || 0) + 1,
    quality_history: qualityHistory,
    status: status,
    ease_factor: narrative.srs.ease_factor // Preserved for future SM-2 enhancement
  };

  const updated = await updateNarrativeSRS(narrativeId, updatedSRS);

  // Update stats
  await updateSRSStats();

  return updated;
}

/**
 * Get review statistics for narratives
 * @param {Array} narratives - Array of narrative objects (optional, uses all if not provided)
 * @returns {Object} Statistics object
 */
function getReviewStatistics(narratives = []) {
  // Assuming narratives are passed in. If not, this function needs to be async to fetch them.
  // For compatibility with synchronous logic, we expect narratives to be passed.
  // If not passed, we return empty stats (handling async fetch inside render loop is better).

  const allNarratives = narratives;

  const stats = {
    total: allNarratives.length,
    new: 0,
    learning: 0,
    mastered: 0,
    due_today: 0,
    due_tomorrow: 0,
    due_this_week: 0,
    accuracy_rate: 0,
    average_ease: 0
  };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  const todayStr = formatDate(today);
  const tomorrowStr = formatDate(tomorrow);
  const weekLaterStr = formatDate(weekLater);

  let totalEase = 0;
  let totalQuality = 0;
  let totalQualityCount = 0;

  allNarratives.forEach(n => {
    if (!n.srs) return;

    // Count by status
    if (n.srs.status === 'new') stats.new++;
    if (n.srs.status === 'learning') stats.learning++;
    if (n.srs.status === 'mastered') stats.mastered++;

    // Count due dates
    if (n.srs.next_review_date <= todayStr && n.srs.status !== 'mastered') {
      stats.due_today++;
    }
    if (n.srs.next_review_date === tomorrowStr) {
      stats.due_tomorrow++;
    }
    if (n.srs.next_review_date <= weekLaterStr && n.srs.status !== 'mastered') {
      stats.due_this_week++;
    }

    // Calculate accuracy
    if (n.srs.quality_history && n.srs.quality_history.length > 0) {
      const qualitySum = n.srs.quality_history.reduce((a, b) => a + b, 0);
      totalQuality += qualitySum;
      totalQualityCount += n.srs.quality_history.length;
    }

    totalEase += n.srs.ease_factor || 2.5;
  });

  if (totalQualityCount > 0) {
    // Accuracy based on quality ratings: 2-3 is good (66-100% accuracy)
    stats.accuracy_rate = ((totalQuality / (totalQualityCount * 3)) * 100).toFixed(1);
  }

  if (allNarratives.length > 0) {
    stats.average_ease = (totalEase / allNarratives.length).toFixed(2);
  }

  return stats;
}

/**
 * Get narrative by ID (Async wrapper)
 */
async function getNarrativeById(id) {
  return await window.storage?.getNarrativeById(id) || null;
}

/**
 * Update narrative SRS (Async wrapper)
 */
async function updateNarrativeSRS(id, srsData) {
  return await window.storage?.updateNarrativeSRS(id, srsData) || null;
}

/**
 * Get all narratives (Async wrapper)
 */
async function getAllNarratives() {
  return await window.storage?.getAllNarratives() || [];
}

/**
 * Update SRS stats (Async wrapper)
 */
async function updateSRSStats() {
  return await window.storage?.updateSRSStats();
}

/**
 * Reset a narrative to "new" status (restarts SRS)
 * @param {string} narrativeId - ID of narrative
 * @returns {Promise<Object>} Updated narrative
 */
async function resetNarrativeToNew(narrativeId) {
  return await updateNarrativeSRS(narrativeId, {
    interval_index: 0,
    next_review_date: formatDate(new Date()),
    last_reviewed: null,
    review_count: 0,
    quality_history: [],
    status: 'new'
  });
}

/**
 * Suspend a narrative from review
 * @param {string} narrativeId - ID of narrative
 * @returns {Promise<Object>} Updated narrative
 */
async function suspendNarrative(narrativeId) {
  return await updateNarrativeSRS(narrativeId, {
    status: 'suspended'
  });
}

/**
 * Resume a suspended narrative
 * @param {string} narrativeId - ID of narrative
 * @returns {Promise<Object>} Updated narrative
 */
async function resumeNarrative(narrativeId) {
  const narrative = await getNarrativeById(narrativeId);
  if (!narrative) throw new Error('Narrative not found');

  return await updateNarrativeSRS(narrativeId, {
    status: narrative.srs.review_count === 0 ? 'new' : 'learning'
  });
}

/**
 * Get optimal review order (oldest first)
 * @param {Array} narratives - Narratives to sort
 * @returns {Array} Sorted narratives
 */
function getOptimalReviewOrder(narratives) {
  return [...narratives].sort((a, b) => {
    // Prioritize narratives with lower interval index (earlier in learning)
    if (a.srs.interval_index !== b.srs.interval_index) {
      return a.srs.interval_index - b.srs.interval_index;
    }
    // Then by oldest review date
    return new Date(a.srs.last_reviewed || a.created_at) - new Date(b.srs.last_reviewed || b.created_at);
  });
}

/**
 * Get random review order (randomize due narratives)
 * @param {Array} narratives - Narratives to shuffle
 * @returns {Array} Shuffled narratives
 */
function getRandomReviewOrder(narratives) {
  const shuffled = [...narratives];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get interval name for display
 * @param {number} intervalIndex - Index in SRS_INTERVALS
 * @returns {string} Human-readable interval name
 */
function getIntervalName(intervalIndex) {
  const names = [
    'Today (新規)',
    'Tomorrow (1日後)',
    '3 days later',
    'Week later',
    '2 weeks later',
    'Month later'
  ];
  return names[intervalIndex] || 'Unknown';
}

/**
 * Calculate days until next review
 * @param {string} nextReviewDate - YYYY-MM-DD format
 * @returns {number} Days until review (negative = overdue)
 */
function daysUntilReview(nextReviewDate) {
  const today = new Date();
  const reviewDate = new Date(nextReviewDate);
  const diffTime = reviewDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if narrative is overdue
 * @param {string} nextReviewDate - YYYY-MM-DD format
 * @returns {boolean}
 */
function isOverdue(nextReviewDate) {
  return daysUntilReview(nextReviewDate) < 0;
}

/**
 * Get review count by quality level
 * @param {Object} narrative - Narrative object (MODIFIED to accept object, not ID)
 * @returns {Object} Count by quality
 */
function getQualityBreakdown(narrative) {
  if (!narrative || !narrative.srs.quality_history) {
    return { forgot: 0, hard: 0, good: 0, easy: 0 };
  }

  const history = narrative.srs.quality_history;
  return {
    forgot: history.filter(q => q === REVIEW_QUALITY.FORGOT).length,
    hard: history.filter(q => q === REVIEW_QUALITY.HARD).length,
    good: history.filter(q => q === REVIEW_QUALITY.GOOD).length,
    easy: history.filter(q => q === REVIEW_QUALITY.EASY).length
  };
}

/**
 * Estimate mastery date for a narrative
 * Based on current interval index and quality trend
 * @param {Object} narrative - Narrative object (MODIFIED to accept object, not ID)
 * @returns {string} Estimated mastery date (YYYY-MM-DD)
 */
function estimateMasteryDate(narrative) {
  if (!narrative || !narrative.srs) return null;

  const { interval_index, quality_history = [] } = narrative.srs;
  if (interval_index >= SRS_INTERVALS.length - 1) {
    return formatDate(new Date()); // Already mastered
  }

  // Estimate based on remaining intervals and average quality
  let estimatedDays = 0;
  // ... (Calculation logic remains same)
  const avgQuality = quality_history.length > 0
    ? quality_history.reduce((a, b) => a + b, 0) / quality_history.length
    : REVIEW_QUALITY.GOOD;

  // Simple estimate: assume GOOD quality for remaining intervals
  for (let i = interval_index; i < SRS_INTERVALS.length - 1; i++) {
    estimatedDays += SRS_INTERVALS[i + 1];
  }

  // Adjust based on recent quality trend
  const recentQuality = quality_history.slice(-3);
  const recentAvg = recentQuality.length > 0
    ? recentQuality.reduce((a, b) => a + b, 0) / recentQuality.length
    : REVIEW_QUALITY.GOOD;

  // If recent performance is poor, extend estimate
  if (recentAvg < REVIEW_QUALITY.GOOD) {
    estimatedDays *= 1.5;
  }

  const masteryDate = new Date();
  masteryDate.setDate(masteryDate.getDate() + Math.ceil(estimatedDays));

  return formatDate(masteryDate);
}

// Export all functions to window.srs namespace
Object.assign(window.srs, {
  SRS_INTERVALS,
  REVIEW_QUALITY,
  REVIEW_QUALITY_LABELS,
  calculateNextReview,
  recordReview,
  getReviewStatistics,
  resetNarrativeToNew,
  suspendNarrative,
  resumeNarrative,
  getOptimalReviewOrder,
  getRandomReviewOrder,
  getIntervalName,
  daysUntilReview,
  isOverdue,
  getQualityBreakdown,
  estimateMasteryDate,
  formatDate
});
