/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        laranja: '#E8501F',
        grafite: '#1F2937',
        cinza: '#E5E6E8',
        amarelo: '#F5C518',
      },
      fontFamily: {
        titulo: ['"Archivo Black"', 'sans-serif'],
        corpo: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
