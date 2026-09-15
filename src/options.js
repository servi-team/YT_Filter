/**
 * YouTube Filtreleyici - Options Script
 * Hem Chromium hem de Firefox ile %100 uyumlu, modern arayüz yöneticisi.
 */

const browserAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

let mevcutVeri = {};
let aktifFiltre = 'all';
let aramaMetni = '';
let aktifYouTubeIcerigi = null;

const coreTags = ["profanity", "violence", "educational", "safe", "untagged"];
const tagLabels = { 
    "profanity": "Küfür/Argo", 
    "violence": "Şiddet", 
    "educational": "Eğitici", 
    "safe": "Güvenli", 
    "untagged": "Etiketlenmemiş" 
};

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
    if (!mevcutVeri.customMapping) mevcutVeri.customMapping = {};
    if (!mevcutVeri.preferences) mevcutVeri.preferences = {};
    if (!mevcutVeri.ayarlar) mevcutVeri.ayarlar = {};
    
    // Varsayılan Etiketleri Tanımla
    coreTags.forEach(tag => {
        if (!mevcutVeri.preferences[tag]) {
            mevcutVeri.preferences[tag] = { visibility: "Show Badge", enforcement: "Allow Video", adi: tagLabels[tag] };
        }
    });
    
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

    // Yeni Kategori Oluştur
    document.getElementById('btnKuralEkle').addEventListener('click', () => {
        const orjinalYazim = document.getElementById('yeniKuralAdi').value.trim();
        const etiketAnahtari = orjinalYazim.toLowerCase();
        
        if (orjinalYazim && !mevcutVeri.preferences[etiketAnahtari]) {
            mevcutVeri.preferences[etiketAnahtari] = { 
                visibility: "Show Badge", 
                enforcement: "Allow Video", 
                adi: orjinalYazim 
            };
            document.getElementById('yeniKuralAdi').value = '';
            renderKurallar();
            renderFilterChips();
            showToast(`"${orjinalYazim}" kategorisi oluşturuldu`);
        }
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
                await setStorageData({
                    customMapping: yuklenen.customMapping || mevcutVeri.customMapping,
                    ayarlar: yuklenen.ayarlar || mevcutVeri.ayarlar,
                    preferences: yuklenen.preferences || mevcutVeri.preferences,
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

            document.getElementById('btnQuickBlock').onclick = () => {
                mevcutVeri.customMapping[tespit.toLowerCase()] = "violence"; // Varsayılan engelleme
                setStorageData({ customMapping: mevcutVeri.customMapping });
                renderItemList();
                showToast(`${tespit} engellenenlere eklendi`);
            };

            document.getElementById('btnQuickAllow').onclick = () => {
                mevcutVeri.customMapping[tespit.toLowerCase()] = "safe"; // Varsayılan izin
                setStorageData({ customMapping: mevcutVeri.customMapping });
                renderItemList();
                showToast(`${tespit} güvenli listeye eklendi`);
            };
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

    renderFilterChips();
    renderItemList();
    renderKurallar();
}

// Kategori Filtre Çipleri
function renderFilterChips() {
    const container = document.getElementById('filterChipsContainer');
    if (!container) return;

    container.innerHTML = `
        <button class="chip ${aktifFiltre === 'all' ? 'active' : ''}" data-filter="all">Tümü</button>
    `;

    for (let tag in mevcutVeri.preferences) {
        const pref = mevcutVeri.preferences[tag];
        const isCore = coreTags.includes(tag);
        const displayName = isCore ? tagLabels[tag] : (pref.adi || tag);
        
        const btn = document.createElement('button');
        btn.className = `chip ${aktifFiltre === tag ? 'active' : ''}`;
        btn.setAttribute('data-filter', tag);
        btn.textContent = displayName;
        
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            aktifFiltre = tag;
            renderItemList();
        });
        
        container.appendChild(btn);
    }

    // "Tümü" çipi tıklaması
    container.querySelector('[data-filter="all"]').addEventListener('click', (e) => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        aktifFiltre = 'all';
        renderItemList();
    });
}

