/**
 * Smoke test ortak yardımcıları.
 * options.html ve content.js'i jsdom içinde, sahte chrome.* API'siyle çalıştırır.
 * Saf mantık testleri (tests/*.test.js) Node koşucusunda kalır; burası yalnızca arayüz/köprü içindir.
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { webcrypto } = require('node:crypto');
const { JSDOM, VirtualConsole } = require('jsdom');

const KOK = path.join(__dirname, '..', '..');
const SRC = path.join(KOK, 'src');
const DB_JSON = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'db.json'), 'utf8'));

const CORE_BETIKLERI = [
    'core/taxonomy.js',
    'core/pin.js',
    'core/kilit.js',
    'core/decision.js',
    'core/migrate.js',
    'core/listeler.js',
    'core/db.js',
    'core/engine.js'
];

function bekle(kosul, { sure = 2000, adim = 10 } = {}) {
    return new Promise((cozumle, reddet) => {
        const baslangic = Date.now();
        const dene = async () => {
            let sonuc = false;
            try {
                sonuc = await kosul();
            } catch (e) {
                reddet(e);
                return;
            }
            if (sonuc) return cozumle();
            if (Date.now() - baslangic > sure) {
                reddet(new Error('Zaman aşımı: beklenen durum oluşmadı'));
                return;
            }
            setTimeout(dene, adim);
        };
        dene();
    });
}

function kopyala(veri) {
    return JSON.parse(JSON.stringify(veri));
}

// storage.local + onChanged + runtime + tabs içeren asgari sahte chrome.
function sahteChrome(baslangic = {}, { sekmeler = [], mesajYaniti = null } = {}) {
    const depo = kopyala(baslangic);
    const dinleyiciler = [];
    const bildir = (degisim) => dinleyiciler.forEach(fn => fn(degisim, 'local'));
    const chrome = {
        runtime: {
            lastError: undefined,
            getURL: (yol) => 'chrome-extension://test/' + yol,
            onMessage: { addListener() {} }
        },
        storage: {
            local: {
                get(keys, cb) {
                    let sonuc;
                    if (keys == null) sonuc = kopyala(depo);
                    else {
                        sonuc = {};
                        const liste = Array.isArray(keys) ? keys : [keys];
                        liste.forEach(k => { if (k in depo) sonuc[k] = kopyala(depo[k]); });
                    }
                    queueMicrotask(() => cb && cb(sonuc));
                },
                set(items, cb) {
                    const degisim = {};
                    Object.keys(items).forEach(k => {
                        degisim[k] = { oldValue: depo[k], newValue: items[k] };
                        depo[k] = kopyala(items[k]);
                    });
                    bildir(degisim);
                    if (cb) queueMicrotask(cb);
                },
                remove(keys, cb) {
                    const liste = Array.isArray(keys) ? keys : [keys];
                    const degisim = {};
                    liste.forEach(k => {
                        if (!(k in depo)) return;
                        degisim[k] = { oldValue: depo[k] };
                        delete depo[k];
                    });
                    if (Object.keys(degisim).length) bildir(degisim);
                    if (cb) queueMicrotask(cb);
                }
            },
            onChanged: {
                addListener(fn) { dinleyiciler.push(fn); }
            }
        },
        tabs: {
            query(_sorgu, cb) { queueMicrotask(() => cb && cb(sekmeler)); },
            sendMessage(_id, _mesaj, cb) { if (cb) queueMicrotask(() => cb(mesajYaniti)); }
        }
    };
    chrome.__depo = depo;
    return chrome;
}

function sanalKonsol(hataKutusu) {
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => hataKutusu.push(String(e && e.message || e)));
    return vc;
}

// options.html'i gerçek betik sırasıyla jsdom içinde çalıştırır.
async function arayuzuAc({ baslangic = {}, sekmeler = [], mesajYaniti = null, onay = true } = {}) {
    const chrome = sahteChrome(baslangic, { sekmeler, mesajYaniti });
    const jsdomHatalari = [];
    let html = fs.readFileSync(path.join(SRC, 'options.html'), 'utf8');
    html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, ''); // CSSOM gürültüsünü engelle (görsel test değil)
    const dom = new JSDOM(html, {
        url: pathToFileURL(path.join(SRC, 'options.html')).href,
        runScripts: 'dangerously',
        resources: 'usable',
        virtualConsole: sanalKonsol(jsdomHatalari),
        beforeParse(window) {
            window.chrome = chrome;
            Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true }); // jsdom'da subtle yok
            Object.defineProperty(window, 'TextEncoder', { value: TextEncoder, configurable: true }); // jsdom'da yok
            window.fetch = async () => ({ json: async () => kopyala(DB_JSON) });
            window.__hatalar = [];
            window.__uyarilar = [];
            window.alert = (m) => window.__uyarilar.push(String(m));
            window.confirm = () => onay;
            window.addEventListener('error', (e) => window.__hatalar.push(String(e.message)));
        }
    });
    await new Promise((cozumle) => {
        if (dom.window.document.readyState === 'complete') cozumle();
        else dom.window.addEventListener('load', cozumle, { once: true });
    });
    return { dom, chrome, pencere: dom.window, belge: dom.window.document, jsdomHatalari };
}

// content.js'i verilen sayfa HTML'i üzerinde jsdom içinde çalıştırır.
function icerikArayuzuAc({
    html,
    url = 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
    baslangic = {},
    mesajYaniti = null
} = {}) {
    const chrome = sahteChrome(baslangic, { mesajYaniti });
    const jsdomHatalari = [];
    const dom = new JSDOM(html, {
        url,
        runScripts: 'dangerously',
        virtualConsole: sanalKonsol(jsdomHatalari),
        beforeParse(window) {
            window.chrome = chrome;
            Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true }); // jsdom'da subtle yok
            Object.defineProperty(window, 'TextEncoder', { value: TextEncoder, configurable: true }); // jsdom'da yok
            window.fetch = async () => ({ json: async () => kopyala(DB_JSON) });
            window.__hatalar = [];
            window.addEventListener('error', (e) => window.__hatalar.push(String(e.message)));
            window.alert = () => {};
            window.confirm = () => true;
        }
    });
    const pencere = dom.window;
    CORE_BETIKLERI.forEach(yol => {
        pencere.eval(fs.readFileSync(path.join(SRC, yol), 'utf8'));
    });
    pencere.eval(fs.readFileSync(path.join(SRC, 'content.js'), 'utf8'));
    return { dom, chrome, pencere, belge: pencere.document, jsdomHatalari };
}

module.exports = {
    KOK,
    SRC,
    DB_JSON,
    bekle,
    kopyala,
    sahteChrome,
    arayuzuAc,
    icerikArayuzuAc
};
