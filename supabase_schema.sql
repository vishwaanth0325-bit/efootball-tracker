-- ==============================================================================
-- eFootball Points Tracker - Supabase SQL Schema
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Players Table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  efootball_username TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('PS5', 'PS4', 'Xbox', 'Mobile', 'PC')),
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
  format TEXT NOT NULL DEFAULT 'league' CHECK (format IN ('league', 'round_robin', 'groups', 'knockout', 'group_knockout')),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  points_win INT NOT NULL DEFAULT 3,
  points_draw INT NOT NULL DEFAULT 1,
  points_loss INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tournament Players Junction Table
CREATE TABLE IF NOT EXISTS tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- 4. Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round TEXT,
  player1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  scheduled_date DATE,
  scheduled_time TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'postponed', 'cancelled')),
  player1_score INT,
  player2_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS) & Public Access Policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write access (suitable for client-side app with anon key)
CREATE POLICY "Allow public all on players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on tournaments" ON tournaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on tournament_players" ON tournament_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on matches" ON matches FOR ALL USING (true) WITH CHECK (true);
