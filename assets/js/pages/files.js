import { h, cx, useState, useEffect, Fragment } from '../lib/react.js';
import { DUES, academicState, parseClass, proximity, weekRange } from '../lib/dates.js';
import { fmtBytes, filesPhrase } from '../lib/ar.js';
import { FILES, ASSIGNMENT_GROUPS, NAMING_PARTS } from '../../data/files.js';
import { Icon } from '../components/icons.js';
import { PageHead, Section, Chip, Code, toast, copyText, revealTarget } from '../components/ui.js';

const LARGE = 2 * 1048576;
const OFFLINE_CACHE = 'ge213-files';

function FileRow({ f }) {
  return h('li', { className: 'file' },
    h('span', { className: 'file-icon', 'aria-hidden': 'true' }, h(Icon, { name: 'file', size: 22 })),
    h('div', { className: 'file-body' },
      h('a', { className: 'file-title', href: f.file, target: '_blank', rel: 'noopener', 'aria-label': `فتح الملف: ${f.title} (يفتح في نافذة جديدة)` },
        f.title, h(Icon, { name: 'external', size: 14, className: 'file-ext' })),
      h('p', { className: 'file-sub', dir: 'ltr' }, f.sub),
      h('p', { className: 'file-desc' }, f.desc),
      h('p', { className: 'file-meta' },
        h(Chip, { className: 'num' }, h('bdi', null, `PDF · ${fmtBytes(f.size)}`)),
        f.size > LARGE ? h(Chip, { tone: 'soon', icon: 'alert' }, 'ملف كبير') : null)),
    h('a', { className: 'icon-btn file-dl', href: f.file, download: '', 'aria-label': `تحميل: ${f.title} (${fmtBytes(f.size)})`, title: 'تحميل' },
      h(Icon, { name: 'download', size: 20 })));
}

function Naming({ value, example, hint }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const ok = await copyText(value);
    if (ok) { setCopied(true); toast('نُسخت صيغة التسمية.'); setTimeout(() => setCopied(false), 2000); }
    else toast('تعذّر النسخ. انسخ الصيغة يدويًا.', { icon: 'alert' });
  };
  const parts = NAMING_PARTS.filter(([k]) => value.includes(k));
  return h('div', { className: 'naming' },
    h('p', { className: 'naming-label' }, 'سمِّ كل ملف بالصيغة'),
    h('div', { className: 'naming-row' },
      h('code', { className: 'naming-code', dir: 'ltr' }, value),
      h('button', { type: 'button', className: 'btn btn--secondary naming-btn', onClick: copy, 'aria-live': 'polite' },
        h(Icon, { name: copied ? 'check' : 'copy', size: 16 }), copied ? 'نُسخت الصيغة' : 'نسخ الصيغة')),
    example ? h('p', { className: 'naming-example' }, 'مثال: ', h('code', { dir: 'ltr' }, example)) : null,
    parts.length ? h('dl', { className: 'naming-parts' }, parts.map(([k, v]) => h('div', { key: k },
      h('dt', { dir: 'ltr' }, k), h('dd', null, v)))) : null,
    hint ? h('p', { className: 'naming-hint' }, hint) : null);
}

function Timeline({ d, state }) {
  const steps = [
    { label: 'التسليم', code: d.due },
    d.ret ? { label: 'إرجاع التصحيح', code: d.ret } : null,
    d.re ? { label: 'إعادة التسليم', code: d.re } : null,
  ].filter(Boolean);
  return h('ol', { className: 'timeline', 'aria-label': 'مراحل الواجب' },
    steps.map(s => {
      const w = parseClass(s.code).week;
      const p = proximity(s.code, state);
      const st = p.tone === 'done' ? 'done' : w === state.week ? 'now' : 'next';
      return h('li', { key: s.label, className: cx('tl-step', `is-${st}`) },
        h('a', { className: 'tl-link', href: `#/calendar?w=${w}` },
          h('span', { className: 'tl-dot', 'aria-hidden': 'true' }, st === 'done' ? h(Icon, { name: 'check', size: 12 }) : null),
          h('span', { className: 'tl-label' }, s.label),
          h('span', { className: 'tl-when' }, h(Code, null, s.code), ' ', p.label),
          h('span', { className: 'sr-only' }, ` — الأسبوع ${w}، ${weekRange(w)}`)));
    }));
}

/** Downloads every file of an assignment into the browser cache so it opens without a connection. */
function SaveOffline({ files }) {
  const [state, setState] = useState('idle');
  if (!('caches' in window)) return null;
  const save = async () => {
    setState('busy');
    try {
      const cache = await caches.open(OFFLINE_CACHE);
      const res = await Promise.allSettled(files.map(async f => {
        const r = await fetch(f.file, { cache: 'reload' });
        if (!r.ok) throw new Error(r.status);
        await cache.put(f.file, r);
      }));
      const failed = res.filter(r => r.status === 'rejected').length;
      if (failed) { setState('idle'); toast(`تعذّر حفظ ${failed} من الملفات. تحقّق من الاتصال وحاول مجددًا.`, { icon: 'alert' }); return; }
      setState('done');
      toast('حُفظت ملفات الواجب. تفتح الآن دون اتصال.');
    } catch (e) {
      setState('idle');
      toast('تعذّر الحفظ في هذا المتصفح.', { icon: 'alert' });
    }
  };
  const total = files.reduce((a, f) => a + f.size, 0);
  return h('button', { type: 'button', className: 'btn btn--secondary offline-btn', onClick: save, disabled: state === 'busy' },
    h(Icon, { name: state === 'done' ? 'check' : 'download', size: 18 }),
    state === 'busy' ? 'جارٍ الحفظ…' : state === 'done' ? 'محفوظة للاستخدام دون اتصال' : 'حفظ للاستخدام دون اتصال',
    state === 'idle' ? h('span', { className: 'offline-size num' }, h('bdi', null, fmtBytes(total))) : null);
}

