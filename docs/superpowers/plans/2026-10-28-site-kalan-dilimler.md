# YouTube Filter Store — Kalan Dilimler Uygulama ve Orkestrasyon Planı

> **Durum:** Görev 1–6 tamamlandı. Bu plan Görev 7–30'u yedi dilimde (S1–S7) yürütür.
> **Başlangıç commit'i:** `4a27c25` (`site: icerik okuma deposu ve turkce arama`)
> **Bağlayıcı kaynaklar:** `docs/SISTEM_TASARIMI.md`, `docs/superpowers/specs/2026-10-27-site-tasarimi.md`, `docs/superpowers/plans/2026-10-27-site-uygulama.md`
> **Görev brief'leri:** `.superpowers/sdd/2026-10-27-site-uygulama/task-{7..30}-brief.md`
> **Çalışma modeli:** Aynı ağaçta tek uygulayıcı alt-ajan; kontrolör inceleme, doğrulama, commit ve etiket sahibi. Push yok.

Bu plan, onaylı 30 görevlik planın kalan kısmını **uygulanabilir dilimler** hâline getirir. Görev brief'leri adım adım kod ve test metnini taşır; bu belge ise sırayı, bağımlılıkları, arayüz sözleşmelerini, paralel çalışma sınırlarını, doğrulama kapılarını ve geri dönüş noktalarını tanımlar. Çelişki varsa sıra: `docs/SISTEM_TASARIMI.md` → tasarım spec'i → onaylı uygulama planı → bu orkestrasyon planı.

---

## 1. Mevcut taban ve değişmezler

### 1.1 Taban

- HEAD: `4a27c25`.
- Tamamlanan görevler: 1–6.
- Test durumu: `cd site; npm test` → **41/41 pass**.
- Tip durumu: `cd site; npm run tip` → temiz.
- Derleme: `cd site; npm run build` → `Compiled successfully`.
- Henüz `checkpoint-site-*` etiketi yok; ilk etiket S1 sonunda.
- Yerel doğrulama PGlite ile yapılır. Docker/Bun bu makinede yok; üretim PostgreSQL/Docker doğrulaması kullanıcıya aittir.

### 1.2 Dokunulmayacaklar

- Eklenti tarafındaki mevcut değişiklikler: `src/content.js`, `src/inject_helper.js`, `chromium/*`, `firefox/*`, `scripts/ikon-uret.js`, `src/icons/*`, `docs/MAGAZA_*`, `docs/db-sema.md`, `CHANGELOG.md`, `DEVIR_NOTU.md`, `PLAN.md`.
- `tests/smoke/kanal-baglami.test.js` (izlenmeyen eklenti testi).
- `site/AGENTS.md` otomatik üretilir; görev commit'lerine karıştırılmaz.
- `docs/superpowers/` ve `docs/PLAN_SITE.md` Task 30'a kadar izlenmez; Task 30'da doküman commit'ine girer.
- `site/.env.local` ve `.pglite-dev/` asla commit edilmez.

> **Task 8 istisnası:** Görev 8, onaylı plan gereği `scripts/ikon-uret.js`, `src/icons/*`, `chromium/icons/*` ve `firefox/icons/*` dosyalarını yeniden üretir. Bu dosyalarda kullanıcının izlenmeyen değişiklikleri var. Görev 8'den önce yedek alınmadan ve diff incelenmeden üzerine yazılmaz. Ayrıntı: §8 Risk 1.

### 1.3 Global kurallar (özet)

- Tüm metinler Türkçe; `lang="tr"`.
- Yalnızca `site/app/stil.css` değişkenleri + CSS Modules. Tailwind/shadcn/UI kit/CSS-in-JS yok.
- Renkler spec §4.2; açık/koyu tema `prefers-color-scheme`; elle tema anahtarı yok.
- Fontlar `next/font/local`; çalışma anında üçüncü taraf font isteği yok.
- WCAG AA, görünür `:focus-visible`, 44×44 px dokunma hedefi, anlamsal HTML, `aria-live="polite"`, `prefers-reduced-motion`.
- Ziyaretçi çerezi `ytf_ziyaretci`; oturum çerezi `ytf_oturum`. Ham IP saklanmaz; HMAC-SHA256 özeti kullanılır.
- Oylar silinmez; `ziyaretci_geri_alindi` / `moderasyon_geri_alindi` ile işaretlenir.
- Engel aktifken oylar sayılmaz; engel kaldırılınca eski oylar geri sayılır.
- İçerik silinmez, arşivlenir; arşivli kayıt kamusal listede, içerik URL'sinde ve `db.json`da yoktur.
- Video eklemek `kanallar` satırı oluşturmaz; `videolar.kanal_id` FK'sız metindir.
- Son aktif admin pasifleştirilemez/rolü düşürülemez; admin kendi hesabını pasifleştiremez veya rolünü düşüremez.
- Kamusal yazma uçları origin + ziyaretçi çerezi + kamusal hız limiti; panel/admin yazma uçları `panelKoruma` (oturum + rol + hesap başına 120/dk).
- Her görev yalnızca kendi dosyalarını commit eder; `git add -A` yasak.
- Her dilim sonunda `npm test` + `npm run build` yeşil, commit + `checkpoint-site-sN`.
- Push yok. Push, kullanıcı incelemesinden sonra.

---

## 2. Orkestrasyon modeli

### 2.1 Roller

**Kontrolör (bu oturum):**
1. Sıradaki görevin brief'ini ve bağımlılıklarını doğrular.
2. Uygulayıcı alt-ajana yalnızca o görevin sözleşmesini, dosya sınırını, test/build kapısını ve commit talimatını verir.
3. Alt-ajan çalışırken yalnızca **okuma/araştırma** ve **sonraki brief hazırlığı** yapar; aynı dosyalara yazmaz.
4. Gelen diff'i denetler: kapsam, test kalitesi, sözleşme uyumu, güvenlik/erişilebilirlik, commit içeriği.
5. `npm test`, `npm run tip`, `npm run build` ve gerekiyorsa manuel dumanı çalıştırır.
6. Commit'i doğrular veya kendisi atar; dilim sonunda etiketi basar.
7. `.superpowers/sdd/2026-10-27-site-uygulama/progress.md` defterini günceller.

**Uygulayıcı alt-ajan (her görev için yeni):**
- Yalnızca kendi brief'indeki dosyaları yazar.
- Alt-ajan çağırmaz; plan/etiket/push yapmaz.
- Testi önce kırmızı görür, sonra yeşile getirir; testi zayıflatmaz.
- Yalnızca kendi dosyalarını `git add` eder ve brief'teki commit mesajıyla commit atar.
- Raporu `.superpowers/sdd/2026-10-27-site-uygulama/task-N-report.md` dosyasına yazar.
- Dönüşü: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED`, commit hash, tek satır test özeti, riskler.

### 2.2 Görev döngüsü

```text
[BRIEF HAZIR] → [TEK UYGULAYICI] → [DIFF İNCELEMESİ] → [TEST/TİP/BUILD]
      → [MANUEL DUMAN] → [COMMIT DOĞRULA] → [DEFTER] → [SONRAKİ GÖREV]
```

Dilim sonunda:

```text
[TÜM GÖREVLER] → [TAM TEST + BUILD] → [DİLİM MANUEL AKIŞLARI]
      → [git status TEMİZ/KAPSAMLI] → [git tag checkpoint-site-sN] → [DEFTER]
