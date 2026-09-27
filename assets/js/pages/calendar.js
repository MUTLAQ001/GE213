import { h, cx, useState, useEffect, useRef, Fragment } from '../lib/react.js';
import {
  WEEKS, DUES, CLASS_DAYS, weekRange, weekStart, fmtDay, academicState, parseClass, classDate,
  relWeek, relDays, upcomingEvents, weeksWithDeadlines,
} from '../lib/dates.js';
import { daysPhrase } from '../lib/ar.js';
import { FILES, ASSIGN1, ASSIGN2, FILE_LINKS } from '../../data/files.js';
import { TERM } from '../../data/term-481.js';
import { Icon } from '../components/icons.js';
import { PageHead, Section, Chip, Code, Callout } from '../components/ui.js';

const ALL_FILES = [...FILES, ...ASSIGN1, ...ASSIGN2];
const DEADLINE_WEEKS = weeksWithDeadlines();
const reducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const typeIcon = k => (k === 'جماعي' ? 'users' : 'user');

/* A class line; phrases that name a course file get a direct link. */
function Item({ text }) {
  const link = FILE_LINKS.find(l => text.includes(l.match));
  let extra = null;
  if (link && link.to) {
    extra = h('a', { className: 'item-link', href: link.to }, h(Icon, { name: 'folder', size: 14 }), link.label);
  } else if (link) {
    const f = ALL_FILES.find(x => x.n === link.n);
    if (f) extra = h('a', { className: 'item-link', href: f.file, target: '_blank', rel: 'noopener', 'aria-label': `فتح الملف: ${f.title}` }, h(Icon, { name: 'file', size: 14 }), 'الملف');
  }
  return h('li', null, h('span', null, text), extra ? ' ' : null, extra);
}

const GROUPS = [
  { key: 'topics', label: 'محتوى الحصة', tone: 'brand' },
  { key: 'due', label: 'مطلوب اليوم', tone: 'danger' },
  { key: 'prep', label: 'التحضير القادم', tone: 'success' },
];

function ClassCard({ c, level = 3 }) {
  if (c.vac) {
    const exam = c.vac === 'exam';
    return h('div', { className: cx('vac', exam ? 'vac--exam' : 'vac--holiday') },
      h('span', { className: 'vac-icon' }, h(Icon, { name: exam ? 'pen' : 'coffee', size: 18 })),
      h('div', { className: 'vac-text' },
        h('strong', null, c.vacTxt),
        c.vacSub ? h('span', null, c.vacSub) : null),
      h(Code, null, c.id));
  }
  const slot = parseClass(c.id)?.slot;
  const date = c.solo ? null : classDate(c.id);
  return h('article', { className: 'class-card' },
    h(`h${level}`, { className: 'class-head' },
      h(Code, { brand: true }, c.id),
      h('span', { className: 'class-name' }, c.solo ? 'حصتا الأسبوع' : slot === 1 ? 'الحصة الأولى' : 'الحصة الثانية'),
      date ? h('span', { className: 'class-date' }, fmtDay(date)) : null),
    GROUPS.map(g => (c[g.key] && c[g.key].length)
      ? h('div', { key: g.key, className: `class-group class-group--${g.tone}` },
          h('p', { className: 'class-group-title' }, g.label),
          h('ul', { className: 'class-list' }, c[g.key].map((t, i) => h(Item, { key: i, text: t }))))
      : null));
}

function Progress({ week }) {
  const total = WEEKS.length;
  const value = Math.min(total, Math.max(0, week));
  return h('div', { className: 'progress' },
    h('div', { className: 'progress-label' },
      h('span', null, 'تقدّم الترم'),
      h('span', { className: 'num' }, `${Math.min(value, total)} / ${total}`)),
    h('div', {
      className: 'progress-track', role: 'progressbar', 'aria-label': 'تقدّم الترم',
      'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': value,
    }, h('span', { className: 'progress-fill', style: { width: `${(value / total) * 100}%` } })));
}

