/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          800: '#1B2A3E', // Sidebar / Dark Panels
          900: '#162235', // Primary Dark / Deep Navy
        },
        gold: {
          500: '#D4A64A',
          600: '#C6922E', // Accent Government Gold
        },
        neutral: {
          50: '#F4F5F2', // Soft neutral gray background
          800: '#1C2B3D', // Text Primary
          500: '#66758A', // Text Secondary
        },
        success: '#2E7D32', // Muted professional green
        warning: '#D4A64A', // Amber/gold
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