```

### 2.3 Uygulayıcıya verilecek bağlam paketi

Her dispatch'te şunlar verilir:

1. Görev numarası ve brief yolu.
2. Mevcut HEAD ve son commit.
3. Önceki görevlerden doğrudan tükettiği arayüzler (dosya + imza).
4. Dokunmaması gereken dosyalar ve mevcut kirli eklenti değişiklikleri.
5. Tam test komutu, tip komutu, build komutu.
6. Tam `git add ...` listesi ve commit mesajı.
7. Rapor yolu ve dönüş formatı.
8. Varsa önceden verilmiş ruling'ler (bu plan §8).

### 2.4 Paralellik sınırları

**İzin verilen (dosya yazmayan işler):**
- Sonraki görevin brief'ini okumak/hazırlamak.
- Tamamlanan görevin diff'ini okumak, güvenlik/erişilebilirlik notu çıkarmak.
- Task 8 için kalkan geometrisini ayrı bir geçici klasörde denemek (repo dışında veya `.superpowers/.../scratch/` altında; commit edilmez).
- Task 30 için doküman-kod çelişkilerini okumak; düzenlemeyi en sona bırakmak.
- Test/build çıktılarını yorumlamak.

**Yasak:**
- Aynı ağaçta iki uygulayıcı alt-ajan.
- Aynı anda iki `next build` / `next dev` yazma işi.
- Bir ajan `site/lib/oy-servisi.ts` yazarken başka ajanın aynı dosyaya dokunması.
- Paralel `git add` / `git commit` / `git tag`.
- Kullanıcının eklenti değişikliklerini stash'lemek, geri almak veya commit etmek.

**Neden:** Görevlerin çoğu aynı dosyaları zincirleme büyütür (`icerik-deposu.ts`, `link-formu.tsx`, `panel/layout.tsx`, `admin/layout.tsx`, `db.json` rotası). Paralel yazma çakışma, iç içe commit ve yanlış doğrulama üretir. Hız kazancı, uygulayıcı çalışırken brief/inceleme hazırlığının örtüşmesinden gelir.

### 2.5 İnceleme protokolü

Her görevden sonra kontrolör şunları kontrol eder:

- [ ] Diff yalnızca brief'teki dosyaları içeriyor.
- [ ] Test önce kırmızıydı; sonra yeşil. Test metni brief'ten zayıflatılmamış.
- [ ] Yeni dış bağımlılık yok.
- [ ] `git add -A` kullanılmamış; eklenti dosyaları commit'te yok.
- [ ] `npm test` tam suite yeşil.
- [ ] `npm run tip` temiz.
- [ ] `npm run build` başarılı.
- [ ] Kamusal/panel yanıtlarında ham IP, tam IP özeti veya tam çerez kimliği yok.
- [ ] Yetki gizli düğmeye değil, sunucu tarafı kontrole dayanıyor.
- [ ] Erişilebilirlik: tek `h1`, görünür odak, 44 px hedef, `aria-live`, `alt`.
- [ ] Commit mesajı brief'tekiyle aynı; hash rapora yazılmış.

### 2.6 Hata protokolü

| Durum | Davranış |
|---|---|
| Test beklentisi yanlış | Testi değiştirme; dur ve kontrolöre raporla. Kontrolör spec'e göre ruling verir. |
| Brief'te olmayan dosya gerekiyor | Ajan durur; kontrolör kapsamı genişletir veya görevi böler. |
| Build eski bir görevden kırık | Önce kırığı nedeniyle düzelt; yeni göreve geçme. |
| PGlite/Docker farkı | PGlite testi esas; Docker doğrulaması kullanıcıya devredilir. |
| Ajan `BLOCKED` döndü | Kontrolör hatayı yeniden üretir; brief/ruling günceller; yeni ajanla devam eder. |
| Ajan `DONE_WITH_CONCERNS` | Kontrolör concern'i ya kabul eder (deftere yazar) ya da düzeltme görevi açar. |

### 2.7 Commit ve etiket protokolü

- Her görev kendi commit'ini alır; commit mesajı brief'teki Türkçe/ASCII mesajdır.
- Dilim doğrulaması geçmeden checkpoint etiketi basılmaz.
- Etiketler hafif (`git tag checkpoint-site-sN`), push edilmez.
- Geri dönüş: `git reset --hard checkpoint-site-sN` (çalışma ağacındaki izlenmeyen dosyalar korunur; dikkatli kullanılır).
- Her dilim sonunda `git log --oneline <önceki-tag>..HEAD` ve `git status --short` deftere yazılır.

---

## 3. Dilim haritası

| Dilim | Görevler | Çıktı | Checkpoint |
|---|---|---|---|
| **S1** | 7, 8 | Ana sayfa + keşfet + bağlantı alanı; yeni kalkan ikonu ve site favicon'ları | `checkpoint-site-s1` |
| **S2** | 9, 10, 11, 12 | Ziyaretçi kimliği, hız limiti, oy servisi/API'leri, içerik sayfası, demo veri | `checkpoint-site-s2` |
| **S3** | 13, 14, 15 | YouTube metadata/kota, link çözümleme, ekleme talebi, `/link` | `checkpoint-site-s3` |
| **S4** | 16, 17, 18, 19, 20 | Parola/oturum/yetki, giriş/çıkış, ilk admin, editör paneli, talep kuyruğu | `checkpoint-site-s4` |
| **S5** | 21, 22, 23 | Moderasyon servisi, geri alma, kilit, engel, bakım, moderasyon paneli | `checkpoint-site-s5` |
| **S6** | 24, 25, 26, 27 | Çok admin yönetimi, arşiv/metadata, `db.json` önizleme/yayın/indirme | `checkpoint-site-s6` |
| **S7** | 28, 29, 30 | Gizlilik/koşullar/iletişim/hata sayfaları, erişilebilirlik/QA, doküman uzlaştırması | `checkpoint-site-s7` |

### 3.1 Bağımlılık grafiği

```text
T7 ──► T8 ──► S1
T9 ──► T10 ──► T11 ──► T12 ──► S2
T13 ──► T14 ──► T15 ──► S3
T16 ──► T17 ──► T18 ──► T19 ──► T20 ──► S4
T21 ──► T22 ──► T23 ──► S5
T24 ──► T25 ──► T26 ──► T27 ──► S6
T28 ──► T29 ──► T30 ──► S7
```

Kritik yol: **T7 → T9 → T10 → T11 → T14 → T16 → T17 → T18 → T19 → T21 → T22 → T24 → T25 → T26 → T29 → T30**. Diğer görevler bu yolun yanında sıralanır; hiçbiri aynı anda iki yazıcı gerektirmez.

### 3.2 Görev özeti ve commit mesajları

| Görev | Kısa ad | Commit mesajı | Bağımlı olduğu |
|---|---|---|---|
| 7 | Ana sayfa, keşfet, link alanı | `site: ana sayfa ve kesfet` | T4, T5, T6 |
| 8 | Kalkan ikonu + S1 | `site: kalkan ikonunu yenile ve S1 kapanisi` | T5, T7 |
| 9 | Ziyaretçi/hız/istek altyapısı | `site: ziyaretci kimligi hiz limiti ve istek yardimcilari` | T2, T3 |
| 10 | Oy servisi ve API'leri | `site: oy servisi ve anonim oy APIleri` | T9, T3, T6 |
| 11 | İçerik sayfası ve oy arayüzü | `site: icerik sayfasi ve oy arayuzu` | T10, T5 |
| 12 | Demo veri + S2 | `site: demo veri betigi ve S2 kapanisi` | T10, T11 |
| 13 | YouTube metadata + kota | `site: youtube metadata cozucu ve gunluk kota sayaci` | T9, T3 |
| 14 | Link çözümleme + talep | `site: link cozumleme ve ekleme talebi` | T7, T13 |
| 15 | S3 doğrulaması | — | T14 |
| 16 | Parola/oturum/yetki | `site: parola oturum ve yetki cekirdegi` | T2, T9 |
| 17 | Giriş/çıkış/ilk admin | `site: giris cikis ilk admin ve oturum sayfalari` | T16, T4 |
| 18 | Editör paneli + kayıt ekleme | `site: editor paneli ve kayit ekleme` | T10, T14, T17 |
| 19 | Talep kuyruğu | `site: ekleme talebi kuyrugu` | T14, T18 |
| 20 | S4 doğrulaması | — | T19 |
| 21 | Moderasyon servisi + bakım | `site: moderasyon servisi, geri alma, kilit, engel ve bakim` | T10, T18 |
| 22 | Moderasyon paneli | `site: moderasyon paneli ve engel listesi` | T21 |
| 23 | S5 doğrulaması | — | T22 |
| 24 | Çok admin + admin iskeleti | `site: cok admin yonetimi ve admin iskeleti` | T17, T18 |
| 25 | Arşiv + metadata düzeltme | `site: arsivleme geri getirme ve metadata duzeltme` | T18, T24 |
| 26 | `db.json` yayını | `site: db.json onizleme yayinlama ve indirme` | T25, T10 |
| 27 | S6 doğrulaması | — | T26 |
| 28 | Gizlilik/koşullar/iletişim/hata | `site: gizlilik kosullar iletisim ve hata sayfalari` | T7, T17 |
| 29 | Erişilebilirlik + QA | `site: erisilebilirlik testleri ve tarayici QA listesi` | T28 |
| 30 | Doküman + S7 | `docs: site uygulama ve devir belgelerini uzlastir` | T29 |

---

## 4. Dilim planları

## S1 — Kamusal kabuk ve kalkan ikonu

**Hedef:** Site ilk kez gerçek bir ana sayfa ve keşfet deneyimi kazanır; yeni kalkan ikonu site ve uzantıda aynı işareti taşır. S1 sonunda ilk checkpoint alınır.

### Görev 7 — Ana sayfa, keşfet ve bağlantı alanı

**Çıktı:** Ana sayfa hero + istatistik + son 6 kayıt + “Nasıl çalışır?” + `db.json` çağrısı; `/kesfet` arama/filtre/sayfalama; link yapıştırma alanı.

**Dosyalar:**
- Create: `site/app/(kamusal)/page.tsx`, `site/app/(kamusal)/ana-sayfa.module.css`
- Create: `site/app/(kamusal)/kesfet/page.tsx`, `site/app/(kamusal)/kesfet/kesfet.module.css`
- Create: `site/app/bilesenler/link-formu.tsx`, `site/app/bilesenler/sayfalama.tsx`
- Delete: `site/app/page.tsx`, `site/app/adres-cubugu.tsx`

**Tüketir:** `sonIcerikler`, `siteIstatistikleri`, `icerikListele`, `IcerikKarti`, `BosDurum`, `SayfaBasligi`, `linkCoz`.

**Sözleşme:**
- Ana sayfa `export const dynamic = 'force-dynamic'`.
- Hero H1: **“YouTube’un gürültüsünü birlikte süzüyoruz.”**
- Alt metin: **“Video ve kanalların konusunu, uyarı etiketlerini topluluk oylarıyla belirliyoruz. Hesap gerekmez.”**
- Sağda son kayıt varsa `IcerikKarti`, yoksa `BosDurum` (“Henüz kayıt yok. İlk kaydı editörler ekler.”).
- Üç istatistik: kayıt, oy, veri sürümü. Son 6 kayıt. “Nasıl çalışır?” üç adım: **Linki yapıştır → Konu ve etiketleri oyla → Sonuç eklentiye gider.** `id="nasil-calisir"`.
- `LinkFormu` client: input + **“Linki incele”**. Submit'te `linkCoz`; video/kanal ID ise `router.push('/icerik/{tur}/{id}')`; `@handle` ise `/kesfet?arama=...`; hata satır içi `role="alert"` + `aria-describedby`. Bu dilimde kayıtsız link talebi yok; S3'te `/link` sayfasına yönlenecek.
- `/kesfet`: `searchParams: Promise<{ arama?: string; tur?: string; sayfa?: string }>` await edilir. `tur` yalnızca `video|kanal`; `sayfa` pozitif tam sayı, varsayılan 1. `icerikListele` ile 12'lik sayfa.
- Başlık **“Keşfet”**, GET arama formu, tür bağlantıları **Tümü / Videolar / Kanallar**, sonuç sayısı, kart ızgarası, `Sayfalama`.
- Boş durum: **“Bu aramada kayıt bulunamadı.”** Mobil tek sütun, 1280 px'te 3 sütun.
- Her sayfada tam olarak bir ana `h1`; `/kesfet` başlığı `SayfaBasligi` üretir.

**Kabul:**
- `cd site; npm test` → yeşil.
- `cd site; npm run tip` → temiz.
- `cd site; npm run build` → `Compiled successfully`.
- `npm run dev`; `/` ve `/kesfet?arama=inci`; 1280×800 ve 390×844'te yatay taşma yok; boş veride ana sayfa çökmeden boş durum gösteriyor.
- Yerel `site/.env.local` (izlenmez): `SITE_DB=pglite`, `PGLITE_DIR=.pglite-dev`, `IP_HASH_SECRET=dev`, `SITE_ORIGIN=http://localhost:3000`.

