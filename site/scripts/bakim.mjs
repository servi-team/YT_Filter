// Bakım işlerini çalıştırır: eski IP özetleri, süresi dolmuş oturum/engeller
// ve eski hız limiti pencereleri. Kullanım: npm run bakim
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

const { db, veritabaniKapat } = await import('../lib/db.ts');
const { bakimYap } = await import('../lib/bakim.ts');

try {
  const veritabani = await db();
  const sonuc = await bakimYap(veritabani);
  console.log(
    `Bakım tamamlandı: ${sonuc.ipOzeti} IP özeti, ${sonuc.oturum} oturum, `
    + `${sonuc.engel} engel, ${sonuc.hizLimiti} hız penceresi temizlendi.`,
  );
} catch (hata) {
  console.error(hata instanceof Error ? hata.message : String(hata));
  process.exitCode = 1;
} finally {
  await veritabaniKapat();
}
