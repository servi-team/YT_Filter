'use strict';

/**
 * Release paketleyici.
 *
 * Varsayılan kullanım: package.json sürümüyle aynı `v<surum>` etiketini doğrular,
 * temiz ağaçta `chromium/` ve `firefox/` klasörlerinden release zip'lerini üretir.
 * `--ref <ref>` verilirse etiket/HEAD eşitliği aranmaz; verilen ref arşivlenir.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const KOK = path.join(__dirname, '..');
const TURLER = ['chromium', 'firefox'];
const DEPO = 'servi-team/YT_Filter';

function etiketAdi(surum) {
    return `v${surum}`;
}

function zipAdi(tur, surum) {
    if (!TURLER.includes(tur)) throw new Error(`Bilinmeyen hedef: ${tur}`);
    return `yt-filter-${tur}-${surum}.zip`;
}

function dogrula({ surum, etiketCommit, headCommit, kirli }) {
    const hatalar = [];
    if (!surum) hatalar.push('Sürüm boş olamaz.');
    if (kirli) hatalar.push('Çalışma ağacı kirli; önce izlenen değişiklikleri commit edin.');
    if (!etiketCommit) {
        hatalar.push(`Etiket bulunamadı: ${etiketAdi(surum)}`);
    } else if (headCommit && etiketCommit !== headCommit) {
        hatalar.push(`Etiket (${etiketAdi(surum)}) HEAD ile aynı commit'i göstermiyor.`);
    }
    return hatalar;
}

function git(args) {
    return execFileSync('git', args, {
        cwd: KOK,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
}

function commitCoz(ref) {
    try {
        return git(['rev-parse', '--verify', `${ref}^{commit}`]);
    } catch (e) {
        return null;
    }
}

function refArgumani(argv) {
    const i = argv.indexOf('--ref');
    if (i === -1) return null;
    const ref = argv[i + 1];
    if (!ref) throw new Error('--ref için bir değer gerekli');
    return ref;
}

function main(argv = process.argv.slice(2)) {
    const surum = require(path.join(KOK, 'package.json')).version;
    const etiket = etiketAdi(surum);
    const ref = refArgumani(argv);
    const arsivRef = ref || etiket;

    const etiketCommit = commitCoz(arsivRef);
    const headCommit = ref ? null : commitCoz('HEAD');
    const hatalar = dogrula({
        surum,
        etiketCommit,
        headCommit,
        kirli: git(['status', '--porcelain', '--untracked-files=no']).length > 0
    });

    if (hatalar.length > 0) {
        hatalar.forEach(h => console.error(`Hata: ${h}`));
        process.exitCode = 1;
        return false;
    }

    const dist = path.join(KOK, 'dist');
    fs.mkdirSync(dist, { recursive: true });

    TURLER.forEach(tur => {
        const zip = path.join(dist, zipAdi(tur, surum));
        if (fs.existsSync(zip)) fs.rmSync(zip);
        git(['archive', '--format=zip', `--output=${zip}`, `${arsivRef}:${tur}`]);
        console.log(`✓ dist/${zipAdi(tur, surum)}`);
    });

    console.log('\nRelease komutu:');
    console.log(`gh release create ${etiket} dist/${zipAdi('chromium', surum)} dist/${zipAdi('firefox', surum)} --repo ${DEPO} --title "${etiket}" --notes-file dist/release-notlari-${surum}.md`);

    return true;
}

if (require.main === module) main();

module.exports = { etiketAdi, zipAdi, dogrula, main };