**Commit:** `git add "site/app/(kamusal)" site/app/bilesenler/link-formu.tsx site/app/bilesenler/sayfalama.tsx` → `git commit -m "site: ana sayfa ve kesfet"`; silinen iki dosya da commit kapsamına girer (`git rm`).

**Brief:** `task-7-brief.md`.

### Görev 8 — Kalkan ikonu, S1 doğrulaması ve checkpoint

**Çıktı:** Şeffaf zeminli, `#C9342B` gövdeli, `#98251F` kenarlı, iki `#FFFDF8` çeyrekli, üstü logaritmik sivrilen kalkan; 16/32/48/128 uzantı ikonları; 128 mağaza ikonunda 96 görsel + 16 px şeffaf çerçeve; site favicon ve header aynı işaret.

**Dosyalar:**
- Modify: `scripts/ikon-uret.js`
- Create/Modify: `src/icons/icon{16,32,48,128}.png`, `chromium/icons/*`, `firefox/icons/*`
- Create: `site/public/kalkan.svg`, `site/public/ikon-{16,32,48,128}.png`, `site/app/icon.png`, `site/app/apple-icon.png`
- Create: `site/tests/ikon.test.ts`

**Sözleşme:**
- `canvas-design` becerisi yüklenir; geometri onunla arıtılır. Mevcut ikonun birebir kopyası değil.
- 4x süper örnekleme korunur.
- 128 px çıktının dış 16 px halkası tamamen `alpha=0`; betik bunu doğrular, değilse hata verir.
- `site/app/icon.png` 32 px, `site/app/apple-icon.png` 180 px.
- `site/public/kalkan.svg` aynı geometriyi `viewBox="0 0 128 128"` ile taşır; `Kalkan` bileşeni bu SVG'yi andırır.
- İkon testi: üretimi çalıştırır; `src/icons/icon{16,32,48,128}.png` boyutlarını, `site/app/icon.png` 32 ve `apple-icon.png` 180'i doğrular.

**Ön koşul — kullanıcı değişikliklerini koru:**
1. `git diff -- scripts/ikon-uret.js src/icons chromium/icons firefox/icons` çıktısını yedekle.
2. Dosyaları `.superpowers/sdd/2026-10-27-site-uygulama/task-8-oncesi/` altına kopyala (commit edilmez).
3. Diff'te ikon geometrisi dışında mantık varsa **dur ve kullanıcıya sor**; yoksa devam et.
4. Görev 8 commit'i yalnızca brief'teki ikon dosyalarını içerir; yedek klasör ve diğer eklenti değişiklikleri girmez.

**Kabul:**
- `node scripts/ikon-uret.js` → “şeffaf çerçeve tamam”.
- Depo kökünde `npm run build` ve `npm run build:check` → `Tüm çıktılar güncel`.
- `cd site; node --test tests/ikon.test.ts` → PASS.
- `cd site; npm test` → yeşil; `cd site; npm run build` → yeşil.
- Manuel: header, favicon ve uzantı ikonları aynı işareti gösteriyor; 16 px'te kenar ve çeyrekler okunur.

**Commit:** `git add scripts/ikon-uret.js src/icons chromium/icons firefox/icons site/public site/app/icon.png site/app/apple-icon.png site/tests/ikon.test.ts` → `git commit -m "site: kalkan ikonunu yenile ve S1 kapanisi"`.

**S1 kapanışı:**
- `git status --short` → yalnızca beklenen site dosyaları; eklenti değişiklikleri, `site/.env.local`, `.pglite-dev` ve `site/AGENTS.md` commit dışı.
- `git tag checkpoint-site-s1`.
- Deftere S1 commit aralığı, test/build sonucu ve manuel duman notu yazılır.

---

## S2 — Anonim oy çekirdeği

**Hedef:** Ziyaretçi çerezi, hız limiti, oy servisi ve API'leri, içerik sayfası ve demo veri. S2 sonunda gerçek oy akışı tarayıcıda çalışır.

### Görev 9 — Ziyaretçi kimliği, istek yardımcıları ve hız sınırı

**Dosyalar:**
- Create: `site/lib/ziyaretci.ts`, `site/lib/hiz-limiti.ts`, `site/lib/hata.ts`, `site/lib/istek.ts`
- Create: `site/tests/altyapi.test.ts`

**Arayüzler:**
- `ZIYARETCI_CEREZI`, `ziyaretciKimligi(req)`, `yeniZiyaretciKimligi()`, `ziyaretciCerezi(kimlik, guvenli)`, `kimlikEtiketi(tur, deger)`
- `limitAsildiMi(db, { anahtar, adet, pencereSaniye }, simdi?)`
- `sayacArtir(db, { anahtar, pencereSaniye }, simdi?, adet?)`, `sayacOku(db, { anahtar, pencereSaniye }, simdi?)`
- `class HttpHatasi extends Error { durum; kod; constructor(durum, kod, mesaj?) }`
- `ayniOriginMi(req)`, `ipOzeti(req)`, `jsonCevap(veri, durum?, basliklar?)`, `hataCevap(hata)`, `govdeOku<T>(req)`
- Sabitler: `OY_LIMITI_DAKIKA=120`, `OY_LIMITI_GUN=2000`, `TALEP_LIMITI_SAAT=5`, `GIRIS_LIMITI_15DK=10`, `PANEL_YAZMA_LIMITI_DAKIKA=120` (env ile ezilebilir).

**Kurallar:**
- `ziyaretci.ts`: `randomBytes(32).toString('base64url')`; çerez `HttpOnly; SameSite=Lax; Max-Age=31536000; Path=/`; üretimde `Secure`.
- `kimlikEtiketi`: değerin SHA-256 ilk 8 hex'i; `çerez:xxxxxxxx` / `ağ:xxxxxxxx`; ham kimlik sızmaz.
- `hiz-limiti.ts`: pencere başlangıcı `floor(simdi/pencere)*pencere`; `onConflictDoUpdate` ile `sayac + adet`; `limitAsildiMi` = `sayacArtir(...,1) > adet`.
- `istek.ts`: `ayniOriginMi` **önce `SITE_ORIGIN`** ortam değişkenine bakar; tanımlıysa `Origin` yalnızca bu değerle eşleşmeli; değilse `new URL(req.url).origin`. `Origin` yok/eşleşmiyorsa `false`.
- IP: `x-forwarded-for` ilk değer; HMAC-SHA256 `IP_HASH_SECRET`; anahtar yoksa `null`.
- `govdeOku` JSON parse hatasında `HttpHatasi(400, 'gecersiz-govde')`.

**Kabul:** odaklı test PASS; `npm run build`; commit.

**Commit:** `site: ziyaretci kimligi hiz limiti ve istek yardimcilari`.

### Görev 10 — Oy servisi ve API'leri

**Dosyalar:**
- Modify: `site/lib/oy-deposu.ts`
- Create: `site/lib/oy-servisi.ts`, `site/lib/engel-deposu.ts`
- Create: `site/app/api/icerikler/route.ts`, `site/app/api/icerikler/[tur]/[id]/route.ts`
- Create: `site/app/api/oylar/route.ts`, `site/app/api/oylar/geri-al/route.ts`
- Create: `site/tests/oy-servisi.test.ts`, `site/tests/api-oy.test.ts`
- Modify: `site/tests/db.test.ts` (`benimOylarim` yeni alanları)

**Arayüzler:**
- `interface OySonucu { sayimlar: Sayimlar; sonuc: KayitSonucu; kilitliSonuc: KayitSonucu | null }`
- `oyKaydet(db, OyGirdisi): Promise<OySonucu>`
- `oyGeriAlZiyaretci(db, { hedefTuru, hedefId, ogeTuru, ogeId, tarayiciId }): Promise<OySonucu>`
- `benimOylarim(db, hedefTuru, hedefId, tarayiciId)`
- `aktifEngelVarMi(db, { tarayiciId, ipOzeti }, simdi?)`
- API: `PUT /api/oylar`, `POST /api/oylar/geri-al`, `GET /api/icerikler`, `GET /api/icerikler/[tur]/[id]`

**Kurallar:**
- Upsert tek satır: `(hedef, öğe, tarayıcı)` tekil.
- İki geri alma bayrağı `false` olan oylar sayılır.
- Engel aktifse oy yazılmaz (`403`); engel kaldırılınca eski oylar geri sayılır.
- Origin kontrolü ve kamusal hız limiti (çerez + IP) uygulanır.
- `sayimlariGetir` ve `aktifKilit` Task 11'in tüketimi için `oy-deposu.ts`'ten dışa açılır; Task 6'nın özel yardımcıları gerekiyorsa burada paylaşılan hâle getirilir.
- Panel/admin uçları bu görevde yok; onlar `panelKoruma` kullanacak.

**Kabul:** servis testleri, API testleri, tam suite, build; commit.

**Commit:** `site: oy servisi ve anonim oy APIleri`.

### Görev 11 — İçerik sayfası ve oy arayüzü

**Dosyalar:**
- Create: `site/app/(kamusal)/icerik/[tur]/[id]/page.tsx`, `.../icerik.module.css`
- Create: `site/app/bilesenler/oy-alani.tsx`, `oy-alani.module.css`

