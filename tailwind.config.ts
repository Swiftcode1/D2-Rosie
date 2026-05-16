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
        cream: {
          50: '#fdfbf7',
          100: '#faf6ee',
          200: '#f3ead8'
        },
        rosie: {
          50: '#fdf4f2',
          100: '#fbe7e2',
          200: '#f4c5b9',
          300: '#e89c8b',
          400: '#d77562',
          500: '#b9543f',
          600: '#9a4231',
          700: '#7a3326'
        },
        gold: {
          100: '#f7eed2',
          200: '#ecd9a0',
          300: '#d9bb6c',
          400: '#bd9847',
          500: '#9a7a32'
        },
        charcoal: {
          400: '#5b5754',
          500: '#3d3a37',
          600: '#2b2926',
          700: '#1c1b19'
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(122, 51, 38, 0.12)',
        card: '0 4px 20px -4px rgba(60, 50, 40, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
