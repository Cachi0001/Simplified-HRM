/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': '#0D1B2A',
        'secondary': '#1B263B',
        'accent': '#415A77',
        'light': '#E0E1DD',
        'highlight': '#3498db',
      },
      animation: {
        'slide-in': 'slide-in 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'message-pulse': 'message-pulse 1.5s ease-in-out infinite',
        'message-glow': 'message-glow 2s ease-in-out infinite',
        'message-ring': 'message-ring 1s ease-out infinite',
      },
      keyframes: {
        'slide-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fade-in': {
          '0%': {
            opacity: '0'
          },
          '100%': {
            opacity: '1'
          }
        },
        'message-pulse': {
          '0%, 100%': {
            opacity: '0.4',
            transform: 'scale(1)'
          },
          '50%': {
            opacity: '0.8',
            transform: 'scale(1.05)'
          }
        },
        'message-glow': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)'
          },
          '50%': {
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)'
          }
        },
        'message-ring': {
          '0%': {
            transform: 'scale(0.8)',
            opacity: '1'
          },
          '100%': {
            transform: 'scale(1.2)',
            opacity: '0'
          }
        }
      }
    },
  },
  plugins: [],
}
