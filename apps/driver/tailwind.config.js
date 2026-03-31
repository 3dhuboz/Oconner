/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#4E7732', mid: '#6A9E48', light: '#E8F2DC' },
        accent: { DEFAULT: '#C0392B', light: '#FAEAE8' },
      },
    },
  },
  plugins: [],
};