function EventRow({ e, state }) {
  const date = classDate(e.code);
  const when = date ? `${relDays(date)} · ${fmtDay(date)}` : relWeek(e.week, state.week);
  return h('li', { className: cx('event', e.week === state.week && 'is-soon') },
    h('span', { className: 'event-icon' }, h(Icon, { name: e.kind === 'due' ? 'alarm' : 'undo', size: 18 })),
    h('div', { className: 'event-body' },
      h('p', { className: 'event-title' },
        e.kind === 'resubmit' ? h('span', { className: 'event-kind' }, 'إعادة تسليم: ') : null,
        e.title),
      h('p', { className: 'event-meta' },
        h(Chip, { icon: typeIcon(e.type) }, e.type),
        h(Code, null, e.code),
        e.kind === 'resubmit' ? h('span', { className: 'event-note' }, 'لمن حصل على NI أو NCE أو NS') : null)),
    h('span', { className: 'event-when' }, when));
}

function NowCard({ state }) {
  if (state.phase === 'after') {
    return h('section', { className: 'now card', id: 'now', 'aria-labelledby': 'now-title' },
      h('div', { className: 'now-done' },
        h('span', { className: 'now-done-icon' }, h(Icon, { name: 'trophy', size: 28 })),
        h('h2', { id: 'now-title', className: 'now-title' }, `انتهى ${TERM.name}`),
        h('p', { className: 'now-peek' }, 'بالتوفيق في النتائج. تجد كل الأسابيع في الأرشيف أدناه.')));
  }
  const wk = WEEKS[state.week - 1];
  const start = weekStart(wk.w);
  const status = state.phase === 'before'
    ? `يبدأ الترم ${fmtDay(start)} · بعد ${daysPhrase(state.daysToStart)}`
    : state.weekend ? `يبدأ ${fmtDay(start)}` : 'هذا الأسبوع';
  const events = upcomingEvents(state, 3);
  return h('section', { className: 'now card', id: 'now', 'aria-labelledby': 'now-title' },
    h('div', { className: 'now-head' },
      h('div', { className: 'now-heading' },
        h('p', { className: 'now-status' }, h('span', { className: 'live-dot', 'aria-hidden': 'true' }), status),
        h('h2', { id: 'now-title', className: 'now-title' },
          `الأسبوع ${wk.w}`, h('span', { className: 'sr-only' }, '، '), h('span', { className: 'now-range' }, weekRange(wk.w))),
        h('p', { className: 'now-peek' }, wk.peek)),
      h(Progress, { week: state.phase === 'before' ? 0 : wk.w })),
    h('div', { className: cx('now-classes', wk.cls.length === 1 && 'is-solo') },
      wk.cls.map(c => h(ClassCard, { key: c.id, c, level: 3 }))),
    events.length ? h('div', { className: 'now-events' },
      h('h3', { className: 'now-events-title' }, h(Icon, { name: 'alarm', size: 18 }), 'التسليمات القادمة'),
      h('ul', { className: 'events' }, events.map(e => h(EventRow, { key: `${e.kind}-${e.n}`, e, state }))))
      : null);
}

function WeekStrip({ state, onPick }) {
  const ref = useRef(null);
  useEffect(() => {
    const list = ref.current;
    const cur = list && list.querySelector('[aria-current="date"]');
    if (!cur) return;
    const a = list.getBoundingClientRect(), b = cur.getBoundingClientRect();
    list.scrollBy({ left: (b.left + b.width / 2) - (a.left + a.width / 2), behavior: 'auto' });
  }, []);
  return h('nav', { className: 'strip', 'aria-label': 'أسابيع الترم' },
    h('ol', { className: 'strip-list', ref },
      WEEKS.map(wk => {
        const st = wk.w < state.week ? 'past' : wk.w === state.week ? 'current' : 'future';
        const hasDue = DEADLINE_WEEKS.has(wk.w);
        return h('li', { key: wk.w },
          h('button', {
            type: 'button',
            className: cx('strip-btn', `is-${st}`),
            'aria-current': st === 'current' ? 'date' : undefined,
            'aria-label': `الأسبوع ${wk.w}، ${weekRange(wk.w)}${hasDue ? '، فيه تسليم' : ''}`,
            onClick: () => onPick(wk.w),
          },
            h('span', { className: 'strip-num' }, wk.w),
            hasDue ? h('span', { className: 'strip-flag', 'aria-hidden': 'true' }) : null));
      })),
    h('p', { className: 'strip-legend' },
      h('span', { className: 'strip-flag', 'aria-hidden': 'true' }), 'أسبوع فيه تسليم'));
}

