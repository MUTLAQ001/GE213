import { h, cx, ReactDOM, useState, useEffect, useRef, Fragment } from '../lib/react.js';
import {
  WEEKS, DUES, CLASS_DAYS, BREAKS, weekRange, weekStart, fmtDay, academicState, parseClass, classDate,
  daysUntil, proximity, dueStatus, weeksWithDeadlines,
} from '../lib/dates.js';
import { daysPhrase } from '../lib/ar.js';
import { store } from '../lib/storage.js';
import { FILES, ASSIGN1, ASSIGN2, ASSIGNMENT_GROUPS, FILE_LINKS } from '../../data/files.js';
import { TERM } from '../../data/term-481.js';
import { Icon } from '../components/icons.js';
import { PageHead, Section, Chip, Code, revealTarget } from '../components/ui.js';

const ALL_FILES = [...FILES, ...ASSIGN1, ...ASSIGN2];
const DEADLINE_WEEKS = weeksWithDeadlines();
const TASKS_KEY = 'ge213_tasks';
const typeIcon = k => (k === 'جماعي' ? 'users' : 'user');
const RESUBMIT_NOTE = 'لمن حصل على NI أو NCE أو NS';

/** Where a submission's files live: its assignment group on the files page, or nothing. */
const groupOf = n => ASSIGNMENT_GROUPS.find(g => g.due === n) || null;
const dueHref = (n, week) => (groupOf(n) ? `#/files?a=${n}` : `#/calendar?w=${week}`);
const sheetOf = n => { const g = groupOf(n); return g ? g.files[0] : null; };

/* A class line; phrases that name a course file get a direct link. */
function ItemLink({ text }) {
  const link = FILE_LINKS.find(l => text.includes(l.match));
  if (!link) return null;
  if (link.to) return h('a', { className: 'item-link', href: link.to }, h(Icon, { name: 'folder', size: 14 }), link.label);
  const f = ALL_FILES.find(x => x.n === link.n);
  return f ? h('a', { className: 'item-link', href: f.file, target: '_blank', rel: 'noopener', 'aria-label': `فتح الملف: ${f.title} (يفتح في نافذة جديدة)` },
    h(Icon, { name: 'file', size: 14 }), 'الملف') : null;
}

function Item({ text }) {
  const link = h(ItemLink, { text });
  return h('li', null, h('span', null, text), ' ', link);
}

/* ---------- What a class asks of the student ---------- */
const TAGS = {
  graded: 'تسليم يُقيَّم',
  bring: 'إحضار',
  present: 'عرض',
};
const tagOf = t => (/(^|\s)(إعادة )?(التسليم|تسليم)|التقييم/.test(t) ? 'graded' : /^عرض/.test(t) ? 'present' : 'bring');

/**
 * The class's own "due" lines, plus any submission that DUES places in this class
 * but the class text does not mention (in-class assignments, resubmissions).
 */
function classTasks(c) {
  const own = (c.due || []).map(t => ({ text: t, tag: tagOf(t), note: /^إعادة تسليم/.test(t) ? RESUBMIT_NOTE : null }));
  const graded = own.filter(x => x.tag === 'graded');
  const extra = [];
  for (const d of DUES) {
    if (d.due === c.id && !graded.some(x => !/إعادة/.test(x.text))) {
      extra.push({ text: d.t, tag: 'graded', n: d.n });
    }
    if (d.re === c.id && !graded.some(x => /إعادة/.test(x.text))) {
      extra.push({ text: `إعادة تسليم: ${d.t}`, tag: 'graded', note: RESUBMIT_NOTE, n: d.n });
    }
  }
  return [...extra, ...own];
}

function useChecks() {
  const [checks, setChecks] = useState(() => store.getJSON(TASKS_KEY, {}) || {});
  const toggle = key => setChecks(prev => {
    const next = { ...prev };
    if (next[key]) delete next[key]; else next[key] = 1;
    store.setJSON(TASKS_KEY, next);
    return next;
  });
  return [checks, toggle];
}

