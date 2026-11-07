import s from './iskelet.module.css';

export function Iskelet({
  satir = 1,
  genislik = '100%',
  yukseklik = '1rem',
}: {
  satir?: number;
  genislik?: string;
  yukseklik?: string;
}) {
  return (
    <span className={s.yigin} aria-hidden="true">
      {Array.from({ length: satir }, (_, i) => (
        <span
          key={i}
          className={s.cizgi}
          style={{
            width: satir > 1 && i === satir - 1 ? '62%' : genislik,
            height: yukseklik,
          }}
        />
      ))}
    </span>
  );
}
