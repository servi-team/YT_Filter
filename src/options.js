/**
 * YouTube Filtreleyici - Options Script
 * Hem Chromium hem de Firefox ile uyumlu arayüz yöneticisi.
 *
 * Veri modeli: storage.local içinde { surum: 2, ayar: {...} } (bkz. core/taxonomy.js varsayilanAyar).
 * Eski model (customMapping + preferences) ilk açılışta bir kez yeni modele taşınır (core/migrate.js);
 * eski veri "eskiYedek" altında saklanır.
 */

const browserAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

let mevcutVeri = {};          // storage içeriği (ayarlar, PIN, ...)
let ayar = null;              // yeni model; mevcutVeri.ayar ile aynı nesne
let veriTabani = YTF.dbKur(null);
let aktifFiltre = 'all';      // 'all' | 'beyaz' | 'kara' | 'ozel:<liste adı>'
let aramaMetni = '';
let aktifYouTubeIcerigi = null;

const MODLAR = YTF.MODLAR;    // ['serbest', 'orta', 'kati']
const MOD_BILGI = {
    serbest: 'Videonun herhangi bir konusu izinliyse video açılır. Engellediğiniz bir etiket (küfür, şiddet vb.) varsa yine de engellenir. Kararsız kalan konu ve etiketlere izin verilir.',
    orta: 'Yalnızca ana konuya bakılır. Ana konu izinliyse ve video engellediğiniz bir etiketi taşımıyorsa video açılır. Kararsızları aşağıdan siz seçersiniz.',
    kati: 'Videonun ana veya yan konularından biri engelliyse ya da engellediğiniz bir etiketi varsa video engellenir. Kararsız konu ve etiketler de (engellediklerinizse) engellenir.'
};
const KARARSIZ_IPUCU = {
    serbest: 'Serbest modda kararsız konu ve etiketlere her zaman izin verilir.',
    orta: {
        izinver: 'Topluluk oylamasında sonuç çıkmamış konu ve etiketler engellemez.',
        engelle: 'Kararsız kalan bir konu ya da etiketi siz engelliyorsanız, o video da engellenir.'
    },
    kati: 'Katı modda kararsız konu ve etiketler (engellediklerinizse) her zaman engellenir.'
};
const EYLEM_SECENEKLERI = [
    ['kaldir', 'Gizle'],
    ['bulaniklastir', 'Bulanıklaştır'],
    ['uyari', 'Uyarı sayfası']
];
const ETIKETLENMEMIS_IPUCU = {
    null: 'Henüz seçmediniz. Siz seçene kadar etiketlenmemiş içerikler engellenir.',
    ac: 'Veritabanında olmayan kanal ve videolar normal şekilde açılır.',
    engelle: 'Veritabanında olmayan kanal ve videolar engellenir. Listelere ekleyerek tek tek açabilirsiniz.'
};

const SVG_COP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
const SVG_KANAL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
const SVG_VIDEO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';

function el(etiket, sinif, metin) {
    const e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin !== undefined) e.textContent = metin;
    return e;
}

// ---- Storage yardımcıları, toast ----
async function getStorageData(keys = null) {
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        return await browser.storage.local.get(keys);
    }
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (res) => resolve(res || {}));
    });
}

async function setStorageData(items) {
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        return await browser.storage.local.set(items);
    }
    return new Promise((resolve) => {
        chrome.storage.local.set(items, () => resolve());
    });
}

function showToast(message) {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2400);
}


// ---- Ayar hazırlama / kaydetme ----

// Yeni modeldeyse okur; eski modeldeyse bir kez taşır ve kalıcı yazar; hiç veri yoksa varsayılanı kullanır.
async function ayariHazirla() {
    if (mevcutVeri.surum >= 2 && mevcutVeri.ayar) {
        ayar = YTF.ayarTemizle(mevcutVeri.ayar);
        return;
    }
    const eskiVar = !!(mevcutVeri.customMapping || mevcutVeri.preferences);
    const yama = eskiVar ? YTF.migrate(mevcutVeri) : null;
    ayar = YTF.ayarTemizle(yama ? yama.ayar : null); // eski veri yoksa: varsayılan (etiketlenmemis: null -> ilk seçim)
    const yazilacak = { surum: 2, ayar };
    if (yama) yazilacak.eskiYedek = yama.eskiYedek;
    await setStorageData(yazilacak);
    Object.assign(mevcutVeri, yazilacak);
}

async function ayarKaydet() {
    mevcutVeri.ayar = ayar;
    await setStorageData({ surum: 2, ayar });
}

// Paketle gelen veritabanını (yalnızca kanal adı göstermek için) okur. Hata olursa boş veritabanıyla devam eder.
async function veriTabaniniYukle() {
    try {
        const yanit = await fetch(browserAPI.runtime.getURL('data/db.json'));
        veriTabani = YTF.dbKur(YTF.dbSec(await yanit.json(), mevcutVeri.dbOverride));
    } catch (e) {
        veriTabani = YTF.dbKur(null);
    }
}

