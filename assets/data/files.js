/**
 * ملفات المقرر. size بالبايت (يُعرض للطالب قبل الفتح).
 * لإضافة ملف: ضعه في مجلد files/ ثم أضف سطرًا هنا بنفس الصيغة.
 */

export const FILES = [
  {n: 1, file: "files/01-FDM.pdf", size: 854450, title: "ملف اليوم الأول", sub: "First Day Material", desc: "تعريف عام بمقرر GE-213 ومحتواه وآلية العمل فيه."},
  {n: 2, file: "files/02-Calendar-481.pdf", size: 287217, title: "تقويم الترم", sub: "Calendar — Term 481", desc: "الجدول الأسبوعي الكامل لكل الحصص والمهام والتسليمات."},
  {n: 3, file: "files/03-Portfolio-Expectations.pdf", size: 261528, title: "توقعات ملف المقرر", sub: "Expectations of Portfolio", desc: "معايير وتوقعات إعداد ملف المقرر (Portfolio) وقوائم التدقيق."},
  {n: 4, file: "files/04-Technical-Work-Reports.pdf", size: 221713, title: "توقعات تقارير العمل الفني", sub: "Technical Work Reports", desc: "معايير كتابة وتقييم تقارير العمل الفني."},
  {n: 5, file: "files/05-Student-Sign-Off.pdf", size: 268907, title: "نموذج التوقيع Sign-off", sub: "Student Sign-off Form", desc: "نموذج توقيع الطالب على استلام وفهم متطلبات المقرر."},
  {n: 6, file: "files/06-Student-Entry-Survey.pdf", size: 457628, title: "الاستبيان الافتتاحي", sub: "Student Entry Survey", desc: "استبيان تعريفي يُعبّى في بداية الفصل."},
  {n: 7, file: "files/07-Team-Norms.pdf", size: 254559, title: "معايير الفريق", sub: "Setting Team Norms", desc: "خطوات وضع معايير العمل الجماعي داخل الفريق."},
  {n: 8, file: "files/08-Team-Meeting-Minutes.pdf", size: 170092, title: "محضر اجتماع الفريق", sub: "Team Meeting Minutes", desc: "نموذج توثيق اجتماعات الفريق."},
  {n: 9, file: "files/09-Excel-Part1.pdf", size: 4452447, title: "مقدمة في إكسل — الجزء الأول", sub: "Introduction to Excel — Part I", desc: "ملف تدريبي شامل لتعلم أساسيات إكسل."}
];

/** ملفات الواجب الأول. */
export const ASSIGN1 = [
  {n: 10, file: "files/10-Assignment1-Excel.pdf", size: 315672, title: "ورقة الواجب الأول", sub: "Assignment #1 — Introduction to Excel Modeling", desc: "نص الواجب والمسألة الخارجية (أسطوانة + مخروط) والمطالب الخمسة ⁦(I–V)⁩ وشروط التسليم."},
  {n: 11, file: "files/11-Assignment1-Checklist.pdf", size: 453561, title: "قائمة تدقيق الواجب الأول", sub: "Assignment #1 Checklist — Term 481", desc: "قائمة التدقيق الذاتي التي تُرفق فوق صفحة الغلاف — راجع كل بند قبل التسليم."},
  {n: 12, file: "files/12-Assignment1-Team-Process-Check.pdf", size: 259296, title: "فحص عمل الفريق", sub: "Team Process Check for Excel", desc: "نموذج تقييم عمل الفريق (تقييم من 1 إلى 5) يُعبّأ ويُسلّم مع الواجب."}
];

/** مجموعات الواجبات المثبّتة أعلى صفحة الملفات، مربوطة برقم الواجب في DUES. */
export const ASSIGNMENT_GROUPS = [
  {
    due: 1,
    title: "الواجب الأول — نمذجة إكسل",
    files: ASSIGN1,
    deliverables: [
      "ملف ⁦Word⁩ للتقرير",
      "ملف ⁦PDF⁩ للتقرير، ومعه قائمة التدقيق وفحص عمل الفريق",
      "ملف إكسل للنموذج",
    ],
    naming: "A? - G? - T?",
  },
];

/**
 * ربط عبارات التقويم بالملفات: أي بند في الحصة يحتوي العبارة يظهر بجانبه رابط الملف.
 * العبارات دقيقة عمدًا (مثلًا "الجزء الأول" فقط، لأن ملف الجزء الثاني غير مرفوع).
 * n = رقم الملف، أو to = رابط داخل الموقع مع label للنص الظاهر.
 */
export const FILE_LINKS = [
  { match: "ملف اليوم الأول", n: 1 },
  { match: "معايير الفريق", n: 7 },
  { match: "ملف إكسل — الجزء الأول", n: 9 },
  { match: "نموذج التوقيع", n: 5 },
  { match: "الاستبيان الافتتاحي", n: 6 },
  { match: "توقعات واجب إكسل", n: 10 },
  { match: "واجب إكسل مع قائمة التدقيق", to: "#/files", label: "ملفات الواجب" },
];
