import { db } from '../../lib/db.ts';
import { hataCevap, jsonCevap } from '../../lib/istek.ts';
import { sonYayin, yayinGetir, yayinIndirmeAdi } from '../../lib/yayin-deposu.ts';

export const dynamic = 'force-dynamic';

const YAYIN_YOK = { hata: 'Yayın bulunamadı.', kod: 'yayin-yok' } as const;

/** Yayınlanmış db.json dosyasını indirir; `?surum=N` eski sürümü verir. */
export async function GET(req: Request) {
  try {
    const hamSurum = new URL(req.url).searchParams.get('surum');
    let surum: number | undefined;

    if (hamSurum !== null) {
      if (!/^[1-9]\d*$/.test(hamSurum)) {
        return jsonCevap(
          { hata: 'Sürüm numarası pozitif bir tam sayı olmalı.', kod: 'surum-gecersiz' },
          400,
        );
      }
      surum = Number(hamSurum);
      if (!Number.isSafeInteger(surum)) {
        return jsonCevap(
          { hata: 'Sürüm numarası pozitif bir tam sayı olmalı.', kod: 'surum-gecersiz' },
          400,
        );
      }
    }

    const veritabani = await db();
    const yayin = surum === undefined
      ? await sonYayin(veritabani)
      : await yayinGetir(veritabani, surum);

    if (!yayin) return jsonCevap(YAYIN_YOK, 404);

    return new Response(JSON.stringify(yayin.icerik), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${yayinIndirmeAdi(yayin.veriSurumu)}"`,
        'cache-control': 'public, max-age=60, stale-while-revalidate=300',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (hata) {
    return hataCevap(hata);
  }
}