// Başlangıç Yüklemesi
document.addEventListener('DOMContentLoaded', async () => {
    const veri = await getStorageData(null);
    mevcutVeri = veri || {};
    if (!mevcutVeri.ayarlar) mevcutVeri.ayarlar = {};

    await ayariHazirla();
    await veriTabaniniYukle();

    document.getElementById('lblKurulumTarihi').innerText = veri.kurulumTarihi || "Bilinmiyor";

    // Temayı Başlat
    if (mevcutVeri.ayarlar.koyuTema) {
        document.body.classList.add('dark-theme');
        document.getElementById('lblTemaIkon').innerText = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        document.getElementById('lblTemaIkon').innerText = '🌙';
    }

    // PIN İpucu Kontrolü (İlk giriş yapıldıysa veya PIN değiştirildiyse ipucunu gösterme)
    const pinIpucu = document.getElementById('pinVarsayilanIpucu');
    if (mevcutVeri.ilkGirisYapildi || (mevcutVeri.pinKodu && mevcutVeri.pinKodu !== "1234")) {
        if (pinIpucu) pinIpucu.style.display = 'none';
    } else {
        if (pinIpucu) pinIpucu.style.display = 'inline-flex';
    }

    // Aktif YouTube Sekmesini Algıla (Ama henüz açma)
    await algilaAktifYouTubeSekmesi();

    // PIN Kontrolü
    if (mevcutVeri.ayarlar.pinIptal || !mevcutVeri.pinKodu) {
        kilidiAc();
    } else {
        kilitle();
    }

    // Olay Dinleyicilerini Kur
    initEvents();
});

function kilidiAc() {
    document.getElementById('pinEkrani').style.display = 'none';
    document.getElementById('anaArayuz').style.display = 'block';
    
    // İlk giriş yapıldı olarak işaretle ve ipucunu kalıcı olarak kapat
    if (!mevcutVeri.ilkGirisYapildi) {
        mevcutVeri.ilkGirisYapildi = true;
        setStorageData({ ilkGirisYapildi: true });
    }
    const pinIpucu = document.getElementById('pinVarsayilanIpucu');
    if (pinIpucu) pinIpucu.style.display = 'none';

    // Yeni kurulumda PIN henüz seçilmediyse seçim kartını göster
    const kurulumKarti = document.getElementById('pinKurulumKarti');
    if (kurulumKarti) {
        kurulumKarti.style.display = (!mevcutVeri.pinKodu && !mevcutVeri.pinKurulumAtlandi) ? 'block' : 'none';
    }

    // PIN hala 1234 ise uyarı banner'ını göster
    const uyariBanner = document.getElementById('pinDegistirUyarisi');
    if (uyariBanner) {
        if (mevcutVeri.pinKodu === "1234" && !mevcutVeri.pinDegistirildi) {
            uyariBanner.style.display = 'flex';
        } else {
            uyariBanner.style.display = 'none';
        }
    }

    // Quick Action Banner: SADECE KİLİT AÇILDIKTAN SONRA GÖRÜNÜR OLUR!
    const banner = document.getElementById('quickActionBanner');
    if (banner) {
        if (aktifYouTubeIcerigi) {
            banner.style.display = 'flex';
        } else {
            banner.style.display = 'none';
        }
    }

    // Eğer PIN iptal edilmemişse Kilitle butonunu göster
    if (!mevcutVeri.ayarlar.pinIptal && mevcutVeri.pinKodu) {
        document.getElementById('btnPinKilitle').style.display = 'flex';
    } else {
        document.getElementById('btnPinKilitle').style.display = 'none';
    }
    
    arayuzuDoldur();
}

function kilitle() {
    document.getElementById('anaArayuz').style.display = 'none';

    // Kilitliyken Quick Action Banner ASLA görünmez ve seçilemez
    const banner = document.getElementById('quickActionBanner');
    if (banner) banner.style.display = 'none';

    document.getElementById('pinEkrani').style.display = 'flex';
    document.getElementById('btnPinKilitle').style.display = 'none';
    document.getElementById('pinGiris').value = '';
    document.getElementById('pinHata').style.display = 'none';

    // İlk giriş yapıldıysa kilit ekranında 1234 yazısı artık asla gösterilmez
    const pinIpucu = document.getElementById('pinVarsayilanIpucu');
    if (pinIpucu) {
        if (mevcutVeri.ilkGirisYapildi || (mevcutVeri.pinKodu && mevcutVeri.pinKodu !== "1234")) {
            pinIpucu.style.display = 'none';
        } else {
            pinIpucu.style.display = 'inline-flex';
        }
    }

    setTimeout(() => document.getElementById('pinGiris').focus(), 50);
}

function pinDogrula() {
    const girilen = document.getElementById('pinGiris').value;
    const pinKutu = document.getElementById('pinEkrani');
    if (girilen === mevcutVeri.pinKodu || !mevcutVeri.pinKodu) {
        document.getElementById('pinHata').style.display = 'none';
        kilidiAc();
    } else {
        document.getElementById('pinHata').style.display = 'block';
        pinKutu.classList.remove('pin-error-shake');
        void pinKutu.offsetWidth; // Reflow tetikle
        pinKutu.classList.add('pin-error-shake');
    }
}


