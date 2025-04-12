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
          DEFAULT: '#2563EB', // Blue-600
          light: '#93C5FD', // Blue-300
          dark: '#1D4ED8', // Blue-700
        },
        secondary: {
          DEFAULT: '#10B981', // Emerald-500
          light: '#6EE7B7', // Emerald-300
          dark: '#059669', // Emerald-600
        },
        background: {
          DEFAULT: '#F9FAFB', // Gray-50
          dark: '#1F2937', // Gray-800
          light: '#F3F4F6', // Gray-100
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#374151', // Gray-700
          light: '#F9FAFB', // Gray-50
        },
        accent: {
          DEFAULT: '#F59E0B', // Amber-500
          light: '#FCD34D', // Amber-300
          dark: '#D97706', // Amber-600
        },
        error: {
          DEFAULT: '#EF4444', // Red-500
          light: '#FCA5A5', // Red-300
          dark: '#DC2626', // Red-600
        },
        success: {
          DEFAULT: '#10B981', // Emerald-500
          light: '#6EE7B7', // Emerald-300
          dark: '#059669', // Emerald-600
        },
        warning: {
          DEFAULT: '#F59E0B', // Amber-500
          light: '#FCD34D', // Amber-300
          dark: '#D97706', // Amber-600
        },
        info: {
          DEFAULT: '#3B82F6', // Blue-500
          light: '#93C5FD', // Blue-300
          dark: '#2563EB', // Blue-600
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        card: '0 4px 15px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 6px 20px rgba(0, 0, 0, 0.12)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        none: 'none',
      },
      borderRadius: {
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}