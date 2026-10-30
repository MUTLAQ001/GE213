import { h, cx, useState, useEffect, useId } from '../lib/react.js';
import { Icon } from './icons.js';
import { fmtNum } from '../lib/ar.js';

/** Page heading: every route starts with its own h1 (focused on navigation). */
export function PageHead({ eyebrow, title, lead, children }) {
  return h('header', { className: 'page-head' },
    eyebrow ? h('p', { className: 'page-eyebrow' }, eyebrow) : null,
    h('h1', { className: 'page-title', tabIndex: -1 }, title),
    lead ? h('p', { className: 'page-lead' }, lead) : null,
    children);
}

export function Section({ id, title, icon, meta, lead, className, children }) {
  const hid = `${id}-title`;
  return h('section', { id, className: cx('section', className), 'aria-labelledby': hid },
    h('div', { className: 'section-head' },
      h('h2', { className: 'section-title', id: hid }, icon ? h(Icon, { name: icon }) : null, title),
      meta ? h('div', { className: 'section-meta' }, meta) : null),
    lead ? h('p', { className: 'section-lead' }, lead) : null,
    children);
}

export const Chip = ({ tone, icon, className, children, ...rest }) =>
  h('span', { className: cx('chip', tone && `chip--${tone}`, className), ...rest },
    icon ? h(Icon, { name: icon, size: 14 }) : null, children);

export const Code = ({ children, brand, ...rest }) =>
  h('bdi', { className: cx('code', brand && 'code--brand'), ...rest }, children);

export function Callout({ tone = 'info', icon = 'info', title, children, className }) {
  return h('div', { className: cx('callout', `callout--${tone}`, className), role: 'note' },
    h(Icon, { name: icon, size: 18 }),
    h('div', { className: 'callout-body' }, title ? h('strong', { className: 'callout-title' }, title) : null, children));
}

/** Numeric stepper with 40–44px targets. DOM order is decrease, value, increase. */
export function Stepper({ label, code, hint, value, onChange, step = 1, min = 0, max = 99 }) {
  const id = useId();
  const clamp = v => Math.min(max, Math.max(min, Math.round(v * 10) / 10));
  return h('div', { className: 'field' },
    h('div', { className: 'field-label' },
      h('span', { className: 'field-title', id: `${id}-l` }, label, code ? h(Chip, null, h('bdi', null, code)) : null),
      hint ? h('span', { className: 'field-hint', id: `${id}-h` }, hint) : null),
    h('div', { className: 'stepper', role: 'group', 'aria-labelledby': `${id}-l`, 'aria-describedby': hint ? `${id}-h` : undefined },
      h('button', { type: 'button', className: 'stepper-btn', onClick: () => onChange(clamp(value - step)), disabled: value <= min, 'aria-label': `إنقاص: ${label}` }, h(Icon, { name: 'minus', size: 18 })),
      h('output', { className: 'stepper-val', 'aria-live': 'polite' }, fmtNum(value)),
      h('button', { type: 'button', className: 'stepper-btn', onClick: () => onChange(clamp(value + step)), disabled: value >= max, 'aria-label': `زيادة: ${label}` }, h(Icon, { name: 'plus', size: 18 }))));
}

/* ---------- Toasts ---------- */
const listeners = new Set();
let seq = 0;
/** Shows a short message; `action` = { label, onClick } adds a button such as "تراجع". */
export function toast(message, { action, duration = 4500, icon = 'check' } = {}) {
  const t = { id: ++seq, message, action, duration, icon };
  listeners.forEach(fn => fn(t));
}
export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const timers = new Map();
    const dismiss = id => { setItems(xs => xs.filter(x => x.id !== id)); clearTimeout(timers.get(id)); timers.delete(id); };
    const on = t => {
      setItems(xs => [...xs.slice(-1), t]);
      timers.set(t.id, setTimeout(() => dismiss(t.id), t.duration));
    };
    on.dismiss = dismiss;
    listeners.add(on);
    ToastHost.dismiss = dismiss;
    return () => { listeners.delete(on); timers.forEach(clearTimeout); };
  }, []);
  return h('div', { className: 'toast-host', role: 'status', 'aria-live': 'polite' },
    items.map(t => h('div', { key: t.id, className: 'toast' },
      h(Icon, { name: t.icon, size: 18 }),
      h('span', null, t.message),
      t.action ? h('button', {
        type: 'button', className: 'toast-action',
        onClick: () => { t.action.onClick(); ToastHost.dismiss && ToastHost.dismiss(t.id); },
      }, t.action.label) : null)));
}

/** Copies text; falls back to a hidden textarea when the async API is unavailable. */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fallback below */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}