// ---- Liste işlemleri ----

const REZERVE = YTF.REZERVE_LISTE_ADLARI; // ['beyaz liste', 'kara liste']

function ozelListeBul(ad) {
    return ayar.listeler.ozel.find(l => l.ad === ad) || null;
}

// Bir anahtarı (küçük harfli kanal @adı, kanal ID'si veya video ID'si) tüm listelerden çıkarır.
function listedenCikar(anahtar) {
    delete ayar.listeler.beyaz[anahtar];
    delete ayar.listeler.kara[anahtar];
    ayar.listeler.ozel.forEach(l => { delete l.uyeler[anahtar]; });
}

// hedef: 'beyaz' | 'kara' | 'ozel:<ad>'. Bir anahtar tek bir listede bulunur (eklenince eskisinden taşınır).
function listeyeEkle(anahtar, hedef) {
    let hedefNesne = null;
    if (hedef === 'beyaz') hedefNesne = ayar.listeler.beyaz;
    else if (hedef === 'kara') hedefNesne = ayar.listeler.kara;
    else if (hedef.startsWith('ozel:')) {
        const l = ozelListeBul(hedef.slice(5));
        if (l) hedefNesne = l.uyeler;
    }
    if (!hedefNesne) return false;
    listedenCikar(anahtar);
    hedefNesne[anahtar] = true;
    return true;
}

function hedefAdi(hedef) {
    if (hedef === 'beyaz') return 'Beyaz liste';
    if (hedef === 'kara') return 'Kara liste';
    return hedef.startsWith('ozel:') ? hedef.slice(5) : hedef;
}

function tumKayitlar() {
    const kayitlar = [];
    Object.keys(ayar.listeler.beyaz).forEach(id => kayitlar.push({ id, hedef: 'beyaz' }));
    Object.keys(ayar.listeler.kara).forEach(id => kayitlar.push({ id, hedef: 'kara' }));
    ayar.listeler.ozel.forEach(l => Object.keys(l.uyeler).forEach(id => kayitlar.push({ id, hedef: 'ozel:' + l.ad })));
    return kayitlar;
}

// Girilen metinden (link, @kanal, video ID) liste anahtarını çıkarır; küçük harfe çevirir.
function anahtarCikar(ham) {
    let bulunan = ham.trim();
    const video = ham.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/);
    const kanal = ham.match(/(@[a-zA-Z0-9._-]+)/);
    const kanalId = ham.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
    if (video && video[1]) bulunan = video[1];
    else if (kanalId && kanalId[1]) bulunan = kanalId[1];
    else if (kanal && kanal[1]) bulunan = kanal[1];
    return bulunan.toLowerCase();
}

async function icerikEkle() {
    const girdi = document.getElementById('yeniEtiketId');
    const ham = girdi.value.trim();
    if (!ham) return;
    const hedef = document.getElementById('yeniEtiketTuru').value;
    const anahtar = anahtarCikar(ham);
    if (anahtar.length > 100) { showToast('Geçersiz giriş'); return; }
    if (!listeyeEkle(anahtar, hedef)) { showToast('Hedef liste bulunamadı'); return; }
    await ayarKaydet();
    girdi.value = '';
    renderListeler();
    showToast(`${anahtar} → ${hedefAdi(hedef)}`);
}

async function ozelListeOlustur() {
    const girdi = document.getElementById('yeniListeAdi');
    const ad = girdi.value.trim().slice(0, 40);
    if (!ad) return;
    const kucuk = ad.toLocaleLowerCase('tr-TR'); // Türkçe I/ı, İ/i için
    if (REZERVE.includes(kucuk) || ayar.listeler.ozel.some(l => l.ad.toLocaleLowerCase('tr-TR') === kucuk)) {
        showToast('Bu adda bir liste zaten var');
        return;
    }
    ayar.listeler.ozel.push({ ad, eylem: document.getElementById('yeniListeEylemi').value === 'izinver' ? 'izinver' : 'engelle', uyeler: {} });
    await ayarKaydet();
    girdi.value = '';
    renderListeler();
    showToast(`"${ad}" listesi oluşturuldu`);
}

// ---- Render: Listeler sekmesi ----

function renderListeler() {
    if (aktifFiltre.startsWith('ozel:') && !ozelListeBul(aktifFiltre.slice(5))) aktifFiltre = 'all';
    renderHedefSecimi();
    renderFilterChips();
    renderItemList();
    renderOzelListeler();
}

function renderHedefSecimi() {
    const secim = document.getElementById('yeniEtiketTuru');
    const onceki = secim.value;
    secim.textContent = '';
    const secenekler = [['beyaz', 'Beyaz liste'], ['kara', 'Kara liste'], ...ayar.listeler.ozel.map(l => ['ozel:' + l.ad, l.ad])];
    secenekler.forEach(([deger, ad]) => {
        const o = el('option', '', ad);
        o.value = deger;
        secim.appendChild(o);
    });
    if (secenekler.some(([d]) => d === onceki)) secim.value = onceki;
}

