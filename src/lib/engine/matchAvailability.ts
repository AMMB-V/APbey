import type { Match } from '../../types/tournament';

export function matchAvailability(matches: Match[]) {
  const players = new Set<string>();
  const stations = new Set<string>();
  const referees = new Set<string>();
  for (const match of matches.filter(item => item.status === 'in_progress')) {
    if (match.participant1Id) players.add(match.participant1Id);
    if (match.participant2Id) players.add(match.participant2Id);
    if (match.station) stations.add(match.station.trim().toLowerCase());
    if (match.refereeId) referees.add(match.refereeId);
  }
  return (match: Match) => {
    if (!match.participant1Id || !match.participant2Id || match.isBye) return 'Cruce por definir';
    if (players.has(match.participant1Id) || players.has(match.participant2Id)) return 'Blader en combate';
    if (match.station && stations.has(match.station.trim().toLowerCase())) return 'Mesa ocupada';
    if (match.refereeId && referees.has(match.refereeId)) return 'Árbitro ocupado';
    return null;
  };
}
