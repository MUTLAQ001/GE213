// React is loaded as a classic script (assets/vendor) before this module graph runs.
export const React = window.React;
export const ReactDOM = window.ReactDOM;
export const { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, useId, Fragment } = React;
export const h = React.createElement;
/** Joins truthy class names. */
export const cx = (...names) => names.filter(Boolean).join(' ');
