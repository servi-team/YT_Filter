import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (yol: string) => readFileSync(new URL(yol, import.meta.url), 'utf8');

test('site gizlilik metni gerekli açıklamaları içerir ve eklenti metninden ayrıdır', () => {
  const s = oku('../app/(kamusal)/gizlilik/page.tsx');
  for (const metin of ['1 yıl', '30 gün', 'IP', 'çerez', 'takma etiket', 'arşiv', 'GitHub Issues', 'analitik', 'reklam', 'üçüncü taraf', 'eklenti']) {
    assert.ok(s.includes(metin), `eksik: ${metin}`);
  }
  assert.match(s, /yalnızca.*site.*kapsar/i);
  assert.equal(s.includes('GIZLILIK.md'), false);
});

test('koşullar ve iletişim sayfaları taslak metni ve gerçek issue bağlantısını taşır', () => {
  const k = oku('../app/(kamusal)/kosullar/page.tsx');
  for (const metin of ['Kullanım Koşulları', 'sorumluluk', 'moderasyon', 'değişiklik', 'YouTube']) assert.ok(k.includes(metin), metin);
  const i = oku('../app/(kamusal)/iletisim/page.tsx');
  assert.match(i, /github\.com\/TalhaOzz\/YouTubeFilter\/issues/);
  assert.equal(i.includes('<form'), false);
});

test('404 ve hata sayfaları Türkçe ve erişilebilir', () => {
  const n = oku('../app/not-found.tsx');
  assert.match(n, /Sayfa bulunamadı/);
  assert.match(n, /href="\/"/);
  const e = oku('../app/error.tsx');
  assert.match(e, /'use client'/);
  assert.match(e, /Tekrar dene/);
});
