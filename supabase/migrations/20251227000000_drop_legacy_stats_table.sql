-- Migration: Drop legacy user stats table
-- Date: 2025-12-27
-- Description: Remove the legacy en_journal_user_stats_legacy table that was renamed
--              during the authentication migration and is no longer in use.

-- Drop legacy table and its policies
DROP TABLE IF EXISTS en_journal_user_stats_legacy CASCADE;
