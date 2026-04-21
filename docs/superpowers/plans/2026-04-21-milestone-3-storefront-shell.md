# Milestone 3 — Storefront Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a production-grade React storefront app at `apps/storefront` that boots to a Captain's Deck-themed layout (Header/Footer/MobileNav/AnnouncementBar), routes cleanly between all customer-facing pages (stubbed for now), persists a bulk-aware cart in `localStorage` via Zustand, talks to the live API via a typed TanStack Query client, renders SEO-correct JSON-LD + meta tags, catches runtime errors with a boundary, and deploys to Cloudflare Pages with a GitHub Actions workflow.

**Architecture:** Vite 5 + React 18 + TypeScript strict + Tailwind 3 + shadcn/ui primitives (copied into the repo, no runtime install). React Router 6 with lazy-loaded route modules. Zustand 4 for client state (cart, UI) with the `persist` middleware for the cart. TanStack Query 5 for server state. A typed `api` fetch wrapper reads the `{ success, data, error, meta }` envelope from the live Worker and throws on `error`. SEO uses `react-helmet-async`. Every component stays small and testable; tests run in Vitest with jsdom + React Testing Library.

**Tech Stack:** React 18, TypeScript 5.5 strict, Vite 5, Tailwind 3, shadcn/ui (manually vendored), React Router 6, Zustand 4, TanStack Query 5, react-helmet-async, lucide-react, clsx, tailwind-merge, @fontsource/inter + @fontsource/jetbrains-mono (self-hosted fonts — no Google Fonts CDN), Vitest 2, @testing-library/react, jsdom, `wrangler pages` for deployment.

