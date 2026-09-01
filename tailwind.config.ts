import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#090a0f',
          900: '#11131b',
          800: '#191d29',
          700: '#252b3b',
        },
        felt: '#0f5132',
        gold: '#f5c84b',
        coral: '#ff6b6b',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 18px 60px rgba(0, 0, 0, 0.32)',
      },
    },
  },
  plugins: [],
} satisfies Config
