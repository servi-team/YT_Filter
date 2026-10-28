import { pool } from '../../../lib/db.ts';

export const dynamic = 'force-dynamic';

/** Sağlık kontrolü: site ayakta mı, veritabanına ulaşılıyor mu? (Docker ve izleme için.) */
export async function GET() {
  let veritabani: 'ok' | 'hata' | 'ayarsiz' = 'ayarsiz';
  if (process.env.DATABASE_URL) {
    try { await pool().query('select 1'); veritabani = 'ok'; } catch { veritabani = 'hata'; }
  }
  const saglikli = veritabani !== 'hata';
  return Response.json({ site: 'ok', veritabani }, { status: saglikli ? 200 : 503 });
}
