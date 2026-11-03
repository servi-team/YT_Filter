import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (yol: string) => readFileSync(new URL(yol, import.meta.url), 'utf8');

test('geçiş imajı ilk admin ve bakım betiklerinin ihtiyaç duyduğu lib klasörünü taşır', () => {
  const dockerfile = oku('../Dockerfile');
  const gecis = dockerfile.slice(dockerfile.indexOf('AS gecis'), dockerfile.indexOf('AS calisma'));
  assert.match(gecis, /COPY site\/lib \.\/site\/lib/);
});

test('compose, ilk admin bilgilerini geçiş servisine geçirir', () => {
  const compose = oku('../docker-compose.yml');
  const migrate = compose.slice(compose.indexOf('  migrate:'), compose.indexOf('  site:'));
  assert.match(migrate, /ILK_ADMIN_EPOSTA/);
  assert.match(migrate, /ILK_ADMIN_PAROLA/);
});
