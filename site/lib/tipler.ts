/** Site genelinde paylaşılan temel tipler. */
import type { Sayim } from './oy-hesabi.ts';

export type HedefTuru = 'kanal' | 'video';
export type OgeTuru = 'konu' | 'etiket';
export type Rol = 'editor' | 'admin';
export type IcerikDurumu = 'aktif' | 'arsiv';

export interface Sayimlar {
  konular: Record<string, Sayim>;
  etiketler: Record<string, Sayim>;
}
