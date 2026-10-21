const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const KOK = path.join(__dirname, '..');

test('derleme çıktıları (chromium/ + firefox/) src/ ve manifestlerle güncel', () => {
    const sonuc = spawnSync(process.execPath, [path.join('scripts', 'build.js'), '--check'], {
        cwd: KOK,
        encoding: 'utf8'
    });
    assert.strictEqual(sonuc.status, 0, `${sonuc.stdout}\n${sonuc.stderr}`);
    assert.match(sonuc.stdout, /Derleme çıktıları güncel/);
});
