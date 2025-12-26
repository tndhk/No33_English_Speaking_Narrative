/**
 * Utility Module - Shared utility functions
 * Centralized utilities to avoid code duplication across modules
 */

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
    return date.toISOString().split('T')[0];
}

