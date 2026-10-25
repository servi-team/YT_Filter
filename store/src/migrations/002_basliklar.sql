-- Konu ve etiketler ("başlıklar")
-- anahtar, dışa aktarılan JSON'daki ve eklenti ayarlarındaki kalıcı kimliktir; oluşturulduktan sonra değişmez.

CREATE TABLE basliklar (
    id SERIAL PRIMARY KEY,
    tur TEXT NOT NULL CHECK (tur IN ('konu', 'etiket')),
    anahtar TEXT NOT NULL UNIQUE CHECK (anahtar ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    ad TEXT NOT NULL,
    aciklama TEXT NOT NULL DEFAULT '',
    sira INTEGER NOT NULL DEFAULT 0,
    aktif BOOLEAN NOT NULL DEFAULT true,
    olusturulma TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO basliklar (tur, anahtar, ad, aciklama, sira) VALUES
    ('konu', 'ders-okul', 'Ders / Okul', 'Okul müfredatı, konu anlatımı, sınav hazırlığı, üniversite dersleri', 1),
    ('konu', 'egitici', 'Eğitici', 'Belgesel, nasıl yapılır videoları, ders harici kurslar (dil dahil)', 2),
    ('konu', 'bilim', 'Bilim', 'Akademik/araştırma içeriği, popüler bilim, uzay, doğa bilimleri', 3),
    ('konu', 'teknoloji', 'Teknoloji', 'Yazılım, donanım, yapay zekâ, inceleme kanalları', 4),
    ('konu', 'haber', 'Haber / Güncel olaylar', 'Haber kanalları, siyasi yorum, gündem', 5),
    ('konu', 'din', 'Din / Maneviyat', 'Dini sohbetler, vaazlar, manevi içerik', 6),
    ('konu', 'eglence', 'Eğlence / Mizah', 'Komedi, skeç, meme, tepki videoları', 7),
    ('konu', 'oyun', 'Oyun', 'Oyun oynanışı, oyun incelemeleri, espor', 8),
    ('konu', 'spor', 'Spor', 'Futbol, basketbol, fitness, spor haberleri', 9),
    ('konu', 'muzik', 'Müzik', 'Müzik videoları, cover, müzik analizi', 10),
    ('konu', 'film-sanat', 'Film / Dizi / Sanat', 'Sinema, dizi, çizim, sanat', 11),
    ('konu', 'yasam', 'Yaşam / Vlog', 'Günlük vlog, yemek, seyahat, yaşam tarzı', 12),
    ('konu', 'finans', 'Finans / Girişim', 'Borsa, kripto, iş, ekonomi', 13),
    ('konu', 'saglik', 'Sağlık / Kişisel gelişim', 'Sağlık, psikoloji, motivasyon, kişisel gelişim', 14),
    ('konu', 'cocuk', 'Çocuk içerikleri', 'Çocuklara yönelik animasyon/şarkı kanalları', 15),
    ('etiket', 'kufur', 'Küfürlü içerik', '', 1),
    ('etiket', 'argo', 'Argolu içerik', '', 2),
    ('etiket', 'ai', 'AI ile üretilmiş içerik', '', 3),
    ('etiket', 'kumar', 'Kumar / bahis', '', 4),
    ('etiket', 'siddet', 'Şiddet', '', 5),
    ('etiket', 'zararli', 'Zararlı / uygunsuz içerik', '', 6),
    ('etiket', 'olumsuz-ornek', 'Olumsuz örnek', '', 7),
    ('etiket', 'spam', 'Spam / sahte içerik', '', 8);
