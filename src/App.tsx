import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import PlayerProfile from './pages/PlayerProfile';
import Tournaments from './pages/Tournaments';
import TournamentDetails from './pages/TournamentDetails';
import Matches from './pages/Matches';
import Statistics from './pages/Statistics';

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AppProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/players" element={<Players />} />
              <Route path="/players/:playerId" element={<PlayerProfile />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournaments/:tournamentId" element={<TournamentDetails />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </AppProvider>
      </ToastProvider>
    </HashRouter>
  );
}
