import { h, cx, ReactDOM, useState, useEffect, useRef } from './lib/react.js';
import { store } from './lib/storage.js';
import { TERM } from '../data/term-481.js';
import { FILES } from '../data/files.js';
import { AR_MONTHS } from './lib/dates.js';
import { Icon } from './components/icons.js';
import { ToastHost, toast } from './components/ui.js';
import { CalendarPage } from './pages/calendar.js';

// The calendar ships with the first load; the other pages are fetched on demand
// (and prefetched once the browser is idle, so switching stays instant and works offline).
const ROUTES = [
  { id: 'calendar', label: 'التقويم', icon: 'calendar', title: `التقويم الأسبوعي — ${TERM.course} ${TERM.name}` },
  { id: 'files', label: 'الملفات', icon: 'folder', title: `ملفات الواجبات والمقرر — ${TERM.course}`, load: () => import('./pages/files.js').then(m => m.FilesPage) },
  { id: 'calculator', label: 'الحاسبة', icon: 'calculator', title: `حاسبة التقدير — ${TERM.course}`, load: () => import('./pages/calculator.js').then(m => m.CalculatorPage) },
  { id: 'guide', label: 'الدليل', icon: 'book', title: `دليل التقييم والعيوب — ${TERM.course}`, load: () => import('./pages/guide.js').then(m => m.GuidePage) },
];
const PAGES = { calendar: CalendarPage };
const ROUTE_KEY = 'ge213_route';
const THEME_KEY = 'ge213_theme';
const DEV_URL = 'https://t.me/MUTLAQ1';

/** "#/guide/defects" → { id: 'guide', sub: 'defects' }; "#/files?a=2" → { id: 'files', query: { a: '2' } }; else null. */
function parseHash(hash = location.hash) {
  const m = /^#\/([a-z]+)(?:\/([\w-]+))?\/?(?:\?([^#]*))?$/.exec(hash);
  if (!m || !ROUTES.some(r => r.id === m[1])) return null;
  const query = {};
  if (m[3]) new URLSearchParams(m[3]).forEach((v, k) => { query[k] = v; });
  return { id: m[1], sub: m[2] || null, query };
}

let navSeq = 0;
function initialRoute() {
  const fromHash = parseHash();
  if (fromHash) return { ...fromHash, nav: navSeq };
  const last = store.get(ROUTE_KEY);
  const id = ROUTES.some(r => r.id === last) ? last : 'calendar';
  history.replaceState(null, '', `#/${id}`);
  return { id, sub: null, query: {}, nav: navSeq };
}

function useRoute() {
  const [route, setRoute] = useState(initialRoute);
  useEffect(() => {
    const onHash = () => {
      const next = parseHash();
      if (!next) {
        // In-page anchors such as the skip link are not routes; unknown routes fall back.
        if (/^#\//.test(location.hash)) history.replaceState(null, '', `#/${route.id}`);
        return;
      }
      setRoute(prev => {
        if (prev.id !== next.id) window.scrollTo(0, 0);
        return { ...next, nav: ++navSeq };
      });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [route.id]);
  return route;
}

/** Resolves a route's page component, loading its module the first time it is needed. */
function usePage(def) {
  const [, rerender] = useState(0);
  const [failed, setFailed] = useState(null);
  useEffect(() => {
    if (PAGES[def.id] || !def.load) return;
    let live = true;
    setFailed(null);
    def.load().then(P => { PAGES[def.id] = P; if (live) rerender(n => n + 1); })
      .catch(() => { if (live) setFailed(def.id); });
    return () => { live = false; };
  }, [def.id, failed === def.id ? 'retry' : '']);
  return { Page: PAGES[def.id] || null, failed: failed === def.id, retry: () => setFailed(null) };
}

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function useTheme() {
  const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  const [explicit, setExplicit] = useState(() => { const t = store.get(THEME_KEY); return t === 'light' || t === 'dark' ? t : null; });
  const [sysLight, setSysLight] = useState(() => !!(mq && mq.matches));
  useEffect(() => {
    if (!mq) return;
    const on = e => setSysLight(e.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on));
  }, []);
  const theme = explicit || (sysLight ? 'light' : 'dark');
  useEffect(() => {
    const root = document.documentElement;
    if (explicit) root.setAttribute('data-theme', explicit); else root.removeAttribute('data-theme');
    // Keep the browser chrome in step with the page background.
    const bg = cssVar('--bg');
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
      if (explicit) m.setAttribute('content', bg);
      else m.setAttribute('content', m.getAttribute('data-default') || bg);
    });
  }, [explicit, theme]);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    store.set(THEME_KEY, next);
    setExplicit(next);
  };
  return [theme, toggle];
}

function TopNav({ current }) {
  const i = Math.max(0, ROUTES.findIndex(r => r.id === current));
  return h('nav', { className: 'topnav', 'aria-label': 'الأقسام', style: { '--i': i } },
    h('span', { className: 'topnav-glider', 'aria-hidden': 'true' }),
    ROUTES.map(r => h('a', {
      key: r.id, href: `#/${r.id}`, className: 'topnav-link',
      'aria-current': r.id === current ? 'page' : undefined,
    }, h(Icon, { name: r.icon, size: 18 }), r.label)));
}

function BottomNav({ current }) {
  return h('nav', { className: 'bottomnav', 'aria-label': 'الأقسام' },
    h('ul', { className: 'bottomnav-list' }, ROUTES.map(r => h('li', { key: r.id },
      h('a', { href: `#/${r.id}`, className: 'bottomnav-link', 'aria-current': r.id === current ? 'page' : undefined },
        h('span', { className: 'bottomnav-pill' }, h(Icon, { name: r.icon, size: 22 })),
        h('span', null, r.label))))));
}

