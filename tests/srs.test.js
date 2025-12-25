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

  describe('Status Management', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should reset narrative to new', async () => {
      window.storage.updateNarrativeSRS.mockResolvedValue(true);
      await srs.resetNarrativeToNew('123');

      expect(window.storage.updateNarrativeSRS).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          status: 'new',
          interval_index: 0,
          review_count: 0,
          quality_history: []
        })
      );
    });

    it('should suspend narrative', async () => {
      window.storage.updateNarrativeSRS.mockResolvedValue(true);
      await srs.suspendNarrative('123');

      expect(window.storage.updateNarrativeSRS).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          status: 'suspended'
        })
      );
    });

    it('should resume narrative to learning if review count > 0', async () => {
      const mockNarrative = {
        id: '123',
        srs: { review_count: 5, status: 'suspended' }
      };
      window.storage.getNarrativeById.mockResolvedValue(mockNarrative);
      window.storage.updateNarrativeSRS.mockResolvedValue(true);

      await srs.resumeNarrative('123');

      expect(window.storage.updateNarrativeSRS).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          status: 'learning'
        })
      );
    });

    it('should resume narrative to new if review count is 0', async () => {
      const mockNarrative = {
        id: '123',
        srs: { review_count: 0, status: 'suspended' }
      };
      window.storage.getNarrativeById.mockResolvedValue(mockNarrative);
      window.storage.updateNarrativeSRS.mockResolvedValue(true);

      await srs.resumeNarrative('123');

      expect(window.storage.updateNarrativeSRS).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          status: 'new'
        })
      );
    });
  });

  describe('Ordering & Sorting', () => {
    it('should sort by interval index then last reviewed date (Optimal Order)', () => {
      const narratives = [
        { id: '1', srs: { interval_index: 2, last_reviewed: '2023-01-02' } },
        { id: '2', srs: { interval_index: 1, last_reviewed: '2023-01-01' } }, // Lower interval -> First
        { id: '3', srs: { interval_index: 1, last_reviewed: '2023-01-03' } }, // Same interval, later date -> Later
      ];

      // Expected order: 2 (idx 1, old date), 3 (idx 1, new date), 1 (idx 2)
      // Actually, wait. The logic is:
      // return a.srs.interval_index - b.srs.interval_index;
      // return new Date(a.last_reviewed) - new Date(b.last_reviewed);
      // So 2 (idx 1, Jan 1), 3 (idx 1, Jan 3), 1 (idx 2)
      
      const sorted = srs.getOptimalReviewOrder(narratives);
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('should shuffle narratives (Random Order)', () => {
      const narratives = [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }
      ];
      // Mock Math.random to be deterministic or just check that it returns same length and items
      // For shuffling, it's hard to test randomness without seeding.
      // We can just check it returns an array of same length and contains same items.
      
      const shuffled = srs.getRandomReviewOrder(narratives);
      expect(shuffled).toHaveLength(5);
      expect(shuffled.map(n => n.id).sort()).toEqual(['1', '2', '3', '4', '5']);
      // Ideally check that it is not same order, but with small sample it might be.
    });
  });

  describe('Estimations', () => {
    it('should return null for null narrative', () => {
      expect(srs.estimateMasteryDate(null)).toBeNull();
    });

    it('should return today if already mastered', () => {
       const narrative = { srs: { interval_index: srs.SRS_INTERVALS.length - 1 } };
       const date = srs.estimateMasteryDate(narrative);
       const today = new Date().toISOString().split('T')[0];
       expect(date).toBe(today);
    });

    it('should estimate future date for learning items', () => {
      // Setup a narrative at index 0 (0 days), next is 1, 3, 7, 14, 30.
      // If quality history is good (avg >= 2), it sums remaining intervals.
      // Index 0. Intervals to go: 1, 2, 3, 4, 5 (indices).
      // SRS_INTERVALS = [0, 1, 3, 7, 14, 30]
      // current index 0. Loop i from 0 to length-2 (4).
      // i=0: add SRS_INTERVALS[1] = 1
      // i=1: add SRS_INTERVALS[2] = 3
      // i=2: add SRS_INTERVALS[3] = 7
      // i=3: add SRS_INTERVALS[4] = 14
      // i=4: add SRS_INTERVALS[5] = 30
      // Total = 1+3+7+14+30 = 55 days.
      
      const narrative = { 
        srs: { 
          interval_index: 0, 
          quality_history: [2, 2, 2] 
        } 
      };
      
      const resultDateStr = srs.estimateMasteryDate(narrative);
      const resultDate = new Date(resultDateStr);
      const today = new Date();
      
      const diffTime = resultDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Allow +/- 1 day for timezone/execution time diffs
      expect(diffDays).toBeGreaterThanOrEqual(54); 
      expect(diffDays).toBeLessThanOrEqual(56);
    });
  });
});
