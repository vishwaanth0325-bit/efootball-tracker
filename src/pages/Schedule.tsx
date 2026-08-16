import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Match } from '../lib/types';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { ScoreEntry } from '../components/matches/ScoreEntry';
import { Badge } from '../components/ui/Badge';
import { List, Calendar as CalendarIcon, Edit2 } from 'lucide-react';
import { Input } from '../components/ui/Input';

const Schedule: React.FC = () => {
  const { state, updateMatch } = useApp();
  const { showToast } = useToast();

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [tournamentFilter, setTournamentFilter] = useState<string>(state.activeTournamentId || 'all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  const [rescheduleMatchId, setRescheduleMatchId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const filteredMatches = useMemo(() => {
    return state.matches.filter(m => {
      return tournamentFilter === 'all' || m.tournament_id === tournamentFilter;
    }).sort((a, b) => {
      const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
      const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
      return dateA - dateB;
    });
  }, [state.matches, tournamentFilter]);

  const groupedMatches = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    filteredMatches.forEach(m => {
      const dateKey = m.scheduled_date ? m.scheduled_date.split('T')[0] : 'Unscheduled';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(m);
    });
    return groups;
  }, [filteredMatches]);

  const handleSaveReschedule = () => {
    if (rescheduleMatchId && rescheduleDate) {
      const matchToReschedule = state.matches.find(m => m.id === rescheduleMatchId);
      if (matchToReschedule) {
        updateMatch({ ...matchToReschedule, scheduled_date: rescheduleDate });
        showToast('Match rescheduled', 'success');
      }
      setRescheduleMatchId(null);
    }
  };

  const handleSaveScore = (p1Score: number, p2Score: number) => {
    if (selectedMatch) {
      updateMatch({ ...selectedMatch, status: 'completed', player1_score: p1Score, player2_score: p2Score, updated_at: new Date().toISOString() });
      showToast('Score saved', 'success');
      setSelectedMatch(null);
    }
  };

  const renderListView = () => {
    const sortedDates = Object.keys(groupedMatches).sort();
    return (
      <div className="space-y-8">
        {sortedDates.map(date => (
          <div key={date} className="space-y-4">
            <h3 className="font-display text-xl border-b border-border-light pb-2 text-accent">
              {date === 'Unscheduled' ? 'Unscheduled' : new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            <div className="space-y-2">
              {groupedMatches[date].map(match => {
                const p1 = state.players.find(p => p.id === match.player1_id);
                const p2 = state.players.find(p => p.id === match.player2_id);
                const time = match.scheduled_time || (match.scheduled_date && match.scheduled_date.includes('T') ? new Date(match.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
                return (
                  <div key={match.id} className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="bg-surface px-3 py-1 rounded text-sm font-mono flex items-center gap-2">
                        {time || '--:--'}
                        <button className="text-text-muted hover:text-accent" onClick={() => {
                          setRescheduleMatchId(match.id);
                          setRescheduleDate(match.scheduled_date ? match.scheduled_date.slice(0, 16) : '');
                        }}>
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                      <Badge variant={match.status === 'completed' ? 'completed' : 'default'}>{match.status}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4 w-full sm:w-1/2">
                      <span className="font-bold text-right flex-1">{p1?.name}</span>
                      {match.status === 'completed' ? (
                        <span className="font-mono font-bold bg-surface px-3 py-1 rounded">{match.player1_score} - {match.player2_score}</span>
                      ) : (
                        <span className="text-text-muted text-sm px-2">vs</span>
                      )}
                      <span className="font-bold text-left flex-1">{p2?.name}</span>
                    </div>

                    <div className="w-full sm:w-auto text-right">
                      <button 
                        className="btn btn-secondary text-sm py-1 px-3"
                        onClick={() => setSelectedMatch(match)}
                      >
                        {match.status === 'completed' ? 'Edit Score' : 'Enter Result'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-display text-3xl">Schedule</h1>
        <div className="flex gap-2">
          <button className={`btn ${view === 'list' ? 'btn-primary' : 'btn-ghost bg-surface'}`} onClick={() => setView('list')}>
            <List className="w-4 h-4 mr-2" /> List
          </button>
          <button className={`btn ${view === 'calendar' ? 'btn-primary' : 'btn-ghost bg-surface'}`} onClick={() => setView('calendar')}>
            <CalendarIcon className="w-4 h-4 mr-2" /> Calendar
          </button>
        </div>
      </div>

      <div className="card p-4">
        <Select 
          id="scheduleTournamentFilter"
          value={tournamentFilter} 
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTournamentFilter(e.target.value)} 
          className="max-w-xs"
          options={[
            { value: 'all', label: 'All Tournaments' },
            ...state.tournaments.map(t => ({ value: t.id, label: t.name }))
          ]}
        />
      </div>

      {view === 'list' ? renderListView() : (
        <div className="card p-8 text-center text-text-muted">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-display mb-2">Calendar View</h3>
          <p>Calendar view implementation is a placeholder for this example.</p>
          <button className="btn btn-primary mt-4" onClick={() => setView('list')}>Return to List View</button>
        </div>
      )}

      <Modal isOpen={!!rescheduleMatchId} onClose={() => setRescheduleMatchId(null)} title="Reschedule Match">
        <div className="space-y-4">
          <Input
            id="rescheduleDateInput"
            label="New Date & Time"
            type="datetime-local"
            value={rescheduleDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRescheduleDate(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-ghost" onClick={() => setRescheduleMatchId(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveReschedule}>Save</button>
          </div>
        </div>
      </Modal>

      {selectedMatch && (
        <ScoreEntry
          match={selectedMatch}
          player1={state.players.find(p => p.id === selectedMatch.player1_id)!}
          player2={state.players.find(p => p.id === selectedMatch.player2_id)!}
          onSave={handleSaveScore}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
};

export default Schedule;
