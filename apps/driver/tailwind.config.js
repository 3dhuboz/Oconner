/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1B3A2E', mid: '#2E6B4F', light: '#E6F2EC' },
        accent: { DEFAULT: '#B03A2E', light: '#FAEAEA' },
      },
    },
  },
  plugins: [],
};
