/**
 * YouTube Filtreleyici - Options Script
 * Hem Chromium hem de Firefox ile %100 uyumlu, modern arayüz yöneticisi.
 */

const browserAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

let mevcutVeri = {};
let aktifFiltre = 'all';
let aramaMetni = '';
let aktifYouTubeIcerigi = null;

const LISTE_ADLARI = { beyaz: "Beyaz liste", kara: "Kara liste" };
const LISTE_ANAHTARLARI = { beyaz: "beyazListe", kara: "karaListe" };

const MOD_ACIKLAMALARI = {
    serbest: "Konulardan herhangi biri izinliyse video açılır. Kararsız içerikler lehinize yorumlanır, konusu bilinmeyen videolar açılır.",
    orta: "Videonun ana konusu izinliyse video açılır. Bilinmeyen ve kararsız içerikler için aşağıdaki seçimler kullanılır.",
    kati: "Konulardan ya da etiketlerden herhangi biri engelliyse video engellenir. Konusu veya etiketi bilinmeyen videolar da engellenir."
};
const MOD_IBRE_ACILARI = { serbest: -60, orta: 0, kati: 60 };
const BICIM_ADLARI = { gizle: "Gizle", uyari: "Uyarı sayfası", bulaniklastir: "Bulanıklaştır" };
const ORTA_SECENEKLERI = [
    ["bilinmeyenKonu", "Bilinmeyen konular"],
    ["bilinmeyenEtiket", "Bilinmeyen etiketler"],
    ["kararsizKonu", "Kararsız konular"],
    ["kararsizEtiket", "Kararsız etiketler"]
];

// Storage Yardımcıları
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

// Toast Bildirimi
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

// Başlangıç Yüklemesi
document.addEventListener('DOMContentLoaded', async () => {
    const veri = await getStorageData(null);
    mevcutVeri = veri || {};
    if (!mevcutVeri.ayarlar) mevcutVeri.ayarlar = {};
    if (!mevcutVeri.beyazListe) mevcutVeri.beyazListe = [];
    if (!mevcutVeri.karaListe) mevcutVeri.karaListe = [];
    if (!mevcutVeri.filtre) {
        mevcutVeri.filtre = YTFiltreMotoru.varsayilanFiltreAyarlari(mevcutVeri.veritabani);
    } else {
        YTFiltreMotoru.eksikBasliklariTamamla(mevcutVeri.filtre, mevcutVeri.veritabani);
    }

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

    // Kurulumdan sonra tam sayfa sekmede açıldıysa düzeni ortala
    if (new URLSearchParams(location.search).get('karsilama') === '1') {
        document.documentElement.classList.add('tam-sayfa');
    }

    // İlk kurulum tamamlanmadıysa karşılama ekranı, değilse PIN kontrolü
    if (mevcutVeri.karsilamaTamamlandi === false) {
        karsilamayiBaslat();
    } else if (mevcutVeri.ayarlar.pinIptal || !mevcutVeri.pinKodu) {
        kilidiAc();
    } else {
        kilitle();
    }

    // Olay Dinleyicilerini Kur
    initEvents();
});

