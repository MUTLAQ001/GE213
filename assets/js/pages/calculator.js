import { h, cx, useState, useEffect, useMemo, useRef, Fragment } from '../lib/react.js';
import { store } from '../lib/storage.js';
import { DUES } from '../lib/dates.js';
import { defLabel, fmtNum } from '../lib/ar.js';
import { ZERO, STORAGE_KEY, calculate, improvements, migratePlag, plagDef, gradeFor, MATRIX_E, MATRIX_D } from '../lib/grading.js';
import { Icon } from '../components/icons.js';
import { PageHead, Chip, Callout, Stepper, toast } from '../components/ui.js';

const plagName = i => (DUES[Math.min(i, DUES.length - 1)] || { t: 'تسليم آخر' }).t;
const num = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

/** Reads the saved state written by this site (key and shape unchanged since the first version). */
function load() {
  const saved = store.getJSON(STORAGE_KEY, {}) || {};
  return {
    ...ZERO, ...saved,
    e: num(saved.e), ni: num(saved.ni), nce: num(saved.nce), lapses: num(saved.lapses), bonus: num(saved.bonus),
    plag: migratePlag(saved.plag, plagName),
  };
}

function PlagList({ rows, set }) {
  const add = () => set([...rows, { id: `p${Date.now()}`, name: plagName(rows.length), pct: 0 }]);
  const upd = (id, pct) => set(rows.map(r => (r.id === id ? { ...r, pct } : r)));
  const rename = (id, name) => set(rows.map(r => (r.id === id ? { ...r, name } : r)));
  const del = id => set(rows.filter(r => r.id !== id));
  return h(Fragment, null,
    rows.length ? h('ul', { className: 'plag-list' }, rows.map(r => {
      const def = plagDef(r.pct);
      const level = def >= 2 ? 'danger' : def > 0 ? 'warn' : undefined;
      return h('li', { key: r.id, className: 'plag' },
        h('div', { className: 'plag-top' },
          h('label', { className: 'sr-only', htmlFor: `${r.id}-name` }, 'التسليم'),
          h('span', { className: 'select-wrap' },
            h('select', { id: `${r.id}-name`, className: 'select', value: r.name, onChange: ev => rename(r.id, ev.target.value) },
              DUES.map(d => h('option', { key: d.n, value: d.t }, d.t)),
              h('option', { value: 'تسليم آخر' }, 'تسليم آخر')),
            h(Icon, { name: 'chevronDown', size: 16 })),
          h('button', { type: 'button', className: 'icon-btn icon-btn--danger', onClick: () => del(r.id), 'aria-label': `حذف: ${r.name}` }, h(Icon, { name: 'x', size: 18 }))),
        h('div', { className: 'plag-bottom' },
          h('input', {
            type: 'range', className: 'range', min: 0, max: 100, step: 1, value: r.pct,
            'data-level': level, style: { '--p': `${r.pct}%` },
            onChange: ev => upd(r.id, +ev.target.value),
            'aria-label': `نسبة الاستلال: ${r.name}`, 'aria-valuetext': `${r.pct}%، ${defLabel(def)}`,
          }),
          h('output', { className: 'plag-pct num' }, h('bdi', null, `${r.pct}%`)),
          h(Chip, { tone: def >= 2 ? 'danger' : def > 0 ? 'warning' : undefined, className: 'plag-def' }, defLabel(def))));
    })) : h('p', { className: 'empty' }, h(Icon, { name: 'check', size: 16 }), 'لا توجد تقارير استلال. أضف تسليمًا فقط إذا وصلك تقرير.'),
    h('button', { type: 'button', className: 'btn btn--dashed', onClick: add }, h(Icon, { name: 'plus', size: 18 }), 'إضافة تسليم'));
}

