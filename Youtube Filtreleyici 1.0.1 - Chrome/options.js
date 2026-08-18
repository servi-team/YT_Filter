let mevcutVeri = {};
const coreTags = ["profanity", "violence", "educational", "safe", "untagged"];
const tagLabels = { "profanity": "Küfür/Argo", "violence": "Şiddet", "educational": "Eğitici", "safe": "Güvenli", "untagged": "Etiketlenmemiş" };

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(null, (veri) => {
        mevcutVeri = veri;
        if (!mevcutVeri.customMapping) mevcutVeri.customMapping = {};
        if (!mevcutVeri.preferences) mevcutVeri.preferences = {};
        if (!mevcutVeri.ayarlar) mevcutVeri.ayarlar = {};
        
        coreTags.forEach(tag => {
            if (!mevcutVeri.preferences[tag]) {
                mevcutVeri.preferences[tag] = { visibility: "Show Badge", enforcement: "Allow Video", adi: tagLabels[tag] };
            }
        });
        
        document.getElementById('lblKurulumTarihi').innerText = veri.kurulumTarihi || "Bilinmiyor";

        // Temayı Uygula
        if (mevcutVeri.ayarlar.koyuTema) {
            document.body.classList.add('dark-theme');
            document.getElementById('btnTemaGecis').innerText = '☀️';
        }

        // PIN İptal Edildiyse Doğrudan Arayüze Geç
        if (mevcutVeri.ayarlar.pinIptal || !mevcutVeri.pinKodu) {
            document.getElementById('pinEkrani').style.display = 'none';
            document.getElementById('anaArayuz').style.display = 'block';
            arayuzuDoldur();
        }
    });
});

// Tema Geçiş Tuşu
document.getElementById('btnTemaGecis').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    document.getElementById('btnTemaGecis').innerText = isDark ? '☀️' : '🌙';
    
    // Anlık olarak hafızaya kaydet
    mevcutVeri.ayarlar.koyuTema = isDark;
    chrome.storage.local.set({ ayarlar: mevcutVeri.ayarlar });
});

document.getElementById('pinGiris').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('btnPinOnayla').click();
    }
});

document.getElementById('btnPinOnayla').addEventListener('click', () => {
    const girilen = document.getElementById('pinGiris').value;
    if (girilen === mevcutVeri.pinKodu || !mevcutVeri.pinKodu) {
        document.getElementById('pinEkrani').style.display = 'none';
        document.getElementById('anaArayuz').style.display = 'block';
        arayuzuDoldur();
    } else {
        document.getElementById('pinHata').style.display = 'block';
    }
});

function arayuzuDoldur() {
    document.getElementById('chkShorts').checked = mevcutVeri.ayarlar.shortsGizle || false;
    document.getElementById('chkYorum').checked = mevcutVeri.ayarlar.yorumGizle || false;
    document.getElementById('chkOnerilen').checked = mevcutVeri.ayarlar.onerilenGizle || false;
    document.getElementById('chkOtomatikOynatma').checked = mevcutVeri.ayarlar.otomatikOynatmaKapat || false;
    document.getElementById('chkPinIptal').checked = mevcutVeri.ayarlar.pinIptal || false;

    renderKurallar();
}

