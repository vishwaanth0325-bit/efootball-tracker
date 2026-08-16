import type { Player, Tournament, TournamentPlayer, Match } from './types';
import { generateFixtures } from './fixtures';

function uid(): string {
  return crypto.randomUUID();
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function isoNow(daysAgo: number = 0, hoursAgo: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

// ─── Players ──────────────────────────────────────────────────────────────────

const PLAYER_DATA = [
  { name: 'Vishwa', username: 'VishwaEF', platform: 'PS5', team: 'FC Barcelona' },
  { name: 'Arun', username: 'ArunKing', platform: 'PS5', team: 'Real Madrid' },
  { name: 'Karthik', username: 'Karthik99', platform: 'PS4', team: 'Manchester City' },
  { name: 'Rahul', username: 'RahulFC', platform: 'PS5', team: 'Liverpool' },
  { name: 'Sanjay', username: 'SanjayGoal', platform: 'Mobile', team: 'PSG' },
  { name: 'Priya', username: 'PriyaPlay', platform: 'PS5', team: 'Chelsea' },
  { name: 'Deepak', username: 'DeepakFC', platform: 'Xbox', team: 'Bayern Munich' },
  { name: 'Vijay', username: 'VijayBaller', platform: 'PS4', team: 'Juventus' },
  { name: 'Suresh', username: 'SureshEF', platform: 'Mobile', team: 'Atletico Madrid' },
  { name: 'Anand', username: 'AnandGoal', platform: 'PS5', team: 'AC Milan' },
  { name: 'Kumar', username: 'KumarFC', platform: 'PS4', team: 'Arsenal' },
  { name: 'Ravi', username: 'RaviSkills', platform: 'PC', team: 'Borussia Dortmund' },
  { name: 'Venkat', username: 'VenkatEF', platform: 'PS5', team: 'Inter Milan' },
  { name: 'Mohan', username: 'MohanPro', platform: 'Mobile', team: 'Manchester United' },
  { name: 'Arjun', username: 'ArjunFC', platform: 'PS4', team: 'Tottenham' },
  { name: 'Bala', username: 'BalaPlay', platform: 'PS5', team: 'Napoli' },
] as const;

export function buildSeedData(): {
  players: Player[];
  tournaments: Tournament[];
  tournamentPlayers: TournamentPlayer[];
  matches: Match[];
} {
  // ── Players ───────────────────────────────────────────────────────────────
  const players: Player[] = PLAYER_DATA.map((p, i) => ({
    id: uid(),
    name: p.name,
    efootball_username: p.username,
    platform: p.platform as Player['platform'],
    team: p.team,
    notes: '',
    status: 'active',
    created_at: isoNow(30 - i),
  }));

  // ── Tournament ────────────────────────────────────────────────────────────
  const tournamentId = uid();
  const tournament: Tournament = {
    id: tournamentId,
    name: 'eFootball Championship',
    season: 'Season 1',
    description: 'The inaugural eFootball Championship featuring 16 players in a full round-robin league format.',
    format: 'league',
    start_date: isoDate(-25),
    end_date: isoDate(95),
    status: 'ongoing',
    points_win: 3,
    points_draw: 1,
    points_loss: 0,
    created_at: isoNow(30),
  };

  // ── Tournament Players ─────────────────────────────────────────────────────
  const tournamentPlayers: TournamentPlayer[] = players.map((p, i) => ({
    id: uid(),
    tournament_id: tournamentId,
    player_id: p.id,
    created_at: isoNow(29 - i),
  }));

  // ── Fixtures (single round robin = 120 matches) ───────────────────────────
  const fixtureTemplates = generateFixtures(
    tournamentId,
    players.map((p) => p.id),
    false,
    []
  );

  // Create all match records; complete the first ~72 with realistic scores
  const matches: Match[] = fixtureTemplates.map((f, i) => {
    const matchId = uid();
    const dayOffset = -24 + Math.floor(i / 5); // spread over last 24 days
    const scheduledDate = isoDate(dayOffset);
    const hour = 18 + (i % 4);
    const scheduledTime = `${String(hour).padStart(2, '0')}:00`;

    if (i < 72) {
      // Completed match with realistic score
      const scores = realisticScore(i);
      return {
        id: matchId,
        tournament_id: tournamentId,
        round: f.round,
        player1_id: f.player1_id,
        player2_id: f.player2_id,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status: 'completed',
        player1_score: scores[0],
        player2_score: scores[1],
        created_at: isoNow(24 - Math.floor(i / 5)),
        updated_at: isoNow(24 - Math.floor(i / 5)),
      };
    }

    // Upcoming
    const upcomingDay = Math.floor((i - 72) / 4) + 1;
    return {
      id: matchId,
      tournament_id: tournamentId,
      round: f.round,
      player1_id: f.player1_id,
      player2_id: f.player2_id,
      scheduled_date: isoDate(upcomingDay),
      scheduled_time: scheduledTime,
      status: 'upcoming',
      created_at: isoNow(0),
      updated_at: isoNow(0),
    };
  });

  return { players, tournaments: [tournament], tournamentPlayers, matches };
}

/** Generate a realistic eFootball score based on a seed index */
function realisticScore(seed: number): [number, number] {
  const patterns: [number, number][] = [
    [3, 1], [2, 0], [1, 1], [4, 2], [2, 1], [0, 0], [3, 2], [1, 0],
    [2, 2], [5, 1], [1, 3], [0, 1], [3, 0], [2, 3], [1, 2], [4, 1],
    [0, 2], [3, 3], [2, 0], [1, 4], [0, 3], [3, 1], [1, 1], [2, 2],
    [4, 0], [1, 2], [2, 1], [3, 2], [0, 1], [1, 0], [5, 2], [2, 4],
    [1, 3], [3, 0], [2, 2], [4, 3], [0, 0], [1, 1], [3, 1], [2, 3],
    [1, 0], [4, 2], [2, 1], [0, 2], [3, 3], [1, 4], [2, 0], [3, 2],
    [0, 1], [1, 2], [4, 1], [2, 3], [3, 0], [1, 1], [0, 3], [2, 2],
    [3, 1], [1, 0], [4, 4], [2, 1], [0, 2], [3, 2], [1, 3], [4, 0],
    [2, 2], [1, 1], [3, 1], [2, 0], [0, 1], [3, 3], [1, 2], [4, 1],
  ];
  return patterns[seed % patterns.length];
}
