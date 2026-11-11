/* بناءُ `growth.gif` — الصورة المتحرّكة المطلوبة في ملفّ المشروع.
 *
 * ── المحاولة الأولى ولماذا رُفضت ────────────────────────────────────────
 * كانت الإطارات **اقتراباً تدريجياً** على صورة الواجهة. وعملت، لكنّ
 * الملفّ خرج **2.2 ميغابايت** — أثقل من صور الموقع الستّ مجتمعةً بأربعة
 * أضعاف.
 *
 * والسبب بنيويّ لا إعداديّ: **الزوم يحرّك كلّ بكسلٍ في كلّ إطار**،
 * وضغطُ GIF يقوم على اختصار ما يثبت بين الإطارات. فلم يجد ما يختصره.
 * وتصغيرُ المقاس واللوحة خفّضه إلى 880 KB وبقي ثقيلاً — لأنّ العلّة
 * في الطريقة لا في الأرقام.
 *
 * ── وهذه الطريقة ───────────────────────────────────────────────────────
 * **خلفيةٌ ثابتة، وشتلةٌ واحدة تنمو فوقها.** فكلّ إطارٍ يختلف عن سابقه
 * في منطقةٍ صغيرة، وضغطُ GIF يعمل كما صُمِّم.
 *
 * وهي أصدق في التعبير أيضاً: «من بذرةٍ إلى حصاد» يُقرأ في نبتةٍ تطول،
 * لا في كاميرا تقترب.
 *
 * **ولا صورةَ جديدة تُولَّد**: الرسم متجهيّ يُبنى هنا، والإفصاح يبقى
 * صادقاً كما هو.
 *
 * التشغيل:  node scripts/make-growth-gif.mjs
 * الوثائق:  .antigravity/ASSETS.md
 */

import sharp from 'sharp';
import gifenc from 'gifenc';
import { writeFileSync, statSync } from 'node:fs';

/* `gifenc` حزمةٌ CommonJS، فتُستورَد افتراضيّاً ثمّ تُفكَّك. */
const { GIFEncoder, quantize, applyPalette } = gifenc;

const OUT = 'assets/img/growth.gif';

/* 480×356 — نسبةُ العنصر في `guide.html` نفسها (540×400 مُصغَّرة).
   والمتصفّح يُمدّدها إلى مقاس الإطار، وفرقُ الحدّة لا يُرى في حركة. */
const W = 480;
const H = 400;

/* تسعةُ أسابيع = تسعةُ إطارات، وكلٌّ أسبوع. والرقم من النصّ نفسه في
   `guide.html`: «تنمو شتلةُ الطماطم خلال تسعة أسابيع». */
const WEEKS = 9;

/* 520ms للإطار ≈ ٩ ثوانٍ للدورة كاملةً ذهاباً. وأبطأُ من الأولى
   لأنّ النموّ يُقرأ لا يُلمح. */
const DELAY = 520;

/* ── ألوانُ اللوحة نفسها (tokens.css) ─────────────────────────────────── */
const C = {
  sky:    '#F7F2EA',  // --sand-100
  soil:   '#6B4A2F',
  soilHi: '#8A5F3C',
  pot:    '#C8A882',
  stem:   '#2D6A4F',  // --green-700
  leaf:   '#40916C',  // --green-500
  leafHi: '#52B788',
  fruit:  '#D97706',  // --date-600
  line:   '#D5DDD9',  // --gray-300
  ink:    '#1B2D27',  // --green-900
};

