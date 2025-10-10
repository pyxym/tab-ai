/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  darkMode: 'class',
  content: ['./**/*.tsx'],
  theme: {
    extend: {
      colors: {
        ai: {
          primary: '#8B5CF6',
          secondary: '#EC4899',
          accent: '#3B82F6',
          dark: '#1E1B4B',
          light: '#F3F4F6',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        gradient: 'gradient 3s ease infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
        },
        '.scrollbar-thumb-white\\/20': {
          'scrollbar-color': 'rgba(255, 255, 255, 0.2) transparent',
        },
        '.scrollbar-track-transparent': {
          'scrollbar-color': 'transparent transparent',
        },
      });
    },
  ],
};