function renderFilterChips() {
    const konteyner = document.getElementById('filterChipsContainer');
    if (!konteyner) return;
    konteyner.textContent = '';
    const cipler = [['all', 'Tümü'], ['beyaz', 'Beyaz liste'], ['kara', 'Kara liste'], ...ayar.listeler.ozel.map(l => ['ozel:' + l.ad, l.ad])];
    cipler.forEach(([deger, ad]) => {
        const b = el('button', 'chip' + (aktifFiltre === deger ? ' active' : ''), ad);
        b.setAttribute('data-filter', deger);
        b.addEventListener('click', () => {
            aktifFiltre = deger;
            renderFilterChips();
            renderItemList();
        });
        konteyner.appendChild(b);
    });
}

function renderItemList() {
    const kutu = document.getElementById('itemListContainer');
    const sayac = document.getElementById('lblToplamIcerik');
    if (!kutu) return;
    kutu.textContent = '';
    const hepsi = tumKayitlar();
    let gosterilen = 0;

    hepsi.forEach(({ id, hedef }) => {
        if (aktifFiltre !== 'all' && hedef !== aktifFiltre) return;
        const kanalKaydi = veriTabani.anahtarBul(id);
        const ad = kanalKaydi && kanalKaydi.ad;
        if (aramaMetni && !id.includes(aramaMetni) && !(ad && ad.toLowerCase().includes(aramaMetni))) return;
        gosterilen++;

        const kanalMi = id.startsWith('@') || id.startsWith('uc');
        const satir = el('div', 'item-row');
        const bilgi = el('div', 'item-info');
        const ikon = el('div', 'item-type-icon');
        ikon.title = kanalMi ? 'Kanal' : 'Video';
        ikon.innerHTML = kanalMi ? SVG_KANAL : SVG_VIDEO; // sabit SVG, kullanıcı verisi içermez
        const tanim = el('span', 'item-identifier', ad ? `${ad} (${id})` : id);
        tanim.title = ad ? `${ad} (${id})` : id;
        const rozet = el('span', 'item-tag-badge' + (hedef === 'beyaz' ? ' badge-beyaz' : hedef === 'kara' ? ' badge-kara' : ''), hedefAdi(hedef));
        bilgi.append(ikon, tanim, rozet);

        const sil = el('button', 'btn-delete-item');
        sil.title = 'Listeden Kaldır';
        sil.innerHTML = SVG_COP;
        sil.addEventListener('click', async () => {
            listedenCikar(id);
            await ayarKaydet();
            renderListeler();
            showToast(`${id} silindi`);
        });

        satir.append(bilgi, sil);
        kutu.appendChild(satir);
    });

    if (sayac) sayac.textContent = `${hepsi.length} İçerik`;
    if (gosterilen === 0) {
        const bos = el('div', 'empty-state');
        bos.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>';
        bos.appendChild(el('p', '', 'Eşleşen içerik bulunamadı.'));
        kutu.appendChild(bos);
    }
}

function renderOzelListeler() {
    const konteyner = document.getElementById('ozelListelerKonteyner');
    if (!konteyner) return;
    konteyner.textContent = '';
    if (ayar.listeler.ozel.length === 0) {
        konteyner.appendChild(el('div', 'card-desc', 'Henüz özel liste oluşturmadınız.'));
        return;
    }
    ayar.listeler.ozel.forEach(liste => {
        const kart = el('div', 'kural-card');
        const baslik = el('div', 'kural-card-header');
        baslik.appendChild(el('span', 'kural-card-name', liste.ad));
        const sil = el('button', 'btn-delete-item');
        sil.title = 'Listeyi Sil';
        sil.innerHTML = SVG_COP;
        sil.addEventListener('click', async () => {
            const uyeSayisi = Object.keys(liste.uyeler).length;
            if (!confirm(`"${liste.ad}" listesi${uyeSayisi ? ` ve içindeki ${uyeSayisi} içerik` : ''} silinecek. Emin misiniz?`)) return;
            ayar.listeler.ozel = ayar.listeler.ozel.filter(l => l !== liste);
            await ayarKaydet();
            renderListeler();
            showToast(`"${liste.ad}" silindi`);
        });
        baslik.appendChild(sil);

        const secenekler = el('div', 'kural-options');
        const alan1 = el('div', 'kural-field');
        alan1.appendChild(el('label', '', 'Eylem'));
        const secim = el('select');
        [['engelle', 'Engelle'], ['izinver', 'İzin ver']].forEach(([deger, ad]) => {
            const o = el('option', '', ad);
            o.value = deger;
            secim.appendChild(o);
        });
        secim.value = liste.eylem;
        secim.addEventListener('change', async () => {
            liste.eylem = secim.value === 'izinver' ? 'izinver' : 'engelle';
            await ayarKaydet();
            showToast('Liste eylemi güncellendi');
        });
        alan1.appendChild(secim);
        const alan2 = el('div', 'kural-field');
        alan2.appendChild(el('label', '', 'İçerik sayısı'));
        alan2.appendChild(el('div', 'kural-count', String(Object.keys(liste.uyeler).length)));
        secenekler.append(alan1, alan2);

        kart.append(baslik, secenekler);
        konteyner.appendChild(kart);
    });
}

