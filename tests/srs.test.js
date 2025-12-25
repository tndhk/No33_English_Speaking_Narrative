/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock window.storage before importing the module
window.storage = {
  getNarrativeById: vi.fn(),
  updateNarrativeSRS: vi.fn(),
  updateSRSStats: vi.fn(),
  getAllNarratives: vi.fn(),
};

// Import the module (this executes the side-effect of attaching to window.srs)
import '../src/srs.js';

describe('SRS (Spaced Repetition System) Module', () => {
  const { srs } = window;

  describe('calculateNextReview', () => {
    // 1. Branch Coverage & Boundary Value Analysis
    it('should reset interval to 0 when quality is FORGOT (0)', () => {
      const currentInterval = 4; // 14 days
      const result = srs.calculateNextReview(currentInterval, srs.REVIEW_QUALITY.FORGOT);
      
      expect(result.nextIntervalIndex).toBe(0);
      expect(result.status).toBe('learning');
      expect(result.daysUntilReview).toBe(0);
    });

    it('should stay at current interval when quality is HARD (1)', () => {
      const currentInterval = 2; // 3 days
      const result = srs.calculateNextReview(currentInterval, srs.REVIEW_QUALITY.HARD);
      
      expect(result.nextIntervalIndex).toBe(currentInterval);
    });

    it('should advance 1 interval when quality is GOOD (2)', () => {
      const currentInterval = 1; // 1 day
      const result = srs.calculateNextReview(currentInterval, srs.REVIEW_QUALITY.GOOD);
      
      expect(result.nextIntervalIndex).toBe(2); // Should become 3 days
    });

    it('should advance 2 intervals when quality is EASY (3)', () => {
      const currentInterval = 1; // 1 day
      const result = srs.calculateNextReview(currentInterval, srs.REVIEW_QUALITY.EASY);
      
      expect(result.nextIntervalIndex).toBe(3); // Should jump to 7 days
    });

    // 2. Boundary Value Analysis: Max Interval
    it('should not exceed max interval index', () => {
      const maxIndex = srs.SRS_INTERVALS.length - 1;
      const result = srs.calculateNextReview(maxIndex, srs.REVIEW_QUALITY.EASY);
      
      expect(result.nextIntervalIndex).toBe(maxIndex);
    });

    // 3. Status Transition
    it('should set status to "mastered" when reaching max interval with GOOD quality', () => {
      const maxIndex = srs.SRS_INTERVALS.length - 1;
      const result = srs.calculateNextReview(maxIndex, srs.REVIEW_QUALITY.GOOD);
      
      expect(result.status).toBe('mastered');
    });
  });

  describe('recordReview', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    // 4. Normal Case with Mocked Dependencies
    it('should correctly update narrative SRS data', async () => {
      const mockNarrative = {
        id: '123',
        srs: {
          interval_index: 1,
          review_count: 5,
          quality_history: [2, 2],
          ease_factor: 2.5
        }
      };

      window.storage.getNarrativeById.mockResolvedValue(mockNarrative);
      window.storage.updateNarrativeSRS.mockResolvedValue(true);

      const quality = srs.REVIEW_QUALITY.GOOD;
      await srs.recordReview('123', quality);

      expect(window.storage.getNarrativeById).toHaveBeenCalledWith('123');
      
      expect(window.storage.updateNarrativeSRS).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          interval_index: 2,
          review_count: 6,
          quality_history: [2, 2, 2],
          status: 'learning'
        })
      );
      
      expect(window.storage.updateSRSStats).toHaveBeenCalled();
    });

    // 5. Exception Handling: Invalid Input
    it('should throw error for invalid quality', async () => {
      await expect(srs.recordReview('123', 5)).rejects.toThrow('Quality must be between 0 and 3');
      await expect(srs.recordReview('123', -1)).rejects.toThrow('Quality must be between 0 and 3');
    });

    // 6. Exception Handling: Data Not Found
    it('should throw error if narrative not found', async () => {
      window.storage.getNarrativeById.mockResolvedValue(null);
      await expect(srs.recordReview('999', srs.REVIEW_QUALITY.GOOD)).rejects.toThrow('Narrative not found');
    });
  });

  describe('getReviewStatistics', () => {
    // 7. Logic & Boundary Checks for Statistics
    it('should calculate correct stats based on narratives', () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = tomorrowDate.toISOString().split('T')[0];

      const narratives = [
        { srs: { status: 'new', next_review_date: today } },
        { srs: { status: 'learning', next_review_date: today } },
        { srs: { status: 'mastered', next_review_date: today } }, // Mastered shouldn't count as due
        { srs: { status: 'learning', next_review_date: tomorrow } }
      ];

      const stats = srs.getReviewStatistics(narratives);

      expect(stats.total).toBe(4);
      expect(stats.new).toBe(1);
      expect(stats.learning).toBe(2);
      expect(stats.mastered).toBe(1);
      
      expect(stats.due_today).toBe(2); 
      expect(stats.due_tomorrow).toBe(1);
    });
    
    // 8. Edge Case: Empty List
    it('should handle empty narrative list', () => {
      const stats = srs.getReviewStatistics([]);
      expect(stats.total).toBe(0);
      expect(stats.due_today).toBe(0);
    });
  });

  describe('Utility Functions', () => {
     // 9. Date Helpers
    it('should correctly calculate days until review', () => {
       const today = new Date();
       const future = new Date(today);
       future.setDate(today.getDate() + 3);
       const futureStr = future.toISOString().split('T')[0];

       // Note: implementation uses Math.ceil, might depend on time of day if not careful,
       // but input is YYYY-MM-DD so it treats it as UTC or local start of day usually.
       // The implementation `new Date(string)` parses as UTC if ISO, but local if YYYY-MM-DD in some browsers.
       // Let's verify the logic in `daysUntilReview` uses `new Date(nextReviewDate)`.
       
       const days = srs.daysUntilReview(futureStr);
       expect(days).toBeGreaterThanOrEqual(2); // Allow slight time diff tolerance or fix mock date
       expect(days).toBeLessThanOrEqual(4);
    });

    it('should identify overdue items', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        expect(srs.isOverdue(yesterdayStr)).toBe(true);
    });
  });
});
