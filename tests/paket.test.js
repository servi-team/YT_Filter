const test = require('node:test');
const assert = require('node:assert');
const paket = require('../scripts/paket.js');

test('paket: etiket ve zip adları', () => {
  assert.equal(paket.etiketAdi('2.1.0'), 'v2.1.0');
  assert.equal(paket.zipAdi('chromium', '2.1.0'), 'yt-filter-chromium-2.1.0.zip');
  assert.equal(paket.zipAdi('firefox', '2.1.0'), 'yt-filter-firefox-2.1.0.zip');
});

test('paket: kirli ağaç ve etiket/HEAD uyuşmazlığı reddedilir', () => {
  const temiz = paket.dogrula({ surum: '2.1.0', etiketCommit: 'abc', headCommit: 'abc', kirli: false });
  assert.deepStrictEqual(temiz, []);
  const kirli = paket.dogrula({ surum: '2.1.0', etiketCommit: 'abc', headCommit: 'abc', kirli: true });
  assert.ok(kirli.some(m => m.includes('kirli')));
  const uzak = paket.dogrula({ surum: '2.1.0', etiketCommit: 'abc', headCommit: 'def', kirli: false });
  assert.ok(uzak.some(m => m.includes('HEAD')));
});
