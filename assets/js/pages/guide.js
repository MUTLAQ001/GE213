import { h, cx, useState, useEffect, Fragment } from '../lib/react.js';
import { WEEKS, DUES, AR_MONTHS } from '../lib/dates.js';
import { fmtNum } from '../lib/ar.js';
import { DEF_TABLES, LAPSE_TABLE, MATRIX_E, MATRIX_D, gradeFor } from '../lib/grading.js';
import { TERM } from '../../data/term-481.js';
import { Icon } from '../components/icons.js';
import { PageHead, Chip, Callout } from '../components/ui.js';

const SECTIONS = [
  { id: 'overview', title: 'نظرة عامة', icon: 'book' },
  { id: 'grading', title: 'تقييم الواجبات', icon: 'listChecks' },
  { id: 'defects', title: 'العيوب', icon: 'alert' },
  { id: 'grades', title: 'جدول التقدير', icon: 'trophy' },
  { id: 'discipline', title: 'الانضباط والتحفيز', icon: 'gauge' },
  { id: 'fail', title: 'أسباب الرسوب', icon: 'xCircle' },
];
const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollToSection = id => document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });

const GSection = ({ id, children }) => {
  const s = SECTIONS.find(x => x.id === id);
  return h('section', { id, className: 'gsec', 'aria-labelledby': `${id}-h` },
    h('h2', { className: 'gsec-title', id: `${id}-h` }, h('span', { className: 'gsec-icon' }, h(Icon, { name: s.icon, size: 18 })), s.title),
    children);
};

const LEGEND = [
  ['E', 'success', 'تجاوز التوقعات', 'حققت المطلوب وزدت عليه شيئًا له قيمة.'],
  ['M', 'accent', 'حقق التوقعات', 'أنجزت كل بنود قائمة التدقيق (Checklist).'],
  ['NI', 'warning', 'يحتاج تحسين', 'نقص جزئي في التوقعات.'],
  ['NCE', 'danger', 'بلا جهد مقنع', 'وتُسجَّل معه مخالفة انضباط.'],
  ['NS', 'danger', 'لم يُسلَّم', 'وتُسجَّل معه مخالفة انضباط.'],
];

const LAPSES = [
  ['الغياب عن الحصة', '1'],
  ['التأخر حتى 10 دقائق', '0.5'],
  ['التأخر أكثر من 10 دقائق', '1'],
  ['عدم المشاركة أو الحضور بدون تحضير', '1'],
  ['تقييم NCE أو NS في التسليم الأول', '1'],
  ['تأخر إعادة التسليم', '1 لكل أسبوع'],
];

const FAILS = [
  'مجموع عيوب أكثر من 3.',
  'تجاوز 9.5 مخالفة انضباط.',
  'مخالفة سياسة النزاهة الأكاديمية (الغش أو الانتحال)، وقد تصل إلى الفصل بتقدير FX حتى في المخالفات البسيطة.',
  'تجاوز نسبة الغياب المسموحة حسب لوائح الكلية والجامعة.',
];

function ConvTable({ title, code, tone, unit, pairs }) {
  return h('figure', { className: 'conv' },
    h('figcaption', { className: 'conv-head' }, h('span', null, title), h(Chip, { tone }, h('bdi', null, code))),
    h('table', { className: 'table conv-table' },
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, unit), h('th', { scope: 'col' }, 'العيوب'))),
      h('tbody', null, pairs.map(([k, v]) => h('tr', { key: k },
        h('td', null, h('bdi', null, k)),
        h('td', { className: cx('conv-val', v === 0 ? 'is-zero' : v <= 1 ? 'is-low' : v <= 2 ? 'is-mid' : 'is-high') }, fmtNum(v)))))));
}

export function GradeMatrix() {
  return h('div', { className: 'table-scroll', role: 'region', 'aria-label': 'جدول التقدير النهائي', tabIndex: 0 },
    h('table', { className: 'matrix matrix--full' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col', className: 'matrix-corner' }, h('abbr', { title: 'عدد الـ Exceeds' }, 'E'), ' \\ العيوب'),
        MATRIX_D.map(d => h('th', { key: d, scope: 'col' }, fmtNum(d))))),
      h('tbody', null, MATRIX_E.map(e => h('tr', { key: e },
        h('th', { scope: 'row' }, e === 3 ? '3+' : e),
        MATRIX_D.map(d => { const g = gradeFor(e, d); return h('td', { key: d, className: cx('mcell', `g-${g[0]}`) }, h('bdi', null, g)); }))))));
}

