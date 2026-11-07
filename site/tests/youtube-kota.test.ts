import test from 'node:test';
import assert from 'node:assert/strict';
import { testDb } from './yardim.ts';
import { kotaKullan, kotaDurumu } from '../lib/youtube-kota.ts';

test('günlük kota sayacı birikir, kalanı ve uyarıyı döndürür', async () => {
  const v = await testDb();
  try {
    const t = new Date('2026-10-27T10:00:00Z');
    const a = await kotaKullan(v.db, 1, t);
    assert.equal(a.kullanilan, 1); assert.equal(a.uyari, false);
    const b = await kotaKullan(v.db, 8000, t);
    assert.equal(b.kullanilan, 8001); assert.equal(b.uyari, true);
    const c = await kotaDurumu(v.db, t);
    assert.equal(c.kullanilan, 8001); assert.equal(c.kalan, 1999);
  } finally { await v.kapat(); }
});
