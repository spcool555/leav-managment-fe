/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f9fffe',
          100: '#f5fdfc',
          200: '#edfbf9',
          300: '#e0f5f3',
          400: '#ccebe8',
          500: '#b3e0dc',
          600: '#97d3cd', // Exact target color
          700: '#7cbdbe', // Darker shade for hover state
          800: '#629e97',
          900: '#487f79',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
