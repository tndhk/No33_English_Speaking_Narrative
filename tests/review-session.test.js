/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
window.storage = {
  getNarrativesDueToday: vi.fn(),
  getNarrativesUpcoming: vi.fn(),
  getSRSStats: vi.fn(),
};

window.srs = {
  getOptimalReviewOrder: vi.fn(list => list),
  getRandomReviewOrder: vi.fn(list => list),
  recordReview: vi.fn(),
};

// Mock UI functions called by review-session
window.showLoading = vi.fn();
window.hideLoading = vi.fn();
window.renderReviewSession = vi.fn();
window.renderSessionComplete = vi.fn();
window.alert = vi.fn();
window.confirm = vi.fn();

// Import the module
import '../src/review-session.js';

describe('Review Session Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset session state if possible. 
    // Since state is private in module, we use endReviewSession to reset it.
    window.endReviewSession();
  });

  describe('initReviewSession', () => {
    it('should initialize successfully when there are due narratives', async () => {
      const mockNarratives = [{ id: '1' }, { id: '2' }];
      window.storage.getNarrativesDueToday.mockResolvedValue(mockNarratives);

      const success = await window.initReviewSession();
      
      expect(success).toBe(true);
      expect(window.storage.getNarrativesDueToday).toHaveBeenCalled();
      expect(window.getCurrentNarrative()).toEqual({ id: '1' });
      expect(window.getSessionProgress().total).toBe(2);
    });

    it('should return false when no narratives due', async () => {
      window.storage.getNarrativesDueToday.mockResolvedValue([]);

      const success = await window.initReviewSession();
      
      expect(success).toBe(false);
      expect(window.getCurrentNarrative()).toBeNull();
    });

    it('should respect limit option', async () => {
      const mockNarratives = [{ id: '1' }, { id: '2' }, { id: '3' }];
      window.storage.getNarrativesDueToday.mockResolvedValue(mockNarratives);
      // Mock sorting to return as is
      window.srs.getOptimalReviewOrder.mockReturnValue(mockNarratives);

      await window.initReviewSession({ limit: 2 });
      
      expect(window.getSessionProgress().total).toBe(2);
      expect(window.getCurrentNarrative().id).toBe('1');
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
       // Setup a session with 2 narratives
       window.storage.getNarrativesDueToday.mockResolvedValue([{ id: '1' }, { id: '2' }]);
       window.srs.getOptimalReviewOrder.mockReturnValue([{ id: '1' }, { id: '2' }]);
       await window.initReviewSession();
    });

    it('should get current narrative', () => {
      expect(window.getCurrentNarrative()).toEqual({ id: '1' });
    });

    it('should check if has next narrative', () => {
      expect(window.hasNextNarrative()).toBe(true);
    });

    it('should move to next narrative', () => {
      const next = window.moveToNextNarrative();
      expect(next).toEqual({ id: '2' });
      expect(window.getCurrentNarrative()).toEqual({ id: '2' });
      expect(window.hasNextNarrative()).toBe(false);
    });

    it('should return null when moving past end', () => {
      window.moveToNextNarrative(); // to 2
      const next = window.moveToNextNarrative(); // past 2
      expect(next).toBeNull();
    });
  });

  describe('Interactions', () => {
     beforeEach(async () => {
       window.storage.getNarrativesDueToday.mockResolvedValue([{ id: '1' }]);
       window.srs.getOptimalReviewOrder.mockReturnValue([{ id: '1' }]);
       await window.initReviewSession();
    });

    it('should toggle answer visibility', () => {
      // Access private state via toggle return value or reliance on internal logic
      // The function returns the new state
      const visible1 = window.toggleAnswerVisibility();
      expect(visible1).toBe(true);
      
      const visible2 = window.toggleAnswerVisibility();
      expect(visible2).toBe(false);
    });

    it('should record review', async () => {
      window.srs.recordReview.mockResolvedValue({ id: '1', srs: {} });

      await window.recordCurrentReview(2); // GOOD

      expect(window.srs.recordReview).toHaveBeenCalledWith('1', 2);
    });
  });

  describe('Session Summary', () => {
    it('should generate correct summary', async () => {
       window.storage.getNarrativesDueToday.mockResolvedValue([{ id: '1' }, { id: '2' }]);
       window.srs.getOptimalReviewOrder.mockReturnValue([{ id: '1' }, { id: '2' }]);
       window.srs.recordReview.mockResolvedValue({});
       
       await window.initReviewSession();
       
       // Review 1: Good
       await window.recordCurrentReview(2);
       window.moveToNextNarrative();
       
       // Review 2: Easy
       await window.recordCurrentReview(3);
       
       const summary = window.getSessionSummary();
       
       expect(summary.total_reviews).toBe(2);
       expect(summary.ratings_breakdown.good).toBe(1);
       expect(summary.ratings_breakdown.easy).toBe(1);
       expect(summary.average_quality).toBe('2.50');
    });
  });
});
