-- Migration: Add user authentication support
-- Date: 2025-12-25
-- Description: Add user_id columns and update RLS policies for user isolation

-- Step 1: Add user_id column to narratives table
ALTER TABLE en_journal_narratives ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Create index for better query performance
CREATE INDEX idx_en_journal_narratives_user_id ON en_journal_narratives(user_id);

-- Step 3: Update user_stats table structure for per-user statistics
-- First, rename the existing global stats table (for backup)
ALTER TABLE en_journal_user_stats RENAME TO en_journal_user_stats_legacy;

-- Create new user_stats table with user_id
CREATE TABLE en_journal_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  total_reviews INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_review_date DATE,
  reviews_by_date JSONB DEFAULT '{}'::jsonb
);

-- Create index for user_stats
CREATE INDEX idx_en_journal_stats_user_id ON en_journal_stats(user_id);

-- Step 4: Drop old RLS policies on narratives
DROP POLICY IF EXISTS "Allow public read" ON en_journal_narratives;
DROP POLICY IF EXISTS "Allow public insert" ON en_journal_narratives;
DROP POLICY IF EXISTS "Allow public update" ON en_journal_narratives;
DROP POLICY IF EXISTS "Allow public delete" ON en_journal_narratives;

-- Step 5: Create new RLS policies for user-specific access on narratives
CREATE POLICY "Users can view own narratives"
  ON en_journal_narratives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own narratives"
  ON en_journal_narratives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own narratives"
  ON en_journal_narratives FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own narratives"
  ON en_journal_narratives FOR DELETE
  USING (auth.uid() = user_id);

-- Step 6: Enable RLS on narratives (should already be enabled, but ensure)
ALTER TABLE en_journal_narratives ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for user_stats
CREATE POLICY "Users can view own stats"
  ON en_journal_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON en_journal_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON en_journal_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stats"
  ON en_journal_stats FOR DELETE
  USING (auth.uid() = user_id);

-- Step 8: Enable RLS on user_stats
ALTER TABLE en_journal_stats ENABLE ROW LEVEL SECURITY;

-- Step 9: Create a function to automatically create user_stats record on first login
CREATE OR REPLACE FUNCTION public.en_journal_create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.en_journal_stats (user_id, updated_at, total_reviews, current_streak, longest_streak, reviews_by_date)
  VALUES (NEW.id, NOW(), 0, 0, 0, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create trigger to auto-create user_stats when a new user signs up
CREATE TRIGGER on_auth_user_created_en_journal
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION en_journal_create_user_stats();

-- Note: Existing narratives will have NULL user_id and won't be visible to any authenticated user.
-- If you need to migrate existing data, run a separate data migration script.
