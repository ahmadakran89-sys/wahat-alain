// تبديلٌ مؤقّت إلى المؤقّتات. ويُعكس بأمرٍ واحد حين تصل الصور الحقيقية:
//   node swap-placeholders.mjs --restore
import { readFileSync, writeFileSync } from 'node:fs';
const restore = process.argv.includes('--restore');
const pages = ['index.html','about.html','workshops.html','guide.html','contact.html'];
const map = [
  ['hero-plants.jpg','hero-plants.svg'], ['workshop.jpg','workshop.svg'],
  ['first-rooftop.jpg','first-rooftop.svg'], ['growth.gif','growth.svg'],
  ['video-poster.jpg','video-poster.svg'],
  ['team-1.jpg','team-1.svg'], ['team-2.jpg','team-2.svg'], ['team-3.jpg','team-3.svg'],
];
let n = 0;
for (const p of pages) {
  let h = readFileSync(p, 'utf8');
  for (const [real, ph] of map) {
    const [from, to] = restore ? [ph, real] : [real, ph];
    if (h.includes(from)) { h = h.split(from).join(to); n++; }
  }
  writeFileSync(p, h);
}
console.log((restore ? 'restored ' : 'swapped ') + n + ' references');
