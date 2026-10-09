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
          950: '#080605',
          900: '#0d0b0a',
          850: '#120f0e',
          800: '#181412',
          750: '#201b18',
          700: '#2d2521',
          600: '#3d332d',
        },
        neon: {
          coral: '#FFA08C',
          coralLight: '#FFB8A8',
          coralDark: '#FF8A73',
          coralGlow: '#FFA08C',
          amber: '#fbbf24',
          green: '#10b981'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        heading: ['Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'neon-coral': '0 0 16px rgba(255, 160, 140, 0.45)',
        'neon-coral-sm': '0 0 8px rgba(255, 160, 140, 0.3)',
      }
    },
  },
  plugins: [],
}
