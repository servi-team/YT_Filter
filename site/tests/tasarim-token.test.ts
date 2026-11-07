import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../app/stil.css', import.meta.url), 'utf8');
const token = (ad: string) => css.match(new RegExp(`--${ad}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
function lum(hex: string) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return .2126*c[0]+.7152*c[1]+.0722*c[2]; }
function oran(a: string, b: string) { const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
test('tokenlar spec ile aynı ve metin çiftleri WCAG AA', () => {
  const beklenen = { zemin:'#F7F3EB', yuzey:'#FFFDF8', murekkep:'#171A1C', ikincil:'#6B6861', cizgi:'#E3DCCF', sinyal:'#C9342B', 'sinyal-koyu':'#98251F', yesil:'#1E6B52', amber:'#A96416', kirmizi:'#B3261E', odak:'#2E6F95' };
  for (const [ad, deger] of Object.entries(beklenen)) assert.equal(token(ad), deger, ad);
  for (const [a,b] of [['murekkep','zemin'],['ikincil','zemin'],['sinyal','zemin'],['kirmizi','yuzey'],['yesil','yuzey'],['amber','yuzey'],['odak','zemin']]) assert.ok(oran(token(a)!, token(b)!) >= 4.5, `${a}/${b}`);
});
