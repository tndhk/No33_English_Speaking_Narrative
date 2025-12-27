/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();

// Mock the module import
vi.mock('../src/supabase.js', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
    auth: {
      getSession: vi.fn(),
    }
  };
  return { supabase: mockSupabase };
});

// Import storage module
import '../src/storage.js';

describe('Storage Module', () => {
  const { storage } = window;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup chainable mocks
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq });
    mockOrder.mockReturnValue({ data: [], error: null });
    mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) });
    mockUpdate.mockReturnValue({ eq: () => ({ select: () => ({ single: mockSingle }) }) });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle, data: [], error: null });
    mockSingle.mockReturnValue({ data: {}, error: null });

    // Reset window.auth if needed, but storage checks window.auth directly or via helper
    window.auth = { getUserId: () => 'test-user-id' };
  });

  describe('Data Transformation', () => {
    it('should transform from DB format to App format', async () => {
      // We can't access internal transform functions directly, 
      // but we can test via public methods that use them.
      // getAllNarratives uses transformFromDB
      
      const dbRow = {
        id: '1',
        narrative_en: 'Test',
        srs_data: { status: 'new' }
      };
      
      mockSelect.mockReturnValue({ 
        order: vi.fn().mockResolvedValue({ data: [dbRow], error: null }) 
      });

      const result = await storage.getAllNarratives();
      
      expect(result[0]).toEqual({
        id: '1',
        narrative_en: 'Test',
        srs: { status: 'new' }, // transformed
        srs_data: undefined
      });
    });
  });

  describe('Filtering Logic (In-Memory)', () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const mockNarratives = [
      { id: '1', narrative_en: 'Apple', category: 'Fruit', srs_data: { status: 'learning', next_review_date: yesterdayStr } }, // Due
      { id: '2', narrative_en: 'Banana', category: 'Fruit', srs_data: { status: 'mastered', next_review_date: yesterdayStr } }, // Mastered (not due)
      { id: '3', narrative_en: 'Carrot', category: 'Veggie', srs_data: { status: 'learning', next_review_date: tomorrowStr } }, // Future
      { id: '4', narrative_en: 'Dog', category: 'Animal', srs_data: { status: 'new', next_review_date: today } }, // Due today
    ];

    beforeEach(() => {
       mockSelect.mockReturnValue({ 
        order: vi.fn().mockResolvedValue({ data: mockNarratives, error: null }) 
      });
    });

    it('getNarrativesDueToday should return only due items', async () => {
      const result = await storage.getNarrativesDueToday();
      
      // Should include ID 1 (yesterday) and 4 (today)
      // Should exclude 2 (mastered) and 3 (tomorrow)
      expect(result).toHaveLength(2);
      expect(result.map(n => n.id).sort()).toEqual(['1', '4']);
    });

    it('getNarrativesUpcoming should return future items', async () => {
      const result = await storage.getNarrativesUpcoming(7);
      
      // Should include ID 3 (tomorrow)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('searchNarratives should filter by text', async () => {
      const result = await storage.searchNarratives('App');
      expect(result).toHaveLength(1);
      expect(result[0].narrative_en).toBe('Apple');
    });
    
    it('filterNarratives should filter by category and status', async () => {
      const result = await storage.filterNarratives({ category: 'Fruit' });
      expect(result).toHaveLength(2); // Apple, Banana
      
      const result2 = await storage.filterNarratives({ status: 'mastered' });
      expect(result2).toHaveLength(1); // Banana
    });
  });

  describe('CSV Export', () => {
     it('should format CSV correctly', async () => {
       const mockData = [
         {
           created_at: '2023-01-01T12:00:00Z',
           category: 'Test',
           narrative_en: 'Hello "World"',
           recall_test: { prompt_ja: 'こんにちは' },
           srs_data: { next_review_date: '2023-01-02', status: 'learning', review_count: 5 }
         }
       ];
       
       mockSelect.mockReturnValue({ 
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }) 
      });

      const csv = await storage.exportNarrativesCSV();
      
      const lines = csv.split('\n');
      expect(lines[0]).toContain('Date,Category,Narrative');
      
      // Check escaping of quotes
      expect(lines[1]).toContain('"Hello ""World"""');
      expect(lines[1]).toContain('2023-01-01');
      expect(lines[1]).toContain('learning');
     });
  });
  
  describe('CRUD Operations', () => {
      it('saveNarrative should insert data', async () => {
          mockInsert.mockReturnValue({ 
              select: () => ({ 
                  single: vi.fn().mockResolvedValue({ data: { id: '123', srs_data: {} }, error: null })
              }) 
          });

          await storage.saveNarrative({ narrative_en: 'New' });
          
          expect(mockInsert).toHaveBeenCalled();
          const insertCall = mockInsert.mock.calls[0][0];
          expect(insertCall.narrative_en).toBe('New');
          expect(insertCall.user_id).toBe('test-user-id');
          expect(insertCall.srs_data).toBeDefined(); // initialized
      });

      it('deleteNarrative should delete data', async () => {
          mockDelete.mockReturnValue({ 
              eq: vi.fn().mockResolvedValue({ error: null })
          });

          await storage.deleteNarrative('123');
          expect(mockDelete).toHaveBeenCalled();
      });
  });
});