/** إطارُ الأسبوع رقم `w` (من 0) رسماً متجهيّاً. */
function frameSvg(w) {
  const t = w / (WEEKS - 1);                 // 0 → 1

  const potTop = H - 150;
  const soilY  = potTop + 10;

  /* الساق تطول تدريجياً، وتتوقّف قبل أعلى الإطار. */
  const stemH  = Math.round(10 + 196 * t);
  const stemTop = soilY - stemH;
  const cx = Math.round(W / 2);

  /* الأوراق تظهر زوجاً بعد زوج: زوجٌ لكلّ أسبوعين تقريباً. */
  const pairs = Math.min(4, Math.floor(t * 4.6));
  let leaves = '';
  for (let i = 0; i < pairs; i += 1) {
    const y = soilY - Math.round(stemH * (0.34 + i * 0.185));
    const grow = Math.min(1, (t - i * 0.2) * 4);     // الورقة تكبر بعد ظهورها
    const rx = Math.round(26 * Math.max(0.3, grow));
    const ry = Math.round(13 * Math.max(0.3, grow));
    const fill = i % 2 ? C.leaf : C.leafHi;
    leaves +=
      `<ellipse cx="${cx - rx - 3}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(-16 ${cx - rx - 3} ${y})"/>` +
      `<ellipse cx="${cx + rx + 3}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(16 ${cx + rx + 3} ${y})"/>`;
  }

  /* الثمار في الأسبوعين الأخيرين: خضراءُ ثمّ حمراء. */
  let fruit = '';
  if (w >= WEEKS - 3) {
    const ripe = (w - (WEEKS - 3)) / 2;             // 0 → 1
    const fy = soilY - Math.round(stemH * 0.56);
    const col = ripe >= 1 ? '#C62828' : (ripe >= 0.5 ? C.fruit : '#7CB342');
    const r = 9 + Math.round(4 * ripe);
    fruit =
      `<circle cx="${cx - 20}" cy="${fy}" r="${r}" fill="${col}"/>` +
      `<circle cx="${cx + 18}" cy="${fy + 14}" r="${r - 1}" fill="${col}"/>`;
  }

  /* شريطُ تقدّمٍ أسفل الإطار: يقول أيّ أسبوعٍ هذا بلا نصٍّ يحتاج ترجمة. */
  const barW = Math.round((W - 120) * (w / (WEEKS - 1)));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${C.sky}"/>

    <!-- خطُّ الأرض -->
    <line x1="0" y1="${soilY}" x2="${W}" y2="${soilY}" stroke="${C.line}" stroke-width="2"/>

    <!-- الأصيص -->
    <path d="M${cx - 62} ${potTop} h124 l-13 76 h-98 z" fill="${C.pot}"/>
    <rect x="${cx - 66}" y="${potTop - 9}" width="132" height="13" rx="4" fill="${C.pot}"/>
    <path d="M${cx - 57} ${potTop + 4} h114 l-3 16 h-108 z" fill="${C.soil}"/>
    <ellipse cx="${cx - 24}" cy="${potTop + 10}" rx="14" ry="4" fill="${C.soilHi}"/>

    <!-- الساق -->
    <rect x="${cx - 3}" y="${stemTop}" width="6" height="${stemH}" rx="3" fill="${C.stem}"/>

    ${leaves}
    ${fruit}

    <!-- شريط الأسابيع -->
    <rect x="60" y="${H - 26}" width="${W - 120}" height="6" rx="3" fill="${C.line}"/>
    <rect x="60" y="${H - 26}" width="${barW}" height="6" rx="3" fill="${C.stem}"/>
    <text x="${W / 2}" y="${H - 38}" text-anchor="middle"
          font-family="Tahoma, sans-serif" font-size="15" fill="${C.ink}">الأسبوع ${w + 1}</text>
  </svg>`;
}

/* ── الترميز ─────────────────────────────────────────────────────────── */

const gif = GIFEncoder();
const frames = [];

for (let w = 0; w < WEEKS; w += 1) {
  const { data } = await sharp(Buffer.from(frameSvg(w)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  frames.push(new Uint8ClampedArray(data));
}

/* وقفةٌ على الإطار الأخير: الحصاد يُرى قبل أن تعود الحلقة.
   وبلا هذا تومض الثمرة وتختفي. */
const seq = frames.map((f, i) => ({ f, d: i === WEEKS - 1 ? 1600 : DELAY }));

for (const { f, d } of seq) {
  /* 32 لوناً: الرسم متجهيٌّ بألوانٍ مسطّحة معدودة — لا تدرّجات
     فوتوغرافية. فلا يحتاج أكثر، والزيادة وزنٌ بلا أثر. */
  const palette = quantize(f, 32);
  const index = applyPalette(f, palette);
  gif.writeFrame(index, W, H, { palette, delay: d });
}

gif.finish();
writeFileSync(OUT, Buffer.from(gif.bytes()));

console.log(`✓ ${OUT}`);
console.log(`  ${seq.length} إطاراً · ${W}×${H} · ${(statSync(OUT).size / 1024).toFixed(0)} KB`);
