/* ضغطُ صور الموقع وتحويلها إلى JPG.
 *
 * بندٌ مطلوب في ملفّ المشروع: «ضغط الصور واختيار الصيغة المناسبة لكلٍّ
 * منها مع تبرير الاختيار».
 *
 * التشغيل:  node scripts/compress-images.mjs
 *
 * ويضع الناتج بجانب المصدر بامتداد `.jpg`، ولا يحذف المصدر — فمن يشغّله
 * مرّتين لا يفقد شيئاً. والحذفُ قرارُ من يراجع النتيجة لا قرارُ السكربت.
 *
 * الوثائق: .antigravity/ASSETS.md
 */

import sharp from 'sharp';
import { statSync, existsSync } from 'node:fs';

/* العروض هي المكتوبة في ASSETS.md — لا أكبر.
 * وصورةٌ أكبر من حاجتها تُحمَّل كاملةً ثمّ تُصغَّر، فيدفع الزائر وزناً
 * لا يراه. */
const JOBS = [
  { name: 'hero-plants',   width: 1120 },
  { name: 'workshop',      width: 1080 },
  { name: 'first-rooftop', width: 1080 },
  { name: 'video-poster',  width: 1720 },
  { name: 'team-1',        width: 240 },
  { name: 'team-2',        width: 240 },
  { name: 'team-3',        width: 240 },
];

/* جودة 78: الفرق عن 100 لا تراه العين على صورةٍ فوتوغرافية، والوزن
 * يقلّ إلى الخُمس. و mozjpeg مُرمِّزٌ يُعطي حجماً أصغر عند نفس الجودة. */
const QUALITY = 78;

const kb = (p) => statSync(p).size / 1024;
const rows = [];

for (const { name, width } of JOBS) {
  /* المصدر قد يكون PNG أو JPG — نقبل الاثنين. */
  const src = ['png', 'jpeg', 'jpg', 'webp']
    .map((e) => `assets/img/${name}.${e}`)
    .find(existsSync);

  if (!src) {
    console.log(`  — ${name}: لا مصدر، يُتخطّى`);
    continue;
  }

  const out = `assets/img/${name}.jpg`;
  /* ولا يُعاد ضغط ناتجٍ سابق على نفسه: مصدرٌ اسمه `x.jpg` وخرجٌ اسمه
     `x.jpg` يعني قراءةً وكتابةً على الملفّ نفسه — وذلك يُتلفه. */
  if (src === out) {
    console.log(`  — ${name}: المصدر هو الخرج، يُتخطّى`);
    continue;
  }

  const before = kb(src);
  await sharp(src)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(out);

  rows.push([name, before, kb(out), width]);
}

if (rows.length === 0) {
  console.log('لا صور لضغطها.');
} else {
  console.log('\n| الملفّ | قبل | بعد | وُفّر | العرض |');
  console.log('|---|---|---|---|---|');
  let tb = 0, ta = 0;
  for (const [n, b, a, w] of rows) {
    tb += b; ta += a;
    console.log(`| \`${n}.jpg\` | ${b.toFixed(0)} KB | **${a.toFixed(0)} KB** | ${Math.round((1 - a / b) * 100)}% | ${w}px |`);
  }
  console.log(`| **المجموع** | **${(tb / 1024).toFixed(1)} MB** | **${ta.toFixed(0)} KB** | **${Math.round((1 - ta / tb) * 100)}%** | |`);
  console.log('\nانقل الجدول إلى .antigravity/ASSETS.md، واحذف ملفّات PNG بعد المراجعة.');
}
