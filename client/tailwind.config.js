/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0D12',
        card: '#0F1318',
        elevated: '#161B22',
        border: '#1E2732',
        primary: '#E8EDF2',
        secondary: '#7A8899',
        accent: {
          cyan: '#00E5FF',
          red: '#FF3B6B',
          amber: '#FFB020',
          green: '#00D97E',
          purple: '#9B59B6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
