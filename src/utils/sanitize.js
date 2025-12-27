/**
 * Security utilities for XSS prevention
 * Provides safe HTML escaping and input sanitization
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} unsafe - The unsafe string to escape
 * @returns {string} The escaped string safe for HTML context
 */
export function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