function Task({ cid, i, task, checks, onToggle }) {
  const key = `${cid}|${task.text}`;
  const id = `task-${cid}-${i}`;
  const done = !!checks[key];
  const link = task.n && groupOf(task.n)
    ? h('a', { className: 'item-link', href: `#/files?a=${task.n}` }, h(Icon, { name: 'folder', size: 14 }), 'ملفات الواجب')
    : h(ItemLink, { text: task.text });
  return h('li', { className: cx('task', done && 'is-done') },
    h('input', { type: 'checkbox', className: 'task-check', id, checked: done, onChange: () => onToggle(key) }),
    h('div', { className: 'task-body' },
      h('label', { className: 'task-text', htmlFor: id }, task.text),
      h('span', { className: 'task-meta' },
        h('span', { className: cx('tag', `tag--${task.tag}`) }, TAGS[task.tag]),
        task.note ? h('span', { className: 'task-note' }, task.note) : null,
        link)));
}

function ClassCard({ c, level = 3, isNext, isPast, brand, tone = 'later', checks, onToggle }) {
  if (c.vac) {
    const exam = c.vac === 'exam';
    return h('div', { className: cx('vac', exam ? 'vac--exam' : 'vac--holiday', isPast && 'is-past') },
      h('span', { className: 'vac-icon' }, h(Icon, { name: exam ? 'pen' : 'coffee', size: 18 })),
      h('div', { className: 'vac-text' },
        h('strong', null, c.vacTxt),
        c.vacSub ? h('span', null, c.vacSub) : null),
      h(Code, null, c.id));
  }
  const slot = parseClass(c.id)?.slot;
  const date = classDate(c.id);
  const today = date && daysUntil(date) === 0;
  const tasks = classTasks(c);
  return h('article', { className: cx('class-card', isNext && 'is-next', isPast && 'is-past'), 'data-class': c.id },
    h(`h${level}`, { className: 'class-head' },
      h(Code, { brand }, c.id),
      h('span', { className: 'class-name' }, slot === 1 ? 'الحصة الأولى' : 'الحصة الثانية'),
      date ? h('span', { className: 'class-date' }, fmtDay(date)) : null,
      isNext ? h(Chip, { tone: 'next', className: 'class-badge' }, 'الحصة القادمة') : null,
      isPast ? h(Chip, { className: 'class-badge' }, 'انتهت') : null),
    h('div', { className: 'class-content' },
      tasks.length ? h('div', { className: cx('class-due', `tone-${isPast ? 'later' : tone}`) },
        h('p', { className: 'class-group-title' }, today ? 'مطلوب اليوم' : 'مطلوب في هذه الحصة'),
        h('ul', { className: 'tasks' }, tasks.map((t, i) => h(Task, { key: t.text, i, cid: c.id, task: t, checks, onToggle }))))
        : null,
      c.topics && c.topics.length ? h('div', { className: 'class-group class-group--topics' },
        h('p', { className: 'class-group-title' }, 'محتوى الحصة'),
        h('ul', { className: 'class-list' }, c.topics.map((t, i) => h(Item, { key: i, text: t })))) : null,
      c.prep && c.prep.length ? h('div', { className: 'class-group class-group--prep' },
        h('p', { className: 'class-group-title' }, 'حضّر للحصة التالية'),
        h('ul', { className: 'class-list' }, c.prep.map((t, i) => h(Item, { key: i, text: t })))) : null));
}

/** The next class of the shown week, only when it is certain (exact dates, or the week has not started). */
function nextClassOf(wk, state) {
  const real = wk.cls.filter(c => !c.vac);
  if (Array.isArray(CLASS_DAYS)) {
    const hit = real.find(c => { const d = classDate(c.id); return d && daysUntil(d) >= 0; });
    return hit ? hit.id : null;
  }
  return state.phase === 'before' || state.weekend ? (real[0] && real[0].id) : null;
}
const classPast = id => { const d = classDate(id); return !!d && daysUntil(d) < 0; };

