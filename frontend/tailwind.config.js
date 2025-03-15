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
          DEFAULT: '#4361ee',
          dark: '#3251cc',
          light: '#6982f1',
        },
        background: {
          dark: '#121212',
          light: '#334155',
          sidebar: 'rgba(30, 58, 138, 0.9)',
        },
      },
      boxShadow: {
        'custom': '0 2px 5px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}

