/**
 * Storage Module - localStorage wrapper for narrative and SRS data management
 * Handles all persistence operations for the SRS (Spaced Repetition System)
 */

// Make storage available globally via window.storage namespace
window.storage = window.storage || {};

const STORAGE_KEYS = {
  NARRATIVES: 'narratives_v1',
  SRS_SETTINGS: 'srs_settings_v1',
  SRS_STATS: 'srs_stats_v1'
};

/**
 * Generate a unique ID for narratives
 * Uses timestamp + random string for simplicity
 */
function generateNarrativeId() {
  return `narrative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize default SRS metadata for a new narrative
 */
function initializeSRSData() {
  return {
    interval_index: 0,
    next_review_date: formatDate(new Date()),
    last_reviewed: null,
    review_count: 0,
    quality_history: [],
    status: 'new', // 'new' | 'learning' | 'mastered' | 'suspended'
    ease_factor: 2.5
  };
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get all narratives from localStorage
 * @returns {Array} Array of narrative objects
 */
function getAllNarratives() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.NARRATIVES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading narratives from localStorage:', error);
    return [];
  }
}

/**
 * Save a new narrative or update existing one
 * @param {Object} narrative - Narrative object from generation
 * @param {Object} metadata - Additional metadata (answers, settings, etc.)
 * @returns {Object} Complete narrative object with ID and SRS data
 */
function saveNarrative(narrative, metadata = {}) {
  try {
    const narratives = getAllNarratives();

    const newNarrative = {
      id: generateNarrativeId(),
      ...narrative,
      created_at: new Date().toISOString(),
      category: metadata.category || 'omakase',
      user_answers: metadata.answers || [],
      settings: metadata.settings || { length: 'Normal', tone: 'Business' },
      srs: initializeSRSData()
    };

    narratives.unshift(newNarrative); // Add to beginning for newest first
    localStorage.setItem(STORAGE_KEYS.NARRATIVES, JSON.stringify(narratives));

    return newNarrative;
  } catch (error) {
    console.error('Error saving narrative:', error);
    throw new Error('Failed to save narrative');
  }
}

/**
 * Get a single narrative by ID
 * @param {string} id - Narrative ID
 * @returns {Object|null} Narrative object or null if not found
 */
function getNarrativeById(id) {
  const narratives = getAllNarratives();
  return narratives.find(n => n.id === id) || null;
}

/**
 * Update SRS data for a narrative
 * @param {string} id - Narrative ID
 * @param {Object} srsData - Updated SRS object
 * @returns {Object|null} Updated narrative or null if not found
 */
function updateNarrativeSRS(id, srsData) {
  try {
    const narratives = getAllNarratives();
    const index = narratives.findIndex(n => n.id === id);

    if (index === -1) return null;

    narratives[index].srs = { ...narratives[index].srs, ...srsData };
    localStorage.setItem(STORAGE_KEYS.NARRATIVES, JSON.stringify(narratives));

    return narratives[index];
  } catch (error) {
    console.error('Error updating narrative SRS:', error);
    throw new Error('Failed to update narrative');
  }
}

/**
 * Delete a narrative
 * @param {string} id - Narrative ID
 * @returns {boolean} Success status
 */
function deleteNarrative(id) {
  try {
    let narratives = getAllNarratives();
    narratives = narratives.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NARRATIVES, JSON.stringify(narratives));
    return true;
  } catch (error) {
    console.error('Error deleting narrative:', error);
    return false;
  }
}

/**
 * Get narratives due for review today
 * @returns {Array} Array of narrative objects
 */
function getNarrativesDueToday() {
  const narratives = getAllNarratives();
  const today = formatDate(new Date());

  return narratives.filter(n =>
    n.srs &&
    n.srs.status !== 'mastered' &&
    n.srs.status !== 'suspended' &&
    n.srs.next_review_date <= today
  );
}

/**
 * Get narratives due in the next N days
 * @param {number} days - Number of days to look ahead
 * @returns {Array} Array of narrative objects
 */
function getNarrativesUpcoming(days = 7) {
  const narratives = getAllNarratives();
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  const todayStr = formatDate(today);
  const futureDateStr = formatDate(futureDate);

  return narratives.filter(n =>
    n.srs &&
    n.srs.status !== 'mastered' &&
    n.srs.status !== 'suspended' &&
    n.srs.next_review_date > todayStr &&
    n.srs.next_review_date <= futureDateStr
  ).sort((a, b) => new Date(a.srs.next_review_date) - new Date(b.srs.next_review_date));
}

/**
 * Search narratives by keyword
 * @param {string} query - Search query
 * @returns {Array} Matching narratives
 */
function searchNarratives(query) {
  if (!query) return getAllNarratives();

  const q = query.toLowerCase();
  const narratives = getAllNarratives();

  return narratives.filter(n =>
    (n.narrative_en && n.narrative_en.toLowerCase().includes(q)) ||
    (n.recall_test && n.recall_test.prompt_ja && n.recall_test.prompt_ja.includes(query)) ||
    (n.category && n.category.toLowerCase().includes(q))
  );
}

/**
 * Filter narratives by criteria
 * @param {Object} filters - Filter object {category, status, searchQuery}
 * @returns {Array} Filtered narratives
 */
function filterNarratives(filters = {}) {
  let narratives = getAllNarratives();

  if (filters.searchQuery) {
    narratives = searchNarratives(filters.searchQuery);
  }

  if (filters.category && filters.category !== 'all') {
    narratives = narratives.filter(n => n.category === filters.category);
  }

  if (filters.status && filters.status !== 'all') {
    narratives = narratives.filter(n => n.srs && n.srs.status === filters.status);
  }

  return narratives;
}

/**
 * Get SRS settings
 * @returns {Object} SRS settings object
 */
function getSRSSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SRS_SETTINGS);
    if (data) return JSON.parse(data);

    // Return defaults if not set
    return {
      daily_review_limit: 20,
      enable_notifications: false,
      review_order: 'oldest_first',
      auto_play_audio: false
    };
  } catch (error) {
    console.error('Error reading SRS settings:', error);
    return {};
  }
}

/**
 * Save SRS settings
 * @param {Object} settings - Settings object
 */
function saveSRSSettings(settings) {
  try {
    const current = getSRSSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SRS_SETTINGS, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving SRS settings:', error);
  }
}

/**
 * Get SRS statistics
 * @returns {Object} Statistics object
 */
function getSRSStats() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SRS_STATS);
    if (data) return JSON.parse(data);

    return {
      total_reviews: 0,
      current_streak: 0,
      longest_streak: 0,
      last_review_date: null,
      reviews_by_date: {}
    };
  } catch (error) {
    console.error('Error reading SRS stats:', error);
    return {};
  }
}

/**
 * Update review statistics
 * @param {Date} reviewDate - Date of review
 */
function updateSRSStats(reviewDate = new Date()) {
  try {
    const stats = getSRSStats();
    const dateStr = formatDate(reviewDate);

    // Update review count for date
    stats.reviews_by_date[dateStr] = (stats.reviews_by_date[dateStr] || 0) + 1;
    stats.total_reviews = (stats.total_reviews || 0) + 1;

    // Update streak
    const yesterday = new Date(reviewDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    if (stats.last_review_date === yesterdayStr) {
      stats.current_streak = (stats.current_streak || 0) + 1;
    } else if (stats.last_review_date !== dateStr) {
      stats.current_streak = 1;
    }

    stats.last_review_date = dateStr;
    stats.longest_streak = Math.max(stats.longest_streak || 0, stats.current_streak || 0);

    localStorage.setItem(STORAGE_KEYS.SRS_STATS, JSON.stringify(stats));
    return stats;
  } catch (error) {
    console.error('Error updating SRS stats:', error);
  }
}

/**
 * Reset SRS stats
 */
function resetSRSStats() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SRS_STATS);
  } catch (error) {
    console.error('Error resetting SRS stats:', error);
  }
}

/**
 * Export all narratives as JSON
 * @returns {string} JSON string of all narratives
 */
function exportNarrativesJSON() {
  try {
    const narratives = getAllNarratives();
    return JSON.stringify(narratives, null, 2);
  } catch (error) {
    console.error('Error exporting narratives:', error);
    return null;
  }
}

/**
 * Export narratives as CSV for Google Sheets
 * @returns {string} CSV format string
 */
function exportNarrativesCSV() {
  try {
    const narratives = getAllNarratives();
    if (narratives.length === 0) return '';

    const headers = ['Date', 'Category', 'Narrative', 'Recall Test (Japanese)', 'Next Review', 'Status', 'Review Count'];
    const rows = narratives.map(n => [
      n.created_at ? n.created_at.split('T')[0] : '',
      n.category || '',
      `"${(n.narrative_en || '').replace(/"/g, '""')}"`,
      `"${(n.recall_test?.prompt_ja || '').replace(/"/g, '""')}"`,
      n.srs?.next_review_date || '',
      n.srs?.status || 'new',
      n.srs?.review_count || 0
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  } catch (error) {
    console.error('Error exporting as CSV:', error);
    return null;
  }
}