function Matrix({ e, total, compact }) {
  const row = e >= 3 ? 0 : e === 2 ? 1 : e === 1 ? 2 : 3;
  const col = total <= 3 ? Math.round(total * 2) : -1;
  return h('div', { className: cx('matrix-wrap', compact && 'is-compact') },
    h('table', { className: 'matrix' },
      h('caption', { className: 'sr-only' }, 'جدول التقدير: الصفوف عدد الـ Exceeds، والأعمدة مجموع العيوب'),
      h('thead', null, h('tr', null,
        h('th', { scope: 'col', className: 'matrix-corner' }, h('abbr', { title: 'عدد الـ Exceeds' }, 'E')),
        MATRIX_D.map(d => h('th', { key: d, scope: 'col' }, fmtNum(d))))),
      h('tbody', null, MATRIX_E.map((re, i) => h('tr', { key: re },
        h('th', { scope: 'row' }, re === 3 ? '3+' : re),
        MATRIX_D.map((d, j) => {
          const cg = gradeFor(re, d), on = compact && i === row && j === col;
          return h('td', { key: d, className: cx('mcell', `g-${cg[0]}`, on && 'is-on'), 'aria-current': on ? 'true' : undefined }, h('bdi', null, cg));
        }))))),
    h('p', { className: 'matrix-legend' }, 'الصفوف: عدد الـ Exceeds · الأعمدة: مجموع العيوب'));
}

function ResultCard({ res, hints, onReset, cardRef }) {
  return h('section', { className: 'result card', id: 'result', ref: cardRef, 'aria-labelledby': 'result-title' },
    h('h2', { className: 'result-title', id: 'result-title' }, 'التقدير المتوقع'),
    h('div', { className: cx('grade', `g-${res.g[0]}`), 'aria-live': 'polite', 'aria-atomic': 'true' },
      h('span', { className: 'sr-only' }, 'التقدير المتوقع: '),
      h('bdi', { className: 'grade-letter', 'data-testid': 'grade' }, res.g)),
    h('dl', { className: 'result-stats' },
      h('div', { className: 'stat' }, h('dt', null, 'مجموع العيوب'), h('dd', { className: 'num', 'data-testid': 'defects' }, fmtNum(res.total))),
      h('div', { className: 'stat' }, h('dt', null, h('bdi', null, 'Exceeds'), ' المحتسبة'), h('dd', { className: 'num', 'data-testid': 'exceeds' }, res.e))),
    res.total > 3 ? h(Callout, { tone: 'danger', icon: 'alert' }, 'مجموع العيوب أكثر من 3، لذلك التقدير ', h('strong', null, 'F'), ' مهما كان عدد الـ Exceeds.') : null,
    res.note ? h('p', { className: 'result-note', 'data-testid': 'bonus-note' }, h(Icon, { name: 'star', size: 16 }), res.note) : null,
    hints.length ? h('div', { className: 'hints' },
      h('p', { className: 'hints-title' }, h(Icon, { name: 'target', size: 16 }), 'لرفع تقديرك'),
      h('ul', null, hints.map((x, i) => h('li', { key: i },
        h('span', null, x.label),
        h('span', { className: 'hint-to' }, 'يرفعك إلى ', h('b', { className: cx('grade-chip', `g-${x.grade[0]}`) }, h('bdi', null, x.grade)))))))
      : res.g === 'A+' ? h('p', { className: 'result-top' }, h(Icon, { name: 'trophy', size: 16 }), 'هذا أعلى تقدير ممكن. حافظ عليه.') : null,
    h(Matrix, { e: res.e, total: res.total, compact: true }),
    h('div', { className: 'result-actions' },
      h('a', { className: 'btn btn--ghost', href: '#/guide/defects' }, h(Icon, { name: 'info', size: 18 }), 'كيف تُحسب العيوب؟'),
      h('button', { type: 'button', className: 'btn btn--danger', onClick: onReset }, h(Icon, { name: 'undo', size: 18 }), 'تصفير')));
}

function ResultBar({ res, hidden }) {
  const go = () => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return h('div', { className: cx('result-bar', hidden && 'is-hidden'), 'aria-hidden': hidden ? 'true' : undefined },
    h('button', { type: 'button', className: 'result-bar-btn', onClick: go, tabIndex: hidden ? -1 : 0 },
      h('span', { className: 'result-bar-label' }, 'التقدير المتوقع'),
      h('bdi', { className: cx('result-bar-grade', `g-${res.g[0]}`) }, res.g),
      h('span', { className: 'result-bar-meta' }, 'العيوب ', h('b', { className: 'num' }, fmtNum(res.total))),
      h('span', { className: 'result-bar-more' }, 'التفاصيل', h(Icon, { name: 'chevronDown', size: 16 }))));
}

