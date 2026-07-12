/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        positive: '#22c55e',
        negative: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flashUp: {
          '0%': { backgroundColor: 'rgba(34,197,94,0.35)' },
          '100%': { backgroundColor: 'rgba(34,197,94,0)' },
        },
        flashDown: {
          '0%': { backgroundColor: 'rgba(239,68,68,0.35)' },
          '100%': { backgroundColor: 'rgba(239,68,68,0)' },
        },
        pageIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'flash-up': 'flashUp 900ms ease-out',
        'flash-down': 'flashDown 900ms ease-out',
        'page-in': 'pageIn 240ms ease-out',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
