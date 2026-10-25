-- Dışa aktarılan veritabanı sürümleri (eklentiye eklenen JSON dosyaları)
-- icerik JSON (JSONB değil): alan sırası korunur, böylece sürümler arası farklar okunaklı kalır

CREATE TABLE disa_aktarimlar (
    id SERIAL PRIMARY KEY,
    surum TEXT NOT NULL UNIQUE,
    olusturulma TIMESTAMPTZ NOT NULL DEFAULT now(),
    editor_id INTEGER REFERENCES editorler (id),
    video_sayisi INTEGER NOT NULL,
    kanal_sayisi INTEGER NOT NULL,
    icerik JSON NOT NULL
);
