/* بناءُ `growth.gif` — الصورة المتحرّكة المطلوبة في ملفّ المشروع.
 *
 * يأخذ المقطع المصوَّر (`growth-source.gif`) ويضيف إليه **مراحل النموّ**:
 * شريطٌ سفليّ يقول أيّ أسبوعٍ هذا وما يحدث فيه، وشريطُ تقدّمٍ يُظهر
 * الموضع من الرحلة. ثمّ يضغطه.
 *
 * ── ولماذا المراحل ─────────────────────────────────────────────────────
 * الصورة وحدها تُظهر **أنّ** النبتة تنمو، ولا تقول **كم استغرق** ولا
 * **ماذا يحدث في كلّ طور**. وصفحةُ «دليل المبتدئ» موضوعها التعليم: من
 * يقرأها يريد أن يعرف متى يتوقّع الورق الأوّل ومتى الثمرة.
 *
 * ── والضغط بندٌ مطلوب ──────────────────────────────────────────────────
 * المصدر **6.1 ميغابايت** — خمسةُ أضعاف الموقع كلّه. وثلاثةُ مقابض
 * تخفضه: المقاس، ومعدّل الإطارات (الحركة بطيئة فلا يُرى الفرق)،
 * وعددُ ألوان اللوحة.
 *
 * **والشريط صورةٌ نقيّة لا تدرّجُ SVG:** مُحوِّل SVG في sharp يُسقط
 * `linearGradient` صامتاً — وقعنا فيه في `make-video.mjs`، ولم يُكتشف
 * إلّا بفحص إطارٍ مُستخرَج.
 *
 * التشغيل:  node scripts/make-growth-gif.mjs   (يحتاج ffmpeg في PATH)
 * الوثائق:  .antigravity/ASSETS.md
 */

import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, statSync, readdirSync } from 'node:fs';

const SRC = 'assets/img/growth-source.gif';
const OUT = 'assets/img/growth.gif';
const TMP = 'assets/img/.frames';
const PAL = 'assets/img/.palette.png';

/* المصدر مربّع (480×480)، والنسبة تُحفظ. والشريط يُضاف أسفله. */
const W = 360;
const IMG_H = 360;
const BAND = 80;
const H = IMG_H + BAND;

/* إطارٌ كلّ نصف ثانية تقريباً: الحركة بطيئة (نبتةٌ تنمو)، فالزيادة
   وزنٌ بلا أثرٍ يُرى. */
const FPS = 1.8;

/* ── مراحل النموّ ───────────────────────────────────────────────────────
 * `at` نسبةٌ من المقطع (0 → 1). والأسابيع مطابقةٌ لنصّ `guide.html`:
 * «تنمو شتلةُ الطماطم خلال تسعة أسابيع».
 */
const STAGES = [
  { at: 0.00, week: '١',   title: 'البذرة',        note: 'تُزرع على عمق سنتمتر' },
  { at: 0.14, week: '٢',   title: 'الإنبات',       note: 'تظهر ورقتان أوّليّتان' },
  { at: 0.30, week: '٣–٤', title: 'الورق الحقيقي', note: 'يبدأ النموّ السريع' },
  { at: 0.50, week: '٥–٦', title: 'التفرّع',       note: 'تتكاثف الأوراق والسيقان' },
  { at: 0.72, week: '٧–٨', title: 'الإزهار',       note: 'أزهارٌ صفراء تسبق الثمر' },
  { at: 0.90, week: '٩',   title: 'الحصاد',        note: 'أوّل طماطمةٍ تحمرّ' },
];

/* ألوانُ اللوحة — tokens.css */
const INK = { r: 27, g: 45, b: 39 };   // --green-900
const SAND = '#F7F2EA';                 // --sand-100
const GREEN = '#52B788';                // أفتحُ من --green-500 ليُرى على الداكن
const LINE = 'rgba(247,242,234,0.28)';

if (!existsSync(SRC)) {
  console.error(`✗ لا يوجد ${SRC} — ضع المقطع المصوَّر هناك أوّلاً.`);
  process.exit(1);
}

