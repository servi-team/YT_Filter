import s from './hata-metni.module.css';

export function HataMetni({ mesaj, id }: { mesaj: string; id?: string }) {
  return (
    <p className={s.hata} id={id} role="alert">
      <span className={s.ikon} aria-hidden="true">!</span>
      <span>{mesaj}</span>
    </p>
  );
}
