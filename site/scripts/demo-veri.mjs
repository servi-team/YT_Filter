// Geliştirme/test ortamı için örnek kanal, video ve oy verisi ekler.
// Üretimde çalışmaz; tablolarda kayıt varsa hiçbir şey yazmadan çıkar.
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

if (process.env.NODE_ENV === 'production') {
  console.error('Demo veri üretim ortamında çalıştırılamaz.');
  process.exit(1);
}

const { db, veritabaniKapat } = await import('../lib/db.ts');
const { kanallar, videolar } = await import('../db/schema.ts');
const { oyKaydet } = await import('../lib/oy-servisi.ts');

const KANALLAR = [
  {
    id: 'UCsXVk37bltHxD1rDPwtNM8Q',
    handle: '@kurzgesagt',
    ad: 'Kurzgesagt – In a Nutshell',
    avatar: null,
  },
  {
    id: 'UCuAXFkgsw1L7xaCfnd5JJOw',
    handle: '@RickAstleyYT',
    ad: 'Rick Astley',
    avatar: null,
  },
];

const VIDEOLAR = [
  {
    id: 'h6fcK_fRYaI',
    baslik: 'The Egg – A Short Story',
    kanalId: 'UCsXVk37bltHxD1rDPwtNM8Q',
    kanalAdi: 'Kurzgesagt – In a Nutshell',
    kanalHandle: '@kurzgesagt',
    kanalAvatar: null,
  },
  {
    id: 'dQw4w9WgXcQ',
    baslik: 'Never Gonna Give You Up',
    kanalId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
    kanalAdi: 'Rick Astley',
    kanalHandle: '@RickAstleyYT',
    kanalAvatar: null,
  },
];

// 6 tarayıcı: ana video ve kanalda eşik üstü konular, ikinci kayıtlarda
// eşik altı etiket/konu örnekleri oluşturur.
const OYLAR = [
  ...['demo-tarayici-1', 'demo-tarayici-2', 'demo-tarayici-3', 'demo-tarayici-4'].map((tarayiciId) => ({
    hedefTuru: 'video', hedefId: 'h6fcK_fRYaI', ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId,
  })),
  ...['demo-tarayici-5', 'demo-tarayici-6'].map((tarayiciId) => ({
    hedefTuru: 'video', hedefId: 'h6fcK_fRYaI', ogeTuru: 'konu', ogeId: 'spor', deger: 'down', tarayiciId,
  })),
  ...['demo-tarayici-1', 'demo-tarayici-2', 'demo-tarayici-3', 'demo-tarayici-4'].map((tarayiciId) => ({
    hedefTuru: 'kanal', hedefId: 'UCsXVk37bltHxD1rDPwtNM8Q', ogeTuru: 'konu', ogeId: 'muzik', deger: 'up', tarayiciId,
  })),
  ...['demo-tarayici-5', 'demo-tarayici-6'].map((tarayiciId) => ({
    hedefTuru: 'kanal', hedefId: 'UCsXVk37bltHxD1rDPwtNM8Q', ogeTuru: 'etiket', ogeId: 'ai', deger: 'up', tarayiciId,
  })),
  ...['demo-tarayici-1', 'demo-tarayici-2'].map((tarayiciId) => ({
    hedefTuru: 'video', hedefId: 'dQw4w9WgXcQ', ogeTuru: 'konu', ogeId: 'muzik', deger: 'up', tarayiciId,
  })),
  ...['demo-tarayici-3', 'demo-tarayici-4'].map((tarayiciId) => ({
    hedefTuru: 'kanal', hedefId: 'UCuAXFkgsw1L7xaCfnd5JJOw', ogeTuru: 'etiket', ogeId: 'ai', deger: 'up', tarayiciId,
  })),
];

let veritabani;
try {
  veritabani = await db();

  const mevcutKanal = await veritabani.select({ id: kanallar.id }).from(kanallar).limit(1);
  const mevcutVideo = await veritabani.select({ id: videolar.id }).from(videolar).limit(1);
  if (mevcutKanal.length || mevcutVideo.length) {
    console.log('Demo veri zaten var.');
  } else {
    await veritabani.insert(kanallar).values(KANALLAR);
    await veritabani.insert(videolar).values(VIDEOLAR);
    for (const oy of OYLAR) await oyKaydet(veritabani, oy);
    console.log(`Demo veri eklendi: ${KANALLAR.length} kanal, ${VIDEOLAR.length} video, ${OYLAR.length} oy.`);
  }
} finally {
  await veritabaniKapat();
}
