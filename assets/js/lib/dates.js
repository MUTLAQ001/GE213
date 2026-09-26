import { TERM_START, WEEKS, DUES, CLASS_DAYS } from '../../data/term-481.js';
import { weeksPhrase, daysPhrase } from './ar.js';

export const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY = 86400000;
const dayIdx = (y, m, d) => Math.floor(Date.UTC(y, m, d) / DAY);
const localIdx = now => dayIdx(now.getFullYear(), now.getMonth(), now.getDate());
const TERM_IDX = dayIdx(...TERM_START);

/** Sunday that opens week w (UTC date). */
export const weekStart = w => new Date((TERM_IDX + (w - 1) * 7) * DAY);

/** "20 – 24 سبتمبر" or "27 سبتمبر – 1 أكتوبر" (Sunday to Thursday). */
export const weekRange = w => {
  const a = weekStart(w), b = new Date(a.getTime() + 4 * DAY);
  const ma = AR_MONTHS[a.getUTCMonth()], mb = AR_MONTHS[b.getUTCMonth()];
  return ma === mb ? `${a.getUTCDate()} – ${b.getUTCDate()} ${mb}` : `${a.getUTCDate()} ${ma} – ${b.getUTCDate()} ${mb}`;
};

/** "الأحد 27 سبتمبر" for a UTC date. */
export const fmtDay = d => `${AR_DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]}`;

/**
 * Where the term stands today. Sunday–Thursday belong to their week; Friday and
 * Saturday already look ahead to the coming week, which is what students plan for.
 */
export function academicState(now = new Date()) {
  const diff = localIdx(now) - TERM_IDX;
  if (diff < 0) return { phase: 'before', week: 1, daysToStart: -diff, weekend: false };
  const raw = Math.floor(diff / 7) + 1, dow = diff % 7;
  const weekend = dow >= 5;
  const week = weekend ? raw + 1 : raw;
  if (week > WEEKS.length) return { phase: 'after', week: WEEKS.length + 1, weekend: false };
  return { phase: 'during', week, weekend, dow };
}

/** "4-1" → {week: 4, slot: 1}. Accepts "14-1 / 14-2" (uses the first code). */
export const parseClass = code => {
  const m = /^(\d+)-(\d+)/.exec(String(code || ''));
  return m ? { week: +m[1], slot: +m[2] } : null;
};

/** Exact class date when CLASS_DAYS is configured, otherwise null. */
export const classDate = code => {
  const c = parseClass(code);
  if (!c || !Array.isArray(CLASS_DAYS) || CLASS_DAYS[c.slot - 1] == null) return null;
  return new Date(weekStart(c.week).getTime() + CLASS_DAYS[c.slot - 1] * DAY);
};

/** Relative wording for a target week seen from the current academic week. */
export function relWeek(target, current) {
  const d = target - current;
  if (d < 0) return 'انتهى';
  if (d === 0) return 'هذا الأسبوع';
  if (d === 1) return 'الأسبوع القادم';
  return `بعد ${weeksPhrase(d)}`;
}

/** Relative wording in days (used only when CLASS_DAYS is known). */
export function relDays(date, now = new Date()) {
  const d = Math.round(date.getTime() / DAY) - localIdx(now);
  if (d < 0) return 'انتهى';
  if (d === 0) return 'اليوم';
  if (d === 1) return 'غدًا';
  return `بعد ${daysPhrase(d)}`;
}

/** Student actions from DUES (submissions and resubmissions), in class order. */
export function studentEvents(dues = DUES) {
  const ev = [];
  for (const d of dues) {
    const a = parseClass(d.due);
    if (a) ev.push({ kind: 'due', n: d.n, title: d.t, type: d.k, code: d.due, ...a });
    const r = parseClass(d.re);
    if (r) ev.push({ kind: 'resubmit', n: d.n, title: d.t, type: d.k, code: d.re, ...r });
  }
  return ev.sort((x, y) => x.week - y.week || x.slot - y.slot || (x.kind === 'due' ? -1 : 1));
}

/** Next student actions from the current academic week on. */
export function upcomingEvents(state, limit = 3) {
  return studentEvents().filter(e => e.week >= state.week).slice(0, limit);
}

/** Weeks that contain a student action (for the week strip markers). */
export const weeksWithDeadlines = () => new Set(studentEvents().map(e => e.week));

export { WEEKS, DUES, CLASS_DAYS };
