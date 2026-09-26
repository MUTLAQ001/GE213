// Arabic wording helpers: number agreement and compact formatting.

/** Count phrase with Arabic agreement: 1 → one, 2 → dual, 3–10 → plural, 11+ → accusative singular. */
export const arCount = (n, [one, two, few, many]) =>
  n === 1 ? one : n === 2 ? two : (Number.isInteger(n) && n >= 3 && n <= 10) ? `${n} ${few}` : `${n} ${many}`;

export const weeksPhrase = n => arCount(n, ['أسبوع', 'أسبوعين', 'أسابيع', 'أسبوعًا']);
export const daysPhrase = n => arCount(n, ['يوم', 'يومين', 'أيام', 'يومًا']);

/** "عيب واحد" · "عيبان" · "3 عيوب" · "0.5 عيب" — fractions stay singular. */
export const defLabel = n => n === 1 ? 'عيب واحد' : n === 2 ? 'عيبان'
  : (Number.isInteger(n) && n >= 3 && n <= 10) ? `${n} عيوب` : `${fmtNum(n)} عيب`;

/** 1 → "1", 0.5 → "0.5", 2.0 → "2". */
export const fmtNum = n => (Math.round(n * 10) / 10).toString();

/** File size for display, e.g. "308 KB" or "4.2 MB". */
export const fmtBytes = b => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
