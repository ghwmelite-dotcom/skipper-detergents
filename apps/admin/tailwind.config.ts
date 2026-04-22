import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Grayscale-first admin palette — Linear/Stripe-inspired.
        // Navy for primary/accent, cyan for active/selected, red for danger, green for paid.
        ink: {
          50: '#F7F8FA',
          100: '#EEF0F4',
          200: '#DFE3EA',
          300: '#C4CBD5',
          400: '#9AA3B2',
          500: '#6B7280',
          600: '#4A5463',
          700: '#323944',
          800: '#1F242C',
          900: '#11151B',
        },
        navy: {
          50: '#EEF3FA',
          500: '#1F4E8A',
          600: '#183F72',
          700: '#0B2545',
          800: '#091C38',
        },
        cyan: {
          50: '#E6FAFF',
          500: '#00B4D8',
          600: '#0094B3',
        },
        danger: {
          50: '#FEF2F3',
          500: '#E63946',
          600: '#C72F3B',
        },
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
      },
      boxShadow: {
        'admin-sm': '0 1px 1px rgb(17 21 27 / 0.04), 0 1px 2px rgb(17 21 27 / 0.04)',
        'admin-md': '0 1px 2px rgb(17 21 27 / 0.06), 0 4px 10px -4px rgb(17 21 27 / 0.08)',
        'admin-lg': '0 1px 2px rgb(17 21 27 / 0.06), 0 12px 28px -10px rgb(17 21 27 / 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
