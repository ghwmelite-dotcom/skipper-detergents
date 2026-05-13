import { useState, type ReactElement } from 'react';
import type { Product } from '@skipper/shared';

/**
 * ProductIllustration — generated, brand-consistent SVG illustration for each
 * product based on category_id. Renders as inline SVG (no network request),
 * so it is reliable on Cloudflare Pages and degrades gracefully everywhere.
 *
 * When real (admin-uploaded) images arrive, callers can check the URL prefix
 * (e.g. r2.) and swap in an <img> — but every product ships with a beautiful
 * default illustration so the storefront never shows a text-only fallback.
 */

type Palette = {
  from: string;
  to: string;
  label: string;
  ink: string;
  accent: string;
};

const PALETTES: Record<string, Palette> = {
  cat_detergents: { from: '#E8EFF5', to: '#C8DCE8', label: '#0B2545', ink: '#0B2545', accent: '#00B4D8' },
  cat_toilet: { from: '#FDFBF6', to: '#F4EDE0', label: '#0B2545', ink: '#0B2545', accent: '#00B4D8' },
  cat_tissue: { from: '#FDFDFD', to: '#EDE8DF', label: '#0B2545', ink: '#0B2545', accent: '#E63946' },
  cat_paper_towels: { from: '#FAF3E8', to: '#EBD7B8', label: '#0B2545', ink: '#0B2545', accent: '#00B4D8' },
  cat_bathroom: { from: '#E3E8EE', to: '#B9C5D2', label: '#0B2545', ink: '#0B2545', accent: '#00B4D8' },
  cat_surface: { from: '#F0F6F8', to: '#D0E3E8', label: '#0B2545', ink: '#0B2545', accent: '#E63946' },
  default: { from: '#F4EDE0', to: '#E8DFD0', label: '#0B2545', ink: '#0B2545', accent: '#00B4D8' },
};

