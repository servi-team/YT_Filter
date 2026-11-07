# `db.json` şeması (sema 1)

> Düzenleme sitesi ile eklenti arasındaki **tek sözleşme**. Bu dosya `src/core/db.js` ve `src/core/taxonomy.js → kayitDogrula` ile birebir uyumlu tutulmalıdır.
> Güncelleme: 2026-10-22 — **dışa aktarma kuralına** upvote ile beraberlik çözümü, 3 oy eşiği ve moderasyon (geri alınan oy, kayıt kilidi) eklendi. Şema alanları ve `sema` numarası (1) **değişmedi**; eklenti tarafında değişiklik gerekmez.
> Önceki güncelleme: 2026-10-21 — bilinmeyen konu/etiket kimlikleri için ileri uyumluluk kuralı; `olusturma` alanı ve `avatar: null` belgelendi.

## Üst düzey yapı

```json
{
  "sema": 1,
  "veriSurumu": 12,
  "kanallar": [
    {
      "id": "UCxxxxxxxxxxxxxxxxxxxxxx",
      "handle": "@ornekkanal",
      "ad": "Örnek Kanal",
      "avatar": "https://…",
      "anaKonu": "teknoloji",
      "yanKonular": ["oyun", "haber"],
      "etiketler": ["ai", "argo"],
      "kararsizKonular": ["eglence"],
      "kararsizEtiketler": ["kufur"]
    }
  ],
  "videolar": [
    {
      "id": "dQw4w9WgXcQ",
      "anaKonu": "muzik",
      "yanKonular": [],
      "etiketler": [],
      "kararsizKonular": [],
      "kararsizEtiketler": []
    }
  ]
}
```

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `sema` | ✅ | Şema numarası. Şu an yalnızca `1` kabul edilir; başka değer → tüm dosya yok sayılır. |
| `veriSurumu` | ✅ | Tam sayı. Paketli ve kullanıcının içe aktardığı (`dbOverride`) veritabanından **büyük olan** kazanır; eşitlikte paketli kazanır. Site her yayında bir önceki sürümden **büyük** değer üretir. |
| `olusturma` | – | `YYYY-MM-DD` biçiminde tarih. Yalnızca metadata'dır; eklenti kararında kullanılmaz. |
| `kanallar[]`, `videolar[]` | – | Eksikse boş sayılır. |

## Kayıt alanları (kanal ve video için ortak)

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `id` | ✅ | **Kanal:** `UC` + 22 karakter (`[A-Za-z0-9_-]`). **Video:** 11 karakter. Geçersizse kayıt atlanır. |
| `handle` | – | Yalnızca kanal. `@` ile başlar, `[A-Za-z0-9._-]`. Yanlış biçimliyse kayıt atlanır. Eşleşmede küçük harfe çevrilir. |
| `ad`, `avatar` | – | Yalnızca kanal; arayüzde gösterilir. `avatar` bir HTTPS görsel URL'i **veya `null`** olabilir; `null`/yok/geçersizse tür simgesi gösterilir. |
| `anaKonu` | koşullu | Konu kimliği (`taxonomy.KONULAR`). **Düzenleme sitesi her zaman girer.** Oylamada hiçbir konu pozitif çıkmazsa (veya hiçbiri 3 oy eşiğini geçmezse) boş olabilir. |
| `yanKonular[]` | – | Konu kimlikleri. **Doluysa `anaKonu` zorunludur.** `anaKonu` burada tekrar edilemez. |
| `etiketler[]` | – | Kesinleşmiş (aktif) etiket kimlikleri (`taxonomy.ETIKETLER`). |
| `kararsizKonular[]` | – | Oylamada sonuç çıkmamış konular: **net toplam 0 ve toplam oy en az 3.** |
| `kararsizEtiketler[]` | – | Aynı, etiketler için. |

### Doğrulama kuralları (`kayitDogrula`)
1. **Katı doğrulama (site/editör):** bilinmeyen konu/etiket kimliği → hata.
2. **Eklenti içe aktarma (`dbKur`):** bilinmeyen kimlikler **yok sayılır** (kayıt düşürülmez); ana konu bilinmiyorsa yan konular da düşürülür, etiket/kararsız alanlardaki bilinen kimlikler korunur. Yok sayılanlar `sayac.yokSayilan` ve `uyarilar[]` ile raporlanır; kalan kayıt yeniden doğrulanır.
3. `yanKonular` doluyken `anaKonu` yok → hata.
4. `anaKonu` `yanKonular` içinde → hata.
5. Bir konu hem kesin (ana/yan) hem `kararsizKonular` içinde → hata. Etiket için de aynı.
6. Kayıtta hiçbir bilgi yok (ana konu, etiket, kararsız hepsi boş) → hata (“Kayıt boş”). Boş kayıt zaten “bilinmeyen” demektir, kayıt sayılmaz. Bilinmeyen kimlikler ayıklandıktan sonra kayıt boş kalırsa atlanır.

