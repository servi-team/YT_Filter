import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const boyut = (yol: string) => {
  const b = readFileSync(yol);
  assert.equal(b.subarray(1, 4).toString('ascii'), 'PNG');
  return b.readUInt32BE(16);
};

test('ikon üretimi beklenen boyutları ve şeffaf çerçeveyi üretir', () => {
  const kok = fileURLToPath(new URL('../../', import.meta.url));
  execFileSync('node', [`${kok}scripts/ikon-uret.js`], { cwd: kok, stdio: 'pipe' });
  for (const n of [16, 32, 48, 128]) assert.equal(boyut(`${kok}src/icons/icon${n}.png`), n);
  assert.equal(boyut(`${kok}site/app/icon.png`), 32);
  assert.equal(boyut(`${kok}site/app/apple-icon.png`), 180);
});
