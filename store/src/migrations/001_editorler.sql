-- Editörler ve oturumlar

CREATE TABLE editorler (
    id SERIAL PRIMARY KEY,
    kullanici_adi TEXT NOT NULL UNIQUE,
    ad TEXT NOT NULL,
    sifre_ozeti TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'editor' CHECK (rol IN ('admin', 'editor')),
    aktif BOOLEAN NOT NULL DEFAULT true,
    olusturulma TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- connect-pg-simple oturum deposu
CREATE TABLE oturumlar (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX oturumlar_expire_idx ON oturumlar (expire);