// ---- Render: Filtre sekmesi ----

function renderFiltreSekmesi() {
    renderMod();
    renderEtiketlenmemis();
    renderKonular();
    renderEtiketler();
}

function renderMod() {
    const indeks = Math.max(0, MODLAR.indexOf(ayar.mod));
    document.getElementById('sliderMod').value = String(indeks);
    modAciklamasiniGuncelle(indeks);
    document.getElementById('chkKanalKontrol').checked = ayar.kanalKontrol !== false;
    document.querySelectorAll('input[name="kararsiz"]').forEach(r => { r.checked = (r.value === ayar.kararsiz); });
    kararsizAlaniniGuncelle(indeks);
}

// Kararsız seçeneği yalnızca Orta modda değiştirilebilir; diğer modlarda sabit davranış açıklanır.
function kararsizAlaniniGuncelle(indeks) {
    const mod = MODLAR[indeks] || 'orta';
    const alan = document.getElementById('kararsizAlani');
    alan.classList.toggle('pasif', mod !== 'orta');
    const ipucu = mod === 'orta' ? KARARSIZ_IPUCU.orta[ayar.kararsiz === 'engelle' ? 'engelle' : 'izinver'] : KARARSIZ_IPUCU[mod];
    document.getElementById('lblKararsizIpucu').textContent = ipucu;
}

function modAciklamasiniGuncelle(indeks) {
    const mod = MODLAR[indeks] || 'orta';
    document.getElementById('lblModAciklama').textContent = MOD_BILGI[mod];
    document.querySelectorAll('#modEtiketleri span').forEach(s => s.classList.toggle('active', s.getAttribute('data-mod') === mod));
    kararsizAlaniniGuncelle(indeks);
}

function renderEtiketlenmemis() {
    document.querySelectorAll('input[name="etiketlenmemis"]').forEach(r => { r.checked = (r.value === ayar.etiketlenmemis); });
    document.getElementById('lblEtiketlenmemisIpucu').textContent = ETIKETLENMEMIS_IPUCU[ayar.etiketlenmemis];
    document.getElementById('kartEtiketlenmemis').classList.toggle('ilk-secim', ayar.etiketlenmemis === null);
}

// Engelleme biçimi menüsü (Gizle / Bulanıklaştır / Uyarı sayfası). Değer: 'kaldir' | 'bulaniklastir' | 'uyari'.
function eylemMenusu(etiketAdi, deger, degisince, izinSecenegiVar) {
    const sec = el('select', 'eylem-sec');
    sec.setAttribute('aria-label', etiketAdi + ' engelleme biçimi');
    if (izinSecenegiVar) sec.appendChild(new Option('İzin ver', 'izinli'));
    EYLEM_SECENEKLERI.forEach(([v, ad]) => sec.appendChild(new Option(ad, v)));
    sec.value = deger;
    sec.addEventListener('change', () => degisince(sec.value));
    return sec;
}

const eylemAdi = (v) => (EYLEM_SECENEKLERI.find(x => x[0] === v) || [v, v])[1].toLowerCase();
const konuEngelliMi = (id) => !!ayar.konular[id] && ayar.konular[id] !== 'izinli';

function renderKonular() {
    const izgara = document.getElementById('konuGrid');
    izgara.textContent = '';
    YTF.KONULAR.forEach(konu => {
        const oge = el('div', 'konu-item');
        oge.title = konu.aciklama;
        oge.appendChild(el('span', 'konu-ad', konu.ad));
        const anahtar = el('label', 'switch');
        const kutu = el('input');
        kutu.type = 'checkbox';
        kutu.checked = !konuEngelliMi(konu.id);
        kutu.setAttribute('aria-label', konu.ad);
        kutu.addEventListener('change', async () => {
            ayar.konular[konu.id] = kutu.checked ? 'izinli' : ayar.engelEylemi;
            await ayarKaydet();
            renderKonular();
            showToast(`${konu.ad}: ${kutu.checked ? 'izinli' : 'engelli (' + eylemAdi(ayar.konular[konu.id]) + ')'}`);
        });
        anahtar.append(kutu, el('span', 'slider'));
        oge.appendChild(anahtar);
        if (konuEngelliMi(konu.id)) {
            oge.appendChild(eylemMenusu(konu.ad, ayar.konular[konu.id], async (v) => {
                ayar.konular[konu.id] = v;
                await ayarKaydet();
                showToast(`${konu.ad}: ${eylemAdi(v)}`);
            }, false));
        }
        izgara.appendChild(oge);
    });
}

