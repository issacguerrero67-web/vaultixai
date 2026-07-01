-- Run this in your Supabase SQL Editor BEFORE running seed-demo.mjs
-- Dashboard → SQL Editor → New query → paste → Run

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_demo_account BOOLEAN DEFAULT FALSE;

-- Verify the column was added:
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_demo_account';
