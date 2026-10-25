-- Oylanacak kanal ve videolar
-- youtube_id: video için 11 karakterlik ID (harf büyüklüğü korunur), kanal için küçük harfli @handle

CREATE TABLE icerikler (
    id SERIAL PRIMARY KEY,
    tur TEXT NOT NULL CHECK (tur IN ('video', 'kanal')),
    youtube_id TEXT NOT NULL,
    baslik TEXT,
    kanal_adi TEXT,
    kanal_handle TEXT,
    kapak_url TEXT,
    ekleyen_id INTEGER REFERENCES editorler (id),
    eklenme TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tur, youtube_id)
);

CREATE INDEX icerikler_eklenme_idx ON icerikler (eklenme DESC);
