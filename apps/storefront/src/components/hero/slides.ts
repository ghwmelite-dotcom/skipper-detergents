/**
 * Cinematic hero slides — four narrative beats for the Skipper brand.
 *
 * Each slide describes its own copy, featured product (as a category_id +
 * name tuple — we render the inline `ProductIllustration`, so we don't need
 * to fetch the real product), accent color, and CTAs.
 */

export type HeroAccent = 'cyan' | 'red' | 'sand';

export interface HeroSlideCta {
  label: string;
  to: string;
}

export interface HeroSlideProduct {
  /** Canonical product slug — used only as a key / aria hint. */
  slug: string;
  /** Short product name for the card caption. */
  name: string;
  /** Brand label on the card caption. */
  brand: string;
  /** Category used to pick the SVG illustration + palette. */
  category_id: string;
}

export type HeroTheme = 'light' | 'dark';

export interface HeroSlide {
  id: string;
  eyebrow: string;
  /** Supports `*word*` italic and `_word_` red-italic tokens; `|` for line break. */
  headline: string;
  subhead: string;
  product: HeroSlideProduct;
  accent: HeroAccent;
  /** Dark theme inverts to navy background + ivory text (slide 3). */
  theme: HeroTheme;
  primary: HeroSlideCta;
  secondary: HeroSlideCta;
}

export const ACCENT_HEX: Record<HeroAccent, string> = {
  cyan: '#00B4D8',
  red: '#E63946',
  sand: '#F4EDE0',
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'everyday',
    eyebrow: 'EST. 2026 · ACCRA',
    headline: 'Clean homes, _honest_ prices.',
    subhead: 'Premium cleaning and paper essentials, delivered across Ghana.',
    product: {
      slug: 'skipper-liquid-detergent-2l',
      name: 'Skipper Liquid Detergent 2L',
      brand: 'Skipper',
      category_id: 'cat_detergents',
    },
    accent: 'cyan',
    theme: 'light',
    primary: { label: 'Shop everything', to: '/shop' },
    secondary: { label: 'Browse categories', to: '/shop' },
  },
  {
    id: 'wholesale',
    eyebrow: 'BULK PRICING · SAVE UP TO 30%',
    headline: 'Save 15–30% *in bulk*.',
    subhead:
      'Transparent tiered pricing for offices, schools, retailers, and events.',
    product: {
      slug: 'skipper-toilet-roll-24-carton',
      name: 'Skipper Toilet Roll 24-Pack Carton',
      brand: 'Skipper',
      category_id: 'cat_toilet',
    },
    accent: 'red',
    theme: 'light',
    primary: { label: 'Explore bulk', to: '/bulk' },
    secondary: { label: 'Request a quote', to: '/contact' },
  },
  {
    id: 'local',
    eyebrow: 'MADE FOR GHANAIAN HOMES',
    headline: 'Built for *our* households.',
    subhead:
      'Formulated and sourced with Ghanaian families, offices, and hospitality in mind.',
    product: {
      slug: 'skipper-napkin-tissues-100-sheet',
      name: 'Skipper Napkin Tissues',
      brand: 'Skipper',
      category_id: 'cat_tissue',
    },
    accent: 'sand',
    theme: 'dark',
    primary: { label: 'Our story', to: '/about' },
    secondary: { label: 'Visit pickup', to: '/contact' },
  },
  {
    id: 'delivery',
    eyebrow: 'SAME-DAY ACCRA · PAYSTACK SECURE',
    headline: 'Ordered now, *cleaning by lunch*.',
    subhead:
      'Free delivery in Accra over GHS 200. Mobile money, card, or manual transfer.',
    product: {
      slug: 'skipper-glass-cleaner-500ml',
      name: 'Skipper Glass Cleaner 500ml',
      brand: 'Skipper',
      category_id: 'cat_surface',
    },
    accent: 'cyan',
    theme: 'light',
    primary: { label: 'Shop now', to: '/shop' },
    secondary: { label: 'Delivery info', to: '/faq' },
  },
];

export const AUTO_ADVANCE_MS = 6000;