**Spec references:** §3.3 tech stack, §3.4 SEO approach, §7 perf/a11y baseline, §8 design system (Captain's Deck tokens).

**Deployment state going in:**

- Live API: https://skipper-api.ghwmelite.workers.dev (M1–M2b shipped)
- Main has 177 tests passing on CI (50 shared + 127 api)
- `pnpm-workspace.yaml` already declares `apps/*`, so no monorepo plumbing needed — just add `apps/storefront`
- The monorepo's root `.prettierrc`, `.eslintrc.cjs`, `tsconfig.base.json`, `turbo.json` apply
- `@skipper/shared` exports all catalog/order types, schemas, `formatCurrency`, `resolveBulkPrice`

---

## File Map

### `apps/storefront/` — new package

```
apps/storefront/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── .env.example
├── public/
│   ├── robots.txt
│   └── favicon.svg
├── src/
│   ├── main.tsx                       # entry — wraps App in providers
│   ├── App.tsx                        # Router + Route table
│   ├── lib/
│   │   ├── api.ts                     # typed fetch client
│   │   ├── queryClient.ts             # TanStack Query client config
│   │   ├── cn.ts                      # className merger
│   │   └── env.ts                     # VITE_API_BASE resolution
│   ├── stores/
│   │   ├── cartStore.ts               # Zustand cart + persist
│   │   └── uiStore.ts                 # mobile nav open, cart drawer open
│   ├── hooks/
│   │   ├── useProducts.ts             # list, featured, bySlug, search
│   │   ├── useCategories.ts           # list + bySlug products
│   │   ├── useSettings.ts             # public settings
│   │   └── useCart.ts                 # cart operations with bulk resolver
│   ├── components/
│   │   ├── ui/                        # shadcn/ui primitives (vendored)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── sheet.tsx
│   │   │   └── dialog.tsx
│   │   ├── layout/
│   │   │   ├── RootLayout.tsx         # Outlet + Header + Footer + AnnouncementBar
│   │   │   ├── Header.tsx             # sticky, search, cart icon
│   │   │   ├── Footer.tsx             # links + newsletter stub
│   │   │   ├── MobileNav.tsx          # slide-out drawer
│   │   │   └── AnnouncementBar.tsx    # top promo strip
│   │   ├── seo/
│   │   │   ├── SEOHead.tsx            # react-helmet-async wrapper
│   │   │   ├── JsonLd.tsx             # structured data
│   │   │   ├── CanonicalUrl.tsx       # canonical link rel
│   │   │   └── Breadcrumbs.tsx        # nav + BreadcrumbList JSON-LD
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── SkeletonCard.tsx
│   ├── pages/                         # stub pages for routing
│   │   ├── Home.tsx
│   │   ├── Shop.tsx
│   │   ├── Category.tsx               # /shop/:slug
│   │   ├── ProductDetail.tsx          # /product/:slug
│   │   ├── BulkOrder.tsx
│   │   ├── Cart.tsx
│   │   ├── Checkout.tsx
│   │   ├── OrderConfirmation.tsx      # /order/:orderNumber
│   │   ├── OrderTracking.tsx          # /track/:orderNumber
│   │   ├── About.tsx
│   │   ├── Contact.tsx
│   │   ├── FAQ.tsx
│   │   ├── PrivacyPolicy.tsx
│   │   └── NotFound.tsx               # 404
│   ├── styles/
│   │   └── globals.css                # Tailwind directives + CSS variables
│   └── types/
│       └── vite-env.d.ts
└── tests/
    ├── setup.ts
    ├── stores/cartStore.test.ts
    ├── lib/api.test.ts
    ├── components/
    │   ├── SEOHead.test.tsx
    │   └── Breadcrumbs.test.tsx
    └── hooks/useCart.test.tsx
```

### Monorepo touchpoints

- `packages/shared/src/utils.ts` — already exports `formatCurrency`, `resolveBulkPrice`. Re-used, not modified.
- No `wrangler.toml` at repo root changes.

### New CI workflow

`.github/workflows/deploy-storefront.yml` — manual-dispatch only (matches `deploy.yml`'s pattern).

### New env + build outputs

`apps/storefront/.env.example`:

```
VITE_API_BASE=https://skipper-api.ghwmelite.workers.dev
VITE_STORE_NAME="Skipper Detergents"
```

Production build output: `apps/storefront/dist/`. Deployed via `wrangler pages deploy ./dist`.

---

## Shared principles

1. **Strict TS everywhere.** No `any` without a justification comment. Reuse `@skipper/shared` types instead of redefining.
2. **Tailwind first, CSS second.** Any color must come from a token; no raw hex in components.
3. **Accessibility as you go.** Button-shaped things are `<button>`, link-shaped things are `<a>`/`<Link>`, form fields have labels, focus states visible. Touch targets ≥ 44px.
4. **Bundle budget.** Initial storefront JS ≤ 200 KB gzipped after M3 (we'll track it in the DoD step).
5. **Prerendering is a phase-2 concern** — M3 ships as a plain SPA; LCP/SEO hardening comes in M6.
6. **Stub pages render only a title + breadcrumb.** The real UI fills in at M4. Goal here is: every route lands on a page, every page renders without JS errors, every page has correct `<title>` + meta tags.

---

## Task 1: Scaffold `apps/storefront` package

**Files:**

- Create: `apps/storefront/package.json`
- Create: `apps/storefront/tsconfig.json`
- Create: `apps/storefront/tsconfig.node.json`
- Create: `apps/storefront/vite.config.ts`
- Create: `apps/storefront/index.html`
- Create: `apps/storefront/.env.example`
- Create: `apps/storefront/.gitignore`
- Create: `apps/storefront/src/types/vite-env.d.ts`
- Create: `apps/storefront/public/robots.txt`
- Create: `apps/storefront/public/favicon.svg`

- [ ] **Step 1: Create `apps/storefront/package.json`**

```json
{
  "name": "@skipper/storefront",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.{ts,tsx}\" \"tests/**/*.{ts,tsx}\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy": "wrangler pages deploy ./dist --project-name=skipper-storefront"
  },
  "dependencies": {
    "@skipper/shared": "workspace:*",
    "@fontsource/inter": "^5.1.0",
    "@fontsource/jetbrains-mono": "^5.1.0",
    "@tanstack/react-query": "^5.56.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.454.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-helmet-async": "^2.0.5",
    "react-router-dom": "^6.27.0",
    "tailwind-merge": "^2.5.4",
    "zustand": "^4.5.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.5.4",
    "vite": "^5.4.10",
    "vitest": "^2.1.0",
    "wrangler": "^3.80.0"
  }
}
```

- [ ] **Step 2: Create `apps/storefront/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "paths": {
      "@/*": ["./src/*"],
      "@skipper/shared": ["../../packages/shared/src/index.ts"]
    },
    "noEmit": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `apps/storefront/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts", "tailwind.config.ts", "postcss.config.js"]
}
```

- [ ] **Step 4: Create `apps/storefront/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@skipper/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 5: Create `apps/storefront/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0B2545" />
    <title>Skipper Detergents — Premium Cleaning &amp; Bathroom Essentials</title>
    <meta
      name="description"
      content="Skipper Detergents — premium cleaning &amp; bathroom essentials delivered across Ghana. Bulk pricing, Paystack checkout, same-day Accra delivery."
    />
  </head>
  <body class="min-h-screen bg-background text-foreground antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `apps/storefront/.env.example`**

```
VITE_API_BASE=https://skipper-api.ghwmelite.workers.dev
VITE_STORE_NAME=Skipper Detergents
```

- [ ] **Step 7: Create `apps/storefront/.gitignore`**

```
dist/
.wrangler/
```

- [ ] **Step 8: Create `apps/storefront/src/types/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_STORE_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 9: Create `apps/storefront/public/robots.txt`**

```
User-agent: *
Allow: /

Disallow: /cart
Disallow: /checkout
Disallow: /order/

Sitemap: https://skipper-api.ghwmelite.workers.dev/api/sitemap.xml
```

- [ ] **Step 10: Create `apps/storefront/public/favicon.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0B2545" />
  <path d="M10 10 L22 10 L22 14 L14 14 L14 18 L22 18 L22 22 L10 22 L10 18 L12 18 L12 14 L10 14 Z" fill="#FCFBF7" />
</svg>
```

- [ ] **Step 11: Install and verify**

Run:

```bash
pnpm install
pnpm --filter @skipper/storefront typecheck
```

Expected: install succeeds; typecheck passes (no src files yet so nothing to check — `tsc --noEmit` exits 0).

- [ ] **Step 12: Commit**

```bash
git add apps/storefront/ pnpm-lock.yaml
git commit -m "feat(storefront): scaffold Vite + React + TypeScript app"
```

---

## Task 2: Tailwind + PostCSS + Captain's Deck tokens

**Files:**

- Create: `apps/storefront/tailwind.config.ts`
- Create: `apps/storefront/postcss.config.js`
- Create: `apps/storefront/src/styles/globals.css`

- [ ] **Step 1: Create `apps/storefront/postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 2: Create `apps/storefront/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        // Semantic (shadcn/ui compatible, HSL triplets)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Raw brand tokens (for deliberate, non-semantic uses like buoy red sale tags)
        brand: {
          navy: '#0B2545',
          'navy-dark': '#091C38',
          cyan: '#00B4D8',
          'cyan-deep': '#0094B3',
          red: '#E63946',
          sand: '#F4EDE0',
          ivory: '#FCFBF7',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        lg: '0 10px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.06)',
      },
      transitionTimingFunction: {
        enter: 'cubic-bezier(0, 0, 0.2, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Create `apps/storefront/src/styles/globals.css`**

```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/500.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Captain's Deck — HSL for shadcn/ui compatibility */
    --background: 43 42% 98%; /* brand-ivory #FCFBF7 */
    --foreground: 219 75% 15%; /* brand-navy #0B2545 */

    --card: 0 0% 100%;
    --card-foreground: 219 75% 15%;

    --primary: 219 75% 15%; /* brand-navy */
    --primary-foreground: 43 42% 98%;

    --secondary: 192 100% 42%; /* brand-cyan #00B4D8 */
    --secondary-foreground: 0 0% 100%;

    --accent: 32 35% 92%; /* brand-sand #F4EDE0 */
    --accent-foreground: 219 75% 15%;

    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;

    --destructive: 354 75% 57%; /* brand-red #E63946 */
    --destructive-foreground: 0 0% 100%;

    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 192 100% 42%;
  }

  * {
    @apply border-border;
  }

  html {
    font-feature-settings:
      'rlig' 1,
      'calt' 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-background text-foreground;
    font-family:
      'Inter',
      system-ui,
      -apple-system,
      sans-serif;
  }

  :focus-visible {
    @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/tailwind.config.ts apps/storefront/postcss.config.js apps/storefront/src/styles/globals.css
git commit -m "feat(storefront): add Tailwind config + Captain's Deck design tokens"
```

---

## Task 3: shadcn/ui primitives + `cn` utility

These components are vendored in — copied from shadcn/ui's templates. No runtime install. They rely on `cn` (clsx + tailwind-merge) and the CSS variables defined in Task 2.

**Files:**

- Create: `apps/storefront/src/lib/cn.ts`
- Create: `apps/storefront/src/components/ui/button.tsx`
- Create: `apps/storefront/src/components/ui/card.tsx`
- Create: `apps/storefront/src/components/ui/input.tsx`
- Create: `apps/storefront/src/components/ui/skeleton.tsx`
- Create: `apps/storefront/src/components/ui/sheet.tsx`
- Create: `apps/storefront/src/components/ui/dialog.tsx`

We skip the `@radix-ui/*` dependency chain for M3 by implementing `sheet` and `dialog` as lightweight uncontrolled versions. They're enough for a drawer + modal. Phase-2 can swap in Radix if we need focus-trapping, etc.

- [ ] **Step 1: `apps/storefront/src/lib/cn.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: `apps/storefront/src/components/ui/button.tsx`**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[.98]',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 active:scale-[.98]',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
  ghost: 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[.98]',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm rounded-sm',
  md: 'h-11 px-5 text-sm rounded-md',
  lg: 'h-12 px-7 text-base rounded-md',
  icon: 'h-11 w-11 rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-colors duration-150 ease-enter',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
```

- [ ] **Step 3: `apps/storefront/src/components/ui/card.tsx`**

```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground shadow-sm',
        'transition-shadow duration-200 ease-enter',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
```

- [ ] **Step 4: `apps/storefront/src/components/ui/input.tsx`**

```tsx
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2',
        'text-base md:text-sm',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
```

- [ ] **Step 5: `apps/storefront/src/components/ui/skeleton.tsx`**

```tsx
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden="true"
      {...props}
    />
  );
}
```

- [ ] **Step 6: `apps/storefront/src/components/ui/sheet.tsx`**

Lightweight slide-out drawer. Controlled via `open` prop. No focus trap for M3 — Radix swap-in deferred to phase 2.

```tsx
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  children: ReactNode;
  title: string;
}

export function Sheet({ open, onClose, side = 'right', children, title }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative ml-auto flex h-full w-full max-w-sm flex-col bg-background shadow-lg',
          'transition-transform duration-300 ease-enter',
          side === 'left' && 'mr-auto ml-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: `apps/storefront/src/components/ui/dialog.tsx`**

Minimal modal. Same escape + outside-click dismiss pattern.

```tsx
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'relative w-full max-w-lg rounded-lg bg-background p-6 shadow-lg',
          'transition-transform duration-200 ease-enter',
        )}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Typecheck**

Run: `pnpm --filter @skipper/storefront typecheck`
Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add apps/storefront/src/lib/cn.ts apps/storefront/src/components/ui/
git commit -m "feat(storefront): add shadcn/ui primitives (button, card, input, skeleton, sheet, dialog)"
```

---

## Task 4: lib utilities — env, api client, queryClient

**Files:**

- Create: `apps/storefront/src/lib/env.ts`
- Create: `apps/storefront/src/lib/api.ts`
- Create: `apps/storefront/src/lib/queryClient.ts`
- Create: `apps/storefront/tests/lib/api.test.ts`
- Create: `apps/storefront/tests/setup.ts` (minimal, just sets up jest-dom — tests in this task don't hit the DOM yet)

- [ ] **Step 1: `apps/storefront/tests/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: `apps/storefront/src/lib/env.ts`**

```typescript
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8787';
export const STORE_NAME = import.meta.env.VITE_STORE_NAME ?? 'Skipper Detergents';
```

- [ ] **Step 3: Failing test — create `apps/storefront/tests/lib/api.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../../src/lib/api';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api.get', () => {
  it('returns data from a successful envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: 'x' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const result = await api.get<{ id: string }>('/api/products/x');
    expect(result).toEqual({ id: 'x' });
  });

  it('returns meta on a paginated envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [{ id: 'a' }],
          meta: { page: 1, per_page: 20, total: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const result = await api.getPaginated<{ id: string }>('/api/products');
    expect(result.data).toEqual([{ id: 'a' }]);
    expect(result.meta).toEqual({ page: 1, per_page: 20, total: 1 });
  });

  it('throws ApiError when envelope success is false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Product not found' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    await expect(api.get('/api/products/nope')).rejects.toThrow(ApiError);
    await expect(api.get('/api/products/nope')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('throws ApiError on non-JSON 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad', { status: 500 }));
    await expect(api.get('/api/products')).rejects.toThrow(ApiError);
  });
});

describe('api.post', () => {
  it('sends JSON body and returns data', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { order_id: 'o1' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const result = await api.post<{ order_id: string }>('/api/orders', { items: [] });
    expect(result).toEqual({ order_id: 'o1' });
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(JSON.stringify({ items: [] }));
  });
});
```

- [ ] **Step 4: Run test — expect FAIL**

`pnpm --filter @skipper/storefront test tests/lib/api.test.ts`
Expected: FAIL — "Cannot find module '../../src/lib/api'".

- [ ] **Step 5: `apps/storefront/src/lib/api.ts`**

```typescript
import type { ApiResponse } from '@skipper/shared';
import { API_BASE } from './env';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseEnvelope<T>(res: Response): Promise<ApiResponse<T>> {
  const contentType = res.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      `Non-JSON response (${res.status})`,
      res.status >= 500 ? 'INTERNAL' : 'UNEXPECTED',
      res.status,
    );
  }
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new ApiError(
      body.error?.message ?? 'Request failed',
      body.error?.code ?? 'ERROR',
      res.status,
      body.error?.details,
    );
  }
  return body;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, init);
  return res;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await request(path);
    const body = await parseEnvelope<T>(res);
    return body.data as T;
  },
  async getPaginated<T>(
    path: string,
  ): Promise<{ data: T[]; meta: { page: number; per_page: number; total: number } }> {
    const res = await request(path);
    const body = await parseEnvelope<T[]>(res);
    return {
      data: (body.data ?? []) as T[],
      meta: {
        page: body.meta?.page ?? 1,
        per_page: body.meta?.per_page ?? 20,
        total: body.meta?.total ?? 0,
      },
    };
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const envelope = await parseEnvelope<T>(res);
    return envelope.data as T;
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await request(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const envelope = await parseEnvelope<T>(res);
    return envelope.data as T;
  },
};
```

- [ ] **Step 6: Run tests — expect PASS (5 tests)**

- [ ] **Step 7: `apps/storefront/src/lib/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute
      gcTime: 5 * 60_000, // 5 minutes
      retry: (failureCount, error) => {
        if (error instanceof Error && error.name === 'ApiError') {
          // Don't retry 4xx (user errors)
          const status = (error as unknown as { status?: number }).status;
          if (status !== undefined && status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

- [ ] **Step 8: Commit**

```bash
git add apps/storefront/src/lib/env.ts apps/storefront/src/lib/api.ts apps/storefront/src/lib/queryClient.ts apps/storefront/tests/setup.ts apps/storefront/tests/lib/api.test.ts
git commit -m "feat(storefront): add env config, typed API client, TanStack Query client"
```

---

## Task 5: Zustand stores — cart + UI

**Files:**

- Create: `apps/storefront/src/stores/cartStore.ts`
- Create: `apps/storefront/src/stores/uiStore.ts`
- Create: `apps/storefront/tests/stores/cartStore.test.ts`

- [ ] **Step 1: Failing test — `apps/storefront/tests/stores/cartStore.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../../src/stores/cartStore';

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('cartStore', () => {
  it('starts empty', () => {
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().totalQuantity()).toBe(0);
  });

  it('addItem adds a new line', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 2 });
    expect(useCartStore.getState().items).toEqual([{ product_id: 'p1', quantity: 2 }]);
    expect(useCartStore.getState().totalQuantity()).toBe(2);
  });

  it('addItem increments quantity when the same product is added again', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 2 });
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 3 });
    expect(useCartStore.getState().items).toEqual([{ product_id: 'p1', quantity: 5 }]);
  });

  it('distinguishes variants on the same product', () => {
    useCartStore.getState().addItem({ product_id: 'p1', variant_id: 'v1', quantity: 1 });
    useCartStore.getState().addItem({ product_id: 'p1', variant_id: 'v2', quantity: 1 });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('updateQuantity replaces the quantity', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 1 });
    useCartStore.getState().updateQuantity('p1', null, 7);
    expect(useCartStore.getState().items[0]?.quantity).toBe(7);
  });

  it('updateQuantity to 0 removes the item', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 3 });
    useCartStore.getState().updateQuantity('p1', null, 0);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('removeItem drops a line', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 1 });
    useCartStore.getState().addItem({ product_id: 'p2', quantity: 1 });
    useCartStore.getState().removeItem('p1', null);
    expect(useCartStore.getState().items).toEqual([{ product_id: 'p2', quantity: 1 }]);
  });

  it('clear empties everything', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 1 });
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('totalQuantity sums all lines', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 2 });
    useCartStore.getState().addItem({ product_id: 'p2', quantity: 3 });
    expect(useCartStore.getState().totalQuantity()).toBe(5);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: `apps/storefront/src/stores/cartStore.ts`**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