function renderEtiketler() {
    const liste = document.getElementById('etiketListe');
    liste.textContent = '';
    YTF.ETIKETLER.forEach(etiket => {
        const oge = el('div', 'switch-item');
        const grup = el('div', 'switch-label-group');
        grup.append(el('span', 'switch-title', etiket.ad), el('span', 'switch-subtext', etiket.aciklama));
        const deger = ayar.etiketler[etiket.id] || 'kaldir';
        const menu = eylemMenusu(etiket.ad, deger, async (v) => {
            ayar.etiketler[etiket.id] = v;
            await ayarKaydet();
            showToast(`${etiket.ad}: ${v === 'izinli' ? 'izin veriliyor' : eylemAdi(v)}`);
        }, true);
        oge.append(grup, menu);
        liste.appendChild(oge);
    });
}

function tumKonulariAyarla(deger) {
    // 'engelli' -> genel engelleme biçimi (Görünüm sekmesi); her konu sonradan kendi biçimini seçebilir
    YTF.KONULAR.forEach(k => { ayar.konular[k.id] = deger === 'izinli' ? 'izinli' : ayar.engelEylemi; });
    renderKonular();
    return ayarKaydet().then(() => showToast(deger === 'izinli' ? 'Tüm konulara izin verildi' : 'Tüm konular engellendi'));
}

// Arayüzü Verilerle Doldur
function arayuzuDoldur() {
    document.getElementById('chkShorts').checked = mevcutVeri.ayarlar.shortsGizle || false;
    document.getElementById('chkYorum').checked = mevcutVeri.ayarlar.yorumGizle || false;
    document.getElementById('chkOnerilen').checked = mevcutVeri.ayarlar.onerilenGizle || false;
    document.getElementById('chkOtomatikOynatma').checked = mevcutVeri.ayarlar.otomatikOynatmaKapat || false;
    document.getElementById('chkPinIptal').checked = mevcutVeri.ayarlar.pinIptal || false;
    document.getElementById('chkRozetGoster').checked = ayar.rozetGoster !== false;
    document.getElementById('selEngelEylemi').value = YTF.ENGEL_EYLEMLERI.includes(ayar.engelEylemi) ? ayar.engelEylemi : 'kaldir';

    renderFiltreSekmesi();
    renderListeler();

    // İlk kurulumda "etiketlenmemiş içerik" seçimi yapılmadıysa kullanıcının dikkatini çek
    if (ayar.etiketlenmemis === null) {
        const kart = document.getElementById('kartEtiketlenmemis');
        if (kart && kart.scrollIntoView) kart.scrollIntoView({ block: 'nearest' });
    }
}

// ---- Olay dinleyicileri ----

