import Link from 'next/link';

/** Yetersiz yetkide Next.js `forbidden()` tarafından gösterilen 403 sayfası. */
export default function Forbidden() {
  return (
    <section
      aria-labelledby="forbidden-baslik"
      style={{
        maxWidth: '42rem',
        margin: '0 auto',
        padding: 'clamp(1.25rem, 4vw, 2rem)',
        border: '1px solid var(--cizgi)',
        borderRadius: '14px',
        background: 'var(--yuzey)',
      }}
    >
      <p
        style={{
          margin: '0 0 0.35rem',
          color: 'var(--kirmizi)',
          fontFamily: 'var(--font-kimlik)',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        403
      </p>
      <h1 id="forbidden-baslik" style={{ margin: '0 0 0.6rem' }}>
        Bu alana erişemezsiniz
      </h1>
      <p style={{ margin: '0 0 1.1rem', color: 'var(--ikincil)' }}>
        Bu sayfa yalnızca admin rolündeki hesaplara açıktır.
      </p>
      <Link href="/panel">Panele dön</Link>
    </section>
  );
}