interface CartStoreState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  clear: () => void;
  totalQuantity: () => number;
}

function sameLine(a: CartItem, productId: string, variantId: string | null): boolean {
  return a.product_id === productId && (a.variant_id ?? null) === variantId;
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const variantId = item.variant_id ?? null;
        set((state) => {
          const existing = state.items.find((x) => sameLine(x, item.product_id, variantId));
          if (existing) {
            return {
              items: state.items.map((x) =>
                sameLine(x, item.product_id, variantId)
                  ? { ...x, quantity: x.quantity + item.quantity }
                  : x,
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      updateQuantity: (productId, variantId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((x) => !sameLine(x, productId, variantId)),
            };
          }
          return {
            items: state.items.map((x) =>
              sameLine(x, productId, variantId) ? { ...x, quantity } : x,
            ),
          };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter((x) => !sameLine(x, productId, variantId)),
        }));
      },

      clear: () => set({ items: [] }),

      totalQuantity: () => get().items.reduce((sum, x) => sum + x.quantity, 0),
    }),
    {
      name: 'skipper-cart',
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
```

- [ ] **Step 4: Run tests — PASS (9)**

- [ ] **Step 5: `apps/storefront/src/stores/uiStore.ts`**

```typescript
import { create } from 'zustand';

interface UiStoreState {
  mobileNavOpen: boolean;
  cartDrawerOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

export const useUiStore = create<UiStoreState>()((set) => ({
  mobileNavOpen: false,
  cartDrawerOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  openCartDrawer: () => set({ cartDrawerOpen: true }),
  closeCartDrawer: () => set({ cartDrawerOpen: false }),
}));
```

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/stores/ apps/storefront/tests/stores/
git commit -m "feat(storefront): add Zustand cart store (with persist) + UI store"
```

---

## Task 6: TanStack Query hooks

**Files:**

- Create: `apps/storefront/src/hooks/useProducts.ts`
- Create: `apps/storefront/src/hooks/useCategories.ts`
- Create: `apps/storefront/src/hooks/useSettings.ts`
- Create: `apps/storefront/src/hooks/useCart.ts`

These wrap `api` with typed React Query hooks. No tests at the hook level for M3 — the `api` client is tested and hooks are thin wrappers.

- [ ] **Step 1: `apps/storefront/src/hooks/useProducts.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import type { Product, ProductWithRelations, ProductListQuery } from '@skipper/shared';
import { api } from '@/lib/api';

export function useProducts(query: Partial<ProductListQuery> = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  return useQuery({
    queryKey: ['products', 'list', query],
    queryFn: () =>
      api.getPaginated<Product>(`/api/products${params.toString() ? `?${params}` : ''}`),
  });
}

export function useFeaturedProducts(limit = 12) {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: () => api.get<Product[]>(`/api/products/featured?limit=${limit}`),
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['products', 'bySlug', slug],
    enabled: Boolean(slug),
    queryFn: () => api.get<ProductWithRelations>(`/api/products/${slug}`),
  });
}

export function useProductSearch(q: string, limit = 20) {
  return useQuery({
    queryKey: ['products', 'search', q, limit],
    enabled: q.trim().length >= 2,
    queryFn: () =>
      api.get<Product[]>(`/api/products/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  });
}
```

- [ ] **Step 2: `apps/storefront/src/hooks/useCategories.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import type { Category, Product } from '@skipper/shared';
import { api } from '@/lib/api';