Geçersiz kayıt **tek başına atlanır**, dosyanın kalanı yüklenir. `dbKur(json).sayac` = `{kanal, video, atlanan, yokSayilan}`; ilk 10 hata `hatalar[]`, ilk 10 yok sayma uyarısı `uyarilar[]` içinde tutulur.
Aynı `id` iki kez gelirse **sonuncusu** geçerlidir.

## Eklentinin kaydı nasıl yorumladığı

| Kayıt durumu | Anlamı |
|---|---|
| Kayıt yok, ya da kayıt boş | **Bilinmeyen** |
| Herhangi bir bilgi var (ana konu, etiket **veya** yalnızca kararsız) | **İncelenmiş** — video ise kanala bakılmaz |
| `etiketler` boş ama konu var | “İncelendi, bayrak yok” → zararsız |
| `kararsiz*` dolu | Kararsız: Serbest’te izin, Orta’da kullanıcı seçimine göre, Katı’da (kullanıcı engelliyorsa) engel. Ayrıntı: `docs/SISTEM_TASARIMI.md` |

## Düzenleme sitesinin dışa aktarırken uyacağı oylama kuralı
Ham oylar sitede kalır; **eklentiye yalnızca sonuç gelir.** Kurallar `docs/SISTEM_TASARIMI.md` bölüm 5, 6 ve 7’dedir. Bir kayıt için her konu ve etiket şu sırayla değerlendirilir:

1. **Oylar:** Geri alınan (moderasyonla iptal edilen) oylar hesaba girmez.
2. **Asgari oy eşiği:** toplam oy (upvote + kararsız + downvote) **3’ten azsa** konu/etiket değerlendirilmez, yazılmaz (ana konu adayı da olamaz).
3. **Toplam** = upvote − downvote (kararsız oylar hariç).
4. **Sonuç:**
   - toplam > 0 → konu için ana/yan, etiket için `etiketler`;
   - toplam = 0 → `kararsizKonular` / `kararsizEtiketler` (eşiği geçtiği için en az 3 oy vardır);
   - toplam < 0 → yazılmaz.
5. **Ana konu** = en yüksek net puanlı pozitif konu. Beraberlikte sırayla: (a) **upvote sayısı fazla olan**, (b) hâlâ eşitse `taxonomy.KONULAR` sırasındaki ilk. Kazanamayan eşit konular yan konu olur.
6. Hiç pozitif konu yoksa `anaKonu` yazılmaz.
7. **Kayıt kapsamı:** Hiçbir konu/etiketi eşiği geçmemiş kayıt `db.json`’a **yazılmaz** (boş kayıt zaten hatadır, eklentide “bilinmeyen” sayılır).
8. **Kilitli kayıt:** Moderasyon kilidi olan kayıt için kilit anındaki sonuç yazılır; yeni oylar sonucu kilit açılana kadar değiştirmez.
9. Dışa aktarılan dosya yayından önce katı doğrulamadan (kural 1) ve eklentinin `dbKur` doğrulayıcısından geçer; geçmezse yayınlanmaz.

## Sürümleme
- Yeni **isteğe bağlı** alan eklemek şema numarasını değiştirmez. Eski eklenti sürümleri bilinmeyen alanı yok sayar; ancak **ana konusuz kaydı** eski doğrulama (“Ana konu zorunludur”) atlar.
- **Taksonomi kimlikleri kararlıdır:** yeni konu/etiket eklemek `sema` artırmaz. Eski eklenti bilinmeyen kimlikleri yok sayar (kaydı düşürmez) ve kalan bilinen alanlarla devam eder; bu yüzden site yeni kimlikler eklediğinde eski sürümdeki kullanıcılar veriyi tamamen kaybetmez. Bilinmeyen kimlik sayısı içe aktarmada kullanıcıya raporlanır. Yeni konu/etiket **listenin sonuna** eklenir; mevcut sıra değişmez (beraberlik kuralı bu sıraya dayanır).
- Alanı kaldırmak/anlamını değiştirmek → `sema` artırılır; eklenti eski/yeni şemayı ayırt eder (`DB_SEMA`).
- Eklentide içe aktarma (PR 7): dosya `sema` ve tam sayı `veriSurumu` için doğrulanır; geçersiz kayıtlar atlanır ve sayısı kullanıcıya gösterilir. `veriSurumu` paketli sürümden büyük değilse uyarı verilir (dosya saklanır; eşitlikte paketli kullanılır).
