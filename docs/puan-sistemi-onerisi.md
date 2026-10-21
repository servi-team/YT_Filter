# YouTube Filter Store - Puan ve Oylama Sistemi Dokümantasyonu

> **Durum: uygulama notu (2026-10-21).** Bağlayıcı kaynak `docs/SISTEM_TASARIMI.md`'dir. Onaylanan kurallar: ana konu net puan (SISTEM #1), beraberlikte `KONULAR` sırası (#2), kararsız = net 0 + en az bir oy (#3), asgari 3 oy (#18), beyaz liste mutlak (#19). Uyum notları: `docs/SITE_HAZIRLIK.md` bölüm 8.

Bu doküman, **YouTube Filter Store** platformundaki içerik sınıflandırma (konu ve etiket seçimi) mekanizmasının puanlama, oy hesaplama ve sonuç belirleme mantığını açıklamaktadır.

---

## 1. Genel Mantık ve Oylama Türleri

Platformda kullanıcılar, önerilen konu ve etiketler üzerinde üç farklı oy türü kullanarak katkıda bulunabilirler:

*   **Upvote (Yeşil - Olumlu Oy):** İlgili konu veya etiket içeriğe uygun olduğunda verilir. Her upvote puanı **+1** olarak eklenir.
*   **Kararsız (Sarı - Nötr Oy):** Emin olunmadığı durumlarda veya nötr kalmak için kullanılır. Her kararsız oy puanı **0** olarak değerlendirilir.
*   **Downvote (Kırmızı - Olumsuz Oy):** İlgili konu veya etiket içeriğe uygun değilse verilir. Her downvote puanı **-1** olarak hesaba katılır.

### Toplam Oy Hesaplama Formülü
$$\text{Toplam Puan} = (\text{Upvote Sayısı} \times +1) + (\text{Kararsız Sayısı} \times 0) + (\text{Downvote Sayısı} \times -1)$$

---

## 2. Konu Seçimi Puanlama Tablosu

İçerikler için belirlenen kategoriler ve örnek oylama dağılımları şu şekildedir:

| Konu | Upvote ($+1$) | Kararsız ($0$) | Downvote ($-1$) | Toplam Puan | Açıklama / Durum |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Teknoloji** | $25$ | $3$ | $-2$ | **$+23$** | En yüksek net puan → ana konu |
| **Haber** | $10$ | $7$ | $-5$ | **$+5$** | Yan konu adayı |
| **Müzik** | $0$ | $0$ | $-30$ | **$-30$** | Uygun görülmeyen konu |
| **Eğlence** | $3$ | $0$ | $-3$ | **$0$** | Kararsız (en az bir oy var) |
| **Spor** | $0$ | $0$ | $-30$ | **$-30$** | Uygun görülmeyen konu |
| **Oyun** | $30$ | $3$ | $-10$ | **$+20$** | Yüksek puanlı yan konu adayı |

### Konu Sonuçlarının Belirlenmesi
*   **Asgari oy eşiği:** Bir konu değerlendirilmesi için toplam oy (up + kararsız + down) **en az 3** olmalıdır (SISTEM #18). Eşik altındaki konu hiçbir alana yazılmaz.
*   **Ana Konu:** Pozitif net puana sahip konular arasından **en yüksek net puanlı** konu seçilir (SISTEM #1 onaylandı). Örnek: *Teknoloji* (+23).
*   **Yan Konular:** Ana konunun ardından pozitif net puanı olan diğer konular yan konu olarak eklenir (örnek: *Oyun, Haber*).
*   **Kararsız:** Net puanı **0** olan ve **en az 3 oy** almış konu `kararsizKonular`'a yazılır (*Eğlence*, 6 oy). Hiç oy almamış (0/0/0) konu kayda girmez (SISTEM #3).
*   **Elenecekler:** Net puanı **negatif** olanlar veya toplam oyu 3'ün altında olanlar yazılmaz (*Müzik, Spor*).
*   **Beraberlik:** Aynı net puandaki konularda `taxonomy.KONULAR` sırasındaki ilk konu esas alınır (SISTEM #2 onaylandı). "İlk kullanılan oy" belirlenimci değildir; kullanılmamalı.

---

## 3. Etiket Seçimi Puanlama Tablosu

İçeriğin niteliğini belirten etiketler için uygulanan oylama sistemi:

| Etiket | Upvote ($+1$) | Kararsız ($0$) | Downvote ($-1$) | Toplam Puan | Açıklama / Durum |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Zararlı** | $0$ | $0$ | $-30$ | **$-30$** | Kabul görmeyen etiket |
| **Spam** | $0$ | $0$ | $-30$ | **$-30$** | Kabul görmeyen etiket |
| **Olumsuz Örnek** | $0$ | $0$ | $-30$ | **$-30$** | Kabul görmeyen etiket |
| **AI ile oluşturulmuş** | $10$ | $7$ | $-5$ | **$+5$** | Seçilen etiketlerden biri (22 oy) |
| **Argo** | $1$ | $0$ | $0$ | **$+1$** | Eşik altı (1 oy) → aktif değil |
| **Küfür** | $5$ | $5$ | $-5$ | **$0$** | Kararsız (15 oy) |

### Etiket Sonuçlarının Belirlenmesi
*   **Asgari oy eşiği:** Toplam oy (up + kararsız + down) **en az 3** olmalıdır (SISTEM #18). Eşik altındaki etiket yazılmaz (*Argo*, 1 oy).
*   Pozitif net puana sahip ve eşiği geçen etiketler aktif etiketler arasına eklenir (örnek: *AI ile oluşturulmuş*, 22 oy).
*   Net puanı **0** olan ve en az 3 oy almış etiket `kararsizEtiketler`'e yazılır (*Küfür*, 15 oy; SISTEM #3).
*   Net puanı **negatif** olanlar (Zararlı, Spam, Olumsuz Örnek) yazılmaz.