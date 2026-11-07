/**
 * Yapıştırılan YouTube linkinden kanonik kimlik çıkarır. Ağ kullanmaz (ad/avatar ayrı adımdır, Faz 3).
 * Video yalnızca videoya, kanal yalnızca kanala bağlanır; kanal oyları videoya yansımaz.
 */
export type LinkSonucu =
  | { tur: 'video'; id: string }
  | { tur: 'kanal'; id: string }            // UC… kanal kimliği
  | { tur: 'kanal'; handle: string }        // @handle (küçük harfe çevrilmez; karşılaştırma küçük harfle yapılır)
  | { tur: 'hata'; neden: string };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const KANAL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const HANDLE = /^@[A-Za-z0-9._-]+$/;
const HOSTLAR = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);

export function linkCoz(girdi: string): LinkSonucu {
  let metin = String(girdi ?? '').trim();
  if (!metin) return { tur: 'hata', neden: 'Link boş.' };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(metin)) metin = 'https://' + metin;

  let u: URL;
  try { u = new URL(metin); } catch { return { tur: 'hata', neden: 'Geçerli bir link değil.' }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { tur: 'hata', neden: 'Yalnızca http/https linkleri kabul edilir.' };

  const host = u.hostname.toLowerCase();
  const parcalar = u.pathname.split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch { return p; } });

  if (host === 'youtu.be') {
    return VIDEO_ID.test(parcalar[0] ?? '') ? { tur: 'video', id: parcalar[0] } : { tur: 'hata', neden: 'youtu.be linkinde video kimliği yok.' };
  }
  if (!HOSTLAR.has(host)) return { tur: 'hata', neden: 'Bu bir YouTube linki değil.' };

  const ilk = parcalar[0] ?? '';
  if (ilk === 'watch') {
    const v = u.searchParams.get('v') ?? '';
    return VIDEO_ID.test(v) ? { tur: 'video', id: v } : { tur: 'hata', neden: 'watch linkinde geçerli video kimliği yok.' };
  }
  if (['shorts', 'live', 'embed', 'v'].includes(ilk)) {
    return VIDEO_ID.test(parcalar[1] ?? '') ? { tur: 'video', id: parcalar[1] } : { tur: 'hata', neden: 'Linkte geçerli video kimliği yok.' };
  }
  if (ilk === 'channel') {
    return KANAL_ID.test(parcalar[1] ?? '') ? { tur: 'kanal', id: parcalar[1] } : { tur: 'hata', neden: 'Geçerli kanal kimliği (UC…) yok.' };
  }
  if (ilk.startsWith('@')) {
    return HANDLE.test(ilk) ? { tur: 'kanal', handle: ilk } : { tur: 'hata', neden: 'Geçersiz kanal adı (@handle).' };
  }
  if (ilk === 'c' || ilk === 'user') {
    return { tur: 'hata', neden: 'Eski biçimli kanal linki (/c/, /user/) desteklenmiyor. @ile başlayan veya /channel/UC… linkini kullanın.' };
  }
  return { tur: 'hata', neden: 'Link tanınmadı: video veya kanal linki gerekli.' };
}
