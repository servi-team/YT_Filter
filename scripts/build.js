#!/usr/bin/env node

/**
 * YouTube Filtreleyici Derleme ve Senkronizasyon Betiği
 * 
 * src/ ve manifests/ altındaki kaynak kodları, doğrudan yüklenebilir
 * chromium/ ve firefox/ klasörlerine aktarır.
 * 
 * Kullanım:
 *   node scripts/build.js               # Her iki tarayıcıyı da derler
 *   node scripts/build.js --target chromium # Yalnızca Chromium için derler
 *   node scripts/build.js --target firefox  # Yalnızca Firefox için derler
 *   node scripts/build.js --watch       # Değişiklikleri izler ve otomatik günceller
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const MANIFESTS_DIR = path.join(ROOT_DIR, 'manifests');

const TARGETS = {
    chromium: {
        outDir: path.join(ROOT_DIR, 'chromium'),
        manifest: path.join(MANIFESTS_DIR, 'manifest.chromium.json')
    },
    firefox: {
        outDir: path.join(ROOT_DIR, 'firefox'),
        manifest: path.join(MANIFESTS_DIR, 'manifest.firefox.json')
    }
};

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function buildTarget(targetKey) {
    const target = TARGETS[targetKey];
    if (!target) {
        console.error(`Bilinmeyen hedef: ${targetKey}`);
        return false;
    }

    const startTime = Date.now();
    console.log(`[${targetKey.toUpperCase()}] Derleniyor -> ${path.relative(ROOT_DIR, target.outDir)}`);

    if (!fs.existsSync(target.outDir)) {
        fs.mkdirSync(target.outDir, { recursive: true });
    }

    // 1. src/ içerisindeki tüm dosyaları kopyala
    copyDirRecursive(SRC_DIR, target.outDir);

    // 2. Tarayıcıya özel manifest dosyasını kopyala
    const destManifest = path.join(target.outDir, 'manifest.json');
    if (fs.existsSync(target.manifest)) {
        fs.copyFileSync(target.manifest, destManifest);
    } else {
        console.error(`Hata: Manifest bulunamadı: ${target.manifest}`);
        return false;
    }

    const duration = Date.now() - startTime;
    console.log(`✓ [${targetKey.toUpperCase()}] Başarıyla derlendi (${duration}ms)`);
    return true;
}

function buildAll(targetFilter = null) {
    console.log(`\n=== YouTube Filtreleyici Derleme Başladı ===`);
    const targetsToBuild = targetFilter ? [targetFilter] : Object.keys(TARGETS);
    
    let allSuccess = true;
    for (const key of targetsToBuild) {
        const success = buildTarget(key);
        if (!success) allSuccess = false;
    }

    if (allSuccess) {
        console.log(`=== Tüm işlemler başarıyla tamamlandı ===\n`);
    } else {
        console.error(`=== Bazı derlemelerde hatalar oluştu ===\n`);
    }
}

function startWatch() {
    console.log(`\nİzleme modu aktif. Dosya değişiklikleri bekleniyor... (Ctrl+C ile durdurun)\n`);
    buildAll();

    let debounceTimer = null;
    const triggerBuild = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            console.log(`[İzleme] Değişiklik algılandı, yeniden derleniyor...`);
            buildAll();
        }, 200);
    };

    fs.watch(SRC_DIR, { recursive: true }, triggerBuild);
    fs.watch(MANIFESTS_DIR, { recursive: true }, triggerBuild);
}

// Komut satırı argümanlarını ayrıştır
const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const targetIdx = args.indexOf('--target');
const targetFilter = targetIdx !== -1 && args[targetIdx + 1] ? args[targetIdx + 1].toLowerCase() : null;

if (isWatch) {
    startWatch();
} else {
    buildAll(targetFilter);
}