export function GuidePage({ sub }) {
  const [active, setActive] = useState(sub && SECTIONS.some(s => s.id === sub) ? sub : 'overview');

  // Deep links such as #/guide/defects.
  useEffect(() => { if (sub && SECTIONS.some(s => s.id === sub)) { setActive(sub); scrollToSection(sub); } }, [sub]);

  // Highlight the section being read.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const els = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver(entries => {
      const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: '-80px 0px -65% 0px', threshold: 0 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (ev, id) => {
    ev.preventDefault();
    history.replaceState(null, '', `#/guide/${id}`);
    setActive(id);
    scrollToSection(id);
  };

  const [y, m, d] = TERM.lastUpdated;
  return h('div', { className: 'page page-guide' },
    h(PageHead, {
      eyebrow: h(Fragment, null, h(Icon, { name: 'book', size: 16 }), 'دليل المقرر'),
      title: 'كيف يعمل المقرر؟',
      lead: 'نظام التقييم والعيوب والانضباط في صفحة واحدة. افهمه من أول يوم.',
    }),
    h('div', { className: 'guide-layout' },
      h('nav', { className: 'toc', 'aria-label': 'محتويات الدليل' },
        h('p', { className: 'toc-title' }, 'المحتويات'),
        h('ol', { className: 'toc-list' }, SECTIONS.map(s => h('li', { key: s.id },
          h('a', {
            href: `#/guide/${s.id}`, className: cx('toc-link', active === s.id && 'is-active'),
            'aria-current': active === s.id ? 'true' : undefined, onClick: ev => go(ev, s.id),
          }, h(Icon, { name: s.icon, size: 16 }), s.title))))),
      h('div', { className: 'guide-body' },
        h(GSection, { id: 'overview' },
          h(Callout, { tone: 'warning', icon: 'alert' },
            h('strong', null, 'GE213 امتداد لـ GE211، لكن بدون كويزات وبدون قسمين.'),
            ' قسم واحد فقط بحصتين أسبوعيًا، وكل شيء يعتمد على الواجبات والمشروع والانضباط. افهم نظام العيوب من أول يوم.'),
          h('ul', { className: 'facts' },
            h('li', null, h('b', { className: 'num' }, WEEKS.length), h('span', null, 'أسبوعًا')),
            h('li', null, h('b', { className: 'num' }, '2'), h('span', null, 'حصتان أسبوعيًا')),
            h('li', null, h('b', { className: 'num' }, DUES.length), h('span', null, 'تسليمات')),
            h('li', null, h('b', { className: 'num' }, '0'), h('span', null, 'كويزات'))),
          h('div', { className: 'tracks' },
            h('div', { className: 'track track--brand' },
              h('span', { className: 'track-icon' }, h(Icon, { name: 'book', size: 20 })),
              h('h3', { className: 'track-title' }, 'حل المشكلات الهندسية'),
              h('p', null, 'مشكلات مفتوحة بدون حل جاهز، تتعلم تفكيكها وتحديد المتغيرات والقيود عبر كتاب ', h('bdi', null, 'How to Model It'), '.')),
            h('div', { className: 'track track--accent' },
              h('span', { className: 'track-icon' }, h(Icon, { name: 'flask', size: 20 })),
              h('h3', { className: 'track-title' }, 'النماذج الحسابية'),
              h('p', null, 'بناء نماذج على ', h('bdi', null, 'Excel'), ' وحلها وتحليل نتائجها، وينتهي المقرر بمشروع جماعي بتقرير وعرض نهائي.')))),

        h(GSection, { id: 'grading' },
          h('p', { className: 'gsec-lead' }, 'كل واجب يقيَّم بواحد من خمسة تقييمات:'),
          h('ul', { className: 'legend' }, LEGEND.map(([code, tone, name, text]) => h('li', { key: code },
            h(Chip, { tone, className: 'legend-code' }, h('bdi', null, code)),
            h('p', null, h('strong', null, name), ' — ', text)))),
          h(Callout, { tone: 'brand', icon: 'star' },
            'لديك فرصة واحدة لإعادة تسليم أي واجب بتقييم NI أو NCE أو NS، وأقصى تقييم بعد الإعادة هو ', h('strong', null, 'M'), '. أرفق العمل الأصلي مع المعاد.')),

        h(GSection, { id: 'defects' },
          h('p', { className: 'gsec-lead' }, 'تتحول التقييمات النهائية ومخالفات الانضباط إلى عيوب ', h('bdi', null, '(Defects)'), ' حسب الجداول التالية:'),
          h('div', { className: 'conv-grid' },
            DEF_TABLES.map(t => h(ConvTable, { key: t.key, ...t })),
            h(ConvTable, { title: 'مخالفات الانضباط', code: 'Lapses', tone: 'warning', unit: 'عدد المخالفات', pairs: LAPSE_TABLE })),
          h(Callout, { tone: 'info', icon: 'info' }, 'نسبة الاستلال تُحسب لكل تسليم على حدة: كل تقرير استلال يعطي عيوبه الخاصة، ثم تُجمع العيوب كلها.'),
          h(Callout, { tone: 'danger', icon: 'alert' }, 'إذا زاد مجموع العيوب على ', h('strong', null, '3'), ' فالتقدير ', h('strong', null, 'F'), ' مهما كان عدد الـ Exceeds.'),
          h('a', { className: 'btn btn--secondary gsec-cta', href: '#/calculator' }, h(Icon, { name: 'calculator', size: 18 }), 'جرّب حالتك في الحاسبة')),

        h(GSection, { id: 'grades' },
          h('p', { className: 'gsec-lead' }, 'التقدير النهائي يُقرأ من عدد الـ Exceeds (الصفوف) مقابل مجموع العيوب (الأعمدة):'),
          h(GradeMatrix),
          h(Callout, { tone: 'info', icon: 'info' }, 'بدون أي عيوب وبدون Exceeds يكون تقديرك ', h('strong', null, 'B'), '. الـ Exceeds هي التي ترفعك إلى A وA+.')),

        h(GSection, { id: 'discipline' },
          h('h3', { className: 'gsec-sub' }, 'تُسجَّل مخالفة انضباط عند'),
          h('ul', { className: 'rows' }, LAPSES.map(([t, v]) => h('li', { key: t }, h('span', null, t), h(Chip, { tone: 'warning' }, v)))),
          h('h3', { className: 'gsec-sub' }, 'نقاط التحفيز ', h('bdi', null, '(Bonus)')),
          h('ul', { className: 'rows' },
            h('li', null, h('span', null, 'تفاعل مميز داخل الحصة، بحد أقصى 5 نقاط في الفصل'), h(Chip, { tone: 'success' }, 'كل نقطة تمسح مخالفة')),
            h('li', null, h('span', null, 'بدون مخالفات؟ 4 نقاط ترفع واجبًا واحدًا'), h(Chip, { tone: 'success' }, h('bdi', null, 'NI → M'), ' أو ', h('bdi', null, 'M → E'))))),

        h(GSection, { id: 'fail' },
          h('p', { className: 'gsec-lead' }, 'أيٌّ من الحالات التالية يعني الرسوب المباشر:'),
          h('ul', { className: 'fails' }, FAILS.map(t => h('li', { key: t }, h(Icon, { name: 'xCircle', size: 18 }), h('span', null, t)))),
          h(Callout, { tone: 'success', icon: 'sparkles', title: 'نصيحة' },
            'احصل على الـ Exceeds مبكرًا حتى لا تنضغط في النهاية، وصحّح أي NI فور ظهوره قبل أن يتراكم عيوبًا. واحتفظ بكل أعمالك في ملف المقرر ', h('bdi', null, '(Portfolio)'), ' حتى تظهر الدرجات.')),

        h('p', { className: 'guide-foot' }, h(Icon, { name: 'history', size: 16 }),
          `آخر تحديث: ${d} ${AR_MONTHS[m]} ${y}. إذا استجدّت تفاصيل إضافية فستُضاف هنا بإذن الله.`))));
}