/* ---------- Hero: the week and the nearest submission ---------- */
function Progress({ week }) {
  const total = WEEKS.length;
  const value = Math.min(total, Math.max(0, week));
  return h('div', { className: 'progress' },
    h('div', {
      className: 'progress-track', role: 'progressbar', 'aria-label': 'تقدّم الترم',
      'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': value, 'aria-valuetext': `الأسبوع ${value} من ${total}`,
    }, h('span', { className: 'progress-fill', style: { width: `${(value / total) * 100}%` } })),
    h('span', { className: 'progress-num num', 'aria-hidden': 'true' }, h('bdi', null, `${value} / ${total}`)));
}

const scrollToDues = () => revealTarget(document.getElementById('dues'));

function NextDue({ item }) {
  if (!item) {
    return h('div', { className: 'next-due tone-done' },
      h('p', { className: 'next-due-label' }, 'أقرب تسليم'),
      h('p', { className: 'next-due-title' }, 'لا تسليمات متبقية'),
      h('p', { className: 'next-due-meta' }, 'سلّمت كل ما في التقويم. بالتوفيق.'));
  }
  const { d, code, tone, label, kind } = item;
  const sheet = sheetOf(d.n);
  const title = kind === 'resubmit' ? `إعادة تسليم: ${d.t}` : d.t;
  return h('div', { className: cx('next-due', `tone-${tone}`) },
    h('p', { className: 'next-due-label' }, 'أقرب تسليم'),
    h('a', { className: 'next-due-title stretched', href: dueHref(d.n, item.week) }, title),
    h('p', { className: 'next-due-meta' },
      'الحصة ', h(Code, null, code), ' · ', h('span', { className: 'next-due-when' }, label)),
    kind === 'resubmit' ? h('p', { className: 'next-due-note' }, RESUBMIT_NOTE) : null,
    h('div', { className: 'next-due-actions' },
      sheet
        ? h('a', { className: 'btn btn--primary', href: sheet.file, target: '_blank', rel: 'noopener', 'aria-label': `افتح الملف: ${sheet.title} (يفتح في نافذة جديدة)` },
            h(Icon, { name: 'file', size: 18 }), 'افتح الملف')
        : h('a', { className: 'btn btn--primary', href: `#/calendar?w=${item.week}` }, h(Icon, { name: 'calendar', size: 18 }), `الأسبوع ${item.week}`),
      h('button', { type: 'button', className: 'btn btn--ghost', onClick: scrollToDues }, 'كل التسليمات')));
}

function Hero({ state, nextItem }) {
  if (state.phase === 'after') {
    return h('section', { className: 'hero hero--done', id: 'now', 'aria-labelledby': 'now-title' },
      h('span', { className: 'hero-done-icon' }, h(Icon, { name: 'trophy', size: 28 })),
      h('h2', { id: 'now-title', className: 'hero-done-title' }, `انتهى ${TERM.name}`),
      h('p', { className: 'hero-peek' }, 'بالتوفيق في النتائج. تجد كل الأسابيع في الأرشيف أدناه.'));
  }
  const wk = WEEKS[state.week - 1];
  const start = weekStart(wk.w);
  const status = state.phase === 'before'
    ? `يبدأ الترم ${fmtDay(start)} · بعد ${daysPhrase(state.daysToStart)}`
    : state.weekend ? `يبدأ ${fmtDay(start)}` : 'هذا الأسبوع';
  return h('section', { className: 'hero', id: 'now', 'aria-labelledby': 'now-title' },
    h('div', { className: 'hero-week' },
      h('p', { className: 'hero-status' }, h('span', { className: 'live-dot', 'aria-hidden': 'true' }), status),
      h('h2', { id: 'now-title', className: 'hero-title' },
        h('span', { className: 'hero-label' }, 'الأسبوع'), ' ', h('span', { className: 'hero-num num' }, wk.w),
        h('span', { className: 'sr-only' }, `، ${weekRange(wk.w)}`)),
      h('p', { className: 'hero-range', 'aria-hidden': 'true' }, weekRange(wk.w)),
      h('p', { className: 'hero-peek' }, wk.peek)),
    h(NextDue, { item: nextItem }));
}

