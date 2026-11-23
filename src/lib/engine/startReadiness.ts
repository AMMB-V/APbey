import type { Participant, Stage, Tournament } from '../../types/tournament';

export function startReadiness(tournament: Tournament, stage: Stage | undefined, participants: Participant[]) {
  const eligible = participants.filter(player => player.tournamentId === tournament.id &&
    player.status !== 'withdrawn' && (!tournament.checkInRequired || player.checkedIn));
  const issues: { target: 'participants' | 'stages'; message: string }[] = [];
  if (!stage) issues.push({ target: 'stages', message: 'Configura la primera etapa.' });
  if (eligible.length < 2) issues.push({ target: 'participants', message: tournament.checkInRequired
    ? 'Confirma el check-in de al menos dos bladers activos.'
    : 'Registra al menos dos bladers activos.' });
  if (stage?.type === 'group_stage' && stage.config.stageStructure === 'two_stage' &&
    (stage.config.advanceCount ?? 2) > Math.min(eligible.length, stage.config.groupSize ?? 4)) {
    issues.push({ target: 'stages', message: 'Reduce los clasificados por grupo o ajusta el tamaño del grupo.' });
  }
  return issues;
}