// Arayüz Kilidini Aç
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

    // PIN hala 1234 ise uyarı banner'ını göster
    const uyariBanner = document.getElementById('pinDegistirUyarisi');
    if (uyariBanner) {
        if (mevcutVeri.pinKodu === "1234" && !mevcutVeri.pinDegistirildi && !mevcutVeri.ayarlar.pinIptal) {
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

// Karşılama Ekranı (İlk Kurulum)
function karsilamayiBaslat() {
    document.getElementById('pinEkrani').style.display = 'none';
    document.getElementById('anaArayuz').style.display = 'none';
    document.getElementById('karsilamaEkrani').style.display = 'flex';

    renderOrtaSecenekleri('karsilamaOrtaSecenekleri');
    karsilamaAdiminaGit(1);

    document.querySelectorAll('[data-karsilama-ileri]').forEach(btn => {
        btn.addEventListener('click', () => {
            const adim = Number(btn.closest('.karsilama-adim').dataset.adim);
            karsilamaAdiminaGit(adim + 1);
        });
    });

    const pinKaydet = async () => {
        const pin = document.getElementById('karsilamaPin').value.trim();
        const tekrar = document.getElementById('karsilamaPinTekrar').value.trim();
        const hata = document.getElementById('karsilamaPinHata');
        if (pin.length < 4) {
            hata.textContent = "PIN en az 4 haneli olmalıdır.";
            return;
        }
        if (pin !== tekrar) {
            hata.textContent = "PIN'ler eşleşmiyor.";
            return;
        }
        hata.textContent = "";
        mevcutVeri.pinKodu = pin;
        mevcutVeri.pinDegistirildi = true;
        mevcutVeri.ilkGirisYapildi = true;
        mevcutVeri.ayarlar.pinIptal = false;
        await setStorageData({ pinKodu: pin, pinDegistirildi: true, ilkGirisYapildi: true, ayarlar: mevcutVeri.ayarlar });
        karsilamaAdiminaGit(3);
    };
    document.getElementById('btnKarsilamaPin').addEventListener('click', pinKaydet);
    document.getElementById('karsilamaPinTekrar').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') pinKaydet();
    });

    document.getElementById('btnKarsilamaPinAtla').addEventListener('click', async () => {
        mevcutVeri.ayarlar.pinIptal = true;
        mevcutVeri.ilkGirisYapildi = true;
        await setStorageData({ ayarlar: mevcutVeri.ayarlar, ilkGirisYapildi: true });
        karsilamaAdiminaGit(3);
    });

    document.getElementById('btnKarsilamaBitir').addEventListener('click', async () => {
        mevcutVeri.karsilamaTamamlandi = true;
        await setStorageData({ karsilamaTamamlandi: true, filtre: mevcutVeri.filtre });
        document.getElementById('karsilamaEkrani').style.display = 'none';
        kilidiAc();
        showToast("Kurulum tamamlandı");
    });
}

function karsilamaAdiminaGit(adim) {
    document.querySelectorAll('.karsilama-adim').forEach(bolum => {
        bolum.classList.toggle('active', Number(bolum.dataset.adim) === adim);
    });
    document.querySelectorAll('.karsilama-noktalar span').forEach(nokta => {
        nokta.classList.toggle('active', Number(nokta.dataset.adim) === adim);
    });
    if (adim === 2) setTimeout(() => document.getElementById('karsilamaPin').focus(), 50);
}

// Arayüzü Kilitle
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

// PIN Onayı
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

// Olay Dinleyicileri
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

    // Filtre Sekmesi
    initFiltreEvents();

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

    // Liste Filtre Çipleri
    document.querySelectorAll('#filterChipsContainer .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            aktifFiltre = chip.dataset.filter;
            renderFilterChips();
            renderItemList();
        });
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

    // İçe Aktarma
    document.getElementById('btnIceAktar').addEventListener('change', (e) => {
        const dosya = e.target.files[0];
        if (!dosya) return;
        const okuyucu = new FileReader();
        okuyucu.onload = async (olay) => {
            try {
                const yuklenen = JSON.parse(olay.target.result);
                let beyazListe = yuklenen.beyazListe || mevcutVeri.beyazListe;
                let karaListe = yuklenen.karaListe || mevcutVeri.karaListe;
                const filtre = yuklenen.filtre
                    ? YTFiltreMotoru.eksikBasliklariTamamla(yuklenen.filtre, mevcutVeri.veritabani)
                    : mevcutVeri.filtre;

                // v1 yedekleri (kategori eşlemeleri) beyaz/kara listeye taşınır
                if (yuklenen.customMapping) {
                    const tasinan = YTFiltreMotoru.eskiVeriyiTasi(yuklenen.customMapping, yuklenen.preferences, filtre);
                    beyazListe = [...new Set([...beyazListe, ...tasinan.beyaz])];
                    karaListe = [...new Set([...karaListe, ...tasinan.kara])];
                }

                await setStorageData({
                    filtre,
                    beyazListe,
                    karaListe,
                    ayarlar: yuklenen.ayarlar || mevcutVeri.ayarlar,
                    pinKodu: yuklenen.pinKodu || mevcutVeri.pinKodu,
                    pinDegistirildi: yuklenen.pinDegistirildi || mevcutVeri.pinDegistirildi,
                    ilkGirisYapildi: yuklenen.ilkGirisYapildi || mevcutVeri.ilkGirisYapildi
                });
                mevcutVeri = await getStorageData(null);
                arayuzuDoldur();
                showToast("Yedek başarıyla yüklendi!");
            } catch (hata) { 
                alert("Geçersiz JSON yedek dosyası!"); 
            }
        };
        okuyucu.readAsText(dosya);
    });

    // Otomatik Anlık Kaydedilen Tweak Switch'leri
    const tweakCheckboxes = ['chkShorts', 'chkYorum', 'chkOnerilen', 'chkOtomatikOynatma', 'chkPinIptal'];
    tweakCheckboxes.forEach(id => {
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

            document.getElementById('btnQuickBlock').onclick = () => listeyeEkle(tespit, 'kara');
            document.getElementById('btnQuickAllow').onclick = () => listeyeEkle(tespit, 'beyaz');
        }
    } catch (e) {
        // Tab sorgulama hatası durumunda sessizce geç
    }
}

