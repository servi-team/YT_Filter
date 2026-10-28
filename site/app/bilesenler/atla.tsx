import s from './kabuk.module.css';

/** Klavye kullanıcılarının gezinmeyi atlayıp doğrudan içeriğe geçmesini sağlar. */
export function Atla() {
  return <a className={s.atla} href="#icerik">İçeriğe geç</a>;
}
