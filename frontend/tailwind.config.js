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
          DEFAULT: '#8ab4f8', // Google's blue in dark mode
          dark: '#669df6',    // Darker blue
          light: '#aecbfa',   // Lighter blue
        },
        background: {
          dark: '#202124',    // Google's dark background
          light: '#303134',   // Google's lighter dark surface
          sidebar: 'rgba(32, 33, 36, 0.9)', // Semi-transparent sidebar
          surface: '#2d2e31', // Google's surface color in dark mode
        },
        google: {
          blue: '#8ab4f8',
          red: '#f28b82',
          yellow: '#fdd663',
          green: '#81c995',
          grey: {
            100: '#e8eaed',
            200: '#bdc1c6',
            300: '#9aa0a6',
            400: '#80868b',
            500: '#5f6368',
          }
        },
      },
      fontFamily: {
        'google-sans': ['Google Sans', 'Roboto', 'Arial', 'sans-serif'],
        'roboto': ['Roboto', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'google': '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
        'google-hover': '0 1px 3px 0 rgba(60, 64, 67, 0.4), 0 4px 8px 3px rgba(60, 64, 67, 0.25)',
      },
      borderRadius: {
        'google': '8px',
      },
    },
  },
  plugins: [],
}