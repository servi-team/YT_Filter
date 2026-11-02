import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../app/', import.meta.url));
const oku = (yol: string) => readFileSync(join(app, yol), 'utf8');

function* tsxler(dir: string): Generator<string> {
  for (const ad of readdirSync(dir)) {
    const tam = join(dir, ad);
    if (statSync(tam).isDirectory()) yield* tsxler(tam);
    else if (tam.endsWith('.tsx')) yield tam;
  }
}

test('kök dil, atlama bağlantısı ve ana bölge var', () => {
  const l = oku('layout.tsx');
  assert.match(l, /<html[^>]*lang="tr"/);
  assert.match(l, /<Atla\s*\/>/);
  assert.match(l, /<main[^>]*id="icerik"/);
  const a = oku('bilesenler/atla.tsx');
  assert.match(a, /href="#icerik"/);
  assert.match(a, /İçeriğe geç/);
});

test('odak, hareket azaltma ve yerel font kuralları korunur', () => {
  const css = oku('stil.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.equal(/fonts\.googleapis|fonts\.gstatic/.test(css), false);
  const fontlar = oku('fontlar.ts');
  assert.match(fontlar, /next\/font\/local/);
  assert.equal(/https?:/.test(fontlar), false);
});

test('görsellerde alt, oy düğmelerinde erişilebilir ad ve sonuçta canlı bölge var', () => {
  for (const dosya of tsxler(app)) {
    const s = readFileSync(dosya, 'utf8');
    for (const etiket of s.match(/<(?:img|Image)\b[^>]*>/g) ?? []) {
      assert.match(etiket, /\balt=/, `${dosya}: ${etiket}`);
    }
  }
  const oy = oku('bilesenler/oy-dugmesi.tsx');
  assert.match(oy, /aria-pressed/);
  assert.match(oy, /aria-label/);
  assert.match(oku('bilesenler/sonuc-paneli.tsx'), /aria-live="polite"/);
  assert.match(oku('bilesenler/onay-diyalogu.tsx'), /<dialog/);
});

test('her sayfada ana başlık var; pozitif tabindex yok', () => {
  for (const dosya of tsxler(app)) {
    const s = readFileSync(dosya, 'utf8');
    assert.equal(/tabIndex=\{?["']?[1-9]/.test(s), false, dosya);
    if (/[\\/]page\.tsx$/.test(dosya)) {
      const baslik = (s.match(/<h1\b/g) ?? []).length + (s.match(/<SayfaBasligi\b/g) ?? []).length;
      assert.ok(baslik >= 1, dosya);
    }
  }
});