function WeekItem({ wk, state, open, onToggle }) {
  const rel = wk.w - state.week;
  const hasExam = wk.cls.some(c => c.vac === 'exam');
  const hasHoliday = wk.cls.some(c => c.vac === 'holiday');
  const panelId = `week-${wk.w}-panel`, btnId = `week-${wk.w}-btn`;
  return h('div', { className: cx('week', open && 'is-open', rel < 0 && 'is-past'), id: `week-${wk.w}` },
    h('h3', { className: 'week-h' },
      h('button', { type: 'button', className: 'week-btn', id: btnId, 'aria-expanded': open, 'aria-controls': panelId, onClick: onToggle },
        h('span', { className: 'week-num num' }, wk.w),
        h('span', { className: 'week-main' },
          h('span', { className: 'week-title' }, `الأسبوع ${wk.w}`, h('span', { className: 'sr-only' }, '، '), h('span', { className: 'week-range' }, weekRange(wk.w))),
          h('span', { className: 'week-peek' }, wk.peek)),
        h('span', { className: 'week-tags' },
          rel === 1 ? h(Chip, { tone: 'accent' }, 'الأسبوع القادم') : null,
          DEADLINE_WEEKS.has(wk.w) ? h(Chip, { tone: 'danger', icon: 'alarm' }, 'تسليم') : null,
          hasExam ? h(Chip, { icon: 'pen' }, 'اختبارات') : null,
          hasHoliday ? h(Chip, { icon: 'coffee' }, 'إجازة') : null),
        h(Icon, { name: 'chevronDown', className: 'disclosure-chev' }))),
    h('div', { className: 'disclosure-panel', id: panelId, role: 'region', 'aria-labelledby': btnId },
      h('div', { className: 'disclosure-inner' },
        h('div', { className: cx('week-classes', wk.cls.length === 1 && 'is-solo') },
          wk.cls.map(c => h(ClassCard, { key: c.id, c, level: 4 }))))));
}

function Stage({ label, code }) {
  const c = parseClass(code);
  return h('span', { className: 'stage', title: c ? `الأسبوع ${c.week} · ${weekRange(c.week)}` : undefined },
    h('span', { className: 'stage-label' }, label), h(Code, null, code));
}

function dueStatus(d, state) {
  const due = parseClass(d.due), re = parseClass(d.re);
  if (due.week >= state.week) return { text: relWeek(due.week, state.week), tone: due.week - state.week <= 1 ? 'danger' : 'neutral' };
  if (re && re.week >= state.week) return { text: `الإعادة ${relWeek(re.week, state.week)}`, tone: 'warning' };
  return { text: 'انتهى', tone: 'past' };
}

