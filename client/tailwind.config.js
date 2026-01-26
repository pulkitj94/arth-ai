/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#028196', // Teal (Primary Brand)
          light: '#05AAC2',   // Bright Cyan (Highlight)
          dark: '#015f6e',
        },
        navy: {
          DEFAULT: '#012639', // Dark Navy (Sidebar/Headings)
          light: '#023855',
          dark: '#001520',
        },
        accent: {
          DEFAULT: '#FB6793', // Pink (Functional Accent)
          light: '#fd8bae',
          dark: '#d64d75',
        },
        warning: {
          DEFAULT: '#FF9A58', // Orange (Secondary Metrics)
          light: '#ffb380',
          dark: '#cc7b46',
        },
        // App Backgrounds
        app: {
          bg: '#F8F9FC',
          card: '#FFFFFF',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
