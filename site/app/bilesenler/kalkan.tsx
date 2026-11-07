interface KalkanProps {
  /** Görselin kenar uzunluğu (px). */
  boyut?: number;
  /** Aynı sayfada birden çok kalkan varsa clipPath kimliğini ayırır. */
  kimlik?: string;
  /** Verilirse SVG görsel olarak etiketlenir; verilmezse dekoratif sayılır. */
  etiket?: string;
}

const GOVDE =
  'M64 6C84 14 104 19 120 22V58C120 91 99 112 64 124C29 112 8 91 8 58V22C24 19 44 14 64 6Z';

/** Marka işareti: şeffaf zemin, kırmızı kalkan, ince koyu kenar, çapraz iki beyaz çeyrek. */
export function Kalkan({ boyut = 32, kimlik = 'kalkan', etiket }: KalkanProps) {
  const klip = `${kimlik}-klip`;

  return (
    <svg
      width={boyut}
      height={boyut}
      viewBox="0 0 128 128"
      role={etiket ? 'img' : undefined}
      aria-label={etiket}
      aria-hidden={etiket ? undefined : true}
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <clipPath id={klip}>
          <path d={GOVDE} />
        </clipPath>
      </defs>
      <path d={GOVDE} fill="var(--sinyal)" />
      <g clipPath={`url(#${klip})`} fill="var(--yuzey)">
        <path d="M8 22C24 19 44 14 64 6V64H8V22Z" />
        <path d="M64 64H120V58C120 91 99 112 64 124V64Z" />
      </g>
      <path
        d={GOVDE}
        fill="none"
        stroke="var(--sinyal-koyu)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
