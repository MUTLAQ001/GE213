// Course grading rules (GE 213, term 481). The calculator and the guide both read
// from here, so the tables shown to students can never disagree with the maths.

export const ZERO = { e: 0, ni: 0, nce: 0, lapses: 0, bonus: 0, plag: [] };
export const STORAGE_KEY = 'ge213_data';
export const LADDER = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];

export const nceDef = n => n <= 0 ? 0 : [0, 1, 2, 3, 5][Math.min(n, 4)];
export const niDef = n => n <= 0 ? 0 : [0, 0.5, 1, 1.5, 2, 3, 5][Math.min(n, 6)];
export const plagDef = p => p >= 90 ? 5 : p >= 80 ? 3 : p >= 70 ? 2 : p >= 60 ? 1.5 : p >= 50 ? 1 : p > 35 ? 0.5 : 0;
export const lapseDef = l => l <= 2.5 ? 0 : l <= 4 ? 0.5 : l <= 5.5 ? 1 : l <= 7 ? 2 : l <= 8 ? 3 : l <= 9.5 ? 4 : 5;

const round1 = n => Math.round(n * 10) / 10;

/** Grade from the number of Exceeds and the total defects (the final-grade table). */
export const gradeFor = (e, total) => {
  if (total > 3) return 'F';
  const start = e >= 3 ? 0 : e === 2 ? 1 : e === 1 ? 2 : 3;
  return LADDER[Math.min(start + Math.min(6, Math.round(total * 2)), 8)];
};

/** Full calculation. Identical rules to the original site (term 481). */
export function calculate(st) {
  let e = st.e, ni = st.ni, lapses = st.lapses, note = '';
  if (st.bonus > 0 && lapses > 0) {
    const used = Math.min(st.bonus, lapses);
    lapses = round1(lapses - used);
    note = `استُخدمت ${used} من نقاط التحفيز لمسح ${used} من مخالفات الانضباط.`;
  } else if (st.lapses === 0 && st.bonus >= 4) {
    if (ni > 0) { ni--; note = '4 نقاط تحفيز رفعت واجبًا من NI إلى M.'; }
    else { e++; note = '4 نقاط تحفيز رفعت واجبًا من M إلى E.'; }
  }
  const parts = {
    nce: nceDef(st.nce),
    ni: niDef(ni),
    plag: st.plag.reduce((a, r) => a + plagDef(r.pct), 0),
    lapses: lapseDef(lapses),
  };
  const total = round1(parts.nce + parts.ni + parts.plag + parts.lapses);
  return { g: gradeFor(e, total), total, e, note, parts, effLapses: lapses };
}

const rank = g => LADDER.indexOf(g);

/**
 * What would improve the grade, checked against the real rules:
 * one more Exceeds, a successful resubmission (NI or NCE/NS becomes M),
 * or one more bonus point (at most 5 per term).
 */
export function improvements(st) {
  const now = calculate(st);
  const out = [];
  const tryState = (label, next) => {
    const r = calculate(next);
    if (rank(r.g) < rank(now.g)) out.push({ label, grade: r.g });
  };
  tryState('واجب إضافي بتقدير E', { ...st, e: st.e + 1 });
  if (st.ni > 0) tryState('إعادة تسليم واجب NI ليصبح M', { ...st, ni: st.ni - 1 });
  if (st.nce > 0) tryState('إعادة تسليم واجب NCE أو NS ليصبح M', { ...st, nce: st.nce - 1 });
  if (st.bonus < 5) tryState('نقطة تحفيز إضافية من المشاركة المتميزة', { ...st, bonus: st.bonus + 1 });
  return out.sort((a, b) => rank(a.grade) - rank(b.grade)).slice(0, 2);
}

/** Legacy data: plagiarism was a single number before per-submission rows existed. */
export const migratePlag = (v, nameAt) => Array.isArray(v)
  ? v.filter(r => r && typeof r.pct === 'number').map((r, i) => ({ id: r.id || `p${i}`, name: r.name || nameAt(i), pct: r.pct }))
  : (typeof v === 'number' && v > 0 ? [{ id: 'p0', name: nameAt(0), pct: v }] : []);

/** Conversion tables shown in the guide (each pair is [count, defects]). */
export const DEF_TABLES = [
  { key: 'nce', title: 'بلا جهد مقنع أو لم يُسلَّم', code: 'NCE / NS', tone: 'danger', unit: 'عدد الواجبات',
    pairs: [['1', nceDef(1)], ['2', nceDef(2)], ['3', nceDef(3)], ['4+', nceDef(4)]] },
  { key: 'ni', title: 'يحتاج تحسين', code: 'NI', tone: 'warning', unit: 'عدد الواجبات',
    pairs: [['1', niDef(1)], ['2', niDef(2)], ['3', niDef(3)], ['4', niDef(4)], ['5', niDef(5)], ['6+', niDef(6)]] },
  { key: 'plag', title: 'نسبة الاستلال — لكل تسليم', code: 'Plagiarism', tone: 'danger', unit: 'النسبة',
    pairs: [['>35%', plagDef(36)], ['50%', plagDef(50)], ['60%', plagDef(60)], ['70%', plagDef(70)], ['80%', plagDef(80)], ['90%', plagDef(90)]] },
];
export const LAPSE_TABLE = [['≤2.5', lapseDef(2.5)], ['3–4', lapseDef(4)], ['4.5–5.5', lapseDef(5.5)], ['6–7', lapseDef(7)], ['7.5–8', lapseDef(8)], ['8.5–9.5', lapseDef(9.5)], ['>9.5', lapseDef(10)]];

/** Final-grade matrix rows (Exceeds) × columns (defects 0…3). */
export const MATRIX_E = [3, 2, 1, 0];
export const MATRIX_D = [0, 0.5, 1, 1.5, 2, 2.5, 3];