// Arayüzü Verilerle Doldur
function arayuzuDoldur() {
    document.getElementById('chkShorts').checked = mevcutVeri.ayarlar.shortsGizle || false;
    document.getElementById('chkYorum').checked = mevcutVeri.ayarlar.yorumGizle || false;
    document.getElementById('chkOnerilen').checked = mevcutVeri.ayarlar.onerilenGizle || false;
    document.getElementById('chkOtomatikOynatma').checked = mevcutVeri.ayarlar.otomatikOynatmaKapat || false;
    document.getElementById('chkPinIptal').checked = mevcutVeri.ayarlar.pinIptal || false;

    renderFiltre();
    renderFilterChips();
    renderItemList();
}

// Filtre Ayarlarını Kaydet
async function filtreyiKaydet(mesaj) {
    await setStorageData({ filtre: mevcutVeri.filtre });
    if (mesaj) showToast(mesaj);
}

function bicimSeciciOlustur(seciliBicim) {
    const select = document.createElement('select');
    select.className = 'bicim-secici';
    for (const bicim in BICIM_ADLARI) {
        const opt = document.createElement('option');
        opt.value = bicim;
        opt.textContent = BICIM_ADLARI[bicim];
        opt.selected = bicim === seciliBicim;
        select.appendChild(opt);
    }
    return select;
}

// İki seçenekli (İzin ver / Engelle) segment düğmesi
function izinEngelSecimiOlustur(deger, degisince) {
    const segment = document.createElement('div');
    segment.className = 'segment segment-kucuk';
    [["izin", "İzin ver"], ["engel", "Engelle"]].forEach(([anahtar, etiket]) => {
        const btn = document.createElement('button');
        btn.className = `segment-btn ${deger === anahtar ? 'active' : ''}`;
        btn.dataset.deger = anahtar;
        btn.textContent = etiket;
        btn.addEventListener('click', () => degisince(anahtar));
        segment.appendChild(btn);
    });
    return segment;
}

// Filtre Sekmesini Render Et
function renderFiltre() {
    const filtre = mevcutVeri.filtre;

    document.body.dataset.mod = filtre.mod;
    document.getElementById('modIbre').style.transform = `rotate(${MOD_IBRE_ACILARI[filtre.mod]}deg)`;
    document.querySelectorAll('#modSecici .segment-btn').forEach(btn => {
        const aktif = btn.dataset.mod === filtre.mod;
        btn.classList.toggle('active', aktif);
        btn.setAttribute('aria-checked', aktif);
    });
    document.getElementById('lblModAciklama').textContent = MOD_ACIKLAMALARI[filtre.mod];

    // Bilinmeyen/kararsız seçimleri yalnızca orta modda kullanılır
    document.getElementById('kartOrtaMod').style.display = filtre.mod === 'orta' ? 'block' : 'none';
    renderOrtaSecenekleri();

    renderBasliklar('konular', 'konuListesi');
    renderBasliklar('etiketler', 'etiketListesi');

    document.getElementById('chkKanalKontrol').checked = filtre.kanalKontrol !== false;
    document.getElementById('chkRozetGoster').checked = filtre.rozetGoster !== false;

    const varsayilanSecici = document.getElementById('selVarsayilanBicim');
    varsayilanSecici.innerHTML = '';
    bicimSeciciOlustur(filtre.varsayilanBicim).querySelectorAll('option').forEach(opt => varsayilanSecici.appendChild(opt));
}

