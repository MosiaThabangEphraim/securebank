import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070B14',
          925: '#0A0F1E',
          900: '#0D1321',
          875: '#0F1628',
          850: '#111827',
          800: '#161D2E',
          750: '#1A2235',
          700: '#1F2937',
          600: '#2D3748',
          500: '#374151',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6)',
        'glow-blue': '0 0 24px rgba(59,130,246,0.25)',
        'glow-green': '0 0 24px rgba(16,185,129,0.25)',
        'glow-red': '0 0 24px rgba(239,68,68,0.25)',
        'inner-dark': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-blue': 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 40%, #312e81 100%)',
        'card-green': 'linear-gradient(135deg, #059669 0%, #0d9488 40%, #0e7490 100%)',
        'card-purple': 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4c1d95 100%)',
        'card-dark': 'linear-gradient(135deg, #1f2937 0%, #111827 40%, #0d1321 100%)',
        'sidebar': 'linear-gradient(180deg, #070B14 0%, #0A0F1E 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
