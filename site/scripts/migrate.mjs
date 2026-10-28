// Geçişleri uygular. Docker'da site başlamadan önce tek seferlik çalışır: `node scripts/migrate.mjs`
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL tanımlı değil.'); process.exit(1); }

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL('../db/gecisler', import.meta.url)) });
  console.log('Geçişler uygulandı.');
} catch (e) {
  console.error('Geçiş başarısız:', e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
