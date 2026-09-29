/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#162235', // Original dark navy for hero overlay
        },
        gold: {
          400: '#EAB308', // yellow-500 equivalent
          500: '#D97706', // amber-600 equivalent / gold
          600: '#C28B00', // darker gold
          700: '#A16207', 
        },
        neutral: {
          50: '#F4F5F2', // Soft neutral gray background
          800: '#1C2B3D', // Text Primary
          500: '#66758A', // Text Secondary
        },
        success: '#2E7D32', // Muted professional green
        warning: '#F89880', // Amber/gold
        error: '#C62828', // Muted professional red
        info: '#1565C0', // Muted blue
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
};