/** Current (still has a step this week or later), upcoming, or done. */
function groupStatus(d, state) {
  const steps = [d.due, d.re].filter(Boolean).map(c => proximity(c, state));
  const open = steps.filter(p => p.tone !== 'done');
  if (!open.length) return 'done';
  return parseClass(d.due).week <= state.week + 1 || steps[0].tone === 'done' ? 'current' : 'upcoming';
}

function AssignmentGroup({ g, state, status, open, onToggle }) {
  const d = DUES.find(x => x.n === g.due);
  const hid = `assign-${g.due}-title`;
  if (status === 'done' && !open) {
    return h('section', { className: 'assignment assignment--done', id: `assign-${g.due}`, 'aria-labelledby': hid },
      h('button', { type: 'button', className: 'assignment-done-btn', 'aria-expanded': false, onClick: onToggle },
        h(Icon, { name: 'check', size: 18, className: 'assignment-done-check' }),
        h('span', { className: 'assignment-done-title', id: hid }, g.title),
        h('span', { className: 'assignment-done-meta' }, `انتهى · ${filesPhrase(g.files.length)}`),
        h(Icon, { name: 'chevronDown', className: 'disclosure-chev' })));
  }
  return h('section', { className: cx('assignment card', status === 'current' && 'is-current'), id: `assign-${g.due}`, 'aria-labelledby': hid },
    h('header', { className: 'assignment-head' },
      h('div', { className: 'assignment-heading' },
        h('p', { className: 'assignment-eyebrow' },
          h(Chip, { tone: status === 'current' ? 'brand' : undefined, icon: d.k === 'جماعي' ? 'users' : 'user' }, `الواجب ${d.n} · ${d.k}`),
          status === 'current' ? h(Chip, { tone: 'brand' }, 'الواجب الجاري') : status === 'done' ? h(Chip, { tone: 'done-plain', icon: 'check' }, 'انتهى') : null),
        h('h2', { className: 'assignment-title', id: hid }, g.title)),
      h(Timeline, { d, state }),
      status === 'done' ? h('button', { type: 'button', className: 'btn btn--ghost assignment-collapse', 'aria-expanded': true, onClick: onToggle },
        h(Icon, { name: 'chevronDown', className: 'disclosure-chev' }), 'طيّ') : null),
    h('div', { className: 'assignment-grid' },
      h('div', { className: 'deliver' },
        h('h3', { className: 'deliver-title' }, h(Icon, { name: 'listChecks', size: 18 }), 'ما الذي تسلّمه؟'),
        h('ul', { className: 'checklist' }, g.deliverables.map((t, i) =>
          h('li', { key: i }, h(Icon, { name: 'check', size: 16 }), h('span', null, t)))),
        h(Naming, { value: g.naming, example: g.example, hint: g.namingHint })),
      h('div', { className: 'assignment-files' },
        h('ul', { className: 'files files--pinned', 'aria-label': 'ملفات الواجب' }, g.files.map(f => h(FileRow, { key: f.n, f }))),
        status === 'current' ? h(SaveOffline, { files: g.files }) : null)));
}

const ORDER = { current: 0, upcoming: 1, done: 2 };

export function FilesPage({ query = {}, nav = 0 }) {
  const state = academicState();
  const st = { ...state, week: state.phase === 'after' ? 99 : state.week };
  const total = FILES.reduce((a, f) => a + f.size, 0);
  const groups = ASSIGNMENT_GROUPS
    .map(g => ({ g, status: groupStatus(DUES.find(x => x.n === g.due), st) }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.g.due - a.g.due);
  const [expanded, setExpanded] = useState(() => new Set());
  const toggle = n => setExpanded(s => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; });

  // Deep links from the calendar: #/files?a=2 shows that assignment (opening it if folded).
  const [target, setTarget] = useState(null);
  useEffect(() => {
    const n = parseInt(query.a, 10);
    if (!ASSIGNMENT_GROUPS.some(g => g.due === n)) return;
    setExpanded(s => new Set(s).add(n));
    setTarget({ n, nav });
  }, [nav]);
  useEffect(() => { if (target) revealTarget(document.getElementById(`assign-${target.n}`)); }, [target]);

  return h('div', { className: 'page page-files' },
    h(PageHead, {
      eyebrow: h(Fragment, null, h(Icon, { name: 'folder', size: 16 }), 'ملفات المقرر'),
      title: 'الملفات',
      lead: 'ملفات كل واجب مع قائمة ما تسلّمه وصيغة تسمية الملف، ثم ملفات المقرر العامة. افتح أي ملف أو حمّله.',
    }),
    h('div', { className: 'assignments' },
      groups.map(({ g, status }) => h(AssignmentGroup, {
        key: g.due, g, state: st, status, open: expanded.has(g.due), onToggle: () => toggle(g.due),
      }))),
    h(Section, {
      id: 'course-files', title: 'ملفات المقرر', icon: 'folder',
      meta: h(Chip, null, h('bdi', { className: 'num' }, `${filesPhrase(FILES.length)} · ${fmtBytes(total)}`)),
    },
      h('ul', { className: 'files files--grid' }, FILES.map(f => h(FileRow, { key: f.n, f })))));
}
