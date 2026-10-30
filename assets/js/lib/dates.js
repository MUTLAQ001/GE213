import { TERM_START, WEEKS, DUES, CLASS_DAYS, BREAKS } from '../../data/term-481.js';
import { weeksPhrase, daysPhrase } from './ar.js';

export const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY = 86400000;
const dayIdx = (y, m, d) => Math.floor(Date.UTC(y, m, d) / DAY);
const localIdx = now => dayIdx(now.getFullYear(), now.getMonth(), now.getDate());
const TERM_IDX = dayIdx(...TERM_START);

/** Calendar weeks (0-based) before teaching week w: its own position plus every break before it. */
const calWeek = w => w - 1 + BREAKS.filter(b => b.after < w).length;

/** Sunday that opens week w (UTC date). */
export const weekStart = w => new Date((TERM_IDX + calWeek(w) * 7) * DAY);

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
  if (diff < 0) return { phase: 'before', week: 1, daysToStart: -diff, weekend: false, cal: Math.floor(diff / 7) };
  const cal = Math.floor(diff / 7), dow = diff % 7;
  let weekend = dow >= 5;
  /* Teaching week of this calendar week; a break week looks ahead to the next teaching week. */
  let raw = 1;
  while (raw <= WEEKS.length && calWeek(raw) < cal) raw++;
  if (calWeek(raw) > cal) weekend = true;
  const week = weekend && calWeek(raw) === cal ? raw + 1 : raw;
  if (week > WEEKS.length) return { phase: 'after', week: WEEKS.length + 1, weekend: false, cal };
  return { phase: 'during', week, weekend, dow, cal };
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

/** Days from today to a UTC class date (negative once it has passed). */
export const daysUntil = (date, now = new Date()) => Math.round(date.getTime() / DAY) - localIdx(now);

/**
 * How close a class is, for colour and wording, both counted in real calendar weeks
 * (so on Friday the coming week is "next week", and a break pushes classes further away).
 *   urgent = today / this week · soon = next week · later = two weeks or more · done = passed
 */
export function proximity(code, state, now = new Date()) {
  const c = parseClass(code);
  if (!c) return { tone: 'later', label: '' };
  if (c.week < state.week) return { tone: 'done', label: 'انتهى' };
  const away = Math.max(0, state.cal == null ? c.week - state.week : calWeek(c.week) - state.cal);
  const tone = away === 0 ? 'urgent' : away === 1 ? 'soon' : 'later';
  const date = classDate(code);
  if (date) {
    const d = daysUntil(date, now);
    return d < 0 ? { tone: 'done', label: 'انتهى', date } : { tone, label: relDays(date, now), date };
  }
  return { tone, label: relWeek(away, 0) };
}

/**
 * Where each assignment stands: the next step the student still has
 * (submission, then the conditional resubmission), or done.
 * Active items come first in class order; finished ones keep their original order.
 */
export function dueStatus(state, now = new Date()) {
  const items = DUES.map(d => {
    const due = proximity(d.due, state, now);
    if (due.tone !== 'done') return { d, kind: 'due', code: d.due, ...due, ...parseClass(d.due) };
    const re = d.re ? proximity(d.re, state, now) : null;
    if (re && re.tone !== 'done') return { d, kind: 'resubmit', code: d.re, ...re, ...parseClass(d.re) };
    return { d, kind: 'done', code: d.due, tone: 'done', label: 'انتهى', ...parseClass(d.due) };
  });
  const active = items.filter(x => x.kind !== 'done').sort((x, y) => x.week - y.week || x.slot - y.slot || x.d.n - y.d.n);
  return { active, done: items.filter(x => x.kind === 'done') };
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

export { WEEKS, DUES, CLASS_DAYS, BREAKS };
