const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const paket = require('../package.json');
const chromium = require('../manifests/manifest.chromium.json');
const firefox = require('../manifests/manifest.firefox.json');
const KOK = path.join(__dirname, '..');

const icerikBetigiSirasi = ['core/taxonomy.js', 'core/decision.js', 'core/migrate.js', 'core/db.js', 'core/engine.js', 'content.js'];

function tumEslesmeler(manifest) {
    return (manifest.content_scripts || []).flatMap(c => c.matches || []);
}

test('manifest: açıklama gerçek özellikleri anlatır, kullanılmayan Google izni yok', () => {
    [chromium, firefox].forEach(m => {
        assert.ok(!/otomatik senkronizasyon/i.test(m.description));
        assert.ok(!/video etiketleme/i.test(m.description));
        assert.ok(m.description.length <= 132);
        assert.ok(!m.host_permissions.some(p => p.includes('google.com')));
        assert.ok(!tumEslesmeler(m).some(p => p.includes('google.com')));
    });
});

test('manifest: tarayıcı sürümleri MAIN world ile uyumlu, içerik betiği sırası doğru', () => {
    assert.ok(Number(chromium.minimum_chrome_version) >= 111);
    // Firefox 140: data_collection_permissions beyanı/izin ekranı bu sürümden itibaren desteklenir.
    assert.ok(Number(firefox.browser_specific_settings.gecko.strict_min_version) >= 140);
    [chromium, firefox].forEach(m => {
        assert.strictEqual(m.manifest_version, 3);
        assert.ok(m.action.default_popup.endsWith('options.html'));
        const helper = m.content_scripts.find(c => (c.js || []).includes('inject_helper.js'));
        assert.strictEqual(helper.world, 'MAIN');
        assert.deepStrictEqual(m.content_scripts[0].js, icerikBetigiSirasi);
    });
});

test('manifest: sürümler iki tarayıcıda ve package.json ile eşit, mağaza biçiminde (PR 8F)', () => {
    assert.strictEqual(chromium.version, firefox.version);
    assert.strictEqual(chromium.version, paket.version);
    assert.match(chromium.version, /^\d+(\.\d+){1,3}$/);
    assert.strictEqual(chromium.name, firefox.name);
});

test('manifest: Firefox veri toplama beyanı ve uzantı ikonları eksiksiz', () => {
    const gecko = firefox.browser_specific_settings.gecko;
    assert.deepStrictEqual(gecko.data_collection_permissions, { required: ['none'] });

    [chromium, firefox].forEach(m => {
        for (const boyut of ['16', '32', '48', '128']) {
            assert.ok(m.icons[boyut], `${m.name}: icons.${boyut} eksik`);
            assert.ok(fs.existsSync(path.join(KOK, 'src', m.icons[boyut])), `${m.icons[boyut]} dosyası yok`);
        }
        assert.ok(m.action.default_icon, 'action.default_icon eksik');
        assert.ok(m.action.default_icon['16']);
        assert.ok(m.action.default_icon['48']);
    });
});
