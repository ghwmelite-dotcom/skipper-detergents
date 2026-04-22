import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        md: '2rem',
        lg: '3rem',
      },
      screens: {
        '2xl': '1360px',
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

        // Raw brand tokens — Editorial Coastal Modern
        brand: {
          navy: '#0B2545',
          'navy-dark': '#091C38',
          'navy-soft': '#1B3358',
          cyan: '#00B4D8',
          'cyan-deep': '#0094B3',
          red: '#E63946',
          sand: '#F4EDE0',
          'sand-warm': '#EEE3D0',
          ivory: '#FCFBF7',
          mist: '#E8EEF3',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['"Fraunces Variable"', 'Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        // Editorial display sizes — clamp-based for fluid typography
        'display-xs': ['clamp(1.75rem, 2.5vw, 2.25rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(2rem, 3.5vw, 2.75rem)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '0.98', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(3rem, 7vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.035em' }],
        'display-xl': ['clamp(3.25rem, 8vw, 7rem)', { lineHeight: '0.92', letterSpacing: '-0.04em' }],
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(11 37 69 / 0.05)',
        md: '0 4px 6px -1px rgb(11 37 69 / 0.08), 0 2px 4px -2px rgb(11 37 69 / 0.04)',
        lg: '0 10px 25px -5px rgb(11 37 69 / 0.10), 0 8px 10px -6px rgb(11 37 69 / 0.06)',
        xl: '0 20px 40px -12px rgb(11 37 69 / 0.18), 0 12px 20px -8px rgb(11 37 69 / 0.08)',
        'editorial': '0 30px 60px -20px rgb(11 37 69 / 0.25), 0 18px 36px -18px rgb(11 37 69 / 0.12)',
      },
      transitionTimingFunction: {
        enter: 'cubic-bezier(0, 0, 0.2, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        editorial: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'drift-slow': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(12px, -8px)' },
        },
        'gradient-shift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          '50%': { transform: 'translate3d(-2%, 1%, 0) rotate(5deg)' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        'drift-slow': 'drift-slow 14s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 24s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
