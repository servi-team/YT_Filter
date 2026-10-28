/**
 * Taksonomi kimliklerini görünen adlara çevirir. Bilinmeyen kimlik olduğu gibi kalır;
 * böylece veri ile arayüz arasında sessizce kaybolan bir başlık olmaz.
 */
// @ts-ignore: src/core düz JS (UMD); tip aşağıda elle verilir.
import taksonomi from '../../../src/core/taxonomy.js';

interface Tanim {
  id: string;
  ad: string;
}

const konuAdlari = new Map<string, string>(
  (taksonomi.KONULAR as Tanim[]).map((konu) => [konu.id, konu.ad]),
);
const etiketAdlari = new Map<string, string>(
  (taksonomi.ETIKETLER as Tanim[]).map((etiket) => [etiket.id, etiket.ad]),
);

export function konuAdi(id: string): string {
  return konuAdlari.get(id) ?? id;
}

export function etiketAdi(id: string): string {
  return etiketAdlari.get(id) ?? id;
}
