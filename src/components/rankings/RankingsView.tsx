import React, { useEffect, useMemo, useState } from 'react';
import { Award, Search, Sparkles, Star, TrendingUp, Trophy } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { competitiveHistory } from '../../lib/engine/competitiveHistory';
import { IMPORTED_ELO_ID_PREFIX } from '../../types/rankings';

export const RankingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'points' | 'elo' | 'hof'>(() => {
    if (typeof window === 'undefined') return 'points';
    const requested = new URLSearchParams(window.location.search).get('ranking');
    return requested === 'elo' || requested === 'hof' ? requested : 'points';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser, rankings, hallOfFame, tournaments, stages, rounds, matches, participants, battles, penalties } = useTournament();
  const [selectedSeason, setSelectedSeason] = useState<1 | 2 | null>(null);
  const season = selectedSeason ?? (rankings.some(row => row.season === 2) || hallOfFame.some(row => row.season === 2) ? 2 : 1);
  const seasonRankings = rankings.filter(row => (row.season ?? 1) === season);
  const history = useMemo(() => competitiveHistory(tournaments.filter(event => {
    const date = event.startsAt.slice(0, 10);
    return season === 1 ? date >= '2025-12-27' && date <= '2026-06-30' : date >= '2026-07-01';
  }), stages, rounds, matches, participants, battles, penalties),
    [season, tournaments, stages, rounds, matches, participants, battles, penalties]);
  const hasCalculatedElo = history.ratings.length > 0;
  const importedElo = seasonRankings.filter(blader => blader.id.startsWith(IMPORTED_ELO_ID_PREFIX));
  const leaderboard = activeSubTab === 'elo'
    ? (importedElo.length ? importedElo : hasCalculatedElo ? history.ratings : seasonRankings.filter(blader => blader.elo > 0))
    : seasonRankings.filter(blader => !blader.id.startsWith(IMPORTED_ELO_ID_PREFIX));
  const awards = [...history.awards, ...hallOfFame.filter(entry => (entry.season ?? 1) === season && !history.awards.some(award =>
    award.tournamentTitle.trim().toLowerCase() === entry.tournamentTitle.trim().toLowerCase() && award.date === entry.date))];

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('ranking', activeSubTab);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    document.title = `APbey | ${activeSubTab === 'hof' ? 'Salón de la Fama' : activeSubTab === 'elo' ? 'Ranking ELO' : 'Rankings'}`;
  }, [activeSubTab]);

  useEffect(() => {
    const handleNavigation = () => {
      const requested = new URLSearchParams(window.location.search).get('ranking');
      if (requested === 'points' || requested === 'elo' || requested === 'hof') setActiveSubTab(requested);
    };
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  const filteredBladers = leaderboard
    .filter((blader) => blader.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (activeSubTab === 'elo' ? b.elo - a.elo : b.points - a.points));

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 w-full flex flex-col gap-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--hueso)] font-display tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-purple-400 shrink-0" aria-hidden="true" />
          <span>Rankings WBO y Salón de la Fama</span>
        </h1>
        <p className="text-xs text-[var(--acero)] mt-0.5">
          {activeSubTab === 'points' ? 'Puntos publicados por la administración de la liga' :
            activeSubTab === 'elo' ? (importedElo.length ? 'Clasificación Elo publicada por la liga.' : hasCalculatedElo ? 'Calculado con combates de torneos públicos finalizados. Elo inicial de 1500.' :
              'El Elo automático se genera con resultados individuales de torneos públicos finalizados.') :
            'Resultados de torneos públicos finalizados y campeonatos importados.'}
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold">Temporada
        <select value={season} onChange={event => setSelectedSeason(event.target.value === '2' ? 2 : 1)}
          className="min-h-11 rounded-xl border border-[var(--costura)] bg-[var(--chasis)] px-3">
          <option value="1">Temporada 1</option>
          <option value="2">Temporada 2</option>
        </select>
      </label>
      <div role="tablist" aria-label="Modalidad de ranking" className="grid grid-cols-3 p-1 bg-[var(--chasis)] border border-[var(--costura)] rounded-2xl">
        {([
          ['points', <Trophy className="w-4 h-4" />, 'Por Puntos'],
          ['elo', <Sparkles className="w-4 h-4" />, 'Ranking ELO'],
          ['hof', <Award className="w-4 h-4" />, 'Salón de la Fama'],
        ] as const).map(([tab, icon, label]) => (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={activeSubTab === tab}
            onClick={() => setActiveSubTab(tab)}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
              activeSubTab === tab ? 'bg-[var(--cobalto)] text-[var(--tinta)] shadow-md font-black' : 'text-[var(--acero)] hover:text-[var(--hueso)]'
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {activeSubTab !== 'hof' && leaderboard.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--acero)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar blader por nombre..."
            aria-label="Buscar blader"
            className="w-full bg-[var(--chasis)] border border-[var(--costura)] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[var(--hueso)] placeholder-[var(--acero)] focus:border-[var(--cobalto)] outline-hidden min-h-[44px]"
          />
        </div>
      )}

      {activeSubTab !== 'hof' && (
        leaderboard.length === 0 ? (
          <EmptyState message={activeSubTab === 'elo' ? 'Todavía no hay resultados para calcular el Elo.' : 'Los rankings todavía no tienen datos publicados.'}
            detail={activeSubTab === 'elo' ? 'Los totales de victorias y derrotas del Excel se consultan en Por Puntos. El Elo requiere saber quién se enfrentó a quién y el resultado de cada combate.' : undefined} />
        ) : (
          <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--costura)] bg-[var(--grafito)] text-[var(--acero)] font-semibold text-[11px] uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4 w-12 text-center">#</th>
                    <th scope="col" className="py-3 px-4">Blader</th>
                    <th scope="col" className="py-3 px-4 text-center">{activeSubTab === 'points' ? 'Puntos' : 'Rating ELO'}</th>
                    <th scope="col" className="py-3 px-4 text-center hidden sm:table-cell">V / D</th>
                    <th scope="col" className="py-3 px-4 text-center hidden md:table-cell">Torneos</th>
                    <th scope="col" className="py-3 px-4 hidden md:table-cell">Combo Favorito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--costura)]/50">
                  {filteredBladers.map((blader, index) => {
                    const isCurrent = currentUser?.displayName?.toLowerCase() === blader.name.toLowerCase();
                    return (
                      <tr key={blader.id} className={`hover:bg-[var(--grafito)] transition-colors ${isCurrent ? 'bg-[var(--cobalto)]/15 border-l-4 border-l-[var(--cobalto)]' : ''}`}>
                        <td className="py-3.5 px-4 text-center font-mono">{index + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-[var(--hueso)]">
                          <span>{blader.name}</span>
                          {isCurrent && <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--cobalto)] text-[var(--tinta)] text-[10px] font-black">Tú</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-sm text-purple-300">
                          {activeSubTab === 'points' ? blader.points.toLocaleString() : blader.elo.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-[var(--acero)] hidden sm:table-cell">
                          <span className="text-emerald-400 font-bold">{blader.wins}V</span> - <span className="text-rose-400">{blader.losses}D</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-amber-400 font-bold hidden md:table-cell">
                          {blader.tournamentsWon || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[var(--acero)] truncate max-w-xs hidden md:table-cell">{blader.favoriteCombo || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeSubTab === 'hof' && (
        awards.length === 0 ? (
          <EmptyState message="Todavía no hay campeonatos en el Salón de la Fama."
            detail="Se completa con campeones y subcampeones de torneos públicos finalizados o con la hoja HallOfFame de un Excel." />
        ) : (
          <div className="flex flex-col gap-4">
            {awards.map((entry) => (
              <article key={entry.id} className="bg-[var(--chasis)] border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                      <span>Torneo oficial</span>
                      {entry.date && <span className="text-[var(--acero)] font-normal">• {entry.date}</span>}
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-[var(--hueso)]">{entry.tournamentTitle || 'Torneo sin nombre'}</h2>
                  </div>
                  {entry.participantsCount ? <span className="text-xs font-mono text-[var(--acero)] px-3 py-1 rounded-full bg-[var(--grafito)] border border-[var(--costura)]">{entry.participantsCount} Bladers</span> : null}
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-600/50">
                  <div className="text-[10px] text-amber-300 uppercase tracking-wider font-bold">Campeón</div>
                  <div className="text-sm font-black text-amber-100">{entry.champion}</div>
                  {entry.runnerUp && <div className="text-xs text-[var(--acero)]">Subcampeón · {entry.runnerUp}</div>}
                  {entry.winningCombo && <div className="text-xs text-amber-300/80 font-mono mt-0.5">{entry.winningCombo}</div>}
                </div>
              </article>
            ))}
          </div>
        )
      )}
    </div>
  );
};

const EmptyState: React.FC<{ message: string; detail?: string }> = ({ message, detail }) => (
  <div className="bg-[var(--chasis)] border border-dashed border-[var(--costura)] rounded-3xl p-8 text-center">
    <p className="text-sm font-semibold text-[var(--hueso)]">{message}</p>
    <p className="text-xs text-[var(--acero)] mt-2">{detail ?? 'Un administrador puede cargar la información oficial desde Gestionar.'}</p>
  </div>
);
