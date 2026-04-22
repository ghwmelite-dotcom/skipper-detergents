import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ProductImage } from '@skipper/shared';
import { ProductIllustration, shouldUseRealImage } from '@/lib/productIllustration';
import { cn } from '@/lib/cn';

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  productBrand?: string | null;
  categoryId?: string;
}

export function ProductImageGallery({
  images,
  productName,
  productBrand,
  categoryId,
}: ProductImageGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const reduced = useReducedMotion();

  const sorted = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  const usableImages = sorted.filter((img) => shouldUseRealImage(img.url));
  const activeReal = usableImages[activeIdx];

  const illustrationProduct = {
    category_id: categoryId ?? 'default',
    name: productName,
    brand: productBrand ?? null,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-brand-navy/8 bg-brand-sand/60 shadow-sm">
        <AnimatePresence mode="wait" initial={false}>
          {activeReal ? (
            <motion.img
              key={activeReal.url}
              src={activeReal.url}
              alt={activeReal.alt_text ?? productName}
              initial={reduced ? false : { opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.995 }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
          ) : (
            <motion.div
              key="illustration"
              initial={reduced ? false : { opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.995 }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute inset-0 h-full w-full"
            >
              <ProductIllustration
                product={illustrationProduct}
                className="h-full w-full"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {usableImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2" role="list" aria-label="Product images">
          {usableImages.map((img, idx) => (
            <button
              key={img.id}
              role="listitem"
              onClick={() => setActiveIdx(idx)}
              aria-label={`View image ${idx + 1}`}
              aria-pressed={idx === activeIdx}
              className={cn(
                'relative aspect-square overflow-hidden rounded-md bg-brand-sand/60 transition-all duration-200 ease-editorial',
                idx === activeIdx
                  ? 'ring-2 ring-brand-navy ring-offset-2 ring-offset-brand-ivory'
                  : 'ring-1 ring-brand-navy/10 hover:ring-brand-navy/30',
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