function renderKurallar() {
    const container = document.getElementById('settings-container');
    const selectEkle = document.getElementById('yeniEtiketTuru');
    
    container.innerHTML = "";
    selectEkle.innerHTML = "";
    
    for (let tag in mevcutVeri.preferences) {
        const pref = mevcutVeri.preferences[tag];
        const isCore = coreTags.includes(tag);
        const displayName = isCore ? tagLabels[tag] : (pref.adi || tag);
        
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = displayName;
        selectEkle.appendChild(opt);

        const div = document.createElement('div');
        div.className = 'tag-group';
        
        let silButonuHTML = isCore ? '' : `<button class="btnSilKural" data-tag="${tag}">Sil</button>`;
        
        let itemsHTML = '';
        let hasItems = false;
        for (let id in mevcutVeri.customMapping) {
            if (mevcutVeri.customMapping[id] === tag) {
                hasItems = true;
                itemsHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dotted var(--border-color);">
                        <span style="font-size: 11px; color: var(--text-color); font-family: monospace; word-break: break-all;">${id}</span>
                        <button class="btnSilItem" data-id="${id}" style="background: #e74c3c; color: white; border: none; padding: 2px 6px; font-size: 10px; border-radius: 3px; cursor: pointer; margin-left: 10px;">Sil</button>
                    </div>
                `;
            }
        }

        let mappingListHTML = hasItems ? `<div style="margin-top: 10px; padding: 5px; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 4px; max-height: 120px; overflow-y: auto;">
            <strong style="font-size: 11px; display: block; margin-bottom: 5px; color: var(--bilgi-color);">Bu Etikete Atanan İçerikler:</strong>
            ${itemsHTML}
        </div>` : '';

        div.innerHTML = `
            ${silButonuHTML}
            <span class="tag-title">${displayName}</span>
            <div class="option">
                <span>Görünüm:</span>
                <select id="${tag}-visibility">
                    <option value="Show Badge" ${pref.visibility === 'Show Badge' ? 'selected' : ''}>Rozet Göster</option>
                    <option value="Hide Badge" ${pref.visibility === 'Hide Badge' ? 'selected' : ''}>Rozet Gizle</option>
                </select>
            </div>
            <div class="option">
                <span>Eylem:</span>
                <select id="${tag}-enforcement">
                    <option value="Allow Video" ${pref.enforcement === 'Allow Video' ? 'selected' : ''}>İzin Ver</option>
                    <option value="Blur Thumbnail" ${pref.enforcement === 'Blur Thumbnail' ? 'selected' : ''}>Bulanıklaştır</option>
                    <option value="Remove Video Entirely" ${pref.enforcement === 'Remove Video Entirely' ? 'selected' : ''}>Tamamen Kaldır</option>
                </select>
            </div>
            ${mappingListHTML}
        `;
        container.appendChild(div);
    }

    document.querySelectorAll('.btnSilKural').forEach(btn => {
        btn.addEventListener('click', function() {
            const tag = this.getAttribute('data-tag');
            delete mevcutVeri.preferences[tag];
            for (let id in mevcutVeri.customMapping) {
                if (mevcutVeri.customMapping[id] === tag) delete mevcutVeri.customMapping[id];
            }
            renderKurallar();
        });
    });

    document.querySelectorAll('.btnSilItem').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            delete mevcutVeri.customMapping[id];
            renderKurallar();
        });
    });
}

document.getElementById('btnKuralEkle').addEventListener('click', () => {
    const orjinalYazim = document.getElementById('yeniKuralAdi').value.trim();
    const etiketAnahtari = orjinalYazim.toLowerCase();
    
    if (orjinalYazim && !mevcutVeri.preferences[etiketAnahtari]) {
        mevcutVeri.preferences[etiketAnahtari] = { visibility: "Show Badge", enforcement: "Allow Video", adi: orjinalYazim };
        document.getElementById('yeniKuralAdi').value = '';
        renderKurallar();
    }
});

document.getElementById('btnEtiketEkle').addEventListener('click', () => {
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
        document.getElementById('yeniEtiketId').value = '';
        renderKurallar();
    }
});

document.getElementById('btnPinGuncelle').addEventListener('click', () => {
    const yeni = document.getElementById('yeniPin').value;
    chrome.storage.local.set({ pinKodu: yeni }, () => alert("PIN Güncellendi."));
});

document.getElementById('btnKaydet').addEventListener('click', () => {
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

    chrome.storage.local.set({
        preferences: mevcutVeri.preferences,
        customMapping: mevcutVeri.customMapping,
        ayarlar: {
            shortsGizle: document.getElementById('chkShorts').checked,
            yorumGizle: document.getElementById('chkYorum').checked,
            onerilenGizle: document.getElementById('chkOnerilen').checked,
            otomatikOynatmaKapat: document.getElementById('chkOtomatikOynatma').checked,
            pinIptal: document.getElementById('chkPinIptal').checked,
            koyuTema: document.body.classList.contains('dark-theme')
        }
    }, () => alert("Ayarlar başarıyla kaydedildi."));
});

document.getElementById('btnDisaAktar').addEventListener('click', () => {
    chrome.storage.local.get(null, (veri) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(veri, null, 2));
        const indirmeLinki = document.createElement('a');
        indirmeLinki.setAttribute("href", dataStr);
        indirmeLinki.setAttribute("download", "yt_filter_yedek.json");
        document.body.appendChild(indirmeLinki);
        indirmeLinki.click();
        indirmeLinki.remove();
    });
});

document.getElementById('btnIceAktar').addEventListener('change', (e) => {
    const dosya = e.target.files[0];
    if (!dosya) return;
    const okuyucu = new FileReader();
    okuyucu.onload = (olay) => {
        try {
            const yuklenen = JSON.parse(olay.target.result);
            chrome.storage.local.set({
                customMapping: yuklenen.customMapping || mevcutVeri.customMapping,
                ayarlar: yuklenen.ayarlar || mevcutVeri.ayarlar,
                preferences: yuklenen.preferences || mevcutVeri.preferences
            }, () => {
                alert("Veriler içe aktarıldı. Açılır pencereyi kapatıp açın.");
            });
        } catch (hata) { alert("Geçersiz JSON!"); }
    };
    okuyucu.readAsText(dosya);
});