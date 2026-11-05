/**
 * Background script testi (vm.runInNewContext ile src/background.js yüklenir).
 * Açılışta (runtime.onStartup) PIN oturum anahtarlarının temizlenmesi.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

const kod = fs.readFileSync(require.resolve('../src/background.js'), 'utf8');

test('background: açılışta PIN oturum anahtarlarını temizler', () => {
  const silinen = [];
  const dinleyiciler = {};
  const chrome = {
    runtime: {
      onInstalled: { addListener(fn) { dinleyiciler.installed = fn; } },
      onStartup: { addListener(fn) { dinleyiciler.startup = fn; } }
    },
    storage: { local: { set() {}, remove(keys) { silinen.push(...keys); } } }
  };
  vm.runInNewContext(kod, { chrome, console, importScripts: undefined });
  assert.equal(typeof dinleyiciler.startup, 'function');
  dinleyiciler.startup();
  assert.deepEqual(silinen.sort(), ['pinHataBitis', 'pinHataSayisi', 'pinKilitBitis'].sort());
});