function initEvents() {
    // Tema Değiştirme
    document.getElementById('btnTemaGecis').addEventListener('click', async () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        document.getElementById('lblTemaIkon').innerText = isDark ? '☀️' : '🌙';

        mevcutVeri.ayarlar.koyuTema = isDark;
        await setStorageData({ ayarlar: mevcutVeri.ayarlar });
    });

    // PIN Giriş Olayları
    document.getElementById('btnPinOnayla').addEventListener('click', pinDogrula);
    document.getElementById('pinGiris').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') pinDogrula();
    });

    // Yeniden Kilitleme Butonu
    document.getElementById('btnPinKilitle').addEventListener('click', kilitle);

    // Sekmeler (Tabs)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            const targetEl = document.getElementById(targetTab);
            if (targetEl) targetEl.classList.add('active');
        });
    });

    // Filtre modu kaydırıcısı: sürüklerken açıklama güncellenir, bırakınca kaydedilir
    const kaydirici = document.getElementById('sliderMod');
    kaydirici.addEventListener('input', () => modAciklamasiniGuncelle(Number(kaydirici.value)));
    kaydirici.addEventListener('change', async () => {
        ayar.mod = MODLAR[Number(kaydirici.value)] || 'orta';
        await ayarKaydet();
        showToast('Filtre modu güncellendi');
    });

    // Etiketlenmemiş içerik seçimi
    document.querySelectorAll('input[name="etiketlenmemis"]').forEach(r => {
        r.addEventListener('change', async () => {
            if (!r.checked) return;
            ayar.etiketlenmemis = r.value === 'ac' ? 'ac' : 'engelle';
            await ayarKaydet();
            renderEtiketlenmemis();
            showToast('Seçiminiz kaydedildi');
        });
    });

    // Kanal kontrol ayarı
    document.getElementById('chkKanalKontrol').addEventListener('change', async (e) => {
        ayar.kanalKontrol = e.target.checked;
        await ayarKaydet();
        showToast(ayar.kanalKontrol ? 'Kanalın konu ve etiketlerine de bakılacak' : 'Yalnızca videonun kendi kaydına bakılacak');
    });

    // Kararsızlar (Orta mod)
    document.querySelectorAll('input[name="kararsiz"]').forEach(r => {
        r.addEventListener('change', async () => {
            if (!r.checked) return;
            ayar.kararsiz = r.value === 'engelle' ? 'engelle' : 'izinver';
            await ayarKaydet();
            kararsizAlaniniGuncelle(Math.max(0, MODLAR.indexOf(ayar.mod)));
            showToast('Seçiminiz kaydedildi');
        });
    });

    // İlk kurulum PIN kartı
    document.getElementById('btnKurulumPinKaydet').addEventListener('click', async () => {
        const pin = document.getElementById('kurulumPin').value.trim();
        if (!/^\d{4}$/.test(pin)) {
            document.getElementById('kurulumPinHata').style.display = 'block';
            return;
        }
        mevcutVeri.pinKodu = pin;
        mevcutVeri.pinDegistirildi = true;
        mevcutVeri.ilkGirisYapildi = true;
        await setStorageData({ pinKodu: pin, pinDegistirildi: true, ilkGirisYapildi: true });
        document.getElementById('pinKurulumKarti').style.display = 'none';
        document.getElementById('btnPinKilitle').style.display = 'flex';
        showToast('PIN kaydedildi');
    });
    document.getElementById('btnKurulumPinAtla').addEventListener('click', async () => {
        mevcutVeri.pinKurulumAtlandi = true;
        await setStorageData({ pinKurulumAtlandi: true });
        document.getElementById('pinKurulumKarti').style.display = 'none';
    });

    document.getElementById('btnKonuHepsiIzin').addEventListener('click', () => tumKonulariAyarla('izinli'));
    document.getElementById('btnKonuHepsiEngel').addEventListener('click', () => tumKonulariAyarla('engelli'));

    // Canlı Arama
    document.getElementById('txtArama').addEventListener('input', (e) => {
        aramaMetni = e.target.value.toLowerCase().trim();
        renderItemList();
    });

    // Yeni İçerik Ekle
    document.getElementById('btnEtiketEkle').addEventListener('click', icerikEkle);
    document.getElementById('yeniEtiketId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') icerikEkle();
    });

    // Yeni Özel Liste Oluştur
    document.getElementById('btnListeEkle').addEventListener('click', ozelListeOlustur);
    document.getElementById('yeniListeAdi').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') ozelListeOlustur();
    });

    // Uyarı Banner'ından PIN Değiştirmeye Yönlendirme
    const btnUyari = document.getElementById('btnUyariPinDegistir');
    if (btnUyari) {
        btnUyari.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            const guvenlikBtn = document.querySelector('.tab-btn[data-tab="tabGuvenlik"]');
            const guvenlikTab = document.getElementById('tabGuvenlik');
            if (guvenlikBtn) guvenlikBtn.classList.add('active');
            if (guvenlikTab) guvenlikTab.classList.add('active');

            const yeniPinInput = document.getElementById('yeniPin');
            if (yeniPinInput) {
                yeniPinInput.focus();
            }
        });
    }

    // PIN Güncelle
    document.getElementById('btnPinGuncelle').addEventListener('click', async () => {
        const yeni = document.getElementById('yeniPin').value.trim();
        if (yeni.length < 4) {
            alert("PIN kodu en az 4 haneli olmalıdır.");
            return;
        }
        mevcutVeri.pinKodu = yeni;
        mevcutVeri.pinDegistirildi = true;
        mevcutVeri.ilkGirisYapildi = true;
        await setStorageData({
            pinKodu: yeni,
            pinDegistirildi: true,
            ilkGirisYapildi: true
        });
        document.getElementById('yeniPin').value = '';

        // Uyarı banner'ını ve ipucunu kapat
        const uyariBanner = document.getElementById('pinDegistirUyarisi');
        if (uyariBanner) uyariBanner.style.display = 'none';
        const pinIpucu = document.getElementById('pinVarsayilanIpucu');
        if (pinIpucu) pinIpucu.style.display = 'none';

        showToast("PIN kodu güncellendi");
    });

    // Tüm Değişiklikleri Kaydet
    document.getElementById('btnKaydet').addEventListener('click', kaydetTumAyarlar);

    // Dışa Aktarma
    document.getElementById('btnDisaAktar').addEventListener('click', async () => {
        const veri = await getStorageData(null);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(veri, null, 2));
        const indirmeLinki = document.createElement('a');
        indirmeLinki.setAttribute("href", dataStr);
        indirmeLinki.setAttribute("download", "yt_filter_yedek.json");
        document.body.appendChild(indirmeLinki);
        indirmeLinki.click();
        indirmeLinki.remove();
        showToast("Yedek dosyası indirildi");
    });

    // İçe Aktarma (yeni ve eski yedek biçimlerini kabul eder; üzerine yazar)
    document.getElementById('btnIceAktar').addEventListener('change', (e) => {
        const dosya = e.target.files[0];
        if (!dosya) return;
        const okuyucu = new FileReader();
        okuyucu.onload = async (olay) => {
            try {
                const yuklenen = JSON.parse(olay.target.result);
                let yeniAyar;
                if (yuklenen && yuklenen.surum >= 2 && yuklenen.ayar) {
                    yeniAyar = YTF.ayarTemizle(yuklenen.ayar);
                } else if (yuklenen && (yuklenen.customMapping || yuklenen.preferences)) {
                    yeniAyar = YTF.ayarTemizle(YTF.migrate(yuklenen).ayar);
                } else {
                    throw new Error('tanınmayan yedek');
                }
                if (!confirm('Mevcut filtre ayarlarınızın ve listelerinizin üzerine yazılacak. Devam edilsin mi?')) return;

                ayar = yeniAyar;
                await setStorageData({
                    surum: 2,
                    ayar,
                    ayarlar: yuklenen.ayarlar || mevcutVeri.ayarlar,
                    pinKodu: yuklenen.pinKodu || mevcutVeri.pinKodu,
                    pinDegistirildi: yuklenen.pinDegistirildi || mevcutVeri.pinDegistirildi,
                    ilkGirisYapildi: yuklenen.ilkGirisYapildi || mevcutVeri.ilkGirisYapildi
                });
                mevcutVeri = await getStorageData(null);
                if (!mevcutVeri.ayarlar) mevcutVeri.ayarlar = {};
                arayuzuDoldur();
                showToast("Yedek başarıyla yüklendi!");
            } catch (hata) {
                alert("Geçersiz JSON yedek dosyası!");
            }
        };
        okuyucu.readAsText(dosya);
    });

    // Otomatik Anlık Kaydedilen Tweak Switch'leri ve görünüm ayarları
    const anlikKaydedilenler = ['chkShorts', 'chkYorum', 'chkOnerilen', 'chkOtomatikOynatma', 'chkPinIptal', 'chkRozetGoster', 'selEngelEylemi'];
    anlikKaydedilenler.forEach(id => {
        document.getElementById(id).addEventListener('change', async () => {
            await kaydetTumAyarlar(false);
            showToast("Ayar güncellendi");
        });
    });
}