// Tanımlı İçerik Listesini Render Et
function renderItemList() {
    const listContainer = document.getElementById('itemListContainer');
    const countLabel = document.getElementById('lblToplamIcerik');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const tumIdler = Object.keys(mevcutVeri.customMapping || {});
    let gosterilenSayac = 0;

    tumIdler.forEach(id => {
        const tag = mevcutVeri.customMapping[id];
        
        // Kategori filtresi kontrolü
        if (aktifFiltre !== 'all' && tag !== aktifFiltre) return;

        // Arama filtresi kontrolü
        if (aramaMetni && !id.toLowerCase().includes(aramaMetni)) return;

        gosterilenSayac++;
        const pref = mevcutVeri.preferences[tag] || {};
        const isCore = coreTags.includes(tag);
        const tagLabel = isCore ? tagLabels[tag] : (pref.adi || tag);
        const isChannel = id.startsWith('@');

        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div class="item-info">
                <div class="item-type-icon" title="${isChannel ? 'Kanal' : 'Video'}">
                    ${isChannel ? `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    ` : `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    `}
                </div>
                <span class="item-identifier" title="${id}">${id}</span>
                <span class="item-tag-badge">${tagLabel}</span>
            </div>
            <button class="btn-delete-item" data-id="${id}" title="Listeden Kaldır">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;

        row.querySelector('.btn-delete-item').addEventListener('click', async () => {
            delete mevcutVeri.customMapping[id];
            await setStorageData({ customMapping: mevcutVeri.customMapping });
            renderItemList();
            showToast(`${id} silindi`);
        });

        listContainer.appendChild(row);
    });

    if (countLabel) {
        countLabel.textContent = `${tumIdler.length} İçerik`;
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

// İçerik Ekleme Fonksiyonu
async function icerikEkle() {
    let rawInput = document.getElementById('yeniEtiketId').value.trim();
    const tag = document.getElementById('yeniEtiketTuru').value;
    
    if (rawInput !== "") {
        let finalId = rawInput;
        const videoMatch = rawInput.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/);
        const channelMatch = rawInput.match(/(@[a-zA-Z0-9._-]+)/);
        
        if (videoMatch && videoMatch[1]) {
            finalId = videoMatch[1];
        } else if (channelMatch && channelMatch[1]) {
            finalId = channelMatch[1];
        }
        
        finalId = finalId.toLowerCase();
        mevcutVeri.customMapping[finalId] = tag;
        await setStorageData({ customMapping: mevcutVeri.customMapping });
        
        document.getElementById('yeniEtiketId').value = '';
        renderItemList();
        showToast(`${finalId} listeye eklendi`);
    }
}

// Kural Kartlarını Render Et
function renderKurallar() {
    const container = document.getElementById('settings-container');
    const selectEkle = document.getElementById('yeniEtiketTuru');
    if (!container || !selectEkle) return;
    
    container.innerHTML = "";
    selectEkle.innerHTML = "";
    
    for (let tag in mevcutVeri.preferences) {
        const pref = mevcutVeri.preferences[tag];
        const isCore = coreTags.includes(tag);
        const displayName = isCore ? tagLabels[tag] : (pref.adi || tag);
        
        // Ekleme Select Kutusu Seçeneği
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = displayName;
        selectEkle.appendChild(opt);

        // Kural Kartı
        const card = document.createElement('div');
        card.className = 'kural-card';
        
        let silButonuHTML = isCore ? '' : `
            <button class="btnSilKural btn-delete-item" data-tag="${tag}" title="Kategoriyi Sil">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;

        card.innerHTML = `
            <div class="kural-card-header">
                <span class="kural-card-name">${displayName}</span>
                ${silButonuHTML}
            </div>
            <div class="kural-options">
                <div class="kural-field">
                    <label>Rozet Görünümü</label>
                    <select id="${tag}-visibility">
                        <option value="Show Badge" ${pref.visibility === 'Show Badge' ? 'selected' : ''}>Rozet Göster</option>
                        <option value="Hide Badge" ${pref.visibility === 'Hide Badge' ? 'selected' : ''}>Rozet Gizle</option>
                    </select>
                </div>
                <div class="kural-field">
                    <label>Video Eylemi</label>
                    <select id="${tag}-enforcement">
                        <option value="Allow Video" ${pref.enforcement === 'Allow Video' ? 'selected' : ''}>İzin Ver</option>
                        <option value="Blur Thumbnail" ${pref.enforcement === 'Blur Thumbnail' ? 'selected' : ''}>Bulanıklaştır</option>
                        <option value="Remove Video Entirely" ${pref.enforcement === 'Remove Video Entirely' ? 'selected' : ''}>Tamamen Kaldır</option>
                    </select>
                </div>
            </div>
        `;

        // Canlı Değişiklik Dinleyicileri
        card.querySelector(`#${tag}-visibility`).addEventListener('change', async (e) => {
            mevcutVeri.preferences[tag].visibility = e.target.value;
            await setStorageData({ preferences: mevcutVeri.preferences });
            showToast("Görünüm güncellendi");
        });

        card.querySelector(`#${tag}-enforcement`).addEventListener('change', async (e) => {
            mevcutVeri.preferences[tag].enforcement = e.target.value;
            await setStorageData({ preferences: mevcutVeri.preferences });
            showToast("Eylem kuralı güncellendi");
        });

        // Silme Butonu
        if (!isCore) {
            card.querySelector('.btnSilKural').addEventListener('click', async () => {
                if (confirm(`"${displayName}" kategorisini silmek istediğinize emin misiniz?`)) {
                    delete mevcutVeri.preferences[tag];
                    for (let id in mevcutVeri.customMapping) {
                        if (mevcutVeri.customMapping[id] === tag) delete mevcutVeri.customMapping[id];
                    }
                    await setStorageData({ 
                        preferences: mevcutVeri.preferences,
                        customMapping: mevcutVeri.customMapping
                    });
                    renderKurallar();
                    renderFilterChips();
                    renderItemList();
                    showToast(`"${displayName}" silindi`);
                }
            });
        }

        container.appendChild(card);
    }
}

// Tüm Ayarları Manuel Kaydet
async function kaydetTumAyarlar(bildirimVer = true) {
    for (let tag in mevcutVeri.preferences) {
        const visEl = document.getElementById(`${tag}-visibility`);
        const enfEl = document.getElementById(`${tag}-enforcement`);
        if (visEl && enfEl) {
            const isCore = coreTags.includes(tag);
            mevcutVeri.preferences[tag] = {
                visibility: visEl.value,
                enforcement: enfEl.value,
                adi: isCore ? tagLabels[tag] : (mevcutVeri.preferences[tag].adi || tag)
            };
        }
    }

    mevcutVeri.ayarlar = {
        shortsGizle: document.getElementById('chkShorts').checked,
        yorumGizle: document.getElementById('chkYorum').checked,
        onerilenGizle: document.getElementById('chkOnerilen').checked,
        otomatikOynatmaKapat: document.getElementById('chkOtomatikOynatma').checked,
        pinIptal: document.getElementById('chkPinIptal').checked,
        koyuTema: document.body.classList.contains('dark-theme')
    };

    await setStorageData({
        preferences: mevcutVeri.preferences,
        customMapping: mevcutVeri.customMapping,
        ayarlar: mevcutVeri.ayarlar
    });

    if (bildirimVer) {
        showToast("Tüm ayarlar başarıyla kaydedildi!");
    }
}
