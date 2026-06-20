/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        azul:    '#1E3A5F',
        laranja: '#F97316',
        amarelo: '#F5C518',
        grafite: '#1F2937',
      },
      fontFamily: {
        titulo: ['"Archivo Black"', 'sans-serif'],
        corpo:  ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
