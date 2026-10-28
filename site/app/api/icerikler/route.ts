import { db } from '../../../lib/db.ts';
import { icerikListele } from '../../../lib/icerik-deposu.ts';
import { hataCevap, jsonCevap } from '../../../lib/istek.ts';
import type { HedefTuru } from '../../../lib/tipler.ts';

export const dynamic = 'force-dynamic';

function sayfaCoz(deger: string | null): number {
  if (!deger || !/^[1-9]\d*$/.test(deger)) return 1;
  const sayi = Number(deger);
  return Number.isSafeInteger(sayi) ? sayi : 1;
}

/** Kamusal liste: arama, tür ve sayfa parametreleriyle kanal/video kayıtları. */
export async function GET(req: Request) {
  try {
    const parametreler = new URL(req.url).searchParams;
    const arama = parametreler.get('arama')?.trim() || undefined;
    const turParam = parametreler.get('tur');
    const tur: HedefTuru | undefined = turParam === 'video' || turParam === 'kanal' ? turParam : undefined;
    const sayfa = sayfaCoz(parametreler.get('sayfa'));

    const sonuc = await icerikListele(await db(), { arama, tur, sayfa });
    return jsonCevap(sonuc);
  } catch (hata) {
    return hataCevap(hata);
  }
}