export interface CategoryWithCount extends Category {
  product_count: number;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => api.get<CategoryWithCount[]>('/api/categories'),
  });
}

export function useCategoryProducts(slug: string | undefined, page = 1, per_page = 20) {
  return useQuery({
    queryKey: ['categories', 'products', slug, page, per_page],
    enabled: Boolean(slug),
    queryFn: () =>
      api.getPaginated<{ category: Category; products: Product[] } | unknown>(
        `/api/categories/${slug}/products?page=${page}&per_page=${per_page}`,
      ),
  });
}
```

- [ ] **Step 3: `apps/storefront/src/hooks/useSettings.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PublicSettings = Partial<{
  store_name: string;
  store_tagline: string;
  store_email: string;
  store_phone: string;
  currency: string;
  delivery_fee_accra: string;
  delivery_fee_other: string;
  free_delivery_threshold: string;
  manual_payment_details: string;
  pickup_address: string;
  paystack_public_key: string;
}>;

export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    staleTime: 10 * 60_000,
    queryFn: () => api.get<PublicSettings>('/api/settings/public'),
  });
}
```

- [ ] **Step 4: `apps/storefront/src/hooks/useCart.ts`**

```typescript
import { useCartStore } from '@/stores/cartStore';

export function useCart() {
  const items = useCartStore((s) => s.items);
  const totalQuantity = useCartStore((s) => s.totalQuantity());
  return {
    items,
    totalQuantity,
    addItem: useCartStore.getState().addItem,
    removeItem: useCartStore.getState().removeItem,
    updateQuantity: useCartStore.getState().updateQuantity,
    clear: useCartStore.getState().clear,
  };
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @skipper/storefront typecheck`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/hooks/
git commit -m "feat(storefront): add TanStack Query hooks for products, categories, settings, cart"
```

---

## Task 7: Layout components

**Files:**

- Create: `apps/storefront/src/components/layout/AnnouncementBar.tsx`
- Create: `apps/storefront/src/components/layout/Header.tsx`
- Create: `apps/storefront/src/components/layout/Footer.tsx`
- Create: `apps/storefront/src/components/layout/MobileNav.tsx`
- Create: `apps/storefront/src/components/layout/RootLayout.tsx`

- [ ] **Step 1: `apps/storefront/src/components/layout/AnnouncementBar.tsx`**

```tsx
export function AnnouncementBar() {
  return (
    <div
      role="banner"
      className="bg-primary text-primary-foreground text-center text-xs md:text-sm py-2 px-4"
    >
      <p>
        Free delivery on orders over <strong>GHS 200</strong> · Same-day Accra delivery · Secure
        Paystack checkout
      </p>
    </div>
  );
}
```

- [ ] **Step 2: `apps/storefront/src/components/layout/Header.tsx`**

```tsx
import { Link, NavLink } from 'react-router-dom';
import { Menu, Search, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useUiStore } from '@/stores/uiStore';
import { STORE_NAME } from '@/lib/env';

const NAV_LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/bulk', label: 'Bulk' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const { totalQuantity } = useCart();
  const openMobileNav = useUiStore((s) => s.openMobileNav);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={openMobileNav}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>

        <Link
          to="/"
          className="font-semibold text-lg tracking-tight text-primary"
          aria-label={`${STORE_NAME} — home`}
        >
          {STORE_NAME}
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-8" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Search" className="hidden sm:inline-flex">
            <Search className="h-5 w-5" aria-hidden="true" />
          </Button>

          <Link to="/cart" aria-label={`Cart (${totalQuantity} items)`}>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {totalQuantity > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs min-w-[1.25rem] h-5 rounded-full flex items-center justify-center px-1"
                  aria-hidden="true"
                >
                  {totalQuantity}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: `apps/storefront/src/components/layout/Footer.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { STORE_NAME } from '@/lib/env';

export function Footer() {
  return (
    <footer className="border-t border-border bg-accent/30 mt-16" role="contentinfo">
      <div className="container py-12 grid gap-10 md:grid-cols-4">
        <div>
          <h2 className="font-semibold text-lg mb-2">{STORE_NAME}</h2>
          <p className="text-sm text-muted-foreground">
            Premium cleaning &amp; bathroom essentials, delivered across Ghana.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Shop</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/shop" className="hover:text-primary">
                All Products
              </Link>
            </li>
            <li>
              <Link to="/bulk" className="hover:text-primary">
                Bulk Orders
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Company</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/about" className="hover:text-primary">
                About
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-primary">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/privacy" className="hover:text-primary">
                Privacy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container py-4 text-xs text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} {STORE_NAME} Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: `apps/storefront/src/components/layout/MobileNav.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/uiStore';

const NAV_LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/bulk', label: 'Bulk' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/faq', label: 'FAQ' },
];

export function MobileNav() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const close = useUiStore((s) => s.closeMobileNav);

  return (
    <Sheet open={open} onClose={close} side="left" title="Navigation">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold">Menu</h2>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Close menu">
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      <nav className="flex flex-col p-4 gap-1" aria-label="Mobile">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={close}
            className="py-3 px-3 rounded-sm text-base font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </Sheet>
  );
}
```

- [ ] **Step 5: `apps/storefront/src/components/layout/RootLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <MobileNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @skipper/storefront typecheck`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add apps/storefront/src/components/layout/
git commit -m "feat(storefront): add AnnouncementBar, Header, Footer, MobileNav, RootLayout"
```

---

## Task 8: SEO primitives

**Files:**

- Create: `apps/storefront/src/components/seo/SEOHead.tsx`
- Create: `apps/storefront/src/components/seo/JsonLd.tsx`
- Create: `apps/storefront/src/components/seo/CanonicalUrl.tsx`
- Create: `apps/storefront/src/components/seo/Breadcrumbs.tsx`
- Create: `apps/storefront/tests/components/SEOHead.test.tsx`
- Create: `apps/storefront/tests/components/Breadcrumbs.test.tsx`

- [ ] **Step 1: `apps/storefront/src/components/seo/SEOHead.tsx`**

```tsx
import { Helmet } from 'react-helmet-async';
import { STORE_NAME } from '@/lib/env';

export interface SEOHeadProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
}

export function SEOHead({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
}: SEOHeadProps) {
  const fullTitle = title.includes(STORE_NAME) ? title : `${title} | ${STORE_NAME}`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex,follow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:site_name" content={STORE_NAME} />

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
```

- [ ] **Step 2: `apps/storefront/src/components/seo/JsonLd.tsx`**

```tsx
import { Helmet } from 'react-helmet-async';

export interface JsonLdProps<T> {
  data: T;
}

export function JsonLd<T>({ data }: JsonLdProps<T>) {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}
```

- [ ] **Step 3: `apps/storefront/src/components/seo/CanonicalUrl.tsx`**

```tsx
import { Helmet } from 'react-helmet-async';

export function CanonicalUrl({ path }: { path: string }) {
  // In production the canonical base comes from deploy env; for M3 we use the current origin.
  const origin =
    typeof window === 'undefined' ? 'https://skipperdetergents.com.gh' : window.location.origin;
  return (
    <Helmet>
      <link rel="canonical" href={`${origin}${path}`} />
    </Helmet>
  );
}
```

- [ ] **Step 4: `apps/storefront/src/components/seo/Breadcrumbs.tsx`**

Renders both a visible breadcrumb nav and a matching `BreadcrumbList` JSON-LD.

```tsx
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { JsonLd } from './JsonLd';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  origin?: string;
}

export function Breadcrumbs({ items, origin }: BreadcrumbsProps) {
  const base =
    origin ??
    (typeof window === 'undefined' ? 'https://skipperdetergents.com.gh' : window.location.origin);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      ...(item.href ? { item: `${base}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="container py-3">
        <ol className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground">
          {items.map((item, idx) => (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {item.href && idx < items.length - 1 ? (
                <Link to={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span className={idx === items.length - 1 ? 'text-foreground font-medium' : ''}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={jsonLd} />
    </>
  );
}
```

- [ ] **Step 5: Failing test — `apps/storefront/tests/components/SEOHead.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { SEOHead } from '../../src/components/seo/SEOHead';

function renderWithHelmet(ui: React.ReactNode) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

beforeEach(() => {
  document.head.innerHTML = '';
});

describe('SEOHead', () => {
  it('sets title with store name suffix', async () => {
    renderWithHelmet(<SEOHead title="Shop" description="All products" />);
    await new Promise((r) => setTimeout(r, 0));
    expect(document.title).toContain('Shop');
    expect(document.title).toContain('Skipper Detergents');
  });

  it('does not duplicate the store name when already in the title', async () => {
    renderWithHelmet(<SEOHead title="Skipper Detergents — Home" />);
    await new Promise((r) => setTimeout(r, 0));
    expect(document.title).toBe('Skipper Detergents — Home');
  });

  it('sets og:title and og:description meta tags', async () => {
    renderWithHelmet(<SEOHead title="Shop" description="Browse everything" />);
    await new Promise((r) => setTimeout(r, 0));
    const og = document.querySelector('meta[property="og:title"]');
    expect(og?.getAttribute('content')).toContain('Shop');
    const desc = document.querySelector('meta[property="og:description"]');
    expect(desc?.getAttribute('content')).toBe('Browse everything');
  });

  it('sets noindex meta when noindex=true', async () => {
    renderWithHelmet(<SEOHead title="Cart" noindex />);
    await new Promise((r) => setTimeout(r, 0));
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toBe('noindex,follow');
  });
});
```

- [ ] **Step 6: Failing test — `apps/storefront/tests/components/Breadcrumbs.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Breadcrumbs } from '../../src/components/seo/Breadcrumbs';

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <HelmetProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  document.head.innerHTML = '';
});

describe('Breadcrumbs', () => {
  it('renders each item, linking all but the last', () => {
    renderWithProviders(
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
          { label: 'Detergents' },
        ]}
      />,
    );
    const home = screen.getByRole('link', { name: 'Home' });
    expect(home).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Shop' })).toBeInTheDocument();
    expect(screen.getByText('Detergents')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Detergents' })).toBeNull();
  });

  it('emits a BreadcrumbList JSON-LD script', async () => {
    renderWithProviders(
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
        ]}
        origin="https://example.test"
      />,
    );
    await new Promise((r) => setTimeout(r, 0));
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent ?? '{}');
    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[0].name).toBe('Home');
    expect(data.itemListElement[0].item).toBe('https://example.test/');
  });
});
```

- [ ] **Step 7: Run tests — expect PASS**

Run: `pnpm --filter @skipper/storefront test`

- [ ] **Step 8: Commit**

```bash
git add apps/storefront/src/components/seo/ apps/storefront/tests/components/SEOHead.test.tsx apps/storefront/tests/components/Breadcrumbs.test.tsx
git commit -m "feat(storefront): add SEO primitives (SEOHead, JsonLd, CanonicalUrl, Breadcrumbs)"
```

---

## Task 9: Shared components — LoadingSpinner, ErrorBoundary, SkeletonCard

**Files:**

- Create: `apps/storefront/src/components/shared/LoadingSpinner.tsx`
- Create: `apps/storefront/src/components/shared/ErrorBoundary.tsx`
- Create: `apps/storefront/src/components/shared/SkeletonCard.tsx`

- [ ] **Step 1: `apps/storefront/src/components/shared/LoadingSpinner.tsx`**

```tsx
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-flex items-center justify-center text-muted-foreground', className)}
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
    </span>
  );
}
```

- [ ] **Step 2: `apps/storefront/src/components/shared/ErrorBoundary.tsx`**

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="container py-20 flex flex-col items-center text-center gap-4 max-w-md"
        >
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            The page hit an unexpected error. Refresh to try again, or head back to the homepage.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Refresh</Button>
            <Button variant="outline" onClick={() => (window.location.href = '/')}>
              Home
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 3: `apps/storefront/src/components/shared/SkeletonCard.tsx`**

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="aspect-square w-full rounded-b-none" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/components/shared/
git commit -m "feat(storefront): add LoadingSpinner, ErrorBoundary, SkeletonCard"
```

---

## Task 10: Stub pages + Router + main entry

**Files:**

- Create: every `apps/storefront/src/pages/*.tsx` (14 files — stubs)
- Create: `apps/storefront/src/App.tsx`
- Create: `apps/storefront/src/main.tsx`

- [ ] **Step 1: Create a single helper pattern and 14 stub pages**

Every stub page follows this shape — just title + SEO + breadcrumb. We define a reusable `PageStub` component, then each page uses it with its own props.

Create `apps/storefront/src/pages/_PageStub.tsx`:

```tsx
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/seo/Breadcrumbs';

export interface PageStubProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  noindex?: boolean;
  children?: React.ReactNode;
}

export function PageStub({ title, description, breadcrumbs, noindex, children }: PageStubProps) {
  return (
    <>
      <SEOHead title={title} description={description} noindex={noindex} />
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="container py-12">
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">{title}</h1>
        {description && <p className="mt-3 text-muted-foreground max-w-2xl">{description}</p>}
        {children}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create each page (14 files). Contents:**

`apps/storefront/src/pages/Home.tsx`:

```tsx
import { PageStub } from './_PageStub';

export default function Home() {
  return (
    <PageStub
      title="Skipper Detergents"
      description="Premium cleaning and bathroom essentials, delivered across Ghana. Shop the catalog, save with bulk pricing, pay with Paystack or mobile money."
    />
  );
}
```

`apps/storefront/src/pages/Shop.tsx`:

```tsx
import { PageStub } from './_PageStub';

export default function Shop() {
  return (
    <PageStub
      title="Shop"
      description="Every Skipper product — detergents, tissue, paper towels, bathroom accessories, and more."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Shop' }]}
    />
  );
}
```

`apps/storefront/src/pages/Category.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { PageStub } from './_PageStub';

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const label = slug ? slug.replace(/-/g, ' ') : 'Category';
  return (
    <PageStub
      title={label.replace(/\b\w/g, (c) => c.toUpperCase())}
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/shop' },
        { label: label.replace(/\b\w/g, (c) => c.toUpperCase()) },
      ]}
    />
  );
}
```

`apps/storefront/src/pages/ProductDetail.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { PageStub } from './_PageStub';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PageStub
      title={slug?.replace(/-/g, ' ') ?? 'Product'}
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/shop' },
        { label: slug ?? 'Product' },
      ]}
    />
  );
}
```

`apps/storefront/src/pages/BulkOrder.tsx`:

```tsx
import { PageStub } from './_PageStub';

export default function BulkOrder() {
  return (
    <PageStub
      title="Bulk Orders"
      description="Save more when you order in quantity. Tiered pricing for offices, schools, retailers, and events."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Bulk' }]}
    />
  );
}
```

`apps/storefront/src/pages/Cart.tsx`:

```tsx
import { PageStub } from './_PageStub';

export default function Cart() {
  return (
    <PageStub
      title="Your Cart"
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Cart' }]}
      noindex
    />
  );
}
```

`apps/storefront/src/pages/Checkout.tsx`:

```tsx
import { PageStub } from './_PageStub';

export default function Checkout() {
  return (
    <PageStub
      title="Checkout"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Cart', href: '/cart' },
        { label: 'Checkout' },
      ]}
      noindex
    />
  );
}
```

`apps/storefront/src/pages/OrderConfirmation.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { PageStub } from './_PageStub';

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  return (
    <PageStub
      title={`Order ${orderNumber ?? ''}`}
      description="Thank you for your order."
      noindex
    />
  );
}
```

`apps/storefront/src/pages/OrderTracking.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { PageStub } from './_PageStub';

export default function OrderTracking() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  return (
    <PageStub
      title={`Track order ${orderNumber ?? ''}`}
      description="See the status of your order."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Order tracking' }]}
      noindex
    />
  );
}
```

`apps/storefront/src/pages/About.tsx`:

```tsx
import { PageStub } from './_PageStub';

export default function About() {
  return (
    <PageStub
      title="About Skipper Detergents"
      description="A Ghanaian household-essentials brand. Our story, our products, our commitment to quality."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
    />
  );
}
```

`apps/storefront/src/pages/Contact.tsx`:

```tsx
import { PageStub } from './_PageStub';

export default function Contact() {
  return (
    <PageStub
      title="Contact Us"
      description="Get in touch with the Skipper Detergents team."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
    />
  );
}
```

`apps/storefront/src/pages/FAQ.tsx`:

```tsx
import { PageStub } from './_PageStub';

export default function FAQ() {
  return (
    <PageStub
      title="Frequently Asked Questions"
      description="Answers to common questions about ordering, delivery, returns, and bulk pricing."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'FAQ' }]}
    />
  );
}
```

`apps/storefront/src/pages/PrivacyPolicy.tsx`:

```tsx
import { PageStub } from './_PageStub';

export default function PrivacyPolicy() {
  return (
    <PageStub
      title="Privacy Policy"
      description="How we collect, use, and protect your information."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Privacy' }]}
    />
  );
}
```

`apps/storefront/src/pages/NotFound.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';

export default function NotFound() {
  return (
    <>
      <SEOHead title="Page not found (404)" noindex />
      <div className="container py-24 flex flex-col items-center text-center gap-4 max-w-md">
        <h1 className="text-5xl font-semibold text-primary">404</h1>
        <p className="text-muted-foreground">
          We couldn&apos;t find that page. Try heading back to the shop.
        </p>
        <div className="flex gap-2">
          <Link to="/">
            <Button>Go home</Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline">Browse products</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: `apps/storefront/src/App.tsx` with lazy-loaded routes**

```tsx
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const Home = lazy(() => import('@/pages/Home'));
const Shop = lazy(() => import('@/pages/Shop'));
const Category = lazy(() => import('@/pages/Category'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const BulkOrder = lazy(() => import('@/pages/BulkOrder'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const OrderTracking = lazy(() => import('@/pages/OrderTracking'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner />
              </div>
            }
          >
            <RootLayout />
          </Suspense>
        }
      >
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="shop/:slug" element={<Category />} />
        <Route path="product/:slug" element={<ProductDetail />} />
        <Route path="bulk" element={<BulkOrder />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:orderNumber" element={<OrderConfirmation />} />
        <Route path="track/:orderNumber" element={<OrderTracking />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 4: `apps/storefront/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { queryClient } from '@/lib/queryClient';
import './styles/globals.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('No #root element found in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
```

- [ ] **Step 5: Typecheck and build**

Run:

```bash
pnpm --filter @skipper/storefront typecheck
pnpm --filter @skipper/storefront build
```

Expected: both succeed. The build produces `dist/` with hashed assets.

- [ ] **Step 6: Boot the dev server and sanity-check routes**

Run in one terminal:

```bash
pnpm --filter @skipper/storefront dev
```

Then in a browser (or `curl -I`), confirm the following routes return 200 and the expected `<title>`:

- `http://localhost:5173/`
- `http://localhost:5173/shop`
- `http://localhost:5173/shop/detergents-laundry`
- `http://localhost:5173/product/skipper-liquid-detergent-2l`
- `http://localhost:5173/bulk`
- `http://localhost:5173/cart`
- `http://localhost:5173/nope` (renders NotFound)

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add apps/storefront/src/pages/ apps/storefront/src/App.tsx apps/storefront/src/main.tsx
git commit -m "feat(storefront): add stub pages, lazy-loaded router, app entry"
```

---

## Task 11: Cloudflare Pages deploy workflow

**Files:**

- Create: `.github/workflows/deploy-storefront.yml`

- [ ] **Step 1: Create `.github/workflows/deploy-storefront.yml`**

```yaml
name: Deploy Storefront

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm --filter @skipper/storefront typecheck

      - run: pnpm --filter @skipper/storefront test

      - run: pnpm --filter @skipper/storefront build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/storefront
          command: pages deploy ./dist --project-name=skipper-storefront
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-storefront.yml
git commit -m "ci: add manual-dispatch workflow for storefront deploys"
```

---

## Task 12: Deploy first storefront build via Wrangler Pages

This step is user-owned but scripted — the MCP doesn't cover Pages create+deploy, so we use the local `wrangler` CLI (already authenticated).

**Files:** none — operational.

- [ ] **Step 1: Build the storefront**

Run:

```bash
pnpm --filter @skipper/storefront build
```

Expected: `apps/storefront/dist/` is populated with hashed JS/CSS and the `index.html` referencing them.

- [ ] **Step 2: Deploy (creates the Pages project on first run)**

Run:

```bash
pnpm --filter @skipper/storefront exec wrangler pages deploy ./dist --project-name=skipper-storefront
```

Expected: wrangler creates the `skipper-storefront` project, uploads `dist/`, and prints a URL like `https://<hash>.skipper-storefront.pages.dev` plus the production alias `https://skipper-storefront.pages.dev`.

- [ ] **Step 3: Smoke-test the deployed URL**

Run:

```bash
BASE=https://skipper-storefront.pages.dev
curl -s -o /dev/null -w '%{http_code}\n' $BASE/
curl -s $BASE/ | grep -o '<title>[^<]*</title>' | head -1
curl -s -o /dev/null -w '%{http_code}\n' $BASE/shop
curl -s -o /dev/null -w '%{http_code}\n' $BASE/product/skipper-liquid-detergent-2l
curl -s -o /dev/null -w '%{http_code}\n' $BASE/nope
```

**Important note about SPA 404s on Cloudflare Pages:** by default, Pages serves `index.html` for unknown paths only if a `_redirects` or `_routes.json` tells it to. Without that, `/shop` returns 404. To fix, add a rewrite file in `public/`.

- [ ] **Step 4: Add `apps/storefront/public/_redirects` for SPA fallback**

Create `apps/storefront/public/_redirects`:

```
/*    /index.html   200
```

Rebuild + redeploy:

```bash
pnpm --filter @skipper/storefront build
pnpm --filter @skipper/storefront exec wrangler pages deploy ./dist --project-name=skipper-storefront
```

Re-run the smoke test. Every route should now return 200 (NotFound still renders, but the HTTP response is 200 because SPA handles routing client-side — that's correct for CSR).

- [ ] **Step 5: Commit `_redirects`**

```bash
git add apps/storefront/public/_redirects
git commit -m "fix(storefront): add SPA fallback _redirects for Cloudflare Pages"
```

---

## Task 13: Update README + push + merge

**Files:**

- Modify: `README.md` (add Live Storefront link to the header)

- [ ] **Step 1: Add a Live Storefront badge + link near the top of `README.md`**

Right after the existing `Live API` badge, add:

```markdown
[![Live Storefront](https://img.shields.io/badge/Storefront-live-0B2545?logo=cloudflare&logoColor=white)](https://skipper-storefront.pages.dev)
```

And in the **Deployment** section, add a subsection after the Worker-secrets block:

````markdown
### Storefront deployment

The storefront is a Vite + React SPA deployed to Cloudflare Pages. CI workflow: `.github/workflows/deploy-storefront.yml` (manual dispatch). First deploy is done once locally:

```bash
pnpm --filter @skipper/storefront build
pnpm --filter @skipper/storefront exec wrangler pages deploy ./dist --project-name=skipper-storefront
```
````

Production URL: <https://skipper-storefront.pages.dev>

````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add live storefront link and deploy notes"
````

- [ ] **Step 3: Push feature branch**

```bash
git push -u origin feat/milestone-3-storefront-shell
```

- [ ] **Step 4: Merge to main**

```bash
git checkout main
git merge feat/milestone-3-storefront-shell
git push
git branch -d feat/milestone-3-storefront-shell
```

CI must go green on main. If it fails, fix inline before finishing.

---

## Definition of Done — Milestone 3

- [ ] `pnpm --filter @skipper/storefront build` succeeds; bundle initial JS ≤ 200 KB gzipped.
- [ ] `pnpm --filter @skipper/storefront typecheck` clean, `pnpm --filter @skipper/storefront lint` clean.
- [ ] All 14 routes render without JS errors in a real browser (checked against the dev server).
- [ ] Each page has a unique `<title>` and a description meta tag.
- [ ] Cart add/increment/decrement/remove/clear all work against the Zustand store; state survives a page reload (persist middleware).
- [ ] 404 route renders the `NotFound` page.
- [ ] Every `/cart`, `/checkout`, `/order/*`, `/track/*` route sets `<meta name="robots" content="noindex,follow">`.
- [ ] Breadcrumb nav renders on category/product/bulk/about/contact/faq/privacy pages and includes a matching `BreadcrumbList` JSON-LD script.
- [ ] Header shows a cart count badge when items are in cart.
- [ ] Mobile nav opens/closes via hamburger button.
- [ ] Typed API client (`api.get/getPaginated/post/patch`) throws `ApiError` on envelope `success:false`.
- [ ] Storefront deployed to `https://skipper-storefront.pages.dev` and all stub routes return 200.
- [ ] `robots.txt` disallows `/cart`, `/checkout`, `/order/` and points to the API sitemap.
- [ ] GitHub Actions deploy-storefront workflow present and ready to run on secret configuration.
- [ ] README badge + deploy section updated.

## What milestone 4 depends on from 3

1. All TanStack Query hooks (`useProducts`, `useFeaturedProducts`, `useProduct`, `useCategories`, `useCategoryProducts`, `usePublicSettings`) are ready to be consumed by real page content.
2. Cart store shape (`{ product_id, variant_id?, quantity }`) is already consistent with `cartItemSchema` from `@skipper/shared`.
3. shadcn/ui primitives (`Button`, `Card`, `Input`, `Sheet`, `Dialog`, `Skeleton`) are available for building the product grid, cart drawer, checkout form.
4. SEO primitives (`SEOHead`, `JsonLd`, `Breadcrumbs`, `CanonicalUrl`) are ready — milestone 4 just passes them per-page data (Product JSON-LD for detail pages, etc.).
5. `ErrorBoundary` wraps the whole app — milestone 4 pages don't need their own boundaries.
6. Stub pages become real: each `src/pages/*.tsx` gets replaced with full implementation.
