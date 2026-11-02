# YouTube Filter Store — Site Planı (Güncel Özet)

> Durum: **2026-10-27 itibarıyla site S1–S7 kodlandı (yerel).** Testler, tip denetimi ve üretim derlemesi yeşil. Docker/PostgreSQL/Caddy üretim denemesi, gerçek tarayıcı QA'sı, ekran görüntüleri ve mağaza yüklemesi kullanıcıda.
> Bu belge artık kısa güncel özettir. Eski ayrıntılı site planı tarihseldir; yerini aşağıdaki bağlayıcı belgelere bırakmıştır.

## Bağlayıcı kaynaklar

1. [`docs/SISTEM_TASARIMI.md`](SISTEM_TASARIMI.md) — ürün kuralları (bağlayıcı).
2. [`docs/superpowers/specs/2026-10-27-site-tasarimi.md`](superpowers/specs/2026-10-27-site-tasarimi.md) — site tasarımı.
3. [`docs/superpowers/plans/2026-10-27-site-uygulama.md`](superpowers/plans/2026-10-27-site-uygulama.md) ve [`2026-10-28-site-kalan-dilimler.md`](superpowers/plans/2026-10-28-site-kalan-dilimler.md) — uygulama planları.
4. [`docs/SITE_QA.md`](SITE_QA.md) — otomatik ve manuel QA listesi.
5. [`site/README.md`](../site/README.md) — çalıştırma, komutlar ve dağıtım.

Çelişki varsa sıra: `SISTEM_TASARIMI.md` → site tasarımı → uygulama planları.

## Mimari

- Next.js (App Router) + React + TypeScript; PostgreSQL + Drizzle ORM.
- Üretim: Docker Compose (`site`, `postgres`, `caddy`); HTTPS Caddy'de; `DATABASE_URL` zorunlu; geçişler `npm run migrate`.
- PGlite yalnızca yerel geliştirme ve testte; üretim imajında yok.
- Yerel fontlar `next/font/local` ile gelir; üçüncü taraf font/analitik/reklam yok.
- `db.json` yalnızca admin yayınıyla güncellenir; eklenti siteye bağlanmaz, veri aylık mağaza güncellemesiyle gelir.

## Ürün kuralları (özet)

- **Anonim ziyaretçi oyu:** hesap gerekmez; HttpOnly çerez kimliğiyle hedef + konu/etiket başına tek oy; oy değiştirilebilir.
- **Hesaplar:** yalnızca Editör ve Admin. Herkese açık kayıt, e-posta doğrulama veya ziyaretçi hesabı yok.
- **Yetkiler:** Editör kayıt ekler, talep kuyruğunu işler ve moderasyon yapar. Admin ek olarak hesapları yönetir, metadata düzeltir, arşivler/geri getirir ve `db.json` yayınlar. Taksonomi salt okunurdur.
- **Eşik:** en az **3 toplam oy** (up + kararsız + down). Eşik altı kayıt/etiket değerlendirilmez ve `db.json`'a yazılmaz.
- **İki geri alma bayrağı:** ziyaretçi geri alması geçicidir; moderasyon geri alması kalıcıdır ve kayıt altındadır. Geri alınan oy silinmez, hesaba girmez.
- **Kilit:** kilitliyken yeni oy kabul edilir ama sonuç donar; `db.json`'a kilit anındaki sonuç yazılır. Kilit açılınca sonuç güncel oylardan hesaplanır.
- **Engel:** çerez veya ağ (IP özeti) engeli konabilir. Panelde yalnızca `çerez:xxxxxxxx` / `ağ:xxxxxxxx` takma etiketleri görünür; ham kimlik istemciye gitmez.
- **Arşiv:** içerik silinmez, arşivlenir. Arşivli kayıt kamusal listeden ve `db.json`'dan çıkar; oyları, kilidi ve moderasyon kayıtları korunur. Aynı link yeniden eklenince geri getirilir.
- **Video/kanal ayrımı:** video eklemek kanal satırı oluşturmaz. Video kaydı kanal kimliği, adı, handle'ı ve `kanal_avatar` alanını taşır; kanal ayrıca eklenir.
- **Gizlilik:** çerez kimliği ve HMAC-SHA256 IP özeti saklanır; düz IP saklanmaz. Oy IP özeti 30 gün sonra temizlenir; aktif engel varsa engel süresince tutulur. Site metni `/gizlilik`, eklenti metni `docs/GIZLILIK.md`; iki metin ayrıdır.
- **Rapor uç noktası yok:** site v1'de “Bildir” formu veya uç noktası bulunmaz; iletişim GitHub Issues üzerindendir.

## Dilim durumu

| Dilim | Kapsam | Durum |
|---|---|---|
| S1 | Kamusal kabuk, tasarım sistemi, ana sayfa, keşfet, ikon | ✅ kodlandı |
| S2 | Anonim oy çekirdeği, çerez/hız sınırı, oy API'leri, içerik sayfası | ✅ kodlandı |
| S3 | Link çözümleme, metadata (API/oEmbed/HTML fallback), ekleme talebi | ✅ kodlandı |
| S4 | Oturum, editör paneli, kayıt ekleme, talep kuyruğu | ✅ kodlandı |
| S5 | Moderasyon, iki geri alma, kilit, engel, bakım | ✅ kodlandı |
| S6 | Çok admin, arşiv/geri getirme, metadata düzeltme, `db.json` yayını | ✅ kodlandı |
| S7 | Gizlilik/koşullar/iletişim, hata sayfaları, erişilebilirlik, QA | ✅ kodlandı |

## Yerel doğrulama

```powershell
cd site
npm test
npm run tip
npm run build
npm run dev
# Ayrı terminal:
npm run qa:duman
```

Kurulum, `.env` örneği, demo veri, ilk admin ve üretim Docker adımları `site/README.md` içindedir.

## Açık işler (kullanıcıda)

- 1280×800 ve 390×844 gerçek tarayıcı QA'sı, ekran görüntüleri.
- Ekran okuyucu, kontrast ve `prefers-reduced-motion` manuel kontrolü.
- En az 10 video + 10 kanal linkiyle gerçek metadata kontrolü.
- Docker Compose + PostgreSQL + Caddy üretim denemesi ve yedek/geri yükleme.
- Gerçek eklentiye indirilen `db.json` dosyasını yükleme; mağaza yüklemesi.
- Gizlilik/koşullar metninin hukuki incelemesi.

## Tarihsel not

Bu dosyanın eski, uzun sürümü (v5, 2026-10-22) tarihsel plandı. “Avatar yok”, “ziyaretçi hesabı”, “tek admin”, “oy için hesap gerekir” ve “site içi rapor” gibi eski/çelişkili kararlar bu özette taşınmaz. Güncel bağlayıcı kaynaklar yukarıdaki listedir.
