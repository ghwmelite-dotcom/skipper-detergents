import { useState } from 'react';
import type { ProductImage } from '@skipper/shared';
import { cn } from '@/lib/cn';

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

const PLACEHOLDER = 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image';

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  const sorted = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  const active = sorted[activeIdx];
  const mainSrc = active?.url ?? PLACEHOLDER;
  const mainAlt = active?.alt_text ?? productName;

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted/20">
        <img
          src={mainSrc}
          alt={mainAlt}
          className="h-full w-full object-contain"
          loading="eager"
        />
      </div>

      {/* Thumbnails — only show if >1 image */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Product images">
          {sorted.map((img, idx) => (
            <button
              key={img.id}
              role="listitem"
              onClick={() => setActiveIdx(idx)}
              aria-label={`View image ${idx + 1}`}
              aria-pressed={idx === activeIdx}
              className={cn(
                'h-16 w-16 flex-none overflow-hidden rounded-md border-2 transition-all duration-150',
                idx === activeIdx
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-border hover:border-muted-foreground',
              )}
            >
              <img
                src={img.url}
                alt={img.alt_text ?? productName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
