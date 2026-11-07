import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
for (const ad of ['fraunces-variable.woff2', 'manrope-variable.woff2']) {
  test(`${ad} geçerli woff2`, () => {
    const b = readFileSync(new URL(`../app/fontlar/${ad}`, import.meta.url));
    assert.equal(b.subarray(0, 4).toString('ascii'), 'wOF2');
    assert.ok(b.length > 20_000);
  });
}
