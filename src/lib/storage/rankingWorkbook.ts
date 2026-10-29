import readXlsxFile, { readSheetNames } from 'read-excel-file';
import { BladerRanking, HallOfFameEntry } from '../../types/rankings';

export interface RankingWorkbookData {
  rankings: BladerRanking[];
  hallOfFame: HallOfFameEntry[];
}

const value = (row: Record<string, unknown>, ...keys: string[]) => {
  const key = Object.keys(row).find((candidate) =>
    keys.includes(candidate.trim().toLowerCase())
  );
  return key ? row[key] : undefined;
};

const text = (row: Record<string, unknown>, ...keys: string[]) =>
  String(value(row, ...keys) ?? '').trim();

const number = (row: Record<string, unknown>, ...keys: string[]) => {
  const parsed = Number(value(row, ...keys));
  return Number.isFinite(parsed) ? parsed : 0;
};

const sheetRows = async (file: File, sheetNames: string[], preferredNames: string[]) => {
  const sheetName =
    sheetNames.find((name) => preferredNames.includes(name.trim().toLowerCase())) || sheetNames[0];
  if (!sheetName) return [];
  const rows = await readXlsxFile(file, { sheet: sheetName });
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => String(header ?? '').trim());
  return rows.slice(1).map((row) =>
    headers.reduce<Record<string, unknown>>((result, header, index) => {
      if (header) result[header] = row[index];
      return result;
    }, {})
  );
};

export async function parseRankingWorkbook(file: File): Promise<RankingWorkbookData> {
  const sheetNames = await readSheetNames(file);
  const rankingRows = await sheetRows(file, sheetNames, ['rankings', 'ranking', 'bladers', 'bladers rankings']);
  const hallOfFameSheet = sheetNames.find((name) =>
    ['halloffame', 'hall of fame', 'salon de la fama', 'salón de la fama'].includes(
      name.trim().toLowerCase()
    )
  );
  const hallOfFameRows = hallOfFameSheet ? await sheetRows(file, sheetNames, [hallOfFameSheet.toLowerCase()]) : [];

  const rankings = rankingRows
    .map((row, index) => {
      const name = text(row, 'name', 'blader', 'jugador', 'nombre');
      if (!name) return null;
      return {
        id: text(row, 'id') || `ranking-${index + 1}`,
        name,
        points: number(row, 'points', 'puntos'),
        elo: number(row, 'elo', 'rating elo', 'rating'),
        wins: number(row, 'wins', 'victorias', 'v'),
        losses: number(row, 'losses', 'derrotas', 'd'),
        tournamentsWon: number(row, 'tournamentswon', 'torneos', 'torneos ganados', 'wins tournaments'),
        favoriteCombo: text(row, 'favoritecombo', 'combo favorito', 'combo'),
      } satisfies BladerRanking;
    })
    .filter((entry) => entry !== null) as BladerRanking[];

  const hallOfFame = hallOfFameRows
    .map((row, index) => {
      const champion = text(row, 'champion', 'campeón', 'campeon');
      if (!champion) return null;
      return {
        id: text(row, 'id') || `hof-${index + 1}`,
        tournamentTitle: text(row, 'tournamenttitle', 'torneo', 'tournament', 'nombre del torneo'),
        champion,
        runnerUp: text(row, 'runnerup', 'subcampeón', 'subcampeon'),
        date: text(row, 'date', 'fecha'),
        winningCombo: text(row, 'winningcombo', 'combo ganador'),
        participantsCount: number(row, 'participantscount', 'participantes', 'bladers'),
      } satisfies HallOfFameEntry;
    })
    .filter((entry) => entry !== null) as HallOfFameEntry[];

  if (rankings.length === 0 && hallOfFame.length === 0) {
    throw new Error('El archivo no contiene filas válidas de Rankings ni Salón de la Fama.');
  }

  return { rankings, hallOfFame };
}