function renderOrtaSecenekleri(kapsayiciId = 'ortaModSecenekleri') {
    const kapsayici = document.getElementById(kapsayiciId);
    if (!kapsayici) return;
    kapsayici.innerHTML = '';

    ORTA_SECENEKLERI.forEach(([anahtar, etiket]) => {
        const satir = document.createElement('div');
        satir.className = 'orta-satir';
        const ad = document.createElement('span');
        ad.className = 'switch-title';
        ad.textContent = etiket;
        satir.appendChild(ad);
        satir.appendChild(izinEngelSecimiOlustur(mevcutVeri.filtre.orta[anahtar], async (deger) => {
            mevcutVeri.filtre.orta[anahtar] = deger;
            renderOrtaSecenekleri(kapsayiciId);
            await filtreyiKaydet(`${etiket}: ${deger === 'izin' ? 'izin veriliyor' : 'engelleniyor'}`);
        }));
        kapsayici.appendChild(satir);
    });
}

// Konu veya etiket satırlarını render eder (tur: 'konular' | 'etiketler')
function renderBasliklar(tur, kapsayiciId) {
    const kapsayici = document.getElementById(kapsayiciId);
    if (!kapsayici) return;
    kapsayici.innerHTML = '';

    const tercihler = mevcutVeri.filtre[tur];
    const tanimlar = (mevcutVeri.veritabani && mevcutVeri.veritabani[tur]) || Object.keys(tercihler).map(id => ({ id, ad: id }));

    tanimlar.forEach(({ id, ad }) => {
        const tercih = tercihler[id];
        if (!tercih) return;

        const satir = document.createElement('div');
        satir.className = 'baslik-satir';

        const adEl = document.createElement('span');
        adEl.className = 'baslik-adi';
        adEl.textContent = ad;
        adEl.title = ad;

        const bicimSecici = bicimSeciciOlustur(tercih.bicim);
        bicimSecici.disabled = !tercih.filtrele;
        bicimSecici.title = 'Engelleme biçimi';
        bicimSecici.addEventListener('change', async () => {
            tercih.bicim = bicimSecici.value;
            await filtreyiKaydet(`${ad}: ${BICIM_ADLARI[tercih.bicim]}`);
        });

        const anahtar = document.createElement('label');
        anahtar.className = 'switch';
        anahtar.title = 'Filtrele';
        const kutu = document.createElement('input');
        kutu.type = 'checkbox';
        kutu.checked = !!tercih.filtrele;
        kutu.setAttribute('aria-label', `${ad} filtrelensin`);
        const kaydirici = document.createElement('span');
        kaydirici.className = 'slider';
        anahtar.append(kutu, kaydirici);
        kutu.addEventListener('change', async () => {
            tercih.filtrele = kutu.checked;
            bicimSecici.disabled = !kutu.checked;
            await filtreyiKaydet(`${ad} ${kutu.checked ? 'filtreleniyor' : 'filtrelenmiyor'}`);
        });

        satir.append(adEl, bicimSecici, anahtar);
        kapsayici.appendChild(satir);
    });
}

function initFiltreEvents() {
    document.querySelectorAll('#modSecici .segment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            mevcutVeri.filtre.mod = btn.dataset.mod;
            renderFiltre();
            await filtreyiKaydet(`${btn.textContent} mod seçildi`);
        });
    });

    document.getElementById('chkKanalKontrol').addEventListener('change', async (e) => {
        mevcutVeri.filtre.kanalKontrol = e.target.checked;
        await filtreyiKaydet("Kanal kontrolü güncellendi");
    });

    document.getElementById('chkRozetGoster').addEventListener('change', async (e) => {
        mevcutVeri.filtre.rozetGoster = e.target.checked;
        await filtreyiKaydet("Rozet ayarı güncellendi");
    });

    document.getElementById('selVarsayilanBicim').addEventListener('change', async (e) => {
        mevcutVeri.filtre.varsayilanBicim = e.target.value;
        await filtreyiKaydet("Varsayılan biçim güncellendi");
    });
}

