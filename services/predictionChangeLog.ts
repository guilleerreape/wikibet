/**
 * Prediction Change Log — persists AI probability changes to localStorage.
 * Only used/visible for admin account (bypassActive / code 130823).
 */

export interface PredictionChange {
  id: string;
  timestamp: number;       // ms epoch
  match: string;           // "Uruguay - España"
  type: '1X2' | 'Goles' | 'Ambos marcan' | 'Confianza';
  field: string;           // "Victoria España"
  oldValue: number;        // percentage
  newValue: number;        // percentage
}

const STORAGE_KEY = 'wikibet_pred_changes';
const MAX_LOG = 10;

function isLocalStorageAvailable(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage !== null; }
  catch { return false; }
}

export function getPredictionChanges(): PredictionChange[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PredictionChange[];
  } catch { return []; }
}

export function logPredictionChange(change: Omit<PredictionChange, 'id'>): void {
  if (!isLocalStorageAvailable()) return;
  try {
    const all = getPredictionChanges();
    const entry: PredictionChange = {
      ...change,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    };
    // Keep last MAX_LOG entries, oldest first → newest last
    const updated = [...all, entry].slice(-MAX_LOG);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearPredictionChanges(): void {
  if (!isLocalStorageAvailable()) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

/** Format a single change into the display string shown in the overlay */
export function formatChange(c: PredictionChange): string {
  const d = new Date(c.timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `IA cambió el ${dateStr} a las ${timeStr} en ${c.match}, ${c.type} pasó ${c.field} del ${c.oldValue}% al ${c.newValue}%`;
}

/**
 * Diff two analysis objects and emit log entries for significant changes.
 * Returns number of changes logged.
 */
export function diffAndLogAnalysis(
  matchLabel: string,        // "Uruguay - España"
  prev: Record<string, number>,
  next: Record<string, number>,
  minDelta = 2               // only log if change ≥ 2 pp
): number {
  let count = 0;
  const now = Date.now();

  function check(
    type: PredictionChange['type'],
    field: string,
    oldV: number | undefined,
    newV: number | undefined
  ) {
    if (oldV == null || newV == null) return;
    const delta = Math.abs(newV - oldV);
    if (delta < minDelta) return;
    logPredictionChange({ timestamp: now + count, match: matchLabel, type, field, oldValue: Math.round(oldV), newValue: Math.round(newV) });
    count++;
  }

  check('1X2',   'Victoria local',  prev.homeWinProbability, next.homeWinProbability);
  check('1X2',   'Empate',           prev.drawProbability,    next.drawProbability);
  check('1X2',   'Victoria visitante', prev.awayWinProbability, next.awayWinProbability);
  check('Goles', 'Más de 2.5',       prev.over2_5,           next.over2_5);
  check('Goles', 'Más de 1.5',       prev.over1_5,           next.over1_5);
  check('Ambos marcan', 'Sí',        prev.bothTeamsScoredYes, next.bothTeamsScoredYes);
  check('Confianza', 'Análisis',     prev.confidence,        next.confidence);

  return count;
}
