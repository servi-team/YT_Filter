/**
 * YouTube Filter Store - Ön yüz çekirdeği
 * API istemcisi, DOM yardımcısı, sayfa yönlendirici ve bildirimler.
 * Her sayfa public/sayfalar/ altında kendini sayfaKaydet() ile kaydeder.
 */

const Uygulama = {
    kullanici: null,
    sayfalar: [],
    varsayilanYol: '#/durum'
};

// Güvenli DOM oluşturucu: metinler her zaman textContent olarak eklenir
function el(etiket, ozellikler = {}, ...cocuklar) {
    const eleman = document.createElement(etiket);
    for (const [ad, deger] of Object.entries(ozellikler || {})) {
        if (deger === false || deger === null || deger === undefined) continue;
        if (ad === 'class') eleman.className = deger;
        else if (ad === 'dataset') Object.assign(eleman.dataset, deger);
        else if (ad.startsWith('on') && typeof deger === 'function') eleman.addEventListener(ad.slice(2), deger);
        else if (ad in eleman && typeof deger !== 'string') eleman[ad] = deger;
        else eleman.setAttribute(ad, deger === true ? '' : deger);
    }
    cocuklar.flat(Infinity).forEach(cocuk => {
        if (cocuk === null || cocuk === undefined || cocuk === false) return;
        eleman.append(cocuk instanceof Node ? cocuk : document.createTextNode(String(cocuk)));
    });
    return eleman;
}

class ApiHatasi extends Error {
    constructor(durum, mesaj, veri) {
        super(mesaj);
        this.durum = durum;
        this.veri = veri;
    }
}

async function api(yol, { yontem = 'GET', govde, sessiz401 = false } = {}) {
    const yanit = await fetch('/api' + yol, {
        method: yontem,
        headers: govde !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: govde !== undefined ? JSON.stringify(govde) : undefined,
        credentials: 'same-origin'
    });
    const veri = (yanit.headers.get('content-type') || '').includes('application/json') ? await yanit.json() : null;

    if (yanit.status === 401 && !sessiz401) {
        Uygulama.kullanici = null;
        ustBilgiyiCiz();
        location.hash = '#/giris';
    }
    if (!yanit.ok) throw new ApiHatasi(yanit.status, (veri && veri.hata) || 'İstek başarısız oldu', veri);
    return veri;
}

let bildirimZamanlayici = null;
function bildirim(mesaj, tur = 'basari') {
    const kutu = document.getElementById('bildirim');
    kutu.textContent = mesaj;
    kutu.className = `bildirim goster bildirim-${tur}`;
    clearTimeout(bildirimZamanlayici);
    bildirimZamanlayici = setTimeout(() => { kutu.className = 'bildirim'; }, 2800);
}

/**
 * @param {{desen: RegExp, ciz: Function, baslik?: string, menu?: string, menuYolu?: string, admin?: boolean, herkese?: boolean}} tanim
 */
function sayfaKaydet(tanim) {
    Uygulama.sayfalar.push(tanim);
}

function menuyuCiz(aktifTanim) {
    const menu = document.getElementById('menu');
    menu.replaceChildren();
    if (!Uygulama.kullanici) return;
    Uygulama.sayfalar
        .filter(t => t.menu && (!t.admin || Uygulama.kullanici.rol === 'admin'))
        .forEach(t => {
            menu.append(el('a', { href: t.menuYolu, class: t === aktifTanim ? 'aktif' : '' }, t.menu));
        });
}

function ustBilgiyiCiz() {
    const alan = document.getElementById('kullaniciAlani');
    alan.replaceChildren();
    const k = Uygulama.kullanici;
    if (!k) return;
    alan.append(
        el('a', { class: 'kullanici-adi', href: '#/hesap', title: 'Hesabım' }, k.ad || k.kullaniciAdi),
        el('span', { class: `rozet ${k.rol === 'admin' ? 'rozet-admin' : ''}` }, k.rol === 'admin' ? 'Yönetici' : 'Editör'),
        el('button', {
            class: 'dugme dugme-ikincil dugme-kucuk',
            onclick: async () => {
                await api('/oturum/cikis', { yontem: 'POST', govde: {} }).catch(() => {});
                Uygulama.kullanici = null;
                ustBilgiyiCiz();
                location.hash = '#/giris';
            }
        }, 'Çıkış')
    );
}

function bosDurum(mesaj) {
    return el('div', { class: 'bos-durum' }, mesaj);
}

async function yonlendir() {
    const hash = (!location.hash || location.hash === '#/') ? Uygulama.varsayilanYol : location.hash;
    const kok = document.getElementById('sayfa');

    let eslesme = null;
    const tanim = Uygulama.sayfalar.find(t => (eslesme = hash.match(t.desen)));

    if (tanim && !tanim.herkese && !Uygulama.kullanici) {
        location.hash = '#/giris';
        return;
    }

    menuyuCiz(tanim);
    kok.replaceChildren();
    document.title = tanim && tanim.baslik ? `${tanim.baslik} · YouTube Filter Store` : 'YouTube Filter Store';

    if (!tanim) {
        kok.append(bosDurum('Sayfa bulunamadı.'));
        return;
    }
    if (tanim.admin && Uygulama.kullanici.rol !== 'admin') {
        kok.append(bosDurum('Bu sayfa yalnızca yöneticilere açıktır.'));
        return;
    }

    try {
        await tanim.ciz(kok, eslesme);
    } catch (hata) {
        if (hata.durum === 401) return;
        kok.replaceChildren(bosDurum(hata.message || 'Sayfa yüklenemedi.'));
    }
}

async function oturumuYukle() {
    try {
        Uygulama.kullanici = await api('/oturum/ben', { sessiz401: true });
    } catch (hata) {
        Uygulama.kullanici = null;
    }
    ustBilgiyiCiz();
}

window.addEventListener('hashchange', yonlendir);
document.addEventListener('DOMContentLoaded', async () => {
    await oturumuYukle();
    yonlendir();
});
