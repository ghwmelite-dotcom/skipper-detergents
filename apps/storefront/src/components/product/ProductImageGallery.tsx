import { useEffect, useRef, useState } from 'react';
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

/**
 * Dual-mode product gallery.
 *
 * Mobile (<md): full-bleed horizontal carousel using native CSS scroll-snap.
 * Each slide is 100vw and snap-aligned center. Dot indicators below the
 * track update via IntersectionObserver on the slides — fully native,
 * no gesture library needed. Feels like the Instagram / Shein image viewer.
 *
 * Desktop (md+): original thumbnail-grid layout with fade transitions
 * on the main image.
 */
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

  const illustrationProduct = {
    category_id: categoryId ?? 'default',
    name: productName,
    brand: productBrand ?? null,
  };

  // Slide count — either the real images or a single fallback illustration.
  const slideCount = Math.max(1, usableImages.length);
  const slides: (ProductImage | null)[] =
    usableImages.length > 0 ? usableImages : [null];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Observe slides via IntersectionObserver to drive the active dot.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
            const idx = Number((entry.target as HTMLElement).dataset.idx ?? 0);
            setActiveIdx(idx);
          }
        }
      },
      {
        root: scroller,
        threshold: [0.55, 0.75],
      },
    );
    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [slideCount]);

  const scrollToIdx = (idx: number) => {
    const el = slideRefs.current[idx];
    if (!el) return;
    el.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  };

  return (
    <>
      {/* =========================================================== */}
      {/* MOBILE — full-bleed swipeable carousel                       */}
      {/* =========================================================== */}
      <div className="md:hidden -mx-4">
        <div
          ref={scrollerRef}
          className="flex w-full overflow-x-auto snap-x-mandatory scroll-touch scrollbar-none"
          role="region"
          aria-label="Product images, swipe to browse"
          aria-roledescription="carousel"
        >
          {slides.map((img, idx) => (
            <div
              key={img?.id ?? `illust-${idx}`}
              ref={(el) => {
                slideRefs.current[idx] = el;
              }}
              data-idx={idx}
              className="snap-center flex-none w-screen aspect-square bg-brand-sand/60"
              aria-label={`Image ${idx + 1} of ${slideCount}`}
              role="group"
              aria-roledescription="slide"
            >
              {img ? (
                <img
                  src={img.url}
                  alt={img.alt_text ?? productName}
                  className="h-full w-full object-cover"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              ) : (
                <ProductIllustration
                  product={illustrationProduct}
                  className="h-full w-full"
                />
              )}
            </div>
          ))}
        </div>

        {slideCount > 1 && (
          <div
            className="flex items-center justify-center gap-1.5 pt-4"
            role="tablist"
            aria-label="Image navigation"
          >
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={idx === activeIdx}
                aria-label={`Go to image ${idx + 1}`}
                onClick={() => scrollToIdx(idx)}
                className="h-6 px-1 inline-flex items-center"
              >
                <span
                  className={cn(
                    'block h-[6px] rounded-full transition-all duration-300 ease-editorial',
                    idx === activeIdx
                      ? 'w-5 bg-brand-navy'
                      : 'w-[6px] bg-brand-navy/25',
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================== */}
      {/* DESKTOP — main image + thumbnail grid                        */}
      {/* =========================================================== */}
      <div className="hidden md:flex flex-col gap-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-brand-navy/8 bg-brand-sand/60 shadow-sm">
          <AnimatePresence mode="wait" initial={false}>
            {usableImages[activeIdx] ? (
              <motion.img
                key={usableImages[activeIdx]!.url}
                src={usableImages[activeIdx]!.url}
                alt={usableImages[activeIdx]!.alt_text ?? productName}
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
    </>
  );
}
