import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Warm ivory — Rosewood's signature off-white tone
        cream: {
          50: '#f8f4ec',
          100: '#f1eadc',
          200: '#e3d6bc',
          300: '#cbb992'
        },
        // Wine / burgundy — the deep, refined "rose" accent
        rosie: {
          50: '#f5ecea',
          100: '#ead7d2',
          200: '#cea99e',
          300: '#a87265',
          400: '#7f4639',
          500: '#5a2820',
          600: '#451c16',
          700: '#2e120e'
        },
        // Brass / antique gold — luxury metallic accent
        gold: {
          100: '#eee2bf',
          200: '#dcc287',
          300: '#bfa05a',
          400: '#8d6b30',
          500: '#6d5223'
        },
        // Ink — refined near-black for primary type
        charcoal: {
          400: '#56504a',
          500: '#37322d',
          600: '#1f1c18',
          700: '#0f0d0a'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif']
      },
      letterSpacing: {
        editorial: '0.3em',
        wordmark: '0.45em'
      },
      boxShadow: {
        soft: '0 30px 60px -30px rgba(15, 13, 10, 0.25)',
        card: '0 1px 0 rgba(15, 13, 10, 0.04), 0 12px 30px -18px rgba(15, 13, 10, 0.18)'
      }
    }
  },
  plugins: []
};

export default config;
