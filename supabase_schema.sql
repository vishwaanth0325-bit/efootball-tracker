-- ==============================================================================
-- eFootball Points Tracker - Supabase SQL Schema & Migration Script
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Players Table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  efootball_username TEXT,
  platform TEXT NOT NULL DEFAULT 'Mobile' CHECK (platform IN ('PS5', 'PS4', 'Xbox', 'Mobile', 'PC')),
  profile_image TEXT,
  team TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tournaments Table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL DEFAULT 'league' CHECK (format IN ('league', 'league_knockout', 'knockout', 'group_knockout')),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  points_win INT NOT NULL DEFAULT 3,
  points_draw INT NOT NULL DEFAULT 1,
  points_loss INT NOT NULL DEFAULT 0,
  knockout_qualifiers INT,
  champion_id UUID REFERENCES players(id) ON DELETE SET NULL,
  runner_up_id UUID REFERENCES players(id) ON DELETE SET NULL,
  group_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tournament Players Junction Table
CREATE TABLE IF NOT EXISTS tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  group_name TEXT,
  seed INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- 4. Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage TEXT CHECK (stage IN ('group', 'knockout')),
  group_name TEXT,
  round TEXT,
  match_code TEXT,
  player1_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player1_placeholder TEXT,
  player2_placeholder TEXT,
  scheduled_date DATE,
  scheduled_time TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'postponed', 'cancelled')),
  player1_score INT,
  player2_score INT,
  penalty_player1_score INT,
  penalty_player2_score INT,
  winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  next_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  next_match_slot TEXT,
  source_match_1_id UUID,
  source_match_2_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS) & Public Access Policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access (for client-side app with anon key)
DROP POLICY IF EXISTS "Allow public all on players" ON players;
CREATE POLICY "Allow public all on players" ON players FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on tournaments" ON tournaments;
CREATE POLICY "Allow public all on tournaments" ON tournaments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on tournament_players" ON tournament_players;
CREATE POLICY "Allow public all on tournament_players" ON tournament_players FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on matches" ON matches;
CREATE POLICY "Allow public all on matches" ON matches FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 6. MIGRATION COMMANDS (For existing databases)
-- Run these lines if your database was created with the previous version:
-- ==============================================================================
-- ALTER TABLE players ALTER COLUMN efootball_username DROP NOT NULL;
-- ALTER TABLE players ALTER COLUMN platform SET DEFAULT 'Mobile';
-- ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS champion_id UUID REFERENCES players(id) ON DELETE SET NULL;
-- ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS runner_up_id UUID REFERENCES players(id) ON DELETE SET NULL;
-- ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS group_config JSONB;
-- ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS group_name TEXT;
-- ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS seed INT;
-- ALTER TABLE matches ALTER COLUMN player1_id DROP NOT NULL;
-- ALTER TABLE matches ALTER COLUMN player2_id DROP NOT NULL;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage TEXT;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS group_name TEXT;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_code TEXT;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS player1_placeholder TEXT;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS player2_placeholder TEXT;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_player1_score INT;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_player2_score INT;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES players(id) ON DELETE SET NULL;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS next_match_id UUID REFERENCES matches(id) ON DELETE SET NULL;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS next_match_slot TEXT;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS source_match_1_id UUID;
-- ALTER TABLE matches ADD COLUMN IF NOT EXISTS source_match_2_id UUID;

-- ==============================================================================
-- 7. CRITICAL FIX — Run these in Supabase SQL Editor to fix the live database:
-- ==============================================================================
-- Step 1: Drop the old format constraint (didn't include league_knockout)
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;

-- Step 2: Add the correct constraint with league_knockout included
ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check
  CHECK (format IN ('league', 'league_knockout', 'knockout', 'group_knockout'));

-- Step 3: Add missing knockout_qualifiers column (if not already present)
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS knockout_qualifiers INT;

