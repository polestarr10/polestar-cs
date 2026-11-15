/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme colours: values for dark and light mode are in index.css.
        ...Object.fromEntries([
          'page', 'surface', 'field', 'panel', 'panel-2', 'panel-3', 'panel-4', 'raised', 'raised-2', 'raised-3', 'hover', 'hover-2', 'line', 'line-2', 'line-3', 'line-4', 'line-soft', 'line-soft-2', 'line-soft-3', 'line-soft-4', 'ink', 'ink-f5', 'ink-e5', 'ink-soft', 'ink-2', 'ink-3', 'ink-3b', 'ink-4', 'ink-4b', 'accent', 'accent-ink', 'on-accent', 'danger', 'danger-ink', 'danger-ink-2', 'purple', 'purple-ink', 'purple-ink-2', 'good', 'good-2', 'good-500', 'warn', 'warn-400', 'info', 'rose', 'good-tint', 'info-tint',
        ].map(name => [name, `rgb(var(--c-${name}) / <alpha-value>)`])),
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
