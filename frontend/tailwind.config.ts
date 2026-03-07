import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0D1B2A',
        blue: {
          DEFAULT: '#1D6FA4',
          pale: '#EBF5FB',
        },
        green: {
          DEFAULT: '#0E7C59',
          pale: '#E8F6F0',
        },
        amber: {
          DEFAULT: '#B45309',
          pale: '#FEF3C7',
        },
        red: {
          DEFAULT: '#C0392B',
          pale: '#FDECEA',
        },
        background: '#F4F6F9',
        surface: '#FFFFFF',
        'surface-2': '#F0F2F5',
        border: '#E2E6ED',
        text: '#1A2332',
        'text-muted': '#64748B',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
