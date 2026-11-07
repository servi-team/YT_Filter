/**
 * YouTube metadata çözücü. Data API anahtarı varsa birincil yol API'dir; yoksa
 * oEmbed (video) veya kanal sayfası HTML'i (kanal) kullanılır. Ağ hataları
 * kaydı engellemez: video/kanal kimliği her zaman döner, eksik alanlar null kalır.
 */
import type { LinkSonucu } from './youtube-link.ts';

export interface VideoMeta {
  tur: 'video';
  id: string;
  baslik: string | null;
  kanalId: string | null;
  kanalAdi: string | null;
  kanalHandle: string | null;
  kanalAvatar: string | null;
}

export interface KanalMeta {
  tur: 'kanal';
  id: string;
  ad: string | null;
  handle: string | null;
  avatar: string | null;
}

export type Meta = VideoMeta | KanalMeta;
export type MetaSonucu = Meta | { tur: 'hata'; neden: string };
export type MetaCozucu = (link: Exclude<LinkSonucu, { tur: 'hata' }>) => Promise<MetaSonucu>;

export interface MetaSecenekleri {
  fetch?: typeof fetch;
  apiKey?: string | null;
  kotaArtir?: (adet: number) => Promise<void>;
}

const KANAL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const KANAL_KIMLIK_HTML = /"channelId"\s*:\s*"(UC[A-Za-z0-9_-]{22})"/;
const ZAMAN_ASIMI_MS = 5000;
const API_KOK = 'https://www.googleapis.com/youtube/v3/';

interface ApiThumbnail {
  url?: string;
}

interface ApiSnippet {
  title?: string;
  channelId?: string;
  channelTitle?: string;
  channelHandle?: string;
  customUrl?: string;
  thumbnails?: Record<string, ApiThumbnail | undefined>;
}

interface ApiListe<T> {
  items?: T[];
}

interface ApiVideoOgesi {
  id?: string;
  snippet?: ApiSnippet;
}

interface ApiKanalOgesi {
  id?: string;
  snippet?: ApiSnippet;
}

interface OembedYaniti {
  title?: string;
  author_name?: string;
  author_url?: string;
}

function metin(deger: unknown): string | null {
  return typeof deger === 'string' && deger.trim() ? deger.trim() : null;
}

