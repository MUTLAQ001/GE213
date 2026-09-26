import { h, cx, useState, Fragment } from '../lib/react.js';
import { DUES, academicState, parseClass, relWeek, weekRange } from '../lib/dates.js';
import { fmtBytes } from '../lib/ar.js';
import { FILES, ASSIGNMENT_GROUPS } from '../../data/files.js';
import { Icon } from '../components/icons.js';
import { PageHead, Section, Chip, Code, toast, copyText } from '../components/ui.js';

const LARGE = 2 * 1048576;

function FileRow({ f }) {
  return h('li', { className: 'file' },
    h('span', { className: 'file-icon', 'aria-hidden': 'true' }, h(Icon, { name: 'file', size: 22 })),
    h('div', { className: 'file-body' },
      h('a', { className: 'file-title', href: f.file, target: '_blank', rel: 'noopener' },
        f.title, h(Icon, { name: 'external', size: 14, className: 'file-ext' }), h('span', { className: 'sr-only' }, ' (يفتح في نافذة جديدة)')),
      h('p', { className: 'file-sub' }, h('bdi', null, f.sub)),
      h('p', { className: 'file-desc' }, f.desc),
      h('p', { className: 'file-meta' },
        h('bdi', { className: 'num' }, `PDF · ${fmtBytes(f.size)}`),
        f.size > LARGE ? h(Chip, { tone: 'warning', icon: 'alert' }, 'ملف كبير') : null)),
    h('a', { className: 'icon-btn file-dl', href: f.file, download: '', 'aria-label': `تحميل: ${f.title}`, title: 'تحميل' },
      h(Icon, { name: 'download', size: 20 })));
}

function Naming({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const ok = await copyText(value);
    if (ok) { setCopied(true); toast('نُسخت صيغة التسمية.'); setTimeout(() => setCopied(false), 2000); }
    else toast('تعذّر النسخ. انسخ الصيغة يدويًا.', { icon: 'alert' });
  };
  return h('div', { className: 'naming' },
    h('span', { className: 'naming-label' }, 'سمِّ كل ملف بالصيغة'),
    h('code', { className: 'naming-code', dir: 'ltr' }, value),
    h('button', { type: 'button', className: 'btn btn--secondary naming-btn', onClick: copy },
      h(Icon, { name: copied ? 'check' : 'copy', size: 16 }), copied ? 'تم النسخ' : 'نسخ'));
}

function Timeline({ d, week }) {
  const steps = [
    { label: 'التسليم', code: d.due },
    d.ret ? { label: 'إرجاع التصحيح', code: d.ret } : null,
    d.re ? { label: 'إعادة التسليم', code: d.re } : null,
  ].filter(Boolean);
  return h('ol', { className: 'timeline', 'aria-label': 'مراحل الواجب' },
    steps.map(s => {
      const w = parseClass(s.code).week;
      const st = w < week ? 'done' : w === week ? 'now' : 'next';
      return h('li', { key: s.label, className: cx('tl-step', `is-${st}`) },
        h('span', { className: 'tl-dot', 'aria-hidden': 'true' }, st === 'done' ? h(Icon, { name: 'check', size: 12 }) : null),
        h('span', { className: 'tl-label' }, s.label),
        h('span', { className: 'tl-when' }, h(Code, null, s.code), ' ', st === 'done' ? 'انتهى' : relWeek(w, week)),
        h('span', { className: 'sr-only' }, ` — الأسبوع ${w}، ${weekRange(w)}`));
    }));
}

function AssignmentGroup({ g, week }) {
  const d = DUES.find(x => x.n === g.due);
  const hid = `assign-${g.due}-title`;
  return h('section', { className: 'assignment card', 'aria-labelledby': hid },
    h('header', { className: 'assignment-head' },
      h('div', { className: 'assignment-heading' },
        h('p', { className: 'assignment-eyebrow' },
          h(Chip, { tone: 'brand', icon: d.k === 'جماعي' ? 'users' : 'user' }, `الواجب ${d.n} · ${d.k}`)),
        h('h2', { className: 'assignment-title', id: hid }, g.title)),
      h(Timeline, { d, week })),
    h('div', { className: 'assignment-grid' },
      h('div', { className: 'deliver' },
        h('h3', { className: 'deliver-title' }, h(Icon, { name: 'listChecks', size: 18 }), 'ما الذي تسلّمه؟'),
        h('ul', { className: 'checklist' }, g.deliverables.map((t, i) =>
          h('li', { key: i }, h(Icon, { name: 'check', size: 16 }), h('span', null, t)))),
        h(Naming, { value: g.naming })),
      h('ul', { className: 'files files--pinned', 'aria-label': 'ملفات الواجب' }, g.files.map(f => h(FileRow, { key: f.n, f })))));
}

export function FilesPage() {
  const state = academicState();
  const week = state.phase === 'after' ? 99 : state.week;
  const total = FILES.reduce((a, f) => a + f.size, 0);
  return h('div', { className: 'page page-files' },
    h(PageHead, {
      eyebrow: h(Fragment, null, h(Icon, { name: 'folder', size: 16 }), 'ملفات المقرر'),
      title: 'الملفات',
      lead: 'افتح أي ملف مباشرة في المتصفح، أو حمّله إلى جهازك من زر التحميل.',
    }),
    ASSIGNMENT_GROUPS.map(g => h(AssignmentGroup, { key: g.due, g, week })),
    h(Section, {
      id: 'course-files', title: 'ملفات المقرر', icon: 'folder',
      meta: h(Chip, null, h('bdi', { className: 'num' }, `${FILES.length} ملفات · ${fmtBytes(total)}`)),
    },
      h('ul', { className: 'files files--grid' }, FILES.map(f => h(FileRow, { key: f.n, f })))));
}
