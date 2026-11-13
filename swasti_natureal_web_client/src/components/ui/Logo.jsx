import { useBranding } from '../../context/BrandingContext.jsx';

/**
 * Brand logo. Uses the images uploaded in Settings → Branding, or the bundled defaults in /public.
 * - LogoMark: square icon on a white tile — for small places (sidebar, mobile header).
 * - LogoFull: the full logo.
 * The white tile keeps a coloured logo readable in dark mode and on coloured backgrounds.
 * `src` overrides the image (used by the live preview on the Branding page).
 */
export function LogoMark({ size = 'h-10 w-10', className = '', src }) {
  const { logoMarkUrl } = useBranding();
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-md ring-1 shadow-teal-900/10 ring-slate-900/5 ${size} ${className}`}>
      <img src={src ?? logoMarkUrl} alt="" className="h-full w-full object-contain" draggable="false" />
    </span>
  );
}

export function LogoFull({ className = 'h-28 w-auto', src, alt }) {
  const { logoUrl, storeName } = useBranding();
  return <img src={src ?? logoUrl} alt={alt ?? storeName} className={`object-contain ${className}`} draggable="false" />;
}