**Tüketir:** `icerikGetir`, `benimOylarim`, `sayimlariGetir`, `OyTablosu`, `SonucPaneli`, `Rozet`, `Bildirim`.

**Sözleşme:**
- `generateMetadata({ params })`; `params` Promise await edilir.
- Arşivli veya olmayan kayıt `notFound()`.
- `OyAlani` client: üçlü oy, `aria-pressed`, `aria-live`, hata/başarı bildirimi, geri al; sayfa yenilemeden sayımları günceller.
- Kilitli kayıtta sonuç donmuş; oy verme devam eder ama sonuç değişmez.
- Mobilde sonuç paneli üstte özetlenir; tablo kart görünümüne döner.

**Kabul:** build; manuel olarak bir video ve bir kanal sayfası; oy ver/geri al; refresh sonrası kalıcılık. S2'de demo veriyle tam akış.

**Commit:** `site: icerik sayfasi ve oy arayuzu`.

### Görev 12 — Demo veri, S2 doğrulaması ve checkpoint

**Dosyalar:**
- Create: `site/scripts/demo-veri.mjs`
- Modify: `site/package.json` (`"demo:veri": "node scripts/demo-veri.mjs"`)

**Sözleşme:**
- `db()` ile bağlan; `NODE_ENV === 'production'` ise hata.
- Tablo boş değilse “Demo veri zaten var” deyip çık.
- 2 kanal (`UC` + 22 karakter), 2 video, 6 tarayıcıdan spor/müzik/ai oyları.
- **Ruling:** Brief'teki `oyVer` adı Task 10'un gerçek dışa aktarımı değilse `oyKaydet` kullanılır; yeni bir paralel servis adı uydurulmaz.
- Çıktı: eklenen kayıt/oy sayısı.

**S2 kapanışı:**
- `cd site; npm test` → PASS.
- `cd site; npm run build` → `Compiled successfully`.
- `cd site; npm run demo:veri`; `npm run dev`.
- `/`, `/kesfet`, bir video ve bir kanal sayfası; 1280×800 ve 390×844.
- Oy ver/değiştir/geri al; sayfa yenile; çerez kalıcı; eşik altı/üstü sonuç doğru.
- DevTools: origin dışı `PUT /api/oylar` → `403`; aşırı istek → `429`.
- `git status --short` → yalnızca beklenen dosyalar.
- `git tag checkpoint-site-s2`.

**Commit:** `site: demo veri betigi ve S2 kapanisi`.

---

## S3 — Link çözümleme ve ekleme talebi

**Hedef:** Kayıtlı olmayan YouTube linki güvenli biçimde talebe dönüşür; metadata API/oEmbed/HTML fallback ile çözülür; aynı link tek talepte birleşir.

### Görev 13 — YouTube metadata çözücü

**Dosyalar:**
- Create: `site/lib/youtube-meta.ts`, `site/lib/youtube-kota.ts`
- Create: `site/tests/youtube-meta.test.ts`, `site/tests/youtube-kota.test.ts`

**Arayüzler:**
- `VideoMeta`, `KanalMeta`, `Meta`, `MetaSonucu`, `MetaCozucu`
- `metaCoz(link, secenek?: { fetch?, apiKey?, kotaArtir? })`
- `YOUTUBE_KOTA_GUNLUK=10000`, `YOUTUBE_KOTA_UYARI=8000`
- `kotaKullan(db, adet?, simdi?)`, `kotaDurumu(db, simdi?)`, `kotaylaMetaCozucu(db, secenek?)`

**Kurallar:**
- API anahtarı varsa YouTube Data API; yoksa oEmbed/HTML fallback.
- Ağ hatası veya eksik metadata kaydı engellemez; kimlikle kayıt oluşturulabilir, alanlar sonradan dolar.
- Kota `hiz_limitleri` üzerinden günlük sayılır; 8.000'de uyarı, 10.000'de tükenme.
- Testler mock `fetch` ile API/oEmbed/HTML yollarını ve ağ hatasını kapsar.

**Kabul:** odaklı testler, tam suite, build; commit.

**Commit:** `site: youtube metadata cozucu ve gunluk kota sayaci`.

### Görev 14 — Link çözümleme, ekleme talebi ve `/link`

**Dosyalar:**
- Modify: `site/lib/icerik-deposu.ts` (`linkIleKayitBul`), `site/app/bilesenler/link-formu.tsx`
- Create: `site/lib/talep-deposu.ts`
- Create: `site/app/api/link/route.ts`, `site/app/api/talepler/route.ts`
- Create: `site/app/(kamusal)/link/page.tsx`, `site/app/(kamusal)/link/link.module.css`
- Create: `site/app/bilesenler/talep-formu.tsx`
- Create: `site/tests/talep-deposu.test.ts`

**Arayüzler:**
- `linkIleKayitBul(db, link): Promise<{ kayit: IcerikBasligi; arsivli: boolean } | null>`
- `talepOlustur(db, { link, cozulen, metaCozucu?, tarayiciId, ipOzeti }): Promise<{ durum:'kayitli'; tur; id } | { durum:'talep'; talepId: string; yeni: boolean }>`
- API: `GET /api/link?url=`, `POST /api/talepler`
- Sayfa: `/link?url=`