/* ---------- Deadlines ---------- */
const ABBR = [
  ['HTMI', 'كتاب المقرر How to Model It'],
  ['E', 'تجاوز التوقعات'],
  ['M', 'حقق التوقعات'],
  ['NI', 'يحتاج تحسين'],
  ['NCE', 'بلا جهد مقنع (تُسجَّل مخالفة انضباط)'],
  ['NS', 'لم يُسلَّم (تُسجَّل مخالفة انضباط)'],
  ['10-2', 'الأسبوع 10، الحصة الثانية'],
];

function AbbrHelp() {
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  const onKey = ev => { if (ev.key === 'Escape' && open) { setOpen(false); btn.current && btn.current.focus(); } };
  return h('div', { className: cx('abbr', open && 'is-open'), onKeyDown: onKey },
    h('button', { type: 'button', ref: btn, className: 'btn btn--ghost abbr-btn', 'aria-expanded': open, 'aria-controls': 'abbr-panel', onClick: () => setOpen(v => !v) },
      h(Icon, { name: 'info', size: 18 }), 'ما معنى الرموز؟'),
    h('div', { className: 'abbr-panel', id: 'abbr-panel', hidden: !open },
      h('dl', { className: 'abbr-list' }, ABBR.map(([k, v]) => h('div', { key: k },
        h('dt', null, h('bdi', null, k)), h('dd', null, v)))),
      h('a', { className: 'abbr-more', href: '#/guide/grading' }, 'الشرح الكامل في الدليل ←')));
}

function DueCard({ item }) {
  const { d, code, tone, label, kind } = item;
  const sheet = sheetOf(d.n);
  return h('li', { className: cx('due-card', `tone-${tone}`) },
    h('div', { className: 'due-card-top' },
      h('a', { className: 'due-card-title stretched', href: dueHref(d.n, item.week) },
        kind === 'resubmit' ? h('span', { className: 'due-card-kind' }, 'إعادة تسليم: ') : null, d.t),
      h(Chip, { tone, className: 'due-card-when' }, label)),
    h('p', { className: 'due-card-meta' },
      h(Code, null, code),
      h(Chip, { icon: typeIcon(d.k) }, d.k),
      kind === 'resubmit' ? h('span', null, RESUBMIT_NOTE) : null),
    sheet ? h('a', {
      className: 'btn btn--secondary btn--sm due-card-btn', href: sheet.file, target: '_blank', rel: 'noopener',
      'aria-label': `افتح ملف الواجب: ${sheet.title} (يفتح في نافذة جديدة)`,
    }, h(Icon, { name: 'file', size: 16 }), 'افتح ملف الواجب') : null);
}

function DuesAside({ status }) {
  const [showDone, setShowDone] = useState(false);
  return h(Section, { id: 'dues', title: 'مواعيد التسليم', icon: 'alarm', className: 'dues-section', meta: h(AbbrHelp) },
    status.active.length
      ? h('ol', { className: 'due-cards' }, status.active.map(x => h(DueCard, { key: x.d.n, item: x })))
      : h('p', { className: 'empty' }, h(Icon, { name: 'check', size: 16 }), 'لا تسليمات متبقية في هذا الترم.'),
    status.done.length ? h('div', { className: cx('dues-done', showDone && 'is-open') },
      h('button', { type: 'button', className: 'dues-done-btn', 'aria-expanded': showDone, 'aria-controls': 'dues-done-panel', onClick: () => setShowDone(v => !v) },
        h(Icon, { name: 'check', size: 18, className: 'dues-done-check' }),
        h('span', null, 'منتهية ', h('span', { className: 'num' }, `(${status.done.length})`)),
        h(Icon, { name: 'chevronDown', className: 'disclosure-chev' })),
      h('div', { className: 'disclosure-panel', id: 'dues-done-panel' },
        h('div', { className: 'disclosure-inner' },
          h('ul', { className: 'dues-done-list' }, status.done.map(x => h('li', { key: x.d.n },
            h(Icon, { name: 'check', size: 16 }),
            h('a', { href: dueHref(x.d.n, x.week) }, x.d.t),
            h(Code, null, x.d.re || x.d.due)))))))
      : null);
}

