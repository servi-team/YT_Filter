import test from 'node:test';
import assert from 'node:assert/strict';
import { linkCoz } from '../lib/youtube-link.ts';

const V = 'dQw4w9WgXcQ';
const UC = 'UCfYNqluOf8EbQkL44otydMw';

test('video linkleri', () => {
  for (const l of [`https://www.youtube.com/watch?v=${V}&t=10s`, `youtube.com/watch?v=${V}`, `https://youtu.be/${V}?si=x`,
    `https://m.youtube.com/watch?v=${V}`, `https://www.youtube.com/shorts/${V}`, `https://www.youtube.com/live/${V}`,
    `https://www.youtube.com/embed/${V}`, `https://music.youtube.com/watch?v=${V}`]) {
    assert.deepEqual(linkCoz(l), { tur: 'video', id: V }, l);
  }
});

test('kanal linkleri', () => {
  assert.deepEqual(linkCoz(`https://www.youtube.com/channel/${UC}`), { tur: 'kanal', id: UC });
  assert.deepEqual(linkCoz('https://www.youtube.com/@TRTSpor/videos'), { tur: 'kanal', handle: '@TRTSpor' });
  assert.deepEqual(linkCoz('https://www.youtube.com/@%C3%B6rnek'.replace('%C3%B6', 'a')), { tur: 'kanal', handle: '@arnek' });
});

test('hatalı linkler anlaşılır hata verir', () => {
  for (const l of ['', 'merhaba', 'https://example.com/watch?v=' + V, 'https://www.youtube.com/watch?v=kisa',
    'https://www.youtube.com/channel/UCkisa', 'https://www.youtube.com/c/ornek', 'https://www.youtube.com/user/ornek',
    'ftp://youtube.com/watch?v=' + V, 'https://www.youtube.com/']) {
    const r = linkCoz(l);
    assert.equal(r.tur, 'hata', l);
    assert.ok((r as any).neden.length > 5);
  }
});