**Kurallar:**
- **Ruling:** `talepOlustur` handle talebini çözülen `UC…` kanal kimliğine kanonikleştirir; `@k` ve aynı kanalın `UC…` linki tek talepte birleşir.
- Arşivli kayıt `/link`te aktif kayıt gibi gösterilmez; talep akışına düşer.
- `/link` formu metadata önizlemesi, hata durumu ve “talep alındı” mesajı gösterir.
- `link-formu.tsx` kayıtsız linkte artık `/link?url=...` sayfasına yönlendirir (Task 7'deki `/kesfet?arama=` davranışı yalnızca handle için kalır).
- Talep hız limiti IP başına saatte 5; origin kontrolü.

**Kabul:** talep deposu testi, tam suite, build; `/` link alanı → kayıtlı link içerik sayfası, kayıtsız link `/link`; aynı linki tekrar gönder → talep sayısı artar, yeni satır açılmaz.

**Commit:** `site: link cozumleme ve ekleme talebi`.

### Görev 15 — S3 doğrulaması ve checkpoint

- `cd site; npm test` → PASS.
- `cd site; npm run build` → `Compiled successfully`.
- `npm run dev`; `/` link alanı → kayıtlı link içerik sayfasına, kayıtsız link `/link` ekranına gider; talep gönder; aynı linki tekrar gönder → talep sayısı artar, yeni satır açılmaz.
- `git status --short` → yalnızca beklenen dosyalar.
- `git tag checkpoint-site-s3`.

---

## S4 — Oturum, editör paneli ve talep kuyruğu

**Hedef:** Editör/admin hesapları güvenli giriş yapar; editör paneli kayıt ekler ve talepleri işler. S4 sonunda editör akışı uçtan uca çalışır.

### Görev 16 — Parola, oturum ve yetki çekirdeği

**Dosyalar:**
- Create: `site/lib/parola.ts`, `site/lib/oturum.ts`, `site/lib/yetki.ts`
- Create: `site/tests/oturum.test.ts`

**Arayüzler:**
- `parolaOzetle(parola)`, `parolaDogrula(parola, ozet)`, `parolaGecerliMi(parola)`
- `OTURUM_CEREZI`, `OturumKullanicisi`, `girisYap(db, { eposta, parola, ipOzeti, simdi? })`
- `oturumOku(db, token, simdi?)`, `oturumKapat(db, token)`, `hesapOturumlariniIptalEt(db, hesapId, haricToken?)`
- `parolaDegistir(db, { hesapId, mevcutParola, yeniParola, token, simdi? })`
- `oturumCerezi(token, sonKullanma)`, `kullaniciGerekli(db, req)`, `rolGerekli(db, req, roller)`, `panelKoruma(db, req, roller, secenek?: { adet?; simdi? })`

**Kurallar:**
- `scrypt` (N=32768, r=8, p=1), 16 bayt tuz, sabit zamanlı karşılaştırma; minimum 12 karakter.
- Oturum token'ı yalnızca özet olarak DB'de; çerez `HttpOnly; SameSite=Lax; 7 gün kayan / 30 gün mutlak`; üretimde `Secure`.
- Pasifleştirilen hesabın oturumu sonraki istekte düşer.
- `panelKoruma`: oturum + rol + hesap başına `PANEL_YAZMA_LIMITI_DAKIKA` (120/dk); kamusal oy limitinden ayrı.
- E-posta karşılaştırması büyük/küçük harf duyarsız; Türkçe I/İ tuzağı test edilir.

**Kabul:** oturum testleri, tam suite, build; commit.

**Commit:** `site: parola oturum ve yetki cekirdegi`.

### Görev 17 — Giriş/çıkış API'leri, ilk admin ve oturum sayfaları

**Dosyalar:**
- Create: `site/lib/hesap-deposu.ts`, `site/lib/sunucu-oturum.ts`
- Create: `site/app/api/oturum/route.ts`, `site/app/api/oturum/ben/route.ts`, `site/app/api/oturum/parola/route.ts`
- Create: `site/app/(oturum)/giris/page.tsx`, `site/app/(oturum)/giris/giris.module.css`
- Create: `site/app/(oturum)/sifre-degistir/page.tsx`
- Create: `site/app/bilesenler/giris-formu.tsx`, `cikis-dugmesi.tsx`, `parola-formu.tsx`
- Create: `site/scripts/ilk-admin.mjs`
- Modify: `site/app/layout.tsx`, `site/app/bilesenler/ust-bar.tsx`, `site/package.json` (`"ilk-admin"`)
- Create: `site/tests/hesap-giris.test.ts`

**Arayüzler:**
- `ilkAdminOlustur(db, { eposta, parola }): Promise<{ id; eposta; rol }>`
- `siteKullanici(): Promise<OturumKullanicisi | null>`; `sunucuRolGerekli(roller): Promise<OturumKullanicisi>`
- API: `POST/DELETE /api/oturum`, `GET /api/oturum/ben`, `POST /api/oturum/parola`

**Kurallar:**
- İlk admin yalnızca hiç hesap yokken oluşturulur; `ILK_ADMIN_EPOSTA`, `ILK_ADMIN_PAROLA`; ilk girişte parola değiştirme zorunlu.
- Giriş hız limiti IP+e-posta başına 15 dakikada 10.
- Layout ve üst bar oturumu sunucuda okur; `cookies()` async.
- Çıkışta oturum DB'den silinir; çerez temizlenir.

**Kabul:** hesap/giriş testleri, tam suite, build; commit.

**Commit:** `site: giris cikis ilk admin ve oturum sayfalari`.

### Görev 18 — Editör paneli iskeleti, özet ve kayıt ekleme

**Dosyalar:**
- Create: `site/app/panel/layout.tsx`, `site/app/panel/page.tsx`, `site/app/panel/panel.module.css`
- Create: `site/app/panel/icerikler/page.tsx`
- Create: `site/app/api/panel/icerikler/route.ts`
- Create: `site/lib/icerik-yaz.ts`, `site/lib/panel-deposu.ts`
- Create: `site/app/bilesenler/icerik-ekle-formu.tsx`
- Create: `site/tests/icerik-yaz.test.ts`

**Arayüzler:**
- `icerikEkle(db, { cozulen, meta, ekleyen }): Promise<{ durum:'eklendi'|'vardi'|'arsivden'; tur; id }>`
- `panelOzeti(db): Promise<{ bekleyenTalep; toplamOy; kilitli; sonModerasyon; kota }>`
- API: `POST /api/panel/icerikler`

**Kurallar:**
- Panel yalnızca editor/admin; `panelKoruma` yazmada, `rolGerekli` okumada.
- Video eklemek kanal satırı oluşturmaz; kanal alanları video satırında denormalizedir.
- Arşivde aynı link varsa “arşivden geri getirilecek” onayı; yeni satır açılmaz.
- Başlıksız video `Video {id}` olarak eklenebilir; metadata sonradan dolar.
- Kota uyarısı panelde görünür.

**Kabul:** içerik yazma testi, tam suite, build; commit.

**Commit:** `site: editor paneli ve kayit ekleme`.

### Görev 19 — Talep kuyruğu

**Dosyalar:**
- Modify: `site/lib/talep-deposu.ts`
- Create: `site/app/api/panel/talepler/[id]/route.ts`
- Create: `site/app/panel/talepler/page.tsx`, `site/app/bilesenler/talep-islem.tsx`
- Create: `site/tests/talep-isle.test.ts`

**Arayüzler:**
- `talepleriListele(db, { durum? }): Promise<TalepSatiri[]>`
- `talepIsle(db, { talepId, karar, gerekce?, yapan, metaCozucu? }): Promise<{ durum:'kabul'|'red'; hedef?: { tur; id } }>`

**Kurallar:**
- Kabulde metadata çözülür; hata olsa bile kimlikle kayıt oluşturulur.
- Arşivli kayıt geri getirilir; oylar/kilit korunur.
- Ret gerekçesi zorunlu; işlem moderasyon kaydına yazılır.
- Aynı talep ikinci kez işlenemez (`409`).

**Kabul:** talep işleme testi, tam suite, build; commit.

**Commit:** `site: ekleme talebi kuyrugu`.

### Görev 20 — S4 doğrulaması ve checkpoint

- `cd site; npm test` → PASS.
- `cd site; npm run build` → `Compiled successfully`.
- `cd site; npm run ilk-admin` (geçici parola ile) → giriş → parola değiştir → `/panel`.
- Editörle yeni video ekle, talebi kabul et; kanal satırı oluşmadığını panelde doğrula.
- `git status --short` → yalnızca beklenen dosyalar.
- `git tag checkpoint-site-s4`.

---

## S5 — Moderasyon

**Hedef:** Editör oyları geri alabilir, kaydı kilitleyebilir, çerez/ağ engeli koyabilir; tüm işlemler gerekçeli ve kalıcıdır. Panelde yalnızca kısa takma etiketler görünür.

### Görev 21 — Moderasyon servisi, geri alma, kilit, engel ve bakım

**Dosyalar:**
- Create: `site/lib/moderasyon-deposu.ts`
- Create: `site/lib/bakim.ts`, `site/scripts/bakim.mjs`
- Modify: `site/lib/engel-deposu.ts` (aktif engel süresi), `site/lib/oy-deposu.ts` (gerekiyorsa engel filtresi)
- Modify: `site/package.json` (`"bakim"`)
- Create: `site/tests/moderasyon.test.ts`, `site/tests/bakim.test.ts`

**Arayüzler:**
- `GeriAlmaKapsami = 'tek' | 'cerez-kayit' | 'cerez-site'`
- `EngelKapsami = 'cerez' | 'ag'`
- `OySatiri`, `EngelSatiri`, `ModerasyonSatiri`
- `oySatirlari(db, hedefTuru, hedefId, simdi?)`
- `oyGeriAlModerasyon(db, { oyId, kapsam, yapan, gerekce })`
- `kayitKilitle(db, { hedefTuru, hedefId, yapan, gerekce })`
- `kayitKilidiniAc(db, { hedefTuru, hedefId, yapan, gerekce })`
- `engelle(db, { oyId, kapsam, yapan, gerekce, bitis? })`
- `engelleriListele(db, simdi?)`, `engelKaldir(db, { engelId, yapan, gerekce })`
- `moderasyonGecmisi(db, { limit? }?)`
- `BakimSonucu`, `bakimYap(db, { simdi?, ipGun? }?)`

**Kurallar:**
- Gerekçe zorunlu; işlem `moderasyon` kaydına yazılır.
- `tek` yalnızca seçili oy; `cerez-kayit` aynı çerezin bu hedefli tüm oyları; `cerez-site` aynı çerezin tüm oyları.
- Moderasyon geri alması kalıcıdır; ziyaretçi yeniden oy veremez (`409`).
- Kilit: aynı hedefte tek aktif kilit; kilit anındaki sonuç `jsonb` olarak saklanır; kilit açılınca güncel oylara dönülür.
- Engel: çerez veya ağ; aktifken oylar sayılmaz, yeni oy `403`; kaldırılınca eski oylar geri sayılır.
- Bakım: 30 günden eski IP özetleri, süresi dolmuş oturumlar, engeller ve hız limiti pencereleri silinir.
- Panelde tam çerez/IP yok; yalnızca `çerez:xxxxxxxx` / `ağ:xxxxxxxx`.

**Kabul:** moderasyon ve bakım testleri, tam suite, build; commit.

**Commit:** `site: moderasyon servisi, geri alma, kilit, engel ve bakim`.

### Görev 22 — Moderasyon paneli, oy satırları ve engel listesi

**Dosyalar:**
- Create: `site/app/api/panel/moderasyon/oy-geri-al/route.ts`
- Create: `site/app/api/panel/moderasyon/kilitle/route.ts`, `.../kilit-ac/route.ts`
- Create: `site/app/api/panel/moderasyon/engelle/route.ts`
- Create: `site/app/api/panel/engeller/route.ts`, `site/app/api/panel/engeller/[id]/route.ts`
- Create: `site/app/panel/icerikler/[tur]/[id]/page.tsx`, `.../moderasyon.module.css`
- Create: `site/app/panel/moderasyon/page.tsx`, `site/app/panel/engeller/page.tsx`
- Create: `site/app/bilesenler/moderasyon-araclari.tsx`, `gerekce-dialogu.tsx`, `engel-listesi.tsx`
- Create: `site/tests/api-moderasyon.test.ts`

**API:**
- `POST /api/panel/moderasyon/oy-geri-al` gövde `{ oyId, kapsam, gerekce }` → `{ adet, etiket }` (200)
- `POST /api/panel/moderasyon/kilitle` → 201; `kilit-ac` → 200
- `POST /api/panel/moderasyon/engelle` → `{ id, etiket }` (201)
- `GET /api/panel/engeller` → `{ engeller }`; `DELETE /api/panel/engeller/[id]` gövde `{ gerekce }` → 204

**Kurallar:**
- Tüm yazmalar `panelKoruma`; okumalar `rolGerekli`.
- `GerekceDialogu` client; onay olmadan işlem yok.
- Oy satırlarında yalnızca takma etiket; `oyId` sunucuda çözülür.
- Engel listesi süresi dolmuşları göstermez; kaldırılan engel listeden düşer.
- Moderasyon geçmişi panelde görünür.

**Kabul:** API moderasyon testleri, tam suite, build; commit.

**Commit:** `site: moderasyon paneli ve engel listesi`.

### Görev 23 — S5 doğrulaması ve checkpoint

`npm test` + `npm run build` yeşil. `npm run dev` ile:
1. Bir kayda 3 upvote ver; **Kilitle** (gerekçeli) → oy vermeye devam et, sonuç paneli değişmiyor.
2. **Kilidi aç** (gerekçeli) → sonuç güncel oylara dönüyor.
3. Bir oyu **tek** geri al → sonuç düşüyor; aynı çerezle yeniden oy verince `409` ve “moderasyonla geri alındı” mesajı görünüyor.
4. Aynı çerezle iki konu oyu varken **bu kayıttaki oylar** → iki satır kapanıyor; başka kayıttaki oy duruyor.
5. Aynı çerezle iki farklı kayıtta oy varken **tüm site oyları** → hepsi kapanıyor; onay ve gerekçe olmadan işlem yapılamıyor.
6. **Çerezi engelle** → oylar sayılmıyor; yeni oy `403`; engeli kaldır → eski oylar geri sayılıyor.
7. **Ağı engelle** → paylaşımlı ağ uyarısı ve gerekçe görünüyor; engeli kaldır → oylar geri geliyor.
8. `/panel/engeller` süresi dolmuş engeli göstermiyor; kaldırılan engel listeden düşüyor.
9. DevTools → Network: moderasyon yanıtlarında ve panel HTML'inde tam çerez kimliği, tam IP özeti, ham IP yok; yalnızca `çerez:xxxxxxxx` / `ağ:xxxxxxxx`.

`git status --short` → yalnızca beklenen dosyalar. `git tag checkpoint-site-s5`.

---

## S6 — Admin, arşiv ve yayın

**Hedef:** Çok admin yönetimi, arşiv/geri getirme, metadata düzeltme ve `db.json` önizleme/yayın/indirme. S6 sonunda yayın akışı uçtan uca çalışır.

### Görev 24 — Admin iskeleti, çok admin yönetimi ve taksonomi

**Dosyalar:**
- Modify: `site/lib/hesap-deposu.ts`
- Create: `site/lib/admin-deposu.ts`
- Create: `site/app/api/admin/hesaplar/route.ts`, `site/app/api/admin/hesaplar/[id]/route.ts`
- Create: `site/app/admin/layout.tsx`, `site/app/admin/page.tsx`, `site/app/admin/admin.module.css`
- Create: `site/app/admin/hesaplar/page.tsx`, `site/app/admin/taksonomi/page.tsx`
- Create: `site/app/bilesenler/hesap-formu.tsx`, `hesap-tablosu.tsx`
- Create: `site/tests/admin-hesap.test.ts`, `site/tests/api-admin.test.ts`

**Arayüzler:**
- `HesapSatiri { id; eposta; rol; aktif; parolaDegistirmeli; sonGiris; olusturma }` (parola özeti yok)
- `hesaplariListele(db)`, `hesapOlustur(db, { eposta, parola, rol, yapan })`, `hesapGuncelle(db, { hesapId, rol?, aktif?, geciciParola?, yapan, kendiId })`
- `adminOzeti(db): Promise<{ hesaplar; aktifAdmin; bekleyenTalep; kilitli; sonYayin; uyarilar }>`
- API: `GET/POST /api/admin/hesaplar`; `PATCH /api/admin/hesaplar/[id]`

**Kurallar:**
- Yalnızca admin; editör `/admin` altında `403`.
- Son aktif admin pasifleştirilemez/rolü düşürülemez; admin kendi hesabını pasifleştiremez/rolünü düşüremez; ikisi de `409`.
- Kontrol rol/aktiflik güncellemesiyle aynı transaction'da.
- Geçici parola bir kez gösterilir; ilk girişte değiştirme zorunlu.
- `/admin/taksonomi` salt okunur; yeni kimlik ekleme düğmesi yok.

**Kabul:** admin hesap testleri, API testleri, tam suite, build; commit.

**Commit:** `site: cok admin yonetimi ve admin iskeleti`.

### Görev 25 — Arşivleme, geri getirme ve metadata düzeltme

**Dosyalar:**
- Create: `site/lib/arsiv-deposu.ts`
- Create: `site/app/api/admin/icerikler/route.ts`
- Create: `site/app/api/admin/icerikler/[tur]/[id]/route.ts` (`PATCH` metadata)
- Create: `site/app/api/admin/icerikler/[tur]/[id]/arsivle/route.ts`, `.../geri-getir/route.ts`
- Create: `site/app/admin/icerikler/page.tsx`, `site/app/admin/icerikler/[tur]/[id]/page.tsx`, `.../admin-icerik.module.css`
- Create: `site/app/bilesenler/arsiv-dialogu.tsx`, `metadata-formu.tsx`
- Create: `site/tests/arsiv.test.ts`

**Arayüzler:**
- `AdminIcerikSatiri extends IcerikBasligi { oySayisi; kilitli; sonuc }`
- `adminIcerikListele(db, { durum?: 'aktif'|'arsiv'; arama? })`
- `icerikArsivle(db, { tur, id, yapan, gerekce })`, `icerikGeriGetir(...)`
- `metadataGuncelle(db, { tur, id, ad?, handle?, avatar?, baslik?, kanalAdi?, kanalHandle?, kanalAvatar?, yapan })`
- API: `GET /api/admin/icerikler?durum=...&arama=`; `PATCH .../[tur]/[id]`; `POST .../arsivle`; `POST .../geri-getir`

**Kurallar:**
- Arşiv gerekçesi zorunlu; oylar/kilit/moderasyon korunur.
- Arşivli kayıt `/kesfet`, içerik URL'si ve `db.json` dışında; `/admin/icerikler?durum=arsiv` altında.
- Geri getirme eski oyları ve kilidi geri getirir.
- Kanal arşivlemek videoları etkilemez; video satırındaki kanal alanları korunur.
- Metadata düzeltme yalnızca admin; moderasyon kaydı.

**Kabul:** arşiv testleri, tam suite, build; commit.

**Commit:** `site: arsivleme geri getirme ve metadata duzeltme`.

### Görev 26 — `db.json` önizleme, yayınlama ve indirme

**Dosyalar:**
- Create: `site/lib/yayin-deposu.ts`
- Create: `site/app/api/admin/yayinlar/onizle/route.ts`, `site/app/api/admin/yayinlar/route.ts`
- Create: `site/app/db.json/route.ts`
- Create: `site/app/admin/yayinlar/page.tsx`, `site/app/bilesenler/yayin-onizleme.tsx`
- Create: `site/tests/yayin.test.ts`, `site/tests/db-json-rota.test.ts`

**Arayüzler:**
- `YayinAdayi { veriSurumu; icerik; ozet; hatalar; uyarilar; gecerli }`
- `YayinSatiri { veriSurumu; olusturma; kanalSayisi; videoSayisi; onaylayan; notlar; icerik }`
- `yayinAdayiUret(db, secenek?: { veriSurumu?: number })`
- `yayinla(db, { notlar?, onaylayan })`
- `sonYayin(db)`, `yayinGetir(db, veriSurumu)`, `yayinGecmisi(db, limit?)`
- API: `POST /api/admin/yayinlar/onizle`, `GET/POST /api/admin/yayinlar`
- Route: `GET /db.json` (son sürüm), `GET /db.json?surum=N` (eski sürüm)

**Kurallar:**
- Yalnızca admin yayınlar.
- Önizleme: sürüm, tarih, kanal/video sayısı, yazılmayan kayıt sayısı, ilk 5 hata/uyarı; geçersizse yayın düğmesi kapalı.
- Yayın `yayin_surumleri` kaydı oluşturur; `veriSurumu` bir öncekinden büyük.
- Eski sürümler değişmez; `?surum=N` aynı dosyayı verir.
- **Ruling:** Yayın retry'ı, transaction'ın sürüm numarasıyla içeriği yeniden üretir; `icerik.veriSurumu` yayınlanan satırla her zaman eşleşir.
- `db.json` eklentinin `dbKur` doğrulayıcısından geçer; arşivli kayıt yok; deterministik sıra.
- `db.json` yayını yoksa 404; ana sayfa “Henüz yayın yok” durumuna düşer (Task 28).

**Kabul:** yayın testleri, rota testleri, tam suite, build; commit.

**Commit:** `site: db.json onizleme yayinlama ve indirme`.

### Görev 27 — S6 doğrulaması ve checkpoint

`npm test` + `npm run build` yeşil. `npm run dev` ile:
1. `/admin/hesaplar`: yeni editör hesabı aç; geçici parola bir kez görünüyor; editörle giriş → parola değiştir → `/panel`.
2. İkinci admin aç; adminlerden birini rol düşür/pasifleştir → kalan admin korunuyor; kendi hesabını düşürme/pasifleştirme kapalı ve sunucu `409` veriyor.
3. Pasifleştirilen hesabın açık oturumu bir sonraki istekte düşüyor; `/admin` editörde `403`.
4. `/admin/icerikler`: bir kaydı gerekçeyle arşivle → `/kesfet`, içerik URL'si ve `/db.json` dışında; oylar panelde duruyor. Geri getir → eski oylar ve kilit yerinde.
5. `/admin/yayinlar`: önizle → sürüm, kanal/video/yazılmayan sayıları, hata/uyarılar; **Yayınla** → `/db.json` iner; dosyada `sema: 1`, `veriSurumu` ve arşivli kayıt yok.
6. İkinci yayın → sürüm artıyor; `/db.json?surum=1` eski dosyayı değiştirmeden veriyor.
7. `/admin/taksonomi` salt okunur; yeni kimlik ekleme düğmesi yok.
8. `db.json` dosyasını gerçek eklentiye yükle (kullanıcı doğrulaması).

`git status --short` → yalnızca beklenen dosyalar. `git tag checkpoint-site-s6`.

---

## S7 — Kamusal metinler, erişilebilirlik ve kapanış

**Hedef:** Gizlilik/koşullar/iletişim/hata sayfaları, erişilebilirlik testleri, QA dumanı, doküman uzlaştırması ve final checkpoint.

### Görev 28 — Gizlilik, koşullar, iletişim ve hata sayfaları

**Dosyalar:**
- Create: `site/app/(kamusal)/gizlilik/page.tsx`, `site/app/(kamusal)/kosullar/page.tsx`, `site/app/(kamusal)/iletisim/page.tsx`
- Create: `site/app/(kamusal)/metin.module.css`
- Create: `site/app/not-found.tsx`, `site/app/error.tsx`
- Modify: `site/app/(kamusal)/page.tsx` (yayın yoksa `db.json` çağrısını “Henüz yayın yok” durumuna getir)
- Create: `site/tests/kamusal-metin.test.ts`

**Kurallar:**
- `/gizlilik` yalnızca siteyi kapsar; eklenti `docs/GIZLILIK.md` metninden ayrıdır. 30 gün IP özeti, 1 yıl ziyaretçi çerezi, 7/30 gün oturum, yerel font, analitik/reklam yok.
- `/kosullar` taslak kullanım koşulları; sorumluluk reddi, moderasyon ve değişiklik maddeleri.
- `/iletisim` GitHub Issues bağlantısı; form yok.
- `not-found.tsx` Türkçe 404, ana sayfa ve keşfet bağlantısı.
- `error.tsx` `'use client'`, tekrar dene düğmesi.
- Her sayfada tek `h1`; `SayfaBasligi` kullanılabilir.

**Kabul:** kamusal metin testi, tam suite, build; commit.

**Commit:** `site: gizlilik kosullar iletisim ve hata sayfalari`.

### Görev 29 — Erişilebilirlik testleri, QA dumanı ve tarayıcı kontrol listesi

**Dosyalar:**
- Create: `site/tests/erisilebilirlik.test.ts`
- Create: `site/scripts/qa-duman.mjs`
- Create: `docs/SITE_QA.md`
- Modify: `site/package.json` (`"qa:duman"`)

**Sözleşme:**
- Statik test: `lang="tr"`, `Atla`, `main#icerik`, `:focus-visible`, `prefers-reduced-motion`, yerel font, `img/Image` `alt`, `OyDugmesi` `aria-pressed`/`aria-label`, `SonucPaneli` `aria-live="polite"`, `OnayDiyalogu` `<dialog>`, her `page.tsx` en az bir `h1`/`SayfaBasligi`, pozitif `tabIndex` yok.
- **Ruling:** Testteki “İçeriğe atla” metni spec §4.7'ye göre **“İçeriğe geç”** olarak yazılır; bileşen değiştirilmez. Spec bağlayıcıdır.
- `qa-duman.mjs`: `BASE_URL` (varsayılan `http://localhost:3000`); `/`, `/kesfet`, `/giris`, `/gizlilik`, `/kosullar`, `/iletisim`; `lang`, atlama bağlantısı, `main#icerik`, tek `h1`, beklenen metinler, üçüncü taraf font yok, ham kimlik yok; `/db.json` 404 ise bilgi, 200 ise `sema:1`/`kanallar`/`videolar` doğrula.
- `docs/SITE_QA.md`: 1280×800 ve 390×844 tabloları, klavye, ekran okuyucu, kontrast, hareket azaltma, uçtan uca akışlar, gizlilik/ağ, ekran görüntüsü adları, kapanış. Manuel satırlar boş bırakılır.

**Kabul:** erişilebilirlik testi PASS; tam suite; build; `npm run dev` + `npm run qa:duman` → “QA dumanı geçti” (yayın yoksa `/db.json` 404 bilgi).

**Commit:** `site: erisilebilirlik testleri ve tarayici QA listesi`.

### Görev 30 — Doküman uzlaştırması, final doğrulama ve S7 kapanışı

**Dosyalar:**
- Modify: `site/README.md`, `docs/PLAN_SITE.md`, `docs/SITE_HAZIRLIK.md`, `docs/SISTEM_TASARIMI.md`, `docs/puan-sistemi-onerisi.md`, `CHANGELOG.md`, `DEVIR_NOTU.md`, `PLAN.md`, `docs/SITE_QA.md` (yalnızca otomatik satırlar)
- Add: `docs/superpowers/specs/2026-10-27-site-tasarimi.md`, `docs/superpowers/plans/2026-10-27-site-uygulama.md`
- Add (bu plan): `docs/superpowers/plans/2026-10-28-site-kalan-dilimler.md`

**Kurallar:**
- Dokümanlar kodla çelişmez: anonim oy; editör/admin; 3 oy eşiği; iki geri alma bayrağı; kilit; çerez/ağ engeli takma adları; arşiv; video kanal satırı oluşturmaz; yalnızca admin yayınlar; 30 gün IP özeti; rapor uç noktası yok; yerel font; site/eklenti gizlilik metinleri ayrı.
- `docs/SISTEM_TASARIMI.md` bağlayıcı; `docs/puan-sistemi-onerisi.md` uygulama notu.
- `docs/SITE_QA.md` yalnızca otomatik sonuç satırları doldurulur; manuel satırlar kullanıcıya kalır.
- Mağaza/gerçek tarayıcı/ekran görüntüsü maddeleri işaretsiz kalır.

**Final doğrulama:**
- `cd site; npm test` → tüm testler PASS.
- `cd site; npm run tip` → temiz.
- `cd site; npm run build` → `Compiled successfully`.
- `cd site; npm run qa:duman` (dev çalışırken) → geçti.
- `git status --short` → yalnızca beklenen dosyalar; eklenti değişiklikleri commit dışı.
- `git log --oneline checkpoint-site-s6..HEAD` ve `git tag --list 'checkpoint-site-*'` kontrol edilir.

**Commit:** `git add site/README.md docs/PLAN_SITE.md docs/SITE_HAZIRLIK.md docs/SISTEM_TASARIMI.md docs/puan-sistemi-onerisi.md docs/SITE_QA.md CHANGELOG.md DEVIR_NOTU.md PLAN.md docs/superpowers/specs/2026-10-27-site-tasarimi.md docs/superpowers/plans/2026-10-27-site-uygulama.md docs/superpowers/plans/2026-10-28-site-kalan-dilimler.md` → `git commit -m "docs: site uygulama ve devir belgelerini uzlastir"`.

**S7 kapanışı:** `git tag checkpoint-site-s7`; kullanıcıya inceleme paketi sunulur. Push yok.

---

## 5. Görev kartlarındaki ortak sözleşmeler

### 5.1 Kimlik ve gizlilik

- Ziyaretçi kimliği yalnızca `ytf_ziyaretci` çerezinde; DB'de oy satırında `tarayici_id` olarak.
- Panelde tam kimlik yok; `kimlikEtiketi` ile 8 hex'lik takma etiket.
- IP yalnızca HMAC-SHA256 özeti; 30 gün sonra silinir; aktif engelde engel süresince kalır.
- `SITE_ORIGIN` proxy arkasında origin kontrolünün tek kaynağıdır.
- Hata gövdesi: `{ hata: string, kod?: string }`.

### 5.2 Oy ve moderasyon

- Tek oy satırı: `(hedef_turu, hedef_id, oge_turu, oge_id, tarayici_id)`.
- Oy değiştirme upsert; geri alma bayrakları ayrı; ikisi de `false` ise sayılır.
- Eşik 3; net = up - down; ana konu/yan konu/etiket kuralları `oy-hesabi.ts`.
- Kilitli kayıtta `sonuc` donmuş; `kilitliSonuc` aynı; yeni oylar sayılır ama sonucu değiştirmez.
- Engelli çerez/ağ oyları sayılmaz; engel kaldırılınca geri gelir.
- Moderasyon işlemleri gerekçeli ve `moderasyon` kaydında.

### 5.3 Yetki

- Kamusal: origin + ziyaretçi çerezi + kamusal limit.
- Panel/admin yazma: `panelKoruma` (oturum + rol + 120/dk hesap başına).
- Panel/admin okuma: `rolGerekli`.
- Gizli düğme yetki değildir; doğrudan route çağrısı `401/403` almalı.
- Pasif hesap oturumu sonraki istekte düşer.
- Son aktif admin ve kendi hesabını düşürme koruması transaction içinde.

### 5.4 İçerik ve yayın

- Video eklemek kanal satırı oluşturmaz; `videolar.kanal_id` FK'sız.
- Arşiv silmez; oylar/kilit/moderasyon korunur.
- Arşivli kayıt kamusal ve `db.json` dışında.
- `db.json` yalnızca admin yayınıyla oluşur; sürüm artar; eski sürümler değişmez.
- Yayın öncesi eklenti `dbKur` doğrulaması; geçersizse yayın kapalı.

### 5.5 Arayüz

- Tek `h1`; `SayfaBasligi` kullanılan sayfalarda ayrıca `h1` yok.
- `OnayDiyalogu` client; server component'ten callback geçilmez.
- `OyDugmesi` `aria-pressed` + `aria-label`; `SonucPaneli` `aria-live="polite"`.
- 44×44 px hedef; görünür odak; `prefers-reduced-motion`.
- Mobil tek sütun; 1280 px keşfet 3 sütun; tablolar kart görünümüne döner.

---

## 6. Doğrulama kapıları ve komutlar

### 6.1 Her görev

```powershell
cd site
node --test tests/<görev-testi>.test.ts   # önce kırmızı, sonra yeşil
npm test
npm run tip
npm run build
cd ..
git status --short
git show --stat --oneline HEAD
```

### 6.2 Her dilim

```powershell
cd site
npm test
npm run tip
npm run build
npm run dev        # ayrı terminal
# dilim manuel akışları
cd ..
git status --short
git tag checkpoint-site-sN
git log --oneline <önceki-tag>..HEAD
```

### 6.3 Manuel duman matrisi

| Dilim | Sayfalar | Akışlar |
|---|---|---|
| S1 | `/`, `/kesfet`, `/kesfet?arama=inci` | Boş veri, arama, sayfalama, link formu, favicon/header ikonu |
| S2 | `/`, `/kesfet`, video, kanal | Oy ver/değiştir/geri al, refresh, eşik, origin 403, 429 |
| S3 | `/`, `/link?url=`, içerik | Kayıtlı/kayıtsız link, talep, aynı link dedupe, metadata fallback |
| S4 | `/giris`, `/sifre-degistir`, `/panel`, `/panel/icerikler`, `/panel/talepler` | İlk admin, giriş, parola değiştir, video ekle, talep kabul, kanal satırı yok |
| S5 | `/panel/icerikler/[tur]/[id]`, `/panel/moderasyon`, `/panel/engeller` | 9 moderasyon akışı (§S5), takma etiket, gerekçe |
| S6 | `/admin`, `/admin/hesaplar`, `/admin/icerikler`, `/admin/yayinlar`, `/admin/taksonomi`, `/db.json` | Çok admin, son admin, arşiv/geri getir, yayın/önizleme/eski sürüm |
| S7 | Tüm kamusal sayfalar, 404, error | Erişilebilirlik, QA dumanı, gizlilik metni, final doküman |

### 6.4 Kabul edilmeyecek durumlar

- Testi geçirmek için assertion zayıflatmak.
- `any` ile tip hatasını susturmak (mevcut `PgDatabase<any,...>` hariç).
- `git add -A`, `git add .`, `git commit -a`.
- Eklenti dosyalarını site commit'ine katmak.
- Build/test kırıkken checkpoint etiketi basmak.
- Push etmek.
- Ham IP/tam çerez kimliğini panel yanıtına koymak.
- Son admini düşüren veya kendi rolünü düşüren yolu açık bırakmak.

---

## 7. Dilim bazlı paralel çalışma haritası

| Uygulayıcı çalışırken | Kontrolörün paralel işi | Yazma var mı? |
|---|---|---|
| T7 | T8 ikon geometri denemesi (scratch), T8 brief/backup planı | Hayır |
| T9 | T10 brief ve oy API sözleşmesi incelemesi | Hayır |
| T10 | T11 brief, `OyAlani` erişilebilirlik notu | Hayır |
| T11 | T12 demo veri senaryosu, S2 manuel matrisi | Hayır |
| T13 | T14 link/talep akışı ve dedupe incelemesi | Hayır |
| T14 | S3 manuel matrisi, T15 kontrol listesi | Hayır |
| T16 | T17 oturum/çerez akışı incelemesi | Hayır |
| T17 | T18 panel iskeleti ve yetki matrisi | Hayır |
| T18 | T19 talep kuyruğu senaryosu | Hayır |
| T19 | S4 manuel matrisi, T20 kontrol listesi | Hayır |
| T21 | T22 moderasyon API sözleşmesi | Hayır |
| T22 | S5 9 akışlı manuel matris | Hayır |
| T24 | T25 arşiv/metadata sözleşmesi | Hayır |
| T25 | T26 yayın/sürüm retry incelemesi | Hayır |
| T26 | S6 manuel matrisi, T27 kontrol listesi | Hayır |
| T28 | T29 erişilebilirlik testi metni (Atla ruling) | Hayır |
| T29 | T30 doküman-kod çelişki listesi | Hayır |

> Not: “Yazma var mı?” sütunu kontrolörün görev dosyalarına yazmadığını garanti eder. Scratch klasörü repo dışında veya `.superpowers/.../scratch/` altında tutulur ve commit edilmez.

---

## 8. Bilinen riskler ve önceden verilmiş ruling'ler

| # | Risk / çelişki | Ruling | Maliyet |
|---|---|---|---|
| 1 | Task 8, kullanıcının değiştirdiği ikon dosyalarının üzerine yazar | Önce diff + dosya yedeği; ikon dışı mantık varsa dur ve sor; yoksa devam. Commit yalnızca Task 8 dosyaları. | Yanlışsa kullanıcı ikon değişikliği kaybolur; yedekten dönülür. |
| 2 | Task 29 testi “İçeriğe atla” diyor; spec §4.7 “İçeriğe geç” | Test spec'e göre “İçeriğe geç” yazılır; `Atla` bileşeni değişmez. | Yanlışsa tek metin değişikliği. |
| 3 | Task 12 brief'i `oyVer` diyor; Task 10 `oyKaydet` | Gerçek dışa aktarım `oyKaydet` kullanılır; paralel isim uydurulmaz. | Yanlışsa demo betiğinde tek çağrı düzeltmesi. |
| 4 | Task 11 `sayimlariGetir` bekliyor; Task 6 özel yardımcı kullandı | Task 10 `sayimlariGetir`/`aktifKilit` dışa açımını sağlar; Task 6 özel yardımcıları opsiyonel refactor. | Yanlışsa Task 11'de küçük import düzeltmesi. |
| 5 | `OnayDiyalogu` client; server page callback geçemez | Dialog kullanan sayfa client olur veya client sarmalayıcı kullanır. | Yanlışsa render hatası; hızlı düzeltme. |
| 6 | Next.js 16 `cookies()`, `params`, `searchParams` async | Tüm çağrılar `await` edilir; route context `params` Promise. | Yanlışsa tip/build hatası. |
| 7 | Docker/Bun yok | PGlite testleri esas; Docker/PostgreSQL doğrulaması kullanıcıya devredilir. | Üretim farkı riski. |
| 8 | `site/AGENTS.md` otomatik üretiliyor | Görev commit'lerine katılmaz; istenirse ayrı `site: nextjs ajan notu` commit'i. | Kirli ağaç görünümü. |
| 9 | `tests/smoke/kanal-baglami.test.js` izlenmiyor | Site commit'lerine katılmaz; eklenti testi olarak kalır. | Yanlışlıkla commit riski. |
| 10 | Yayın retry'ında sürüm uyuşmazlığı | İçerik transaction sürümüyle yeniden üretilir; `icerik.veriSurumu` eşleşir. | Yanlışsa `db.json` sürüm hatası. |
| 11 | Task 30 manuel QA satırları | Yalnızca otomatik satırlar doldurulur; manuel/store maddeleri kullanıcıya kalır. | Yanlışsa QA raporu yanıltıcı olur. |
| 12 | Push | Hiçbir görevde push yok; kullanıcı incelemesinden sonra. | Erken yayın riski. |
| 13 | `db.json` 404 (henüz yayın yok) | Ana sayfa “Henüz yayın yok” gösterir; QA dumanı 404'ü bilgi sayar. | Yanlışsa ana sayfa boş durum hatası. |
| 14 | `sonIcerikler` varsayılanı 6 | Task 7 son 6 kayıt ister; Task 6 varsayılanı 6. | Yanlışsa tek sabit değişikliği. |

---

## 9. Kullanıcıya devredilen manuel işler

Bu plan otomatik testleri ve yerel PGlite akışlarını kapsar. Aşağıdakiler kullanıcı sorumluluğundadır ve Task 30'da işaretsiz bırakılır:

- Gerçek tarayıcıda 1280×800 ve 390×844 ekran görüntüleri; `docs/qa/2026-10-27/` adlandırması.
- Klavye ve ekran okuyucu (NVDA/VoiceOver) manuel testi.
- Docker Compose + PostgreSQL 17 üretim yığını; `npm run build`/`start`.
- Chrome Web Store / Firefox Add-ons mağaza hesapları, yükleme, tanıtım görseli/video.
- `db.json` dosyasını gerçek eklentiye yükleme ve eklenti davranış doğrulaması.
- GitHub Pages gizlilik URL'si (`main` push edilmeden 404).
- Hukuki gizlilik/koşullar metinlerinin uzman incelemesi.
- Push ve yayın kararı.

---

## 10. Geri dönüş ve inceleme paketi

### 10.1 Etiketler

| Etiket | Kapsam |
|---|---|
| `checkpoint-site-s1` | T7–T8: ana sayfa/keşfet + ikon |
| `checkpoint-site-s2` | T9–T12: oy çekirdeği + demo |
| `checkpoint-site-s3` | T13–T15: link/talep |
| `checkpoint-site-s4` | T16–T20: oturum + editör paneli |
| `checkpoint-site-s5` | T21–T23: moderasyon |
| `checkpoint-site-s6` | T24–T27: admin + arşiv + yayın |
| `checkpoint-site-s7` | T28–T30: kamusal metin + QA + doküman |

### 10.2 Geri dönüş

```powershell
git tag --list 'checkpoint-site-*'
git log --oneline --decorate -30
git reset --hard checkpoint-site-sN   # dikkat: izlenen dosyaları geri alır
```

İzlenmeyen yedekler (`.superpowers/`, `site/.env.local`, `.pglite-dev/`) korunur; `git clean -fd` kullanılmaz.

### 10.3 İnceleme paketi

Kullanıcıya sunulacaklar:
- Commit aralığı: `4a27c25..HEAD`.
- Etiket listesi ve her dilimin tek satır özeti.
- Test/tip/build/QA dumanı sonuçları.
- Bilinen açık riskler ve manuel işler.
- `docs/SITE_QA.md` otomatik satırları.
- Push edilmediği açıkça belirtilir.

---

## 11. Hemen sonraki adımlar

1. **T7'yi dispatch et:** `task-7-brief.md` + bu plan §S1/T7 + mevcut HEAD `4a27c25`.
2. T7 bitince diff/test/build denetle; commit `site: ana sayfa ve kesfet`.
3. **T8 öncesi yedek:** ikon diff'i ve dosyaları `.superpowers/.../task-8-oncesi/` altına al; ikon dışı mantık varsa dur.
4. T8'i `canvas-design` ile dispatch et; ikon testi + kök build + site build; commit; `checkpoint-site-s1`.
5. S2'ye geçmeden S1 manuel dumanını tamamla; defteri güncelle.
6. S2–S7'yi aynı döngüyle sürdür; her dilimde checkpoint etiketi; push yok.

---

## 12. Tanım: bitti

Bir görev “bitti” sayılır, şu koşullar sağlandığında:

- [ ] Brief'teki tüm adımlar uygulandı.
- [ ] Yeni test önce kırmızıydı, sonra yeşil.
- [ ] Tam suite yeşil; tip temiz; build başarılı.
- [ ] Diff yalnızca görev dosyalarını içeriyor.
- [ ] Commit atıldı; hash rapora yazıldı.
- [ ] Defter güncellendi.

Bir dilim “bitti” sayılır when:

- [ ] Tüm görevleri bitti.
- [ ] Dilim manuel akışları geçti.
- [ ] `git status --short` beklenen durumda.
- [ ] Checkpoint etiketi basıldı.
- [ ] Deftere commit aralığı ve doğrulama sonucu yazıldı.

Site “bitti” sayılır when:

- [ ] S1–S7 etiketleri mevcut.
- [ ] Tüm otomatik testler, tip ve build yeşil.
- [ ] QA dumanı geçti.
- [ ] Dokümanlar kodla uyumlu.
- [ ] Manuel/store işleri kullanıcıya devredildi.
- [ ] Push edilmedi; kullanıcı incelemesi bekliyor.
