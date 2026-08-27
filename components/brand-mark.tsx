export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      className="brand-symbol"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="brand-symbol-shield"
        d="M16 3.5 26 7.2v7.15c0 6.15-3.88 10.88-10 14.15-6.12-3.27-10-8-10-14.15V7.2L16 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        className="brand-symbol-cube"
        d="m16 9.2 5.1 2.85L16 14.9l-5.1-2.85L16 9.2Zm5.1 2.85v5.72L16 20.7v-5.8m-5.1-2.85v5.72L16 20.7"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="brand-symbol-accent" cx="24.6" cy="7.1" r="2.45" />
    </svg>
  );
}
