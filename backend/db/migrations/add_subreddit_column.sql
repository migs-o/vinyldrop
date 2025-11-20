-- Migration: Add subreddit column to releases table
-- This migration is safe to run multiple times (idempotent)

-- Add subreddit column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'releases' AND column_name = 'subreddit'
    ) THEN
        ALTER TABLE releases ADD COLUMN subreddit VARCHAR(100);
        RAISE NOTICE 'Added subreddit column';
    ELSE
        RAISE NOTICE 'Subreddit column already exists';
    END IF;
END $$;

-- Add index if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'releases' AND indexname = 'idx_releases_subreddit'
    ) THEN
        CREATE INDEX idx_releases_subreddit ON releases(subreddit);
        RAISE NOTICE 'Added subreddit index';
    ELSE
        RAISE NOTICE 'Subreddit index already exists';
    END IF;
END $$;

