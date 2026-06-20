/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E85D04',
        'primary-dark': '#C94D00',
        'primary-light': '#FF7622',
        dark: '#1A1A2E',
        'dark-2': '#16213E',
        'dark-3': '#0F3460',
      }
    }
  },
  plugins: []
}
