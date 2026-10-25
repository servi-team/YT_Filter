-- Oylar: her editör, her içerik ve başlık için tek güncel oy
-- oy: 1 = upvote, 0 = kararsız, -1 = downvote

CREATE TABLE oylar (
    icerik_id INTEGER NOT NULL REFERENCES icerikler (id) ON DELETE CASCADE,
    baslik_id INTEGER NOT NULL REFERENCES basliklar (id) ON DELETE CASCADE,
    editor_id INTEGER NOT NULL REFERENCES editorler (id),
    oy SMALLINT NOT NULL CHECK (oy IN (-1, 0, 1)),
    guncellenme TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (icerik_id, baslik_id, editor_id)
);

-- Oy geçmişi (yalnızca eklenir): eşitlikte "o puana ilk ulaşan" kuralı için
-- oy NULL ise editör oyunu geri almıştır
CREATE TABLE oy_gecmisi (
    id BIGSERIAL PRIMARY KEY,
    icerik_id INTEGER NOT NULL REFERENCES icerikler (id) ON DELETE CASCADE,
    baslik_id INTEGER NOT NULL REFERENCES basliklar (id) ON DELETE CASCADE,
    editor_id INTEGER NOT NULL REFERENCES editorler (id),
    oy SMALLINT CHECK (oy IS NULL OR oy IN (-1, 0, 1)),
    zaman TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX oy_gecmisi_icerik_idx ON oy_gecmisi (icerik_id, zaman, id);