function AppBar({ current, theme, onToggleTheme }) {
  return h('header', { className: 'appbar' },
    h('div', { className: 'appbar-inner' },
      h('a', { className: 'brand', href: '#/calendar', 'aria-label': `${TERM.course}، ${TERM.name}: التقويم` },
        h('img', { className: 'brand-logo', src: 'assets/icons/favicon.svg', alt: '', width: 32, height: 32 }),
        h('span', { className: 'brand-mark' }, h('bdi', null, TERM.course)),
        h('span', { className: 'brand-term' }, TERM.name)),
      h(TopNav, { current }),
      h('div', { className: 'appbar-actions' },
        h('button', {
          type: 'button', className: 'icon-btn', onClick: onToggleTheme,
          'aria-label': theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن',
          title: theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن',
        }, h(Icon, { name: theme === 'dark' ? 'sun' : 'moon' })),
        h('a', { className: 'dev-link', href: DEV_URL, target: '_blank', rel: 'noopener', 'aria-label': 'مطوّر الموقع: مطلق، على تيليجرام' },
          h(Icon, { name: 'send', size: 16 }),
          h('span', { className: 'dev-label' }, 'تطوير'),
          h('span', null, 'مطلق')))));
}

const CALENDAR_PDF = FILES.find(f => f.n === 2);

function Footer() {
  const [y, m, d] = TERM.lastUpdated;
  return h('footer', { className: 'site-foot' },
    h('div', { className: 'site-foot-inner' },
      h('p', null, h('bdi', null, `موقع غير رسمي لطلاب ${TERM.course}`), ` · ${TERM.name}`),
      h('p', null,
        'مصدر المواعيد: ',
        CALENDAR_PDF ? h('a', { href: CALENDAR_PDF.file, target: '_blank', rel: 'noopener' }, `تقويم ${TERM.name} `, h('bdi', null, '(PDF)')) : `تقويم ${TERM.name}`,
        h('span', { className: 'sep', 'aria-hidden': 'true' }, ' · '), h('br', { className: 'site-foot-br' }),
        `آخر تحديث: ${d} ${AR_MONTHS[m]} ${y}`,
        h('span', { className: 'sep', 'aria-hidden': 'true' }, ' · '), h('br', { className: 'site-foot-br' }),
        'وجدت خطأ؟ ',
        h('a', { href: DEV_URL, target: '_blank', rel: 'noopener' }, 'راسلني على تيليجرام', h('span', { className: 'sr-only' }, ' (يفتح في نافذة جديدة)')))));
}

function PageLoading({ failed, retry }) {
  return h('div', { className: 'page-loading', role: failed ? 'alert' : 'status' },
    failed
      ? h('div', { className: 'page-loading-error' },
          h('p', null, 'تعذّر تحميل الصفحة. تحقّق من الاتصال ثم أعد المحاولة.'),
          h('button', { type: 'button', className: 'btn btn--secondary', onClick: retry }, h(Icon, { name: 'undo', size: 18 }), 'إعادة المحاولة'))
      : h('span', { className: 'sr-only' }, 'جارٍ تحميل الصفحة…'));
}

function App() {
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const def = ROUTES.find(r => r.id === route.id) || ROUTES[0];
  const { Page, failed, retry } = usePage(def);
  // No entrance animation on the first page of a visit: content shows at once.
  const animate = route.nav > 0;
  const focusDone = useRef(true);

  useEffect(() => {
    document.title = def.title;
    store.set(ROUTE_KEY, def.id);
  }, [def.id]);
  useEffect(() => { if (route.nav > 0) focusDone.current = false; }, [def.id]);
  useEffect(() => {
    if (!Page || focusDone.current) return;
    focusDone.current = true;
    // Move focus to the new page heading so keyboard and screen-reader users land on it.
    const h1 = document.querySelector('.page-title');
    if (h1) h1.focus({ preventScroll: true });
  }, [Page, def.id]);

  return h('div', { className: 'app' },
    h(AppBar, { current: def.id, theme, onToggleTheme: toggleTheme }),
    h('main', { id: 'main', className: 'main', tabIndex: -1 },
      Page
        ? h('div', { key: def.id, className: cx('page-frame', animate && 'is-entering') },
            h(Page, { sub: route.sub, query: route.query, nav: route.nav }))
        : h(PageLoading, { failed, retry })),
    h(Footer),
    h(BottomNav, { current: def.id }),
    h(ToastHost));
}

// Skip link: focus the main landmark without touching the hash router.
document.addEventListener('click', ev => {
  const a = ev.target.closest && ev.target.closest('.skip-link');
  if (!a) return;
  ev.preventDefault();
  const main = document.getElementById('main');
  if (main) { main.focus(); main.scrollIntoView({ block: 'start' }); }
});

ReactDOM.createRoot(document.getElementById('root')).render(h(App));

// Warm the other pages once the calendar is on screen.
const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1500));
window.addEventListener('load', () => idle(() => ROUTES.forEach(r => {
  if (r.load && !PAGES[r.id]) r.load().then(P => { PAGES[r.id] = P; }).catch(() => {});
})));

// Offline support (skipped on file:// and on hosts without service workers).
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  // The worker serves cached code and data instantly, then checks the network; when the
  // schedule or the site changed it says so here, and one tap loads the new version.
  let announced = false;
  navigator.serviceWorker.addEventListener('message', ev => {
    if (!ev.data || ev.data.type !== 'ge213:update' || announced) return;
    announced = true;
    toast('تحديث متاح للموقع.', { icon: 'sparkles', duration: 20000, action: { label: 'تحديث', onClick: () => location.reload() } });
  });
}
