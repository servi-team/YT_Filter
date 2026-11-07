import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (yol: string) => readFileSync(new URL(yol, import.meta.url), 'utf8');

test('Bildirim mesajı blok içerik kabul eden kapsayıcıya yazılır', () => {
  const bildirim = oku('../app/bilesenler/bildirim.tsx');
  assert.match(bildirim, /<div className=\{s\.metin\}>/);
  assert.equal(/<p className=\{s\.metin\}>/.test(bildirim), false);

  const onizleme = oku('../app/bilesenler/yayin-onizleme.tsx');
  assert.match(onizleme, /<ul className=\{s\.liste\}>/);
});

test('panel kabuğu admin ve editör rolünü ayrı adlandırır', () => {
  const duzen = oku('../app/panel/layout.tsx');
  assert.match(duzen, /kullanici\.rol === 'admin'/);
  assert.match(duzen, /Yönetici paneli/);
  assert.match(duzen, /Editör paneli/);
});

test('admin menüsü moderasyon ve engeller sayfalarını gösterir', () => {
  const menu = oku('../app/admin/admin-menu.tsx');
  assert.match(menu, /yol: '\/panel\/moderasyon'/);
  assert.match(menu, /yol: '\/panel\/engeller'/);
});

test('panel içerik listesi kayıt moderasyon sayfasına bağlanır', () => {
  const sayfa = oku('../app/panel/icerikler/page.tsx');
  assert.match(sayfa, /\/panel\/icerikler\/\$\{kayit\.tur\}/);
});

test('admin içerik listesi ve detayı kayıt moderasyonuna bağlanır', () => {
  const liste = oku('../app/admin/icerikler/page.tsx');
  assert.match(liste, /\/panel\/icerikler\/\$\{kayit\.tur\}/);

  const detay = oku('../app/admin/icerikler/[tur]/[id]/page.tsx');
  assert.match(detay, /\/panel\/icerikler\/\$\{tur\}/);
});
