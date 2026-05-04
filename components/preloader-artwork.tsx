export function PreloaderArtwork({ message = "Preparing your page..." }: { message?: string }) {
  return (
    <div className="navigation-preloader-panel">
      <svg viewBox="0 0 360 140" className="navigation-preloader-signature" aria-hidden="true">
        <text x="34" y="86" className="signature-word">
          DrivaDocs
        </text>
        <path className="signature-underline" d="M48 104 C112 125, 210 125, 315 101" />
        <g className="signature-pen">
          <path d="M0 0 L48 18 L43 31 L-5 13 Z" />
          <path d="M43 31 L55 36 L48 18 Z" />
          <path d="M-5 13 L-17 18 L0 0 Z" />
        </g>
      </svg>
      <p>{message}</p>
    </div>
  );
}
