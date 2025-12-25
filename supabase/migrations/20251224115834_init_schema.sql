-- Create narratives table
CREATE TABLE IF NOT EXISTS en_journal_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  category TEXT,
  narrative_en TEXT NOT NULL,
  key_phrases JSONB DEFAULT '[]'::jsonb,
  alternatives JSONB DEFAULT '[]'::jsonb,
  recall_test JSONB NOT NULL,
  pronunciation JSONB,
  user_answers JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{"length": "Normal", "tone": "Business"}'::jsonb,
  srs_data JSONB NOT NULL DEFAULT '{
    "interval_index": 0,
    "next_review_date": null,
    "last_reviewed": null,
    "review_count": 0,
    "quality_history": [],
    "status": "new",
    "ease_factor": 2.5
  }'::jsonb
);

-- Create user_stats table to store global stats
CREATE TABLE IF NOT EXISTS en_journal_user_stats (
  id TEXT PRIMARY KEY DEFAULT 'global',
  updated_at TIMESTAMPTZ DEFAULT now(),
  total_reviews INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_review_date DATE,
  reviews_by_date JSONB DEFAULT '{}'::jsonb
);

-- Insert initial stats row
INSERT INTO en_journal_user_stats (id) VALUES ('global')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Row Level Security) - For now, allow all access since there is no Auth yet
ALTER TABLE en_journal_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE en_journal_user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (Temporary for MVP)
CREATE POLICY "Allow public read" ON en_journal_narratives FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON en_journal_narratives FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON en_journal_narratives FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON en_journal_narratives FOR DELETE USING (true);

CREATE POLICY "Allow public read stats" ON en_journal_user_stats FOR SELECT USING (true);
CREATE POLICY "Allow public update stats" ON en_journal_user_stats FOR UPDATE USING (true);
CREATE POLICY "Allow public insert stats" ON en_journal_user_stats FOR INSERT WITH CHECK (true);