function DuesList({ state }) {
  const next = DUES.find(d => parseClass(d.due).week >= state.week);
  return h(Section, { id: 'dues', title: 'مواعيد التسليم', icon: 'alarm', className: 'dues-section' },
    h('p', { className: 'section-lead' }, 'الرمز ', h(Code, null, '4-1'), ' يعني الأسبوع 4، الحصة الأولى.'),
    h('ol', { className: 'dues card' },
      DUES.map(d => {
        const s = dueStatus(d, state);
        return h('li', { key: d.n, className: cx('due', s.tone === 'past' && 'is-past', next && next.n === d.n && 'is-next') },
          h('span', { className: 'due-n num', 'aria-hidden': 'true' }, d.n),
          h('div', { className: 'due-body' },
            h('div', { className: 'due-top' },
              h('p', { className: 'due-title' }, d.t),
              h('span', { className: cx('due-when', `due-when--${s.tone}`) },
                s.tone === 'past' ? h(Icon, { name: 'check', size: 14 }) : null, s.text)),
            h('div', { className: 'due-meta' },
              h(Chip, { icon: typeIcon(d.k) }, d.k),
              h(Stage, { label: 'التسليم', code: d.due }),
              d.ret ? h(Stage, { label: 'الإرجاع', code: d.ret }) : null,
              d.re ? h(Stage, { label: 'الإعادة', code: d.re }) : null)));
      })));
}

export function CalendarPage() {
  const state = academicState();
  const current = state.phase === 'after' ? WEEKS.length + 1 : state.week;
  const upcoming = WEEKS.filter(w => w.w > current);
  const past = WEEKS.filter(w => w.w < current);
  const [open, setOpen] = useState(() => new Set());
  const [archiveOpen, setArchiveOpen] = useState(state.phase === 'after');
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (target == null) return;
    const el = document.getElementById(target === 'now' ? 'now' : `week-${target}`);
    if (el) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    setTarget(null);
  }, [target]);

  const toggle = w => setOpen(s => { const n = new Set(s); n.has(w) ? n.delete(w) : n.add(w); return n; });
  const pick = w => {
    if (w === current) { setTarget('now'); return; }
    setOpen(s => new Set(s).add(w));
    if (w < current) setArchiveOpen(true);
    setTarget(w);
  };

  return h('div', { className: 'page page-calendar' },
    h(PageHead, {
      eyebrow: h(Fragment, null, h(Icon, { name: 'calendar', size: 16 }), h('bdi', null, `${TERM.course} · ${TERM.title}`)),
      title: 'التقويم الأسبوعي',
      lead: 'حصص الأسابيع الخمسة عشر، والمطلوب في كل حصة، ومواعيد التسليم.',
    }),
    h(NowCard, { state }),
    h('div', { className: 'calendar-grid' },
      h(Section, { id: 'weeks', title: 'الأسابيع', icon: 'layers', className: 'weeks-section' },
        h(WeekStrip, { state: { ...state, week: current }, onPick: pick }),
        upcoming.length ? h('div', { className: 'weeks' },
          upcoming.map(wk => h(WeekItem, { key: wk.w, wk, state: { ...state, week: current }, open: open.has(wk.w), onToggle: () => toggle(wk.w) })))
          : null,
        past.length ? h('div', { className: cx('archive', archiveOpen && 'is-open') },
          h('button', { type: 'button', className: 'archive-btn', 'aria-expanded': archiveOpen, 'aria-controls': 'archive-panel', onClick: () => setArchiveOpen(v => !v) },
            h(Icon, { name: 'history', size: 18 }),
            h('span', null, 'الأسابيع السابقة'),
            h('span', { className: 'archive-count num' }, past.length),
            h(Icon, { name: 'chevronDown', className: 'disclosure-chev' })),
          h('div', { className: 'disclosure-panel', id: 'archive-panel' },
            h('div', { className: 'disclosure-inner' },
              h('div', { className: 'weeks weeks--archive' },
                past.map(wk => h(WeekItem, { key: wk.w, wk, state: { ...state, week: current }, open: open.has(wk.w), onToggle: () => toggle(wk.w) }))))))
          : null),
      h(DuesList, { state: { ...state, week: current } })),
    CLASS_DAYS ? null : h(Callout, { tone: 'info', className: 'calendar-note' },
      'تواريخ الأسابيع من الأحد إلى الخميس. يوما الجمعة والسبت يعرضان الأسبوع القادم مباشرة.'));
}