const SHAPES: Record<string, ReactElement> = {
  // Bottle silhouette
  cat_detergents: (
    <>
      <path
        d="M170 100 h60 v20 h12 a16 16 0 0 1 16 16 v14 h-116 v-14 a16 16 0 0 1 16 -16 h12 z"
        fill="#0B2545"
      />
      <path
        d="M142 150 h116 v180 a24 24 0 0 1 -24 24 h-68 a24 24 0 0 1 -24 -24 z"
        fill="#0B2545"
      />
      <rect x="160" y="200" width="80" height="90" fill="#FCFBF7" rx="4" />
      <rect x="170" y="215" width="60" height="8" fill="#00B4D8" rx="2" />
      <rect x="170" y="232" width="45" height="5" fill="#0B2545" opacity="0.4" rx="1" />
    </>
  ),
  // Toilet roll stack
  cat_toilet: (
    <>
      <ellipse cx="200" cy="320" rx="80" ry="14" fill="#0B2545" opacity="0.12" />
      <rect
        x="120"
        y="180"
        width="160"
        height="140"
        rx="80"
        fill="#FCFBF7"
        stroke="#0B2545"
        strokeWidth="2"
      />
      <ellipse
        cx="200"
        cy="180"
        rx="80"
        ry="14"
        fill="#FCFBF7"
        stroke="#0B2545"
        strokeWidth="2"
      />
      <circle cx="200" cy="180" r="24" fill="#F4EDE0" stroke="#0B2545" strokeWidth="2" />
      <circle cx="200" cy="180" r="6" fill="#0B2545" />
      <rect x="130" y="190" width="140" height="2" fill="#0B2545" opacity="0.12" />
      <rect x="130" y="215" width="140" height="2" fill="#0B2545" opacity="0.12" />
      <rect x="130" y="240" width="140" height="2" fill="#0B2545" opacity="0.12" />
      <rect x="130" y="265" width="140" height="2" fill="#0B2545" opacity="0.12" />
      <rect x="130" y="290" width="140" height="2" fill="#0B2545" opacity="0.12" />
    </>
  ),
  // Tissue box
  cat_tissue: (
    <>
      <rect x="110" y="180" width="180" height="140" rx="6" fill="#0B2545" />
      <rect x="120" y="190" width="160" height="120" rx="3" fill="#FCFBF7" />
      <rect x="170" y="170" width="60" height="40" rx="28" fill="#0B2545" />
      <path d="M180 185 Q200 170 220 185" stroke="#FCFBF7" strokeWidth="3" fill="none" />
      <text
        x="200"
        y="258"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="14"
        fill="#0B2545"
        fontStyle="italic"
      >
        soft
      </text>
      <rect x="140" y="275" width="120" height="6" fill="#E63946" rx="1" />
    </>
  ),
  // Kitchen roll / paper towel (taller)
  cat_paper_towels: (
    <>
      <ellipse cx="200" cy="340" rx="60" ry="10" fill="#0B2545" opacity="0.12" />
      <rect
        x="145"
        y="110"
        width="110"
        height="230"
        rx="55"
        fill="#FCFBF7"
        stroke="#0B2545"
        strokeWidth="2"
      />
      <ellipse
        cx="200"
        cy="110"
        rx="55"
        ry="10"
        fill="#FCFBF7"
        stroke="#0B2545"
        strokeWidth="2"
      />
      <circle cx="200" cy="110" r="16" fill="#F4EDE0" stroke="#0B2545" strokeWidth="2" />
      <circle cx="200" cy="110" r="4" fill="#0B2545" />
      <rect x="145" y="195" width="110" height="2" fill="#00B4D8" opacity="0.4" />
      <rect x="145" y="265" width="110" height="2" fill="#00B4D8" opacity="0.4" />
    </>
  ),
  // Brush / tool / bathroom
  cat_bathroom: (
    <>
      <rect x="190" y="90" width="20" height="180" rx="10" fill="#0B2545" />
      <ellipse cx="200" cy="285" rx="50" ry="44" fill="#0B2545" />
      <ellipse cx="200" cy="285" rx="42" ry="36" fill="#00B4D8" />
      {Array.from({ length: 14 }).map((_, i) => (
        <line
          key={i}
          x1={200 + 42 * Math.cos((i * Math.PI * 2) / 14)}
          y1={285 + 36 * Math.sin((i * Math.PI * 2) / 14)}
          x2={200 + 54 * Math.cos((i * Math.PI * 2) / 14)}
          y2={285 + 48 * Math.sin((i * Math.PI * 2) / 14)}
          stroke="#0B2545"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </>
  ),
  // Spray bottle
  cat_surface: (
    <>
      <path d="M180 90 l40 0 l20 30 l-80 0 z" fill="#0B2545" />
      <rect x="155" y="115" width="90" height="10" fill="#0B2545" rx="2" />
      <path
        d="M150 125 h100 v180 a30 30 0 0 1 -30 30 h-40 a30 30 0 0 1 -30 -30 z"
        fill="#0B2545"
      />
      <rect x="175" y="160" width="50" height="60" fill="#FCFBF7" rx="3" />
      <path d="M205 90 l40 -10 l0 20 l-40 -10 z" fill="#E63946" />
      <circle cx="160" cy="155" r="4" fill="#E63946" />
    </>
  ),
  // Default — abstract geometric
  default: (
    <g>
      <circle cx="200" cy="210" r="70" fill="#0B2545" />
      <circle cx="200" cy="210" r="40" fill="#FCFBF7" />
      <circle cx="200" cy="210" r="14" fill="#00B4D8" />
    </g>
  ),
};

export interface ProductIllustrationProps {
  product: Pick<Product, 'category_id' | 'name' | 'brand' | 'image_url'>;
  className?: string;
  /** Hide the brand label top-left (useful for very small thumbnails). */
  hideLabel?: boolean;
}

export function ProductIllustration({
  product,
  className,
  hideLabel = false,
}: ProductIllustrationProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgUrl = product.image_url;
  if (imgUrl && !imgFailed) {
    return (
      <img
        src={imgUrl}
        alt={product.name}
        loading="lazy"
        decoding="async"
        className={className}
        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        onError={() => setImgFailed(true)}
      />
    );
  }
  const palette = PALETTES[product.category_id] ?? PALETTES.default!;
  const shape = SHAPES[product.category_id] ?? SHAPES.default!;
  const brand = product.brand ?? 'Skipper';
  const gradId = `bg-${product.category_id ?? 'default'}`;

  return (
    <svg
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={product.name}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
        {/* subtle paper-grain noise */}
        <filter id={`grain-${gradId}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0" />
        </filter>
      </defs>
      <rect width="400" height="400" fill={`url(#${gradId})`} />
      <rect width="400" height="400" fill={`url(#grain-${gradId})`} opacity="0.6" />
      {/* category-specific silhouette */}
      <g opacity="0.92">{shape}</g>
      {/* brand label top-left */}
      {!hideLabel && (
        <text
          x="24"
          y="40"
          fontFamily="'Inter', system-ui, sans-serif"
          fontSize="11"
          fontWeight="600"
          letterSpacing="1.76"
          fill={palette.label}
        >
          {brand.toUpperCase()}
        </text>
      )}
    </svg>
  );
}

/**
 * Decide whether to render a real image or the illustration. Only trust images
 * that come from our admin CMS (r2.* or our own CDN). Everything else — lorem,
 * placehold.co, random hosts — falls back to the illustration.
 */
export function shouldUseRealImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.startsWith('https://r2.') ||
    url.startsWith('https://cdn.skipperdetergents.com') ||
    url.startsWith('https://skipperdetergents.com/cdn') ||
    url.startsWith('/uploads/')
  );
}