/* ---------- Weeks ---------- */
const flagTone = (w, state) => (w < state.week ? 'past' : proximity(`${w}-1`, state).tone);

function WeekStrip({ current, state, onPick }) {
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
        const st = wk.w < current ? 'past' : wk.w === current ? 'current' : 'future';
        const hasDue = DEADLINE_WEEKS.has(wk.w);
        return h('li', { key: wk.w },
          h('button', {
            type: 'button',
            className: cx('strip-btn', `is-${st}`),
            'aria-current': st === 'current' ? 'date' : undefined,
            'aria-label': `الأسبوع ${wk.w}، ${weekRange(wk.w)}${hasDue ? '، فيه تسليم' : ''}`,
            onClick: () => onPick(wk.w),
          },
            h('span', { className: 'strip-num num' }, wk.w),
            hasDue ? h('span', { className: cx('strip-flag', `flag--${flagTone(wk.w, state)}`), 'aria-hidden': 'true' }) : null));
      })),
    h('p', { className: 'strip-legend' },
      h('span', { className: 'strip-flag flag--urgent', 'aria-hidden': 'true' }), 'أسبوع فيه تسليم'));
}

/**
 * Collapsed weeks render their classes only once opened (fewer nodes on first paint);
 * printing renders every week, as the print stylesheet expands them all.
 */
function usePrinting() {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const on = () => ReactDOM.flushSync(() => setPrinting(true));
    const off = () => setPrinting(false);
    window.addEventListener('beforeprint', on);
    window.addEventListener('afterprint', off);
    return () => { window.removeEventListener('beforeprint', on); window.removeEventListener('afterprint', off); };
  }, []);
  return printing;
}

function WeekItem({ wk, current, state, open, onToggle, checks, onToggleTask, printing }) {
  const rel = wk.w - current;
  const seen = useRef(false);
  if (open) seen.current = true;
  const hasExam = wk.cls.some(c => c.vac === 'exam');
  const hasHoliday = wk.cls.some(c => c.vac === 'holiday');
  const panelId = `week-${wk.w}-panel`, btnId = `week-${wk.w}-btn`;
  const tone = rel < 0 ? 'past' : proximity(`${wk.w}-1`, state).tone;
  return h('div', { className: cx('week', open && 'is-open', rel < 0 && 'is-past'), id: `week-${wk.w}` },
    h('h3', { className: 'week-h' },
      h('button', { type: 'button', className: 'week-btn', id: btnId, 'aria-expanded': open, 'aria-controls': panelId, onClick: onToggle },
        h('span', { className: 'week-num num' }, wk.w),
        h('span', { className: 'week-main' },
          h('span', { className: 'week-title' }, `الأسبوع ${wk.w}`, h('span', { className: 'sr-only' }, '، '), h('span', { className: 'week-range' }, weekRange(wk.w))),
          h('span', { className: 'week-peek' }, wk.peek)),
        h('span', { className: 'week-tags' },
          rel === 1 ? h(Chip, null, 'الأسبوع القادم') : null,
          DEADLINE_WEEKS.has(wk.w) ? h(Chip, { tone: tone === 'past' ? undefined : tone, icon: 'alarm' }, 'تسليم') : null,
          hasExam ? h(Chip, { icon: 'pen' }, 'اختبارات') : null,
          hasHoliday ? h(Chip, { icon: 'coffee' }, 'إجازة') : null),
        h(Icon, { name: 'chevronDown', className: 'disclosure-chev' }))),
    h('div', { className: 'disclosure-panel', id: panelId, role: 'region', 'aria-labelledby': btnId },
      h('div', { className: 'disclosure-inner' },
        seen.current || printing ? h('div', { className: cx('week-classes', wk.cls.length === 1 && 'is-solo') },
          wk.cls.map(c => h(ClassCard, { key: c.id, c, level: 4, isPast: rel < 0, tone: tone === 'past' ? 'later' : tone, checks, onToggle: onToggleTask }))) : null)));
}

