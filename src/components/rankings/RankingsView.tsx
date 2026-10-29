import React, { useState } from 'react';
import { TrendingUp, Award, Trophy, Search, User, Sparkles, Star } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';

interface BladerRanking {
  id: string;
  name: string;
  points: number;
  elo: number;
  wins: number;
  losses: number;
  tournamentsWon: number;
  favoriteCombo: string;
}

const INITIAL_RANKINGS: BladerRanking[] = [
  { id: '1', name: 'Alex M.', points: 1420, elo: 1845, wins: 48, losses: 9, tournamentsWon: 5, favoriteCombo: 'Phoenix Wing 9-60P' },
  { id: '2', name: 'Carlos R.', points: 1290, elo: 1780, wins: 41, losses: 14, tournamentsWon: 3, favoriteCombo: 'Hells Scythe 3-60B' },
  { id: '3', name: 'Valerie K.', points: 1180, elo: 1720, wins: 38, losses: 12, tournamentsWon: 2, favoriteCombo: 'Shark Edge 4-60F' },
  { id: '4', name: 'Mateo D.', points: 1040, elo: 1650, wins: 31, losses: 16, tournamentsWon: 2, favoriteCombo: 'Wizard Arrow 5-60B' },
  { id: '5', name: 'Diego B.', points: 980, elo: 1610, wins: 28, losses: 18, tournamentsWon: 1, favoriteCombo: 'Dran Sword 3-60F' },
  { id: '6', name: 'Lucia G.', points: 890, elo: 1560, wins: 24, losses: 15, tournamentsWon: 1, favoriteCombo: 'Unicorn Sting 5-60P' },
  { id: '7', name: 'Andres V.', points: 760, elo: 1490, wins: 19, losses: 20, tournamentsWon: 0, favoriteCombo: 'Knight Shield 4-80N' },
  { id: '8', name: 'Javier S.', points: 690, elo: 1440, wins: 16, losses: 22, tournamentsWon: 0, favoriteCombo: 'Viper Tail 3-80O' },
];

interface HallOfFameEntry {
  id: string;
  tournamentTitle: string;
  champion: string;
  runnerUp: string;
  date: string;
  winningCombo: string;
  participantsCount: number;
}

const HALL_OF_FAME: HallOfFameEntry[] = [
  {
    id: 'hof-1',
    tournamentTitle: 'Torneo Apertura Beyblade X Panamá 2026',
    champion: 'Alex M.',
    runnerUp: 'Carlos R.',
    date: '15 de Enero, 2026',
    winningCombo: 'Phoenix Wing 9-60 Point',
    participantsCount: 32,
  },
  {
    id: 'hof-2',
    tournamentTitle: 'Copa Xtreme Stadium Invitational',
    champion: 'Carlos R.',
    runnerUp: 'Valerie K.',
    date: '28 de Febrero, 2026',
    winningCombo: 'Hells Scythe 3-60 Ball',
    participantsCount: 24,
  },
  {
    id: 'hof-3',
    tournamentTitle: 'Grand Prix WBO Ciudad de Panamá',
    champion: 'Alex M.',
    runnerUp: 'Mateo D.',
    date: '22 de Marzo, 2026',
    winningCombo: 'Phoenix Wing 9-60 Rush',
    participantsCount: 48,
  },
];

