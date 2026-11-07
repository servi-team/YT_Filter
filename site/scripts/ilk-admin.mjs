// İlk admini oluşturur. Yalnızca hiç hesap yokken çalışır; parola rapora/loga yazılmaz.
// Kullanım: ILK_ADMIN_EPOSTA=... ILK_ADMIN_PAROLA=... npm run ilk-admin
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

const eposta = process.env.ILK_ADMIN_EPOSTA?.trim() ?? '';
const parola = process.env.ILK_ADMIN_PAROLA ?? '';

if (!eposta || !parola) {
  console.error('ILK_ADMIN_EPOSTA ve ILK_ADMIN_PAROLA ortam değişkenleri zorunludur.');
  process.exitCode = 1;
} else {
  const { db, veritabaniKapat } = await import('../lib/db.ts');
  const { ilkAdminOlustur } = await import('../lib/hesap-deposu.ts');

  try {
    const veritabani = await db();
    const hesap = await ilkAdminOlustur(veritabani, { eposta, parola });
    console.log(`İlk admin oluşturuldu: ${hesap.eposta} (${hesap.rol})`);
  } catch (hata) {
    console.error(hata instanceof Error ? hata.message : String(hata));
    process.exitCode = 1;
  } finally {
    await veritabaniKapat();
  }
}
