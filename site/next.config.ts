import type { NextConfig } from 'next';
import path from 'node:path';

// Site, eklentinin src/core dosyalarını (taksonomi, doğrulayıcı) paylaşır; bu yüzden izleme kökü depo köküdür.
const depoKoku = path.join(import.meta.dirname, '..');

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: depoKoku,
  turbopack: { root: depoKoku },
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['@electric-sql/pglite'],
};
export default config;