// Aktif YouTube Sekmesini Algılama (Quick Action)
async function algilaAktifYouTubeSekmesi() {
    try {
        const tabs = await new Promise(resolve => {
            if (browserAPI.tabs && browserAPI.tabs.query) {
                browserAPI.tabs.query({ active: true, currentWindow: true }, resolve);
            } else {
                resolve([]);
            }
        });

        if (!tabs || !tabs[0] || !tabs[0].url) return;
        const url = tabs[0].url;

        if (!url.includes("youtube.com")) return;

        let tespit = null;
        let tur = "Kanal";

        const channelMatch = url.match(/youtube\.com\/(@[a-zA-Z0-9._-]+)/);
        const videoMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);

        if (videoMatch && videoMatch[1]) {
            tespit = videoMatch[1];
            tur = "Video ID";
        } else if (channelMatch && channelMatch[1]) {
            tespit = channelMatch[1];
            tur = "Kanal";
        }

        if (tespit) {
            aktifYouTubeIcerigi = { tespit, tur };

            const titleEl = document.getElementById('quickTitle');
            const typeEl = document.getElementById('quickPageType');

            if (titleEl) titleEl.textContent = tespit;
            if (typeEl) typeEl.textContent = tur;

            // DİKKAT: Burada banner display yapılmaz!
            // Sadece PIN açıldıktan sonra kilidiAc() fonksiyonunda görünür olur.

            const hizliEkle = async (hedef) => {
                listeyeEkle(tespit.toLowerCase(), hedef);
                await ayarKaydet();
                renderListeler();
                showToast(`${tespit} → ${hedefAdi(hedef)}`);
            };
            document.getElementById('btnQuickBlock').onclick = () => hizliEkle('kara');
            document.getElementById('btnQuickAllow').onclick = () => hizliEkle('beyaz');
        }
    } catch (e) {
        // Tab sorgulama hatası durumunda sessizce geç
    }
}

// Tüm Ayarları Manuel Kaydet
async function kaydetTumAyarlar(bildirimVer = true) {
    mevcutVeri.ayarlar = {
        shortsGizle: document.getElementById('chkShorts').checked,
        yorumGizle: document.getElementById('chkYorum').checked,
        onerilenGizle: document.getElementById('chkOnerilen').checked,
        otomatikOynatmaKapat: document.getElementById('chkOtomatikOynatma').checked,
        pinIptal: document.getElementById('chkPinIptal').checked,
        koyuTema: document.body.classList.contains('dark-theme')
    };
    ayar.rozetGoster = document.getElementById('chkRozetGoster').checked;
    const secilenEylem = document.getElementById('selEngelEylemi').value;
    ayar.engelEylemi = YTF.ENGEL_EYLEMLERI.includes(secilenEylem) ? secilenEylem : 'kaldir';
    mevcutVeri.ayar = ayar;

    await setStorageData({
        surum: 2,
        ayar,
        ayarlar: mevcutVeri.ayarlar
    });

    if (bildirimVer) {
        showToast("Tüm ayarlar başarıyla kaydedildi!");
    }
}
