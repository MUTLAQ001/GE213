import { h, cx, ReactDOM, useState, useEffect, useRef } from './lib/react.js';
import { store } from './lib/storage.js';
import { TERM } from '../data/term-481.js';
import { Icon } from './components/icons.js';
import { ToastHost } from './components/ui.js';
import { CalendarPage } from './pages/calendar.js';
import { FilesPage } from './pages/files.js';
import { CalculatorPage } from './pages/calculator.js';
import { GuidePage } from './pages/guide.js';

const ROUTES = [
  { id: 'calendar', label: 'التقويم', icon: 'calendar', title: 'التقويم', Page: CalendarPage },
  { id: 'files', label: 'الملفات', icon: 'folder', title: 'الملفات', Page: FilesPage },
  { id: 'calculator', label: 'الحاسبة', icon: 'calculator', title: 'حاسبة التقدير', Page: CalculatorPage },
  { id: 'guide', label: 'الدليل', icon: 'book', title: 'دليل المقرر', Page: GuidePage },
];
const ROUTE_KEY = 'ge213_route';
const THEME_KEY = 'ge213_theme';
const DEV_URL = 'https://t.me/MUTLAQ1';

/** "#/guide/defects" → { id: 'guide', sub: 'defects' }; anything else → null. */
function parseHash(hash = location.hash) {
  const m = /^#\/([a-z]+)(?:\/([\w-]+))?\/?$/.exec(hash);
  if (!m || !ROUTES.some(r => r.id === m[1])) return null;
  return { id: m[1], sub: m[2] || null };
}

function initialRoute() {
  const fromHash = parseHash();
  if (fromHash) return fromHash;
  const last = store.get(ROUTE_KEY);
  const id = ROUTES.some(r => r.id === last) ? last : 'calendar';
  history.replaceState(null, '', `#/${id}`);
  return { id, sub: null };
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
        return next;
      });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [route.id]);
  return route;
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


function App() {
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const def = ROUTES.find(r => r.id === route.id) || ROUTES[0];
  const first = useRef(true);

  useEffect(() => {
    document.title = `${def.title} — ${TERM.course}`;
    store.set(ROUTE_KEY, def.id);
    if (first.current) { first.current = false; return; }
    // Move focus to the new page heading so keyboard and screen-reader users land on it.
    const h1 = document.querySelector('.page-title');
    if (h1) h1.focus({ preventScroll: true });
  }, [def.id]);

  return h('div', { className: 'app' },
    h(AppBar, { current: def.id, theme, onToggleTheme: toggleTheme }),
    h('main', { id: 'main', className: 'main', tabIndex: -1 },
      h(def.Page, { key: def.id, sub: route.sub })),
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

// Offline support (skipped on file:// and on hosts without service workers).
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
