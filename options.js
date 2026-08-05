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
    });
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
    document.getElementById('txtUrl').value = mevcutVeri.ayarlar.guncellemeUrl || "";

    renderKurallar();
    renderEtiketListesi();
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
        
        let silButonuHTML = isCore ? '' : `<button class="btnSilKural" data-tag="${tag}">Etiketi Sil</button>`;
        
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
            renderEtiketListesi();
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

function renderEtiketListesi() {
    const listContainer = document.getElementById('etiketListesiKonteyner');
    listContainer.innerHTML = '';
    
    for (let id in mevcutVeri.customMapping) {
        const tag = mevcutVeri.customMapping[id];
        const isCore = coreTags.includes(tag);
        const pref = mevcutVeri.preferences[tag] || {};
        const displayName = isCore ? tagLabels[tag] : (pref.adi || tag);
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '8px 0';
        row.style.borderBottom = '1px solid #eee';
        
        row.innerHTML = `
            <span style="font-size: 14px;"><b>${id}</b> - ${displayName}</span>
            <button class="btnSilListe" data-id="${id}" style="background: #dc3545; color: white; border: none; padding: 4px 8px; font-size: 12px; border-radius: 4px; cursor: pointer;">Sil</button>
        `;
        listContainer.appendChild(row);
    }

    document.querySelectorAll('.btnSilListe').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            delete mevcutVeri.customMapping[id];
            renderEtiketListesi();
        });
    });
}

document.getElementById('btnEtiketEkle').addEventListener('click', () => {
    let rawInput = document.getElementById('yeniEtiketId').value.trim();
    const tag = document.getElementById('yeniEtiketTuru').value;
    
    if (rawInput !== "") {
        let finalId = rawInput;
        const videoMatch = rawInput.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
        const channelMatch = rawInput.match(/(@[a-zA-Z0-9._-]+)/);
        
        if (videoMatch && videoMatch[1]) {
            finalId = videoMatch[1];
        } else if (channelMatch && channelMatch[1]) {
            finalId = channelMatch[1];
        }
        
        finalId = finalId.toLowerCase();
        mevcutVeri.customMapping[finalId] = tag;
        document.getElementById('yeniEtiketId').value = '';
        renderEtiketListesi();
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
            guncellemeUrl: document.getElementById('txtUrl').value.trim()
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
                alert("Veriler içe aktarıldı. Sayfa yenileniyor.");
                window.location.reload();
            });
        } catch (hata) { alert("Geçersiz JSON!"); }
    };
    okuyucu.readAsText(dosya);
});