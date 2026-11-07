import test from 'node:test';
import assert from 'node:assert/strict';
import { taksonomi } from '../lib/ortak.ts';
import { sonucHesapla, sayimYap, durumBul, type Sayim } from '../lib/oy-hesabi.ts';

const KS = taksonomi.KONULAR.map(k => k.id);
const ES = taksonomi.ETIKETLER.map(e => e.id);
const S = (up: number, kararsiz: number, down: number): Sayim => ({ up, kararsiz, down });
const hesapla = (k: Record<string, Sayim>, e: Record<string, Sayim> = {}) => sonucHesapla(k, e, KS, ES);

test('kabul örneği (PLAN_SITE bölüm 5)', () => {
  const r = hesapla(
    { teknoloji: S(25, 3, 2), haber: S(10, 7, 5), muzik: S(0, 0, 30), eglence: S(3, 0, 3), spor: S(0, 0, 30), oyun: S(30, 3, 10) },
    { zararli: S(0, 0, 30), spam: S(0, 0, 30), 'olumsuz-ornek': S(0, 0, 30), ai: S(10, 7, 5), argo: S(1, 0, 0), kufur: S(5, 5, 5) },
  );
  assert.equal(r.anaKonu, 'teknoloji');
  assert.deepEqual(r.yanKonular, ['oyun', 'haber']);          // Oyun +20, Haber +5
  assert.deepEqual(r.kararsizKonular, ['eglence']);
  assert.deepEqual(r.etiketler, ['ai']);
  assert.deepEqual(r.kararsizEtiketler, ['kufur']);
});

test('ana konu beraberliği: eşit net ve eşit upvote -> taksonomi sırası', () => {
  const r = hesapla({ oyun: S(10, 0, 0), bilim: S(10, 0, 0) });
  assert.equal(KS.indexOf('bilim') < KS.indexOf('oyun'), true);
  assert.equal(r.anaKonu, 'bilim');
  assert.deepEqual(r.yanKonular, ['oyun']);
});

test('ana konu beraberliği: eşit net, çok upvote kazanır', () => {
  const r = hesapla({ bilim: S(10, 0, 0), oyun: S(12, 0, 2) });
  assert.equal(r.anaKonu, 'oyun');
  assert.deepEqual(r.yanKonular, ['bilim']);
});

test('hiç pozitif konu yok: anaKonu yok', () => {
  const r = hesapla({ oyun: S(0, 0, 5), spor: S(2, 2, 2) });
  assert.equal(r.anaKonu, null);
  assert.deepEqual(r.yanKonular, []);
  assert.deepEqual(r.kararsizKonular, ['spor']);
});

test('eşik: 2 oy değerlendirilmez, 3 oy edilir; kararsız oylar eşiğe sayılır', () => {
  assert.equal(durumBul(S(2, 0, 0)), 'esik-alti');
  assert.equal(durumBul(S(1, 1, 0)), 'esik-alti');
  assert.equal(durumBul(S(3, 0, 0)), 'pozitif');
  assert.equal(durumBul(S(1, 2, 0)), 'pozitif');
  assert.equal(durumBul(S(0, 3, 0)), 'kararsiz');
});

test('eşik altındaki konu ana konu adayı olamaz', () => {
  const r = hesapla({ oyun: S(2, 0, 0), bilim: S(3, 0, 0) });
  assert.equal(r.anaKonu, 'bilim');
  assert.deepEqual(r.yanKonular, []);
});

test('argo 3 upvote alırsa etiket olur', () => {
  assert.deepEqual(hesapla({}, { argo: S(3, 0, 0) }).etiketler, ['argo']);
});

test('moderasyon geri alması oyu hesaba katmaz', () => {
  const s = sayimYap([{ deger: 'up' }, { deger: 'up' }, { deger: 'up', moderasyonGeriAlindi: true }, { deger: 'down' }]);
  assert.deepEqual(s, { up: 2, kararsiz: 0, down: 1 });
  assert.equal(durumBul(s), 'pozitif');
  const s2 = sayimYap([{ deger: 'up' }, { deger: 'up' }, { deger: 'up', moderasyonGeriAlindi: true }]);
  assert.equal(durumBul(s2), 'esik-alti'); // geri alınınca toplam 2'ye düştü
});

test('ziyaretçi geri alması da oyu hesaba katmaz', () => {
  const s = sayimYap([{ deger: 'up' }, { deger: 'up' }, { deger: 'up', ziyaretciGeriAlindi: true }]);
  assert.deepEqual(s, { up: 2, kararsiz: 0, down: 0 });
  assert.equal(durumBul(s), 'esik-alti');
});

test('hiç oy yok: sonuç boş', () => {
  const r = hesapla({}, {});
  assert.equal(r.anaKonu, null);
  assert.deepEqual([r.yanKonular, r.etiketler, r.kararsizKonular, r.kararsizEtiketler], [[], [], [], []]);
});