export function CalculatorPage() {
  const [st, setSt] = useState(load);
  useEffect(() => { store.setJSON(STORAGE_KEY, st); }, [st]);
  const res = useMemo(() => calculate(st), [st]);
  const hints = useMemo(() => improvements(st), [st]);
  const up = (k, v) => setSt(p => ({ ...p, [k]: v }));

  const cardRef = useRef(null);
  const [cardVisible, setCardVisible] = useState(true);
  useEffect(() => {
    if (!('IntersectionObserver' in window) || !cardRef.current) return;
    const io = new IntersectionObserver(([en]) => setCardVisible(en.isIntersecting), { threshold: 0.15 });
    io.observe(cardRef.current);
    return () => io.disconnect();
  }, []);

  const reset = () => {
    const prev = st;
    setSt({ ...ZERO, plag: [] });
    toast('صُفّرت الحاسبة.', { action: { label: 'تراجع', onClick: () => setSt(prev) }, duration: 6000 });
  };

  return h('div', { className: 'page page-calc' },
    h(PageHead, {
      eyebrow: h(Fragment, null, h(Icon, { name: 'calculator', size: 16 }), 'حاسبة التقدير'),
      title: 'احسب تقديرك المتوقع',
      lead: 'أدخل تقييماتك، ويتحدث التقدير فورًا. تُحفظ القيم في جهازك فقط.',
    }),
    h('div', { className: 'calc-layout' },
      h('div', { className: 'calc-form' },
        h('section', { className: 'card calc-card', 'aria-labelledby': 'c1' },
          h('h2', { className: 'card-title', id: 'c1' }, h(Icon, { name: 'listChecks' }), 'تقييمات الواجبات'),
          h('div', { className: 'fields' },
            h(Stepper, { label: 'تجاوز التوقعات', code: 'E', hint: 'واجبات حققت المطلوب وزادت عليه', value: st.e, onChange: v => up('e', v), max: 20 }),
            h(Stepper, { label: 'يحتاج تحسين', code: 'NI', hint: 'نقص جزئي في التوقعات', value: st.ni, onChange: v => up('ni', v), max: 20 }),
            h(Stepper, { label: 'بلا جهد مقنع أو لم يُسلَّم', code: 'NCE / NS', hint: 'تُسجَّل مع كل واحد منها مخالفة انضباط، فأضفها في خانة المخالفات', value: st.nce, onChange: v => up('nce', v), max: 20 }))),
        h('section', { className: 'card calc-card', 'aria-labelledby': 'c2' },
          h('div', { className: 'card-head' },
            h('h2', { className: 'card-title', id: 'c2' }, h(Icon, { name: 'shield' }), 'نسبة الاستلال'),
            st.plag.length ? h(Chip, { tone: res.parts.plag > 0 ? 'warning' : undefined }, defLabel(Math.round(res.parts.plag * 10) / 10)) : null),
          h('p', { className: 'card-lead' }, 'تُحسب النسبة لكل تسليم على حدة، ثم تُجمع عيوب كل التسليمات.'),
          h(PlagList, { rows: st.plag, set: v => up('plag', v) })),
        h('section', { className: 'card calc-card', 'aria-labelledby': 'c3' },
          h('h2', { className: 'card-title', id: 'c3' }, h(Icon, { name: 'gauge' }), 'الانضباط والتحفيز'),
          h('div', { className: 'fields' },
            h(Stepper, { label: 'مخالفات الانضباط', code: 'Lapses', hint: 'الغياب 1، والتأخر حتى 10 دقائق 0.5', value: st.lapses, onChange: v => up('lapses', v), step: 0.5, max: 30 }),
            h(Stepper, { label: 'نقاط التحفيز', code: 'Bonus', hint: 'حتى 5 نقاط في الفصل من المشاركة المتميزة', value: st.bonus, onChange: v => up('bonus', v), max: Math.max(5, st.bonus) })),
          h(Callout, { tone: 'brand', icon: 'star' },
            'كل نقطة تحفيز تمسح مخالفة انضباط. وإذا لم تكن لديك مخالفات، فإن ', h('strong', null, '4 نقاط'), ' ترفع واجبًا من NI إلى M أو من M إلى E.'))),
      h('aside', { className: 'calc-aside' }, h(ResultCard, { res, hints, onReset: reset, cardRef }))),
    h(ResultBar, { res, hidden: cardVisible }));
}
