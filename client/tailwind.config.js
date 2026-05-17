/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f1115', // very dark, like screenshot
          card: '#171923', // slightly lighter for cards
          border: '#2d3748',
          text: '#f7fafc',
          muted: '#a0aec0'
        },
        brand: {
          primary: '#3182ce', // blue from charts
          success: '#38a169', // green from savings
          danger: '#e53e3e',  // red from expenses
          accent: '#4fd1c5' // teal
        }
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.3s ease-out'
      }
    },
  },
  plugins: [],
}
