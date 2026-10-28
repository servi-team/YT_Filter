/**
 * HTTP katmanına taşınacak bilinçli hata. Servis ve API kodunda beklenen
 * hata durumlarını `throw new HttpHatasi(...)` ile işaretleriz; `hataCevap`
 * bunları JSON gövdesine ve doğru durum koduna çevirir.
 */
export class HttpHatasi extends Error {
  readonly durum: number;
  readonly kod: string;

  constructor(durum: number, kod: string, mesaj?: string) {
    super(mesaj ?? kod);
    this.name = 'HttpHatasi';
    this.durum = durum;
    this.kod = kod;
  }
}
