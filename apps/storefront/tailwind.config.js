/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1B3A2E', mid: '#2E6B4F', light: '#E6F2EC' },
        accent: { DEFAULT: '#B03A2E', light: '#FAEAEA' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
