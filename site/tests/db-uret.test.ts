import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dbUret, type HedefGirdi } from '../lib/db-uret.ts';
import { dbKur } from '../lib/ortak.ts';
import type { Sayim } from '../lib/oy-hesabi.ts';

const S = (up: number, kararsiz: number, down: number): Sayim => ({ up, kararsiz, down });
const KANAL = 'UCfYNqluOf8EbQkL44otydMw';
const VIDEO = 'dQw4w9WgXcQ';

const kanal = (): HedefGirdi => ({ tur: 'kanal', id: KANAL, handle: '@trtspor', ad: 'TRT Spor', avatar: null,
  konular: { spor: S(5, 0, 0), haber: S(3, 0, 0) }, etiketler: { ai: S(3, 0, 0), kufur: S(1, 1, 1) } });

test('üretilen dosyayı eklenti doğrulayıcısı eksiksiz kabul eder', () => {
  const { json, ozet } = dbUret({ kayitlar: [kanal(), { tur: 'video', id: VIDEO, konular: { muzik: S(4, 0, 1) }, etiketler: {} }], veriSurumu: 3, oncekiSurum: 2, olusturma: '2026-10-24' });
  assert.deepEqual(ozet, { kanal: 1, video: 1, yazilmayan: 0 });
  const y = dbKur(json);
  assert.deepEqual(y.sayac, { kanal: 1, video: 1, atlanan: 0, yokSayilan: 0 });
  assert.equal(y.veriSurumu, 3);
  const k = (json.kanallar as any[])[0];
  assert.equal(k.anaKonu, 'spor'); assert.deepEqual(k.yanKonular, ['haber']);
  assert.deepEqual(k.etiketler, ['ai']); assert.deepEqual(k.kararsizEtiketler, ['kufur']);
});

test('eşiği geçemeyen / oy almamış kayıt dosyaya girmez', () => {
  const { json, ozet } = dbUret({ kayitlar: [{ tur: 'video', id: VIDEO, konular: { muzik: S(2, 0, 0) }, etiketler: { argo: S(1, 0, 0) } }], veriSurumu: 1 });
  assert.deepEqual(json.videolar, []); assert.equal(ozet.yazilmayan, 1);
});

test('kilitli kayıt: güncel oylar değil kilit anındaki sonuç yazılır', () => {
  const k = kanal();
  k.konular = { oyun: S(50, 0, 0) }; // yeni oylar farklı bir sonuç gösteriyor
  k.kilitliSonuc = { anaKonu: 'spor', yanKonular: [], etiketler: [], kararsizKonular: [], kararsizEtiketler: [] };
  const { json } = dbUret({ kayitlar: [k], veriSurumu: 1 });
  assert.equal((json.kanallar as any[])[0].anaKonu, 'spor');
});

test('veriSurumu önceki sürümden büyük olmalı', () => {
  assert.throws(() => dbUret({ kayitlar: [kanal()], veriSurumu: 2, oncekiSurum: 2 }), /büyük olmalı/);
});

test('bilinmeyen konu kimliği üretimde HATA verir (katı doğrulama)', () => {
  const k = kanal(); k.konular = { 'olmayan-konu': S(5, 0, 0) };
  assert.throws(() => dbUret({ kayitlar: [k], veriSurumu: 1 }), /Bilinmeyen/);
});

test('geçersiz kanal kimliği eklenti doğrulayıcısında yakalanır', () => {
  const k = kanal() as any; k.id = 'UCkisa';
  assert.throws(() => dbUret({ kayitlar: [k], veriSurumu: 1 }), /reddetti/);
});

test('çıktı deterministik: girdi sırası sonucu değiştirmez', () => {
  const a = dbUret({ kayitlar: [kanal(), { tur: 'video', id: VIDEO, konular: { muzik: S(4, 0, 1) }, etiketler: {} }], veriSurumu: 1 });
  const b = dbUret({ kayitlar: [{ tur: 'video', id: VIDEO, konular: { muzik: S(4, 0, 1) }, etiketler: {} }, kanal()], veriSurumu: 1 });
  assert.equal(JSON.stringify(a.json), JSON.stringify(b.json));
});

test('docs/db.test-ornek.json eklenti doğrulayıcısından geçiyor (sözleşme referansı)', () => {
  const j = JSON.parse(readFileSync(new URL('../../docs/db.test-ornek.json', import.meta.url), 'utf8'));
  assert.equal(dbKur(j).sayac.atlanan, 0);
});