/**
 * Import narratives from JSON (for backup restoration)
 * @param {string} jsonString - JSON string of narratives
 * @returns {Array} Imported narratives
 */
function importNarrativesJSON(jsonString) {
  try {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported)) throw new Error('Invalid format: expected array');

    const narratives = getAllNarratives();
    const newNarratives = imported.map(n => {
      // Ensure required SRS fields exist (for backward compatibility)
      if (!n.srs) {
        n.srs = initializeSRSData();
      }
      if (!n.id) {
        n.id = generateNarrativeId();
      }
      return n;
    });

    narratives.push(...newNarratives);
    localStorage.setItem(STORAGE_KEYS.NARRATIVES, JSON.stringify(narratives));

    return newNarratives;
  } catch (error) {
    console.error('Error importing narratives:', error);
    throw new Error('Invalid JSON format');
  }
}

/**
 * Clear all data (use with caution)
 */
function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.NARRATIVES);
    localStorage.removeItem(STORAGE_KEYS.SRS_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.SRS_STATS);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

/**
 * Get storage statistics
 * @returns {Object} Storage info
 */
function getStorageStats() {
  const narratives = getAllNarratives();
  let totalSize = 0;

  Object.values(STORAGE_KEYS).forEach(key => {
    const data = localStorage.getItem(key);
    if (data) totalSize += data.length;
  });

  return {
    total_narratives: narratives.length,
    total_storage_bytes: totalSize,
    total_storage_kb: (totalSize / 1024).toFixed(2),
    new_count: narratives.filter(n => n.srs?.status === 'new').length,
    learning_count: narratives.filter(n => n.srs?.status === 'learning').length,
    mastered_count: narratives.filter(n => n.srs?.status === 'mastered').length
  };
}

// Export all functions to window.storage namespace
Object.assign(window.storage, {
  getAllNarratives,
  saveNarrative,
  getNarrativeById,
  updateNarrativeSRS,
  deleteNarrative,
  getNarrativesDueToday,
  getNarrativesUpcoming,
  searchNarratives,
  filterNarratives,
  getSRSSettings,
  saveSRSSettings,
  getSRSStats,
  updateSRSStats,
  resetSRSStats,
  exportNarrativesJSON,
  exportNarrativesCSV,
  importNarrativesJSON,
  clearAllData,
  getStorageStats,
  formatDate,
  generateNarrativeId
});