/** HTML varlıklarını yalnızca başlık/URL için gereken ölçüde çözer. */
function htmlCoz(deger: string): string {
  return deger
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function htmlMeta(html: string, ozellik: string): string | null {
  const kacis = ozellik.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const onceki = new RegExp(`<meta[^>]*\\bproperty=["']${kacis}["'][^>]*\\bcontent=["']([^"']*)["']`, 'i');
  const sonraki = new RegExp(`<meta[^>]*\\bcontent=["']([^"']*)["'][^>]*\\bproperty=["']${kacis}["']`, 'i');
  const eslesme = html.match(onceki) ?? html.match(sonraki);
  return eslesme ? htmlCoz(eslesme[1]) : null;
}

function canonicalAdresi(html: string): string | null {
  const onceki = html.match(/<link[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["']/i);
  const sonraki = html.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["']/i);
  const eslesme = onceki ?? sonraki;
  return eslesme ? htmlCoz(eslesme[1]) : null;
}

/** `@handle` biçimine getirir; boşsa null. */
function handleBicimle(deger: unknown): string | null {
  const temiz = metin(deger);
  if (!temiz) return null;
  return temiz.startsWith('@') ? temiz : `@${temiz}`;
}

/** author_url veya canonical içindeki ilk `/@handle` parçasını çıkarır. */
function handleAdresten(adres: string | null | undefined): string | null {
  if (!adres) return null;
  try {
    const u = new URL(adres);
    const ilk = u.pathname.split('/').filter(Boolean)[0];
    return ilk && ilk.startsWith('@') ? ilk : null;
  } catch {
    return null;
  }
}

function avatarBul(snippet: ApiSnippet | undefined): string | null {
  const kapaklar = snippet?.thumbnails;
  if (!kapaklar) return null;
  return metin(kapaklar.high?.url) ?? metin(kapaklar.medium?.url) ?? metin(kapaklar.default?.url);
}

async function kotaSay(kotaArtir: MetaSecenekleri['kotaArtir'], adet: number): Promise<void> {
  if (!kotaArtir) return;
  try {
    await kotaArtir(adet);
  } catch {
    // Kota kaydı başarısız olsa da metadata sonucu bozulmaz.
  }
}

function apiAdresi(yol: string, parametreler: Record<string, string>): string {
  const adres = new URL(yol, API_KOK);
  for (const [ad, deger] of Object.entries(parametreler)) adres.searchParams.set(ad, deger);
  return adres.toString();
}

/** Data API isteği; her denemede kotayı artırır, hata durumunda null döner. */
async function apiGet<T>(
  istek: typeof fetch,
  yol: string,
  parametreler: Record<string, string>,
  kotaArtir: MetaSecenekleri['kotaArtir'],
): Promise<T | null> {
  await kotaSay(kotaArtir, 1);
  try {
    const yanit = await istek(apiAdresi(yol, parametreler), {
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      headers: { accept: 'application/json' },
    });
    if (!yanit.ok) return null;
    return await yanit.json() as T;
  } catch {
    return null;
  }
}

async function htmlGet(istek: typeof fetch, adres: string): Promise<string | null> {
  try {
    const yanit = await istek(adres, {
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      headers: { accept: 'text/html' },
    });
    if (!yanit.ok) return null;
    return await yanit.text();
  } catch {
    return null;
  }
}

async function apiVideoMeta(
  istek: typeof fetch,
  id: string,
  apiKey: string,
  kotaArtir: MetaSecenekleri['kotaArtir'],
): Promise<VideoMeta | null> {
  const liste = await apiGet<ApiListe<ApiVideoOgesi>>(istek, 'videos', {
    part: 'snippet',
    id,
    key: apiKey,
  }, kotaArtir);
  const snippet = liste?.items?.[0]?.snippet;
  if (!snippet) return null;

  const kanalId = metin(snippet.channelId);
  let kanalHandle = handleBicimle(snippet.channelHandle);
  let kanalAvatar: string | null = null;

  if (kanalId) {
    const kanalListesi = await apiGet<ApiListe<ApiKanalOgesi>>(istek, 'channels', {
      part: 'snippet',
      id: kanalId,
      key: apiKey,
    }, kotaArtir);
    const kanalSnippet = kanalListesi?.items?.[0]?.snippet;
    if (kanalSnippet) {
      kanalHandle = handleBicimle(kanalSnippet.customUrl) ?? kanalHandle;
      kanalAvatar = avatarBul(kanalSnippet);
    }
  }

  return {
    tur: 'video',
    id,
    baslik: metin(snippet.title),
    kanalId,
    kanalAdi: metin(snippet.channelTitle),
    kanalHandle,
    kanalAvatar,
  };
}

async function apiKanalMeta(
  istek: typeof fetch,
  parametreler: Record<string, string>,
  apiKey: string,
  kotaArtir: MetaSecenekleri['kotaArtir'],
): Promise<KanalMeta | null> {
  const liste = await apiGet<ApiListe<ApiKanalOgesi>>(istek, 'channels', {
    part: 'snippet',
    ...parametreler,
    key: apiKey,
  }, kotaArtir);
  const oge = liste?.items?.[0];
  const id = metin(oge?.id);
  if (!id || !KANAL_ID.test(id)) return null;

  return {
    tur: 'kanal',
    id,
    ad: metin(oge?.snippet?.title),
    handle: handleBicimle(oge?.snippet?.customUrl),
    avatar: avatarBul(oge?.snippet),
  };
}

async function videoCoz(
  istek: typeof fetch,
  id: string,
  apiKey: string | null,
  kotaArtir: MetaSecenekleri['kotaArtir'],
): Promise<MetaSonucu> {
  if (apiKey) {
    const apiSonuc = await apiVideoMeta(istek, id, apiKey, kotaArtir);
    if (apiSonuc) return apiSonuc;
  }

  const oembed = await apiGet<OembedYaniti>(
    istek,
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
    {},
    undefined,
  );

  return {
    tur: 'video',
    id,
    baslik: metin(oembed?.title),
    kanalId: null,
    kanalAdi: metin(oembed?.author_name),
    kanalHandle: handleAdresten(oembed?.author_url),
    kanalAvatar: null,
  };
}

async function kanalKimlikCoz(
  istek: typeof fetch,
  id: string,
  apiKey: string | null,
  kotaArtir: MetaSecenekleri['kotaArtir'],
): Promise<MetaSonucu> {
  if (apiKey) {
    const apiSonuc = await apiKanalMeta(istek, { id }, apiKey, kotaArtir);
    if (apiSonuc) return apiSonuc;
  }

  const html = await htmlGet(istek, `https://www.youtube.com/channel/${id}`);
  if (!html) return { tur: 'kanal', id, ad: null, handle: null, avatar: null };

  const bulunan = html.match(KANAL_KIMLIK_HTML)?.[1];
  const kanalId = bulunan && KANAL_ID.test(bulunan) ? bulunan : id;
  const canonical = canonicalAdresi(html);

  return {
    tur: 'kanal',
    id: kanalId,
    ad: htmlMeta(html, 'og:title'),
    handle: handleAdresten(canonical),
    avatar: htmlMeta(html, 'og:image'),
  };
}

async function handleCoz(
  istek: typeof fetch,
  handle: string,
  apiKey: string | null,
  kotaArtir: MetaSecenekleri['kotaArtir'],
): Promise<MetaSonucu> {
  if (apiKey) {
    const apiSonuc = await apiKanalMeta(istek, { forHandle: handle }, apiKey, kotaArtir);
    if (apiSonuc) return apiSonuc;
  }

  const html = await htmlGet(istek, `https://www.youtube.com/${handle}`);
  if (!html) return { tur: 'hata', neden: 'Kanal kimliği bulunamadı.' };

  const bulunan = html.match(KANAL_KIMLIK_HTML)?.[1];
  if (!bulunan || !KANAL_ID.test(bulunan)) {
    return { tur: 'hata', neden: 'Kanal kimliği bulunamadı.' };
  }

  const canonical = canonicalAdresi(html);

  return {
    tur: 'kanal',
    id: bulunan,
    ad: htmlMeta(html, 'og:title'),
    handle: handleAdresten(canonical) ?? handle,
    avatar: htmlMeta(html, 'og:image'),
  };
}

export async function metaCoz(
  link: Exclude<LinkSonucu, { tur: 'hata' }>,
  secenek: MetaSecenekleri = {},
): Promise<MetaSonucu> {
  const istek = secenek.fetch ?? globalThis.fetch;
  const apiKey = secenek.apiKey ?? null;
  const kotaArtir = secenek.kotaArtir;

  if (link.tur === 'video') return videoCoz(istek, link.id, apiKey, kotaArtir);
  if ('handle' in link) return handleCoz(istek, link.handle, apiKey, kotaArtir);
  return kanalKimlikCoz(istek, link.id, apiKey, kotaArtir);
}
