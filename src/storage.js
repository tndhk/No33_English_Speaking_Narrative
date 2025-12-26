/**
 * Storage Module - Supabase wrapper for narrative and SRS data management
 * Handles all persistence operations for the SRS (Spaced Repetition System)
 */

import { supabase } from './supabase.js';

// Make storage available globally via window.storage namespace
window.storage = window.storage || {};

/**
 * Get current authenticated user ID
 * @returns {string|null} User ID or null if not authenticated
 */
function getUserId() {
  return window.auth?.getUserId() || null;
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
 * Helper to transform DB row to Application object
 * Maps srs_data (DB) -> srs (App)
 */
function transformFromDB(row) {
  if (!row) return null;
  return {
    ...row,
    srs: row.srs_data, // Map srs_data to srs
    srs_data: undefined // Remove original column
  };
}

/**
 * Helper to transform Application object to DB row
 * Maps srs (App) -> srs_data (DB)
 */
function transformToDB(appObj) {
  if (!appObj) return null;
  const { srs, ...rest } = appObj;
  return {
    ...rest,
    srs_data: srs
  };
}

/**
 * Get all en_journal_narratives from Supabase
 * @returns {Promise<Array>} Array of narrative objects
 */
async function getAllNarratives() {
  try {
    const { data, error } = await supabase
      .from('en_journal_narratives')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(transformFromDB);
  } catch (error) {
    console.error('Error reading en_journal_narratives from Supabase:', error);
    return [];
  }
}

/**
 * Save a new narrative
 * @param {Object} narrative - Narrative object from generation
 * @param {Object} metadata - Additional metadata (answers, settings, etc.)
 * @returns {Promise<Object>} Complete narrative object with ID and SRS data
 */
async function saveNarrative(narrative, metadata = {}) {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User must be authenticated to save en_journal_narratives');
    }

    const newNarrative = {
      user_id: userId,
      narrative_en: narrative.narrative_en,
      key_phrases: narrative.key_phrases,
      alternatives: narrative.alternatives,
      recall_test: narrative.recall_test,
      pronunciation: narrative.pronunciation,
      created_at: new Date().toISOString(),
      category: metadata.category || 'omakase',
      user_answers: metadata.answers || [],
      settings: metadata.settings || { length: 'Normal', tone: 'Business' },
      srs: initializeSRSData() // will be mapped to srs_data
    };

    const dbRow = transformToDB(newNarrative);

    const { data, error } = await supabase
      .from('en_journal_narratives')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error details:', error);
      throw error;
    }
    return transformFromDB(data);
  } catch (error) {
    console.error('Detailed save error:', error);
    throw new Error('Failed to save narrative: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Get a single narrative by ID
 * @param {string} id - Narrative ID
 * @returns {Promise<Object|null>} Narrative object or null if not found
 */
async function getNarrativeById(id) {
  try {
    const { data, error } = await supabase
      .from('en_journal_narratives')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return transformFromDB(data);
  } catch (error) {
    console.error(`Error getting narrative ${id}:`, error);
    return null;
  }
}

/**
 * Update SRS data for a narrative
 * @param {string} id - Narrative ID
 * @param {Object} srsData - Updated SRS object (merged with existing)
 * @returns {Promise<Object|null>} Updated narrative or null if not found
 */
async function updateNarrativeSRS(id, srsData) {
  try {
    // First fetch current to merge
    const current = await getNarrativeById(id);
    if (!current) return null;

    const newSrs = { ...current.srs, ...srsData };

    const { data, error } = await supabase
      .from('en_journal_narratives')
      .update({ srs_data: newSrs })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformFromDB(data);
  } catch (error) {
    console.error('Error updating narrative SRS:', error);
    throw new Error('Failed to update narrative');
  }
}

/**
 * Delete a narrative
 * @param {string} id - Narrative ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteNarrative(id) {
  try {
    const { error } = await supabase
      .from('en_journal_narratives')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting narrative:', error);
    return false;
  }
}

/**
 * Get en_journal_narratives due for review today
 * @returns {Promise<Array>} Array of narrative objects
 */
async function getNarrativesDueToday() {
  const today = formatDate(new Date());

  // Note: JSON filtering in Supabase/Postgres requires specific syntax
  // Using simplified client-side filtering for MVP to handle complex JSON logic easily
  // In production with many rows, this should be moved to a DB view or RPC
  const en_journal_narratives = await getAllNarratives();

  return en_journal_narratives.filter(n =>
    n.srs &&
    n.srs.status !== 'mastered' &&
    n.srs.status !== 'suspended' &&
    n.srs.next_review_date <= today
  );
}

/**
 * Get en_journal_narratives due in the next N days
 * @param {number} days - Number of days to look ahead
 * @returns {Promise<Array>} Array of narrative objects
 */
async function getNarrativesUpcoming(days = 7) {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  const todayStr = formatDate(today);
  const futureDateStr = formatDate(futureDate);

  const en_journal_narratives = await getAllNarratives();

  return en_journal_narratives.filter(n =>
    n.srs &&
    n.srs.status !== 'mastered' &&
    n.srs.status !== 'suspended' &&
    n.srs.next_review_date > todayStr &&
    n.srs.next_review_date <= futureDateStr
  ).sort((a, b) => new Date(a.srs.next_review_date) - new Date(b.srs.next_review_date));
}

/**
 * Search en_journal_narratives by keyword
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching en_journal_narratives
 */
async function searchNarratives(query) {
  if (!query) return getAllNarratives();

  const q = query.toLowerCase();

  // Using client-side filter for consistency with MVP JSON structure
  const en_journal_narratives = await getAllNarratives();

  return en_journal_narratives.filter(n =>
    (n.narrative_en && n.narrative_en.toLowerCase().includes(q)) ||
    (n.recall_test && n.recall_test.prompt_ja && n.recall_test.prompt_ja.includes(query)) ||
    (n.category && n.category.toLowerCase().includes(q))
  );
}

/**
 * Filter en_journal_narratives by criteria
 * @param {Object} filters - Filter object {category, status, searchQuery}
 * @returns {Promise<Array>} Filtered en_journal_narratives
 */
async function filterNarratives(filters = {}) {
  let en_journal_narratives = await getAllNarratives(); // Start with all, then filter in memory

  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    en_journal_narratives = en_journal_narratives.filter(n =>
      (n.narrative_en && n.narrative_en.toLowerCase().includes(q)) ||
      (n.recall_test && n.recall_test.prompt_ja && n.recall_test.prompt_ja.includes(filters.searchQuery)) ||
      (n.category && n.category.toLowerCase().includes(q))
    );
  }

  if (filters.category && filters.category !== 'all') {
    en_journal_narratives = en_journal_narratives.filter(n => n.category === filters.category);
  }

  if (filters.status && filters.status !== 'all') {
    en_journal_narratives = en_journal_narratives.filter(n => n.srs && n.srs.status === filters.status);
  }

  return en_journal_narratives;
}

/**
 * Get SRS settings (Local Storage is fine for app settings, but let's mock async for interface consistency)
 * @returns {Promise<Object>} SRS settings object
 */
async function getSRSSettings() {
  // Keeping settings in localStorage for now as it's device specific preference
  try {
    const data = localStorage.getItem('srs_settings_v1');
    if (data) return JSON.parse(data);
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
async function saveSRSSettings(settings) {
  try {
    const current = await getSRSSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem('srs_settings_v1', JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving SRS settings:', error);
  }
}

/**
 * Get SRS statistics (Global stats from Supabase)
 * @returns {Promise<Object>} Statistics object
 */
async function getSRSStats() {
  try {
    const userId = getUserId();
    if (!userId) {
      // Return default stats if not authenticated
      return {
        total_reviews: 0,
        current_streak: 0,
        longest_streak: 0,
        last_review_date: null,
        reviews_by_date: {}
      };
    }

    const { data, error } = await supabase
      .from('en_journal_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      // If not found, return default (stats will be created by trigger on first login)
      return {
        total_reviews: 0,
        current_streak: 0,
        longest_streak: 0,
        last_review_date: null,
        reviews_by_date: {}
      };
    }

    return {
      total_reviews: data.total_reviews,
      current_streak: data.current_streak,
      longest_streak: data.longest_streak,
      last_review_date: data.last_review_date,
      reviews_by_date: data.reviews_by_date || {}
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
async function updateSRSStats(reviewDate = new Date()) {
  try {
    const stats = await getSRSStats();
    const dateStr = formatDate(reviewDate);

    // Update review count for date
    const reviewsByDate = { ...stats.reviews_by_date };
    reviewsByDate[dateStr] = (reviewsByDate[dateStr] || 0) + 1;

    const newTotalReviews = (stats.total_reviews || 0) + 1;

    // Update streak
    let currentStreak = stats.current_streak || 0;

    // Check if streak continues
    const yesterday = new Date(reviewDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    if (stats.last_review_date === yesterdayStr) {
      currentStreak += 1;
    } else if (stats.last_review_date !== dateStr) {
      // Reset streak if we missed a day (and it's not a second review today)
      currentStreak = 1;
    }

    const newLongestStreak = Math.max(stats.longest_streak || 0, currentStreak);

    const userId = getUserId();
    if (!userId) {
      console.warn('Cannot update stats: user not authenticated');
      return stats;
    }

    const updates = {
      total_reviews: newTotalReviews,
      current_streak: currentStreak,
      longest_streak: newLongestStreak,
      last_review_date: dateStr,
      reviews_by_date: reviewsByDate,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('en_journal_stats')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      // If update fails, maybe row doesn't exist yet (though it should be created by trigger)
      console.error('Failed to update stats', error);
    }

    return { ...stats, ...updates };

  } catch (error) {
    console.error('Error updating SRS stats:', error);
  }
}

/**
 * Reset SRS stats
 */
async function resetSRSStats() {
  try {
    const userId = getUserId();
    if (!userId) {
      console.warn('Cannot reset stats: user not authenticated');
      return;
    }

    const { error } = await supabase
      .from('en_journal_stats')
      .update({
        total_reviews: 0,
        current_streak: 0,
        longest_streak: 0,
        last_review_date: null,
        reviews_by_date: {}
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting SRS stats:', error);
    }
  } catch (error) {
    console.error('Error resetting SRS stats:', error);
  }
}

/**
 * Export all en_journal_narratives as JSON
 */
async function exportNarrativesJSON() {
  try {
    const en_journal_narratives = await getAllNarratives();
    return JSON.stringify(en_journal_narratives, null, 2);
  } catch (error) {
    console.error('Error exporting en_journal_narratives:', error);
    return null;
  }
}

/**
 * Export en_journal_narratives as CSV
 */
async function exportNarrativesCSV() {
  try {
    const en_journal_narratives = await getAllNarratives();
    if (en_journal_narratives.length === 0) return '';

    const headers = ['Date', 'Category', 'Narrative', 'Recall Test (Japanese)', 'Next Review', 'Status', 'Review Count'];
    const rows = en_journal_narratives.map(n => [
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
 * Import en_journal_narratives from JSON
 * Note: Logic changed to bulk insert
 */
async function importNarrativesJSON(jsonString) {
  try {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported)) throw new Error('Invalid format: expected array');

    const dbRows = imported.map(n => {
      // Ensure Srs exists
      const srs = n.srs || initializeSRSData();
      // Map to DB format
      return {
        narrative_en: n.narrative_en,
        key_phrases: n.key_phrases || [],
        alternatives: n.alternatives || [],
        recall_test: n.recall_test,
        pronunciation: n.pronunciation,
        category: n.category || 'omakase',
        user_answers: n.user_answers || [],
        settings: n.settings || {},
        srs_data: srs,
        // Let DB handle ID and created_at if possible, or carry over if importing backup
        // Not forcing ID here to avoid PK conflicts if ID strategy changes
      };
    });

    const { data, error } = await supabase
      .from('en_journal_narratives')
      .insert(dbRows)
      .select();

    if (error) throw error;

    return data.map(transformFromDB);
  } catch (error) {
    console.error('Error importing en_journal_narratives:', error);
    throw new Error('Invalid JSON format or DB error');
  }
}

/**
 * Clear all data (use with caution)
 */
async function clearAllData() {
  try {
    await supabase.from('en_journal_narratives').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    await resetSRSStats();
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

/**
 * Get storage statistics
 */
async function getStorageStats() {
  const en_journal_narratives = await getAllNarratives();

  // Size estimate is rough
  const totalSize = JSON.stringify(en_journal_narratives).length;

  return {
    total_en_journal_narratives: en_journal_narratives.length,
    total_storage_bytes: totalSize,
    total_storage_kb: (totalSize / 1024).toFixed(2),
    new_count: en_journal_narratives.filter(n => n.srs?.status === 'new').length,
    learning_count: en_journal_narratives.filter(n => n.srs?.status === 'learning').length,
    mastered_count: en_journal_narratives.filter(n => n.srs?.status === 'mastered').length
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
  formatDate
});