export function CalendarPage({ query = {}, nav = 0 }) {
  const state = academicState();
  const current = state.phase === 'after' ? WEEKS.length + 1 : state.week;
  const cstate = { ...state, week: current };
  const upcoming = WEEKS.filter(w => w.w > current);
  const past = WEEKS.filter(w => w.w < current);
  const status = dueStatus(cstate);
  const [open, setOpen] = useState(() => new Set());
  const [archiveOpen, setArchiveOpen] = useState(state.phase === 'after');
  const [target, setTarget] = useState(null);
  const [checks, toggleCheck] = useChecks();
  const printing = usePrinting();

  useEffect(() => {
    if (target == null) return;
    revealTarget(document.getElementById(target === 'now' ? 'now' : `week-${target}`));
    setTarget(null);
  }, [target]);

  const toggle = w => setOpen(s => { const n = new Set(s); n.has(w) ? n.delete(w) : n.add(w); return n; });
  const pick = w => {
    if (w === current) { setTarget('now'); return; }
    setOpen(s => new Set(s).add(w));
    if (w < current) setArchiveOpen(true);
    setTarget(w);
  };

  // Deep links from submission cards: #/calendar?w=13 opens and shows week 13.
  useEffect(() => {
    const w = parseInt(query.w, 10);
    if (w >= 1 && w <= WEEKS.length) pick(w);
  }, [nav]);

  const wk = state.phase === 'after' ? null : WEEKS[current - 1];
  const nextId = wk ? nextClassOf(wk, state) : null;

  return h('div', { className: 'page page-calendar' },
    h(PageHead, {
      eyebrow: h(Fragment, null, h(Icon, { name: 'calendar', size: 16 }), h('bdi', null, `${TERM.course} · ${TERM.title}`)),
      title: 'التقويم الأسبوعي',
      lead: 'المطلوب في كل حصة من الأسابيع الأربعة عشر، ومواعيد التسليم.',
      hiddenTitle: true,
    }),
    h(Hero, { state, nextItem: status.active[0] }),
    h(Progress, { week: state.phase === 'before' ? 0 : Math.min(current, WEEKS.length) }),
    h('div', { className: 'calendar-grid' },
      wk ? h('section', { className: 'this-week', 'aria-label': `حصص الأسبوع ${wk.w}` },
        h('div', { className: cx('this-week-classes', wk.cls.length === 1 && 'is-solo') },
          wk.cls.map(c => h(ClassCard, {
            key: c.id, c, level: 3, brand: true, tone: proximity(c.id, cstate).tone,
            isNext: c.id === nextId, isPast: classPast(c.id), checks, onToggle: toggleCheck,
          })))) : null,
      h(DuesAside, { status }),
      h(Section, { id: 'weeks', title: 'الأسابيع', icon: 'layers', className: 'weeks-section' },
        h(WeekStrip, { current, state: cstate, onPick: pick }),
        upcoming.length ? h('div', { className: 'weeks' },
          upcoming.map(w => h(WeekItem, { key: w.w, wk: w, current, state: cstate, open: open.has(w.w), onToggle: () => toggle(w.w), checks, onToggleTask: toggleCheck, printing })))
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
                past.map(w => h(WeekItem, { key: w.w, wk: w, current, state: cstate, open: open.has(w.w), onToggle: () => toggle(w.w), checks, onToggleTask: toggleCheck, printing }))))))
          : null,
        h('ul', { className: 'calendar-notes' },
          CLASS_DAYS ? null : h('li', null, 'تواريخ الأسابيع من الأحد إلى الخميس. يوما الجمعة والسبت يعرضان الأسبوع القادم مباشرة.'),
          BREAKS.length ? h('li', null,
            `بين الأسبوعين ${BREAKS[0].after} و${BREAKS[0].after + 1} أسابيع بلا حصص: `,
            BREAKS.map((b, i) => `${i ? '، ثم ' : ''}${b.txt} (${b.range})`).join(''), '.') : null))));
}