// Liste Filtre Çipleri
function renderFilterChips() {
    document.querySelectorAll('#filterChipsContainer .chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.filter === aktifFiltre);
    });
}

const IKON_KANAL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
const IKON_VIDEO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
const IKON_SIL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';

// Beyaz ve Kara Liste İçeriklerini Render Et
function renderItemList() {
    const listContainer = document.getElementById('itemListContainer');
    const countLabel = document.getElementById('lblToplamIcerik');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const tumKayitlar = [
        ...mevcutVeri.beyazListe.map(id => ({ id, liste: 'beyaz' })),
        ...mevcutVeri.karaListe.map(id => ({ id, liste: 'kara' }))
    ];
    let gosterilenSayac = 0;

    tumKayitlar.forEach(({ id, liste }) => {
        if (aktifFiltre !== 'all' && liste !== aktifFiltre) return;
        if (aramaMetni && !id.includes(aramaMetni)) return;

        gosterilenSayac++;
        const isChannel = id.startsWith('@');

        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div class="item-info">
                <div class="item-type-icon" title="${isChannel ? 'Kanal' : 'Video'}">${isChannel ? IKON_KANAL : IKON_VIDEO}</div>
                <span class="item-identifier"></span>
                <span class="item-tag-badge item-liste-${liste}">${LISTE_ADLARI[liste]}</span>
            </div>
            <button class="btn-delete-item" title="Listeden Kaldır">${IKON_SIL}</button>
        `;
        const kimlik = row.querySelector('.item-identifier');
        kimlik.textContent = id;
        kimlik.title = id;

        row.querySelector('.btn-delete-item').addEventListener('click', async () => {
            const anahtar = LISTE_ANAHTARLARI[liste];
            mevcutVeri[anahtar] = mevcutVeri[anahtar].filter(x => x !== id);
            await setStorageData({ [anahtar]: mevcutVeri[anahtar] });
            renderItemList();
            showToast(`${id} ${LISTE_ADLARI[liste].toLocaleLowerCase('tr-TR')}den kaldırıldı`);
        });

        listContainer.appendChild(row);
    });

    if (countLabel) {
        countLabel.textContent = `${tumKayitlar.length} İçerik`;
    }

    if (gosterilenSayac === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <p>Eşleşen içerik bulunamadı.</p>
            </div>
        `;
    }
}

// ID'yi bir listeye ekler; diğer listede varsa oradan çıkarır
async function listeyeEkle(id, liste) {
    const hedef = LISTE_ANAHTARLARI[liste];
    const diger = LISTE_ANAHTARLARI[liste === 'beyaz' ? 'kara' : 'beyaz'];
    const temizId = id.toLowerCase();

    mevcutVeri[diger] = mevcutVeri[diger].filter(x => x !== temizId);
    if (!mevcutVeri[hedef].includes(temizId)) mevcutVeri[hedef].push(temizId);
    await setStorageData({ [hedef]: mevcutVeri[hedef], [diger]: mevcutVeri[diger] });

    renderItemList();
    showToast(`${temizId} ${LISTE_ADLARI[liste].toLocaleLowerCase('tr-TR')}ye eklendi`);
}

// İçerik Ekleme Fonksiyonu
async function icerikEkle() {
    let rawInput = document.getElementById('yeniEtiketId').value.trim();
    const liste = document.getElementById('yeniEtiketTuru').value;

    if (rawInput !== "") {
        let finalId = rawInput;
        const videoMatch = rawInput.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/);
        const channelMatch = rawInput.match(/(@[a-zA-Z0-9._-]+)/);

        if (videoMatch && videoMatch[1]) {
            finalId = videoMatch[1];
        } else if (channelMatch && channelMatch[1]) {
            finalId = channelMatch[1];
        }

        await listeyeEkle(finalId, liste);
        document.getElementById('yeniEtiketId').value = '';
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

    await setStorageData({
        beyazListe: mevcutVeri.beyazListe,
        karaListe: mevcutVeri.karaListe,
        ayarlar: mevcutVeri.ayarlar,
        filtre: mevcutVeri.filtre
    });

    if (bildirimVer) {
        showToast("Tüm ayarlar başarıyla kaydedildi!");
    }
}