export const RankingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'points' | 'elo' | 'hof'>('points');
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser } = useTournament();

  const filteredBladers = INITIAL_RANKINGS.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (activeSubTab === 'elo') return b.elo - a.elo;
    return b.points - a.points;
  });

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 w-full flex flex-col gap-5">
      {/* View Header with accessible h1 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--hueso)] font-display tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-400 shrink-0" aria-hidden="true" />
            <span>Rankings WBO & Salón de la Fama</span>
          </h1>
          <p className="text-xs text-[var(--acero)] mt-0.5">
            Clasificación competitiva oficial por puntos acumulados, rating ELO y palmarés histórico
          </p>
        </div>
      </div>

      {/* Tabs with role="tablist" */}
      <div
        role="tablist"
        aria-label="Modalidad de ranking"
        className="grid grid-cols-3 p-1 bg-[var(--chasis)] border border-[var(--costura)] rounded-2xl"
      >
        <button
          role="tab"
          type="button"
          aria-selected={activeSubTab === 'points'}
          onClick={() => setActiveSubTab('points')}
          className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
            activeSubTab === 'points'
              ? 'bg-[var(--cobalto)] text-[var(--tinta)] shadow-md font-black'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Por Puntos</span>
        </button>

        <button
          role="tab"
          type="button"
          aria-selected={activeSubTab === 'elo'}
          onClick={() => setActiveSubTab('elo')}
          className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
            activeSubTab === 'elo'
              ? 'bg-[var(--cobalto)] text-[var(--tinta)] shadow-md font-black'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Ranking ELO</span>
        </button>

        <button
          role="tab"
          type="button"
          aria-selected={activeSubTab === 'hof'}
          onClick={() => setActiveSubTab('hof')}
          className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
            activeSubTab === 'hof'
              ? 'bg-[var(--cobalto)] text-[var(--tinta)] shadow-md font-black'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Salón de la Fama</span>
        </button>
      </div>

      {/* Search Input for Bladers */}
      {activeSubTab !== 'hof' && (
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--acero)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar blader por nombre..."
            aria-label="Buscar blader"
            className="w-full bg-[var(--chasis)] border border-[var(--costura)] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[var(--hueso)] placeholder-[var(--acero)] focus:border-[var(--cobalto)] outline-hidden min-h-[44px]"
          />
        </div>
      )}

      {/* Points / ELO Table */}
      {activeSubTab !== 'hof' && (
        <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--costura)] bg-[var(--grafito)] text-[var(--acero)] font-semibold text-[11px] uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4 w-12 text-center">#</th>
                  <th scope="col" className="py-3 px-4">Blader</th>
                  <th scope="col" className="py-3 px-4 text-center">
                    {activeSubTab === 'points' ? 'Puntos' : 'Rating ELO'}
                  </th>
                  <th scope="col" className="py-3 px-4 text-center hidden sm:table-cell">V / D</th>
                  <th scope="col" className="py-3 px-4 text-center hidden md:table-cell">Torneos</th>
                  <th scope="col" className="py-3 px-4 hidden md:table-cell">Combo Favorito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--costura)]/50">
                {filteredBladers.map((b, index) => {
                  const isCurrent = currentUser?.displayName?.toLowerCase() === b.name.toLowerCase();
                  const rank = index + 1;
                  const rankBadge =
                    rank === 1
                      ? 'bg-amber-400 text-black font-black'
                      : rank === 2
                      ? 'bg-slate-300 text-black font-black'
                      : rank === 3
                      ? 'bg-amber-700 text-white font-black'
                      : 'text-[var(--acero)] font-bold';

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-[var(--grafito)] transition-colors ${
                        isCurrent ? 'bg-[var(--cobalto)]/15 border-l-4 border-l-[var(--cobalto)]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${rankBadge}`}>
                          {rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[var(--hueso)]">
                        <div className="flex items-center gap-2">
                          <span>{b.name}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--cobalto)] text-[var(--tinta)] text-[10px] font-black">
                              Tú
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-sm text-purple-300">
                        {activeSubTab === 'points' ? b.points.toLocaleString() : b.elo}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-[var(--acero)] hidden sm:table-cell">
                        <span className="text-emerald-400 font-bold">{b.wins}V</span> - <span className="text-rose-400">{b.losses}D</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-amber-400 font-bold hidden md:table-cell">
                        {b.tournamentsWon > 0 ? `🏆 ${b.tournamentsWon}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[var(--acero)] truncate max-w-xs hidden md:table-cell">
                        {b.favoriteCombo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salón de la Fama Cards */}
      {activeSubTab === 'hof' && (
        <div className="flex flex-col gap-4">
          {HALL_OF_FAME.map((entry) => (
            <div
              key={entry.id}
              className="bg-[var(--chasis)] border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>Torneo Oficial Certificado</span>
                    <span className="text-[var(--acero)] font-normal">• {entry.date}</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--hueso)]">
                    {entry.tournamentTitle}
                  </h2>
                </div>
                <span className="text-xs font-mono text-[var(--acero)] px-3 py-1 rounded-full bg-[var(--grafito)] border border-[var(--costura)]">
                  {entry.participantsCount} Bladers
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-600/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black text-lg shrink-0">
                    🥇
                  </div>
                  <div>
                    <div className="text-[10px] text-amber-300 uppercase tracking-wider font-bold">
                      Campeón
                    </div>
                    <div className="text-sm font-black text-amber-100">{entry.champion}</div>
                    <div className="text-xs text-amber-300/80 font-mono mt-0.5">
                      {entry.winningCombo}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-300 text-black flex items-center justify-center font-black text-lg shrink-0">
                    🥈
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--acero)] uppercase tracking-wider font-bold">
                      Subcampeón
                    </div>
                    <div className="text-sm font-bold text-[var(--hueso)]">{entry.runnerUp}</div>
                    <div className="text-xs text-[var(--acero)] mt-0.5">Finalista destacado</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
