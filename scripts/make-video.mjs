/* بناءُ `umm-khaled.mp4` — مقطع الفيديو المطلوب في ملفّ المشروع.
 *
 * **ولا لقطةَ جديدة تُولَّد.** المقطع شرائحُ من صور الموقع الثلاث
 * نفسها، بانتقالاتٍ وعناوين — فالإفصاح يبقى صادقاً كما هو: ستُّ صورٍ
 * مولَّدة، لا سابعة.
 *
 * ولماذا مقطعٌ محلّيّ لا يوتيوب:
 *   • يعمل بلا إنترنت — والملفّ يجيز التسليم كملفّاتٍ تعمل مباشرةً على
 *     المتصفّح، والمضمَّن كان سينكسر حينها.
 *   • لا يُحمّل سكربتات طرفٍ ثالث، فالصفحة أسرع.
 *
 * و H.264 في حاوية MP4: الصيغة الوحيدة التي تدعمها المتصفّحات كلُّها
 * بلا استثناء. و`yuv420p` لأنّ سفاري لا يشغّل غيره.
 *
 * التشغيل:  node scripts/make-video.mjs   (يحتاج ffmpeg في PATH)
 * الوثائق:  .antigravity/ASSETS.md
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import sharp from 'sharp';

const OUT = 'assets/video/umm-khaled.mp4';
const TMP = 'assets/video/.tmp';

/* 1280×720 — يكفي لعنصرٍ عرضه 860px على الشاشة، ولا يزيد الوزن بلا أثر. */
const W = 1280;
const H = 720;
const FPS = 25;

/* ثلاثُ شرائح × ٤ ثوانٍ = ١٢ ثانية. ومقطعٌ أطول من هذا لا يُشاهَد
   كاملاً على صفحةٍ موضوعها شيءٌ آخر. */
const SECONDS = 4;

const SLIDES = [
  { img: 'assets/img/first-rooftop.jpg', title: 'بدأنا بسطحٍ واحد',
    sub: 'ستّةُ أحواضٍ خشبية في حيّ المويجعي، ربيع 2024' },
  { img: 'assets/img/workshop.jpg', title: 'ثمّ صارت ورشة',
    sub: 'نجتمع كلّ شهر، ونتعلّم معاً من الصفر' },
  { img: 'assets/img/hero-plants.jpg', title: 'واليوم 180 سطحاً',
    sub: 'طماطم ونعناع وخضارٌ من أسطح بيوت العين' },
];

/* ألوانُ اللوحة نفسها — tokens.css */
const INK = '#1B2D27';
const SAND = '#F7F2EA';

if (existsSync(TMP)) rmSync(TMP, { recursive: true });
mkdirSync(TMP, { recursive: true });
mkdirSync('assets/video', { recursive: true });

/** شريحةٌ واحدة: الصورة مع شريطٍ سفليّ يحمل العنوان. */
async function buildSlide(slide, i) {
  /* `cover` لا `fill`: نسبةُ الصورة تختلف عن 16/9، و`fill` يمطّها
     فتبدو الوجوه مشوّهة. و`cover` يقصّ ولا يشوّه. */
  const base = await sharp(slide.img)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .toBuffer();

  /* ── الشريط السفليّ ─────────────────────────────────────────────────
   *
   * **وطبقتان لا تدرّجٌ في SVG.** كان شريطاً متدرّجاً بـ`linearGradient`
   * في `<defs>`، ولم يُرسَم: مُحوِّل SVG في sharp أسقطه، فخرج النصّ
   * أبيضَ على صورةٍ فاتحة بلا تباين — ولم يُكتشف إلّا بفحص إطارٍ مُستخرَج.
   *
   * فالشريط يُركَّب الآن **صورةً نقيّة** بـ`sharp` نفسه: مستطيلٌ داكن
   * بشفافية، يُدمج تحت النصّ. ولا يعتمد على ميزةٍ قد تسقط.
   */
  const BAND = 240;

  const band = await sharp({
    create: {
      width: W, height: BAND, channels: 4,
      background: { r: 27, g: 45, b: 39, alpha: 0.82 },   // --green-900
    },
  }).png().toBuffer();

  /* والنصّ في طبقةٍ ثالثة فوق الشريط: فصلُه يجعل كلَّ واحدةٍ تُفحص
     وحدها — وهو ما كشف سقوط التدرّج أوّلاً. */
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${BAND}">
    <text x="${W / 2}" y="110" text-anchor="middle"
          font-family="Tahoma, sans-serif" font-size="56" font-weight="bold"
          fill="${SAND}">${slide.title}</text>
    <text x="${W / 2}" y="168" text-anchor="middle"
          font-family="Tahoma, sans-serif" font-size="30"
          fill="${SAND}">${slide.sub}</text>
  </svg>`);

  const out = `${TMP}/slide-${i}.png`;
  await sharp(base)
    .composite([
      { input: band, top: H - BAND, left: 0 },
      { input: text, top: H - BAND, left: 0 },
    ])
    .png()
    .toFile(out);
  return out;
}

const files = [];
for (let i = 0; i < SLIDES.length; i += 1) {
  files.push(await buildSlide(SLIDES[i], i));
}

/* قائمةُ التجميع.
 *
 * و**آخرُ سطرٍ مكرَّر** لأنّ ffmpeg يتجاهل مدّة آخر مُدخَلٍ في concat
 * — فبلا التكرار تومض الشريحة الأخيرة وتنتهي.
 *
 * ومدّةُ المُدخَل المكرَّر تُقصَّر إلى إطارٍ واحد: كانت `SECONDS`
 * كاملة، فخرج المقطع **16 ثانية بدل 12**. والمكرَّر يأخذ مدّته من
 * التكرار لا من سطره.
 */
const list = files
  .map((f) => `file '${f.split('/').pop()}'\nduration ${SECONDS}`)
  .join('\n') + `\nfile '${files[files.length - 1].split('/').pop()}'\n`;

writeFileSync(`${TMP}/list.txt`, list);

execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'concat', '-safe', '0', '-i', `${TMP}/list.txt`,
  /* `-t` يقصّ المقطع عند مدّته المقصودة.
   *
   * **ولماذا يُحتاج:** السطر المكرَّر للشريحة الأخيرة يأخذ مدّةً
   * كاملة — فخرج المقطع **16 ثانية بدل 12**. وتقصيرُ مدّة الأخيرة في
   * القائمة لا يُصلحه: المُدخَل المكرَّر يرث التوجيه السابق له.
   * فالقصُّ عند الترميز أوضح وأضمن. */
  '-t', String(SECONDS * SLIDES.length),
  '-vf', `fps=${FPS},format=yuv420p`,
  '-c:v', 'libx264',
  /* CRF 24: جودةٌ جيّدة لشرائح ثابتة بوزنٍ صغير. والأقلّ يضاعف الحجم
     بفرقٍ لا يُرى على صورٍ لا تتحرّك. */
  '-crf', '24',
  '-preset', 'slow',
  /* `faststart` ينقل فهرس الملفّ إلى أوّله، فيبدأ التشغيل قبل اكتمال
     التنزيل. وبلا هذا ينتظر الزائر الملفّ كلَّه. */
  '-movflags', '+faststart',
  OUT,
], { stdio: 'inherit' });

rmSync(TMP, { recursive: true });

console.log(`✓ ${OUT}`);
console.log(`  ${SLIDES.length} شرائح · ${SECONDS * SLIDES.length} ثانية · ${W}×${H} · ${(statSync(OUT).size / 1024).toFixed(0)} KB`);