const before = statSync(SRC).size / 1024;

if (existsSync(TMP)) rmSync(TMP, { recursive: true });
mkdirSync(TMP, { recursive: true });

/* ── ١. استخراج الإطارات ───────────────────────────────────────────── */
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-i', SRC,
  '-vf', `fps=${FPS},scale=${W}:${IMG_H}:flags=lanczos`,
  `${TMP}/f-%03d.png`,
], { stdio: 'inherit' });

const frames = readdirSync(TMP).filter((f) => f.startsWith('f-')).sort();
const n = frames.length;

/* ── ٢. تركيب شريط المرحلة ─────────────────────────────────────────── */

/** المرحلةُ عند نسبةٍ من المقطع. */
function stageAt(t) {
  let s = STAGES[0];
  for (const st of STAGES) if (t >= st.at) s = st;
  return s;
}

/* الشريط لونٌ واحد، فيُبنى مرّةً ويُعاد على كلّ إطار. */
const band = await sharp({
  create: {
    width: W, height: BAND, channels: 4,
    background: { ...INK, alpha: 0.94 },
  },
}).png().toBuffer();

for (let i = 0; i < n; i += 1) {
  const t = n > 1 ? i / (n - 1) : 0;
  const s = stageAt(t);
  const barW = Math.round((W - 48) * t);

  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${BAND}">
    <text x="${W - 24}" y="32" text-anchor="end"
          font-family="Tahoma, sans-serif" font-size="19" font-weight="bold"
          fill="${SAND}">الأسبوع ${s.week} — ${s.title}</text>
    <text x="${W - 24}" y="56" text-anchor="end"
          font-family="Tahoma, sans-serif" font-size="14"
          fill="${SAND}" opacity="0.88">${s.note}</text>
    <rect x="24" y="${BAND - 14}" width="${W - 48}" height="5" rx="2.5" fill="${LINE}"/>
    <rect x="24" y="${BAND - 14}" width="${barW}" height="5" rx="2.5" fill="${GREEN}"/>
  </svg>`);

  /* ثلاثُ طبقات: الصورة، ثمّ الشريط، ثمّ النصّ. وفصلُها يجعل كلَّ
     واحدةٍ تُفحص وحدها عند العطب. */
  await sharp({
    create: { width: W, height: H, channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([
      { input: `${TMP}/${frames[i]}`, top: 0, left: 0 },
      { input: band, top: IMG_H, left: 0 },
      { input: text, top: IMG_H, left: 0 },
    ])
    .png()
    .toFile(`${TMP}/out-${String(i + 1).padStart(3, '0')}.png`);
}

/* ── ٣. التجميع ────────────────────────────────────────────────────── */

/* اللوحة تُبنى من الإطارات **المُركَّبة** لا من المصدر: بناؤها من
   المصدر يُهمل ألوان الشريط والنصّ، فيظهران مُبقَّعين. */
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS), '-i', `${TMP}/out-%03d.png`,
  '-vf', 'palettegen=max_colors=80:stats_mode=diff',
  PAL,
], { stdio: 'inherit' });

execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS), '-i', `${TMP}/out-%03d.png`,
  '-i', PAL,
  /* `bayer` لا `sierra2_4a`: تبعثرٌ منتظم يثبت بين الإطارات، فلا يظهر
     «تشويشٌ يرقص» في الجدار الساكن. و`diff_mode=rectangle` يرمّز
     المستطيل المتغيّر وحده. */
  '-lavfi', '[0:v][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
  '-loop', '0',
  OUT,
], { stdio: 'inherit' });

rmSync(TMP, { recursive: true });
rmSync(PAL, { force: true });

const after = statSync(OUT).size / 1024;

console.log(`✓ ${OUT}`);
console.log(`  ${n} إطاراً · ${W}×${H} · ${STAGES.length} مراحل`);
console.log(`  ${before.toFixed(0)} KB → ${after.toFixed(0)} KB  (وُفّر ${Math.round((1 - after / before) * 100)}%)`);
